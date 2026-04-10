// ─── SwapCard Component ──────────────────────────────────────────────────────
// Uniswap-style swap card with token selectors, flip, auto-quote,
// and ScanGuard security scanning before every swap.

import React, { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TokenSelector from "./TokenSelector";
import { useScanGuard, ScanResult } from "../hooks/useScanGuard";
import { useSwap, SwapQuote } from "../hooks/useSwap";
import { WalletState } from "../lib/wallet";
import { TOKEN_LIST, TokenInfo, findToken, XLAYER_TOKENS } from "../lib/xlayer";

interface SwapCardProps {
  wallet: WalletState;
  onConnect: () => void;
  onScanResult: (result: ScanResult | null) => void;
  onActivityLog: (entry: ActivityEntry) => void;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: "scan" | "swap" | "warning" | "info";
  message: string;
}

type SwapStage = "input" | "scanning" | "scanned" | "quoting" | "ready" | "swapping" | "complete";

// Default tokens
const DEFAULT_FROM = TOKEN_LIST.find(t => t.symbol === "USDC")!;
const DEFAULT_TO = TOKEN_LIST.find(t => t.symbol === "USDT")!;

const SwapCard: React.FC<SwapCardProps> = ({
  wallet,
  onConnect,
  onScanResult,
  onActivityLog,
}) => {
  const [fromToken, setFromToken] = useState<TokenInfo>(DEFAULT_FROM);
  const [toToken, setToToken] = useState<TokenInfo>(DEFAULT_TO);
  const [amount, setAmount] = useState("");
  const [stage, setStage] = useState<SwapStage>("input");
  const [slippage, setSlippage] = useState(0.5);
  const [showSlippage, setShowSlippage] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState<"from" | "to" | null>(null);

  const { scan, result: scanResult, isScanning, error: scanError } = useScanGuard();
  const { getQuote, executeSwap, quote, swapResult, isQuoting, isSwapping, error: swapError, reset: resetSwap } = useSwap();
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ─── Auto-scan when "from" token changes ─────────────────────────────
  useEffect(() => {
    if (!fromToken.address || fromToken.isNative) return;
    if (!/^0x[a-fA-F0-9]{40}$/.test(fromToken.address)) return;

    setStage("scanning");
    onScanResult(null);
    resetSwap();

    addLog("scan", `Scanning ${fromToken.symbol} (${fromToken.address.slice(0, 10)}...)...`);

    scan(fromToken.address).then((result) => {
      if (result) {
        setStage("scanned");
        onScanResult(result);
        addLog(
          result.riskLevel === "SAFE" || result.riskLevel === "LOW" ? "info" : "warning",
          `${result.tokenSymbol || fromToken.symbol}: Risk ${result.riskScore}/100 (${result.riskLevel})`
        );
      } else {
        setStage("input");
      }
    });
  }, [fromToken.address]);

  // ─── Auto-quote when amount or tokens change ─────────────────────────
  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);

    const isSafe = scanResult && (scanResult.riskLevel === "SAFE" || scanResult.riskLevel === "LOW" || scanResult.riskLevel === "MEDIUM");
    if (!amount || parseFloat(amount) <= 0 || !isSafe) return;

    quoteTimer.current = setTimeout(() => {
      getQuote({
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount,
        fromDecimals: fromToken.decimals,
        slippage,
      });
    }, 500); // 500ms debounce

    return () => { if (quoteTimer.current) clearTimeout(quoteTimer.current); };
  }, [amount, fromToken.address, toToken.address, scanResult, slippage]);

  // ─── Flip tokens ──────────────────────────────────────────────────────
  const handleFlip = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount("");
    resetSwap();
    setStage("input");
    onScanResult(null);
  }, [fromToken, toToken, resetSwap, onScanResult]);

  // ─── Token selection ──────────────────────────────────────────────────
  const handleTokenSelect = useCallback((token: TokenInfo) => {
    if (selectorOpen === "from") {
      if (token.address === toToken.address) {
        // Swap them
        setToToken(fromToken);
      }
      setFromToken(token);
      setAmount("");
      resetSwap();
      setStage("input");
    } else {
      if (token.address === fromToken.address) {
        setFromToken(toToken);
      }
      setToToken(token);
    }
    setSelectorOpen(null);
  }, [selectorOpen, fromToken, toToken, resetSwap]);

  // ─── Execute swap ─────────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (!wallet.signer || !quote) return;

    setStage("swapping");
    addLog("swap", `Swapping ${amount} ${fromToken.symbol} → ${toToken.symbol}...`);

    const result = await executeSwap(
      {
        fromToken: fromToken.address,
        toToken: toToken.address,
        amount,
        fromDecimals: fromToken.decimals,
        slippage,
        recipient: wallet.address!,
      },
      wallet.signer
    );

    if (result) {
      setStage("complete");
      addLog("swap", `✅ Swap confirmed! TX: ${result.txHash.slice(0, 14)}...`);
    } else {
      setStage("ready");
      addLog("warning", `Swap failed: ${swapError || "Unknown error"}`);
    }
  }, [wallet, quote, amount, fromToken, toToken, slippage, executeSwap, addLog, swapError]);

  // ─── Derived state ────────────────────────────────────────────────────
  const isSafe = scanResult && (scanResult.riskLevel === "SAFE" || scanResult.riskLevel === "LOW");
  const isMedium = scanResult && scanResult.riskLevel === "MEDIUM";
  const isDangerous = scanResult && (scanResult.riskLevel === "HIGH" || scanResult.riskLevel === "CRITICAL");
  const canSwap = (isSafe || isMedium) && quote && parseFloat(amount) > 0;

  return (
    <>
      <motion.div
        className="swap-card glass-card"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        {/* Card Header */}
        <div className="swap-card-header">
          <h2 className="swap-card-title">Swap</h2>
          <div className="swap-settings" style={{ position: "relative" }}>
            <button
              className="slippage-btn"
              onClick={() => setShowSlippage(!showSlippage)}
            >
              ⚙️ {slippage}% slippage
            </button>
            <AnimatePresence>
              {showSlippage && (
                <motion.div
                  className="slippage-popup glass-card"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  {[0.1, 0.5, 1.0, 3.0].map(s => (
                    <button
                      key={s}
                      className={`slippage-option ${slippage === s ? "active" : ""}`}
                      onClick={() => { setSlippage(s); setShowSlippage(false); }}
                    >
                      {s}%
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ─── From (Sell) ─────────────────────────────────────────── */}
        <div className="swap-token-box glass-card">
          <div className="swap-token-label">You sell</div>
          <div className="swap-token-row">
            <input
              className="swap-amount-input"
              type="text"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setAmount(val);
              }}
              disabled={isScanning || isSwapping}
            />
            <button
              className="token-pill"
              onClick={() => setSelectorOpen("from")}
              style={{ "--pill-color": fromToken.logoColor } as React.CSSProperties}
            >
              <span className="token-pill-icon" style={{ background: fromToken.logoColor }}>
                {fromToken.symbol.charAt(0)}
              </span>
              {fromToken.symbol}
              <span className="token-pill-arrow">▾</span>
            </button>
          </div>
          {scanResult && (
            <div className="swap-token-scan-badge">
              <span className={`scan-dot ${isSafe ? "safe" : isDangerous ? "danger" : "warn"}`} />
              {scanResult.riskLevel} ({scanResult.riskScore}/100)
            </div>
          )}
          {isScanning && (
            <div className="swap-token-scan-badge">
              <span className="scan-spinner-sm" /> Scanning...
            </div>
          )}
        </div>

        {/* ─── Flip Arrow ─────────────────────────────────────────── */}
        <div className="swap-arrow-wrapper">
          <button className="swap-arrow" onClick={handleFlip} title="Flip tokens">
            ⇅
          </button>
        </div>

        {/* ─── To (Buy) ───────────────────────────────────────────── */}
        <div className="swap-token-box glass-card">
          <div className="swap-token-label">You receive</div>
          <div className="swap-token-row">
            <span className="swap-amount-output">
              {isQuoting ? (
                <span className="quote-loading">Quoting...</span>
              ) : quote ? (
                quote.amountOut
              ) : amount && parseFloat(amount) > 0 && isSafe ? (
                "..."
              ) : (
                "0.0"
              )}
            </span>
            <button
              className="token-pill"
              onClick={() => setSelectorOpen("to")}
              style={{ "--pill-color": toToken.logoColor } as React.CSSProperties}
            >
              <span className="token-pill-icon" style={{ background: toToken.logoColor }}>
                {toToken.symbol.charAt(0)}
              </span>
              {toToken.symbol}
              <span className="token-pill-arrow">▾</span>
            </button>
          </div>
        </div>

        {/* ─── Quote Details ──────────────────────────────────────── */}
        <AnimatePresence>
          {quote && (
            <motion.div
              className="quote-details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="quote-row">
                <span>Rate</span>
                <span className="font-mono">1 {fromToken.symbol} ≈ {quote.exchangeRate} {toToken.symbol}</span>
              </div>
              <div className="quote-row">
                <span>Price Impact</span>
                <span className={`font-mono ${parseFloat(quote.priceImpact) > 1 ? "text-warning" : "text-safe"}`}>
                  {quote.priceImpact}%
                </span>
              </div>
              <div className="quote-row">
                <span>Source</span>
                <span className="font-mono">{quote.source === "okx-dex" ? "OKX DEX Aggregator" : "Estimated"}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Warnings ───────────────────────────────────────────── */}
        <AnimatePresence>
          {isDangerous && (
            <motion.div
              className="swap-danger-warning"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <span className="danger-icon">🚨</span>
              <div>
                <strong>High Risk Token Detected</strong>
                <p>This token has {scanResult!.flags.length} security threat(s). Swapping is blocked for your protection.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Success ────────────────────────────────────────────── */}
        <AnimatePresence>
          {swapResult && stage === "complete" && (
            <motion.div
              className="swap-success"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
            >
              <span style={{ fontSize: "1.5rem" }}>✅</span>
              <div>
                <strong>Swap Confirmed!</strong>
                <a className="font-mono risk-link" href={swapResult.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.8rem", display: "block", marginTop: "4px" }}>
                  View on Explorer →
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Error ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {(scanError || swapError) && (
            <motion.div className="swap-error" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              ⚠️ {scanError || swapError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── Action Button ──────────────────────────────────────── */}
        <div className="swap-action">
          {!wallet.connected ? (
            <button className="btn btn-primary swap-btn" onClick={onConnect}>
              Connect Wallet
            </button>
          ) : isScanning ? (
            <button className="btn btn-primary swap-btn scanning-pulse" disabled>
              <span className="scan-spinner" /> Scanning Token...
            </button>
          ) : isDangerous ? (
            <button className="btn btn-danger swap-btn" disabled>
              🚫 Swap Blocked — High Risk
            </button>
          ) : isSwapping ? (
            <button className="btn btn-primary swap-btn" disabled>
              <span className="scan-spinner" /> Swapping...
            </button>
          ) : stage === "complete" ? (
            <button
              className="btn btn-primary swap-btn"
              onClick={() => {
                setAmount("");
                resetSwap();
                setStage("input");
                onScanResult(null);
              }}
            >
              New Swap
            </button>
          ) : canSwap ? (
            <button className="btn btn-safe swap-btn" onClick={handleSwap}>
              🔄 Swap {fromToken.symbol} → {toToken.symbol}
            </button>
          ) : isMedium ? (
            <button
              className="btn btn-primary swap-btn"
              onClick={handleSwap}
              disabled={!quote || !parseFloat(amount)}
              style={{ background: "linear-gradient(135deg, #FFB020, #FF8C00)" }}
            >
              ⚠️ Swap with Caution
            </button>
          ) : (
            <button className="btn btn-primary swap-btn" disabled={!amount || !parseFloat(amount)}>
              {amount && parseFloat(amount) > 0 ? "Getting Quote..." : "Enter Amount"}
            </button>
          )}
        </div>

        {/* Powered by */}
        <div className="swap-powered-by">
          <span>🛡️ Protected by</span>
          <span className="text-blue" style={{ fontWeight: 600 }}>ScanGuard</span>
          <span className="badge badge-purple" style={{ marginLeft: "4px" }}>MCP</span>
          <span style={{ margin: "0 4px", color: "var(--text-tertiary)" }}>·</span>
          <span style={{ color: "var(--text-tertiary)" }}>Powered by</span>
          <span style={{ fontWeight: 600, color: "#4B7BF5" }}>OKX DEX</span>
        </div>
      </motion.div>

      {/* Token Selector Modal */}
      <TokenSelector
        isOpen={selectorOpen !== null}
        onClose={() => setSelectorOpen(null)}
        onSelect={handleTokenSelect}
        excludeAddress={selectorOpen === "from" ? toToken.address : fromToken.address}
      />

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

        .slippage-btn {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          padding: 4px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          cursor: pointer;
          font-family: var(--font-mono);
        }
        .slippage-btn:hover { border-color: var(--accent-blue); }

        .slippage-popup {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 6px;
          padding: 6px;
          display: flex;
          gap: 4px;
          z-index: 10;
        }
        .slippage-option {
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-default);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.75rem;
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .slippage-option:hover { border-color: var(--accent-blue); color: var(--accent-blue); }
        .slippage-option.active { border-color: var(--accent-blue); color: var(--accent-blue); background: var(--accent-blue-dim); }

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

        .swap-token-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .swap-amount-input {
          flex: 1;
          font-size: 1.8rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
          background: transparent;
          border: none;
          outline: none;
          width: 0;
          min-width: 0;
        }
        .swap-amount-input::placeholder { color: var(--text-tertiary); }
        .swap-amount-input:disabled { opacity: 0.5; }

        .swap-amount-output {
          flex: 1;
          font-size: 1.8rem;
          font-weight: 700;
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
        .quote-loading {
          font-size: 1rem;
          color: var(--text-tertiary);
          animation: pulse-text 1s ease-in-out infinite;
        }
        @keyframes pulse-text { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        .token-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px 6px 6px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          background: rgba(255,255,255,0.03);
          color: var(--text-primary);
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: var(--font-mono);
          transition: all 0.15s;
          white-space: nowrap;
        }
        .token-pill:hover { border-color: var(--pill-color, var(--accent-blue)); background: rgba(255,255,255,0.06); }

        .token-pill-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 800;
          color: white;
        }

        .token-pill-arrow {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          margin-left: 2px;
        }

        .swap-token-scan-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          color: var(--text-secondary);
          font-family: var(--font-mono);
        }
        .scan-dot { width: 6px; height: 6px; border-radius: 50%; }
        .scan-dot.safe { background: var(--accent-safe); box-shadow: 0 0 4px var(--accent-safe); }
        .scan-dot.danger { background: var(--accent-danger); box-shadow: 0 0 4px var(--accent-danger); }
        .scan-dot.warn { background: var(--accent-warning); box-shadow: 0 0 4px var(--accent-warning); }
        .scan-spinner-sm { display: inline-block; width: 10px; height: 10px; border: 1.5px solid rgba(255,255,255,0.2); border-top-color: var(--accent-blue); border-radius: 50%; animation: rotate-slow 0.8s linear infinite; }

        .swap-arrow-wrapper {
          display: flex;
          justify-content: center;
          margin: -8px 0;
          position: relative;
          z-index: 2;
        }

        .swap-arrow {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-elevated);
          border: 2px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .swap-arrow:hover {
          border-color: var(--accent-blue);
          color: var(--accent-blue);
          transform: rotate(180deg);
        }

        .quote-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px 16px;
          background: rgba(0,0,0,0.15);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .quote-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .swap-danger-warning {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: rgba(255, 59, 92, 0.06);
          border: 1px solid rgba(255, 59, 92, 0.15);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .swap-danger-warning strong { color: var(--accent-danger); font-size: 0.9rem; }
        .swap-danger-warning p { font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4; }
        .danger-icon { font-size: 1.5rem; flex-shrink: 0; }

        .swap-success {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--accent-safe-dim);
          border: 1px solid rgba(0, 255, 136, 0.15);
          border-radius: var(--radius-md);
          overflow: hidden;
        }
        .swap-success strong { color: var(--accent-safe); font-size: 0.9rem; }

        .swap-error {
          padding: 12px;
          background: var(--accent-danger-dim);
          border: 1px solid rgba(255, 59, 92, 0.2);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--accent-danger);
          overflow: hidden;
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

        .scan-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: rotate-slow 0.8s linear infinite;
        }

        .risk-link { color: var(--accent-blue); text-decoration: none; }
        .risk-link:hover { text-decoration: underline; }

        @media (max-width: 500px) {
          .swap-card { padding: 16px; }
          .swap-amount-input, .swap-amount-output { font-size: 1.4rem; }
        }
      `}</style>
    </>
  );
};

export default SwapCard;
