// ─── useSwap Hook ────────────────────────────────────────────────────────────
// Real swap quotes via OKX DEX Aggregator (proxied through ScanGuard backend)

import { useState, useCallback, useRef, useEffect } from "react";
import { ethers } from "ethers";
import { XLAYER_CHAIN } from "../lib/xlayer";

// ─── Friendly Error Messages ─────────────────────────────────────────────────
function getFriendlyError(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes("user rejected") || lower.includes("user denied"))
    return "Transaction cancelled — you rejected the request in your wallet.";

  if (lower.includes("insufficient funds") || lower.includes("insufficient balance"))
    return "Insufficient balance — you don't have enough tokens or OKB for gas. Check your wallet balance.";

  if (lower.includes("nonce"))
    return "Transaction nonce error — try resetting your wallet's pending transactions.";

  if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch"))
    return "Network error — please check your internet connection and VPN, then try again.";

  if (lower.includes("execution reverted") || lower.includes("third-party"))
    return "Swap reverted on-chain — this usually means high slippage or low liquidity. Try increasing slippage or reducing the amount.";

  if (lower.includes("timeout") || lower.includes("timed out"))
    return "Request timed out — the network may be congested. Please try again in a moment.";

  if (lower.includes("chain") || lower.includes("network mismatch"))
    return "Wrong network — please switch to X Layer Mainnet (Chain ID 196) in your wallet.";

  if (lower.includes("gas") && lower.includes("estimate"))
    return "Gas estimation failed — the transaction may fail. Try a different token pair or amount.";

  // If it's already a reasonable length, return as-is
  if (raw.length < 120) return raw;

  // Truncate very long errors
  return raw.slice(0, 100) + "... (check console for details)";
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;        // human-readable amount
  fromDecimals: number;
  toDecimals: number;
  slippage: number;
  recipient?: string;
  isNative?: boolean;
}

export interface SwapQuote {
  amountOut: string;     // human-readable output amount
  priceImpact: string;
  gasEstimate: string;
  exchangeRate: string;
  source: string;        // "okx-dex" or "estimated"
  uniswapAmountOut: string | null;  // human-readable Uniswap V3 quote (null if no pool)
}

export interface SwapResult {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  amountIn: string;
  amountOut: string;
  explorerUrl: string;
}

export interface UseSwapReturn {
  getQuote: (params: SwapParams) => Promise<SwapQuote | null>;
  executeSwap: (params: SwapParams & { recipient: string }, signer: ethers.Signer) => Promise<SwapResult | null>;
  quote: SwapQuote | null;
  swapResult: SwapResult | null;
  isQuoting: boolean;
  isSwapping: boolean;
  error: string | null;
  reset: () => void;
}

const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";

export function useSwap(): UseSwapReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const getQuote = useCallback(
    async (params: SwapParams): Promise<SwapQuote | null> => {
      // Cancel any pending quote request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsQuoting(true);
      setError(null);

      try {
        const amountIn = parseFloat(params.amount);
        if (isNaN(amountIn) || amountIn <= 0) {
          throw new Error("Enter a valid amount");
        }

        // Convert to minimal units for the API
        const amountWei = ethers.parseUnits(params.amount, params.fromDecimals).toString();

        const queryStr = new URLSearchParams({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: amountWei,
          slippage: params.slippage.toString(),
        }).toString();

        const res = await fetch(`${API_BASE}/api/dex/quote?${queryStr}`, {
          signal: controller.signal,
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error?.message || "Quote failed");
        }

        // Parse the response — toTokenAmount is in minimal units (wei)
        const rawAmountOut = data.data.toTokenAmount || data.data.amountOut || "0";
        const outDecimals = params.toDecimals || 6;
        
        let amountOut: string;
        try {
          // Convert from minimal units to human-readable
          amountOut = ethers.formatUnits(rawAmountOut, outDecimals);
          // Clean up trailing zeros but keep reasonable precision
          amountOut = parseFloat(amountOut).toFixed(Math.min(outDecimals, 6));
        } catch {
          amountOut = parseFloat(rawAmountOut).toFixed(6);
        }

        const source = data.meta?.source === "okx-dex" ? "okx-dex" : (data.meta?.source || "estimated");

        // ── Fetch Uniswap V3 quote concurrently (fire-and-forget on failure) ──
        let uniswapAmountOut: string | null = null;
        try {
          const uniQuery = new URLSearchParams({
            fromToken: params.fromToken,
            toToken: params.toToken,
            amount: amountWei,
          }).toString();
          const uniRes = await fetch(`${API_BASE}/api/dex/uniswap-quote?${uniQuery}`, {
            signal: controller.signal,
          });
          const uniData = await uniRes.json();
          if (uniData.success && uniData.data?.amountOut) {
            const rawUniOut = uniData.data.amountOut;
            const outDec = params.toDecimals || 6;
            try {
              uniswapAmountOut = parseFloat(ethers.formatUnits(rawUniOut, outDec)).toFixed(Math.min(outDec, 6));
            } catch {
              uniswapAmountOut = null;
            }
          }
        } catch {
          // Uniswap quote failed or no pool — that's fine, leave null
        }

        const result: SwapQuote = {
          amountOut,
          priceImpact: data.data.priceImpact || "0.01",
          gasEstimate: data.data.estimatedGas || "50000",
          exchangeRate: amountIn > 0 ? (parseFloat(amountOut) / amountIn).toFixed(6) : "0",
          source,
          uniswapAmountOut,
        };

        setQuote(result);
        return result;
      } catch (err: any) {
        if (err.name === "AbortError") return null;
        setError(getFriendlyError(err.message || "Failed to get quote"));
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    []
  );

  const executeSwap = useCallback(
    async (
      params: SwapParams & { recipient: string },
      signer: ethers.Signer
    ): Promise<SwapResult | null> => {
      setIsSwapping(true);
      setError(null);

      try {
        const network = await signer.provider?.getNetwork();
        if (network && Number(network.chainId) !== XLAYER_CHAIN.chainId) {
          throw new Error("Please switch to X Layer network");
        }

        const amountWei = ethers.parseUnits(params.amount, params.fromDecimals).toString();

        // Get swap data from backend proxy
        const queryStr = new URLSearchParams({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: amountWei,
          wallet: params.recipient,
          slippage: params.slippage.toString(),
        }).toString();

        // Extract tx fields from OKX response
        // V6 response: { routerResult: {...quote info...}, tx: { to, data, value, gas, ... } }
        const extractTx = (responseData: any) => {
          if (responseData?.tx?.to && responseData?.tx?.data) return responseData.tx;
          const rr = responseData?.routerResult;
          if (rr?.to && rr?.data) return rr;
          return null;
        };

        const fetchSwapData = async () => {
          const r = await fetch(`${API_BASE}/api/dex/swap?${queryStr}`);
          const d = await r.json();
          return d.success ? extractTx(d.data) : null;
        };

        // Approval is handled by the UI Approve button.
        // The UI checks for MaxUint256-level allowance and prompts the user if needed.

        // ── Fetch fresh swap calldata ──
        const txInfo = await fetchSwapData();

        if (!txInfo) {
          throw new Error(
            "Swap transaction not available. The OKX DEX API couldn't build the transaction. " +
            "Ensure your VPN is active and try again."
          );
        }

        // ── Step 3: Execute the swap ──
        const tx = await signer.sendTransaction({
          to: txInfo.to,
          data: txInfo.data,
          value: txInfo.value ? BigInt(txInfo.value) : 0n,
          gasLimit: txInfo.gas ? BigInt(txInfo.gas) : undefined,
          gasPrice: txInfo.gasPrice ? BigInt(txInfo.gasPrice) : undefined,
        });

        const receipt = await tx.wait();

        const result: SwapResult = {
          txHash: tx.hash,
          status: receipt?.status === 1 ? "confirmed" : "failed",
          amountIn: params.amount,
          amountOut: quote?.amountOut || "0",
          explorerUrl: `${XLAYER_CHAIN.blockExplorerUrls[0]}/tx/${tx.hash}`,
        };

        setSwapResult(result);
        return result;
      } catch (err: any) {
        const msg = err.message || "Swap failed";
        // Transform cryptic errors into user-friendly messages
        const friendlyError = getFriendlyError(msg);
        setError(friendlyError);
        return null;
      } finally {
        setIsSwapping(false);
      }
    },
    [quote]
  );

  const reset = useCallback(() => {
    setQuote(null);
    setSwapResult(null);
    setError(null);
  }, []);

  return {
    getQuote,
    executeSwap,
    quote,
    swapResult,
    isQuoting,
    isSwapping,
    error,
    reset,
  };
}
