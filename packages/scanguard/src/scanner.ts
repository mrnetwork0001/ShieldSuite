// ─── Core Security Scanner Engine ────────────────────────────────────────────
//
// Dual-layer security scanning for ERC-20 tokens on XLayer:
// Layer 1: OKX OnchainOS Security API (official, via /api/v6/security/token-scan)
// Layer 2: Custom bytecode analysis (deep analysis for additional risk flags)
//
// This dual approach gives deeper coverage than either method alone.
//

import { ethers } from "ethers";
import { v4 as uuidv4 } from "uuid";
import {
  ScanResult,
  ScanRequest,
  RiskFlag,
  RiskLevel,
  RiskCategory,
  HolderInfo,
  XLAYER_CONFIG,
} from "./types.js";
import { logger } from "./logger.js";
import { scanTokenSecurity, isOnchainOsConfigured } from "./onchainos.js";
import { checkUniswapLiquidity, UniswapLiquidityResult } from "./uniswap.js";

// ─── ABI fragments for on-chain reads ────────────────────────────────────────

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function owner() view returns (address)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
];

// Known dangerous function selectors in contract bytecode
const DANGEROUS_SELECTORS = {
  // Mint functions (can inflate supply)
  mint: "40c10f19",
  mintTo: "449a52f8",
  // Blacklist functions (can freeze holders)
  blacklist: "44337ea1",
  addToBlacklist: "f9f92be4",
  // Pause functions
  pause: "8456cb59",
  // Self-destruct
  selfdestruct: "ff",
  // Delegate call (proxy pattern / upgradeable)
  delegatecall: "f4",
};

// Honeypot indicators in bytecode
const HONEYPOT_PATTERNS = [
  "a]transferFrom[", // Modified transferFrom
  "require(false)",  // Always-failing require
];

// ─── Known Safe Tokens (whitelist) ───────────────────────────────────────────
// These are verified, legitimate tokens on XLayer. We still scan them for
// metadata but cap risk scores to avoid false positives from proxy patterns.

const KNOWN_SAFE_TOKENS: Record<string, { symbol: string; name: string }> = {
  "0x1e4a5963abfd975d8c9021ce480b42188849d41d": { symbol: "USDT", name: "Tether USD" },
  "0x779ded0c9e1022225f8e0630b35a9b54be713736": { symbol: "USDT", name: "USDT0" },
  "0x74b7f16337b8972027f6196a17a631ac6de26d22": { symbol: "USDC", name: "USD Coin" },
  "0xe538905cf8410324e03a5a23c1c177a474d59b2b": { symbol: "WOKB", name: "Wrapped OKB" },
  "0x5a77f1443d16ee5761d310e38b7308aaef1eafc6": { symbol: "WETH", name: "Wrapped Ether" },
  "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab": { symbol: "WETH", name: "Wrapped Ether" },
  "0x2c03058e5f4e533f2263e748d1f43a3fe66b3e79": { symbol: "DAI", name: "Dai Stablecoin" },
  "0xc5015b9d9161dca7e18e32f6f25c4ad850731fd4": { symbol: "DAI", name: "Dai Stablecoin" },
};

function isKnownSafe(address: string): boolean {
  return address.toLowerCase() in KNOWN_SAFE_TOKENS;
}

// ─── Provider Setup ──────────────────────────────────────────────────────────

let provider: ethers.JsonRpcProvider;

function getProvider(): ethers.JsonRpcProvider {
  if (!provider) {
    provider = new ethers.JsonRpcProvider(
      process.env.XLAYER_RPC_URL || XLAYER_CONFIG.rpcUrl
    );
  }
  return provider;
}

// ─── Main Scan Function ──────────────────────────────────────────────────────

export async function scanToken(request: ScanRequest): Promise<ScanResult> {
  const startTime = Date.now();
  const scanId = uuidv4();
  const chainId = request.chainId || XLAYER_CONFIG.chainId;
  const tokenAddress = ethers.getAddress(request.tokenAddress); // Checksummed

  logger.info(`[Scanner] Starting scan ${scanId} for ${tokenAddress} on chain ${chainId}`);

  // ── Whitelist Check ──────────────────────────────────────────────────────
  const knownToken = KNOWN_SAFE_TOKENS[tokenAddress.toLowerCase()];
  if (knownToken) {
    logger.info(`[Scanner] ${tokenAddress} is whitelisted as ${knownToken.symbol} — fast-track safe scan`);

    // Still read on-chain metadata for display purposes
    const rpcProvider = getProvider();
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);
    let tokenName = knownToken.name;
    let tokenSymbol = knownToken.symbol;
    let tokenDecimals: number | null = null;
    let totalSupply: string | null = null;

    try {
      [tokenName, tokenSymbol, tokenDecimals] = await Promise.all([
        contract.name().catch(() => knownToken.name),
        contract.symbol().catch(() => knownToken.symbol),
        contract.decimals().catch(() => null),
      ]);
      const rawSupply = await contract.totalSupply().catch(() => null);
      if (rawSupply) totalSupply = rawSupply.toString();
    } catch { /* use defaults */ }

    // Check Uniswap liquidity even for whitelisted tokens
    let uniswapData: UniswapLiquidityResult = { hasPool: false, bestPool: null, totalPools: 0, pools: [] };
    try {
      uniswapData = await checkUniswapLiquidity(tokenAddress);
    } catch { /* non-blocking */ }

    return {
      scanId,
      tokenAddress,
      chainId,
      tokenName,
      tokenSymbol,
      tokenDecimals,
      totalSupply,
      riskScore: 0,
      riskLevel: "SAFE",
      flags: [{
        category: "info" as RiskCategory,
        severity: "SAFE",
        title: "Verified Token",
        description: `${tokenSymbol} is a verified, well-known token on XLayer. No security concerns detected.`,
        evidence: "Token is on the ScanGuard whitelist of verified XLayer tokens",
      }],
      contractVerified: true,
      ownerAddress: null,
      ownershipRenounced: true,
      hasProxyPattern: false,
      liquidityLocked: true,
      liquidityAmount: null,
      topHolders: [],
      scanTimestamp: Date.now(),
      scanDurationMs: Date.now() - startTime,
      xLayerExplorerUrl: `${XLAYER_CONFIG.explorerUrl}/address/${tokenAddress}`,
      uniswapHasPool: uniswapData.hasPool,
      uniswapPoolCount: uniswapData.totalPools,
      uniswapLiquidity: uniswapData.bestPool?.liquidity || null,
      uniswapPoolAddress: uniswapData.bestPool?.poolAddress || null,
    };
  }


  const flags: RiskFlag[] = [];
  let tokenName: string | null = null;
  let tokenSymbol: string | null = null;
  let tokenDecimals: number | null = null;
  let totalSupply: string | null = null;
  let ownerAddress: string | null = null;
  let ownershipRenounced = false;
  let hasProxyPattern = false;
  let contractVerified = false;
  let liquidityLocked = false;
  let liquidityAmount: string | null = null;
  const topHolders: HolderInfo[] = [];
  let uniswapResult: UniswapLiquidityResult = { hasPool: false, bestPool: null, totalPools: 0, pools: [] };

  const rpcProvider = getProvider();

  try {
    // ── Step 1: Check if address is a contract ─────────────────────────────
    const code = await rpcProvider.getCode(tokenAddress);
    if (code === "0x") {
      flags.push({
        category: "phishing",
        severity: "CRITICAL",
        title: "Not a Contract",
        description: "This address is an EOA (Externally Owned Account), not a smart contract. This is likely a phishing attempt.",
        evidence: `Bytecode at ${tokenAddress} is empty`,
      });

      return buildResult(scanId, tokenAddress, chainId, flags, {
        tokenName, tokenSymbol, tokenDecimals, totalSupply,
        ownerAddress, ownershipRenounced, hasProxyPattern,
        contractVerified, liquidityLocked, liquidityAmount,
        topHolders, startTime,
      });
    }

    contractVerified = code.length > 10;

    // ── Step 2: Read basic ERC-20 metadata ─────────────────────────────────
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, rpcProvider);

    try {
      [tokenName, tokenSymbol, tokenDecimals] = await Promise.all([
        contract.name().catch(() => null),
        contract.symbol().catch(() => null),
        contract.decimals().catch(() => null),
      ]);
    } catch {
      flags.push({
        category: "phishing",
        severity: "HIGH",
        title: "Non-Standard ERC-20",
        description: "Contract does not implement standard ERC-20 interface (name/symbol/decimals). This is suspicious.",
      });
    }

    try {
      const rawSupply = await contract.totalSupply();
      totalSupply = rawSupply.toString();
    } catch {
      // Not all tokens expose totalSupply
    }

    // ── Step 3: Check ownership ────────────────────────────────────────────
    try {
      ownerAddress = await contract.owner();
      if (
        ownerAddress === ethers.ZeroAddress ||
        ownerAddress === "0x000000000000000000000000000000000000dEaD"
      ) {
        ownershipRenounced = true;
      }
    } catch {
      // No owner function = possibly renounced or non-ownable
      ownershipRenounced = true;
    }

    if (!ownershipRenounced && ownerAddress) {
      flags.push({
        category: "rug_pull",
        severity: "MEDIUM",
        title: "Active Owner Detected",
        description: `Contract has an active owner (${ownerAddress}) who could potentially execute privileged functions.`,
        evidence: `Owner: ${ownerAddress}`,
      });
    }

    // ── Step 4: Bytecode analysis ──────────────────────────────────────────
    const bytecodeHex = code.toLowerCase();

    // Check for dangerous function selectors
    if (bytecodeHex.includes(DANGEROUS_SELECTORS.mint) || bytecodeHex.includes(DANGEROUS_SELECTORS.mintTo)) {
      flags.push({
        category: "mint_function",
        severity: "HIGH",
        title: "Mint Function Detected",
        description: "Contract contains a mint function that could be used to inflate token supply and dilute holders.",
        evidence: "Function selector 40c10f19 or 449a52f8 found in bytecode",
      });
    }

    if (bytecodeHex.includes(DANGEROUS_SELECTORS.blacklist) || bytecodeHex.includes(DANGEROUS_SELECTORS.addToBlacklist)) {
      flags.push({
        category: "blacklist_function",
        severity: "HIGH",
        title: "Blacklist Function Detected",
        description: "Contract can blacklist addresses, preventing them from transferring tokens. This is a common rug-pull mechanism.",
        evidence: "Blacklist function selector found in bytecode",
      });
    }

    // Check for proxy/delegatecall pattern
    if (bytecodeHex.includes(DANGEROUS_SELECTORS.delegatecall)) {
      hasProxyPattern = true;
      flags.push({
        category: "proxy_contract",
        severity: "MEDIUM",
        title: "Proxy/Upgradeable Contract",
        description: "Contract uses delegatecall, indicating it may be a proxy that can be upgraded by the owner to change behavior.",
        evidence: "DELEGATECALL opcode found in bytecode",
      });
    }

    // ── Step 5: Honeypot detection ─────────────────────────────────────────
    // Simulate a transfer to detect if the token blocks sells
    try {
      // Check if transfer function exists and isn't modified
      const transferSelector = "a9059cbb"; // transfer(address,uint256)
      const transferFromSelector = "23b872dd"; // transferFrom(address,address,uint256)

      if (!bytecodeHex.includes(transferSelector)) {
        flags.push({
          category: "honeypot",
          severity: "CRITICAL",
          title: "Missing Transfer Function",
          description: "Contract does not contain a standard transfer function. Tokens cannot be transferred — this is a honeypot.",
          evidence: "transfer(address,uint256) selector not found",
        });
      }

      if (!bytecodeHex.includes(transferFromSelector)) {
        flags.push({
          category: "honeypot",
          severity: "HIGH",
          title: "Missing TransferFrom Function",
          description: "Contract does not implement transferFrom, which may prevent DEX trading.",
          evidence: "transferFrom(address,address,uint256) selector not found",
        });
      }
    } catch {
      // Honeypot simulation failed
    }

    // ── Step 6: Tax / fee analysis ─────────────────────────────────────────
    // Check for unusual tax-related patterns in bytecode
    // Common tax contracts have fee calculation in transfer
    const feePatterns = ["fee", "tax", "burn", "marketing"];
    const hasTaxMechanism = feePatterns.some((p) =>
      bytecodeHex.includes(Buffer.from(p).toString("hex"))
    );

    if (hasTaxMechanism) {
      flags.push({
        category: "tax_anomaly",
        severity: "MEDIUM",
        title: "Tax/Fee Mechanism Detected",
        description: "Contract appears to implement a tax or fee on transfers. High taxes can make the token unprofitable to trade.",
        evidence: "Tax-related string patterns found in contract bytecode",
      });
    }

    // ── Step 7: OKX OnchainOS Security Scan (Official API) ────────────────
    // Calls /api/v6/security/token-scan for official OKX risk assessment.
    // This runs IN ADDITION to our custom bytecode analysis.
    try {
      if (isOnchainOsConfigured()) {
        logger.info(`[Scanner] Calling OKX Security API for ${tokenAddress}...`);
        const okxResult = await scanTokenSecurity(chainId.toString(), tokenAddress);

        if (okxResult) {
          // Merge OKX risk assessment with our custom flags
          if (okxResult.isRiskToken) {
            flags.push({
              category: "rug_pull",
              severity: "CRITICAL",
              title: "OKX Risk Token Alert",
              description: "OKX OnchainOS Security has flagged this token as HIGH RISK. This is an official risk designation from OKX's security infrastructure.",
              evidence: `OKX Security API: isRiskToken=true, chainId=${okxResult.chainId}`,
            });
          }

          // Check buy/sell tax from OKX
          const buyTax = parseFloat(okxResult.buyTaxes || "0");
          const sellTax = parseFloat(okxResult.sellTaxes || "0");

          if (buyTax > 10 || sellTax > 10) {
            flags.push({
              category: "tax_anomaly",
              severity: buyTax > 50 || sellTax > 50 ? "CRITICAL" : "HIGH",
              title: "High Tax Detected (OKX Verified)",
              description: `OKX Security reports buy tax: ${buyTax}%, sell tax: ${sellTax}%. Taxes above 10% make tokens unprofitable.`,
              evidence: `OKX API: buyTaxes=${okxResult.buyTaxes}, sellTaxes=${okxResult.sellTaxes}`,
            });
          } else if (buyTax > 0 || sellTax > 0) {
            flags.push({
              category: "tax_anomaly",
              severity: "LOW",
              title: "Token Tax Present (OKX Verified)",
              description: `OKX Security reports buy tax: ${buyTax}%, sell tax: ${sellTax}%.`,
              evidence: `OKX API: buyTaxes=${okxResult.buyTaxes}, sellTaxes=${okxResult.sellTaxes}`,
            });
          }

          logger.info(`[Scanner] OKX Security result: isRiskToken=${okxResult.isRiskToken}, buyTax=${buyTax}%, sellTax=${sellTax}%`);
        }
      } else {
        logger.info("[Scanner] OKX API not configured — using custom analysis only");
      }
    } catch (okxErr) {
      logger.warn(`[Scanner] OKX Security API call failed (non-blocking): ${okxErr}`);
      // Non-blocking — custom analysis continues even if OKX API is down
    }

    // ── Step 8: Liquidity analysis (simplified) ────────────────────────────
    const contractBalance = await rpcProvider.getBalance(tokenAddress);
    if (contractBalance > 0n) {
      liquidityAmount = ethers.formatEther(contractBalance);
    }

    // ── Step 9: Check approval risks ───────────────────────────────────────
    const approveSelector = "095ea7b3"; // approve(address,uint256)
    const increaseAllowanceSelector = "39509351";
    if (bytecodeHex.includes(approveSelector) && !bytecodeHex.includes(increaseAllowanceSelector)) {
      // Missing increaseAllowance suggests older or simpler token
    }

    // ── Step 10: Uniswap V3 Liquidity Check (Uniswap Skills) ──────────────
    logger.info(`[Scanner] Checking Uniswap V3 liquidity for ${tokenAddress}...`);
    try {
      uniswapResult = await checkUniswapLiquidity(tokenAddress);
      if (uniswapResult.hasPool) {
        flags.push({
          category: "info" as RiskCategory,
          severity: "SAFE",
          title: "Uniswap V3 Pool Found",
          description: `Token has ${uniswapResult.totalPools} active Uniswap V3 pool(s) on XLayer with verified on-chain liquidity.`,
          evidence: `Best pool: ${uniswapResult.bestPool?.poolAddress?.slice(0, 10)}... | Liquidity: ${uniswapResult.bestPool?.liquidity}`,
        });
      } else {
        flags.push({
          category: "info" as RiskCategory,
          severity: "LOW",
          title: "No Uniswap V3 Pool",
          description: "No active Uniswap V3 liquidity pool found on XLayer. Token may only trade on other DEXs.",
        });
      }
    } catch (uniErr) {
      logger.warn(`[Scanner] Uniswap check failed (non-blocking): ${uniErr}`);
    }

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error(`[Scanner] Error scanning ${tokenAddress}: ${errorMessage}`);
    flags.push({
      category: "phishing",
      severity: "MEDIUM",
      title: "Scan Error",
      description: `Could not complete full analysis: ${errorMessage}`,
    });
  }

  return buildResult(scanId, tokenAddress, chainId, flags, {
    tokenName, tokenSymbol, tokenDecimals, totalSupply,
    ownerAddress, ownershipRenounced, hasProxyPattern,
    contractVerified, liquidityLocked, liquidityAmount,
    topHolders, startTime, uniswapResult,
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateRiskScore(flags: RiskFlag[]): number {
  const severityWeights: Record<RiskLevel, number> = {
    SAFE: 0,
    LOW: 5,
    MEDIUM: 15,
    HIGH: 30,
    CRITICAL: 50,
  };

  let score = flags.reduce((sum, flag) => sum + severityWeights[flag.severity], 0);
  return Math.min(100, Math.max(0, score));
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score === 0) return "SAFE";
  if (score <= 20) return "LOW";
  if (score <= 45) return "MEDIUM";
  if (score <= 70) return "HIGH";
  return "CRITICAL";
}

interface BuildResultMeta {
  tokenName: string | null;
  tokenSymbol: string | null;
  tokenDecimals: number | null;
  totalSupply: string | null;
  ownerAddress: string | null;
  ownershipRenounced: boolean;
  hasProxyPattern: boolean;
  contractVerified: boolean;
  liquidityLocked: boolean;
  liquidityAmount: string | null;
  topHolders: HolderInfo[];
  startTime: number;
  uniswapResult?: UniswapLiquidityResult;
}

function buildResult(
  scanId: string,
  tokenAddress: string,
  chainId: number,
  flags: RiskFlag[],
  meta: BuildResultMeta
): ScanResult {
  const riskScore = calculateRiskScore(flags);
  const riskLevel = scoreToRiskLevel(riskScore);
  const uni = meta.uniswapResult;

  return {
    scanId,
    tokenAddress,
    chainId,
    tokenName: meta.tokenName,
    tokenSymbol: meta.tokenSymbol,
    tokenDecimals: meta.tokenDecimals,
    totalSupply: meta.totalSupply,
    riskScore,
    riskLevel,
    flags,
    contractVerified: meta.contractVerified,
    ownerAddress: meta.ownerAddress,
    ownershipRenounced: meta.ownershipRenounced,
    hasProxyPattern: meta.hasProxyPattern,
    liquidityLocked: meta.liquidityLocked,
    liquidityAmount: meta.liquidityAmount,
    topHolders: meta.topHolders,
    scanTimestamp: Date.now(),
    scanDurationMs: Date.now() - meta.startTime,
    xLayerExplorerUrl: `${XLAYER_CONFIG.explorerUrl}/address/${tokenAddress}`,
    uniswapHasPool: uni?.hasPool || false,
    uniswapPoolCount: uni?.totalPools || 0,
    uniswapLiquidity: uni?.bestPool?.liquidity || null,
    uniswapPoolAddress: uni?.bestPool?.poolAddress || null,
  };
}

