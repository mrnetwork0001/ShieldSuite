// ─── Shared Types for ScanGuard ──────────────────────────────────────────────

/** Risk severity levels */
export type RiskLevel = "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/** Individual risk flag categories */
export type RiskCategory =
  | "rug_pull"
  | "honeypot"
  | "phishing"
  | "malicious_approval"
  | "ownership_renounced"
  | "proxy_contract"
  | "liquidity_lock"
  | "tax_anomaly"
  | "blacklist_function"
  | "mint_function"
  | "info";

/** A single risk flag detected during scanning */
export interface RiskFlag {
  category: RiskCategory;
  severity: RiskLevel;
  title: string;
  description: string;
  evidence?: string;
}

/** Full scan result returned by the scanner */
export interface ScanResult {
  scanId: string;
  tokenAddress: string;
  chainId: number;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalSupply: string | null;
  riskScore: number; // 0–100 (0 = safe, 100 = max danger)
  riskLevel: RiskLevel;
  flags: RiskFlag[];
  contractVerified: boolean;
  ownerAddress: string | null;
  ownershipRenounced: boolean;
  hasProxyPattern: boolean;
  liquidityLocked: boolean;
  liquidityAmount: string | null;
  topHolders: HolderInfo[];
  scanTimestamp: number;
  scanDurationMs: number;
  xLayerExplorerUrl: string;
  // Uniswap V3 liquidity data
  uniswapHasPool: boolean;
  uniswapPoolCount: number;
  uniswapLiquidity: string | null;
  uniswapPoolAddress: string | null;
}

/** Token holder information */
export interface HolderInfo {
  address: string;
  balance: string;
  percentage: number;
}

/** API request for a scan */
export interface ScanRequest {
  tokenAddress: string;
  chainId?: number; // defaults to 196 (XLayer)
}

/** x402 payment receipt */
export interface PaymentReceipt {
  paymentId: string;
  payer: string;
  amount: string;
  currency: string;
  timestamp: number;
  txHash?: string;
  verified: boolean;
}

/** MCP tool definition */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** MCP tool call request */
export interface McpToolCallRequest {
  method: "tools/call";
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

/** MCP tool call response */
export interface McpToolCallResponse {
  content: Array<{
    type: "text" | "json";
    text?: string;
    json?: unknown;
  }>;
  isError?: boolean;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    requestId: string;
    timestamp: number;
    paymentRequired?: boolean;
  };
}

/** XLayer chain constants */
export const XLAYER_CONFIG = {
  chainId: 196,
  chainName: "XLayer Mainnet",
  rpcUrl: "https://rpc.xlayer.tech",
  explorerUrl: "https://www.okx.com/explorer/xlayer",
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
} as const;

/** Default scan price in USD */
export const SCAN_PRICE_USD = 0.005;

