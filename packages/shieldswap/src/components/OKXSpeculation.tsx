import React, { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import { ethers } from "ethers";

interface OKXSpeculationProps {
  wallet: any;
  onActivityLog?: (log: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

interface SpeculationPool {
  id: string;
  titleEn: string;
  titleZh: string;
  metricEn: string;
  metricZh: string;
  suffix: string;
  currentValue: number;
  poolSize: number;
  participants: number;
  timeLeftEn: string;
  timeLeftZh: string;
  unit: string;
  historyData: number[];
}

interface PredictionHistoryItem {
  id: string;
  timestamp: number;
  poolTitleEn: string;
  poolTitleZh: string;
  guess: string;
  wager: number;
  txHash: string;
  status: "active" | "won" | "lost";
  payout?: number;
  unit: string;
}

export const OKXSpeculation: React.FC<OKXSpeculationProps> = ({ wallet, onActivityLog }) => {
  const { language } = useLanguage();
  const tLocal = (en: string, zh: string) => (language === "zh" ? zh : en);

  // 1. Initial State for Speculation Pools
  const pools: SpeculationPool[] = [
    {
      id: "okb-volume",
      titleEn: "OKB 24-Hour Trading Volume",
      titleZh: "OKB 24小时交易量预测",
      metricEn: "Predict the total 24h trading volume of OKB",
      metricZh: "预测OKB代币的24小时总交易量",
      suffix: "$",
      currentValue: 42850900,
      poolSize: 32500,
      participants: 84,
      timeLeftEn: "12 hours 45 mins",
      timeLeftZh: "12 小时 45 分钟",
      unit: "USD",
      historyData: [41500000, 42100000, 40800000, 43200000, 42600000, 42850900],
    },
    {
      id: "xlayer-gas",
      titleEn: "X Layer Daily Gas Burnt",
      titleZh: "X Layer 每日Gas燃烧量预测",
      metricEn: "Predict the daily aggregate gas burnt on X Layer",
      metricZh: "预测X Layer公链单日累计消耗的Gas总量",
      suffix: " OKB",
      currentValue: 184.25,
      poolSize: 18900,
      participants: 49,
      timeLeftEn: "16 hours 10 mins",
      timeLeftZh: "16 小时 10 分钟",
      unit: "OKB",
      historyData: [165.2, 172.8, 191.4, 180.1, 188.5, 184.25],
    },
    {
      id: "xlayer-wallets",
      titleEn: "X Layer Active Wallets (24h)",
      titleZh: "X Layer 24h活跃地址数预测",
      metricEn: "Predict daily active wallets on X Layer",
      metricZh: "预测X Layer公链24小时内发生交易的活跃地址数",
      suffix: "",
      currentValue: 24890,
      poolSize: 45200,
      participants: 132,
      timeLeftEn: "6 hours 12 mins",
      timeLeftZh: "6 小时 12 分钟",
      unit: "Wallets",
      historyData: [22100, 23500, 24100, 23900, 25200, 24890],
    },
  ];

  const [selectedPool, setSelectedPool] = useState<SpeculationPool>(pools[0]);
  const [predictionValue, setPredictionValue] = useState("");
  const [wagerAmount, setWagerAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [psaiBalance, setPsaiBalance] = useState("10,000.00");
  const [isApproved, setIsApproved] = useState(false);
  
  // Stats
  const [totalBurned, setTotalBurned] = useState(9040);
  const [totalSpeculated, setTotalSpeculated] = useState(45200);

  // Success Modal State
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    poolTitle: string;
    guess: string;
    wager: string;
    txHash: string;
    burnAmount: string;
  }>({
    visible: false,
    poolTitle: "",
    guess: "",
    wager: "",
    txHash: "",
    burnAmount: "",
  });

  // History State
  const [history, setHistory] = useState<PredictionHistoryItem[]>([
    {
      id: "hist-1",
      timestamp: Date.now() - 28 * 3600 * 1000,
      poolTitleEn: "OKB 24-Hour Trading Volume",
      poolTitleZh: "OKB 24小时交易量预测",
      guess: "41,200,000",
      wager: 500,
      txHash: "0x3a92ee57c4f4a3875323be01b3deef457635c02d",
      status: "won",
      payout: 1250,
      unit: "USD",
    },
    {
      id: "hist-2",
      timestamp: Date.now() - 52 * 3600 * 1000,
      poolTitleEn: "X Layer Daily Gas Burnt",
      poolTitleZh: "X Layer 每日Gas燃烧量预测",
      guess: "195.5",
      wager: 200,
      txHash: "0x7fd14e963c10a3875be25c50ee0c3c19e763dfc8",
      status: "lost",
      payout: 0,
      unit: "OKB",
    },
  ]);

  // Quick Bet Options
  const quickBets = ["100", "500", "1000", "5000"];

  const addLog = (message: string, type: "info" | "warning" = "info") => {
    if (onActivityLog) {
      onActivityLog({
        id: `${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type,
        message,
      });
    }
  };

  const handleApprove = () => {
    if (!wagerAmount || parseFloat(wagerAmount) <= 0) {
      alert(tLocal("Please enter a valid wager amount.", "请输入有效的投注金额。"));
      return;
    }
    setLoading(true);
    addLog(tLocal(`Approving ${wagerAmount} $PSAI spending limit for OKX Speculation Contract...`, `正在批准 OKX 预测合约的 ${wagerAmount} $PSAI 支出额度...`));
    
    setTimeout(() => {
      setLoading(false);
      setIsApproved(true);
      addLog(tLocal(`$PSAI approved successfully. ready to place prediction.`, `$PSAI 批准成功。已准备好提交预测。`));
    }, 1500);
  };

  const handleSubmitPrediction = () => {
    if (!predictionValue || parseFloat(predictionValue) <= 0) {
      alert(tLocal("Please enter your prediction guess.", "请输入您的预测目标值。"));
      return;
    }
    if (!wagerAmount || parseFloat(wagerAmount) <= 0) {
      alert(tLocal("Please enter a valid wager amount.", "请输入有效的投注金额。"));
      return;
    }

    setLoading(true);
    addLog(
      tLocal(
        `Submitting prediction of ${predictionValue} ${selectedPool.unit} with wager ${wagerAmount} $PSAI...`,
        `正在提交预测值 ${predictionValue} ${selectedPool.unit}，投注金额 ${wagerAmount} $PSAI...`
      )
    );

    setTimeout(() => {
      setLoading(false);
      setIsApproved(false);
      
      const parsedWager = parseFloat(wagerAmount);
      const burnPortion = parsedWager * 0.2;
      const generatedTx = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 6)}`;
      const activePoolTitle = language === "zh" ? selectedPool.titleZh : selectedPool.titleEn;

      // Update global counters mock
      setTotalSpeculated((prev) => prev + parsedWager);
      setTotalBurned((prev) => prev + burnPortion);
      
      // Update pool wagers locally
      setSelectedPool(prev => ({
        ...prev,
        poolSize: prev.poolSize + parsedWager,
        participants: prev.participants + 1
      }));

      // Append to local history
      const newHistoryItem: PredictionHistoryItem = {
        id: `hist-${Date.now()}`,
        timestamp: Date.now(),
        poolTitleEn: selectedPool.titleEn,
        poolTitleZh: selectedPool.titleZh,
        guess: parseFloat(predictionValue).toLocaleString(),
        wager: parsedWager,
        txHash: generatedTx,
        status: "active",
        unit: selectedPool.unit
      };
      setHistory(prev => [newHistoryItem, ...prev]);

      // Trigger Success Modal
      setSuccessModal({
        visible: true,
        poolTitle: activePoolTitle,
        guess: `${parseFloat(predictionValue).toLocaleString()} ${selectedPool.unit}`,
        wager: `${parsedWager.toLocaleString()} PSAI`,
        txHash: generatedTx,
        burnAmount: `${burnPortion.toLocaleString()} PSAI`,
      });

      // Log actions
      addLog(
        tLocal(
          `Prediction recorded on-chain! Tx: ${generatedTx.slice(0, 10)}...`,
          `预测已成功记录在链上！交易哈希: ${generatedTx.slice(0, 10)}...`
        )
      );
      addLog(
        tLocal(
          `🔥 Deflation Triggered: ${burnPortion.toFixed(2)} $PSAI burned instantly!`,
          `🔥 通缩触发：已立即销毁 ${burnPortion.toFixed(2)} $PSAI！`
        ),
        "warning"
      );

      // Clean inputs
      setPredictionValue("");
      setWagerAmount("");
    }, 2000);
  };

  // Switch pools resets forms
  const selectSpeculationPool = (pool: SpeculationPool) => {
    setSelectedPool(pool);
    setPredictionValue("");
    setWagerAmount("");
    setIsApproved(false);
  };

  // Sparkline SVG generator
  const renderSparkline = (data: number[]) => {
    const width = 500;
    const height = 150;
    const padding = 20;
    const maxVal = Math.max(...data);
    const minVal = Math.min(...data);
    const range = maxVal - minVal;

    const points = data
      .map((val, idx) => {
        const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="sparkline-svg">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Fill Area */}
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill="url(#chartGradient)"
        />
        {/* Grid Line */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        {/* Plot Line */}
        <polyline fill="none" stroke="var(--accent-blue)" strokeWidth={3} points={points} />
        {/* Dots */}
        {data.map((val, idx) => {
          const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
          const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r={idx === data.length - 1 ? 5 : 3}
              fill={idx === data.length - 1 ? "var(--accent-purple)" : "#fff"}
              stroke="var(--bg-card)"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
    );
  };

  return (
    <div className="speculation-wrapper">
      {/* ── Top Bar Metrics ── */}
      <div className="spec-stats-grid">
        <div className="glass-card stat-item-card">
          <div className="stat-title">{tLocal("Total $PSAI Speculated", "累计预测投注 $PSAI")}</div>
          <div className="stat-value text-blue">{totalSpeculated.toLocaleString()} PSAI</div>
        </div>
        <div className="glass-card stat-item-card glow-orange">
          <div className="stat-title">🔥 {tLocal("Total Tokens Burned", "累计销毁代币 ($PSAI)")}</div>
          <div className="stat-value text-orange">{totalBurned.toLocaleString()} PSAI</div>
          <span className="burn-label">{tLocal("Deflation Accelerated", "加速通缩中")}</span>
        </div>
        <div className="glass-card stat-item-card">
          <div className="stat-title">{tLocal("Your $PSAI Balance", "您的 $PSAI 余额")}</div>
          <div className="stat-value font-mono text-purple">{psaiBalance} PSAI</div>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="spec-main-layout">
        {/* Left Side: Pool Selector */}
        <div className="pool-selector-sidebar">
          <h4 className="section-subtitle font-mono">{tLocal("ACTIVE POOLS", "进行中的预测池")}</h4>
          <div className="pools-list">
            {pools.map((p) => {
              const isSelected = selectedPool.id === p.id;
              const title = language === "zh" ? p.titleZh : p.titleEn;
              return (
                <div
                  key={p.id}
                  className={`pool-option-card glass-card ${isSelected ? "selected" : ""}`}
                  onClick={() => selectSpeculationPool(p)}
                >
                  <div className="pool-option-header">
                    <span className="pool-dot" />
                    <strong>{title}</strong>
                  </div>
                  <div className="pool-option-details font-mono">
                    <span>{tLocal("Pool: ", "总池: ")}{p.poolSize.toLocaleString()} PSAI</span>
                    <span>👤 {p.participants}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center/Right Side: Trading Terminal Panel */}
        <div className="spec-terminal-panel glass-card">
          <div className="terminal-header">
            <h3>⚽ {language === "zh" ? selectedPool.titleZh : selectedPool.titleEn}</h3>
            <div className="time-badge font-mono">
              ⏱️ {tLocal("Closes in: ", "距关闭还有: ")}
              <span>{language === "zh" ? selectedPool.timeLeftZh : selectedPool.timeLeftEn}</span>
            </div>
          </div>

          <div className="terminal-grid">
            {/* Chart Area */}
            <div className="chart-area-box">
              <div className="chart-header">
                <div>
                  <span className="chart-label">{tLocal("Metric Trend (Past 6 Epochs)", "指标趋势图 (近6个周期)")}</span>
                  <div className="current-metric font-mono">
                    {tLocal("Current Value: ", "当前实时数值: ")}
                    <span className="text-green">
                      {selectedPool.suffix === "$" ? "$" : ""}
                      {selectedPool.currentValue.toLocaleString()}
                      {selectedPool.suffix !== "$" ? selectedPool.suffix : ""}
                    </span>
                  </div>
                </div>
              </div>
              <div className="chart-body">{renderSparkline(selectedPool.historyData)}</div>
            </div>

            {/* Betting Form */}
            <div className="wager-form-box">
              <h4 className="wager-title">{tLocal("Submit Prediction Guess", "提交您的预测")}</h4>
              <p className="wager-desc">
                {tLocal(
                  "Input your target prediction. Closest guesses split 80% of the pool. 20% of all wagers are burned permanently.",
                  "输入您的目标数值。最接近的预测者将平分奖池的80%，所有投注本金的20%将进行永久销毁。"
                )}
              </p>

              {/* Prediction Input */}
              <div className="input-group">
                <label className="font-mono">{tLocal("YOUR PREDICTION GUESS", "您的预测值")}</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    placeholder={tLocal("Enter target value", "输入目标预测值")}
                    value={predictionValue}
                    onChange={(e) => setPredictionValue(e.target.value)}
                    disabled={loading}
                  />
                  <span className="suffix font-mono">{selectedPool.unit}</span>
                </div>
              </div>

              {/* Wager Input */}
              <div className="input-group">
                <label className="font-mono">{tLocal("WAGER AMOUNT", "投注金额")}</label>
                <div className="input-with-suffix">
                  <input
                    type="number"
                    placeholder="0.0"
                    value={wagerAmount}
                    onChange={(e) => setWagerAmount(e.target.value)}
                    disabled={loading}
                  />
                  <span className="suffix font-mono">PSAI</span>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="quick-bet-container">
                {quickBets.map((amount) => (
                  <button
                    key={amount}
                    className="quick-bet-btn font-mono"
                    onClick={() => setWagerAmount(amount)}
                    disabled={loading}
                  >
                    +{amount}
                  </button>
                ))}
              </div>

              {/* Action Button */}
              {isApproved ? (
                <button
                  className="btn btn-primary wager-submit-btn font-mono"
                  onClick={handleSubmitPrediction}
                  disabled={loading || !predictionValue || !wagerAmount}
                >
                  {loading ? tLocal("SUBMITTING...", "提交中...") : tLocal("SUBMIT PREDICTION", "提交预测")}
                </button>
              ) : (
                <button
                  className="btn btn-panel wager-submit-btn font-mono"
                  onClick={handleApprove}
                  disabled={loading || !wagerAmount}
                >
                  {loading ? tLocal("APPROVING...", "授权中...") : tLocal("APPROVE $PSAI", "授权 $PSAI")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Section: History Terminal ── */}
      <div className="history-section glass-card">
        <div className="history-header">
          <h4>📊 {tLocal("My Speculation History", "我的预测历史记录")}</h4>
          <span className="history-desc">{tLocal("Real-time index of wagers and settlements", "实时投注与结算明细索引")}</span>
        </div>
        <div className="history-table-wrapper">
          <table className="history-table">
            <thead>
              <tr>
                <th>{tLocal("Date/Time", "时间")}</th>
                <th>{tLocal("Prediction Pool", "预测标的")}</th>
                <th>{tLocal("My Guess", "我的预测值")}</th>
                <th>{tLocal("Wager Amount", "投注金额")}</th>
                <th>{tLocal("Tx Hash", "交易哈希")}</th>
                <th>{tLocal("Status", "状态")}</th>
                <th>{tLocal("Payout", "结算派发")}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => {
                const dateStr = new Date(item.timestamp).toLocaleString(
                  language === "zh" ? "zh-CN" : "en-US",
                  { hour: '2-digit', minute: '2-digit', second: '2-digit', month: 'short', day: 'numeric' }
                );
                const title = language === "zh" ? item.poolTitleZh : item.poolTitleEn;
                return (
                  <tr key={item.id}>
                    <td className="font-mono text-tertiary">{dateStr}</td>
                    <td><strong>{title}</strong></td>
                    <td className="font-mono">{item.guess} {item.unit}</td>
                    <td className="font-mono">{item.wager.toLocaleString()} PSAI</td>
                    <td className="font-mono text-tertiary">
                      <a 
                        href={`https://oklink.com/xlayer/tx/${item.txHash}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="tx-link"
                      >
                        {item.txHash.slice(0, 10)}...
                      </a>
                    </td>
                    <td>
                      {item.status === "active" && (
                        <span className="badge badge-active">{tLocal("Active", "进行中")}</span>
                      )}
                      {item.status === "won" && (
                        <span className="badge badge-won">{tLocal("Won", "猜中")}</span>
                      )}
                      {item.status === "lost" && (
                        <span className="badge badge-lost">{tLocal("Closed", "未中")}</span>
                      )}
                    </td>
                    <td className="font-mono">
                      {item.status === "won" && <span className="text-green">+{item.payout?.toLocaleString()} PSAI</span>}
                      {item.status === "lost" && <span className="text-tertiary">0 PSAI</span>}
                      {item.status === "active" && <span className="text-blue">--</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Success Modal Card ── */}
      {successModal.visible && (
        <div className="modal-backdrop">
          <div className="modal-card glass-card animate-scale-in">
            <div className="modal-success-icon">🎉</div>
            <h2>{tLocal("Prediction Submitted!", "预测成功提交！")}</h2>
            <p className="modal-subtitle">
              {tLocal("Your wager has been recorded on the X Layer blockchain.", "您的预测交易已成功广播至 X Layer 区块链。")}
            </p>

            <div className="modal-details-grid font-mono">
              <div className="modal-detail-row">
                <span>{tLocal("Pool:", "预测池:")}</span>
                <span className="detail-val">{successModal.poolTitle}</span>
              </div>
              <div className="modal-detail-row">
                <span>{tLocal("Your Guess:", "预测数值:")}</span>
                <span className="detail-val text-green">{successModal.guess}</span>
              </div>
              <div className="modal-detail-row">
                <span>{tLocal("Total Wager:", "总投本金:")}</span>
                <span className="detail-val text-purple">{successModal.wager}</span>
              </div>
              <div className="modal-detail-row border-top">
                <span>🔥 {tLocal("Instant Burn (20%):", "立即销毁 (20%):")}</span>
                <span className="detail-val text-orange">{successModal.burnAmount}</span>
              </div>
              <div className="modal-detail-row">
                <span>{tLocal("Tx Hash:", "交易哈希:")}</span>
                <a 
                  href={`https://oklink.com/xlayer/tx/${successModal.txHash}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="detail-val text-blue font-mono tx-modal-link"
                >
                  {successModal.txHash.slice(0, 12)}...{successModal.txHash.slice(-6)}
                </a>
              </div>
            </div>

            <button 
              className="btn btn-primary close-modal-btn font-mono" 
              onClick={() => setSuccessModal(prev => ({ ...prev, visible: false }))}
            >
              {tLocal("CONFIRM & CLOSE", "确认并关闭")}
            </button>
          </div>
        </div>
      )}

      <style>{`
        .speculation-wrapper {
          display: flex;
          flex-direction: column;
          gap: 24px;
          color: var(--text-primary);
          animation: fadeIn 0.3s ease;
        }

        /* Stats Grid */
        .spec-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }

        .stat-item-card {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          position: relative;
          background: rgba(0, 0, 0, 0.2);
        }

        .stat-item-card.glow-orange {
          border-color: rgba(249, 115, 22, 0.2);
        }
        
        .stat-item-card.glow-orange::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: 0 0 15px rgba(249, 115, 22, 0.05);
          pointer-events: none;
        }

        .stat-title {
          font-size: 0.8rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
        }

        .burn-label {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 0.65rem;
          background: rgba(249, 115, 22, 0.1);
          color: var(--accent-safe);
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px solid rgba(249, 115, 22, 0.2);
        }

        /* Layout Grid */
        .spec-main-layout {
          display: grid;
          grid-template-columns: 300px 1fr;
          gap: 24px;
        }

        .pool-selector-sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section-subtitle {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
          margin-bottom: 4px;
        }

        .pools-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .pool-option-card {
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: rgba(0, 0, 0, 0.15);
          border: 1px solid var(--border-default);
        }

        .pool-option-card:hover {
          border-color: var(--border-hover);
          background: rgba(255, 255, 255, 0.02);
        }

        .pool-option-card.selected {
          border-color: var(--accent-blue);
          background: linear-gradient(135deg, rgba(75, 123, 245, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%);
          box-shadow: 0 0 15px rgba(75, 123, 245, 0.1);
        }

        .pool-option-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .pool-dot {
          width: 8px;
          height: 8px;
          background: var(--accent-blue);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--accent-blue);
        }

        .selected .pool-dot {
          background: var(--accent-purple);
          box-shadow: 0 0 8px var(--accent-purple);
        }

        .pool-option-card strong {
          font-size: 0.88rem;
          color: #fff;
        }

        .pool-option-details {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        /* Speculation Terminal Panel */
        .spec-terminal-panel {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          background: rgba(0, 0, 0, 0.1);
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          border-bottom: 1px solid var(--border-default);
          padding-bottom: 16px;
        }

        .terminal-header h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }

        .time-badge {
          font-size: 0.75rem;
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          padding: 4px 10px;
          border-radius: 6px;
        }

        .time-badge span {
          color: #fff;
          font-weight: 700;
        }

        .terminal-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
        }

        /* Chart Area Box */
        .chart-area-box {
          display: flex;
          flex-direction: column;
          gap: 12px;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 16px;
          background: rgba(0, 0, 0, 0.2);
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .chart-label {
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: block;
          margin-bottom: 4px;
        }

        .current-metric {
          font-size: 0.88rem;
          color: var(--text-tertiary);
        }

        .current-metric span {
          font-weight: bold;
          font-size: 1rem;
        }

        .chart-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 180px;
        }

        .sparkline-svg {
          width: 100%;
          height: auto;
        }

        /* Betting Form Box */
        .wager-form-box {
          display: flex;
          flex-direction: column;
          gap: 14px;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 16px;
          background: rgba(255, 255, 255, 0.005);
        }

        .wager-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          margin: 0;
        }

        .wager-desc {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-group label {
          font-size: 0.65rem;
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
        }

        .input-with-suffix {
          display: flex;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .input-with-suffix input {
          flex: 1;
          border: none;
          background: transparent;
          color: #fff;
          padding: 8px 12px;
          font-size: 0.85rem;
          width: 100%;
        }

        .input-with-suffix input:focus {
          outline: none;
        }

        .input-with-suffix .suffix {
          background: rgba(255, 255, 255, 0.02);
          border-left: 1px solid var(--border-default);
          padding: 8px 12px;
          font-size: 0.78rem;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }

        .quick-bet-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        .quick-bet-btn {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          border-radius: 4px;
          padding: 6px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .quick-bet-btn:hover {
          color: #fff;
          border-color: var(--border-hover);
          background: rgba(255, 255, 255, 0.03);
        }

        .wager-submit-btn {
          width: 100%;
          padding: 10px;
          font-size: 0.85rem;
          font-weight: 700;
          margin-top: 6px;
        }

        /* History Section */
        .history-section {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(0, 0, 0, 0.15);
        }

        .history-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .history-header h4 {
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff;
          margin: 0;
        }

        .history-desc {
          font-size: 0.72rem;
          color: var(--text-tertiary);
        }

        .history-table-wrapper {
          overflow-x: auto;
        }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.82rem;
        }

        .history-table th, .history-table td {
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-default);
        }

        .history-table th {
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-tertiary);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.68rem;
          letter-spacing: 0.05em;
        }

        .history-table tr:last-child td {
          border-bottom: none;
        }

        .history-table td {
          color: var(--text-secondary);
        }

        .tx-link {
          color: var(--accent-blue);
          text-decoration: none;
          transition: color 0.2s;
        }

        .tx-link:hover {
          color: #fff;
          text-decoration: underline;
        }

        /* Status Badges */
        .badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .badge-active {
          background: rgba(75, 123, 245, 0.15);
          color: var(--accent-blue);
          border: 1px solid rgba(75, 123, 245, 0.25);
        }

        .badge-won {
          background: rgba(39, 201, 63, 0.15);
          color: var(--accent-safe);
          border: 1px solid rgba(39, 201, 63, 0.25);
        }

        .badge-lost {
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-tertiary);
          border: 1px solid var(--border-default);
        }

        /* Success Modal backdrop & card */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.25s ease;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          padding: 32px;
          background: rgba(10, 15, 28, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-lg);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(255, 255, 255, 0.02);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .modal-success-icon {
          font-size: 3rem;
          margin-bottom: 12px;
          filter: drop-shadow(0 0 10px rgba(75, 123, 245, 0.2));
        }

        .modal-card h2 {
          font-size: 1.4rem;
          font-weight: 800;
          color: #fff;
          margin: 0 0 8px 0;
        }

        .modal-subtitle {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0 0 20px 0;
          line-height: 1.4;
        }

        .modal-details-grid {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 16px;
          margin-bottom: 24px;
        }

        .modal-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .modal-detail-row.border-top {
          border-top: 1px solid var(--border-default);
          padding-top: 12px;
        }

        .detail-val {
          color: #fff;
          font-weight: 700;
        }

        .tx-modal-link {
          text-decoration: none;
        }

        .tx-modal-link:hover {
          text-decoration: underline;
        }

        .close-modal-btn {
          width: 100%;
          padding: 12px;
          font-weight: bold;
          font-size: 0.88rem;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-scale-in {
          animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @media (max-width: 960px) {
          .spec-main-layout {
            grid-template-columns: 1fr;
          }
          .terminal-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
