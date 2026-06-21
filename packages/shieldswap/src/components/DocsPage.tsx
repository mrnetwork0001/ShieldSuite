import React, { useState } from "react";
import { BookIcon, ShieldIcon, CardIcon, SwapIcon, AnchorIcon, CopyIcon, CheckIcon, TrophyIcon, IdeaIcon, GreenDotIcon, MessageIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";

interface DocsPageProps {
  setActiveTab: (tab: "home" | "docs" | "swap" | "pitchside") => void;
}

type SectionId = "overview" | "scanguard" | "x402" | "shieldswap" | "pitchside" | "contracts";

export const DocsPage: React.FC<DocsPageProps> = ({ setActiveTab }) => {
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => {
      setCopiedText(null);
    }, 2000);
  };

  const sections = [
    { id: "overview" as const, title: <><BookIcon /> {t("docs_sec_overview_title")}</>, label: t("docs_sec_overview_label") },
    { id: "scanguard" as const, title: <><ShieldIcon /> {t("docs_sec_scanguard_title")}</>, label: t("docs_sec_scanguard_label") },
    { id: "x402" as const, title: <><CardIcon /> {t("docs_sec_x402_title")}</>, label: t("docs_sec_x402_label") },
    { id: "shieldswap" as const, title: <><SwapIcon /> {t("docs_sec_shieldswap_title")}</>, label: t("docs_sec_shieldswap_label") },
    { id: "pitchside" as const, title: <><span style={{ marginRight: "6px" }}>⚽</span> {t("docs_sec_pitchside_title")}</>, label: t("docs_sec_pitchside_label") },
    { id: "contracts" as const, title: <><AnchorIcon /> {t("docs_sec_contracts_title")}</>, label: t("docs_sec_contracts_label") },
  ];

  const mainnetContracts = [
    { name: "USDT Token", address: "0x779Ded0c9e1022225f8E0630b35a9b54bE713736" },
    { name: "NoLossVault", address: "0x758ec85fc3047afff7977ec6edab43d21e9538ac" },
    { name: "PlayerShares ERC-1155", address: "0xb1cc05dc0a0b70fabc6bbb1b3043ba386c86d7e1" },
    { name: "PlayerDex AMM", address: "0xeacae6d1031194f2681b07cbcd50ee0f9c88aeee" },
    { name: "TEE Agent Wallet", address: "0xDAce8445a5bD576111cCC8e598B67965252023C2" },
  ];

  const lifecycleSteps = [
    { step: "01", title: t("docs_x402_step1_title"), desc: t("docs_x402_step1_desc") },
    { step: "02", title: t("docs_x402_step2_title"), desc: t("docs_x402_step2_desc") },
    { step: "03", title: t("docs_x402_step3_title"), desc: t("docs_x402_step3_desc") },
    { step: "04", title: t("docs_x402_step4_title"), desc: t("docs_x402_step4_desc") },
    { step: "05", title: t("docs_x402_step5_title"), desc: t("docs_x402_step5_desc") },
  ];

  const loopSteps = [
    { step: 1, title: t("docs_ps_step1_title"), desc: t("docs_ps_step1_desc") },
    { step: 2, title: t("docs_ps_step2_title"), desc: t("docs_ps_step2_desc") },
    { step: 3, title: t("docs_ps_step3_title"), desc: t("docs_ps_step3_desc") },
    { step: 4, title: t("docs_ps_step4_title"), desc: t("docs_ps_step4_desc") },
  ];

  const renderCopyButton = (address: string) => {
    const isCopied = copiedText === address;
    return (
      <button
        onClick={() => handleCopy(address)}
        className={`copy-btn font-mono ${isCopied ? "copied" : ""}`}
      >
        {isCopied ? <><CheckIcon size={12} /> {t("docs_copied")}</> : <><CopyIcon size={12} style={{ marginRight: "6px" }} /> {t("docs_copy")}</>}
      </button>
    );
  };

  return (
    <div className="docs-wrapper">
      {/* Stadium Glow Backdrop (Moved out of grid) */}
      <div className="stadium-glow" style={{ opacity: 0.35 }} />

      <div className="docs-container">
        <aside className="docs-sidebar">
          <h3 className="sidebar-title font-mono">{t("docs_sidebar_title")}</h3>
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
            <h4>{t("docs_cta_launch")}</h4>
            <p>{t("docs_cta_desc")}</p>
            <div className="sidebar-cta-btns">
              <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("pitchside")}>
                <TrophyIcon /> {t("docs_cta_pitchside")}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setActiveTab("swap")}>
                <SwapIcon /> {t("docs_cta_swap")}
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
                  <h1 className="docs-section-title">{t("docs_ov_title")}</h1>
                  <p className="docs-para" dangerouslySetInnerHTML={{ __html: t("docs_ov_desc") }} />

                  <div className="features-grid">
                    <div className="glass-card feature-box-card">
                      <div className="feature-box-icon"><ShieldIcon size={24} style={{ marginRight: 0 }} /></div>
                      <h3>{t("docs_ov_feat1_title")}</h3>
                      <p>{t("docs_ov_feat1_desc")}</p>
                    </div>

                    <div className="glass-card feature-box-card">
                      <div className="feature-box-icon">⚽</div>
                      <h3>{t("docs_ov_feat2_title")}</h3>
                      <p>{t("docs_ov_feat2_desc")}</p>
                    </div>
                  </div>

                  <div className="glass-card docs-info-box">
                    <h4><IdeaIcon /> {t("docs_ov_info_title")}</h4>
                    <p>{t("docs_ov_info_desc")}</p>
                  </div>
                </>
              )}

              {activeSection === "scanguard" && (
                <>
                  <h1 className="docs-section-title"><ShieldIcon size={28} /> {t("docs_sg_title")}</h1>
                  <p className="docs-para">{t("docs_sg_desc")}</p>
                  <h3>{t("docs_sg_table_title")}</h3>
                  <div className="docs-table-wrapper">
                    <table className="docs-table">
                      <thead>
                        <tr>
                          <th>{t("docs_sg_th_name")}</th>
                          <th>{t("docs_sg_th_method")}</th>
                          <th>{t("docs_sg_th_severity")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>{t("docs_sg_row_eoa_name")}</strong></td>
                          <td>{t("docs_sg_row_eoa_method")}</td>
                          <td className="text-danger font-mono">CRITICAL (100)</td>
                        </tr>
                        <tr>
                          <td><strong>{t("docs_sg_row_hp_name")}</strong></td>
                          <td>{t("docs_sg_row_hp_method")}</td>
                          <td className="text-danger font-mono">CRITICAL (100)</td>
                        </tr>
                        <tr>
                          <td><strong>{t("docs_sg_row_proxy_name")}</strong></td>
                          <td>{t("docs_sg_row_proxy_method")}</td>
                          <td className="text-warning font-mono">MEDIUM (50)</td>
                        </tr>
                        <tr>
                          <td><strong>{t("docs_sg_row_bl_name")}</strong></td>
                          <td>{t("docs_sg_row_bl_method")}</td>
                          <td className="text-danger font-mono">HIGH (80)</td>
                        </tr>
                        <tr>
                          <td><strong>{t("docs_sg_row_tax_name")}</strong></td>
                          <td>{t("docs_sg_row_tax_method")}</td>
                          <td className="text-warning font-mono">MEDIUM (60)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <h3>{t("docs_sg_json_title")}</h3>
                  <pre className="docs-code font-mono">
                    <span style={{ color: "#f8f8f2" }}>{"{"}</span>{"\n"}
                    <span style={{ color: "#f92672" }}>  "success"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#ae81ff" }}>true</span><span style={{ color: "#f8f8f2" }}>,</span>{"\n"}
                    <span style={{ color: "#f92672" }}>  "data"</span><span style={{ color: "#f8f8f2" }}>: {"{"}</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "tokenAddress"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#e6db74" }}>"0x779ded0c9e1022225f8e0630b35a9b54be713736"</span><span style={{ color: "#f8f8f2" }}>,</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "riskScore"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#ae81ff" }}>12</span><span style={{ color: "#f8f8f2" }}>,</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "riskLevel"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#e6db74" }}>"SAFE"</span><span style={{ color: "#f8f8f2" }}>,</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "flags"</span><span style={{ color: "#f8f8f2" }}>: [],</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "bytecode"</span><span style={{ color: "#f8f8f2" }}>: {"{"} </span><span style={{ color: "#f92672" }}>"isProxy"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#ae81ff" }}>false</span><span style={{ color: "#f8f8f2" }}>, </span><span style={{ color: "#f92672" }}>"hasTax"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#ae81ff" }}>false</span><span style={{ color: "#f8f8f2" }}> {"}"},</span>{"\n"}
                    <span style={{ color: "#f92672" }}>    "scanDurationMs"</span><span style={{ color: "#f8f8f2" }}>: </span><span style={{ color: "#ae81ff" }}>28</span>{"\n"}
                    <span style={{ color: "#f8f8f2" }}>  {"}"}</span>{"\n"}
                    <span style={{ color: "#f8f8f2" }}>{"}"}</span>
                  </pre>
                </>
              )}

              {activeSection === "x402" && (
                <>
                  <h1 className="docs-section-title"><CardIcon size={28} /> {t("docs_x402_title")}</h1>
                  <p className="docs-para" dangerouslySetInnerHTML={{ __html: t("docs_x402_desc") }} />
                  <div className="glass-card docs-info-box border-purple">
                    <h4><IdeaIcon /> {t("docs_x402_info_title")}</h4>
                    <p>{t("docs_x402_info_desc")}</p>
                  </div>

                  <h3>{t("docs_x402_flow_title")}</h3>
                  <div className="lifecycle-flow">
                    {lifecycleSteps.map((item) => (
                      <div key={item.step} className="flow-card glass-card">
                        <div className="flow-step font-mono">{item.step}</div>
                        <h4>{item.title}</h4>
                        <p>{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {activeSection === "shieldswap" && (
                <>
                  <h1 className="docs-section-title"><SwapIcon size={28} /> {t("docs_ss_title")}</h1>
                  <p className="docs-para" dangerouslySetInnerHTML={{ __html: t("docs_ss_desc") }} />
                  <h3>{t("docs_ss_interceptor_title")}</h3>
                  <p className="docs-para" dangerouslySetInnerHTML={{ __html: t("docs_ss_interceptor_desc") }} />
                  <div className="glass-card docs-info-box">
                    <h4><MessageIcon /> {t("docs_ss_chat_title")}</h4>
                    <p dangerouslySetInnerHTML={{ __html: t("docs_ss_chat_desc") }} />
                  </div>
                </>
              )}

              {activeSection === "pitchside" && (
                <>
                  <h1 className="docs-section-title">{t("docs_ps_title")}</h1>
                  <p className="docs-para">{t("docs_ps_desc")}</p>

                  <div className="pitchside-loop-steps">
                    {loopSteps.map((item) => (
                      <div key={item.step} className="loop-step glass-card">
                        <div className="loop-step-header">
                          <span className="step-badge">{item.step}</span>
                          <h5>{item.title}</h5>
                        </div>
                        <p dangerouslySetInnerHTML={{ __html: item.desc }} />
                      </div>
                    ))}
                  </div>

                  <div className="glass-card docs-info-box" style={{ marginTop: '24px', border: '1px solid rgba(75, 123, 245, 0.3)', background: 'rgba(75, 123, 245, 0.03)' }}>
                    <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 8px 0', color: '#fff' }}>
                      <span style={{ fontSize: '1.2rem' }}>📡</span> {t("docs_ps_live_title")}
                    </h4>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', lineHeight: '1.4' }} dangerouslySetInnerHTML={{ __html: t("docs_ps_live_desc1") }} />
                    <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.4', color: 'var(--text-secondary)' }} dangerouslySetInnerHTML={{ __html: t("docs_ps_live_desc2") }} />
                  </div>
                </>
              )}

              {activeSection === "contracts" && (
                <>
                  <h1 className="docs-section-title"><AnchorIcon size={28} /> {t("docs_dep_title")}</h1>
                  <p className="docs-para">
                    {t("docs_dep_desc")}
                  </p>

                  <div className="contracts-grid" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="contracts-card glass-card">
                      <h3><GreenDotIcon /> {t("docs_dep_network")}</h3>
                      <div className="contracts-list">
                        {mainnetContracts.map((c) => (
                          <div key={c.name} className="contract-item">
                            <div className="contract-label">{c.name}</div>
                            <div className="contract-address-row">
                              <span className="contract-address font-mono">{c.address}</span>
                              {renderCopyButton(c.address)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <style>{`
        .docs-wrapper {
          position: relative;
          width: 100%;
          min-height: 80vh;
        }

        .stadium-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 900px;
          height: 600px;
          background: radial-gradient(circle, rgba(75, 123, 245, 0.12) 0%, transparent 70%);
          z-index: 0;
          pointer-events: none;
        }

        .docs-container {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 40px;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 16px;
          color: var(--text-primary);
          position: relative;
          z-index: 2;
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
          margin: 0;
        }

        .sidebar-cta p {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
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
          margin: 0;
        }

        .docs-para {
          font-size: 0.95rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0;
        }

        .features-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .feature-box-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .feature-box-icon {
          font-size: 1.8rem;
        }

        .feature-box-card h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .feature-box-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
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
          margin: 0;
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
          margin: 12px 0 0 0;
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
          overflow-x: auto;
          white-space: pre-wrap;
          word-break: break-all;
          margin: 0;
        }

        /* Lifecycle Flow Cards */
        .lifecycle-flow {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .flow-card {
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 20px;
          position: relative;
        }

        .flow-step {
          font-size: 1.5rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.05);
          width: 40px;
          flex-shrink: 0;
        }

        .flow-card h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
          width: 120px;
          flex-shrink: 0;
        }

        .flow-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          flex: 1;
        }

        /* Loop Steps */
        .pitchside-loop-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .loop-step {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .loop-step-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .step-badge {
          background: rgba(75, 123, 245, 0.1);
          border: 1px solid rgba(75, 123, 245, 0.3);
          color: var(--accent-blue);
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.75rem;
          font-weight: 700;
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

        /* Contracts grid & copy button */
        .contracts-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        .contracts-card {
          padding: 24px;
        }

        .contracts-card h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin: 0 0 16px 0;
        }

        .contracts-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .contract-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.005);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
        }

        .contract-label {
          font-size: 0.75rem;
          color: var(--text-tertiary);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .contract-address-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .contract-address {
          font-size: 0.82rem;
          color: var(--text-secondary);
          word-break: break-all;
        }

        .copy-btn {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .copy-btn:hover {
          color: #fff;
          border-color: var(--border-hover);
          background: rgba(255, 255, 255, 0.05);
        }

        .copy-btn.copied {
          color: var(--accent-safe);
          border-color: var(--accent-safe);
          background: rgba(39, 201, 63, 0.05);
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
          .features-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
