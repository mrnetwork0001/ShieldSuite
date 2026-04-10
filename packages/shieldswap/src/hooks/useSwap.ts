// ─── useSwap Hook ────────────────────────────────────────────────────────────
// Handles swap execution via Uniswap/DEX aggregation on X Layer.

import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { XLAYER_CHAIN } from "../lib/xlayer";

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  slippage: number;
  recipient: string;
}

export interface SwapQuote {
  amountOut: string;
  priceImpact: number;
  route: string[];
  gasEstimate: string;
  exchangeRate: string;
}

export interface SwapResult {
  txHash: string;
  status: "pending" | "confirmed" | "failed";
  amountIn: string;
  amountOut: string;
  explorerUrl: string;
}

export interface UseSwapReturn {
  getQuote: (params: Omit<SwapParams, "recipient">) => Promise<SwapQuote | null>;
  executeSwap: (params: SwapParams, signer: ethers.Signer) => Promise<SwapResult | null>;
  quote: SwapQuote | null;
  swapResult: SwapResult | null;
  isQuoting: boolean;
  isSwapping: boolean;
  error: string | null;
  reset: () => void;
}

// Uniswap V3 Router on X Layer (placeholder — replace with actual deployment)
const UNISWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

// Simplified Uniswap Router ABI for swaps
const ROUTER_ABI = [
  "function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

export function useSwap(): UseSwapReturn {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [swapResult, setSwapResult] = useState<SwapResult | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(
    async (params: Omit<SwapParams, "recipient">): Promise<SwapQuote | null> => {
      setIsQuoting(true);
      setError(null);

      try {
        // Simulated quote for hackathon demo
        // In production, this would call a DEX aggregator API or on-chain quoter
        const amountInNum = parseFloat(params.amountIn);
        if (isNaN(amountInNum) || amountInNum <= 0) {
          throw new Error("Invalid amount");
        }

        // Simulate network delay for realistic UX
        await new Promise((r) => setTimeout(r, 800));

        // Mock exchange rate (in production: query Uniswap Quoter contract)
        const mockRate = 0.95 + Math.random() * 0.08; // 0.95–1.03
        const amountOut = (amountInNum * mockRate).toFixed(6);
        const priceImpact = Math.random() * 2; // 0–2%

        const result: SwapQuote = {
          amountOut,
          priceImpact: parseFloat(priceImpact.toFixed(2)),
          route: [params.tokenIn, params.tokenOut],
          gasEstimate: (0.001 + Math.random() * 0.002).toFixed(6),
          exchangeRate: mockRate.toFixed(6),
        };

        setQuote(result);
        return result;
      } catch (err: any) {
        setError(err.message || "Failed to get quote");
        return null;
      } finally {
        setIsQuoting(false);
      }
    },
    []
  );

  const executeSwap = useCallback(
    async (params: SwapParams, signer: ethers.Signer): Promise<SwapResult | null> => {
      setIsSwapping(true);
      setError(null);

      try {
        // In production, this would execute via Uniswap Router contract
        // For hackathon: simulate the swap transaction

        const network = await signer.provider?.getNetwork();
        if (network && Number(network.chainId) !== XLAYER_CHAIN.chainId) {
          throw new Error("Please switch to X Layer network");
        }

        // Simulate transaction delay
        await new Promise((r) => setTimeout(r, 2000));

        // Generate a pseudo tx hash for demo
        const mockTxHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;

        const result: SwapResult = {
          txHash: mockTxHash,
          status: "confirmed",
          amountIn: params.amountIn,
          amountOut: quote?.amountOut || "0",
          explorerUrl: `${XLAYER_CHAIN.blockExplorerUrls[0]}/tx/${mockTxHash}`,
        };

        setSwapResult(result);
        return result;
      } catch (err: any) {
        setError(err.message || "Swap failed");
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
