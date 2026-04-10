// ─── TokenSelector Component ─────────────────────────────────────────────────
// Modal dropdown for selecting tokens with search, icons, custom address import.

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOKEN_LIST, TokenInfo, resolveCustomToken } from "../lib/xlayer";
import { ethers } from "ethers";

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (token: TokenInfo) => void;
  excludeAddress?: string;
}

const MOCK_BALANCES: Record<string, string> = {
  OKB: "14.25",
  USDC: "1250.00",
  USDT: "340.50",
  WETH: "0.15",
  WOKB: "2.5"
};

const MOCK_PRICES: Record<string, number> = {
  OKB: 48.50,
  WOKB: 48.50,
  USDC: 1.00,
  USDT: 1.00,
  DAI: 1.00,
  WETH: 3120.50,
};

const TokenLogo: React.FC<{ token: TokenInfo; size?: number }> = ({ token, size = 36 }) => {
  const [imgError, setImgError] = useState(false);

  if (token.logoUrl && !imgError) {
    return (
      <img
        src={token.logoUrl}
        alt={token.symbol}
        className="token-selector-icon-img"
        style={{ width: size, height: size, borderRadius: "50%" }}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <div
      className="token-selector-icon"
      style={{ background: token.logoColor, width: size, height: size }}
    >
      {token.symbol.charAt(0)}
    </div>
  );
};

// Export for reuse in SwapCard and other components
export { TokenLogo };

const TokenSelector: React.FC<TokenSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  excludeAddress,
}) => {
  const [search, setSearch] = useState("");
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);
  const [isResolving, setIsResolving] = useState(false);

  const allTokens = useMemo(() => [...TOKEN_LIST, ...customTokens], [customTokens]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allTokens.filter(
      (t) =>
        t.address.toLowerCase() !== (excludeAddress || "").toLowerCase() &&
        (t.symbol.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q) ||
          t.address.toLowerCase().includes(q))
    );
  }, [search, excludeAddress, allTokens]);

  // Check if user pasted a contract address not in the list
  const isContractSearch = /^0x[a-fA-F0-9]{40}$/.test(search.trim());
  const addressNotInList = isContractSearch && filtered.length === 0;

  const handleImportToken = useCallback(async () => {
    if (!isContractSearch) return;
    setIsResolving(true);
    try {
      const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
      const token = await resolveCustomToken(search.trim(), provider);
      if (token) {
        setCustomTokens((prev) => {
          if (prev.find((t) => t.address.toLowerCase() === token.address.toLowerCase())) return prev;
          return [...prev, token];
        });
        onSelect(token);
        setSearch("");
        onClose();
      }
    } catch {
      // silently fail
    } finally {
      setIsResolving(false);
    }
  }, [search, isContractSearch, onSelect, onClose]);

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
              placeholder="Search or paste contract address..."
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
                  <TokenLogo token={token} />
                  <div className="token-selector-info">
                    <span className="token-selector-symbol">{token.symbol}</span>
                    <span className="token-selector-name">{token.name}</span>
                  </div>
                  
                  <div style={{ flex: 1 }}></div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-primary)' }}>{MOCK_BALANCES[token.symbol] || "0.00"}</span>
                    {MOCK_BALANCES[token.symbol] && MOCK_PRICES[token.symbol] && (
                       <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                         ~${(parseFloat(MOCK_BALANCES[token.symbol]) * (MOCK_PRICES[token.symbol] || 0)).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                       </span>
                    )}
                  </div>
                  {token.isStable && (
                    <span className="token-selector-badge">Stablecoin</span>
                  )}
                  {token.isNative && (
                    <span className="token-selector-badge native">Native</span>
                  )}
                  {token.isCustom && (
                    <span className="token-selector-badge custom">Imported</span>
                  )}
                </button>
              ))}

              {/* Import custom token by address */}
              {addressNotInList && (
                <div className="token-import-prompt">
                  <p>Token not in default list.</p>
                  <button
                    className="btn btn-primary btn-import"
                    onClick={handleImportToken}
                    disabled={isResolving}
                  >
                    {isResolving ? "Resolving..." : `Import ${search.slice(0, 8)}...`}
                  </button>
                </div>
              )}

              {filtered.length === 0 && !addressNotInList && (
                <div className="token-selector-empty">
                  No tokens found. Paste a contract address to import.
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

            .token-selector-icon-img {
              flex-shrink: 0;
              object-fit: cover;
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
            .token-selector-badge.custom {
              background: rgba(168, 85, 247, 0.15);
              color: #A855F7;
            }

            .token-selector-empty {
              text-align: center;
              padding: 24px;
              color: var(--text-tertiary);
              font-size: 0.85rem;
            }

            .token-import-prompt {
              text-align: center;
              padding: 16px;
              color: var(--text-secondary);
              font-size: 0.85rem;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }

            .btn-import {
              padding: 8px 20px;
              font-size: 0.85rem;
              border-radius: var(--radius-md);
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

export default TokenSelector;
