import React from "react";
import { motion } from "framer-motion";

interface LandingPageProps {
  setActiveTab: (tab: "home" | "swap" | "pitchside") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab }) => {
  return (
    <div className="landing-container">
      {/* Stadium Pitch Background Grid Overlay */}
      <div className="pitch-overlay" />
      <div className="stadium-glow" />

      {/* Hero Section */}
      <section className="landing-hero">
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="soccer-ball-emoji">⚽</span> ROAD TO WORLD CUP 2026
        </motion.div>

        <motion.h1
          className="hero-main-title"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          Secure DeFi Aggregator & <br />
          <span className="glow-text text-purple">No-Loss Speculation Network</span>
        </motion.h1>

        <motion.p
          className="hero-desc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Protect your trades with ScanGuard MCP's dual-layer bytecode scanning and speculate on player index shares using virtual yield backed by Aave V3. Zero principal risk, maximum security.
        </motion.p>

        {/* CTA Actions */}
        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            className="btn btn-primary btn-lg-cta hover-glow"
            onClick={() => setActiveTab("pitchside")}
          >
            ⚽ Launch Pitchside AI
          </button>
          <button
            className="btn btn-ghost btn-lg-cta"
            onClick={() => setActiveTab("swap")}
          >
            🛡️ Enter ShieldSwap DEX
          </button>
        </motion.div>
      </section>

      {/* Metrics Section */}
      <section className="landing-metrics">
        <div className="metrics-grid">
          {[
            { label: "NO-LOSS VAULT TVL", value: "$1,482,900", icon: "🏦", color: "var(--accent-safe)" },
            { label: "LIFETIME TOKENS SCANNED", value: "2,223", icon: "🔍", color: "var(--accent-blue)" },
            { label: "TEE ENCLAVE UPTIME", value: "99.98%", icon: "⚡", color: "var(--accent-purple)" },
            { label: "ACTIVE AI AGENTS", value: "11/11", icon: "🤖", color: "#FFB020" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card metric-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              whileHover={{ y: -5, borderColor: stat.color }}
            >
              <div className="metric-header">
                <span className="metric-icon">{stat.icon}</span>
                <span className="metric-label">{stat.label}</span>
              </div>
              <div className="metric-value font-mono" style={{ color: stat.color }}>
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Ecosystem Loop Section */}
      <section className="landing-section">
        <h2 className="section-title">⚽ Pitchside AI: No-Loss Speculation Loop</h2>
        <p className="section-subtitle">
          How it works: Speculate on the World Cup 2026 risk-free using principal-protected staking.
        </p>

        <div className="loop-grid">
          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="step-num font-mono">01</div>
            <h3>Principal-Protected Staking</h3>
            <p>
              Deposit stablecoins (USDT/USDC) into our **No-Loss Vault**. On mainnet, funds are securely supplied directly into **Aave V3 Pools** to generate interest. Your principal remains 100% safe and withdrawable at any moment.
            </p>
          </motion.div>

          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="step-num font-mono">02</div>
            <h3>Earn Virtual Scout Credits</h3>
            <p>
              Your staked stablecoins continuously earn virtual interest in the form of **Scout Credits**. These credits tick upward in real-time on your dashboard and represent your delegation and speculation power.
            </p>
          </motion.div>

          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="step-num font-mono">03</div>
            <h3>Delegate & Speculate</h3>
            <p>
              Delegate your Scout Credits to our **TEE-isolated AI Scout Agent**. The agent reads ESPN & Sportradar live scores, parses sports sentiment, scans token bytecode, and trades player index shares on your behalf.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ScanGuard & Security Core Section */}
      <section className="landing-section layout-split">
        <div className="split-text">
          <h2 className="section-title">🛡️ ScanGuard & ShieldSwap DEX Aggregator</h2>
          <p className="section-desc-para">
            Traditional DEX routers execute swaps blindly. ShieldSuite intercepts transactions with a native security guard before they can harm your wallet.
          </p>

          <div className="security-features">
            <div className="sec-feature">
              <span className="sec-icon">🔬</span>
              <div>
                <h4>Dual-Layer Bytecode Scanning</h4>
                <p>Combines OKX Security scanning with a custom heuristics engine to check for hidden taxes, proxy upgrades, blacklist functions, and honeypots.</p>
              </div>
            </div>

            <div className="sec-feature">
              <span className="sec-icon">💳</span>
              <div>
                <h4>x402 Pay-Per-Scan Protocol</h4>
                <p>A standard monetization loop where automated client agents stream micro-payments in stablecoins to access ScanGuard security reports in real-time.</p>
              </div>
            </div>

            <div className="sec-feature">
              <span className="sec-icon">🤖</span>
              <div>
                <h4>Conversational AI Chatbot</h4>
                <p>Scan and stage swaps using natural language directly inside the swap terminal. Your personal agent parses the intent, scans safety, and populates the slip.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Terminal Panel */}
        <motion.div
          className="glass-card terminal-visual"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <div className="terminal-header">
            <span className="term-dot red" />
            <span className="term-dot yellow" />
            <span className="term-dot green" />
            <span className="term-title font-mono">scanguard-mcp-v1.0.0</span>
          </div>
          <div className="terminal-content font-mono">
            <div className="term-line prompt">&gt; scan --address 0x779d...3736</div>
            <div className="term-line success">📡 Resolving token metadata... Done. (WOKB/USDT)</div>
            <div className="term-line success">🤖 Checking bytecode hashes against ScanGuard Core...</div>
            <div className="term-line warning">⚠️ Warning: Honeypot code snippet detected in proxy contract.</div>
            <div className="term-line danger">❌ RISK LEVEL: HIGH (89/100) - Blocked swap.</div>
            <div className="term-line success">🔒 User principal protected. Scan complete in 42ms.</div>
          </div>
        </motion.div>
      </section>

      {/* Diagram Section */}
      <section className="landing-section diagram-section text-center">
        <h2 className="section-title">⛓️ Core Architecture Flow</h2>
        <div className="glass-card diagram-wrapper">
          <div className="diagram-node user">
            <div className="node-icon">👤</div>
            <div>User Wallet</div>
          </div>
          <div className="diagram-arrow">➔</div>
          <div className="diagram-node vault">
            <div className="node-icon">🏦</div>
            <div>No-Loss Vault</div>
            <small>Aave V3 Staking</small>
          </div>
          <div className="diagram-arrow">➔</div>
          <div className="diagram-node agent">
            <div className="node-icon">🤖</div>
            <div>Scout Agent (TEE)</div>
            <small>okx-agentic-wallet</small>
          </div>
          <div className="diagram-arrow">➔</div>
          <div className="diagram-node mcp">
            <div className="node-icon">🛡️</div>
            <div>ScanGuard MCP</div>
            <small>x402 Pay-Per-Scan</small>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="landing-cta-bottom text-center">
        <div className="glass-card cta-card">
          <h2>Ready to speculation on World Cup 2026?</h2>
          <p>Join the next generation of security-gated DeFi. Stake stablecoins risk-free, earn credits, and delegate them to autonomous agents.</p>
          <div className="cta-buttons">
            <button className="btn btn-primary hover-glow" onClick={() => setActiveTab("pitchside")}>
              🏆 Open Pitchside AI
            </button>
            <button className="btn btn-ghost" onClick={() => setActiveTab("swap")}>
              🔄 Swap Tokens Safely
            </button>
          </div>
        </div>
      </section>

      <style>{`
        .landing-container {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 64px;
          padding: 0 16px;
          color: var(--text-primary);
        }

        /* Stadium Overlay Grid Effect */
        .pitch-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(ellipse at center, transparent 30%, var(--bg-primary) 90%),
            linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          z-index: -2;
          pointer-events: none;
          opacity: 0.65;
        }

        .stadium-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 800px;
          height: 600px;
          background: radial-gradient(circle, rgba(75, 123, 245, 0.1) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
        }

        /* Hero */
        .landing-hero {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 48px;
          gap: 24px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(75, 123, 245, 0.1);
          border: 1px solid rgba(75, 123, 245, 0.3);
          border-radius: var(--radius-full);
          padding: 6px 18px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--accent-blue);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .soccer-ball-emoji {
          display: inline-block;
          animation: spin 6s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hero-main-title {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.03em;
        }

        .glow-text {
          position: relative;
          text-shadow: 0 0 30px rgba(168, 85, 247, 0.35);
        }

        .hero-desc {
          font-size: 1.1rem;
          color: var(--text-secondary);
          max-width: 720px;
          line-height: 1.6;
        }

        .hero-ctas {
          display: flex;
          gap: 16px;
          margin-top: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }

        .btn-lg-cta {
          padding: 16px 36px;
          font-size: 1.05rem;
        }

        .hover-glow:hover {
          box-shadow: 0 0 25px rgba(75, 123, 245, 0.5);
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }

        .metric-card {
          padding: 24px;
          text-align: left;
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .metric-icon {
          font-size: 1.25rem;
        }

        .metric-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
        }

        .metric-value {
          font-size: 1.8rem;
          font-weight: 800;
        }

        /* Sections */
        .landing-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 24px;
        }

        .section-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .text-center {
          text-align: center;
        }

        /* How it works grid */
        .loop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .loop-card {
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .step-num {
          font-size: 2.2rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.05);
          line-height: 1;
        }

        .loop-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .loop-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Layout Split */
        .layout-split {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }

        .split-text {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-desc-para {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .security-features {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sec-feature {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .sec-icon {
          font-size: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        .sec-feature h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .sec-feature p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Terminal visual card */
        .terminal-visual {
          background: #060911 !important;
          border: 1px solid rgba(75, 123, 245, 0.15);
          padding: 0 !important;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .terminal-header {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border-default);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .term-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .term-dot.red { background: #ff5f56; }
        .term-dot.yellow { background: #ffbd2e; }
        .term-dot.green { background: #27c93f; }

        .term-title {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          margin-left: 8px;
        }

        .terminal-content {
          padding: 20px;
          font-size: 0.78rem;
          line-height: 1.7;
          text-align: left;
        }

        .term-line {
          margin-bottom: 6px;
        }

        .term-line.prompt { color: var(--text-secondary); }
        .term-line.success { color: var(--accent-safe); }
        .term-line.warning { color: #FFB020; }
        .term-line.danger { color: #FF3B5C; }

        /* Diagram style */
        .diagram-wrapper {
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 40px 20px;
          flex-wrap: wrap;
          gap: 20px;
        }

        .diagram-node {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          min-width: 160px;
        }

        .node-icon {
          font-size: 1.8rem;
        }

        .diagram-node div {
          font-size: 0.9rem;
          font-weight: 700;
          color: #fff;
        }

        .diagram-node small {
          font-size: 0.7rem;
          color: var(--text-tertiary);
        }

        .diagram-arrow {
          font-size: 1.5rem;
          color: var(--text-tertiary);
        }

        /* Bottom CTA */
        .cta-card {
          padding: 64px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-card h2 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .cta-card p {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 580px;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }

        @media (max-width: 900px) {
          .hero-main-title {
            font-size: 2.2rem;
          }
          .layout-split {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .diagram-arrow {
            transform: rotate(90deg);
            margin: 10px 0;
          }
          .diagram-wrapper {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .landing-container {
            gap: 48px;
          }
          .cta-card h2 {
            font-size: 1.6rem;
          }
          .cta-buttons {
            flex-direction: column;
            width: 100%;
          }
          .cta-buttons button {
            width: 100%;
          }
          .hero-ctas {
            flex-direction: column;
            width: 100%;
            padding: 0 20px;
          }
          .hero-ctas button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
