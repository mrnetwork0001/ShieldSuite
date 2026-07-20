// ─── Header Component ────────────────────────────────────────────────────────
// Logo, brand, wallet connect button, wallet dropdown with tx history

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { WalletState, shortenAddress, formatBalance } from "../lib/wallet";
import { XLAYER_CHAIN, getExplorerUrl, switchToChain } from "../lib/xlayer";
import { ethers } from "ethers";
import { DocsIcon, ShieldIcon, CopyIcon, HistoryIcon, DisconnectIcon, NetworkDot } from "./Icons";
import { useLanguage } from "../context/LanguageContext";


interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
  activeTab: "home" | "docs" | "swap" | "pitchside" | "rewards" | "agent_hub";
  setActiveTab: (tab: "home" | "docs" | "swap" | "pitchside" | "rewards" | "agent_hub") => void;
}

interface TxHistoryItem {
  hash: string;
  blockNumber: number;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect, activeTab, setActiveTab }) => {
  const { language, setLanguage, t } = useLanguage();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch recent transactions when dropdown opens
  useEffect(() => {
    if (!dropdownOpen || !wallet.connected || !wallet.address || !wallet.provider) return;

    const fetchTxHistory = async () => {
      setLoadingTx(true);
      try {
        const latestBlock = await wallet.provider!.getBlockNumber();
        const txs: TxHistoryItem[] = [];

        // Scan last 20 blocks in parallel for extreme speed
        const blockPromises = [];
        for (let i = 0; i < 20; i++) {
          blockPromises.push(wallet.provider!.getBlock(latestBlock - i, true).catch(() => null));
        }
        
        const blocks = await Promise.all(blockPromises);
        
        for (const block of blocks) {
          if (block && block.prefetchedTransactions) {
            for (const tx of block.prefetchedTransactions) {
              if (tx.from?.toLowerCase() === wallet.address!.toLowerCase()) {
                txs.push({ hash: tx.hash, blockNumber: block.number });
                if (txs.length >= 5) break;
              }
            }
          }
          if (txs.length >= 5) break;
        }
        setTxHistory(txs);
      } catch {
        setTxHistory([]);
      } finally {
        setLoadingTx(false);
      }
    };

    fetchTxHistory();
  }, [dropdownOpen, wallet.connected, wallet.address]);

  return (
    <motion.header
      className="header"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="header-inner">
        {/* Logo */}
        <div className="header-brand" onClick={() => setActiveTab("home")} style={{ cursor: 'pointer' }}>
          <div className="header-logo">
            <img src="/logo.png" alt="ShieldSuite Logo" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
          </div>
          <div>
            <h1 className="header-title">ShieldSuite</h1>
            <span className="header-tagline">{t("lp_tagline")}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="header-tabs">
          {(activeTab === "home" || activeTab === "docs") ? (
            <button
              className={`tab-btn ${activeTab === "docs" ? "active" : ""}`}
              onClick={() => setActiveTab("docs")}
            >
              <DocsIcon /> {t("nav_docs")}
            </button>
          ) : (
            <>
              <button
                className={`tab-btn ${activeTab === "swap" ? "active" : ""}`}
                onClick={() => setActiveTab("swap")}
              >
                <ShieldIcon /> {t("nav_shieldswap")}
              </button>
              <button
                className={`tab-btn ${activeTab === "pitchside" ? "active" : ""}`}
                onClick={() => setActiveTab("pitchside")}
              >
                {t("nav_pitchside")}
              </button>
              <button
                className={`tab-btn ${activeTab === "rewards" ? "active" : ""}`}
                onClick={() => setActiveTab("rewards")}
              >
                🏆 User Hub
              </button>
              <button
                className={`tab-btn ${activeTab === "agent_hub" ? "active" : ""}`}
                onClick={() => setActiveTab("agent_hub")}
              >
                🤖 Agent Hub
              </button>
            </>
          )}
        </div>

        {/* Right Actions Wrapper (contains Language Toggle, Desktop Actions, and Mobile Hamburger) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Language Toggle Button */}
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="lang-toggle-btn font-mono"
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-full)',
              color: 'var(--text-secondary)',
              padding: '6px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.8rem',
              fontWeight: 600,
              transition: 'all 0.2s',
              zIndex: 9991
            }}
          >
            <span>🌐</span>
            <span>{language === "en" ? "EN" : "中"}</span>
          </button>

          {activeTab !== "home" && (
            <div className="header-actions desktop-only">
              {/* Chain switcher */}
              <div className="chain-switcher-select font-mono" style={{ pointerEvents: 'none', background: 'rgba(75, 123, 245, 0.06)', border: '1px solid rgba(75, 123, 245, 0.2)' }}>
                <NetworkDot /> {t("nav_xlayer_mainnet")}
              </div>

              {/* Wallet button / dropdown */}
              {wallet.connected ? (
                <div className="wallet-dropdown-wrapper" ref={dropdownRef}>
                  <button
                    className="wallet-connected"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                  >
                    <div className="wallet-info">
                      <span className="wallet-balance font-mono">
                        {formatBalance(wallet.balance || "0")} OKB
                      </span>
                      <span className="wallet-address font-mono">
                        {shortenAddress(wallet.address || "")}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>▾</span>
                  </button>

                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        className="wallet-dropdown glass-card"
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="wd-address">
                          <span className="font-mono">{wallet.address}</span>
                          <button
                            className="wd-copy"
                            onClick={() => {
                              navigator.clipboard.writeText(wallet.address || "");
                            }}
                            title={t("nav_copy")}
                          >
                            <CopyIcon />
                          </button>
                        </div>
                        <div className="wd-divider" />
                        <div className="wd-section-title"><HistoryIcon /> {t("nav_recent_txs")}</div>
                        {loadingTx ? (
                          <div className="wd-loading">Loading...</div>
                        ) : txHistory.length > 0 ? (
                          <div className="wd-tx-list">
                            {txHistory.map((tx) => (
                              <a
                                key={tx.hash}
                                href={getExplorerUrl("tx", tx.hash, wallet.chainId || 196)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="wd-tx-item"
                              >
                                <span className="font-mono">
                                  {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
                                </span>
                                <span className="wd-tx-block">Block {tx.blockNumber}</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="wd-loading" style={{ color: 'var(--text-tertiary)' }}>
                            {t("nav_no_recent_txs")}
                          </div>
                        )}
                        <a
                          href={getExplorerUrl("address", wallet.address || "", wallet.chainId || 196)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="wd-view-all"
                        >
                          {t("nav_view_explorer")}
                        </a>
                        <div className="wd-divider" />
                        <button
                          className="wd-disconnect"
                          onClick={() => {
                            onDisconnect();
                            setDropdownOpen(false);
                          }}
                        >
                          <DisconnectIcon /> {t("nav_disconnect")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button className="btn btn-primary" onClick={onConnect}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 3H2a1 1 0 00-1 1v8a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1zm-2 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                  {t("nav_connect")}
                </button>
              )}
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button 
            className="mobile-menu-btn mobile-only"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <div className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Dark backdrop scrim */}
              <motion.div
                key="mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.7)',
                  zIndex: 9995, // Above everything in #root, but below CRT overlays
                }}
              />
              {/* Slide-in menu panel */}
              <motion.div 
                key="mobile-menu"
                className="mobile-menu-overlay"
                initial={{ opacity: 0, x: "100%" }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
              >
                <div className="mobile-menu-content">
                  <div className="mobile-menu-header">
                    <div />
                    <button className="close-btn" onClick={() => setMobileMenuOpen(false)}>×</button>
                  </div>

                  <div className="mobile-menu-actions">
                    {activeTab !== "home" && (
                      <>
                        <div className="chain-switcher-select font-mono" style={{ width: "100%", pointerEvents: 'none', textAlign: 'center', background: 'rgba(75, 123, 245, 0.06)', border: '1px solid rgba(75, 123, 245, 0.2)' }}>
                          <NetworkDot /> {t("nav_xlayer_mainnet")}
                        </div>

                        {wallet.connected ? (
                          <div className="mobile-wallet-card glass-card">
                            <div className="mw-label">{t("nav_connect")}</div>
                            <div className="mw-address font-mono">{shortenAddress(wallet.address || "")}</div>
                            <div className="mw-balance font-mono">{formatBalance(wallet.balance || "0")} OKB</div>
                            <button 
                              className="wd-disconnect"
                              style={{ marginTop: '12px', width: '100%' }}
                              onClick={() => {
                                onDisconnect();
                                setMobileMenuOpen(false);
                              }}
                            >
                              <DisconnectIcon /> {t("nav_disconnect")}
                            </button>
                          </div>
                        ) : (
                          <button 
                            className="btn btn-primary" 
                            style={{ width: '100%', padding: '16px' }}
                            onClick={() => {
                              onConnect();
                              setMobileMenuOpen(false);
                            }}
                          >
                            {t("nav_connect")}
                          </button>
                        )}
                      </>
                    )}

                    <div className="mobile-nav-links">
                      {(activeTab === "home" || activeTab === "docs") ? (
                        <button 
                          className={`nav-link-item ${activeTab === 'docs' ? 'active' : ''}`}
                          onClick={() => { setActiveTab('docs'); setMobileMenuOpen(false); }}
                          style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                        ><DocsIcon /> {t("nav_docs")}</button>
                      ) : (
                        <>
                          <button 
                            className={`nav-link-item ${activeTab === 'swap' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('swap'); setMobileMenuOpen(false); }}
                            style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                          ><ShieldIcon /> {t("nav_shieldswap")}</button>
                          <button 
                            className={`nav-link-item ${activeTab === 'pitchside' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('pitchside'); setMobileMenuOpen(false); }}
                            style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                          >{t("nav_pitchside")}</button>
                          <button 
                            className={`nav-link-item ${activeTab === 'rewards' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('rewards'); setMobileMenuOpen(false); }}
                            style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                          >🏆 User Hub</button>
                          <button 
                            className={`nav-link-item ${activeTab === 'agent_hub' ? 'active' : ''}`}
                            onClick={() => { setActiveTab('agent_hub'); setMobileMenuOpen(false); }}
                            style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%' }}
                          >🤖 Agent Hub</button>
                        </>
                      )}
                      
                      {/* Mobile Language Toggle */}
                      <button
                        onClick={() => {
                          setLanguage(language === "en" ? "zh" : "en");
                          setMobileMenuOpen(false);
                        }}
                        className="nav-link-item"
                        style={{ background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', width: '100%', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        <span>🌐</span> {language === "en" ? "切换至 中文 (ZH)" : "Switch to English (EN)"}
                      </button>

                      <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
                      <a href="https://x.com/ShieldSuite_" target="_blank" rel="noopener noreferrer" className="nav-link-item">Twitter / X</a>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      ) /* End of Mobile Menu Portal */}

      <style>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9990;
          background: rgba(10, 14, 23, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-default);
        }

        .header-inner {
          max-width: 1600px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-default);
          padding: 4px;
          border-radius: var(--radius-full);
        }

        .tab-btn {
          font-family: var(--font-mono);
          font-size: 0.82rem;
          font-weight: 600;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          padding: 6px 16px;
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .tab-btn.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(75, 123, 245, 0.25), rgba(168, 85, 247, 0.25));
          border: 1px solid rgba(75, 123, 245, 0.3);
          box-shadow: 0 0 12px rgba(75, 123, 245, 0.15);
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-logo {
          display: flex;
          align-items: center;
          filter: drop-shadow(0 0 8px rgba(75, 123, 245, 0.4));
        }

        .header-title {
          font-size: 1.25rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
        }

        .header-tagline {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* ─── Responsive Display Utilities ─── */
        .desktop-only { display: flex; }
        .mobile-only { display: none; }

        @media (max-width: 900px) {
          .desktop-only { display: none; }
          .mobile-only { display: flex; }
        }

        /* ─── Mobile Hamburger ─── */
        .mobile-menu-btn {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: var(--text-primary);
        }

        .hamburger {
          width: 24px;
          height: 18px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: currentColor;
          border-radius: 2px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hamburger.active span:nth-child(1) {
          transform: translateY(8px) rotate(45deg);
        }

        .hamburger.active span:nth-child(2) {
          opacity: 0;
          transform: translateX(-10px);
        }

        .hamburger.active span:nth-child(3) {
          transform: translateY(-8px) rotate(-45deg);
        }

        /* ─── Mobile Menu Overlay ─── */
        .mobile-menu-overlay {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 300px;
          max-width: 85%;
          z-index: 9999;
          border-left: 1px solid rgba(75, 123, 245, 0.2);
          padding: 24px;
          display: flex;
          flex-direction: column;
          background: #0d1526 !important;
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.9);
          overflow-y: auto;
        }

        .mobile-menu-overlay::before {
          display: none !important;
        }

        .mobile-menu-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 32px;
        }

        .mobile-menu-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: #fff;
          font-size: 2.5rem;
          line-height: 1;
          cursor: pointer;
          padding: 0;
          opacity: 0.8;
        }
        .close-btn:hover { opacity: 1; }

        .mobile-menu-actions {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .mobile-wallet-card {
          padding: 16px;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid var(--border-default);
        }

        .mw-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .mw-address {
          font-size: 0.9rem;
          color: var(--accent-blue);
          margin-bottom: 8px;
        }

        .mw-balance {
          font-size: 1.1rem;
          font-weight: 700;
        }

        .mobile-nav-links {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid var(--border-default);
          padding-top: 24px;
        }

        .nav-link-item {
          font-size: 1rem;
          color: var(--text-secondary);
          text-decoration: none;
          padding: 8px 0;
          transition: color 0.2s;
        }
        .nav-link-item:hover { color: #fff; }
        .nav-link-item.active { color: var(--accent-blue); font-weight: 700; }

        @media (max-width: 768px) {
          .header-tabs {
            display: none !important;
          }
          .header-inner {
            padding: 10px 16px;
          }
          .header-title {
            font-size: 1rem;
          }
          .header-tagline {
            font-size: 0.6rem;
          }
          .header-logo svg {
            width: 26px;
            height: 26px;
          }
          .header-brand {
            gap: 8px;
          }
        }

        @media (max-width: 480px) {
          .header-title {
            font-size: 0.9rem;
          }
          .header-tagline {
            display: none;
          }
        }

        /* ─── Desktop Header Components ─── */
        .chain-switcher-select {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          color: var(--text-secondary);
          padding: 6px 14px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 500;
          cursor: pointer;
          outline: none;
          transition: all 0.2s;
        }
        .chain-switcher-select:hover {
          border-color: var(--accent-blue);
          background: rgba(75, 123, 245, 0.05);
        }
        .chain-switcher-select option {
          background: #0a0e17;
          color: #fff;
        }

        .chain-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          font-size: 0.8rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }

        .chain-connected {
          color: var(--accent-safe);
          border-color: rgba(0, 255, 136, 0.2);
          background: rgba(0, 255, 136, 0.05);
        }

        .chain-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-tertiary);
        }

        .chain-connected .chain-dot {
          background: var(--accent-safe);
          box-shadow: 0 0 6px var(--accent-safe);
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .wallet-dropdown-wrapper {
          position: relative;
        }

        .wallet-connected {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px 6px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          cursor: pointer;
          transition: all 0.2s;
        }
        .wallet-connected:hover {
          border-color: var(--accent-blue);
          background: rgba(75, 123, 245, 0.05);
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .wallet-balance {
          font-size: 0.82rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .wallet-address {
          font-size: 0.78rem;
          color: var(--text-secondary);
          padding: 3px 10px;
          background: rgba(75, 123, 245, 0.1);
          border-radius: var(--radius-full);
        }

        .wallet-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 340px;
          padding: 16px;
          z-index: 200;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .wd-address {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.7rem;
          color: var(--text-secondary);
          word-break: break-all;
          line-height: 1.4;
        }

        .wd-copy {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.8rem;
          flex-shrink: 0;
          padding: 2px;
        }
        .wd-copy:hover { transform: scale(1.2); }

        .wd-divider {
          height: 1px;
          background: var(--border-default);
        }

        .wd-section-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .wd-loading {
          font-size: 0.8rem;
          color: var(--text-muted);
          padding: 6px 0;
        }

        .wd-tx-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .wd-tx-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.78rem;
          color: var(--accent-blue);
          text-decoration: none;
          transition: background 0.15s;
        }
        .wd-tx-item:hover {
          background: rgba(75, 123, 245, 0.08);
        }

        .wd-tx-block {
          font-size: 0.65rem;
          color: var(--text-tertiary);
        }

        .wd-view-all {
          font-size: 0.78rem;
          color: var(--accent-blue);
          text-decoration: none;
          text-align: center;
          padding: 4px;
          border-radius: 6px;
          transition: background 0.15s;
        }
        .wd-view-all:hover {
          background: rgba(75, 123, 245, 0.08);
          text-decoration: underline;
        }

        .wd-disconnect {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 59, 92, 0.2);
          background: rgba(255, 59, 92, 0.05);
          color: var(--accent-danger);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .wd-disconnect:hover {
          background: rgba(255, 59, 92, 0.12);
          border-color: rgba(255, 59, 92, 0.3);
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
          border-radius: var(--radius-full);
          min-width: 28px;
          min-height: 28px;
        }
      `}</style>
    </motion.header>
  );
};

export default Header;

