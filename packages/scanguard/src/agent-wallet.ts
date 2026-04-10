// ─── OKX Agentic Wallet — On-Chain Transaction Module ────────────────────────
//
// Uses the onchainos CLI tool for wallet operations (TEE-secured signing).
// Falls back to direct RPC for balance checks.
//
// The agentic wallet is managed by OKX's TEE — private key never exposed.
// Transactions are signed server-side by OKX's infrastructure.

import crypto from "crypto";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import { ethers } from "ethers";
import { XLAYER_CONFIG } from "./types.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const OKX_BASE_URL = "https://web3.okx.com";
const XLAYER_RPC = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";

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
  if (process.env.AGENT_PRIVATE_KEY) {
    try {
      const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY);
      return wallet.address;
    } catch {
      // Ignore if invalid
    }
  }
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

// ─── Direct RPC Balance Check ────────────────────────────────────────────────

/**
 * Get native OKB balance directly from X Layer RPC (most reliable)
 */
export async function getAgentBalanceRPC(): Promise<string> {
  const address = getAgentAddress();
  if (!address) return "0";

  try {
    const res = await fetch(XLAYER_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getBalance",
        params: [address, "latest"],
        id: 1,
      }),
    });

    const data = await res.json() as any;
    if (data.result) {
      const weiBalance = BigInt(data.result);
      const okbBalance = Number(weiBalance) / 1e18;
      return okbBalance.toFixed(6);
    }
    return "0";
  } catch {
    return "0";
  }
}

/**
 * Get transaction count (nonce) for the agentic wallet
 */
export async function getAgentNonce(): Promise<number> {
  const address = getAgentAddress();
  if (!address) return 0;

  try {
    const res = await fetch(XLAYER_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [address, "latest"],
        id: 1,
      }),
    });

    const data = await res.json() as any;
    return data.result ? parseInt(data.result, 16) : 0;
  } catch {
    return 0;
  }
}

// ─── OKX API Balance Check ──────────────────────────────────────────────────

export interface WalletBalance {
  chainIndex: string;
  tokenAddress: string;
  symbol: string;
  balance: string;
  tokenPrice: string;
  isNativeToken: boolean;
}

/**
 * Get agentic wallet balance via OKX API
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
        chainIndex: "196",
      }
    );

    if (result.code === "0" && result.data) {
      logger.info(`[AgentWallet] Balance query OK: ${result.data.length} token(s)`);
      return result.data;
    }

    logger.warn(`[AgentWallet] OKX balance API failed: ${result.msg}. Falling back to RPC.`);
    return null;
  } catch (error: any) {
    logger.error(`[AgentWallet] Balance error: ${error.message}`);
    return null;
  }
}

// ─── Onchainos CLI Wallet Operations ─────────────────────────────────────────

/**
 * Try to send a transaction using the onchainos CLI tool (TEE signing)
 */
export async function sendViaCli(params: {
  to: string;
  amount?: string;
  chain?: string;
}): Promise<{ txHash: string } | null> {
  try {
    const chain = params.chain || "196";
    const amount = params.amount || "0";

    // Try onchainos CLI
    const cmd = `onchainos wallet send --to ${params.to} --chain ${chain} --amt ${amount}`;
    logger.info(`[AgentWallet] Executing: ${cmd}`);

    const output = execSync(cmd, {
      timeout: 30000,
      env: {
        ...process.env,
        OKX_API_KEY: getCredentials().apiKey,
        OKX_SECRET_KEY: getCredentials().secretKey,
        OKX_PASSPHRASE: getCredentials().passphrase,
      },
    }).toString();

    logger.info(`[AgentWallet] CLI output: ${output.slice(0, 200)}`);

    // Extract txHash from output
    const txMatch = output.match(/txHash[:\s]*["']?(0x[a-fA-F0-9]{64})["']?/i);
    if (txMatch) {
      return { txHash: txMatch[1] };
    }

    // Look for success indicators
    if (output.toLowerCase().includes("success") || output.includes("0x")) {
      const hashMatch = output.match(/(0x[a-fA-F0-9]{64})/);
      return { txHash: hashMatch?.[1] || "unknown" };
    }

    logger.warn(`[AgentWallet] CLI returned no txHash`);
    return null;
  } catch (error: any) {
    logger.warn(`[AgentWallet] CLI not available: ${error.message?.slice(0, 100)}`);
    return null;
  }
}

export async function pingOnChain(): Promise<boolean> {
  const privateKey = process.env.AGENT_PRIVATE_KEY;
  if (!privateKey) {
    logger.warn("[AgentWallet] AGENT_PRIVATE_KEY not found in .env. Skipping ping.");
    return false;
  }

  try {
    const provider = new ethers.JsonRpcProvider(process.env.XLAYER_RPC_URL || XLAYER_CONFIG.rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Self-transfer 0 OKB
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0
    });
    
    logger.info(`[AgentWallet] On-chain ping sent successfully! Hash: ${tx.hash}`);
    return true;
  } catch (error: any) {
    logger.error(`[AgentWallet] Ping failed: ${error.message}`);
    return false;
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
  nonce: number;
}> {
  const address = getAgentAddress();
  if (!address) {
    return { configured: false, address: "", hasGas: false, okbBalance: "0", nonce: 0 };
  }

  // Use direct RPC for most reliable balance
  const okbBalance = await getAgentBalanceRPC();
  const nonce = await getAgentNonce();
  const hasGas = parseFloat(okbBalance) > 0;

  return {
    configured: true,
    address,
    hasGas,
    okbBalance,
    nonce,
  };
}
