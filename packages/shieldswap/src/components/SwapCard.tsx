// ─── SwapCard Component ──────────────────────────────────────────────────────
// Main swap interface — Uniswap-style centered card with ScanGuard integration.
// Flow: Enter token → Scan → See results → Swap if safe

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TokenInput from "./TokenInput";
import { useScanGuard, ScanResult } from "../hooks/useScanGuard";
import { useSwap, SwapQuote } from "../hooks/useSwap";
import { WalletState } from "../lib/wallet";
import { XLAYER_TOKENS } from "../lib/xlayer";

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

const SwapCard: React.FC<SwapCardProps> = ({
  wallet,
  onConnect,
  onScanResult,
  onActivityLog,
}) => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [outputToken] = useState(XLAYER_TOKENS.USDT);
  const [stage, setStage] = useState<SwapStage>("input");
  const [slippage] = useState(0.5);

  const { scan, result: scanResult, isScanning, error: scanError } = useScanGuard();
  const { getQuote, executeSwap, quote, swapResult, isQuoting, isSwapping, error: swapError } = useSwap();

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

  // Handle scan
  const handleScan = useCallback(async () => {
    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) return;

    setStage("scanning");
    addLog("scan", `Initiating security scan for ${tokenAddress.slice(0, 10)}...`);

    const result = await scan(tokenAddress);

    if (result) {
      setStage("scanned");
      onScanResult(result);
      addLog(
        result.riskLevel === "SAFE" || result.riskLevel === "LOW" ? "info" : "warning",
        `Scan complete → ${result.tokenSymbol || "Token"}: Risk ${result.riskScore}/100 (${result.riskLevel})`
      );
    } else {
      setStage("input");
      addLog("warning", `Scan failed: ${scanError || "Unknown error"}`);
    }
  }, [tokenAddress, scan, onScanResult, addLog, scanError]);

  // Handle quote
  const handleGetQuote = useCallback(async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setStage("quoting");
    addLog("info", `Getting swap quote for ${amount} ${scanResult?.tokenSymbol || "tokens"}...`);

    const q = await getQuote({
      tokenIn: tokenAddress,
      tokenOut: outputToken,
      amountIn: amount,
      slippage,
    });

    if (q) {
      setStage("ready");
      addLog("info", `Quote received: ${amount} → ${q.amountOut} USDT (impact: ${q.priceImpact}%)`);
    }
  }, [amount, tokenAddress, outputToken, slippage, getQuote, scanResult, addLog]);

  // Handle swap execution
  const handleSwap = useCallback(async () => {
    if (!wallet.signer || !quote) return;

    setStage("swapping");
    addLog("swap", `Executing swap: ${amount} ${scanResult?.tokenSymbol || "TOKEN"} → USDT`);

    const result = await executeSwap(
      {
        tokenIn: tokenAddress,
        tokenOut: outputToken,
        amountIn: amount,
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
  }, [wallet, quote, amount, tokenAddress, outputToken, slippage, executeSwap, scanResult, addLog, swapError]);

  // Reset when token changes
  useEffect(() => {
    setStage("input");
    onScanResult(null);
  }, [tokenAddress, onScanResult]);

  const isSafe = scanResult && (scanResult.riskLevel === "SAFE" || scanResult.riskLevel === "LOW");
  const isDangerous = scanResult && (scanResult.riskLevel === "HIGH" || scanResult.riskLevel === "CRITICAL");

  return (
    <motion.div
      className="swap-card glass-card"
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
    >
      {/* Card Header */}
      <div className="swap-card-header">
        <h2 className="swap-card-title">Swap</h2>
        <div className="swap-settings">
          <span className="slippage-display font-mono">
            ⚙️ {slippage}% slippage
          </span>
        </div>
      </div>

      {/* Token Input (Sell) */}
      <TokenInput
        label="You sell"
        value={tokenAddress}
        onChange={setTokenAddress}
        amount={amount}
        onAmountChange={setAmount}
        tokenSymbol={scanResult?.tokenSymbol}
        tokenName={scanResult?.tokenName}
        disabled={stage === "scanning" || stage === "swapping"}
      />

      {/* Arrow */}
      <div className="swap-arrow-wrapper">
        <div className="swap-arrow">↓</div>
      </div>

      {/* Output Token (Buy) */}
      <div className="swap-output glass-card">
        <div className="swap-output-label">You receive</div>
        <div className="swap-output-value">
          <span className="swap-output-amount font-mono">
            {quote ? quote.amountOut : amount ? "..." : "0.0"}
          </span>
          <span className="swap-output-token font-mono">USDT</span>
        </div>
        {quote && (
          <motion.div
            className="swap-quote-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="quote-detail-row">
              <span>Rate</span>
              <span className="font-mono">1 {scanResult?.tokenSymbol || "TOKEN"} ≈ {quote.exchangeRate} USDT</span>
            </div>
            <div className="quote-detail-row">
              <span>Price Impact</span>
              <span className={`font-mono ${parseFloat(String(quote.priceImpact)) > 1 ? "text-warning" : "text-safe"}`}>
                {quote.priceImpact}%
              </span>
            </div>
            <div className="quote-detail-row">
              <span>Gas (est.)</span>
              <span className="font-mono">{quote.gasEstimate} OKB</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Scan Error */}
      <AnimatePresence>
        {(scanError || swapError) && (
          <motion.div
            className="swap-error"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            ⚠️ {scanError || swapError}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Danger Warning */}
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

      {/* Swap Completed */}
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
              <a
                className="font-mono risk-link"
                href={swapResult.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.8rem", display: "block", marginTop: "4px" }}
              >
                View on Explorer →
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Button */}
      <div className="swap-action">
        {!wallet.connected ? (
          <button className="btn btn-primary swap-btn" onClick={onConnect}>
            Connect Wallet
          </button>
        ) : stage === "input" ? (
          <button
            className={`btn btn-primary swap-btn ${isScanning ? "scanning-pulse" : ""}`}
            onClick={handleScan}
            disabled={!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)}
          >
            {isScanning ? (
              <>
                <span className="scan-spinner" /> Scanning for Threats...
              </>
            ) : (
              <>🛡️ Scan &amp; Verify Token</>
            )}
          </button>
        ) : stage === "scanning" ? (
          <button className="btn btn-primary swap-btn scanning-pulse" disabled>
            <span className="scan-spinner" /> Analyzing Contract...
          </button>
        ) : stage === "scanned" ? (
          isSafe ? (
            <button
              className="btn btn-safe swap-btn"
              onClick={handleGetQuote}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              ✅ Token Safe — Get Quote
            </button>
          ) : isDangerous ? (
            <button className="btn btn-danger swap-btn" disabled>
              🚫 Swap Blocked — High Risk
            </button>
          ) : (
            <button
              className="btn btn-primary swap-btn"
              onClick={handleGetQuote}
              disabled={!amount || parseFloat(amount) <= 0}
              style={{ background: "linear-gradient(135deg, #FFB020, #FF8C00)" }}
            >
              ⚠️ Proceed with Caution — Get Quote
            </button>
          )
        ) : stage === "quoting" ? (
          <button className="btn btn-primary swap-btn" disabled>
            <span className="scan-spinner" /> Getting Quote...
          </button>
        ) : stage === "ready" ? (
          <button className="btn btn-safe swap-btn" onClick={handleSwap}>
            🔄 Execute Swap
          </button>
        ) : stage === "swapping" ? (
          <button className="btn btn-primary swap-btn" disabled>
            <span className="scan-spinner" /> Swapping...
          </button>
        ) : stage === "complete" ? (
          <button
            className="btn btn-primary swap-btn"
            onClick={() => {
              setTokenAddress("");
              setAmount("");
              setStage("input");
              onScanResult(null);
            }}
          >
            New Swap
          </button>
        ) : null}
      </div>

      {/* Powered by */}
      <div className="swap-powered-by">
        <span>🛡️ Protected by</span>
        <span className="text-blue" style={{ fontWeight: 600 }}>ScanGuard</span>
        <span className="badge badge-purple" style={{ marginLeft: "4px" }}>MCP</span>
      </div>

      <style>{`
        .swap-card {
          width: 480px;
          max-width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .swap-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .swap-card-title {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .slippage-display {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          padding: 4px 10px;
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius-full);
        }

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
          cursor: default;
        }

        .swap-output {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .swap-output-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .swap-output-value {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }

        .swap-output-amount {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .swap-output-token {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .swap-quote-details {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-top: 10px;
          border-top: 1px solid var(--border-default);
          overflow: hidden;
        }

        .quote-detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .swap-error {
          padding: 12px;
          background: var(--accent-danger-dim);
          border: 1px solid rgba(255, 59, 92, 0.2);
          border-radius: var(--radius-md);
          font-size: 0.82rem;
          color: var(--accent-danger);
          overflow: hidden;
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

        .swap-danger-warning strong {
          color: var(--accent-danger);
          font-size: 0.9rem;
        }

        .swap-danger-warning p {
          font-size: 0.78rem;
          color: var(--text-secondary);
          margin-top: 4px;
          line-height: 1.4;
        }

        .danger-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

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

        .swap-success strong {
          color: var(--accent-safe);
          font-size: 0.9rem;
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
          padding-top: 4px;
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

        .risk-link {
          color: var(--accent-blue);
          text-decoration: none;
        }
        .risk-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 500px) {
          .swap-card {
            padding: 16px;
          }
        }
      `}</style>
    </motion.div>
  );
};

export default SwapCard;
