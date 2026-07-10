import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../context/LanguageContext";
import { WalletState } from "../lib/wallet";

interface OKXAIHubProps {
  wallet: WalletState;
  onConnect?: () => void;
}

interface TaskState {
  id: string | null;
  status: "idle" | "escrowed" | "processing" | "delivered" | "completed";
  logs: string[];
  amount: number;
}

export const OKXAIHub: React.FC<OKXAIHubProps> = ({ wallet, onConnect }) => {
  const { t, language } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<"marketplace" | "developer" | "simulator">("marketplace");
  
  // Simulator State
  const [taskAmount, setTaskAmount] = useState<string>("1.0");
  const [taskDescription, setTaskDescription] = useState<string>(
    language === "zh" 
      ? "分析下场比赛并代表我用 50 Credits 交易增值空间最大的球员" 
      : "Find the best value player in the next match and acquire shares using 50 Credits"
  );
  const [task, setTask] = useState<TaskState>({
    id: null,
    status: "idle",
    logs: [],
    amount: 1.0
  });
  
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  
  // Auto Scroll logs to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [task.logs]);

  // Task status poller when task is active
  useEffect(() => {
    if (!task.id || task.status === "completed" || task.status === "idle") return;

    const interval = setInterval(async () => {
      try {
        const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
        const res = await fetch(`${API_BASE}/api/worldcup/okxai/a2a-task/${task.id}`);
        const json = await res.json();
        
        if (json.success && json.data) {
          setTask({
            id: json.data.id,
            status: json.data.status,
            logs: json.data.logs,
            amount: json.data.amount
          });
        }
      } catch (err) {
        console.error("Failed to poll task status:", err);
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [task.id, task.status]);

  // Trigger Escrow Task Simulation
  const handleStartTask = async () => {
    if (!wallet.connected) {
      if (onConnect) onConnect();
      return;
    }
    
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
      const res = await fetch(`${API_BASE}/api/worldcup/okxai/a2a-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(taskAmount) || 1.0,
          description: taskDescription
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTask({
          id: json.data.id,
          status: json.data.status,
          logs: json.data.logs,
          amount: json.data.amount
        });
      }
    } catch (err) {
      console.error("Error starting simulated task:", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Escrow Release
  const handleReleaseEscrow = async () => {
    if (!task.id || task.status !== "delivered") return;
    
    setLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
      const res = await fetch(`${API_BASE}/api/worldcup/okxai/a2a-task/${task.id}/release`, {
        method: "POST"
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTask({
          id: json.data.id,
          status: json.data.status,
          logs: json.data.logs,
          amount: json.data.amount
        });
      }
    } catch (err) {
      console.error("Error releasing escrow:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulator = () => {
    setTask({
      id: null,
      status: "idle",
      logs: [],
      amount: 1.0
    });
  };

  // Code Snippet for developers
  const codeSnippet = `// 🤖 Example: Calling ScanGuard A2MCP Security API via x402 Payments on X Layer
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);

async function scanTokenWithPayment(tokenAddress) {
  // 1. Request security scan from ScanGuard
  const res = await fetch("https://scanguard.shieldsuite.xyz/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tokenAddress })
  });

    if (res.status === 402) {
      const paymentRequired = await res.json();
      const { amount, recipient, nonce } = paymentRequired.details;
      console.log(\`[x402] Payment Required: \${amount} USDT to \${recipient}\`);

      // 2. Transfer USDT natively on X Layer
      const usdtContract = new ethers.Contract(
        "0x1e4a5963ab79e612984b2e88b8d96053bfd975d8", // USDT on X Layer
        ["function transfer(address to, uint256 value) returns (bool)"],
        wallet
      );
      const tx = await usdtContract.transfer(recipient, ethers.parseUnits(amount, 6));
      const receipt = await tx.wait();

    // 3. Resubmit request attaching the transaction hash as the payment proof
    const finalScan = await fetch("https://scanguard.shieldsuite.xyz/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-402-Payment": receipt.hash
      },
      body: JSON.stringify({ tokenAddress })
    });

    const report = await finalScan.json();
    console.log("[ScanGuard Report]:", report.data);
  } else {
    const report = await res.json();
    console.log("[ScanGuard Report]:", report.data);
  }
}

scanTokenWithPayment("0xaef068ea820aafa00a2854bfd6cfab6d891ede5d");`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="okxai-hub-container animate-fade-in" style={{ padding: "0 24px", maxWidth: "1400px", margin: "0 auto 80px" }}>
      {/* Header and description */}
      <div style={{ textAlign: "center", marginBottom: "40px", marginTop: "110px" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: 800, background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block", marginBottom: "12px" }}>
          🤖 {language === "zh" ? "OKX.AI 智能体服务中心 (ASP)" : "OKX.AI Agent Hub (ASP)"}
        </h2>
        <p style={{ fontSize: "1rem", color: "var(--text-secondary)", maxWidth: "700px", margin: "0 auto", lineHeight: "1.6" }}>
          {language === "zh" 
            ? "ShieldSuite 现已作为智能体服务商 (ASP) 挂载至 OKX.AI。我们为其他 AI 智能体和链上合约提供一键式的 bytecode 安全扫描与零亏损竞猜托管服务。"
            : "ShieldSuite is officially integrated as an Agent Service Provider (ASP) on the OKX.AI platform. We deliver instant security scanning (A2MCP) and delegation strategies (A2A) on X Layer."
          }
        </p>
      </div>

      {/* Sub Navigation Tabs */}
      <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginBottom: "40px", borderBottom: "1px solid var(--border-default)", paddingBottom: "16px" }}>
        <button
          onClick={() => setActiveSubTab("marketplace")}
          className={`subnav-btn ${activeSubTab === "marketplace" ? "active" : ""}`}
          style={{
            background: activeSubTab === "marketplace" ? "linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)" : "transparent",
            border: "1px solid",
            borderColor: activeSubTab === "marketplace" ? "var(--accent-blue)" : "var(--border-default)",
            borderRadius: "12px",
            color: activeSubTab === "marketplace" ? "#fff" : "var(--text-secondary)",
            padding: "10px 24px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          🏪 {language === "zh" ? "ASP 服务目录" : "ASP Directory"}
        </button>

        <button
          onClick={() => setActiveSubTab("developer")}
          className={`subnav-btn ${activeSubTab === "developer" ? "active" : ""}`}
          style={{
            background: activeSubTab === "developer" ? "linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)" : "transparent",
            border: "1px solid",
            borderColor: activeSubTab === "developer" ? "var(--accent-blue)" : "var(--border-default)",
            borderRadius: "12px",
            color: activeSubTab === "developer" ? "#fff" : "var(--text-secondary)",
            padding: "10px 24px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          💻 {language === "zh" ? "开发者 SDK / x402" : "Developer SDK / x402"}
        </button>

        <button
          onClick={() => setActiveSubTab("simulator")}
          className={`subnav-btn ${activeSubTab === "simulator" ? "active" : ""}`}
          style={{
            background: activeSubTab === "simulator" ? "linear-gradient(135deg, rgba(75, 123, 245, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)" : "transparent",
            border: "1px solid",
            borderColor: activeSubTab === "simulator" ? "var(--accent-blue)" : "var(--border-default)",
            borderRadius: "12px",
            color: activeSubTab === "simulator" ? "#fff" : "var(--text-secondary)",
            padding: "10px 24px",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          🎮 {language === "zh" ? "A2A 托管交易模拟器" : "A2A Escrow Simulator"}
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        {activeSubTab === "marketplace" && (
          <motion.div
            key="marketplace"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}
          >
            {/* A2MCP: ScanGuard Card */}
            <div className="glass-card" style={{ padding: "30px", border: "1px solid var(--border-default)", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
              <div className="accent-glow-top-left" style={{ position: "absolute", top: "-50px", left: "-50px", width: "150px", height: "150px", background: "rgba(75, 123, 245, 0.1)", filter: "blur(40px)" }}></div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <span className="badge badge-purple" style={{ textTransform: "uppercase", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "20px" }}>Agent-to-MCP (A2MCP)</span>
                  <div style={{ color: "#ffb800", fontSize: "0.9rem" }}>⭐⭐⭐⭐⭐ <span style={{ color: "var(--text-secondary)", marginLeft: "4px" }}>(142)</span></div>
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  🛡️ ScanGuard Token Scanner
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "24px" }}>
                  {language === "zh"
                    ? "通过 dual-layer 智能分析引擎验证任意 ERC-20 代币的合约安全性。提供即时的蜜罐检测、恶意代码扫描和资金池分析。"
                    : "Instantly check any token address on X Layer for code vulnerabilities, hidden fees, honeypots, and active admin roles. Integrated directly via the x402 payment protocol."
                  }
                </p>
                
                <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "20px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>{language === "zh" ? "结算机制:" : "Settlement:"}</span>
                    <span style={{ fontWeight: 600, color: "#fff" }}>{language === "zh" ? "OKX 支付 SDK (即时结算)" : "OKX Payment SDK (Instant)"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>{language === "zh" ? "单次调用价格:" : "Price per Call:"}</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: "var(--accent-safe)" }}>0.005 USDT</span>
                  </div>
                </div>
              </div>

              <a
                href="https://okx.ai/marketplace/agents/scanguard"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: "100%", textAlign: "center", textDecoration: "none", fontWeight: "bold", padding: "14px 20px" }}
              >
                🚀 {language === "zh" ? "在 OKX.AI 运行智能体" : "Run Agent on OKX.AI"}
              </a>
            </div>

            {/* A2A: Pitchside AI Scout Card */}
            <div className="glass-card" style={{ padding: "30px", border: "1px solid var(--border-default)", borderRadius: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}>
              <div className="accent-glow-top-left" style={{ position: "absolute", top: "-50px", left: "-50px", width: "150px", height: "150px", background: "rgba(168, 85, 247, 0.1)", filter: "blur(40px)" }}></div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <span className="badge badge-blue" style={{ textTransform: "uppercase", fontSize: "0.75rem", padding: "4px 10px", borderRadius: "20px" }}>Agent-to-Agent (A2A)</span>
                  <div style={{ color: "#ffb800", fontSize: "0.9rem" }}>⭐⭐⭐⭐⭐ <span style={{ color: "var(--text-secondary)", marginLeft: "4px" }}>(88)</span></div>
                </div>
                <h3 style={{ fontSize: "1.4rem", fontWeight: "bold", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚽ Pitchside World Cup Scout
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "24px" }}>
                  {language === "zh"
                    ? "委托 TEE 硬件机密智能体根据比赛数据和实时资讯执行球员增值代币套利。资金安全锁定在 X Layer 托管合约中，仅在交付结果后结算。"
                    : "Delegate complex speculation and arbitrage strategies to a secure TEE-isolated scout. Executes swaps on PlayerDex based on live match logs. Runs via escrowed milestone payments."
                  }
                </p>

                <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "20px", marginBottom: "24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>{language === "zh" ? "结算机制:" : "Settlement:"}</span>
                    <span style={{ fontWeight: 600, color: "#fff" }}>{language === "zh" ? "多签托管合约 (Milestone 交付)" : "Escrow Escaped (Milestone Release)"}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                    <span style={{ color: "var(--text-tertiary)" }}>{language === "zh" ? "默认委托费用:" : "Default Service Fee:"}</span>
                    <span className="font-mono" style={{ fontWeight: 600, color: "var(--accent-blue)" }}>1.00 USDT</span>
                  </div>
                </div>
              </div>

              <a
                href="https://okx.ai/marketplace/agents/pitchside-scout"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ width: "100%", textAlign: "center", textDecoration: "none", fontWeight: "bold", padding: "14px 20px" }}
              >
                ⚽ {language === "zh" ? "去 OKX.AI 进行委托" : "Delegate on OKX.AI"}
              </a>
            </div>
          </motion.div>
        )}

        {activeSubTab === "developer" && (
          <motion.div
            key="developer"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="glass-card"
            style={{ padding: "30px", border: "1px solid var(--border-default)", borderRadius: "16px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
                🔌 {language === "zh" ? "通过 x402 协议在您自建的智能体中调用 ScanGuard" : "Integrate ScanGuard via x402 protocol in your Agent"}
              </h3>
              <button
                onClick={copyToClipboard}
                style={{
                  background: copied ? "var(--accent-safe)" : "rgba(255, 255, 255, 0.05)",
                  color: "#fff",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: "bold",
                  transition: "all 0.2s"
                }}
              >
                {copied ? (language === "zh" ? "已复制!" : "Copied!") : (language === "zh" ? "复制代吗" : "Copy Code")}
              </button>
            </div>
            
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.6", marginBottom: "20px" }}>
              {language === "zh"
                ? "ScanGuard 是首个支持 x402 货币化标准的 X Layer 智能体工具。若检测到无授权调用，API 会返回 HTTP 402，智能体广播微额转账后附带哈希验证即可解锁数据结果。"
                : "ScanGuard is fully compliant with the x402 payment protocol. When your external agent calls our endpoint, it automatically pays a micropayment fee in USDT dynamically on X Layer, and receives the verified threat report."
              }
            </p>

            <pre style={{
              background: "rgba(0, 0, 0, 0.3)",
              padding: "20px",
              borderRadius: "10px",
              border: "1px solid var(--border-default)",
              overflowX: "auto",
              fontSize: "0.85rem",
              fontFamily: "var(--font-mono)",
              color: "#38bdf8",
              lineHeight: "1.5"
            }}>
              <code>{codeSnippet}</code>
            </pre>
          </motion.div>
        )}

        {activeSubTab === "simulator" && (
          <motion.div
            key="simulator"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}
          >
            {/* Setup Controls */}
            <div className="glass-card" style={{ padding: "30px", border: "1px solid var(--border-default)", borderRadius: "16px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "bold", marginBottom: "20px", borderBottom: "1px solid var(--border-default)", paddingBottom: "12px" }}>
                🔒 {language === "zh" ? "托管任务创建配置" : "A2A Escrow Configuration"}
              </h3>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "bold" }}>
                  {language === "zh" ? "任务预算 (USDT):" : "Task Budget (USDT):"}
                </label>
                <input
                  type="number"
                  value={taskAmount}
                  onChange={(e) => setTaskAmount(e.target.value)}
                  disabled={task.status !== "idle"}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "10px",
                    padding: "12px",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.95rem"
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "8px", fontWeight: "bold" }}>
                  {language === "zh" ? "智能体命令 (Task Description):" : "Agent Speculation Prompts:"}
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  disabled={task.status !== "idle"}
                  rows={4}
                  style={{
                    width: "100%",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "10px",
                    padding: "12px",
                    color: "#fff",
                    outline: "none",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.9rem",
                    lineHeight: "1.5",
                    resize: "none"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "12px" }}>
                {task.status === "idle" ? (
                  <button
                    onClick={handleStartTask}
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ flex: 1, fontWeight: "bold", padding: "14px" }}
                  >
                    {loading ? (language === "zh" ? "正在锁定托管..." : "Locking Escrow...") : (language === "zh" ? "锁定托管并分配任务" : "Lock Escrow & Disptach")}
                  </button>
                ) : task.status === "delivered" ? (
                  <button
                    onClick={handleReleaseEscrow}
                    disabled={loading}
                    className="btn btn-success"
                    style={{
                      flex: 1,
                      fontWeight: "bold",
                      padding: "14px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "none",
                      color: "#fff",
                      borderRadius: "10px",
                      cursor: "pointer"
                    }}
                  >
                    {loading ? (language === "zh" ? "交付确认中..." : "Releasing...") : (language === "zh" ? "确认收货并释放托管资金" : "Approve & Release Escrow")}
                  </button>
                ) : (
                  <button
                    disabled
                    className="btn"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      color: "var(--text-tertiary)",
                      cursor: "not-allowed",
                      padding: "14px",
                      borderRadius: "10px",
                      border: "1px solid var(--border-default)"
                    }}
                  >
                    {task.status === "processing" 
                      ? (language === "zh" ? "🤖 智能体正在 TEE 内执行运算..." : "🤖 Agent Processing in TEE...")
                      : (language === "zh" ? "✅ 交付成功" : "✅ Task Settlement Completed")
                    }
                  </button>
                )}

                {task.status !== "idle" && (
                  <button
                    onClick={handleResetSimulator}
                    className="btn"
                    style={{
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid var(--border-default)",
                      color: "#fff",
                      borderRadius: "10px",
                      cursor: "pointer",
                      padding: "14px 20px"
                    }}
                  >
                    {language === "zh" ? "重置" : "Reset"}
                  </button>
                )}
              </div>
            </div>

            {/* Running Console */}
            <div className="glass-card" style={{ padding: "30px", border: "1px solid var(--border-default)", borderRadius: "16px", display: "flex", flexDirection: "column", height: "450px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid var(--border-default)", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}>
                  📟 {language === "zh" ? "智能体 TEE 安全终端" : "TEE Terminal Console"}
                </h3>
                
                {/* State indicator */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <span>Status:</span>
                  <span
                    className="font-mono"
                    style={{
                      fontWeight: "bold",
                      color: 
                        task.status === "idle" ? "var(--text-tertiary)" :
                        task.status === "escrowed" ? "#ffb800" :
                        task.status === "processing" ? "#60a5fa" :
                        task.status === "delivered" ? "#c084fc" :
                        "var(--accent-safe)"
                    }}
                  >
                    {task.status.toUpperCase()}
                  </span>
                  {task.status !== "idle" && task.status !== "completed" && (
                    <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#60a5fa", animation: "ping 1.5s infinite" }}></span>
                  )}
                </div>
              </div>

              {/* Log Feed */}
              <div style={{
                flex: 1,
                background: "rgba(0, 0, 0, 0.4)",
                borderRadius: "10px",
                border: "1px solid var(--border-default)",
                padding: "20px",
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: "0.82rem",
                color: "#10b981",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                lineHeight: "1.6"
              }}>
                {task.status === "idle" ? (
                  <div style={{ color: "var(--text-tertiary)", textAlign: "center", marginTop: "120px" }}>
                    🤖 {language === "zh" ? "控制台闲置。请先配置任务以部署 TEE 智能体..." : "Console idle. Configure and submit task to deploy TEE Scout Agent..."}
                  </div>
                ) : (
                  <>
                    {task.logs.map((log, i) => (
                      <div key={i} style={{
                        color: log.includes("❌") || log.includes("⚠️") ? "#f87171" :
                               log.includes("✅") || log.includes("💰") ? "var(--accent-safe)" :
                               log.includes("🤖") || log.includes("🔒") ? "#60a5fa" :
                               "#34d399"
                      }}>
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS styling in JSX to overlay on standard dashboard styles */}
      <style>{`
        .subnav-btn {
          color: var(--text-secondary);
        }
        .subnav-btn.active {
          color: #fff !important;
          box-shadow: 0 0 15px rgba(75, 123, 245, 0.15);
        }
        @keyframes ping {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
