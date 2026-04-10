// ─── RiskReport Component ────────────────────────────────────────────────────
// Displays scan results with animated risk score, threat flags, and details.
// Slides in from the right after a scan completes.

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanResult, RiskFlag } from "../hooks/useScanGuard";

interface RiskReportProps {
  result: ScanResult | null;
  isVisible: boolean;
  onClose: () => void;
}

const RiskReport: React.FC<RiskReportProps> = ({ result, isVisible, onClose }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

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
              <h2 className="risk-report-title">Security Report</h2>
              <p className="risk-report-subtitle font-mono" style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>
                Scan #{result.scanId.slice(0, 8)} · {result.scanDurationMs}ms
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
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
              {getRiskEmoji(result.riskLevel)} {result.riskLevel}
            </motion.div>
          </div>

          {/* Token Info */}
          <div className="risk-token-info">
            <div className="risk-info-row">
              <span className="risk-info-label">Token</span>
              <span className="risk-info-value">{result.tokenName || "Unknown"} ({result.tokenSymbol || "???"})</span>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label">Contract</span>
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
              <span className="risk-info-label">Owner</span>
              <span className="risk-info-value font-mono" style={{ fontSize: "0.8rem" }}>
                {result.ownershipRenounced ? (
                  <span className="text-safe">✓ Renounced</span>
                ) : (
                  <span className="text-warning">{result.ownerAddress ? `${result.ownerAddress.slice(0, 8)}...` : "Unknown"}</span>
                )}
              </span>
            </div>
            <div className="risk-info-row">
              <span className="risk-info-label">Proxy</span>
              <span className={`risk-info-value ${result.hasProxyPattern ? "text-warning" : "text-safe"}`}>
                {result.hasProxyPattern ? "⚠ Upgradeable" : "✓ Not Upgradeable"}
              </span>
            </div>
          </div>

          {/* Flags */}
          {result.flags.length > 0 ? (
            <div className="risk-flags">
              <h3 className="risk-flags-title">
                ⚠ {result.flags.length} Threat{result.flags.length !== 1 ? "s" : ""} Detected
              </h3>
              <div className="risk-flags-list">
                {result.flags.map((flag, index) => (
                  <motion.div
                    key={index}
                    className="risk-flag-item"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + index * 0.1, duration: 0.3 }}
                  >
                    <div className="risk-flag-header">
                      <span className={`badge badge-${getSeverityBadge(flag.severity)}`}>
                        {flag.severity}
                      </span>
                      <span className="risk-flag-title">{flag.title}</span>
                    </div>
                    <p className="risk-flag-desc">{flag.description}</p>
                    {flag.evidence && (
                      <p className="risk-flag-evidence font-mono">{flag.evidence}</p>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <motion.div
              className="risk-all-clear"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              <span style={{ fontSize: "2rem" }}>✅</span>
              <p>No threats detected. Token appears safe for trading.</p>
            </motion.div>
          )}

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
    case "SAFE": return "#00FF88";
    case "LOW": return "#00FF88";
    case "MEDIUM": return "#FFB020";
    case "HIGH": return "#FF3B5C";
    case "CRITICAL": return "#FF1744";
    default: return "#4B7BF5";
  }
}

function getRiskGlow(level: string): string {
  switch (level) {
    case "SAFE": return "0 0 15px rgba(0, 255, 136, 0.3)";
    case "LOW": return "0 0 15px rgba(0, 255, 136, 0.2)";
    case "MEDIUM": return "0 0 15px rgba(255, 176, 32, 0.3)";
    case "HIGH": return "0 0 15px rgba(255, 59, 92, 0.3)";
    case "CRITICAL": return "0 0 20px rgba(255, 23, 68, 0.4)";
    default: return "none";
  }
}

function getRiskEmoji(level: string): string {
  switch (level) {
    case "SAFE": return "✅";
    case "LOW": return "🟡";
    case "MEDIUM": return "🟠";
    case "HIGH": return "🔴";
    case "CRITICAL": return "🚨";
    default: return "❓";
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
