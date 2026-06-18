// ─── ShieldSwap App ──────────────────────────────────────────────────────────
// Root application component wiring Header, SwapCard, RiskReport, and Activity Log

import React, { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import { motion, AnimatePresence } from "framer-motion";
import Header from "./components/Header";
import SwapCard, { ActivityEntry } from "./components/SwapCard";
import RiskReport from "./components/RiskReport";
import AgentChat from "./components/AgentChat";
import { ScanResult } from "./hooks/useScanGuard";
import { connectWallet, disconnectWallet, WalletState } from "./lib/wallet";
import { VaultPanel } from "./components/VaultPanel";
import { PlayerMarket } from "./components/PlayerMarket";
import { ScoutConsole } from "./components/ScoutConsole";
import { Leaderboard } from "./components/Leaderboard";
import { LandingPage } from "./components/LandingPage";

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
  const [activeTab, setActiveTab] = useState<"home" | "swap" | "pitchside">("home");
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
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

  // ─── Agent Chat: trigger scan from chat command ─────────────────────
  const [chatScanAddress, setChatScanAddress] = useState<string | null>(null);

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
    handleActivityLog({
      id: `chat-swap-${Date.now()}`,
      timestamp: Date.now(),
      type: "swap" as const,
      message: `Agent chat: swap ${amount} ${from} → ${to}`,
    });
  }, [handleActivityLog]);

  // Listen for wallet events (chain/account changes)
  useEffect(() => {
    if (!window.ethereum) return;

    const handleChainChanged = async (hexChainId: string) => {
      const chainId = Number(hexChainId);
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = ethers.formatEther(await provider.getBalance(address));
        const isXLayer = chainId === 196 || chainId === 1952;
        setWallet({
          connected: true,
          address,
          chainId,
          balance,
          isXLayer,
          provider,
          signer,
        });
        handleActivityLog({
          id: `chain-${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: `Network switched to chain ID ${chainId}`,
        });
      } catch (err: any) {
        setWallet(INITIAL_WALLET);
      }
    };

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setWallet(INITIAL_WALLET);
        handleActivityLog({
          id: `disconnect-${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: "Wallet disconnected from accounts change.",
        });
      } else {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const balance = ethers.formatEther(await provider.getBalance(address));
          const isXLayer = chainId === 196 || chainId === 1952;
          setWallet({
            connected: true,
            address,
            chainId,
            balance,
            isXLayer,
            provider,
            signer,
          });
        } catch {}
      }
    };

    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, [handleActivityLog]);

  // Register connected wallet address to the backend for AI agent delegation discovery
  useEffect(() => {
    if (wallet.connected && wallet.address) {
      const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
      fetch(`${API_BASE}/api/worldcup/register-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: wallet.address }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            console.log("Successfully registered wallet address on backend:", wallet.address);
          }
        })
        .catch((err) => console.error("Failed to register wallet on backend:", err));
    }
  }, [wallet.connected, wallet.address]);


  return (
    <div className="app-container">
      <Header
        wallet={wallet}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {activeTab === "home" ? (
          <LandingPage setActiveTab={setActiveTab} />
        ) : activeTab === "swap" ? (
          <>
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
                AI-powered security scanning meets DeFi. Swap tokens on XLayer with confidence.
              </p>
            </motion.div>

            {/* Swap Section */}
            <div className="swap-section">
              <SwapCard
                wallet={wallet}
                onConnect={handleConnect}
                onScanResult={handleScanResult}
                onActivityLog={handleActivityLog}
              />
              <RiskReport
                result={scanResult}
                isVisible={showReport}
                onClose={() => setShowReport(false)}
              />
            </div>
          </>
        ) : !wallet.isXLayer ? (
          <div className="pitchside-portal animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div className="glass-card text-center" style={{ maxWidth: '550px', padding: '45px 30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', margin: '0 auto' }}>
              <span style={{ fontSize: '3rem' }}>⚽</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Explore Pitchside AI</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                The Pitchside AI Autonomous Scouting & Trading Network is deployed on X Layer. 
                Choose a network to explore — connect your wallet later to stake and trade.
              </p>
              <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    // Create read-only provider for mainnet exploration
                    const readOnlyProvider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
                    setWallet(prev => ({
                      ...prev,
                      chainId: 196,
                      isXLayer: true,
                      provider: readOnlyProvider,
                      connected: false,
                      address: null,
                      signer: null,
                    }));
                  }}
                  style={{ padding: '12px 20px', fontWeight: 'bold', flex: 1 }}
                >
                  🟢 X Layer Mainnet
                </button>
                <button 
                  className="btn btn-panel"
                  onClick={() => {
                    // Create read-only provider for testnet exploration
                    const readOnlyProvider = new ethers.JsonRpcProvider("https://testrpc.xlayer.tech");
                    setWallet(prev => ({
                      ...prev,
                      chainId: 1952,
                      isXLayer: true,
                      provider: readOnlyProvider,
                      connected: false,
                      address: null,
                      signer: null,
                    }));
                  }}
                  style={{ padding: '12px 20px', fontWeight: 'bold', flex: 1 }}
                >
                  🧪 X Layer Testnet
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pitchside-portal animate-fade-in">
            {/* Mainnet Warning & Testnet Sandbox Redirect Banner */}
            {wallet.chainId === 196 && (
              <motion.div 
                className="glass-card mainnet-warning-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '16px 24px', 
                  marginBottom: '24px', 
                  border: '1px solid rgba(255, 176, 32, 0.3)',
                  background: 'rgba(255, 176, 32, 0.03)',
                  borderRadius: '12px',
                  gap: '20px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#FFB020', fontSize: '0.9rem' }}>You are on X Layer Mainnet (Real Funds)</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Staking and index trades here require real USDT. To try the app risk-free with simulated goals and free testnet tokens, switch to the Sandbox.
                    </div>
                  </div>
                </div>
                <button
                  className="btn btn-panel"
                  onClick={async () => {
                    try {
                      const { switchToChain } = await import("./lib/xlayer");
                      await switchToChain(1952);
                    } catch (err) {}
                  }}
                  style={{ 
                    padding: '8px 16px', 
                    fontSize: '0.8rem', 
                    borderColor: '#FFB020', 
                    color: '#FFB020', 
                    background: 'rgba(255, 176, 32, 0.05)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  🧪 Switch to Testnet Sandbox
                </button>
              </motion.div>
            )}

            {/* Testnet Onboarding / How-To Banner */}
            {wallet.chainId === 1952 && (
              <motion.div 
                className="glass-card testnet-onboarding-banner"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ 
                  padding: '20px 24px', 
                  marginBottom: '24px', 
                  border: '1px solid rgba(75, 123, 245, 0.3)',
                  background: 'rgba(75, 123, 245, 0.03)',
                  borderRadius: '12px',
                  textAlign: 'left'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.4rem' }}>🧪</span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', margin: 0, color: 'var(--accent-blue)' }}>Welcome to the Pitchside AI Testnet Sandbox!</h4>
                  </div>
                  <button 
                    className="btn btn-sm btn-ghost mobile-instructions-toggle"
                    onClick={() => setInstructionsExpanded(!instructionsExpanded)}
                    style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto', minHeight: 'auto', display: 'none' }}
                  >
                    {instructionsExpanded ? "Read Less ▴" : "Read More ▾"}
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                  Pitchside AI is an autonomous, no-loss World Cup speculation network. You deposit stablecoins risk-free, earn virtual yield (Scout Credits) in real-time, and delegate them to a secure TEE AI Scout Agent to speculate on player performance index tokens.
                </p>
                <div 
                  className={`instructions-grid ${instructionsExpanded ? 'expanded' : 'collapsed'}`}
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}
                >
                  <div>
                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>1. Claim Faucet USDT</strong>
                    Click the Faucet button in the Staking Vault panel to claim 1,000 Mock USDT and Approve the Vault.
                  </div>
                  <div>
                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>2. Stake to Earn Credits</strong>
                    Stake your USDT to watch your virtual Scout Credits accumulate and tick upward in real-time.
                  </div>
                  <div>
                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>3. Delegate Authority</strong>
                    Select the TEE Scout Agent in the delegation box and click Confirm to delegate spending power.
                  </div>
                  <div>
                    <strong style={{ color: '#fff', display: 'block', marginBottom: '4px' }}>4. Simulate & Watch</strong>
                    Use the Simulator widget in the Console to trigger goals and watch the agent scan safety & swap onchain!
                  </div>
                </div>
              </motion.div>
            )}

            <div className="pitchside-grid">
              <div className="pitchside-vault-area">
                <VaultPanel wallet={wallet} onActivityLog={handleActivityLog} />
              </div>
              <div className="pitchside-console-area">
                <ScoutConsole wallet={wallet} onActivityLog={handleActivityLog} />
              </div>
              <div className="pitchside-market-area">
                <PlayerMarket wallet={wallet} onActivityLog={handleActivityLog} />
              </div>
              <div className="pitchside-leaderboard-area">
                <Leaderboard wallet={wallet} />
              </div>
            </div>
          </div>
        )}

        {/* Agent Activity Log */}
        {activeTab !== "home" && (
          <motion.div
            className={`activity-log glass-card ${activeTab === 'pitchside' ? 'hide-on-mobile-pitchside' : ''}`}
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
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          Built for <strong>XLayer</strong> ·{" "}
          Powered by <a href="https://scanguard-dashboard-main.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue" style={{ textDecoration: 'none' }}>ScanGuard MCP</a> +{" "}
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

          .footer-left {
            text-align: center;
            font-size: 0.65rem;
            white-space: nowrap;
          }

          .footer-center, .footer-right {
            text-align: center;
          }

          .footer-right {
            display: none;
          }
        }

        /* Pitchside AI Styles */
        .pitchside-portal {
          width: 100%;
          max-width: 1200px;
          margin-top: 24px;
          padding: 0 16px;
        }

        .pitchside-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.1fr;
          grid-template-areas: 
            "vault console"
            "market leaderboard";
          gap: 24px;
          align-items: start;
        }

        .pitchside-vault-area {
          grid-area: vault;
        }
        .pitchside-console-area {
          grid-area: console;
        }
        .pitchside-market-area {
          grid-area: market;
        }
        .pitchside-leaderboard-area {
          grid-area: leaderboard;
        }

        .panel-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .panel-icon {
          font-size: 1.3rem;
        }

        .panel-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .panel-desc {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 16px 0;
        }

        /* Vault panel style */
        .vault-panel {
          padding: 24px;
        }

        .vault-connect-message {
          text-align: center;
          padding: 20px;
          color: var(--text-secondary);
        }

        .credits-display {
          background: rgba(255, 255, 255, 0.01) !important;
          border: 1px solid var(--border-default);
          padding: 16px;
          border-radius: 12px;
          text-align: center;
          margin-bottom: 20px;
          box-shadow: inset 0 0 12px rgba(75, 123, 245, 0.05);
        }

        .credits-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .credits-value {
          font-size: 2.2rem;
          font-weight: 800;
          color: var(--accent-safe);
          font-family: var(--font-mono);
          text-shadow: 0 0 15px rgba(0, 255, 136, 0.25);
        }

        .credits-sub {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .staking-balances {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          font-size: 0.85rem;
        }

        .balance-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .balance-item span {
          color: var(--text-tertiary);
        }

        .staking-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .action-row {
          display: flex;
          gap: 12px;
        }

        .panel-input {
          flex: 1;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: #fff;
          padding: 10px 14px;
          font-size: 0.95rem;
          outline: none;
        }
        .panel-input:focus {
          border-color: var(--accent-blue);
        }

        .btn-panel {
          min-width: 120px;
          white-space: nowrap;
        }

        .btn-faucet {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-default);
          color: #fff;
          cursor: pointer;
          border-radius: 8px;
          font-weight: 600;
          transition: all 0.2s;
        }
        .btn-faucet:hover {
          border-color: var(--accent-blue);
          background: rgba(75, 123, 245, 0.08);
        }

        /* Delegation section styling */
        .delegation-box {
          border: 1px solid var(--border-default);
          padding: 16px;
          border-radius: 12px;
          margin-top: 16px;
          background: rgba(255, 255, 255, 0.01) !important;
        }

        .delegation-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9rem;
          color: #fff;
          margin-bottom: 8px;
        }

        .delegation-desc {
          font-size: 0.78rem;
          color: var(--text-tertiary);
          line-height: 1.4;
          margin: 0 0 12px 0;
        }

        .panel-select {
          width: 100%;
          background: #0d121d;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: #fff;
          padding: 10px;
          font-size: 0.85rem;
          outline: none;
          cursor: pointer;
        }

        .delegation-status {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          margin: 12px 0;
        }

        .btn-delegate {
          width: 100%;
          padding: 10px;
          font-size: 0.85rem;
        }

        /* Player Market styles */
        .player-market {
          padding: 24px;
        }

        .player-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 12px;
        }

        .player-card {
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
        }

        .player-info-main {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .player-meta-top {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
        }

        .player-country {
          color: var(--text-tertiary);
        }

        .player-rating-badge {
          background: rgba(255, 176, 32, 0.1);
          color: #FFB020;
          border: 1px solid rgba(255, 176, 32, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
        }

        .player-name {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .player-stats {
          display: flex;
          gap: 12px;
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .player-trade-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .player-price-box, .player-balance-box {
          text-align: right;
        }

        .price-label, .balance-label {
          font-size: 0.65rem;
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
        }

        .price-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
        }

        .price-unit {
          font-size: 0.75rem;
          color: var(--text-tertiary);
        }

        .balance-value {
          font-size: 1.1rem;
          font-weight: 700;
          color: var(--accent-blue);
        }

        .player-actions {
          display: flex;
          gap: 8px;
        }

        .btn-buy {
          padding: 8px 16px;
          font-size: 0.8rem;
        }

        .btn-sell {
          padding: 8px 16px;
          font-size: 0.8rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-default);
          color: #fff;
          border-radius: 8px;
          cursor: pointer;
        }
        .btn-sell:hover:not(:disabled) {
          background: rgba(255, 59, 92, 0.1);
          border-color: rgba(255, 59, 92, 0.3);
          color: var(--accent-danger);
        }

        /* Scout Console Styles */
        .scout-console {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: calc(100vh - 120px);
          max-height: 750px;
        }

        .tee-status-box {
          background: rgba(0, 255, 136, 0.03) !important;
          border: 1px solid rgba(0, 255, 136, 0.15);
          padding: 12px 16px;
          border-radius: 8px;
        }

        .tee-label {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
        }

        .tee-address {
          font-size: 0.78rem;
          color: var(--text-secondary);
        }

        .tee-badge {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent-safe);
          background: rgba(0, 255, 136, 0.1);
          border: 1px solid rgba(0, 255, 136, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
        }

        .console-logs {
          flex: 1;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 12px;
          overflow-y: auto;
          font-size: 0.78rem;
          line-height: 1.5;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .console-loading {
          color: var(--text-tertiary);
          text-align: center;
          margin: auto;
        }

        .console-line {
          word-break: break-word;
        }

        .log-time {
          color: var(--text-tertiary);
        }

        .log-info {
          color: var(--text-secondary);
        }

        .log-sentiment {
          color: #FFB020;
        }

        .log-security {
          color: #00E5FF;
        }

        .log-trade {
          color: var(--accent-safe);
        }

        .log-error {
          color: var(--accent-danger);
        }

        /* Event simulator box */
        .simulator-box {
          border: 1px solid var(--border-default);
          padding: 16px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.01) !important;
          margin-top: auto;
        }

        .simulator-header {
          font-size: 0.85rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 12px;
        }

        .sim-row {
          display: flex;
          gap: 12px;
        }

        .sim-col {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sim-col label {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
        }

        .btn-trigger {
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          font-size: 0.85rem;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @media (max-width: 1000px) {
          .pitchside-grid {
            display: grid !important;
            grid-template-columns: 1fr !important;
            grid-template-areas: 
              "vault"
              "console"
              "market"
              "leaderboard" !important;
            gap: 24px !important;
          }
          .scout-console {
            height: 580px;
          }
        }

        /* ─── Mobile: 768px and below ─── */
        @media (max-width: 768px) {
          .header-tabs {
            display: none;
          }

          .hero-section {
            padding: 16px !important;
            margin-bottom: 16px !important;
          }

          .hero-title {
            font-size: 1.1rem !important;
          }

          .hero-subtitle {
            font-size: 0.78rem !important;
            padding: 0 4px;
          }

          .pitchside-portal {
            padding: 0 8px !important;
            margin-top: 16px !important;
          }

          .pitchside-grid {
            gap: 16px;
          }

          /* Tighter panel padding on mobile */
          .glass-card {
            padding: 16px !important;
          }

          /* Compact the onboarding banner */
          .testnet-onboarding-banner {
            padding: 14px 16px !important;
          }

          .testnet-onboarding-banner h4 {
            font-size: 0.9rem !important;
          }

          .testnet-onboarding-banner p {
            font-size: 0.75rem !important;
          }

          /* Toggle instructions on mobile */
          .mobile-instructions-toggle {
            display: inline-block !important;
          }
          .instructions-grid.collapsed {
            display: none !important;
          }
          .instructions-grid.expanded {
            display: grid !important;
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }

          /* Responsive Staking Balances */
          .staking-balances {
            flex-direction: column !important;
            gap: 10px !important;
            margin-bottom: 12px !important;
          }
          .balance-item {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            width: 100% !important;
            font-size: 0.8rem !important;
          }

          /* Responsive Player Cards */
          .player-card {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 14px !important;
          }
          .player-trade-area {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 10px !important;
            border-top: 1px solid var(--border-default);
            padding-top: 12px;
          }
          .player-price-box, .player-balance-box {
            text-align: left !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .price-label, .balance-label {
            margin-bottom: 0 !important;
          }
          .player-actions {
            display: flex !important;
            gap: 8px !important;
            width: 100% !important;
            margin-top: 4px;
          }
          .player-actions button {
            flex: 1 !important;
            padding: 10px !important;
            font-size: 0.82rem !important;
          }

          /* Mobile Player Market View More/Less Toggle */
          .mobile-market-toggle {
            display: block !important;
          }
          .player-list.collapsed .player-card:nth-child(n+3) {
            display: none !important;
          }

          /* Console Logs Unclustering */
          .console-logs {
            padding: 16px !important;
            gap: 10px !important;
            font-size: 0.82rem !important;
            line-height: 1.6 !important;
          }
          .console-line {
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          }

          /* Responsive TEE Enclave Status */
          .tee-status-inner {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
          }

          /* Responsive ESPN Modal */
          .espn-modal-inner {
            padding: 16px !important;
            border-radius: 12px !important;
            max-width: 95% !important;
          }

          /* Hide Agent Activity Log on Mobile under Pitchside tab */
          .hide-on-mobile-pitchside {
            display: none !important;
          }

          /* Mainnet warning banner */
          .mainnet-warning-banner {
            flex-direction: column !important;
            gap: 12px !important;
            text-align: center;
          }

          .mainnet-warning-banner button {
            width: 100% !important;
          }
        }

        /* ─── Mobile: 480px and below ─── */
        @media (max-width: 480px) {
          .hero-title {
            font-size: 0.95rem !important;
          }

          .hero-subtitle {
            font-size: 0.72rem !important;
          }

          .pitchside-portal {
            padding: 0 4px !important;
          }

          .glass-card {
            padding: 12px !important;
            border-radius: 10px !important;
          }

          .panel-header h3 {
            font-size: 0.9rem !important;
          }

          .activity-log {
            padding: 12px !important;
          }

          .activity-entry {
            font-size: 0.68rem !important;
          }

          /* Stack the 4-step onboarding grid */
          .testnet-onboarding-banner > div:last-child {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default App;

