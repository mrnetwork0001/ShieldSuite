// ─── OnchainOS API Client ────────────────────────────────────────────────────
//
// Wraps OKX OnchainOS API endpoints for:
// - Security: Token risk scanning via /api/v6/security/token-scan
// - DEX: Swap quotes and execution via DEX aggregator
// - Token: Search and metadata
//
// All calls require OKX API credentials (API key, secret, passphrase).
// Credentials are read from environment variables at startup.

import crypto from "crypto";
import { logger } from "./logger.js";
import { getAgentAddress } from "./agent-wallet.js";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OkxTokenScanResult {
  chainId: string;
  tokenAddress: string;
  isChainSupported: boolean;
  buyTaxes: string;
  sellTaxes: string;
  isRiskToken: boolean;
}

export interface OkxSwapQuote {
  fromToken: { symbol: string; address: string; decimals: string };
  toToken: { symbol: string; address: string; decimals: string };
  fromTokenAmount: string;
  toTokenAmount: string;
  estimatedGas: string;
  priceImpact: string;
  routerResult: unknown;
}

export interface OkxTokenInfo {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenName: string;
  decimals: string;
  totalSupply: string;
  marketCap: string;
  volume24h: string;
  priceUsd: string;
  chainId: string;
}

export interface OkxApiResponse<T> {
  code: string;
  msg: string;
  data: T[];
}

// ─── API Configuration ──────────────────────────────────────────────────────

const OKX_BASE_URL = "https://web3.okx.com";

interface OkxCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

function getCredentials(): OkxCredentials {
  const apiKey = process.env.OKX_API_KEY;
  const secretKey = process.env.OKX_SECRET_KEY;
  const passphrase = process.env.OKX_PASSPHRASE;

  if (!apiKey || !secretKey || !passphrase) {
    logger.warn(
      "OKX API credentials not configured — using demo/fallback mode. " +
        "Set OKX_API_KEY, OKX_SECRET_KEY, OKX_PASSPHRASE in .env"
    );
    return { apiKey: "", secretKey: "", passphrase: "" };
  }

  return { apiKey, secretKey, passphrase };
}

// ─── Request Signing (HMAC-SHA256) ──────────────────────────────────────────
//
// OKX API requires signed requests: HMAC-SHA256(timestamp + method + path + body)
// Headers: OK-ACCESS-KEY, OK-ACCESS-SIGN, OK-ACCESS-TIMESTAMP, OK-ACCESS-PASSPHRASE

function createSignature(
  timestamp: string,
  method: string,
  path: string,
  body: string,
  secretKey: string
): string {
  const message = timestamp + method.toUpperCase() + path + body;
  return crypto
    .createHmac("sha256", secretKey)
    .update(message)
    .digest("base64");
}

function getSignedHeaders(
  method: string,
  path: string,
  body: string = ""
): Record<string, string> {
  const creds = getCredentials();
  const timestamp = new Date().toISOString();

  if (!creds.apiKey) {
    // Demo mode — no signing
    return {
      "Content-Type": "application/json",
    };
  }

  const sign = createSignature(
    timestamp,
    method,
    path,
    body,
    creds.secretKey
  );

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": creds.passphrase,
  };
}

// ─── API Request Helper ─────────────────────────────────────────────────────

async function okxRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<OkxApiResponse<T>> {
  let url = `${OKX_BASE_URL}${path}`;

  if (queryParams) {
    const params = new URLSearchParams(queryParams);
    url += `?${params.toString()}`;
    // For GET with query params, the signature path includes the query string
    if (method === "GET") {
      path += `?${params.toString()}`;
    }
  }

  const bodyStr = body ? JSON.stringify(body) : "";
  const headers = getSignedHeaders(method, path, method === "POST" ? bodyStr : "");

  try {
    logger.info(`[OKX] ${method} ${path.split("?")[0]} (${headers["OK-ACCESS-KEY"] ? "signed" : "unsigned"})`);

    const response = await fetch(url, {
      method,
      headers,
      body: method === "POST" ? bodyStr : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[OKX] HTTP ${response.status} — ${errorText.slice(0, 200)}`);
      throw new Error(`OKX API returned ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as OkxApiResponse<T>;

    if (data.code !== "0") {
      logger.warn(`[OKX] API code=${data.code} msg="${data.msg}" — data items: ${data.data?.length ?? 0}`);
    }

    return data;
  } catch (error) {
    logger.error(`[OKX] Request failed: ${error}`);
    throw error;
  }
}

// ─── Security Module ────────────────────────────────────────────────────────

/**
 * Scan a token for security risks using OKX Security API
 * Endpoint: POST /api/v6/security/token-scan
 *
 * @param chainId - Chain ID (e.g., "196" for XLayer)
 * @param tokenAddress - Token contract address
 * @returns Token scan result with risk assessment
 */
export async function scanTokenSecurity(
  chainId: string,
  tokenAddress: string
): Promise<OkxTokenScanResult | null> {
  try {
    const result = await okxRequest<OkxTokenScanResult>(
      "POST",
      "/api/v6/security/token-scan",
      {
        tokenList: [{ chainId, contractAddress: tokenAddress.toLowerCase() }],
      }
    );

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }

    return null;
  } catch (error) {
    logger.error(`Token security scan failed: ${error}`);
    return null;
  }
}

/**
 * Batch scan multiple tokens
 */
export async function batchScanTokens(
  tokens: Array<{ chainId: string; contractAddress: string }>
): Promise<OkxTokenScanResult[]> {
  try {
    const result = await okxRequest<OkxTokenScanResult>(
      "POST",
      "/api/v6/security/token-scan",
      {
        tokenList: tokens.map((t) => ({
          chainId: t.chainId,
          contractAddress: t.contractAddress.toLowerCase(),
        })),
      }
    );

    return result.data || [];
  } catch (error) {
    logger.error(`Batch token scan failed: ${error}`);
    return [];
  }
}

// ─── DEX Swap Module ────────────────────────────────────────────────────────

/**
 * Get the dexTokenApproveAddress for a given chain.
 * This is the contract that ERC20 tokens must be approved for (NOT the router tx.to).
 */
export async function getApproveAddress(chainIndex: string): Promise<string | null> {
  try {
    const result = await okxRequest<any[]>(
      "GET",
      "/api/v6/dex/aggregator/supported/chain"
    );

    // okxRequest returns { code, msg, data } — the chains array is in result.data
    const chains = (result as any)?.data || result;
    logger.info(`[DEX] Supported chains response: found ${Array.isArray(chains) ? chains.length : 0} chains`);

    if (Array.isArray(chains)) {
      const chain = chains.find((c: any) => 
        String(c.chainIndex) === chainIndex || String(c.chainId) === chainIndex
      );
      if (chain?.dexTokenApproveAddress) {
        logger.info(`[DEX] Approve address for chain ${chainIndex}: ${chain.dexTokenApproveAddress}`);
        return chain.dexTokenApproveAddress;
      }
      // Log available chain indexes for debugging
      const availableChains = chains.slice(0, 10).map((c: any) => `${c.chainIndex || c.chainId}`);
      logger.warn(`[DEX] Chain ${chainIndex} not found. Available: ${availableChains.join(', ')}...`);
    }

    logger.warn(`[DEX] Could not find approve address for chain ${chainIndex}`);
    return null;
  } catch (error) {
    logger.error(`[DEX] Get approve address failed: ${error}`);
    return null;
  }
}

/**
 * Get a swap quote from OKX DEX Aggregator
 * Endpoint: GET /api/v6/dex/aggregator/quote
 */
export async function getSwapQuote(params: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string; // in minimal units
  slippage?: string;
}): Promise<OkxSwapQuote | null> {
  try {
    // OKX DEX API works best with checksummed addresses
    const { getAddress } = await import("ethers");
    const fromAddr = params.fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : getAddress(params.fromTokenAddress);
    const toAddr = params.toTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : getAddress(params.toTokenAddress);

    const result = await okxRequest<OkxSwapQuote>(
      "GET",
      "/api/v6/dex/aggregator/quote",
      undefined,
      {
        chainIndex: params.chainId,
        fromTokenAddress: fromAddr,
        toTokenAddress: toAddr,
        amount: params.amount,
        ...(params.slippage ? { slippagePercent: params.slippage } : {}),
      }
    );

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }

    return null;
  } catch (error) {
    logger.error(`Swap quote failed: ${error}`);
    return null;
  }
}

/**
 * Get swap transaction data (unsigned)
 * Endpoint: GET /api/v6/dex/aggregator/swap
 */
export async function getSwapData(params: {
  chainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  slippage: string;
  userWalletAddress: string;
}): Promise<unknown> {
  try {
    // OKX DEX API works best with checksummed addresses
    const { getAddress } = await import("ethers");
    const fromAddr = params.fromTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : getAddress(params.fromTokenAddress);
    const toAddr = params.toTokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
      ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
      : getAddress(params.toTokenAddress);

    const result = await okxRequest<unknown>(
      "GET",
      "/api/v6/dex/aggregator/swap",
      undefined,
      {
        chainIndex: params.chainId,
        fromTokenAddress: fromAddr,
        toTokenAddress: toAddr,
        amount: params.amount,
        slippagePercent: params.slippage,
        userWalletAddress: params.userWalletAddress, // Keep as-is (wallet provides checksummed)
      }
    );

    if (result.data && result.data.length > 0) {
      return result.data[0];
    }

    return null;
  } catch (error) {
    logger.error(`Swap data failed: ${error}`);
    return null;
  }
}

// ─── DEX Token Module ───────────────────────────────────────────────────────

/**
 * Search for tokens by name/symbol
 * Endpoint: GET /api/v5/dex/aggregator/all-tokens
 */
export async function searchToken(
  chainId: string,
  query: string
): Promise<OkxTokenInfo[]> {
  try {
    const result = await okxRequest<OkxTokenInfo>(
      "GET",
      "/api/v5/dex/aggregator/all-tokens",
      undefined,
      { chainId }
    );

    if (!result.data) return [];

    // Filter by query
    const q = query.toLowerCase();
    return result.data.filter(
      (t) =>
        t.tokenSymbol?.toLowerCase().includes(q) ||
        t.tokenName?.toLowerCase().includes(q) ||
        t.tokenContractAddress?.toLowerCase() === q
    );
  } catch (error) {
    logger.error(`Token search failed: ${error}`);
    return [];
  }
}

// ─── Status Check ───────────────────────────────────────────────────────────

/**
 * Check if OKX API credentials are configured
 */
export function isOnchainOsConfigured(): boolean {
  return !!(
    process.env.OKX_API_KEY &&
    process.env.OKX_SECRET_KEY &&
    process.env.OKX_PASSPHRASE
  );
}

/**
 * Get OnchainOS integration status for health endpoint
 */
export function getOnchainOsStatus(): {
  configured: boolean;
  modules: string[];
  agenticWallet: string | null;
} {
  return {
    configured: isOnchainOsConfigured(),
    modules: [
      "okx-security",
      "okx-dex-swap",
      "okx-dex-token",
      "okx-x402-payment",
    ],
    agenticWallet: getAgentAddress() || null,
  };
}

