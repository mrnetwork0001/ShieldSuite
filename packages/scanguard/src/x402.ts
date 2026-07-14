// ─── x402 Payment Middleware (OKX Agent Payments Protocol) ───────────────────
//
// ScanGuard's /api/scan endpoint is monetized with the x402 protocol.
//
// How x402 actually works (this is the part the previous hand-rolled
// implementation got wrong): the buyer signs an EIP-3009 payment
// authorization OFF-CHAIN and sends it, base64-encoded, in the `X-PAYMENT` /
// `PAYMENT-SIGNATURE` header. The RESOURCE SERVER (us) then hands that payload
// to a FACILITATOR which verifies the signature and SETTLES it on-chain,
// producing the real txHash. We never look up a tx hash the buyer "already
// sent" — there isn't one.
//
// We use OKX's own x402 SDK + hosted facilitator:
//   • verify:  POST https://web3.okx.com/api/v6/pay/x402/verify
//   • settle:  POST https://web3.okx.com/api/v6/pay/x402/settle   (gas-subsidized)
// authenticated with the OKX API-key HMAC (OK-ACCESS-*), read from env.
//
// Asset: USDT0 on X Layer — a bridged USDT proxy that natively supports
// EIP-3009 `transferWithAuthorization`. NOTE: contracts/deployed-addresses.json
// mislabels this exact address as "MockUSDT"; on-chain name()/symbol() = "USD₮0".
//

import { Request, Response, NextFunction } from "express";
import { ethers } from "ethers";
import { paymentMiddleware, x402ResourceServer } from "@okxweb3/x402-express";
import { ExactEvmScheme } from "@okxweb3/x402-evm/exact/server";
import { OKXFacilitatorClient } from "@okxweb3/x402-core";
import { SCAN_PRICE_USD } from "./types.js";
import { logger } from "./logger.js";
import { loadDatabase } from "./database.js";

/** CAIP-2 network id for X Layer mainnet (chainId 196). */
export const XLAYER_NETWORK = "eip155:196" as const;

/**
 * USDT0 on X Layer (chainId 196) — bridged USDT, EIP-3009 capable proxy.
 * on-chain: name() = symbol() = "USD₮0" (U+20AE), decimals = 6.
 * (Same address is mislabeled "MockUSDT" in contracts/deployed-addresses.json.)
 */
export const USDT0_XLAYER = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

/** EIP-712 domain of USDT0 on X Layer — required in accepts[].extra for the exact scheme. */
export const USDT0_DOMAIN = { name: "USD₮0", version: "1" } as const;

/** Scan price in atomic units (USDT0 has 6 decimals): 0.005 → "5000". */
const SCAN_PRICE_ATOMIC = ethers.parseUnits(SCAN_PRICE_USD.toString(), 6).toString();

const DEMO_MODE = process.env.X402_DEMO_MODE === "true";
const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || "";

/**
 * Builds the payment middleware for POST /api/scan.
 *
 * - Demo mode (`X402_DEMO_MODE=true`, local/dev only): scans are free — the
 *   middleware is a passthrough.
 * - Production: real x402 payments via the OKX facilitator. Missing config
 *   fails fast at startup rather than silently serving free scans.
 */
export function createScanPaymentMiddleware() {
  if (DEMO_MODE) {
    logger.warn(
      "[x402] DEMO MODE — /api/scan is FREE (no payment). Set X402_DEMO_MODE=false in production."
    );
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  if (!PAYMENT_ADDRESS) {
    throw new Error("[x402] PAYMENT_ADDRESS is required when X402_DEMO_MODE!=true");
  }
  const missingCreds = ["OKX_API_KEY", "OKX_SECRET_KEY", "OKX_PASSPHRASE"].filter(
    (k) => !process.env[k]
  );
  if (missingCreds.length) {
    throw new Error(
      `[x402] Missing OKX facilitator credentials: ${missingCreds.join(", ")}`
    );
  }

  // OKX hosted facilitator — HMAC-authenticated, gas-subsidized settlement.
  // syncSettle:true → the facilitator waits for on-chain confirmation and
  // returns a real txHash with status "success" (so we only deliver the scan
  // once the money has actually settled).
  const facilitator = new OKXFacilitatorClient({
    apiKey: process.env.OKX_API_KEY!,
    secretKey: process.env.OKX_SECRET_KEY!,
    passphrase: process.env.OKX_PASSPHRASE!,
    syncSettle: true,
  });

  const resourceServer = new x402ResourceServer(facilitator).register(
    XLAYER_NETWORK,
    new ExactEvmScheme()
  );

  logger.info(
    `[x402] Live payments enabled — ${SCAN_PRICE_USD} USD₮0 (${SCAN_PRICE_ATOMIC} atomic) ` +
      `to ${PAYMENT_ADDRESS} on ${XLAYER_NETWORK} via OKX facilitator`
  );

  // syncFacilitatorOnStart defaults to true: the middleware fetches the
  // facilitator's supported kinds lazily (awaited on the first POST /api/scan,
  // never at boot), so other routes stay up even if the facilitator is briefly
  // unreachable, and there is no startup race.
  return paymentMiddleware(
    {
      "POST /api/scan": {
        accepts: {
          scheme: "exact",
          network: XLAYER_NETWORK,
          payTo: PAYMENT_ADDRESS,
          // Explicit AssetAmount pins the asset, amount, and EIP-712 domain so
          // the 402 challenge is fully deterministic (no reliance on defaults).
          price: {
            asset: USDT0_XLAYER,
            amount: SCAN_PRICE_ATOMIC,
            extra: { ...USDT0_DOMAIN },
          },
          maxTimeoutSeconds: 300,
        },
        description:
          "ScanGuard token security scan — rug-pull, honeypot, phishing, and approval-risk detection on X Layer.",
      },
    },
    resourceServer
  );
}

/**
 * Returns payment statistics for monitoring (best-effort; reads any receipts
 * persisted by earlier flows).
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
