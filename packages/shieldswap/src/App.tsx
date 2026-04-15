// ─── ShieldSwap App ──────────────────────────────────────────────────────────
// Root application component wiring Header, SwapCard, RiskReport, and Activity Log

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import SwapCard, { ActivityEntry } from "./components/SwapCard";
import RiskReport from "./components/RiskReport";
import AgentChat from "./components/AgentChat";
import { ScanResult } from "./hooks/useScanGuard";
import { connectWallet, disconnectWallet, WalletState } from "./lib/wallet";

const INITIAL_WALLET: WalletState = {
  connected: false,
  address: null,
  chainId: null,
  balance: null,
  isXLayer: false,
  provider: null,
  signer: null,
};

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([
    {
      id: "init",
      timestamp: Date.now(),
      type: "info",
      message: "ShieldSwap initialized. Waiting for token scan...",
    },
  ]);

  const handleConnect = useCallback(async () => {
    try {
      const state = await connectWallet();
      setWallet(state);
      setActivityLog((prev) => [
        ...prev,
        {
          id: `connect-${Date.now()}`,
          timestamp: Date.now(),
          type: "info" as const,
          message: `Wallet connected: ${state.address?.slice(0, 10)}... on chain ${state.chainId}`,
        },
      ]);
    } catch (err: any) {
      setActivityLog((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          timestamp: Date.now(),
          type: "warning" as const,
          message: `Wallet error: ${err.message}`,
        },
      ]);
    }
  }, []);

  const handleDisconnect = useCallback(() => {
    setWallet(disconnectWallet());
    setActivityLog((prev) => [
      ...prev,
      {
        id: `disconnect-${Date.now()}`,
        timestamp: Date.now(),
        type: "info" as const,
        message: "Wallet disconnected.",
      },
    ]);
  }, []);

  const handleScanResult = useCallback((result: ScanResult | null) => {
    setScanResult(result);
    setShowReport(!!result);
  }, []);

  const handleActivityLog = useCallback((entry: ActivityEntry) => {
    setActivityLog((prev) => [...prev.slice(-49), entry]);
  }, []);

  // ─── Agent Chat: trigger scan/swap from chat command ──────────────
  const [chatScanAddress, setChatScanAddress] = useState<string | null>(null);
  const [swapCommand, setSwapCommand] = useState<{ from: string; to: string; amount: string; timestamp: number } | null>(null);

  const handleChatScan = useCallback((address: string) => {
    setChatScanAddress(address);
    handleActivityLog({
      id: `chat-scan-${Date.now()}`,
      timestamp: Date.now(),
      type: "scan" as const,
      message: `Agent chat: scanning ${address.slice(0, 10)}...`,
    });
  }, [handleActivityLog]);

  const handleChatSwap = useCallback((from: string, to: string, amount: string) => {
    setSwapCommand({ from, to, amount, timestamp: Date.now() });
    handleActivityLog({
      id: `chat-swap-${Date.now()}`,
      timestamp: Date.now(),
      type: "swap" as const,
      message: `Agent chat: swap ${amount} ${from} → ${to}`,
    });
  }, [handleActivityLog]);

  return (
    <div className="app-container">
      <Header
        wallet={wallet}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <main className="main-content">
        {/* Hero text */}
        <motion.div
          className="hero-text"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h2 className="hero-title">
            Every token scanned.{" "}
            <span className="text-blue">Every trade protected.</span>
          </h2>
          <p className="hero-subtitle">
            AI-powered security scanning meets DeFi. Swap tokens on X Layer with confidence.
          </p>
        </motion.div>

        {/* Swap Section */}
        <div className="swap-section">
          <SwapCard
            wallet={wallet}
            onConnect={handleConnect}
            onScanResult={handleScanResult}
            onActivityLog={handleActivityLog}
            initialCommand={swapCommand}
          />
          <RiskReport
            result={scanResult}
            isVisible={showReport}
            onClose={() => setShowReport(false)}
          />
        </div>

        {/* Agent Activity Log */}
        <motion.div
          className="activity-log glass-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="activity-log-header">
            <div className="activity-log-title">
              <span className="activity-dot" />
              Agent Activity Log
            </div>
            <span className="badge badge-purple">Live</span>
          </div>
          <div className="activity-log-entries">
            <AnimatePresence initial={false}>
              {activityLog
                .slice()
                .reverse()
                .slice(0, 8)
                .map((entry) => (
                  <motion.div
                    key={entry.id}
                    className={`activity-entry activity-${entry.type}`}
                    initial={{ x: -20, opacity: 0, height: 0 }}
                    animate={{ x: 0, opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="activity-time font-mono">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={`activity-icon activity-icon-${entry.type}`}>
                      {entry.type === "scan" ? "🔍" : entry.type === "swap" ? "🔄" : entry.type === "warning" ? "⚠️" : "ℹ️"}
                    </span>
                    <span className="activity-message">{entry.message}</span>
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          Built for <strong>XLayer</strong> ·{" "}
          Powered by <span className="text-blue">ScanGuard MCP</span> +{" "}
          <span className="text-purple">x402 Protocol</span>
        </div>
        <div className="footer-center">
          Built by <a href="https://x.com/encrypt_wizard" target="_blank" rel="noopener noreferrer">MrNetwork</a>
        </div>
        <div className="footer-right"></div>
      </footer>

      {/* Agent Chat */}
      <AgentChat
        onScanToken={handleChatScan}
        onSwapCommand={handleChatSwap}
      />

      <style>{`
        .hero-text {
          text-align: center;
          max-width: 600px;
          margin-bottom: -8px;
        }

        .hero-title {
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.3;
          margin-bottom: 8px;
        }

        .hero-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .activity-log {
          width: 100%;
          max-width: 920px;
          padding: 20px;
          overflow: hidden;
        }

        .activity-log-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .activity-log-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .activity-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-safe);
          box-shadow: 0 0 6px var(--accent-safe);
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .activity-log-entries {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 200px;
          overflow-y: auto;
        }

        .activity-entry {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          overflow: hidden;
        }

        .activity-scan { background: var(--accent-blue-dim); }
        .activity-swap { background: var(--accent-safe-dim); }
        .activity-warning { background: var(--accent-warning-dim); }
        .activity-info { background: rgba(255, 255, 255, 0.02); }

        .activity-time {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          flex-shrink: 0;
          min-width: 65px;
        }

        .activity-icon {
          flex-shrink: 0;
        }

        .activity-message {
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .app-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 32px;
          font-size: 0.75rem;
          color: var(--text-tertiary);
          border-top: 1px solid var(--border-default);
          margin-top: auto;
        }

        .footer-left {
          flex: 1;
          text-align: left;
          line-height: 1.5;
        }

        .footer-center {
          flex: 1;
          text-align: center;
        }

        .footer-right {
          flex: 1;
        }

        .app-footer a {
          color: var(--text-secondary);
          font-weight: 600;
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .app-footer a:hover {
          color: #fff;
          text-decoration: underline;
        }

        .app-footer strong {
          color: var(--text-secondary);
        }

        @media (max-width: 600px) {
          .hero-title {
            font-size: 1.2rem;
          }

          .hero-subtitle {
            font-size: 0.85rem;
          }

          .activity-entry {
            font-size: 0.72rem;
          }

          .app-footer {
            flex-direction: column;
            gap: 12px;
            padding: 20px 16px;
          }

          .footer-left, .footer-center, .footer-right {
            text-align: center;
          }

          .footer-right {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
