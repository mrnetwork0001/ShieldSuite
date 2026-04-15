// ─── Header Component ────────────────────────────────────────────────────────
// Logo, brand, wallet connect button, wallet dropdown with tx history

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WalletState, shortenAddress, formatBalance } from "../lib/wallet";
import { XLAYER_CHAIN, getExplorerUrl } from "../lib/xlayer";
import { ethers } from "ethers";

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

interface TxHistoryItem {
  hash: string;
  blockNumber: number;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
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
        <div className="header-brand">
          <div className="header-logo">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <defs>
                <linearGradient id="shield-grad" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#4B7BF5" />
                  <stop offset="100%" stopColor="#A855F7" />
                </linearGradient>
              </defs>
              <path
                d="M16 2L4 8v8c0 7.73 5.12 14.96 12 16.74C22.88 30.96 28 23.73 28 16V8L16 2z"
                fill="url(#shield-grad)"
                opacity="0.9"
              />
              <path
                d="M13 16l2.5 2.5L20 13"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <div>
            <h1 className="header-title">ShieldSwap</h1>
            <span className="header-tagline">Scan. Verify. Swap Safely.</span>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="header-actions desktop-only">
          {/* Chain indicator */}
          <div className={`chain-badge ${wallet.isXLayer ? "chain-connected" : ""}`}>
            <span className="chain-dot" />
            {wallet.isXLayer ? "XLayer" : "Not Connected"}
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
                        title="Copy address"
                      >
                        📋
                      </button>
                    </div>
                    <div className="wd-divider" />
                    <div className="wd-section-title">📜 Recent Transactions</div>
                    {loadingTx ? (
                      <div className="wd-loading">Loading...</div>
                    ) : txHistory.length > 0 ? (
                      <div className="wd-tx-list">
                        {txHistory.map((tx) => (
                          <a
                            key={tx.hash}
                            href={getExplorerUrl("tx", tx.hash)}
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
                        No recent transactions found
                      </div>
                    )}
                    <a
                      href={getExplorerUrl("address", wallet.address || "")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wd-view-all"
                    >
                      View all on Explorer →
                    </a>
                    <div className="wd-divider" />
                    <button
                      className="wd-disconnect"
                      onClick={() => {
                        onDisconnect();
                        setDropdownOpen(false);
                      }}
                    >
                      🔌 Disconnect Wallet
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
              Connect Wallet
            </button>
          )}
        </div>

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

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            className="mobile-menu-overlay glass-card"
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
                <div className={`chain-badge ${wallet.isXLayer ? "chain-connected" : ""}`}>
                  <span className="chain-dot" />
                  {wallet.isXLayer ? "XLayer Mainnet" : "Not Connected"}
                </div>

                {wallet.connected ? (
                  <div className="mobile-wallet-card glass-card">
                    <div className="mw-label">Connected Wallet</div>
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
                      🔌 Disconnect
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
                    Connect Wallet
                  </button>
                )}

                <div className="mobile-nav-links">
                  <a href="#" className="nav-link-item">Swap</a>
                  <a href="https://scanguard-dashboard-main.vercel.app" target="_blank" className="nav-link-item">ScanGuard Dashboard</a>
                  <a href="https://x.com/encrypt_wizard" target="_blank" className="nav-link-item">Twitter / X</a>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(10, 14, 23, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-default);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 12px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
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
          z-index: 2000;
          border-left: 1px solid var(--border-default);
          padding: 24px;
          display: flex;
          flex-direction: column;
          background: #2d4890 !important;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: -20px 0 40px rgba(0, 0, 0, 0.8);
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

        /* ─── Desktop Header Components ─── */
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

