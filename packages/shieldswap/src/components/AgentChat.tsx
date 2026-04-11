// ─── AgentChat Component ─────────────────────────────────────────────────────
// Floating AI chat interface for natural language commands:
// - "Is USDT safe?" → triggers scan
// - "Scan 0x1E4a..." → triggers scan
// - "Swap 10 USDC to OKB" → fills swap form
// - "help" → shows available commands

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  timestamp: number;
}

interface AgentChatProps {
  onScanToken?: (address: string) => void;
  onSwapCommand?: (from: string, to: string, amount: string) => void;
}

// ─── Known Token Map (for natural language resolution) ────────────────────────

const TOKEN_MAP: Record<string, string> = {
  usdt: "0x1e4a5963abfd975d8c9021ce480b42188849d41d",
  usdc: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  weth: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab",
  eth: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab",
  wokb: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
  okb: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
  dai: "0xc5015b9d9161dca7e18e32f6f25c4ad850731fd4",
};

// ─── Intent Parser ───────────────────────────────────────────────────────────

interface ParsedIntent {
  type: "scan" | "swap" | "help" | "status" | "unknown";
  tokenAddress?: string;
  tokenName?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
}

function parseIntent(input: string): ParsedIntent {
  const text = input.trim();
  const lower = text.toLowerCase();

  // Help
  if (/^(help|commands|what can you do|\?|menu)$/i.test(lower)) {
    return { type: "help" };
  }

  // Status
  if (/^(status|health|ping)$/i.test(lower)) {
    return { type: "status" };
  }

  // Extract any 0x-prefixed hex string from input (flexible length)
  const addrMatch = text.match(/(0x[a-fA-F0-9]{40})/);
  if (addrMatch) {
    return { type: "scan", tokenAddress: addrMatch[1] };
  }

  // "is X safe" pattern (check before generic name match)
  const safeMatch = lower.match(/is\s+(\w+)\s+safe/);
  if (safeMatch) {
    const name = safeMatch[1];
    if (TOKEN_MAP[name]) {
      return { type: "scan", tokenAddress: TOKEN_MAP[name], tokenName: name.toUpperCase() };
    }
  }

  // Scan by name: "scan usdt", "check usdc", "analyze weth"
  const nameMatch = lower.match(/(?:scan|check|analyze|audit)\s+(\w+)/);
  if (nameMatch) {
    const name = nameMatch[1];
    if (TOKEN_MAP[name]) {
      return { type: "scan", tokenAddress: TOKEN_MAP[name], tokenName: name.toUpperCase() };
    }
    // Partial address? (starts with 0x but not 40 chars)
    if (name.startsWith("0x")) {
      return { type: "unknown" }; // Will give helpful message
    }
  }

  // Swap: "swap 10 USDC to OKB" or "trade 5 usdt for usdc"
  const swapMatch = lower.match(
    /(?:swap|trade|exchange|buy|sell|convert)\s+([\d.]+)\s+(\w+)\s+(?:to|for|into|→)\s+(\w+)/
  );
  if (swapMatch) {
    return {
      type: "swap",
      amount: swapMatch[1],
      fromToken: swapMatch[2].toUpperCase(),
      toToken: swapMatch[3].toUpperCase(),
    };
  }

  // Just a token name by itself
  if (TOKEN_MAP[lower]) {
    return { type: "scan", tokenAddress: TOKEN_MAP[lower], tokenName: lower.toUpperCase() };
  }

  // Just a bare contract address (40 hex chars)
  if (/^0x[a-fA-F0-9]{40}$/i.test(text)) {
    return { type: "scan", tokenAddress: text };
  }

  // Partial 0x address — give helpful feedback instead of "unknown"
  if (/0x[a-fA-F0-9]+/.test(text)) {
    return { type: "unknown" };
  }

  return { type: "unknown" };
}

// ─── Component ───────────────────────────────────────────────────────────────

const AgentChat: React.FC<AgentChatProps> = ({ onScanToken, onSwapCommand }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "agent",
      text: "🛡️ ScanGuard Agent ready. Try: \"Is USDT safe?\" or \"Scan 0x...\" or type **help**.",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const addMessage = useCallback((role: "user" | "agent", text: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${role}-${Date.now()}-${Math.random()}`, role, text, timestamp: Date.now() },
    ]);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      const userInput = input.trim();
      setInput("");
      addMessage("user", userInput);
      setIsTyping(true);

      // Simulate agent thinking
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

      const intent = parseIntent(userInput);

      switch (intent.type) {
        case "help":
          addMessage(
            "agent",
            `📋 **Available commands:**\n\n• **Scan a token:** "Is USDT safe?" or "Scan 0x..."\n• **Swap tokens:** "Swap 10 USDC to OKB"\n• **Check status:** "status"\n• **Supported tokens:** USDT, USDC, WETH, OKB, DAI\n\nYou can also paste any contract address to scan it.`
          );
          break;

        case "scan":
          if (intent.tokenAddress) {
            const label = intent.tokenName || `${intent.tokenAddress.slice(0, 10)}...`;
            addMessage("agent", `🔍 Initiating security scan for **${label}**...\n\n_Querying OKX Security API + bytecode analysis + Uniswap V3 liquidity..._`);
            
            // Also notify the parent (App -> SwapCard) so it updates the main UI
            if (onScanToken) onScanToken(intent.tokenAddress);

            // Fetch the result autonomously and reply in chat
            try {
              const apiUrl = import.meta.env.VITE_SCANGUARD_URL || "";
              const res = await fetch(`${apiUrl}/api/scan`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tokenAddress: intent.tokenAddress, chainId: 196 })
              });
              const data = await res.json();
              if (data.success && data.data) {
                const sr = data.data;
                const emoji = sr.riskLevel === "SAFE" ? "🟩" : sr.riskLevel === "HIGH" || sr.riskLevel === "CRITICAL" ? "🟥" : "🟨";
                const reply = `✅ **Scan Complete: ${label}**\n\n${emoji} **Risk Level:** ${sr.riskLevel} (${sr.riskScore}/100)\n\n**Flags:** ${sr.flags.length}\n**Uniswap V3:** ${sr.uniswapHasPool ? "Active Pool" : "No Liquidity"}\n\n_${sr.flags.length > 0 ? "Check the main Risk Report panel for full alert details." : "Token looks clean. Safe to swap!"}_`;
                addMessage("agent", reply);
              } else {
                addMessage("agent", "⚠️ Scan failed to retrieve risk metadata.");
              }
            } catch (e) {
              addMessage("agent", "⚠️ Scan timed out or encountered an error.");
            }
          } else {
            addMessage("agent", "⚠️ Couldn't identify the token. Try: \"Scan USDT\" or paste a contract address.");
          }
          break;

        case "swap":
          if (intent.fromToken && intent.toToken && intent.amount && onSwapCommand) {
            addMessage(
              "agent",
              `🔄 Setting up swap: **${intent.amount} ${intent.fromToken} → ${intent.toToken}**\n\n_Fetching quotes from OKX DEX + Uniswap V3..._`
            );
            onSwapCommand(intent.fromToken, intent.toToken, intent.amount);
          } else {
            addMessage("agent", "⚠️ Try: \"Swap 10 USDC to OKB\"");
          }
          break;

        case "status":
          addMessage(
            "agent",
            `✅ **ScanGuard Status:**\n• Agent: Online\n• Chain: X Layer Mainnet (#196)\n• Skills: OKX Security, OKX DEX, Uniswap V3, x402\n• MCP: Ready\n• Scans: Free (demo mode)`
          );
          break;

        default: {
          const hasPartialAddr = /0x[a-fA-F0-9]+/.test(userInput);
          addMessage(
            "agent",
            hasPartialAddr
              ? `⚠️ That address looks incomplete — I need the full 42-character address (0x + 40 hex chars).\n\nPaste the complete address or try:\n• "Scan USDT"\n• "Is USDC safe?"`
              : `🤔 I didn't understand that. Try:\n• "Is USDT safe?"\n• "Scan USDC"\n• "Swap 10 USDC to OKB"\n• "help"`
          );
        }
      }

      setIsTyping(false);
    },
    [input, addMessage, onScanToken, onSwapCommand]
  );

  return (
    <>
      {/* Floating Chat Button */}
      <motion.button
        className="agent-chat-fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="ScanGuard Agent Chat"
      >
        {isOpen ? "✕" : "🤖"}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="agent-chat-panel glass-card"
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="agent-chat-header">
              <div className="agent-chat-title">
                <span className="agent-status-dot" />
                <span>ScanGuard Agent</span>
              </div>
              <span className="badge badge-safe font-mono" style={{ fontSize: '0.65rem' }}>AI</span>
            </div>

            {/* Messages */}
            <div className="agent-chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`agent-chat-msg agent-chat-msg-${msg.role}`}>
                  <div className="agent-chat-bubble">
                    {msg.text.split('\n').map((line, i) => (
                      <span key={i}>
                        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                        )}
                        {i < msg.text.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="agent-chat-msg agent-chat-msg-agent">
                  <div className="agent-chat-bubble agent-typing">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form className="agent-chat-input-bar" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="agent-chat-input"
                placeholder='Try "Is USDT safe?" or "help"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="agent-chat-send" disabled={!input.trim()}>
                →
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .agent-chat-fab {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 1px solid var(--glass-border);
          background: linear-gradient(135deg, rgba(51,255,0,0.15) 0%, rgba(75,123,245,0.15) 100%);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 20px rgba(51,255,0,0.15);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow 0.3s;
        }
        .agent-chat-fab:hover {
          box-shadow: 0 6px 32px rgba(0,0,0,0.5), 0 0 30px rgba(51,255,0,0.25);
        }

        .agent-chat-panel {
          position: fixed;
          bottom: 92px;
          right: 24px;
          width: 380px;
          max-height: 520px;
          display: flex;
          flex-direction: column;
          z-index: 999;
          border-radius: var(--radius-lg) !important;
          overflow: hidden;
        }

        .agent-chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .agent-chat-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .agent-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent-safe);
          box-shadow: 0 0 6px var(--accent-safe);
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .agent-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 360px;
          min-height: 200px;
        }

        .agent-chat-msg {
          display: flex;
        }
        .agent-chat-msg-user { justify-content: flex-end; }
        .agent-chat-msg-agent { justify-content: flex-start; }

        .agent-chat-bubble {
          max-width: 85%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.82rem;
          line-height: 1.5;
          word-break: break-word;
        }

        .agent-chat-msg-user .agent-chat-bubble {
          background: var(--accent-blue);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .agent-chat-msg-agent .agent-chat-bubble {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-default);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }

        .agent-typing {
          display: flex;
          gap: 4px;
          padding: 12px 16px;
        }

        .typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-tertiary);
          animation: typingBounce 1.4s ease-in-out infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }

        .agent-chat-input-bar {
          display: flex;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid var(--border-default);
          background: rgba(0,0,0,0.15);
        }

        .agent-chat-input {
          flex: 1;
          background: var(--bg-input);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 0.82rem;
          font-family: var(--font-sans);
          outline: none;
        }
        .agent-chat-input:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 2px var(--accent-blue-dim);
        }
        .agent-chat-input::placeholder {
          color: var(--text-tertiary);
        }

        .agent-chat-send {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-sm);
          border: none;
          background: var(--gradient-primary);
          color: white;
          font-size: 1.1rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: opacity 0.2s;
        }
        .agent-chat-send:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .agent-chat-panel {
            right: 8px;
            left: 8px;
            bottom: 80px;
            width: auto;
          }
          .agent-chat-fab {
            bottom: 16px;
            right: 16px;
            width: 48px;
            height: 48px;
            font-size: 1.2rem;
          }
        }
      `}</style>
    </>
  );
};

export default AgentChat;
