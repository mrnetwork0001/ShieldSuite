// ─── Uniswap V3 Integration for XLayer ──────────────────────────────────────
//
// Queries Uniswap V3 contracts on XLayer for:
// - Pool existence (via Factory.getPool)
// - Pool liquidity (via Pool.liquidity + slot0)
// - Price quotes (via QuoterV2.quoteExactInputSingle)
//
// Used by ScanGuard to enrich scan results with DeFi liquidity data,
// and by ShieldSwap for route comparison.

import { ethers } from "ethers";
import { logger } from "./logger.js";
import { XLAYER_CONFIG } from "./types.js";

// ─── Uniswap V3 Contract Addresses (deterministic CREATE2) ──────────────────

// These are the canonical Uniswap V3 addresses (same across all EVM chains)
const UNISWAP_V3_FACTORY = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const UNISWAP_V3_QUOTER_V2 = "0x61fFE014bA17989E743c5F6cB21bF9697530B21e";

// Known base tokens to pair with when checking liquidity
const BASE_TOKENS = {
  WOKB: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
  USDT: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  USDC: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  WETH: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab",
};

// Fee tiers to check (in basis points × 100)
const FEE_TIERS = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

// ─── ABI Fragments ───────────────────────────────────────────────────────────

const FACTORY_ABI = [
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)",
];

const POOL_ABI = [
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() view returns (uint128)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
];

const QUOTER_ABI = [
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)",
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UniswapPoolInfo {
  poolAddress: string;
  token0: string;
  token1: string;
  fee: number;
  liquidity: string;
  sqrtPriceX96: string;
  tick: number;
}

export interface UniswapLiquidityResult {
  hasPool: boolean;
  bestPool: UniswapPoolInfo | null;
  totalPools: number;
  pools: UniswapPoolInfo[];
}

export interface UniswapQuoteResult {
  amountOut: string;
  fee: number;
  poolAddress: string;
  gasEstimate: string;
}

// ─── Provider ────────────────────────────────────────────────────────────────

let _provider: ethers.JsonRpcProvider;

function getProvider(): ethers.JsonRpcProvider {
  if (!_provider) {
    _provider = new ethers.JsonRpcProvider(
      process.env.XLAYER_RPC_URL || XLAYER_CONFIG.rpcUrl
    );
  }
  return _provider;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Check if Uniswap V3 Factory is deployed on XLayer
 */
export async function isUniswapAvailable(): Promise<boolean> {
  try {
    const provider = getProvider();
    const code = await provider.getCode(UNISWAP_V3_FACTORY);
    return code !== "0x" && code.length > 10;
  } catch {
    return false;
  }
}

/**
 * Find Uniswap V3 pools for a given token
 * Checks against all base tokens (WOKB, USDT, USDC, WETH) and all fee tiers
 */
export async function checkUniswapLiquidity(
  tokenAddress: string
): Promise<UniswapLiquidityResult> {
  const provider = getProvider();
  const normalizedToken = tokenAddress.toLowerCase();

  // Don't check base tokens against themselves
  const baseTokensToCheck = Object.values(BASE_TOKENS).filter(
    (addr) => addr.toLowerCase() !== normalizedToken
  );

  const pools: UniswapPoolInfo[] = [];

  try {
    // First check if factory exists
    const factoryCode = await provider.getCode(UNISWAP_V3_FACTORY);
    if (factoryCode === "0x") {
      logger.info("[Uniswap] Factory not deployed on XLayer — skipping");
      return { hasPool: false, bestPool: null, totalPools: 0, pools: [] };
    }

    const factory = new ethers.Contract(UNISWAP_V3_FACTORY, FACTORY_ABI, provider);

    // Check all combinations of base tokens × fee tiers
    const checkPromises: Promise<void>[] = [];

    for (const baseToken of baseTokensToCheck) {
      for (const fee of FEE_TIERS) {
        checkPromises.push(
          (async () => {
            try {
              const poolAddr = await factory.getPool(
                ethers.getAddress(tokenAddress),
                ethers.getAddress(baseToken),
                fee
              );

              if (poolAddr && poolAddr !== ethers.ZeroAddress) {
                // Pool exists — get liquidity data
                const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);
                const [liquidity, slot0Data, token0, token1] = await Promise.all([
                  pool.liquidity().catch(() => 0n),
                  pool.slot0().catch(() => null),
                  pool.token0().catch(() => ""),
                  pool.token1().catch(() => ""),
                ]);

                if (liquidity > 0n) {
                  pools.push({
                    poolAddress: poolAddr,
                    token0: token0.toLowerCase(),
                    token1: token1.toLowerCase(),
                    fee,
                    liquidity: liquidity.toString(),
                    sqrtPriceX96: slot0Data ? slot0Data[0].toString() : "0",
                    tick: slot0Data ? Number(slot0Data[1]) : 0,
                  });
                }
              }
            } catch {
              // Pool doesn't exist for this pair/fee — that's normal
            }
          })()
        );
      }
    }

    await Promise.all(checkPromises);

    // Sort by liquidity (highest first)
    pools.sort((a, b) => {
      const liqA = BigInt(a.liquidity);
      const liqB = BigInt(b.liquidity);
      return liqB > liqA ? 1 : liqB < liqA ? -1 : 0;
    });

    logger.info(
      `[Uniswap] Found ${pools.length} active pool(s) for ${tokenAddress.slice(0, 10)}...`
    );

    return {
      hasPool: pools.length > 0,
      bestPool: pools[0] || null,
      totalPools: pools.length,
      pools,
    };
  } catch (error: any) {
    logger.warn(`[Uniswap] Liquidity check failed: ${error.message}`);
    return { hasPool: false, bestPool: null, totalPools: 0, pools: [] };
  }
}

/**
 * Get a Uniswap V3 quote for a token swap
 * Uses QuoterV2 to simulate the swap without executing
 */
export async function getUniswapQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string; // in wei
  fee?: number;
}): Promise<UniswapQuoteResult | null> {
  const provider = getProvider();

  try {
    // Check quoter exists
    const quoterCode = await provider.getCode(UNISWAP_V3_QUOTER_V2);
    if (quoterCode === "0x") {
      logger.info("[Uniswap] QuoterV2 not deployed — skipping quote");
      return null;
    }

    const quoter = new ethers.Contract(UNISWAP_V3_QUOTER_V2, QUOTER_ABI, provider);
    const fee = params.fee || 3000; // Default 0.3%

    // QuoterV2 uses a struct param
    const quoteParams = {
      tokenIn: ethers.getAddress(params.tokenIn),
      tokenOut: ethers.getAddress(params.tokenOut),
      amountIn: params.amountIn,
      fee,
      sqrtPriceLimitX96: 0,
    };

    // Use staticCall since quoteExactInputSingle is not actually view
    const result = await quoter.quoteExactInputSingle.staticCall(quoteParams);

    return {
      amountOut: result.amountOut.toString(),
      fee,
      poolAddress: "", // QuoterV2 doesn't return pool address
      gasEstimate: result.gasEstimate.toString(),
    };
  } catch (error: any) {
    logger.warn(`[Uniswap] Quote failed: ${error.message}`);
    return null;
  }
}

/**
 * Get quotes across all fee tiers and return the best one
 */
export async function getBestUniswapQuote(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
}): Promise<UniswapQuoteResult | null> {
  const quotes = await Promise.all(
    FEE_TIERS.map((fee) =>
      getUniswapQuote({ ...params, fee }).catch(() => null)
    )
  );

  const validQuotes = quotes.filter(
    (q): q is UniswapQuoteResult => q !== null && BigInt(q.amountOut) > 0n
  );

  if (validQuotes.length === 0) return null;

  // Return the quote with the highest amountOut
  return validQuotes.reduce((best, curr) =>
    BigInt(curr.amountOut) > BigInt(best.amountOut) ? curr : best
  );
}

// ─── Uniswap V3 Swap Router Calldata Builder ────────────────────────────────
// Used as fallback when OKX DEX is geo-blocked (e.g. deployed on Railway/US servers)

// Canonical Uniswap V3 SwapRouter02 (universal across EVM chains)
const UNISWAP_V3_SWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

const SWAP_ROUTER_ABI = [
  "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
];

export interface UniswapSwapCalldata {
  tx: {
    to: string;
    data: string;
    value: string;
    gas: string;
  };
  routerResult: {
    toTokenAmount: string;
    fromTokenAmount: string;
  };
}

/**
 * Build unsigned Uniswap V3 SwapRouter02 calldata.
 * Returns a transaction object the frontend can sign and send via the user's wallet.
 */
export async function buildUniswapSwapCalldata(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  recipient: string;
  slippagePercent: number;
}): Promise<UniswapSwapCalldata | null> {
  // Resolve native token → WOKB for Uniswap
  const NATIVE = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  const WOKB = "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
  const isFromNative = params.tokenIn.toLowerCase() === NATIVE;
  const isToNative = params.tokenOut.toLowerCase() === NATIVE;
  const tokenIn = isFromNative ? WOKB : params.tokenIn;
  const tokenOut = isToNative ? WOKB : params.tokenOut;

  try {
    // First get a quote to determine amountOutMinimum
    const quote = await getBestUniswapQuote({
      tokenIn,
      tokenOut,
      amountIn: params.amountIn,
    });

    if (!quote || BigInt(quote.amountOut) === 0n) {
      logger.warn("[Uniswap] No quote available for swap calldata");
      return null;
    }

    // Apply slippage tolerance
    const slippageBps = BigInt(Math.floor(params.slippagePercent * 100)); // e.g. 0.5% → 50 bps
    const amountOutMin = (BigInt(quote.amountOut) * (10000n - slippageBps)) / 10000n;

    // Encode the exactInputSingle call
    const iface = new ethers.Interface(SWAP_ROUTER_ABI);
    const swapParams = {
      tokenIn: ethers.getAddress(tokenIn),
      tokenOut: ethers.getAddress(tokenOut),
      fee: quote.fee,
      recipient: ethers.getAddress(params.recipient),
      amountIn: params.amountIn,
      amountOutMinimum: amountOutMin.toString(),
      sqrtPriceLimitX96: 0,
    };

    const calldata = iface.encodeFunctionData("exactInputSingle", [swapParams]);

    // If sending native token (OKB), value = amountIn; otherwise value = 0
    const txValue = isFromNative ? params.amountIn : "0";

    logger.info(`[Uniswap] Built swap calldata: ${tokenIn.slice(0, 10)} → ${tokenOut.slice(0, 10)}, fee=${quote.fee}, amountOutMin=${amountOutMin}`);

    return {
      tx: {
        to: UNISWAP_V3_SWAP_ROUTER,
        data: calldata,
        value: txValue,
        gas: quote.gasEstimate || "350000",
      },
      routerResult: {
        toTokenAmount: quote.amountOut,
        fromTokenAmount: params.amountIn,
      },
    };
  } catch (error: any) {
    logger.error(`[Uniswap] Failed to build swap calldata: ${error.message}`);
    return null;
  }
}

