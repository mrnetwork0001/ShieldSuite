// ─── ShieldSwap App ──────────────────────────────────────────────────────────
// Root application component wiring Header, SwapCard, RiskReport, and Activity Log

import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { DocsPage } from "./components/DocsPage";
import { MatchesCenter } from "./components/MatchesCenter";
import { OKXSpeculation } from "./components/OKXSpeculation";
import { VolumeLeaderboard } from "./components/VolumeLeaderboard";
import { UserHub } from "./components/UserHub";
import { GreenDotIcon, SearchIcon, SwapIcon, WarningIcon, InfoIcon } from "./components/Icons";
import { useLanguage } from "./context/LanguageContext";


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
  const { t, language } = useLanguage();
  const [wallet, setWallet] = useState<WalletState>(INITIAL_WALLET);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "docs" | "swap" | "pitchside" | "rewards">("home");
  const [pitchsideSubTab, setPitchsideSubTab] = useState<"speculation" | "matches" | "leaderboard" | "okx_speculation">("speculation");
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

  // ─── Background Music for Pitchside AI ───────────────────────────────────
  const [audioMuted, setAudioMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Audio
  useEffect(() => {
    const audio = new Audio("/assets/audio/background_music.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  // Handle Play/Pause when tab or mute changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (activeTab === "pitchside" && !audioMuted) {
      const playAudio = () => {
        audio.play().catch((err: any) => {
          console.warn("Autoplay blocked by browser. Awaiting user interaction.", err);
        });
      };
      
      playAudio();

      // Fallback: play on first user interaction if blocked
      const handleUserInteraction = () => {
        if (activeTab === "pitchside" && !audioMuted) {
          audio.play().catch(() => {});
        }
        window.removeEventListener("click", handleUserInteraction);
        window.removeEventListener("keydown", handleUserInteraction);
      };

      window.addEventListener("click", handleUserInteraction);
      window.addEventListener("keydown", handleUserInteraction);

      return () => {
        window.removeEventListener("click", handleUserInteraction);
        window.removeEventListener("keydown", handleUserInteraction);
      };
    } else {
      audio.pause();
    }
  }, [activeTab, audioMuted]);

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
    const providerVal = (window as any).okxwallet || window.ethereum;
    if (!providerVal) return;

    const handleChainChanged = async (hexChainId: string) => {
      const chainId = Number(hexChainId);
      try {
        const provider = new ethers.BrowserProvider(providerVal);
        const resolvedSigner = await provider.getSigner();
        const address = await resolvedSigner.getAddress();
        const balance = ethers.formatEther(await provider.getBalance(address));
        const isXLayer = chainId === 196;
        setWallet({
          connected: true,
          address,
          chainId,
          balance,
          isXLayer,
          provider,
          signer: resolvedSigner,
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
          const provider = new ethers.BrowserProvider(providerVal);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          const balance = ethers.formatEther(await provider.getBalance(address));
          const isXLayer = chainId === 196;
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

    providerVal.on("chainChanged", handleChainChanged);
    providerVal.on("accountsChanged", handleAccountsChanged);

    return () => {
      providerVal.removeListener("chainChanged", handleChainChanged);
      providerVal.removeListener("accountsChanged", handleAccountsChanged);
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
    <div className={`app-container ${activeTab === 'pitchside' ? 'pitchside-active' : ''}`}>
      <Header
        wallet={wallet}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        audioMuted={audioMuted}
        setAudioMuted={setAudioMuted}
      />

      <main className="main-content">
        {activeTab === "home" ? (
          <LandingPage setActiveTab={setActiveTab} />
        ) : activeTab === "rewards" ? (
          <UserHub wallet={wallet} onConnect={handleConnect} />
        ) : activeTab === "docs" ? (
          <DocsPage setActiveTab={setActiveTab} />
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
                {language === "zh" ? (
                  <>
                    热身交易大赛。{" "}
                    <span className="text-blue">保卫每笔交易。</span>
                  </>
                ) : (
                  <>
                    Warm-Up Trading Campaign.{" "}
                    <span className="text-blue">Every swap protected.</span>
                  </>
                )}
              </h2>
              <p className="hero-subtitle">
                {t("swap_hero_subtitle")}
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
              <VolumeLeaderboard
                wallet={wallet}
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
              <span className="spin-continuous" style={{ fontSize: '3rem' }}>⚽</span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{language === "zh" ? "探索赛场 AI" : "Explore Pitchside AI"}</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                {language === "zh" 
                  ? "赛场 AI 自治勘探与交易网络已部署至 X Layer 主网。进入保险库和球员市场，查看实时动态。"
                  : "The Pitchside AI Autonomous Scouting & Trading Network is deployed on X Layer Mainnet. Explore the vault and player markets live."
                }
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
                  <GreenDotIcon /> {language === "zh" ? "探索 X Layer 主网" : "Explore X Layer Mainnet"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="pitchside-portal animate-fade-in">
            {/* Pitchside Sub-Navigation Tabs */}
            <div className="pitchside-subnav" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
              <button
                className={`subnav-btn ${pitchsideSubTab === 'speculation' ? 'active' : ''}`}
                onClick={() => setPitchsideSubTab('speculation')}
                style={{
                  background: pitchsideSubTab === 'speculation' ? 'linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)' : 'transparent',
                  border: '1px solid',
                  borderColor: pitchsideSubTab === 'speculation' ? 'var(--accent-blue)' : 'var(--border-default)',
                  borderRadius: '10px',
                  color: pitchsideSubTab === 'speculation' ? '#fff' : 'var(--text-secondary)',
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: pitchsideSubTab === 'speculation' ? '0 0 15px rgba(75, 123, 245, 0.15)' : 'none'
                }}
              >
                📈 {language === "zh" ? "竞猜大盘" : "Speculation Board"}
              </button>
              <button
                className={`subnav-btn ${pitchsideSubTab === 'matches' ? 'active' : ''}`}
                onClick={() => setPitchsideSubTab('matches')}
                style={{
                  background: pitchsideSubTab === 'matches' ? 'linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)' : 'transparent',
                  border: '1px solid',
                  borderColor: pitchsideSubTab === 'matches' ? 'var(--accent-blue)' : 'var(--border-default)',
                  borderRadius: '10px',
                  color: pitchsideSubTab === 'matches' ? '#fff' : 'var(--text-secondary)',
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: pitchsideSubTab === 'matches' ? '0 0 15px rgba(75, 123, 245, 0.15)' : 'none'
                }}
              >
                ⚽ {language === "zh" ? "赛场中心" : "Matches Center"}
              </button>
              <button
                className={`subnav-btn ${pitchsideSubTab === 'leaderboard' ? 'active' : ''}`}
                onClick={() => setPitchsideSubTab('leaderboard')}
                style={{
                  background: pitchsideSubTab === 'leaderboard' ? 'linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)' : 'transparent',
                  border: '1px solid',
                  borderColor: pitchsideSubTab === 'leaderboard' ? 'var(--accent-blue)' : 'var(--border-default)',
                  borderRadius: '10px',
                  color: pitchsideSubTab === 'leaderboard' ? '#fff' : 'var(--text-secondary)',
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: pitchsideSubTab === 'leaderboard' ? '0 0 15px rgba(75, 123, 245, 0.15)' : 'none'
                }}
              >
                🏆 {language === "zh" ? "排行榜" : "Leaderboard"}
              </button>
              {/* Commented out OKX Speculation tab for production deployment. Can be uncommented for local testing.
              <button
                className={`subnav-btn ${pitchsideSubTab === 'okx_speculation' ? 'active' : ''}`}
                onClick={() => setPitchsideSubTab('okx_speculation')}
                style={{
                  background: pitchsideSubTab === 'okx_speculation' ? 'linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)' : 'transparent',
                  border: '1px solid',
                  borderColor: pitchsideSubTab === 'okx_speculation' ? 'var(--accent-blue)' : 'var(--border-default)',
                  borderRadius: '10px',
                  color: pitchsideSubTab === 'okx_speculation' ? '#fff' : 'var(--text-secondary)',
                  padding: '10px 20px',
                  fontSize: '0.85rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                  boxShadow: pitchsideSubTab === 'okx_speculation' ? '0 0 15px rgba(75, 123, 245, 0.15)' : 'none'
                }}
              >
                🔥 {language === "zh" ? "OKX 预测" : "OKX Speculation"}
              </button>
              */}
            </div>

            {pitchsideSubTab === 'speculation' ? (
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
              </div>
            ) : pitchsideSubTab === 'matches' ? (
              <MatchesCenter wallet={wallet} onActivityLog={handleActivityLog} />
            ) : pitchsideSubTab === 'leaderboard' ? (
              <Leaderboard wallet={wallet} />
            ) : (
              <OKXSpeculation wallet={wallet} onActivityLog={handleActivityLog} />
            )}
          </div>
        )}

        {/* Agent Activity Log - only visible on swap tab */}
        {activeTab === "swap" && (
          <motion.div
            className="activity-log glass-card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="activity-log-header">
              <div className="activity-log-title">
                <span className="activity-dot" />
                {t("act_title")}
              </div>
              <span className="badge badge-purple">{t("act_live")}</span>
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
                        {entry.type === "scan" ? <SearchIcon size={12} style={{ marginRight: 0 }} /> : entry.type === "swap" ? <SwapIcon size={12} style={{ marginRight: 0 }} /> : entry.type === "warning" ? <WarningIcon size={12} style={{ marginRight: 0 }} /> : <InfoIcon size={12} style={{ marginRight: 0 }} />}
                      </span>
                      <span className="activity-message">
                        {entry.message === "ShieldSwap initialized. Waiting for token scan..." 
                          ? t("act_init") 
                          : entry.message.startsWith("Wallet connected:") 
                            ? `${t("act_wallet_connect")}: ${entry.message.split("Wallet connected:")[1]}`
                            : entry.message === "Wallet disconnected."
                              ? t("act_wallet_disconnect")
                              : entry.message.startsWith("Network switched to chain ID")
                                ? `${t("act_net_switch")} ${entry.message.split("Network switched to chain ID")[1]}`
                                : entry.message.startsWith("Agent chat: scanning")
                                  ? `${t("act_scanning")} ${entry.message.split("Agent chat: scanning")[1]}`
                                  : entry.message.startsWith("Agent chat: swap")
                                    ? `${t("act_swap")} ${entry.message.split("Agent chat: swap")[1]}`
                                    : entry.message}
                      </span>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          {/* Left Column: Brand & Description */}
          <div className="footer-brand-column">
            <div className="footer-logo-row">
              <img src="/logo.png" alt="ShieldSuite Logo" className="footer-brand-logo" />
              <span className="footer-brand-name">ShieldSuite</span>
            </div>
            <p className="footer-brand-desc">
              {t("foot_desc")}
            </p>
            <div className="footer-social-row">
              <a href="https://x.com/ShieldSuite_" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="Follow on X (Twitter)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="https://github.com/shieldsuite" target="_blank" rel="noopener noreferrer" className="footer-social-link" title="GitHub Repository">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.138 20.193 22 16.44 22 12.017 22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Links Columns */}
          <div className="footer-links-container">
            <div className="footer-link-col">
              <span className="footer-col-title">{t("foot_col_protocol")}</span>
              <button onClick={() => setActiveTab("swap")} className="footer-link-btn">{t("foot_link_features")}</button>
              <button onClick={() => setActiveTab("swap")} className="footer-link-btn">{t("foot_link_aishield")}</button>
              <button onClick={() => setActiveTab("swap")} className="footer-link-btn">{t("foot_link_app")}</button>
            </div>

            <div className="footer-link-col">
              <span className="footer-col-title">{t("foot_col_eco")}</span>
              <a href="https://www.okx.com/explorer/xlayer" target="_blank" rel="noopener noreferrer" className="footer-link">{t("foot_link_explorer")}</a>
              <a href="https://www.okx.com/web3" target="_blank" rel="noopener noreferrer" className="footer-link">{t("foot_link_wallet")}</a>
              <a href="https://scanguard-dashboard-main.vercel.app" target="_blank" rel="noopener noreferrer" className="footer-link">{t("foot_link_mcp")}</a>
              <button onClick={() => setActiveTab("pitchside")} className="footer-link-btn">{t("foot_link_pitchside")}</button>
            </div>

            <div className="footer-link-col">
              <span className="footer-col-title">{t("foot_col_res")}</span>
              <button onClick={() => setActiveTab("docs")} className="footer-link-btn">{t("foot_link_docs")}</button>
              <button onClick={() => setActiveTab("docs")} className="footer-link-btn">{t("foot_link_contracts")}</button>
              <button onClick={() => setActiveTab("swap")} className="footer-link-btn">{t("foot_link_swap")}</button>
            </div>
          </div>
        </div>
      </footer>

      {/* Agent Chat - only visible on shieldswap */}
      {activeTab === "swap" && (
        <AgentChat
          onScanToken={handleChatScan}
          onSwapCommand={handleChatSwap}
        />
      )}

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

        .app-footer {
          width: 100%;
          background: rgba(10, 14, 23, 0.95);
          border-top: 1px solid var(--border-default);
          padding: 60px 40px 40px;
          margin-top: 80px;
        }

        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          gap: 60px;
          flex-wrap: wrap;
          width: 100%;
        }

        .footer-brand-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          max-width: 320px;
        }

        .footer-logo-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer-brand-logo {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          filter: drop-shadow(0 0 6px rgba(75, 123, 245, 0.4));
        }

        .footer-brand-name {
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: #fff;
        }

        .footer-brand-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
          text-align: left;
        }

        .footer-social-row {
          display: flex;
          gap: 16px;
          margin-top: 8px;
        }

        .footer-social-link {
          color: var(--text-secondary);
          transition: color 0.2s ease, transform 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .footer-social-link:hover {
          color: #fff;
          transform: translateY(-1px);
        }

        .footer-links-container {
          display: flex;
          gap: 64px;
          flex-wrap: wrap;
        }

        .footer-link-col {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 120px;
          align-items: flex-start;
        }

        .footer-col-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .footer-link, .footer-link-btn {
          font-size: 0.82rem;
          color: var(--text-secondary);
          text-decoration: none;
          text-align: left;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: color 0.15s ease;
          font-family: inherit;
        }

        .footer-link:hover, .footer-link-btn:hover {
          color: #fff;
        }

        @media (max-width: 768px) {
          .app-footer {
            padding: 40px 24px;
            margin-top: 48px;
          }
          .footer-content {
            flex-direction: column;
            gap: 40px;
          }
          .footer-links-container {
            gap: 40px;
            justify-content: space-between;
            width: 100%;
          }
        }

        .app-container.pitchside-active {
          background-image: linear-gradient(rgba(10, 14, 23, 0.85), rgba(10, 14, 23, 0.94)), url("/worldcup-bg.jpg");
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          background-attachment: fixed;
          transition: background-image 0.5s ease-in-out;
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
            "market market";
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
              "market" !important;
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

          /* Responsive Live Data Modal */
          .live-data-modal-inner {
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

