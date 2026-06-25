// ─── SwapCard Component ──────────────────────────────────────────────────────
// Trading Campaign Phase 1 swap card.
// NOTE: The interactive swap card inputs and security scan/audit modules are
// commented out for the Warm-Up Trading Campaign, and can be uncommented after the campaign.

import React, { useState, useCallback, useEffect, useRef } from "react";
import { CheckIcon, SettingsIcon, SwapIcon, WarningOctagonIcon, WarningIcon, BlockedIcon, UnlockIcon, ShieldIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";
import { useLanguage } from "../context/LanguageContext";

/*
// Original Swap & Security Scan Imports (Commented out for campaign)
import { useScanGuard, ScanResult } from "../hooks/useScanGuard";
import { useSwap, SwapQuote } from "../hooks/useSwap";
import { TOKEN_LIST, TokenInfo, findToken, XLAYER_TOKENS } from "../lib/xlayer";
import TokenSelector, { TokenLogo } from "./TokenSelector";
*/

interface SwapCardProps {
  wallet: WalletState;
  onConnect: () => void;
  onScanResult: (result: any | null) => void;
  onActivityLog: (entry: ActivityEntry) => void;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: "scan" | "swap" | "warning" | "info";
  message: string;
}

/*
// Original Swap Stages (Commented out for campaign)
type SwapStage = "input" | "scanning" | "scanned" | "quoting" | "ready" | "swapping" | "complete";
const DEFAULT_FROM = { symbol: "USDC", address: "0x74b7f16337b8972027f6196a17a631ac6de26d22", decimals: 6, logoColor: "#2775CA", isNative: false };
const DEFAULT_TO = { symbol: "USDT", address: "0x1e4a5963abfd975d8c9021ce480b42188849d41d", decimals: 6, logoColor: "#26A17B", isNative: false };
*/

const SwapCard: React.FC<SwapCardProps> = ({
  wallet,
  onConnect,
  onScanResult,
  onActivityLog,
}) => {
  const { language, t } = useLanguage();

  // ─── Active Campaign States ──────────────────────────────────────────
  const [userVolume, setUserVolume] = useState<number | null>(null);
  const [userRank, setUserRank] = useState<number | string | null>(null);
  const [hasShares, setHasShares] = useState<boolean | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [txHashInput, setTxHashInput] = useState("");
  const [syncingTx, setSyncingTx] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [syncStatusType, setSyncStatusType] = useState<"success" | "error" | "">("");

  const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";

  /*
  // Original Swap States & Hooks (Commented out for campaign)
  const [fromToken, setFromToken] = useState<any>(DEFAULT_FROM);
  const [toToken, setToToken] = useState<any>(DEFAULT_TO);
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<SwapStage>("input");
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<"from" | "to" | null>(null);
  const [fromBalance, setFromBalance] = useState<string | null>(null);
  const [toBalance, setToBalance] = useState<string | null>(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  const { scan, result: scanResult, isScanning, error: scanError } = useScanGuard();
  const { getQuote, executeSwap, quote, swapResult, isQuoting, isSwapping, error: swapError, reset: resetSwap } = useSwap();
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  */

  const addLog = useCallback(
    (type: ActivityEntry["type"], message: string) => {
      onActivityLog({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
        type,
        message,
      });
    },
    [onActivityLog]
  );

  /*
  // Original Auto-scan & Balances Effects (Commented out for campaign)
  useEffect(() => {
    if (!fromToken.address || fromToken.isNative) return;
    setStage("scanning");
    onScanResult(null);
    resetSwap();
    addLog("scan", `Scanning ${fromToken.symbol}...`);
    scan(fromToken.address).then((result) => {
      if (result) {
        setStage("scanned");
        onScanResult(result);
        addLog(result.riskLevel === "SAFE" || result.riskLevel === "LOW" ? "info" : "warning", `${fromToken.symbol} risk: ${result.riskScore}/100`);
      } else {
        setStage("input");
      }
    });
  }, [fromToken.address]);

  useEffect(() => {
    if (!wallet.connected || !wallet.address || !wallet.provider) return;
    const fetchBalance = async () => {
      try {
        const bal = await wallet.provider!.getBalance(wallet.address!);
        setFromBalance(parseFloat(ethers.formatEther(bal)).toFixed(4));
      } catch (err) {
        console.error("Balance fetch failed", err);
      }
    };
    fetchBalance();
  }, [wallet.connected, wallet.address, wallet.provider, balanceRefreshKey]);

  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) return;
    getQuote({
      fromToken: fromToken.address,
      toToken: toToken.address,
      amount,
      fromDecimals: fromToken.decimals,
      toDecimals: toToken.decimals,
      slippage,
    });
  }, [amount, fromToken.address, toToken.address, slippage]);

  const [needsApproval, setNeedsApproval] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);

  const handleApprove = async () => {};
  const handleFlip = () => {};
  const handleTokenSelect = (token: any) => {};
  const handleSwap = async () => {};
  */

  // ─── Active Campaign Functions ───────────────────────────────────────
  const fetchUserStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_BASE}/api/worldcup/leaderboard`);
      const json = await res.json();
      
      let userVolumeVal = 0;
      let hasSharesVal = false;
      
      // 1. Search in allUsers if present, to check volume and share ownership
      if (json.success && Array.isArray(json.allUsers)) {
        const userObj = json.allUsers.find((item: any) => item.address.toLowerCase() === wallet.address!.toLowerCase());
        if (userObj) {
          userVolumeVal = userObj.volume;
          hasSharesVal = userObj.hasShares;
        }
      }
      
      setUserVolume(userVolumeVal);
      setHasShares(hasSharesVal);

      // 2. Search in ranked data to check leaderboard rank (only players with shares are ranked)
      if (json.success && Array.isArray(json.data)) {
        const idx = json.data.findIndex((item: any) => item.address.toLowerCase() === wallet.address!.toLowerCase());
        if (idx !== -1) {
          setUserRank(idx + 1);
        } else {
          setUserRank("Unranked");
        }
      }
    } catch (err) {
      console.error("Failed to fetch user volume stats:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!wallet.connected || !wallet.address) {
      setUserVolume(null);
      setUserRank(null);
      setHasShares(null);
      return;
    }

    fetchUserStats();
    const interval = setInterval(fetchUserStats, 15000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, API_BASE]);

  const handleSyncTx = async () => {
    if (!txHashInput.trim() || !wallet.address) return;

    try {
      setSyncingTx(true);
      setSyncStatusMsg("");
      setSyncStatusType("");

      addLog("info", `[Sync] Submitting transaction ${txHashInput.slice(0, 10)}... for on-chain verification.`);

      const res = await fetch(`${API_BASE}/api/worldcup/sync-tx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: txHashInput.trim(),
          address: wallet.address
        })
      });

      const json = await res.json();

      if (json.success) {
        setSyncStatusType("success");
        setSyncStatusMsg(language === "zh" 
          ? `成功同步！增加交易量：$${json.data.addedVolume.toFixed(2)}` 
          : `Sync successful! Added $${json.data.addedVolume.toFixed(2)} volume.`);
        
        setTxHashInput("");
        await fetchUserStats();

        addLog("swap", `[Sync] Success! Verified +$${json.data.addedVolume.toFixed(2)} volume.`);
      } else {
        setSyncStatusType("error");
        setSyncStatusMsg(json.error || "Sync failed.");
        
        addLog("warning", `[Sync] Failed: ${json.error || "Unknown error"}`);
      }
    } catch (err: any) {
      console.error("Tx sync error:", err);
      setSyncStatusType("error");
      setSyncStatusMsg(err.message || "Failed to connect to scanner API.");
      
      addLog("warning", `[Sync] Network error: ${err.message}`);
    } finally {
      setSyncingTx(false);
    }
  };

  const getEstimatedPrize = (rank: number | string) => {
    if (typeof rank === "string" || rank === null) return "—";
    if (rank === 1) return "$125.00 USDT + $125.00 in $PSAI ($250)";
    if (rank === 2) return "$55.00 USDT + $55.00 in $PSAI ($110)";
    if (rank === 3) return "$35.00 USDT + $35.00 in $PSAI ($70)";
    if (rank === 4) return "$22.50 USDT + $22.50 in $PSAI ($45)";
    if (rank === 5) return "$12.50 USDT + $12.50 in $PSAI ($25)";
    return "—";
  };

  const OKX_WEB_URL = "https://web3.okx.com/dex-swap?chain=x-layer,x-layer&token=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee,0xaef068ea820aafa00a2854bfd6cfab6d891ede5d";
  const OKX_MOBILE_URL = "https://web3.okx.com/download?deeplink=okx%3A%2F%2Fwallet%2Fdapp%2Furl%3FdappUrl%3Dhttps%253A%252F%252Fweb3.okx.com%252Fdex-swap%253Fchain%253Dx-layer%252Cx-layer%2526token%253D0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee%252C0xaef068ea820aafa00a2854bfd6cfab6d891ede5d";

  return (
    <>
      <motion.div
        className="swap-card glass-card"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        {/* Campaign Header */}
        <div className="swap-card-header" style={{ marginBottom: 0 }}>
          <h2 className="swap-card-title" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ animation: "pulse 2s infinite" }}>🟢</span>
            {language === "zh" ? "$PSAI 交易竞赛 (第一阶段)" : "$PSAI Trading Contest (Phase 1)"}
          </h2>
        </div>

        {/* Campaign Info */}
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: "1.5", marginTop: "8px" }}>
          {language === "zh" ? (
            "为确保最高的交易效率和零技术摩擦，本阶段的交易直接在 OKX 的官方 DEX 或手机钱包上执行。我们将通过链上数据同步追踪您的交易量，自动统计在下方的积分排行榜中！"
          ) : (
            "To guarantee maximum routing efficiency and zero swap friction, all trades in this phase are executed directly on the official OKX DEX web or mobile wallet interface. We automatically track your volume on-chain to rank you on the leaderboard!"
          )}
        </div>

        {/* Trade CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
          <a
            href={OKX_WEB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary swap-btn font-mono"
            style={{ textDecoration: "none", textAlign: "center", display: "block" }}
          >
            📊 {language === "zh" ? "在 OKX 网页端 DEX 交易" : "Trade on OKX DEX (Web) ↗"}
          </a>
          <a
            href={OKX_MOBILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost swap-btn font-mono"
            style={{ textDecoration: "none", textAlign: "center", display: "block", background: "rgba(255,255,255,0.05)" }}
          >
            📱 {language === "zh" ? "在 OKX 手机 app 交易" : "Trade on OKX Mobile Wallet ↗"}
          </a>
        </div>

        {/* 
        // ─── COMMENTED OUT ORIGINAL SWAP INTERFACE ───
        // Uncomment these blocks after the campaign to restore interactive swaps and security auditing.

        <div className="swap-card-header" style={{ marginTop: "16px" }}>
          <h2 className="swap-card-title">{t("swap_tab_swap")} (Paused)</h2>
          <div className="swap-settings" style={{ position: "relative" }}>
            <button className="slippage-btn" disabled>
              <SettingsIcon size={12} /> {slippage}% {language === "zh" ? "滑点" : "slippage"}
            </button>
          </div>
        </div>

        <div className="swap-token-box glass-card" style={{ opacity: 0.5 }}>
          <div className="swap-token-label">{t("swap_from")}</div>
          <div className="swap-token-row">
            <input className="swap-amount-input" type="text" placeholder="0.0" disabled />
            <button className="token-pill" disabled>
              {fromToken.symbol}
            </button>
          </div>
        </div>

        <div className="swap-arrow-wrapper" style={{ opacity: 0.5 }}>
          <button className="swap-arrow" disabled>⇅</button>
        </div>

        <div className="swap-token-box glass-card" style={{ opacity: 0.5 }}>
          <div className="swap-token-label">{t("swap_to")}</div>
          <div className="swap-token-row">
            <span className="swap-amount-output">0.0</span>
            <button className="token-pill" disabled>
              {toToken.symbol}
            </button>
          </div>
        </div>
        */}

        {/* Personal Stats Section */}
        <div className="swap-token-box glass-card" style={{ padding: "16px", marginTop: "12px", gap: "8px" }}>
          <div className="swap-token-label" style={{ fontWeight: "700", color: "#fff", display: "flex", justifyContent: "space-between" }}>
            <span>👤 {language === "zh" ? "您的竞猜特工统计" : "YOUR CAMPAIGN STATS"}</span>
            {loadingStats && <span style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>Refreshing...</span>}
          </div>
          
          {!wallet.connected ? (
            <div style={{ textAlign: "center", padding: "12px 0", color: "var(--text-tertiary)", fontSize: "0.8rem" }}>
              {language === "zh" ? "请先连接钱包以查看您的交易额和排名" : "Connect your wallet to track your volume & rank"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{language === "zh" ? "您的地址:" : "Your Wallet:"}</span>
                <span className="font-mono" style={{ color: "#fff" }}>
                  {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : ""}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{language === "zh" ? "当前排名:" : "Current Rank:"}</span>
                <span className="font-mono" style={{ color: userRank === "Unranked" ? "var(--text-tertiary)" : "var(--accent-safe)", fontWeight: "bold" }}>
                  {userRank === null ? "..." : (userRank === "Unranked" ? (language === "zh" ? "未上榜" : "Unranked") : `#${userRank}`)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{language === "zh" ? "交易量 (USDT):" : "Trading Volume:"}</span>
                <span className="font-mono" style={{ color: "var(--accent-purple)", fontWeight: "bold" }}>
                  {userVolume === null ? "..." : `$${userVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "var(--text-secondary)" }}>{language === "zh" ? "拥有球员份额:" : "Has Player Shares:"}</span>
                <span className="font-mono" style={{ color: hasShares ? "#00ff88" : "#ff4444", fontWeight: "bold" }}>
                  {hasShares === null ? "..." : (hasShares ? (language === "zh" ? "是 (已解锁排行)" : "Yes (Ranked)") : (language === "zh" ? "否 (未解锁排名)" : "No (Unranked)"))}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>{language === "zh" ? "预计奖励 (50/50):" : "Estimated Reward (50/50):"}</span>
                <span className="font-mono" style={{ color: "#FFD700", fontWeight: "bold", fontSize: "0.78rem" }}>
                  {userRank === null ? "..." : getEstimatedPrize(userRank)}
                </span>
              </div>
              
              {/* Manual Tx Sync Input Form */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px", marginTop: "4px" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)" }}>
                  {language === "zh" ? "🔄 手动同步交易 (输入交易哈希):" : "🔄 Manual Swap Sync (Paste Tx Hash):"}
                </span>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="0x..."
                    value={txHashInput}
                    onChange={(e) => setTxHashInput(e.target.value)}
                    disabled={syncingTx}
                    style={{
                      flex: 1,
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "0.78rem",
                      fontFamily: "var(--font-mono)",
                      color: "#fff"
                    }}
                  />
                  <button
                    onClick={handleSyncTx}
                    disabled={syncingTx || !txHashInput.trim()}
                    style={{
                      background: syncingTx || !txHashInput.trim() ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #4B7BF5 0%, #a855f7 100%)",
                      border: "none",
                      borderRadius: "6px",
                      color: syncingTx || !txHashInput.trim() ? "var(--text-tertiary)" : "#fff",
                      padding: "6px 12px",
                      fontSize: "0.74rem",
                      fontWeight: "bold",
                      cursor: syncingTx || !txHashInput.trim() ? "not-allowed" : "pointer",
                      transition: "opacity 0.2s"
                    }}
                  >
                    {syncingTx ? (language === "zh" ? "同步中..." : "Syncing...") : (language === "zh" ? "同步" : "Sync")}
                  </button>
                </div>
                {syncStatusMsg && (
                  <span style={{ 
                    fontSize: "0.7rem", 
                    color: syncStatusType === "success" ? "var(--accent-safe)" : "var(--accent-warning)", 
                    marginTop: "2px" 
                  }}>
                    {syncStatusMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Steps Box */}
        <div style={{ padding: "12px", border: "1px solid rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.02)", borderRadius: "8px", fontSize: "0.74rem", color: "var(--text-tertiary)", marginTop: "8px" }}>
          <div style={{ fontWeight: "bold", color: "var(--text-secondary)", marginBottom: "4px" }}>💡 {language === "zh" ? "如何参与竞赛：" : "How to enter:"}</div>
          <ol style={{ paddingLeft: "14px", margin: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
            <li>{language === "zh" ? "点击上方按钮在 OKX 网页端或手机上兑换 $PSAI 代币。" : "Click one of the OKX links above to trade $PSAI."}</li>
            <li>{language === "zh" ? "链上智能合约扫描模块会在 1-2 分钟内自动追踪您的地址交易量。" : "Our indexing module will scan the blockchain and update your stats."}</li>
            <li>{language === "zh" ? "世界杯开始后，持有的 $PSAI 将直接解锁 1.5 - 5.0 倍无损失质押收益倍数！" : "Staking USDT in July with $PSAI unlocks up to 5x yield boosts!"}</li>
          </ol>
        </div>

        {/* Footer */}
        <div className="swap-powered-by" style={{ marginTop: "12px" }}>
          <span>🛡️ {language === "zh" ? "竞赛由" : "Campaign verified by"}</span>
          <span style={{ fontWeight: 600, color: "#4B7BF5", fontFamily: 'var(--font-mono)' }}>X Layer</span>
          <span style={{ margin: "0 4px", color: "var(--text-tertiary)" }}>·</span>
          <span style={{ color: "var(--text-tertiary)" }}>{language === "zh" ? "数据提供" : "Aggregated on"}</span>
          <span style={{ fontWeight: 600, color: "#33ff00" }}>OKX DEX</span>
        </div>
      </motion.div>

      <style>{`
        .swap-card {
          width: 480px;
          max-width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .swap-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .swap-card-title {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .swap-token-box {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .swap-token-label {
          font-size: 0.82rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .swap-btn {
          width: 100%;
          padding: 16px;
          font-size: 1rem;
          border-radius: var(--radius-lg);
        }

        .swap-powered-by {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-tertiary);
          padding-top: 8px;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        @media (max-width: 500px) {
          .swap-card { padding: 16px; }
          .swap-powered-by {
            flex-wrap: nowrap;
            white-space: nowrap;
            font-size: 0.62rem;
            gap: 4px;
          }
        }
      `}</style>
    </>
  );
};

export default SwapCard;
