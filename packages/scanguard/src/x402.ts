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

// In-memory payment ledger (prod: use a database)
const verifiedPayments = new Map<string, PaymentReceipt>();

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
  acceptedCurrencies: ["OKB", "USDT", "USDC"],
  paymentAddress: "0x0000000000000000000000000000000000000000", // Placeholder, filled by middleware
  demoMode: false,
};

// Internal bypass key — our own frontends and agent use this to skip x402
const INTERNAL_KEY = process.env.X402_INTERNAL_KEY || "shield-internal-2026";

/**
 * x402 Payment Required middleware.
 * 
 * Checks for a valid payment header on incoming scan requests.
 * Internal callers bypass via X-Shield-Key header.
 */
export function x402Middleware(config: Partial<X402Config> = {}) {
  // Always use the latest env address or default
  const paymentAddress = process.env.PAYMENT_ADDRESS || "0x0000000000000000000000000000000000000000";
  const cfg = { 
    ...defaultConfig, 
    paymentAddress, 
    ...config 
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const paymentHeader = req.headers["x-402-payment"] as string | undefined;
    const internalKey = req.headers["x-shield-key"] as string | undefined;
    const requestId = req.headers["x-request-id"] as string || crypto.randomUUID();

    // ── Internal bypass: our own apps (ShieldSwap, Dashboard, Agent) ──
    if (internalKey === INTERNAL_KEY) {
      logger.info(`[x402] Internal bypass — authorized scan (request: ${requestId})`);
      const receipt: PaymentReceipt = {
        paymentId: `internal-${requestId}`,
        payer: "shield-internal",
        amount: String(cfg.priceUsd),
        currency: "INTERNAL",
        timestamp: Date.now(),
        verified: true,
      };
      verifiedPayments.set(`internal-${requestId}`, receipt);
      (req as any).paymentReceipt = receipt;
      next();
      return;
    }

    // ── Demo mode: allow free scans ──────────────────────────────────────
    if (cfg.demoMode && (!paymentHeader || paymentHeader === "demo")) {
      logger.info(`[x402] Demo mode — allowing free scan (request: ${requestId})`);
      const receipt: PaymentReceipt = {
        paymentId: `demo-${requestId}`,
        payer: "demo-user",
        amount: String(cfg.priceUsd),
        currency: "DEMO",
        timestamp: Date.now(),
        verified: true,
      };
      
      verifiedPayments.set(`demo-${requestId}`, receipt);
      (req as any).paymentReceipt = receipt;
      next();
      return;
    }

    // ── No payment header in production ──────────────────────────────────
    if (!paymentHeader) {
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
            currency: "USD",
          },
          payTo: {
            address: cfg.paymentAddress,
            network: XLAYER_CONFIG.chainName,
            chainId: XLAYER_CONFIG.chainId,
          },
          acceptedCurrencies: cfg.acceptedCurrencies,
          instructions: [
            `Send $${cfg.priceUsd} equivalent in any accepted currency to ${cfg.paymentAddress}`,
            `Include the transaction hash in the X-402-Payment header`,
            `Format: X-402-Payment: <txHash>`,
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
      // Check if we've already verified this payment
      if (verifiedPayments.has(paymentHeader)) {
        const receipt = verifiedPayments.get(paymentHeader)!;
        (req as any).paymentReceipt = receipt;
        next();
        return;
      }

      // Verify the transaction on-chain
      const provider = new ethers.JsonRpcProvider(
        process.env.XLAYER_RPC_URL || XLAYER_CONFIG.rpcUrl
      );
      const tx = await provider.getTransaction(paymentHeader);

      if (!tx) {
        res.status(402).json({
          success: false,
          error: {
            code: "INVALID_PAYMENT",
            message: "Transaction not found. Please provide a valid transaction hash.",
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Verify the transaction was sent to our payment address
      if (tx.to?.toLowerCase() !== cfg.paymentAddress.toLowerCase()) {
        res.status(402).json({
          success: false,
          error: {
            code: "WRONG_RECIPIENT",
            message: `Payment was not sent to the correct address. Expected: ${cfg.paymentAddress}`,
          },
          meta: { requestId, timestamp: Date.now(), paymentRequired: true },
        });
        return;
      }

      // Store verified payment
      const receipt: PaymentReceipt = {
        paymentId: `x402-${requestId}`,
        payer: tx.from,
        amount: ethers.formatEther(tx.value),
        currency: "OKB",
        timestamp: Date.now(),
        txHash: paymentHeader,
        verified: true,
      };

      verifiedPayments.set(paymentHeader, receipt);
      (req as any).paymentReceipt = receipt;

      logger.info(`[x402] Payment verified: ${paymentHeader} from ${tx.from}`);
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
export function getPaymentStats() {
  const payments = Array.from(verifiedPayments.values());
  return {
    totalScans: payments.length,
    totalRevenue: payments.reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0),
    recentPayments: payments.slice(-10),
  };
}
