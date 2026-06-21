// ─── RiskReport Component ────────────────────────────────────────────────────
// Displays scan results with animated risk score, threat flags, and details.
// Slides in from the right after a scan completes.

import React, { useEffect, useState } from "react";
import { CrossIcon, CheckIcon, WarningIcon, RobotIcon, WarningOctagonIcon, QuestionIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { ScanResult, RiskFlag } from "../hooks/useScanGuard";
import { useLanguage } from "../context/LanguageContext";

interface RiskReportProps {
  result: ScanResult | null;
  isVisible: boolean;
  onClose: () => void;
}

const RiskReport: React.FC<RiskReportProps> = ({ result, isVisible, onClose }) => {
  const { language, t } = useLanguage();
  const [animatedScore, setAnimatedScore] = useState(0);

  // Helper for translating risk levels
  const getTranslatedRiskLevel = (level: string) => {
    switch (level) {
      case "SAFE": return language === "zh" ? "安全" : "SAFE";
      case "LOW": return language === "zh" ? "低风险" : "LOW";
      case "MEDIUM": return language === "zh" ? "中等风险" : "MEDIUM";
      case "HIGH": return language === "zh" ? "高风险" : "HIGH";
      case "CRITICAL": return language === "zh" ? "严重风险" : "CRITICAL";
      default: return level;
    }
  };

  // Helper for translating dynamic ScanGuard flags
  const getTranslatedFlag = (title: string, description: string) => {
    if (language === "zh") {
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes("honeypot")) {
        return { title: t("rr_flag_honeypot"), description: t("rr_flag_honeypot_desc") };
      }
      if (lowerTitle.includes("tax")) {
        return { title: t("rr_flag_tax"), description: t("rr_flag_tax_desc") };
      }
      if (lowerTitle.includes("proxy")) {
        return { title: t("rr_flag_proxy"), description: t("rr_flag_proxy_desc") };
      }
      if (lowerTitle.includes("mint")) {
        return { title: t("rr_flag_mint"), description: t("rr_flag_mint_desc") };
      }
      if (lowerTitle.includes("black")) {
        return { title: t("rr_flag_blacklist"), description: t("rr_flag_blacklist_desc") };
      }
    }
    return { title, description };
  };

  // Animate risk score counting up
  useEffect(() => {
    if (!result) {
      setAnimatedScore(0);
      return;
    }

    const target = result.riskScore;
    const duration = 1200;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [result]);

  if (!result) return null;

  const riskColor = getRiskColor(result.riskLevel);
  const riskGlow = getRiskGlow(result.riskLevel);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="risk-report glass-card"
          initial={{ x: 80, opacity: 0, scale: 0.95 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: 80, opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Header */}
          <div className="risk-report-header">
            <div>
              <h2 className="risk-report-title">{language === "zh" ? "安全报告" : "Security Report"}</h2>
              <p className="risk-report-subtitle font-mono" style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                {language === "zh" ? `扫描 #${result.scanId.slice(0, 8)} · ${result.scanDurationMs}毫秒` : `Scan #${result.scanId.slice(0, 8)} · ${result.scanDurationMs}ms`}
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}><CrossIcon size={14} /></button>
          </div>

          {/* Risk Score Circle */}
          <div className="risk-score-section">
            <div className="risk-score-ring" style={{ "--risk-color": riskColor, "--risk-glow": riskGlow } as React.CSSProperties}>
              <svg viewBox="0 0 120 120" className="risk-score-svg">
                <circle cx="60" cy="60" r="52" className="ring-bg" />
                <motion.circle
                  cx="60" cy="60" r="52"
                  className="ring-progress"
                  style={{ stroke: riskColor }}
                  strokeDasharray={`${(animatedScore / 100) * 327} 327`}
                  initial={{ strokeDasharray: "0 327" }}
                  animate={{ strokeDasharray: `${(result.riskScore / 100) * 327} 327` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                />
              </svg>
              <div className="risk-score-value">
                <span className="risk-score-number font-mono" style={{ color: riskColor }}>
                  {animatedScore}
                </span>
                <span className="risk-score-label">/ 100</span>
              </div>
            </div>
            <motion.div
              className="risk-level-badge"
              style={{ background: riskColor, color: result.riskLevel === "SAFE" ? "#0A0E17" : "#fff" }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 25 }}
            >
              {getRiskIcon(result.riskLevel)} {getTranslatedRiskLevel(result.riskLevel)}
            </motion.div>
          </div>

          {/* Token Info */}
          <div className="risk-token-info">
            <div className="risk-info-row">
              <span className="risk-info-label">{language === "zh" ? "代币" : "Token"}</span>
              <span className="risk-info-value">{result.tokenName || (language === "zh" ? "未知" : "Unknown")} ({result.tokenSymbol || "???"})</span>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label">{language === "zh" ? "合约" : "Contract"}</span>
              <a
                className="risk-info-value font-mono risk-link"
                href={result.xLayerExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "0.75rem" }}
              >
                {result.tokenAddress.slice(0, 10)}...{result.tokenAddress.slice(-8)}
              </a>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label">{language === "zh" ? "所有者" : "Owner"}</span>
              <span className="risk-info-value font-mono" style={{ fontSize: "0.8rem" }}>
                {result.ownershipRenounced ? (
                  <span className="text-safe"><CheckIcon size={12} /> {language === "zh" ? "已放弃" : "Renounced"}</span>
                ) : (
                  <span className="text-warning">{result.ownerAddress ? `${result.ownerAddress.slice(0, 8)}...` : (language === "zh" ? "未知" : "Unknown")}</span>
                )}
              </span>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label">{language === "zh" ? "代理" : "Proxy"}</span>
              <span className={`risk-info-value ${result.hasProxyPattern ? "text-warning" : "text-safe"}`}>
                {result.hasProxyPattern ? <><WarningIcon size={12} /> {language === "zh" ? "可升级" : "Upgradeable"}</> : <><CheckIcon size={12} /> {language === "zh" ? "不可升级" : "Not Upgradeable"}</>}
              </span>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#FF007A', fontWeight: 700, fontSize: '0.7rem' }}>◆</span> Uniswap V3
              </span>
              <span className={`risk-info-value ${result.uniswapHasPool ? "text-safe" : "text-tertiary"}`}>
                {result.uniswapHasPool
                  ? <><CheckIcon size={12} /> {language === "zh" ? `${result.uniswapPoolCount} 个资金池` : `${result.uniswapPoolCount} Pool${(result.uniswapPoolCount || 0) !== 1 ? 's' : ''}`}</>
                  : (language === "zh" ? "未找到资金池" : "No pools found")
                }
              </span>
            </div>
          </div>

          {/* Flags */}
          {result.flags.length > 0 ? (
            <div className="risk-flags">
              <h3 className="risk-flags-title" style={{
                color: result.riskLevel === "SAFE" || result.riskLevel === "LOW"
                  ? "var(--accent-safe)"
                  : "var(--accent-danger)"
              }}>
                {result.riskLevel === "SAFE" || result.riskLevel === "LOW"
                  ? <><CheckIcon size={12} /> {language === "zh" ? `${result.flags.length} 项评估结果` : `${result.flags.length} Finding${result.flags.length !== 1 ? "s" : ""}`}</>
                  : <><WarningIcon size={12} /> {language === "zh" ? `检测到 ${result.flags.length} 项安全威胁` : `${result.flags.length} Threat${result.flags.length !== 1 ? "s" : ""} Detected`}</>}
              </h3>
              <div className="risk-flags-list">
                {result.flags.map((flag, index) => {
                  const translated = getTranslatedFlag(flag.title, flag.description);
                  return (
                    <motion.div
                      key={index}
                      className="risk-flag-item"
                      style={flag.severity === "SAFE" ? {
                        background: "rgba(51, 255, 0, 0.04)",
                        borderColor: "rgba(51, 255, 0, 0.1)",
                      } : undefined}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                    >
                      <div className="risk-flag-header">
                        <span className={`badge badge-${getSeverityBadge(flag.severity)} font-mono`}>
                          {getTranslatedRiskLevel(flag.severity)}
                        </span>
                        <span className="risk-flag-title">{translated.title}</span>
                      </div>
                      <p className="risk-flag-desc">{translated.description}</p>
                      {flag.evidence && (
                        <p className="risk-flag-evidence font-mono">{flag.evidence}</p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <motion.div
              className="risk-all-clear"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <CheckIcon size={32} style={{ color: "var(--accent-safe)", marginBottom: "8px" }} />
              <p>{language === "zh" ? "未检测到任何安全威胁。代币交易状态安全。" : "No threats detected. Token appears safe for trading."}</p>
            </motion.div>
          )}

          {/* Agent Recommendation */}
          <motion.div
            className="agent-recommendation"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            <div className="agent-rec-header">
              <RobotIcon size={18} style={{ color: "var(--accent-safe)" }} />
              <span className="font-mono" style={{ fontWeight: 600, fontSize: '0.75rem', color: 'var(--accent-safe)' }}>
                {language === "zh" ? "特工建议" : "AGENT RECOMMENDATION"}
              </span>
            </div>
            <p className="agent-rec-text">
              {result.riskLevel === "SAFE" || result.riskLevel === "LOW" ? (
                language === "zh" ? (
                  <>该代币看起来<strong style={{ color: 'var(--accent-safe)' }}>可以安全交易</strong>。{result.uniswapHasPool ? `检测到已验证的 Uniswap V3 流动性（${result.uniswapPoolCount} 个资金池）。` : ''}推荐路径：使用 <strong>OKX DEX 聚合器</strong> 以获得最佳交易执行。</>
                ) : (
                  <>Token appears <strong style={{ color: 'var(--accent-safe)' }}>safe for trading</strong>. {result.uniswapHasPool ? `Verified Uniswap V3 liquidity detected (${result.uniswapPoolCount} pool${(result.uniswapPoolCount || 0) !== 1 ? 's' : ''}). ` : ''}Recommended route: <strong>OKX DEX Aggregator</strong> for best execution.</>
                )
              ) : result.riskLevel === "MEDIUM" ? (
                language === "zh" ? (
                  <>请<strong style={{ color: 'var(--accent-warning)' }}>谨慎交易</strong>。检测到一些风险指标。在大额交易前，建议先用小额资金进行测试。</>
                ) : (
                  <>Proceed with <strong style={{ color: 'var(--accent-warning)' }}>caution</strong>. Some risk indicators detected. Use small amounts to test before larger trades.</>
                )
              ) : (
                language === "zh" ? (
                  <><strong style={{ color: 'var(--accent-danger)' }}>不建议交易。</strong>检测到高危安全威胁。该代币可能是骗局或蜜罐。</>
                ) : (
                  <><strong style={{ color: 'var(--accent-danger)' }}>Trading not recommended.</strong> High-severity threats detected. This token may be a scam or honeypot.</>
                )
              )}
            </p>
            <div className="agent-rec-skills font-mono" style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '6px' }}>
              {language === "zh" ? "技术支持：OKX 安全认证 · 字节码分析 · Uniswap V3 · x402" : "Powered by: OKX Security · Bytecode Analysis · Uniswap V3 · x402"}
            </div>
          </motion.div>

          <style>{`
            .risk-report {
              width: 400px;
              max-height: calc(100vh - 140px);
              overflow-y: auto;
              padding: 24px;
              display: flex;
              flex-direction: column;
              gap: 20px;
            }

            .risk-report-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
            }

            .risk-report-title {
              font-size: 1.1rem;
              font-weight: 700;
              color: var(--text-primary);
            }

            .risk-score-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 12px;
              padding: 8px 0;
            }

            .risk-score-ring {
              position: relative;
              width: 120px;
              height: 120px;
              filter: drop-shadow(var(--risk-glow));
            }

            .risk-score-svg {
              width: 100%;
              height: 100%;
              transform: rotate(-90deg);
            }

            .ring-bg {
              fill: none;
              stroke: var(--border-default);
              stroke-width: 6;
            }

            .ring-progress {
              fill: none;
              stroke-width: 6;
              stroke-linecap: round;
              transition: stroke-dasharray 1.2s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .risk-score-value {
              position: absolute;
              inset: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }

            .risk-score-number {
              font-size: 2rem;
              font-weight: 800;
              line-height: 1;
            }

            .risk-score-label {
              font-size: 0.7rem;
              color: var(--text-tertiary);
              margin-top: 2px;
            }

            .risk-level-badge {
              padding: 6px 20px;
              border-radius: var(--radius-full);
              font-size: 0.8rem;
              font-weight: 700;
              letter-spacing: 0.1em;
              text-transform: uppercase;
            }

            .risk-token-info {
              display: flex;
              flex-direction: column;
              gap: 8px;
              padding: 16px;
              background: rgba(0, 0, 0, 0.2);
              border-radius: var(--radius-md);
            }

            .risk-info-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .risk-info-label {
              font-size: 0.8rem;
              color: var(--text-tertiary);
            }

            .risk-info-value {
              font-size: 0.85rem;
              color: var(--text-primary);
            }

            .risk-link {
              color: var(--accent-blue);
              text-decoration: none;
            }

            .risk-link:hover {
              text-decoration: underline;
            }

            .risk-flags-title {
              font-size: 0.9rem;
              font-weight: 600;
              color: var(--accent-danger);
              margin-bottom: 8px;
            }

            .risk-flags-list {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .risk-flag-item {
              padding: 12px;
              background: rgba(255, 59, 92, 0.04);
              border: 1px solid rgba(255, 59, 92, 0.1);
              border-radius: var(--radius-md);
              display: flex;
              flex-direction: column;
              gap: 6px;
            }

            .risk-flag-header {
              display: flex;
              align-items: center;
              gap: 8px;
            }

            .risk-flag-title {
              font-size: 0.85rem;
              font-weight: 600;
              color: var(--text-primary);
            }

            .risk-flag-desc {
              font-size: 0.78rem;
              color: var(--text-secondary);
              line-height: 1.5;
            }

            .risk-flag-evidence {
              font-size: 0.7rem;
              color: var(--text-tertiary);
              padding: 6px 10px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: var(--radius-sm);
              word-break: break-all;
            }

            .risk-all-clear {
              text-align: center;
              padding: 24px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
              color: var(--accent-safe);
              font-weight: 500;
            }

            .agent-recommendation {
              padding: 14px 16px;
              background: linear-gradient(135deg, rgba(51,255,0,0.04) 0%, rgba(75,123,245,0.04) 100%);
              border: 1px solid rgba(51,255,0,0.12);
              border-radius: var(--radius-md);
            }

            .agent-rec-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 8px;
            }

            .agent-rec-text {
              font-size: 0.8rem;
              color: var(--text-secondary);
              line-height: 1.6;
            }

            @media (max-width: 900px) {
              .risk-report {
                width: 100%;
                max-width: 480px;
                max-height: 500px;
              }
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskColor(level: string): string {
  switch (level) {
    case "SAFE": return "#33ff00";
    case "LOW": return "#33ff00";
    case "MEDIUM": return "#ffb000";
    case "HIGH": return "#FF3B5C";
    case "CRITICAL": return "#FF1744";
    default: return "#4B7BF5";
  }
}

function getRiskGlow(level: string): string {
  switch (level) {
    case "SAFE": return "0 0 15px rgba(51, 255, 0, 0.3)";
    case "LOW": return "0 0 15px rgba(51, 255, 0, 0.2)";
    case "MEDIUM": return "0 0 15px rgba(255, 176, 0, 0.3)";
    case "HIGH": return "0 0 15px rgba(255, 59, 92, 0.3)";
    case "CRITICAL": return "0 0 20px rgba(255, 23, 68, 0.4)";
    default: return "none";
  }
}

function getRiskIcon(level: string): React.ReactNode {
  switch (level) {
    case "SAFE": return <CheckIcon size={14} style={{ marginRight: "4px" }} />;
    case "LOW": return <WarningIcon size={14} style={{ marginRight: "4px", color: "#33ff00" }} />;
    case "MEDIUM": return <WarningIcon size={14} style={{ marginRight: "4px", color: "#ffb000" }} />;
    case "HIGH": return <WarningOctagonIcon size={14} style={{ marginRight: "4px", color: "#FF3B5C" }} />;
    case "CRITICAL": return <WarningOctagonIcon size={14} style={{ marginRight: "4px", color: "#FF1744" }} />;
    default: return <QuestionIcon size={14} style={{ marginRight: "4px" }} />;
  }
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case "SAFE": return "safe";
    case "LOW": return "info";
    case "MEDIUM": return "warning";
    case "HIGH": return "danger";
    case "CRITICAL": return "danger";
    default: return "info";
  }
}

export default RiskReport;
