// ─── TokenInput Component ────────────────────────────────────────────────────
// Token address input with search, validation, and quick-select buttons.

import React, { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { XLAYER_TOKENS } from "../lib/xlayer";

interface TokenInputProps {
  label: string;
  value: string;
  onChange: (address: string) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  disabled?: boolean;
  showAmount?: boolean;
  tokenSymbol?: string | null;
  tokenName?: string | null;
}

const QUICK_TOKENS = [
  { symbol: "WOKB", address: XLAYER_TOKENS.WOKB, color: "#4B7BF5" },
  { symbol: "USDT", address: XLAYER_TOKENS.USDT, color: "#26A17B" },
  { symbol: "USDC", address: XLAYER_TOKENS.USDC, color: "#2775CA" },
  { symbol: "WETH", address: XLAYER_TOKENS.ETH, color: "#627EEA" },
];

const TokenInput: React.FC<TokenInputProps> = ({
  label,
  value,
  onChange,
  amount,
  onAmountChange,
  disabled = false,
  showAmount = true,
  tokenSymbol,
  tokenName,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(value);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (/^0x[a-fA-F0-9]{40}$/.test(text.trim())) {
        onChange(text.trim());
      }
    } catch {
      // Clipboard not available
    }
  }, [onChange]);

  return (
    <div className="token-input-wrapper">
      <div className="token-input-label">
        <span>{label}</span>
        {tokenSymbol && (
          <motion.span
            className="token-detected badge badge-info"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
          >
            {tokenSymbol}
          </motion.span>
        )}
      </div>

      <div className={`token-input-card glass-card ${isFocused ? "focused" : ""}`}>
        {/* Address input */}
        <div className="token-address-row">
          <input
            type="text"
            className="input input-mono token-address-input"
            placeholder="0x... paste token address"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled}
            spellCheck={false}
          />
          <button
            className="btn btn-ghost btn-sm paste-btn"
            onClick={handlePaste}
            title="Paste from clipboard"
          >
            <CopyIcon />
          </button>
        </div>

        {/* Token name if detected */}
        <AnimatePresence>
          {tokenName && (
            <motion.div
              className="token-name-row"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="token-fullname">{tokenName}</span>
              {isValidAddress && <span className="text-safe" style={{ fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "3px" }}><CheckIcon size={10} style={{ marginRight: 0 }} /> Valid</span>}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount input */}
        {showAmount && (
          <div className="token-amount-row">
            <input
              type="text"
              className="input input-lg token-amount-input"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) {
                  onAmountChange(val);
                }
              }}
              disabled={disabled || !isValidAddress}
            />
            <span className="token-amount-symbol font-mono">
              {tokenSymbol || "TOKEN"}
            </span>
          </div>
        )}

        {/* Quick token selectors */}
        <div className="token-quick-select">
          {QUICK_TOKENS.map((token) => (
            <button
              key={token.symbol}
              className={`quick-token-btn ${value === token.address ? "active" : ""}`}
              onClick={() => onChange(token.address)}
              disabled={disabled}
              style={{
                "--token-color": token.color,
              } as React.CSSProperties}
            >
              {token.symbol}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        .token-input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .token-input-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
          padding: 0 4px;
        }

        .token-input-card {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: border-color 0.2s ease;
        }

        .token-input-card.focused {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 3px var(--accent-blue-dim), var(--glass-shadow);
        }

        .token-address-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .token-address-input {
          flex: 1;
          font-size: 0.85rem;
          padding: 10px 12px;
          background: var(--bg-input);
        }

        .paste-btn {
          padding: 8px 12px;
          font-size: 1rem;
          border-radius: var(--radius-sm);
        }

        .token-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px;
          overflow: hidden;
        }

        .token-fullname {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .token-amount-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
        }

        .token-amount-input {
          flex: 1;
          color: var(--text-primary);
        }

        .token-amount-input:disabled {
          opacity: 0.4;
        }

        .token-amount-symbol {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .token-quick-select {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .quick-token-btn {
          padding: 5px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 600;
          font-family: var(--font-mono);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .quick-token-btn:hover {
          border-color: var(--token-color, var(--accent-blue));
          color: var(--token-color, var(--accent-blue));
          background: rgba(75, 123, 245, 0.06);
        }

        .quick-token-btn.active {
          border-color: var(--token-color, var(--accent-blue));
          color: var(--token-color, var(--accent-blue));
          background: rgba(75, 123, 245, 0.1);
        }

        .quick-token-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default TokenInput;
