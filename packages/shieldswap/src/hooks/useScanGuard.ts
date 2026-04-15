// ─── useScanGuard Hook ───────────────────────────────────────────────────────
// Calls the ScanGuard API to scan a token for security risks.

import { useState, useCallback } from "react";

/** Risk flag from the scanner */
export interface RiskFlag {
  category: string;
  severity: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  evidence?: string;
}

/** Full scan result */
export interface ScanResult {
  scanId: string;
  tokenAddress: string;
  chainId: number;
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalSupply: string | null;
  riskScore: number;
  riskLevel: "SAFE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  flags: RiskFlag[];
  contractVerified: boolean;
  ownerAddress: string | null;
  ownershipRenounced: boolean;
  hasProxyPattern: boolean;
  liquidityLocked: boolean;
  liquidityAmount: string | null;
  scanTimestamp: number;
  scanDurationMs: number;
  xLayerExplorerUrl: string;
  // Uniswap V3 data
  uniswapHasPool?: boolean;
  uniswapPoolCount?: number;
  uniswapLiquidity?: string | null;
  uniswapPoolAddress?: string | null;
}

export interface UseScanGuardReturn {
  scan: (tokenAddress: string) => Promise<ScanResult | null>;
  result: ScanResult | null;
  isScanning: boolean;
  error: string | null;
  reset: () => void;
}

const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";

export function useScanGuard(): UseScanGuardReturn {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async (tokenAddress: string): Promise<ScanResult | null> => {
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shield-Key": "shield-internal-2026",
        },
        body: JSON.stringify({
          tokenAddress,
          chainId: 196,
        }),
      });

      if (response.status === 402) {
        const paymentInfo = await response.json();
        setError("Payment required. x402 payment not configured for this session.");
        console.warn("[ScanGuard] Payment required:", paymentInfo);
        return null;
      }

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody?.error?.message || `Scan failed (HTTP ${response.status})`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Scan returned unsuccessful");
      }

      setResult(data.data);
      return data.data;
    } catch (err: any) {
      const message = err.message || "Failed to connect to ScanGuard";
      setError(message);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsScanning(false);
  }, []);

  return { scan, result, isScanning, error, reset };
}
