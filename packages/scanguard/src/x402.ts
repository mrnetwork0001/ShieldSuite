// ─── x402 Payment Required Middleware ────────────────────────────────────────
//
// Implements the x402 protocol: HTTP 402 Payment Required.
// External agents calling the /scan endpoint must include a valid payment
// header or receive a 402 with payment instructions.
//
// Flow:
// 1. Agent hits POST /api/scan → middleware checks for X-402-Payment header
// 2. If missing → respond 402 with payment instructions (address, amount, network)
// 3. If present → verify payment on-chain → allow through
// 4. For hackathon demo: accepts "demo" mode for free scans
//

import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { PaymentReceipt, XLAYER_CONFIG, SCAN_PRICE_USD } from "./types.js";
import { logger } from "./logger.js";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USDT_MAINNET = "0x1e4a5963ab79e612984b2e88b8d96053bfd975d8";

function getDeployedUsdtAddress(): string {
  try {
    const addressPath = path.resolve(__dirname, "../../../contracts/deployed-addresses.json");
    if (fs.existsSync(addressPath)) {
      const content = fs.readFileSync(addressPath, "utf-8");
      const data = JSON.parse(content);
      const mockUsdt = data.xlayerMainnet?.MockUSDT || data.MockUSDT;
      if (mockUsdt) return mockUsdt;
    }
  } catch (err) {}
  return USDT_MAINNET;
}

import { loadDatabase, saveDatabase } from "./database.js";

// Payment receiving address (set via env or default demo address)
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";

export interface X402Config {
  /** Price per scan in USD */
  priceUsd: number;
  /** Accepted payment methods */
  acceptedCurrencies: string[];
  /** Payment receiving address */
  paymentAddress: string;
  /** Whether demo mode is enabled (free scans) */
  demoMode: boolean;
}

const defaultConfig: X402Config = {
  priceUsd: SCAN_PRICE_USD,
  acceptedCurrencies: ["USDT"],
  paymentAddress: PAYMENT_ADDRESS,
  // Toggled via environment variable. Defaults to true for hackathon sandbox mode.
  demoMode: process.env.X402_DEMO_MODE !== undefined
    ? process.env.X402_DEMO_MODE === "true"
    : true,
};

/**
 * x402 Payment Required middleware.
 * 
 * Checks for a valid payment header on incoming scan requests.
 * In demo mode, allows free scans with the header `X-402-Payment: demo`.
 */
export function x402Middleware(config: Partial<X402Config> = {}) {
  const cfg = { ...defaultConfig, ...config };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers["x-402-payment"] as string | undefined;
    const requestId = req.headers["x-request-id"] as string || crypto.randomUUID();
    logger.info(`[x402] Middleware invocation. cfg.demoMode: ${cfg.demoMode}, process.env.X402_DEMO_MODE: ${process.env.X402_DEMO_MODE}`);

    // ── Demo mode: allow free scans ──────────────────────────────────────
    if (cfg.demoMode && (!paymentHeader || paymentHeader === "demo")) {
      logger.info(`[x402] Demo mode — allowing free scan (request: ${requestId})`);
      const receipt: PaymentReceipt = {
        paymentId: `demo-${requestId}`,
        payer: "demo-user",
        amount: String(cfg.priceUsd), // Simulate $1.00 paid
        currency: "DEMO",
        timestamp: Date.now(),
        verified: true,
      };
      
      try {
        const db = await loadDatabase();
        db.verifiedPayments = db.verifiedPayments || {};
        db.verifiedPayments[`demo-${requestId}`] = receipt;
        await saveDatabase(db);
      } catch (err: any) {
        logger.error(`[x402] Failed to save demo payment: ${err.message}`);
      }

      (req as any).paymentReceipt = receipt;
      next();
      return;
    }

    // ── No payment header in production ──────────────────────────────────
    if (!paymentHeader) {
      const nonce = crypto.randomUUID();
      try {
        const db = await loadDatabase();
        db.activeNonces = db.activeNonces || {};
        db.activeNonces[nonce] = { nonce, createdAt: Date.now() };
        await saveDatabase(db);
      } catch (err: any) {
        logger.error(`[x402] Failed to save generated nonce: ${err.message}`);
      }

      res.status(402).json({
        success: false,
        error: {
          code: "PAYMENT_REQUIRED",
          message: "Payment required to access this endpoint.",
        },
        payment: {
          protocol: "x402",
          version: "1.0",
          price: {
            amount: cfg.priceUsd.toString(),
            currency: "USDT",
          },
          payTo: {
            address: cfg.paymentAddress,
            network: XLAYER_CONFIG.chainName,
            chainId: XLAYER_CONFIG.chainId,
          },
          acceptedCurrencies: cfg.acceptedCurrencies,
          nonce,
          instructions: [
            `Send ${cfg.priceUsd} USDT to ${cfg.paymentAddress} on X Layer`,
            `Include the transaction hash in the X-402-Payment header`,
            `Include the session nonce in the X-402-Nonce header`,
            `Format: X-402-Payment: <txHash>, X-402-Nonce: <nonce>`,
            `Or use "demo" for free scans in development mode`,
          ],
        },
        meta: {
          requestId,
          timestamp: Date.now(),
          paymentRequired: true,
        },
      });
      return;
    }

    // ── Verify payment by tx hash ────────────────────────────────────────
    try {
      const db = await loadDatabase();
      db.verifiedPayments = db.verifiedPayments || {};
      db.activeNonces = db.activeNonces || {};

      // Check if we've already verified this payment hash to prevent duplicate replays
      if (db.verifiedPayments[paymentHeader]) {
        const receipt = db.verifiedPayments[paymentHeader] as PaymentReceipt & { tokenAddress?: string };
        if (receipt.tokenAddress && receipt.tokenAddress.toLowerCase() === req.body.tokenAddress?.toLowerCase()) {
          (req as any).paymentReceipt = receipt;
          next();
          return;
        } else {
          res.status(402).json({
            success: false,
            error: {
              code: "REPLAYED_PAYMENT",
              message: "This payment transaction has already been redeemed for a different token scan.",
            },
            meta: { requestId, timestamp: Date.now(), paymentRequired: true },
          });
          return;
        }
      }

      // Verify session nonce
      const nonceHeader = req.headers["x-402-nonce"] as string | undefined;
      if (!nonceHeader) {
        res.status(402).json({
          success: false,
          error: {
            code: "NONCE_REQUIRED",
            message: "X-402-Nonce header is required for verification.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      const nonceRecord = db.activeNonces[nonceHeader];
      if (!nonceRecord) {
        res.status(402).json({
          success: false,
          error: {
            code: "INVALID_NONCE",
            message: "The provided session nonce is invalid or has already been used.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Verify nonce has not expired (15 minute TTL)
      const NONCE_TTL_MS = 15 * 60 * 1000;
      if (Date.now() - nonceRecord.createdAt > NONCE_TTL_MS) {
        delete db.activeNonces[nonceHeader];
        await saveDatabase(db);
        res.status(402).json({
          success: false,
          error: {
            code: "EXPIRED_NONCE",
            message: "The session nonce has expired. Please request a new 402 challenge.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Verify the transaction on-chain
      const provider = new ethers.JsonRpcProvider(
        process.env.XLAYER_RPC_URL || XLAYER_CONFIG.rpcUrl
      );
      const receipt = await provider.getTransactionReceipt(paymentHeader);

      if (!receipt) {
        res.status(402).json({
          success: false,
          error: {
            code: "INVALID_PAYMENT",
            message: "Transaction receipt not found. Please provide a valid transaction hash.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      if (receipt.status !== 1) {
        res.status(402).json({
          success: false,
          error: {
            code: "TRANSACTION_FAILED",
            message: "The payment transaction failed on-chain.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Parse ERC-20 logs
      const usdtAddress = getDeployedUsdtAddress();
      const transferInterface = new ethers.Interface([
        "event Transfer(address indexed from, address indexed to, uint256 value)"
      ]);

      let verifiedTransfer = false;
      let transferValue = 0n;
      let payerAddress = "";

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === usdtAddress.toLowerCase()) {
          try {
            const parsed = transferInterface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            if (parsed && parsed.args.to.toLowerCase() === cfg.paymentAddress.toLowerCase()) {
              verifiedTransfer = true;
              transferValue = parsed.args.value;
              payerAddress = parsed.args.from;
              break;
            }
          } catch (err) {
            // Ignore logs that don't match Transfer signature
          }
        }
      }

      if (!verifiedTransfer) {
        res.status(402).json({
          success: false,
          error: {
            code: "WRONG_RECIPIENT",
            message: `No Transfer event found to target address: ${cfg.paymentAddress} on token: ${usdtAddress}`,
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Verify the transaction was for the correct amount (USDT is 6 decimals)
      const expectedAmountRaw = ethers.parseUnits(cfg.priceUsd.toString(), 6);
      if (transferValue < expectedAmountRaw) {
        res.status(402).json({
          success: false,
          error: {
            code: "INSUFFICIENT_AMOUNT",
            message: `Insufficient USDT transferred. Expected: ${cfg.priceUsd} USDT, got: ${ethers.formatUnits(transferValue, 6)} USDT`,
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Store verified payment
      const receiptData: PaymentReceipt & { tokenAddress?: string } = {
        paymentId: `x402-${requestId}`,
        payer: payerAddress,
        amount: ethers.formatUnits(transferValue, 6),
        currency: "USDT",
        timestamp: Date.now(),
        txHash: paymentHeader,
        verified: true,
        tokenAddress: req.body.tokenAddress,
      };

      // Save verified payment to database state and delete nonce
      db.verifiedPayments[paymentHeader] = receiptData;
      delete db.activeNonces[nonceHeader];
      await saveDatabase(db);

      (req as any).paymentReceipt = receiptData;

      logger.info(`[x402] Payment verified: ${paymentHeader} of ${receiptData.amount} USDT from ${payerAddress}`);
      next();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[x402] Payment verification failed: ${errorMessage}`);
      res.status(402).json({
        success: false,
        error: {
          code: "PAYMENT_VERIFICATION_FAILED",
          message: `Could not verify payment: ${errorMessage}`,
        },
        meta: { requestId, timestamp: Date.now(), paymentRequired: true },
      });
    }
  };
}

/**
 * Returns payment statistics for monitoring.
 */
export async function getPaymentStats() {
  try {
    const db = await loadDatabase();
    const payments = Object.values(db.verifiedPayments || {});
    return {
      totalScans: payments.length,
      totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0),
      recentPayments: payments.slice(-10),
    };
  } catch (err) {
    return { totalScans: 0, totalRevenue: 0, recentPayments: [] };
  }
}
