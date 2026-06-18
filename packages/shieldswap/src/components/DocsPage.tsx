import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DocsPageProps {
  setActiveTab: (tab: "home" | "docs" | "swap" | "pitchside") => void;
}

type SectionId = "overview" | "scanguard" | "x402" | "shieldswap" | "pitchside" | "contracts";

export const DocsPage: React.FC<DocsPageProps> = ({ setActiveTab }) => {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const sections = [
    { id: "overview" as const, title: "📖 Overview", label: "Overview" },
    { id: "scanguard" as const, title: "🛡️ ScanGuard Tech", label: "ScanGuard Core" },
    { id: "x402" as const, title: "💳 x402 Economy", label: "x402 Protocol" },
    { id: "shieldswap" as const, title: "🔄 ShieldSwap DEX", label: "DEX Aggregator" },
    { id: "pitchside" as const, title: "⚽ Pitchside AI Loop", label: "Pitchside Speculation" },
    { id: "contracts" as const, title: "⚓ Deployments", label: "Smart Contracts" },
  ];

  return (
    <div className="docs-container">
      {/* Stadium Glow Backdrop */}
      <div className="stadium-glow" style={{ opacity: 0.5 }} />

      <aside className="docs-sidebar">
        <h3 className="sidebar-title font-mono">DOCUMENTATION</h3>
        <nav className="sidebar-nav">
          {sections.map((sec) => (
            <button
              key={sec.id}
              className={`sidebar-btn font-mono ${activeSection === sec.id ? "active" : ""}`}
              onClick={() => setActiveSection(sec.id)}
            >
              {sec.title}
            </button>
          ))}
        </nav>

        {/* Quick Launch CTA */}
        <div className="sidebar-cta glass-card">
          <h4>Launch App</h4>
          <p>Ready to secure your trades or stake risk-free?</p>
          <div className="sidebar-cta-btns">
            <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("pitchside")}>
              🏆 Pitchside
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("swap")}>
              🔄 Swap
            </button>
          </div>
        </div>
      </aside>

      <main className="docs-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.2 }}
            className="docs-panel"
          >
            {activeSection === "overview" && (
              <>
                <h1 className="docs-section-title">Overview: ShieldSuite & Pitchside AI</h1>
                <p className="docs-para">
                  **ShieldSuite** is a dual-purpose Web3 security infrastructure and speculation ecosystem deployed on **X Layer**. Designed for both retail users and automated autonomous agents, ShieldSuite solves two critical modern DeFi challenges:
                </p>
                <ol className="docs-list">
                  <li>
                    <strong>DEX Aggregator Security Gates:</strong> Token transactions are scanned on-chain at bytecode level in real-time, blocking malicious interactions (honeypots, blacklists, tax modifications) before they hit the ledger.
                  </li>
                  <li>
                    <strong>No-Loss Sports Speculation:</strong> Users stake stablecoins risk-free to generate virtual yield, which is delegated to TEE-isolated AI agents to trade ERC-1155 player index shares based on live World Cup match data.
                  </li>
                </ol>

                <div className="glass-card docs-info-box">
                  <h4> Evolving for World Cup 2026</h4>
                  <p>
                    With the upcoming FIFA World Cup 2026, Pitchside AI shifts prediction markets from high-risk betting where users lose their principal to a 100% capital-protected speculation network powered by Aave V3 yield loops and Trusted Execution Environments (TEEs).
                  </p>
                </div>
              </>
            )}

            {activeSection === "scanguard" && (
              <>
                <h1 className="docs-section-title">🛡️ ScanGuard: Bytecode Analysis & Heuristics</h1>
                <p className="docs-para">
                  ScanGuard acts as the backend intelligence engine. Running as a REST API and Model Context Protocol (MCP) server, it performs deep on-chain bytecode scanning of smart contracts.
                </p>
                <h3>Security Check Specifications</h3>
                <div className="docs-table-wrapper">
                  <table className="docs-table">
                    <thead>
                      <tr>
                        <th>Check Name</th>
                        <th>Scanning Method</th>
                        <th>Risk Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>EOA Detection</strong></td>
                        <td>Validates if code at target address is `0x`</td>
                        <td className="text-danger font-mono">CRITICAL (100)</td>
                      </tr>
                      <tr>
                        <td><strong>Honeypot Codes</strong></td>
                        <td>Checks absence of standard `transfer`/`transferFrom` selectors</td>
                        <td className="text-danger font-mono">CRITICAL (100)</td>
                      </tr>
                      <tr>
                        <td><strong>Proxy Delegations</strong></td>
                        <td>Detects delegatecall opcode `0xF4` indicating upgradability</td>
                        <td className="text-warning font-mono">MEDIUM (50)</td>
                      </tr>
                      <tr>
                        <td><strong>Blacklist Functions</strong></td>
                        <td>Matches bytecode signatures for `blacklist` and `freeze` methods</td>
                        <td className="text-danger font-mono">HIGH (80)</td>
                      </tr>
                      <tr>
                        <td><strong>Hidden Fee Taxes</strong></td>
                        <td>Detects dynamically adjustable tax code sequences in bytecode</td>
                        <td className="text-warning font-mono">MEDIUM (60)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3>Example MCP JSON API Response</h3>
                <pre className="docs-code font-mono">
{`{
  "success": true,
  "data": {
    "tokenAddress": "0x779ded0c9e1022225f8e0630b35a9b54be713736",
    "riskScore": 12,
    "riskLevel": "SAFE",
    "flags": [],
    "bytecode": { "isProxy": false, "hasTax": false },
    "scanDurationMs": 28
  }
}`}
                </pre>
              </>
            )}

            {activeSection === "x402" && (
              <>
                <h1 className="docs-section-title">💳 x402 Pay-Per-Scan Agent Economy</h1>
                <p className="docs-para">
                  ScanGuard implements the **x402 Protocol** to establish a monetized, decentralized API pipeline. In an environment where AI trading agents require automated security checks, they make stablecoin micro-payments on-chain to access ScanGuard intelligence.
                </p>
                <div className="glass-card docs-info-box border-purple">
                  <h4>💡 Why x402 is Revolutionary</h4>
                  <p>
                    Rather than relying on legacy SaaS API keys, credit cards, or centralized subscriptions, the x402 protocol allows TEE enclaves and autonomous bots to transact natively in stablecoins directly with the security nodes.
                  </p>
                </div>

                <h3>x402 Protocol Lifecycle Flow</h3>
                <ol className="docs-list">
                  <li>
                    <strong>Request:</strong> Agent makes a `POST /api/scan` request without payment headers.
                  </li>
                  <li>
                    <strong>Denial:</strong> Server returns `HTTP 402 Payment Required` detailing a required payment of **$0.005 USDC** to the vault address.
                  </li>
                  <li>
                    <strong>Payment:</strong> Agent signs and broadcasts the transfer transaction on X Layer.
                  </li>
                  <li>
                    <strong>Verification:</strong> Agent retries the request with the `X-402-Payment` header containing the transaction hash.
                  </li>
                  <li>
                    <strong>Response:</strong> Node confirms the hash on-chain, indexes the payment, and returns the full security risk report.
                  </li>
                </ol>
              </>
            )}

            {activeSection === "shieldswap" && (
              <>
                <h1 className="docs-section-title">🔄 ShieldSwap: Security-Gated Aggregator</h1>
                <p className="docs-para">
                  ShieldSwap is the frontend gateway. Integrating the **OKX DEX Aggregator API**, it searches over 500+ decentralized liquidity pools on X Layer to route swaps at the lowest slippage and gas rates.
                </p>
                <h3>Security-Interceptor Mechanism</h3>
                <p className="docs-para">
                  When a user types in a custom token address to execute a swap, ShieldSwap automatically holds the transaction in a pending state. It calls the ScanGuard API to evaluate the token bytecode. 
                  If a honeypot code pattern or malicious blacklist logic is found, the transaction is **force-blocked**, and an interactive threat report displays the exact warning flags.
                </p>
                <div className="glass-card docs-info-box">
                  <h4>💬 Conversational AI Assistant</h4>
                  <p>
                    ShieldSwap features an inline AI chat panel that wraps `okx-dex-token` and `okx-security`. Users can command the agent: <em>"Scan contract 0x779d... and buy 10 WOKB if safe."</em> The chatbot scans, reports threat diagnostics, and populates the swap card dynamically.
                  </p>
                </div>
              </>
            )}

            {activeSection === "pitchside" && (
              <>
                <h1 className="docs-section-title">⚽ Pitchside AI: No-Loss Speculation Loop</h1>
                <p className="docs-para">
                  Pitchside AI is our flagship World Cup 2026 prediction sandbox. It allows stakers to speculate on player shares index tokens without any risk to their principal stablecoins.
                </p>

                <div className="pitchside-loop-steps">
                  <div className="loop-step">
                    <h5>1. Staking Vault & Aave V3 Pools</h5>
                    <p>USDT/USDC deposited into `NoLossVault.sol` is supplied directly to X Layer's **Aave V3 pools**. The principal remains 100% safe and can be pulled out by the user at any time.</p>
                  </div>
                  <div className="loop-step">
                    <h5>2. Scout Credits Yield Generation</h5>
                    <p>The yield generated from Aave is harvested. Stakers accrue virtual **Scout Credits** in real-time proportional to their staking volume and duration. Credits act as the virtual gas for speculations.</p>
                  </div>
                  <div className="loop-step">
                    <h5>3. TEE Scout Agent Delegation</h5>
                    <p>Stakers delegate their credits to our **Trusted Execution Environment (TEE)** scout agent. The agent uses the `okx-agentic-wallet` SDK, sealing its private keys inside hardware enclaves. The TEE agent parses live match data (Sportradar Soccer API v4) to trade Player Index Shares (`PlayerShares.sol` ERC-1155 tokens) dynamically on our zero-slippage custom AMM (`PlayerDex.sol`).</p>
                  </div>
                  <div className="loop-step">
                    <h5>4. Onchain Dynamic Rating Updates</h5>
                    <p>When the TEE agent detects a positive player event (e.g., a goal or assist), it submits an on-chain transaction calling `PlayerShares.updatePlayer(...)` to increase the player rating. Because the AMM pricing depends directly on the on-chain rating, share prices shift in real-time, allowing stakers to lock in profits.</p>
                  </div>
                </div>
              </>
            )}

            {activeSection === "contracts" && (
              <>
                <h1 className="docs-section-title">⚓ Smart Contract Deployments</h1>
                <p className="docs-para">
                  ShieldSuite is actively deployed on both X Layer Mainnet and X Layer Testnet Sandbox:
                </p>

                <h3>X Layer Mainnet (Chain ID 196)</h3>
                <ul className="docs-contracts font-mono">
                  <li><strong>USDT Token:</strong> 0x779Ded0c9e1022225f8E0630b35a9b54bE713736</li>
                  <li><strong>NoLossVault:</strong> 0xe8a63b4a905d9c1c2262f261dee90478d6ffd3de</li>
                  <li><strong>PlayerShares ERC-1155:</strong> 0xb1cc05dc0a0b70fabc6bbb1b3043ba386c86d7e1</li>
                  <li><strong>PlayerDex AMM:</strong> 0xf2338b4ba18373070cdfd9f53da321fa12aa591b</li>
                  <li><strong>TEE Agent Wallet:</strong> 0xDAce8445a5bD576111cCC8e598B67965252023C2</li>
                </ul>

                <h3>X Layer Testnet Sandbox (Chain ID 1952)</h3>
                <ul className="docs-contracts font-mono">
                  <li><strong>MockUSDT:</strong> 0xe5E0795a8A61502409f304f391B615220d720fE9</li>
                  <li><strong>NoLossVault:</strong> 0x9E1A49480C1c1762A4B465F50c5cAAb86Aa3B046</li>
                  <li><strong>PlayerShares ERC-1155:</strong> 0xE8a63B4a905d9C1C2262F261dee90478d6fFD3De</li>
                  <li><strong>PlayerDex AMM:</strong> 0xF2338b4Ba18373070cDfD9F53DA321fA12Aa591b</li>
                  <li><strong>TEE Agent Wallet:</strong> 0xDAce8445a5bD576111cCC8e598B67965252023C2</li>
                </ul>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <style>{`
        .docs-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 40px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 80vh;
          padding: 0 16px;
          color: var(--text-primary);
          position: relative;
        }

        .docs-sidebar {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sidebar-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.1em;
          margin-bottom: 8px;
        }

        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .sidebar-btn {
          text-align: left;
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          padding: 12px 16px;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .sidebar-btn:hover {
          color: #fff;
          border-color: var(--border-hover);
          background: rgba(255, 255, 255, 0.03);
        }

        .sidebar-btn.active {
          color: #fff;
          background: linear-gradient(135deg, rgba(75, 123, 245, 0.15), rgba(168, 85, 247, 0.15));
          border-color: var(--accent-blue);
          box-shadow: 0 0 10px rgba(75, 123, 245, 0.1);
        }

        .sidebar-cta {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: auto;
        }

        .sidebar-cta h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }

        .sidebar-cta p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .sidebar-cta-btns {
          display: flex;
          gap: 8px;
        }

        .btn-sm {
          padding: 8px 12px;
          font-size: 0.75rem;
          flex: 1;
        }

        /* Content panel */
        .docs-content {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: 40px;
          min-height: 600px;
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          box-shadow: inset 0 0 30px rgba(255, 255, 255, 0.01);
          overflow: hidden;
        }

        .docs-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .docs-section-title {
          font-size: 2rem;
          font-weight: 900;
          color: #fff;
          letter-spacing: -0.02em;
          line-height: 1.2;
          border-bottom: 1px solid var(--border-default);
          padding-bottom: 12px;
        }

        .docs-para {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .docs-list {
          padding-left: 20px;
          font-size: 0.92rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 12px;
          line-height: 1.6;
        }

        .docs-info-box {
          padding: 20px 24px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(75, 123, 245, 0.03) !important;
          border-left: 3px solid var(--accent-blue);
          border-radius: 0 8px 8px 0;
        }

        .docs-info-box.border-purple {
          border-left-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.03) !important;
        }

        .docs-info-box h4 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
        }

        .docs-info-box p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        .docs-panel h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin-top: 12px;
        }

        /* Table */
        .docs-table-wrapper {
          width: 100%;
          overflow-x: auto;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
        }

        .docs-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.85rem;
        }

        .docs-table th, .docs-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .docs-table th {
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-tertiary);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
        }

        .docs-table tr:last-child td {
          border-bottom: none;
        }

        .docs-table td {
          color: var(--text-secondary);
        }

        /* Code Block */
        .docs-code {
          background: #060911;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          font-size: 0.78rem;
          line-height: 1.5;
          color: var(--accent-safe);
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
        }

        /* Loop Steps */
        .pitchside-loop-steps {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .loop-step {
          background: rgba(255, 255, 255, 0.005);
          border: 1px solid var(--border-default);
          padding: 20px;
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .loop-step h5 {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .loop-step p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }

        /* Contract List */
        .docs-contracts {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 10px;
          font-size: 0.82rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.005);
          border: 1px solid var(--border-default);
          padding: 20px;
          border-radius: var(--radius-md);
        }

        .docs-contracts strong {
          color: #fff;
          min-width: 180px;
          display: inline-block;
        }

        @media (max-width: 900px) {
          .docs-container {
            grid-template-columns: 1fr;
            gap: 24px;
          }
          .docs-sidebar {
            flex-direction: row;
            flex-wrap: wrap;
            align-items: center;
          }
          .sidebar-nav {
            flex-direction: row;
            flex-wrap: wrap;
            gap: 8px;
            width: 100%;
          }
          .sidebar-btn {
            flex: 1;
            min-width: 140px;
            text-align: center;
          }
          .sidebar-cta {
            display: none;
          }
          .docs-content {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};
