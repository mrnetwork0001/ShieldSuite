// ─── TokenSelector Component ─────────────────────────────────────────────────
// Modal dropdown for selecting tokens with search, icons, and quick filters.

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOKEN_LIST, TokenInfo } from "../lib/xlayer";

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  excludeAddress?: string; // Don't show the other side's token
}

const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeAddress,
}) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TOKEN_LIST.filter(
      (t) =>
        t.address.toLowerCase() !== (excludeAddress || "").toLowerCase() &&
        (t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q))
    );
  }, [search, excludeAddress]);

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    setSearch("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="token-selector-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            className="token-selector-modal glass-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="token-selector-header">
              <h3>Select Token</h3>
              <button className="token-selector-close" onClick={onClose}>✕</button>
            </div>

            <input
              className="token-selector-search input input-mono"
              placeholder="Search by name, symbol, or address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />

            <div className="token-selector-list">
              {filtered.map((token) => (
                <button
                  key={token.address}
                  className="token-selector-item"
                  onClick={() => handleSelect(token)}
                >
                  <div
                    className="token-selector-icon"
                    style={{ background: token.logoColor }}
                  >
                    {token.symbol.charAt(0)}
                  </div>
                  <div className="token-selector-info">
                    <span className="token-selector-symbol">{token.symbol}</span>
                    <span className="token-selector-name">{token.name}</span>
                  </div>
                  {token.isStable && (
                    <span className="token-selector-badge">Stablecoin</span>
                  )}
                  {token.isNative && (
                    <span className="token-selector-badge native">Native</span>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="token-selector-empty">
                  No tokens found. Paste a custom address in the input field.
                </div>
              )}
            </div>
          </motion.div>

          <style>{`
            .token-selector-backdrop {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.6);
              backdrop-filter: blur(4px);
              z-index: 100;
            }

            .token-selector-modal {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) !important;
              width: 420px;
              max-width: 95vw;
              max-height: 70vh;
              padding: 20px;
              z-index: 101;
              display: flex;
              flex-direction: column;
              gap: 12px;
            }

            .token-selector-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .token-selector-header h3 {
              font-size: 1rem;
              font-weight: 700;
            }

            .token-selector-close {
              background: none;
              border: none;
              color: var(--text-secondary);
              font-size: 1.2rem;
              cursor: pointer;
              padding: 4px 8px;
              border-radius: 6px;
            }
            .token-selector-close:hover {
              background: rgba(255,255,255,0.05);
              color: var(--text-primary);
            }

            .token-selector-search {
              padding: 10px 14px;
              font-size: 0.85rem;
              background: var(--bg-input);
              border-radius: var(--radius-md);
              width: 100%;
            }

            .token-selector-list {
              display: flex;
              flex-direction: column;
              gap: 2px;
              overflow-y: auto;
              max-height: 320px;
              padding-right: 4px;
            }

            .token-selector-item {
              display: flex;
              align-items: center;
              gap: 12px;
              padding: 10px 12px;
              border-radius: var(--radius-md);
              border: none;
              background: transparent;
              cursor: pointer;
              color: var(--text-primary);
              text-align: left;
              transition: background 0.15s;
              width: 100%;
            }
            .token-selector-item:hover {
              background: rgba(255, 255, 255, 0.05);
            }

            .token-selector-icon {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 0.9rem;
              color: white;
              flex-shrink: 0;
            }

            .token-selector-info {
              display: flex;
              flex-direction: column;
              flex: 1;
              min-width: 0;
            }

            .token-selector-symbol {
              font-weight: 700;
              font-size: 0.9rem;
              font-family: var(--font-mono);
            }

            .token-selector-name {
              font-size: 0.75rem;
              color: var(--text-secondary);
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .token-selector-badge {
              font-size: 0.65rem;
              font-weight: 600;
              padding: 2px 8px;
              border-radius: 999px;
              background: rgba(39, 117, 202, 0.15);
              color: #2775CA;
              white-space: nowrap;
            }
            .token-selector-badge.native {
              background: rgba(75, 123, 245, 0.15);
              color: #4B7BF5;
            }

            .token-selector-empty {
              text-align: center;
              padding: 24px;
              color: var(--text-tertiary);
              font-size: 0.85rem;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default TokenSelector;
