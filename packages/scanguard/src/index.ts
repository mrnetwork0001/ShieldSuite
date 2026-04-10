// ─── ScanGuard — MCP Security Scanner Server ─────────────────────────────────

import express from "express";
import cors from "cors";
import { config } from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

import { scanToken } from "./scanner.js";
import { x402Middleware, getPaymentStats } from "./x402.js";
import { mcpRouter } from "./mcp.js";
import { ApiResponse, ScanResult, XLAYER_CONFIG } from "./types.js";
import { logger } from "./logger.js";
import { getOnchainOsStatus, isOnchainOsConfigured } from "./onchainos.js";

export { logger };

// ─── Environment ─────────────────────────────────────────────────────────────
// Load .env from monorepo root (2 levels up from packages/scanguard/src/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });
config(); // Also try CWD as fallback

// BigInt JSON serialization (ethers.js returns BigInt values)
(BigInt.prototype as any).toJSON = function () { return this.toString(); };

const PORT = parseInt(process.env.PORT || "3402", 10);
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

// ─── Scan Cache ──────────────────────────────────────────────────────────────
const scanCache = new Map<string, ScanResult>();
const scansByToken = new Map<string, string>();

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-402-Payment", "X-Request-Id"],
}));
app.use(express.json());

// Request ID middleware
app.use((req, _res, next) => {
  if (!req.headers["x-request-id"]) {
    req.headers["x-request-id"] = uuidv4();
  }
  next();
});

// ─── Request validation ──────────────────────────────────────────────────────
const scanRequestSchema = z.object({
  tokenAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
  chainId: z.number().optional().default(XLAYER_CONFIG.chainId),
});

// ─── Routes ──────────────────────────────────────────────────────────────────

/** Health check */
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "healthy",
      service: "ScanGuard",
      version: "1.0.0",
      chain: XLAYER_CONFIG.chainName,
      chainId: XLAYER_CONFIG.chainId,
      uptime: process.uptime(),
      environment: NODE_ENV,
      onchainOs: getOnchainOsStatus(),
    },
  });
});

/** Scan statistics */
app.get("/api/stats", (_req, res) => {
  const paymentStats = getPaymentStats();
  res.json({
    success: true,
    data: {
      cachedScans: scanCache.size,
      cachedTokens: scansByToken.size,
      ...paymentStats,
    },
  });
});

/**
 * POST /api/scan — Scan a token for security risks
 * Protected by x402 payment middleware in production
 */
app.post("/api/scan", x402Middleware(), async (req, res) => {
  const requestId = req.headers["x-request-id"] as string;

  try {
    const parsed = scanRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: parsed.error.errors.map((e) => e.message).join(", "),
        },
        meta: { requestId, timestamp: Date.now() },
      };
      res.status(400).json(response);
      return;
    }

    const { tokenAddress, chainId } = parsed.data;
    logger.info(`[API] Scan request for ${tokenAddress} on chain ${chainId} (request: ${requestId})`);

    // Check cache (scans valid for 5 minutes)
    const cachedScanId = scansByToken.get(tokenAddress.toLowerCase());
    if (cachedScanId) {
      const cached = scanCache.get(cachedScanId);
      if (cached && Date.now() - cached.scanTimestamp < 5 * 60 * 1000) {
        logger.info(`[API] Returning cached scan ${cachedScanId} for ${tokenAddress}`);
        const response: ApiResponse<ScanResult> = {
          success: true,
          data: cached,
          meta: { requestId, timestamp: Date.now() },
        };
        res.json(response);
        return;
      }
    }

    // Execute scan
    const result = await scanToken({ tokenAddress, chainId });

    // Cache result
    scanCache.set(result.scanId, result);
    scansByToken.set(tokenAddress.toLowerCase(), result.scanId);

    logger.info(
      `[API] Scan complete: ${result.tokenSymbol || tokenAddress} → ` +
      `Risk: ${result.riskScore}/100 (${result.riskLevel}), ` +
      `${result.flags.length} flag(s) in ${result.scanDurationMs}ms`
    );

    const response: ApiResponse<ScanResult> = {
      success: true,
      data: result,
      meta: { requestId, timestamp: Date.now() },
    };
    res.json(response);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[API] Scan failed: ${errorMessage}`);
    const response: ApiResponse = {
      success: false,
      error: {
        code: "SCAN_FAILED",
        message: errorMessage,
      },
      meta: { requestId, timestamp: Date.now() },
    };
    res.status(500).json(response);
  }
});

/** GET /api/scan/:scanId — Retrieve a cached scan result */
app.get("/api/scan/:scanId", (req, res) => {
  const { scanId } = req.params;
  const result = scanCache.get(scanId);

  if (!result) {
    const response: ApiResponse = {
      success: false,
      error: {
        code: "NOT_FOUND",
        message: `Scan ${scanId} not found or expired`,
      },
      meta: { requestId: req.headers["x-request-id"] as string, timestamp: Date.now() },
    };
    res.status(404).json(response);
    return;
  }

  const response: ApiResponse<ScanResult> = {
    success: true,
    data: result,
    meta: { requestId: req.headers["x-request-id"] as string, timestamp: Date.now() },
  };
  res.json(response);
});

// ─── DEX Proxy Routes (signed backend → OKX DEX API) ────────────────────────

/** GET /api/dex/quote — Proxy to OKX DEX Aggregator quote */
app.get("/api/dex/quote", async (req, res) => {
  const { fromToken, toToken, amount, slippage } = req.query;

  if (!fromToken || !toToken || !amount) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_PARAMS", message: "fromToken, toToken, and amount are required" },
    });
    return;
  }

  try {
    const { getSwapQuote } = await import("./onchainos.js");
    const quote = await getSwapQuote({
      chainId: "196",
      fromTokenAddress: fromToken as string,
      toTokenAddress: toToken as string,
      amount: amount as string,
      slippage: (slippage as string) || "0.5",
    });

    if (quote) {
      res.json({ success: true, data: quote });
    } else {
      // Fallback: estimated quote for demo when OKX API is unreachable
      const amountNum = parseFloat(amount as string) || 0;
      res.json({
        success: true,
        data: {
          fromTokenAmount: amount,
          toTokenAmount: (amountNum * 0.998).toFixed(6),
          estimatedGas: "0.0001",
          priceImpact: "0.05",
        },
        meta: { source: "estimated" },
      });
    }
  } catch (err: any) {
    logger.error(`DEX quote error: ${err.message}`);
    // Always return something for UX - use estimated rate
    const amountNum = parseFloat(amount as string) || 0;
    res.json({
      success: true,
      data: {
        fromTokenAmount: amount,
        toTokenAmount: (amountNum * 0.998).toFixed(6),
        estimatedGas: "0.0001",
        priceImpact: "0.1",
      },
      meta: { source: "estimated" },
    });
  }
});

/** GET /api/dex/swap — Proxy to OKX DEX Aggregator swap data */
app.get("/api/dex/swap", async (req, res) => {
  const { fromToken, toToken, amount, wallet, slippage } = req.query;

  if (!fromToken || !toToken || !amount || !wallet) {
    res.status(400).json({
      success: false,
      error: { code: "MISSING_PARAMS", message: "fromToken, toToken, amount, and wallet are required" },
    });
    return;
  }

  try {
    const { getSwapData } = await import("./onchainos.js");
    const swapData = await getSwapData({
      chainId: "196",
      fromTokenAddress: fromToken as string,
      toTokenAddress: toToken as string,
      amount: amount as string,
      slippage: (slippage as string) || "0.5",
      userWalletAddress: wallet as string,
    });

    res.json({ success: true, data: swapData });
  } catch (err: any) {
    logger.error(`DEX swap error: ${err.message}`);
    res.status(500).json({
      success: false,
      error: { code: "SWAP_FAILED", message: err.message },
    });
  }
});

// ─── MCP Routes ──────────────────────────────────────────────────────────────
app.use("/mcp", mcpRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Endpoint not found. Available endpoints: POST /api/scan, GET /api/health, GET /api/dex/quote, GET /api/dex/swap, GET /mcp/tools",
    },
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  logger.info(`🛡️  ScanGuard running at http://${HOST}:${PORT}`);
  logger.info(`Chain: ${XLAYER_CONFIG.chainName} (#${XLAYER_CONFIG.chainId})`);
  logger.info(`Mode: ${NODE_ENV}`);
  logger.info(`x402: ${NODE_ENV === "production" ? "ENABLED" : "DEMO MODE (free scans)"}`);
  logger.info(`Endpoints: POST /api/scan | GET /api/health | GET /api/dex/quote | GET /api/dex/swap | GET /mcp/tools`);
});

export default app;
