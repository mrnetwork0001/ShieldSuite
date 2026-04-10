// ─── OKX Agentic Wallet — On-Chain Transaction Module ────────────────────────
//
// Uses OKX OnchainOS Agentic Wallet API to:
// - Sign and send transactions from the managed wallet (TEE-secured)
// - Execute contract calls
// - Check wallet balance
//
// The agentic wallet private key is managed by OKX in a Trusted Execution
// Environment (TEE) — we never see the private key, we just call the API.

import crypto from "crypto";
import { logger } from "./logger.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const OKX_BASE_URL = "https://web3.okx.com";

interface OkxCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
}

function getCredentials(): OkxCredentials {
  return {
    apiKey: process.env.OKX_API_KEY || "",
    secretKey: process.env.OKX_SECRET_KEY || "",
    passphrase: process.env.OKX_PASSPHRASE || "",
  };
}

function getAgentAddress(): string {
  return process.env.AGENTIC_WALLET_ADDRESS || "";
}

// ─── Request Signing ─────────────────────────────────────────────────────────

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

  if (!creds.apiKey) return { "Content-Type": "application/json" };

  const sign = createSignature(timestamp, method, path, body, creds.secretKey);

  return {
    "Content-Type": "application/json",
    "OK-ACCESS-KEY": creds.apiKey,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": timestamp,
    "OK-ACCESS-PASSPHRASE": creds.passphrase,
  };
}

async function okxRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  queryParams?: Record<string, string>
): Promise<{ code: string; msg: string; data: T[] }> {
  let fullPath = path;
  if (queryParams) {
    const qs = new URLSearchParams(queryParams).toString();
    fullPath = `${path}?${qs}`;
  }

  const bodyStr = body ? JSON.stringify(body) : "";
  const headers = getSignedHeaders(method, fullPath, bodyStr);

  const res = await fetch(`${OKX_BASE_URL}${fullPath}`, {
    method,
    headers,
    ...(body ? { body: bodyStr } : {}),
  });

  return res.json() as any;
}

// ─── Wallet Functions ────────────────────────────────────────────────────────

export interface WalletBalance {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  isNativeToken: boolean;
}

/**
 * Get agentic wallet balance on X Layer
 */
export async function getAgentBalance(): Promise<WalletBalance[] | null> {
  const address = getAgentAddress();
  if (!address) {
    logger.warn("[AgentWallet] No AGENTIC_WALLET_ADDRESS configured");
    return null;
  }

  try {
    const result = await okxRequest<WalletBalance>(
      "GET",
      "/api/v6/wallet/asset/token-balances",
      undefined,
      {
        address,
        chainIndex: "196", // X Layer
      }
    );

    if (result.code === "0" && result.data) {
      logger.info(`[AgentWallet] Balance query OK: ${result.data.length} token(s)`);
      return result.data;
    }

    logger.warn(`[AgentWallet] Balance query failed: ${result.msg}`);
    return null;
  } catch (error: any) {
    logger.error(`[AgentWallet] Balance error: ${error.message}`);
    return null;
  }
}

/**
 * Sign and send a transaction from the agentic wallet via OKX TEE
 * This is the key function for generating on-chain activity
 */
export async function sendAgentTransaction(params: {
  to: string;
  value?: string; // in wei
  data?: string;  // encoded calldata
  chainIndex?: string;
}): Promise<{ txHash: string; orderId: string } | null> {
  const address = getAgentAddress();
  if (!address) {
    logger.warn("[AgentWallet] No AGENTIC_WALLET_ADDRESS configured");
    return null;
  }

  try {
    // Use the OKX agentic wallet sign-and-send endpoint
    const result = await okxRequest<any>(
      "POST",
      "/api/v6/wallet/pre-transaction/sign-transaction",
      {
        chainIndex: params.chainIndex || "196",
        fromAddr: address,
        toAddr: params.to,
        txAmount: params.value || "0",
        extJson: params.data ? { inputData: params.data } : undefined,
      }
    );

    if (result.code === "0" && result.data?.[0]) {
      const txResult = result.data[0];
      logger.info(`[AgentWallet] TX signed & sent: ${txResult.txHash || txResult.orderId}`);
      return {
        txHash: txResult.txHash || "",
        orderId: txResult.orderId || "",
      };
    }

    // Try alternative endpoint format
    logger.info(`[AgentWallet] Trying broadcast endpoint...`);
    const broadcastResult = await okxRequest<any>(
      "POST",
      "/api/v6/wallet/pre-transaction/broadcast-transaction",
      {
        signedTx: result.data?.[0]?.signedTx,
        chainIndex: params.chainIndex || "196",
        address,
      }
    );

    if (broadcastResult.code === "0" && broadcastResult.data?.[0]) {
      const br = broadcastResult.data[0];
      logger.info(`[AgentWallet] TX broadcast: ${br.txHash || br.orderId}`);
      return {
        txHash: br.txHash || "",
        orderId: br.orderId || "",
      };
    }

    logger.warn(`[AgentWallet] TX failed: code=${result.code} msg=${result.msg}`);
    return null;
  } catch (error: any) {
    logger.error(`[AgentWallet] TX error: ${error.message}`);
    return null;
  }
}

/**
 * Execute a simple self-transfer (0 value) to generate on-chain activity
 * This is the cheapest way to create legitimate txns
 */
export async function pingOnChain(): Promise<boolean> {
  const address = getAgentAddress();
  if (!address) return false;

  try {
    // Send a 0-value transaction to self — cheapest on-chain footprint
    const result = await sendAgentTransaction({
      to: address,
      value: "0",
    });

    if (result?.txHash) {
      logger.info(`[AgentWallet] On-chain ping: ${result.txHash}`);
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Get transaction history for the agentic wallet
 */
export async function getAgentTxHistory(): Promise<any[] | null> {
  const address = getAgentAddress();
  if (!address) return null;

  try {
    const result = await okxRequest<any>(
      "GET",
      "/api/v6/wallet/post-transaction/transactions",
      undefined,
      {
        address,
        chainIndex: "196",
        limit: "20",
      }
    );

    if (result.code === "0" && result.data) {
      return result.data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if the agentic wallet is properly configured and has gas
 */
export async function checkAgentReady(): Promise<{
  configured: boolean;
  address: string;
  hasGas: boolean;
  okbBalance: string;
}> {
  const address = getAgentAddress();
  if (!address) {
    return { configured: false, address: "", hasGas: false, okbBalance: "0" };
  }

  const balances = await getAgentBalance();
  const okb = balances?.find((b) => b.isNativeToken || b.symbol === "OKB");
  const okbBalance = okb?.balance || "0";
  const hasGas = parseFloat(okbBalance) > 0;

  return {
    configured: true,
    address,
    hasGas,
    okbBalance,
  };
}
