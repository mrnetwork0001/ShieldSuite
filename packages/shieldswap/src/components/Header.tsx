// ─── Header Component ────────────────────────────────────────────────────────
// Logo, brand, wallet connect button, chain status indicator

import React from "react";
import { motion } from "framer-motion";
import { WalletState, shortenAddress, formatBalance } from "../lib/wallet";

interface HeaderProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

const Header: React.FC<HeaderProps> = ({ wallet, onConnect, onDisconnect }) => {
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

        {/* Right side */}
        <div className="header-actions">
          {/* Chain indicator */}
          <div className={`chain-badge ${wallet.isXLayer ? "chain-connected" : ""}`}>
            <span className="chain-dot" />
            {wallet.isXLayer ? "X Layer" : "Not Connected"}
          </div>

          {/* Wallet button */}
          {wallet.connected ? (
            <div className="wallet-connected">
              <div className="wallet-info">
                <span className="wallet-balance font-mono">
                  {formatBalance(wallet.balance || "0")} OKB
                </span>
                <span className="wallet-address font-mono">
                  {shortenAddress(wallet.address || "")}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={onDisconnect}>
                ✕
              </button>
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
      </div>

      <style>{`
        .header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(10, 14, 23, 0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-default);
        }

        .header-inner {
          max-width: 1400px;
          margin: 0 auto;
          padding: 14px 24px;
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

        .wallet-connected {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px 6px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
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

        .btn-sm {
          padding: 4px 8px;
          font-size: 0.8rem;
          border-radius: var(--radius-full);
          min-width: 28px;
          min-height: 28px;
        }

        @media (max-width: 600px) {
          .header-tagline { display: none; }
          .wallet-balance { display: none; }
          .chain-badge span:not(.chain-dot) { display: none; }
        }
      `}</style>
    </motion.header>
  );
};

export default Header;
