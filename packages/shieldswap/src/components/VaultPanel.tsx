import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";
import { useLanguage } from "../context/LanguageContext";

// Local ABI declarations
const USDT_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function faucet() external", // MockUSDT has a faucet!
  "function decimals() external view returns (uint8)"
];

const ATOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)"
];

const VAULT_ABI = [
  "function deposit(uint256 amount) external",
  "function withdraw(uint256 amount) external",
  "function delegateAgent(address agent) external",
  "function getCredits(address user) external view returns (uint256)",
  "function users(address user) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
  "function creditsPerTokenPerSecond() external view returns (uint256)"
];

import STATIC_DEPLOYED_ADDRESSES from "../deployed-addresses.json";

import { VaultIcon, SearchIcon, InfoIcon, RobotIcon, CheckIcon, CrossIcon } from "./Icons";

interface VaultPanelProps {
  wallet: WalletState;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

export const VaultPanel: React.FC<VaultPanelProps> = ({ wallet, onActivityLog }) => {
  const { language, t } = useLanguage();
  const DEPLOYED_ADDRESSES = (STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || STATIC_DEPLOYED_ADDRESSES;

  const isMainnet = true;
  const explorerBase = isMainnet
    ? "https://www.okx.com/explorer/xlayer/tx/"
    : "https://www.okx.com/explorer/xlayer-test/tx/";

  const [usdtBalance, setUsdtBalance] = useState("0");
  const [stakedBalance, setStakedBalance] = useState("0");
  const [vaultATokenBalance, setVaultATokenBalance] = useState(0n);
  const [credits, setCredits] = useState(0n);
  const [delegatedAgent, setDelegatedAgent] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");
  const [creditsRate, setCreditsRate] = useState(158440000000n); // default scaled
  const [activeAgentAddress, setActiveAgentAddress] = useState("");
  const [usdtDecimals, setUsdtDecimals] = useState(18);
  const [multiplier, setMultiplier] = useState(1.0);
  const [lastUpdated, setLastUpdated] = useState(0n);
  const [accumulatedCredits, setAccumulatedCredits] = useState(0n);
  const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";

  // ─── Success Modal State ────────────────────────────────────────────────────
  const [txModal, setTxModal] = useState<{
    visible: boolean;
    type: "Stake" | "Unstake" | "Delegation";
    txHash: string;
    amount?: string;
  }>({ visible: false, type: "Stake", txHash: "" });

  useEffect(() => {
    const fetchAgentStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/agent/status`);
        const data = await res.json();
        if (data.success && data.data && data.data.address) {
          setActiveAgentAddress(data.data.address);
        }
      } catch (err) {
        console.error("Failed to fetch active agent address:", err);
      }
    };
    fetchAgentStatus();
  }, []);

  // Only the real Active TEE Scout Agent - no fake placeholder agents
  const dynamicAgentsList = activeAgentAddress 
    ? [{ name: `${language === "zh" ? "活跃 TEE 特工" : "Active TEE Scout Agent"} (${activeAgentAddress.slice(0, 6)}...${activeAgentAddress.slice(-4)})`, address: activeAgentAddress }]
    : [{ name: language === "zh" ? "正在加载特工..." : "Loading agent...", address: "" }];

  useEffect(() => {
    if (activeAgentAddress) {
      setSelectedAgent(activeAgentAddress);
    }
  }, [activeAgentAddress]);

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [allowance, setAllowance] = useState(0n);
  const [refreshKey, setRefreshKey] = useState(0);
  const [faucetStatus, setFaucetStatus] = useState<"idle" | "signing" | "confirming" | "success" | "error">("idle");

  const addLog = (message: string, type: "info" | "warning" = "info") => {
    onActivityLog({
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type,
      message
    });
  };

  // 1. Fetch Vault and Token Info
  useEffect(() => {
    if (!wallet.connected || !wallet.provider || !wallet.address) return;

    const fetchVaultData = async () => {
      try {
        const usdt = new ethers.Contract(DEPLOYED_ADDRESSES.MockUSDT, USDT_ABI, wallet.provider!);
        const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.provider!);

        const decimals = await usdt.decimals().catch(() => 18);
        setUsdtDecimals(decimals);

        // Balances
        const usdtBal = await usdt.balanceOf(wallet.address);
        setUsdtBalance(ethers.formatUnits(usdtBal, decimals));

        const userInfo = await vault.users(wallet.address);
        setStakedBalance(ethers.formatUnits(userInfo.balance, decimals));
        setDelegatedAgent(userInfo.delegatedAgent);
        setLastUpdated(BigInt(userInfo.lastUpdated));
        setAccumulatedCredits(BigInt(userInfo.accumulatedCredits));

        // Credits rate
        const rate = await vault.creditsPerTokenPerSecond();
        setCreditsRate(rate);

        // Fetch on-chain credits as secondary fallback, but do not set directly to avoid jumps
        const creds = await vault.getCredits(wallet.address);
        if (credits === 0n) {
          setCredits(creds);
        }

        // Allowance
        const currentAllowance = await usdt.allowance(wallet.address, DEPLOYED_ADDRESSES.NoLossVault);
        setAllowance(currentAllowance);

        // Fetch PSAI balance to check if multiplier applies
        try {
          const psaiTokenAddress = "0xaef068ea820aafa00a2854bfd6cfab6d891ede5d";
          const psai = new ethers.Contract(psaiTokenAddress, [
            "function balanceOf(address) external view returns (uint256)"
          ], wallet.provider!);
          const psaiBal = await psai.balanceOf(wallet.address);
          if (psaiBal >= ethers.parseEther("1000000")) {
            setMultiplier(5.0);
          } else if (psaiBal >= ethers.parseEther("250000")) {
            setMultiplier(3.0);
          } else if (psaiBal >= ethers.parseEther("50000")) {
            setMultiplier(2.0);
          } else if (psaiBal >= ethers.parseEther("10000")) {
            setMultiplier(1.5);
          } else {
            setMultiplier(1.0);
          }
        } catch {
          // Fallback: on testnet simulate for default test address
          if (wallet.chainId !== 196 && wallet.address?.toLowerCase() === "0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02") {
            setMultiplier(3.0); // Mock Elite Scout Master (3.0x multiplier)
          } else {
            setMultiplier(1.0);
          }
        }

        // ── Fetch vault's actual aToken balance (to cap withdrawals correctly)
        // On mainnet the aToken is 0xF356ae412... , on testnet there's no aToken so we skip
        try {
          // The vault contract has an aToken() getter
          const vaultAbiWithAToken = [...VAULT_ABI, "function aToken() external view returns (address)"];
          const vaultWithAToken = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, vaultAbiWithAToken, wallet.provider!);
          const aTokenAddr = await vaultWithAToken.aToken();
          if (aTokenAddr && aTokenAddr !== ethers.ZeroAddress) {
            const aToken = new ethers.Contract(aTokenAddr, ATOKEN_ABI, wallet.provider!);
            const aTokenBal = await aToken.balanceOf(DEPLOYED_ADDRESSES.NoLossVault);
            setVaultATokenBalance(aTokenBal);
          }
        } catch {
          // aToken not available (testnet mock vault may not have it)
        }
      } catch (err: any) {
        console.error("Vault fetch error:", err.message);
      }
    };

    fetchVaultData();
    const interval = setInterval(fetchVaultData, 5000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, wallet.provider, refreshKey]);

  // 2. Live credits ticking effect (ticks every 100ms for premium UX feel)
  useEffect(() => {
    if (parseFloat(stakedBalance) <= 0) {
      setCredits(accumulatedCredits);
      return;
    }

    const interval = setInterval(() => {
      const balanceRaw = ethers.parseUnits(stakedBalance, usdtDecimals);
      const nowSec = BigInt(Math.floor(Date.now() / 1000));
      const elapsed = nowSec > lastUpdated ? nowSec - lastUpdated : 0n;

      const multScaled = BigInt(Math.round(multiplier * 10));
      const activeRate = (creditsRate * multScaled) / 10n;
      const earned = (balanceRaw * elapsed * activeRate) / 1000000000000n; // divide by 1e12

      setCredits(accumulatedCredits + earned);
    }, 100);

    return () => clearInterval(interval);
  }, [stakedBalance, creditsRate, usdtDecimals, multiplier, lastUpdated, accumulatedCredits]);

  // 3. Faucet claim
  const handleFaucet = async () => {
    if (!wallet.signer || !wallet.address) return;
    setLoading(true);
    setFaucetStatus("signing");
    addLog(language === "zh" ? "正在从领水水龙头请求 1000 Mock USDT..." : "Requesting 1000 Mock USDT from Faucet...");
    console.log("[Faucet] Starting mint to", wallet.address, "on contract", DEPLOYED_ADDRESSES.MockUSDT);
    try {
      const usdt = new ethers.Contract(DEPLOYED_ADDRESSES.MockUSDT, [
        ...USDT_ABI,
        "function mint(address to, uint256 amount) external"
      ], wallet.signer);
      const amount = ethers.parseEther("1000"); // 1000 USDT (18 decimals)
      const tx = await usdt.mint(wallet.address, amount);
      console.log("[Faucet] TX sent:", tx.hash);
      setFaucetStatus("confirming");
      addLog(language === "zh" ? `水龙头交易已发送: ${tx.hash.slice(0, 14)}... 正在等待确认...` : `Faucet TX sent: ${tx.hash.slice(0, 14)}... Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log("[Faucet] TX confirmed, status:", receipt?.status);
      if (receipt?.status === 1) {
        setFaucetStatus("success");
        addLog(language === "zh" ? "✓ 1000 Mock USDT 成功铸造！" : "✓ 1000 Mock USDT minted successfully!");
      } else {
        setFaucetStatus("error");
        addLog(language === "zh" ? "✕ 链上水龙头交易失败。" : "✕ Faucet transaction reverted onchain.", "warning");
      }
      setRefreshKey((k) => k + 1);
      // Reset status after 3 seconds
      setTimeout(() => setFaucetStatus("idle"), 3000);
    } catch (err: any) {
      console.error("[Faucet] Error:", err);
      setFaucetStatus("error");
      addLog(language === "zh" ? `水龙头错误: ${err.message}` : `Faucet error: ${err.message}`, "warning");
      setTimeout(() => setFaucetStatus("idle"), 3000);
    } finally {
      setLoading(false);
    }
  };

  // 4. USDT Approval
  const handleApprove = async () => {
    if (!wallet.signer) return;
    setLoading(true);
    addLog(language === "zh" ? "正在授权金库合约以使用您的 USDT..." : "Approving NoLossVault to spend USDT...");
    try {
      const usdt = new ethers.Contract(DEPLOYED_ADDRESSES.MockUSDT, USDT_ABI, wallet.signer);
      const tx = await usdt.approve(DEPLOYED_ADDRESSES.NoLossVault, ethers.MaxUint256);
      await tx.wait();
      setAllowance(ethers.MaxUint256);
      addLog(language === "zh" ? "✓ 金库合约授权成功！" : "✓ NoLossVault approved successfully!");
    } catch (err: any) {
      addLog(language === "zh" ? `授权错误: ${err.message}` : `Approval error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 5. Deposit
  const handleDeposit = async () => {
    if (!wallet.signer || !depositAmount) return;
    setLoading(true);
    addLog(language === "zh" ? `正在向金库存入 ${depositAmount} USDT...` : `Depositing ${depositAmount} USDT into Vault...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);
      const tx = await vault.deposit(ethers.parseUnits(depositAmount, usdtDecimals));
      await tx.wait();
      
      // Register user globally in backend so they permanently appear on the leaderboard (bypasses RPC block limit)
      try {
        const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";
        await fetch(`${API_BASE}/api/worldcup/register-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: wallet.address })
        });
      } catch (e) {
        console.warn("Failed to register user to global backend database", e);
      }

      addLog(language === "zh" ? `✓ 成功质押 ${depositAmount} USDT！交易: ${tx.hash.slice(0, 14)}...` : `✓ Staked ${depositAmount} USDT successfully! Tx: ${tx.hash.slice(0, 14)}...`);
      setDepositAmount("");
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Stake", txHash: tx.hash, amount: depositAmount });
    } catch (err: any) {
      addLog(language === "zh" ? `质押错误: ${err.message}` : `Deposit error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 6. Withdraw
  const handleWithdraw = async () => {
    if (!wallet.signer || !withdrawAmount) return;
    setLoading(true);
    addLog(language === "zh" ? `正在从金库赎回 ${withdrawAmount} USDT...` : `Initiating unstake of ${withdrawAmount} USDT from Vault...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);

      // ── MAINNET FIX: Aave holds aToken balance that can be 1 unit less than
      //    the vault's stored user balance due to 6-decimal rounding.
      //    To prevent "execution reverted" from Aave, we cap the requested
      //    withdrawal to the vault's actual aToken holdings.
      let rawAmount = ethers.parseUnits(withdrawAmount, usdtDecimals);
      if (vaultATokenBalance > 0n && rawAmount > vaultATokenBalance) {
        rawAmount = vaultATokenBalance;
        addLog(language === "zh" ? `ℹ️ 赎回额调整为 ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT（Aave 舍入调整）` : `ℹ️ Capping withdrawal to ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT (Aave rounding adjustment)`);
      }

      const tx = await vault.withdraw(rawAmount);
      const receipt = await tx.wait();
      addLog(language === "zh" ? `✓ 成功赎回 ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT！交易: ${tx.hash.slice(0, 14)}...` : `✓ Unstaked ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT successfully! Tx: ${tx.hash.slice(0, 14)}...`);
      setWithdrawAmount("");
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Unstake", txHash: tx.hash, amount: ethers.formatUnits(rawAmount, usdtDecimals) });
    } catch (err: any) {
      addLog(language === "zh" ? `赎回错误: ${err.message}` : `Withdrawal error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 7. Delegate Agent
  const handleDelegate = async () => {
    if (!wallet.signer) return;
    setLoading(true);
    addLog(language === "zh" ? `正在向特工授权积分额度: ${selectedAgent}...` : `Delegating credit authority to scout agent: ${selectedAgent}...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);
      const tx = await vault.delegateAgent(selectedAgent);
      await tx.wait();
      addLog(language === "zh" ? `✓ 特工授权成功！交易: ${tx.hash.slice(0, 14)}...` : `✓ Agent delegation completed! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Delegation", txHash: tx.hash });
    } catch (err: any) {
      addLog(language === "zh" ? `授权特工错误: ${err.message}` : `Delegation error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  const formattedCredits = parseFloat(ethers.formatEther(credits)).toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });

  const requiredAllowance = depositAmount ? ethers.parseUnits(depositAmount, usdtDecimals) : 0n;
  const isApproved = allowance > 0n && allowance >= (requiredAllowance > 0n ? requiredAllowance : ethers.parseUnits("1", usdtDecimals));

  const modalContent = txModal.visible
    ? ReactDOM.createPortal(
        <div className="tx-modal-overlay" onClick={() => setTxModal(m => ({ ...m, visible: false }))}>
          <div className="tx-modal" onClick={e => e.stopPropagation()}>
            <div className="tx-modal-icon" style={{ color: 'var(--accent-safe)', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="tx-modal-title">
              {txModal.type === "Stake" && (language === "zh" ? `已成功质押 ${txModal.amount} USDT！` : `${txModal.amount} USDT Staked!`)}
              {txModal.type === "Unstake" && (language === "zh" ? `已成功赎回 ${txModal.amount} USDT！` : `${txModal.amount} USDT Unstaked!`)}
              {txModal.type === "Delegation" && (language === "zh" ? "特工委托成功！" : "Agent Delegated!")}
            </h3>
            <p className="tx-modal-sub">
              {language === "zh" ? `您的交易已在 ${isMainnet ? "X Layer 主网" : "X Layer 测试网"} 上被确认。` : `Your transaction was confirmed on ${isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.`}
            </p>
            <a
              href={`${explorerBase}${txModal.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-modal-link"
            >
              <SearchIcon /> {language === "zh" ? "在浏览器上查看交易 ↗" : "View Transaction on Explorer ↗"}
            </a>
            <button
              className="btn btn-primary tx-modal-close"
              onClick={() => setTxModal(m => ({ ...m, visible: false }))}
            >
              {language === "zh" ? "完成" : "Done"}
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {modalContent}
      <div className="vault-panel glass-card">
      <div className="panel-header">
        <span className="panel-icon"><VaultIcon /></span>
        <h3 className="panel-title">{language === "zh" ? "无损失特工金库" : "No-Loss Scouting Vault"}</h3>
      </div>

      {!wallet.connected ? (
        <div className="vault-connect-message">
          <p>{language === "zh" ? "请连接钱包以访问无损失金库并赚取特工积分。" : "Please connect your wallet to access the No-Loss Vault and earn scout credits."}</p>
        </div>
      ) : (
        <div className="vault-content">
          {/* Credits Box */}
          <div className="credits-display glass-card">
            <div className="credits-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{language === "zh" ? "您的特工积分 (虚拟收益)" : "YOUR SCOUT CREDITS (VIRTUAL YIELD)"}</span>
              {multiplier > 1.0 && (
                <span className="badge badge-purple" style={{ fontSize: "0.65rem", padding: "2px 8px", background: "rgba(168, 85, 247, 0.2)", color: "#c084fc", border: "1px solid rgba(168, 85, 247, 0.4)", borderRadius: "10px" }}>
                  {language === "zh" ? `⚡ ${multiplier.toFixed(1)}倍加速已激活` : `⚡ ${multiplier.toFixed(1)}x Boost Active`}
                </span>
              )}
            </div>
            <div className="credits-value">{formattedCredits}</div>
            <div className="credits-sub">
              {language === "zh" ? (
                <>通过 Aave V3 以 <span className="text-green font-mono">{(5.0 * multiplier).toFixed(1)}% APY</span> 累计中</>
              ) : (
                <>Accumulating at <span className="text-green font-mono">{(5.0 * multiplier).toFixed(1)}% APY</span> via Aave V3</>
              )}
            </div>
          </div>

          {multiplier < 5.0 ? (
            <div style={{
              margin: "0 0 16px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              background: "rgba(168, 85, 247, 0.05)",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <span>
                {multiplier === 1.0 && (language === "zh" ? "⚡ 持有 10,000+ $PSAI 以激活收益翻倍加速 (最高 5.0倍)！" : "⚡ Hold 10,000+ $PSAI to activate a yield multiplier boost (up to 5.0x)!")}
                {multiplier === 1.5 && (language === "zh" ? "⚡ 持有 50,000 $PSAI 以升级为 2.0倍 特工专家收益！" : "⚡ Hold 50,000 $PSAI to upgrade to 2.0x Scout Specialist yield!")}
                {multiplier === 2.0 && (language === "zh" ? "⚡ 持有 250,000 $PSAI 以升级为 3.0倍 精英特工大师收益！" : "⚡ Hold 250,000 $PSAI to upgrade to 3.0x Elite Scout Master yield!")}
                {multiplier === 3.0 && (language === "zh" ? "⚡ 持有 1,000,000 $PSAI 以升级为 5.0倍 传奇总监收益！" : "⚡ Hold 1,000,000 $PSAI to upgrade to 5.0x Legendary Director yield!")}
              </span>
              <a 
                href="https://web3.okx.com/dex-swap?chain=x-layer,x-layer&token=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee,0xaef068ea820aafa00a2854bfd6cfab6d891ede5d"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#a855f7", fontWeight: "bold", textDecoration: "none" }}
              >
                {language === "zh" ? "购买 PSAI ↗" : "Buy PSAI ↗"}
              </a>
            </div>
          ) : (
            <div style={{
              margin: "0 0 16px",
              padding: "12px 16px",
              borderRadius: "10px",
              border: "1px solid rgba(34, 197, 94, 0.25)",
              background: "rgba(34, 197, 94, 0.05)",
              fontSize: "0.8rem",
              color: "#4ade80",
              fontWeight: "600",
              textAlign: "center"
            }}>
              {language === "zh" ? "👑 您已达到最高传奇总监级别！5.0倍收益翻倍加速已激活！" : "👑 You have reached the Maximum Legendary Director Tier! 5.0x Yield Boost Active!"}
            </div>
          )}

          {/* Staking Details */}
          <div className="staking-balances">
            <div className="balance-item">
              <span>{language === "zh" ? "您的质押余额:" : "Staked Balance:"}</span>
              <strong className="font-mono">{parseFloat(stakedBalance).toFixed(4)} USDT</strong>
            </div>
            <div className="balance-item">
              <span>{language === "zh" ? "钱包余额:" : "Wallet Balance:"}</span>
              <strong className="font-mono">{parseFloat(usdtBalance).toFixed(4)} USDT</strong>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--fg-dim)", marginBottom: "16px", lineHeight: "1.4", padding: "0 4px", display: "flex", alignItems: "flex-start", gap: "6px" }}>
            <span style={{ flexShrink: 0, marginTop: "2px" }}><InfoIcon /></span>
            <span>
              {language === "zh" ? (
                <>质押的 USDT 将自动存入 <strong>Aave V3</strong> 收益池以产生无风险利息，在此期间您可持续累积特工积分。</>
              ) : (
                <>Staked USDT is securely supplied to <strong>Aave V3</strong> yield pools under the hood to generate risk-free interest while you accumulate Scout Credits.</>
              )}
            </span>
          </div>

          {/* Yield Notice / Calculator */}
          <div style={{
            margin: "0 0 16px",
            padding: "12px 14px",
            borderRadius: "10px",
            border: "1px dashed rgba(59, 130, 246, 0.3)",
            background: "rgba(59, 130, 246, 0.03)",
            fontSize: "0.78rem",
            color: "var(--text-secondary)",
            lineHeight: "1.4"
          }}>
            <div style={{ fontWeight: "600", color: "#60a5fa", marginBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.9rem" }}>💡</span>
              <span>{language === "zh" ? "特工积分计算指南" : "Scout Credits Calculation Guide"}</span>
            </div>
            <div>
              {language === "zh" ? (
                <>
                  基本速率：每质押 <strong>1 USDT</strong> 每天可获得 <strong>{Math.round(200 * multiplier)} 积分</strong>（当前加速：{multiplier.toFixed(1)}倍）。
                  <br />
                  <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                    • 质押 <strong>10 USDT</strong> ➔ 约 {((200 * 10 * multiplier) / 24).toFixed(0)} 积分/小时（约 {((100 / (200 * 10 * multiplier / 1440))).toFixed(0)} 分钟可得 100 积分）
                    <br />
                    • 质押 <strong>100 USDT</strong> ➔ 约 {((200 * 100 * multiplier) / 24).toFixed(0)} 积分/小时（约 {((100 / (200 * 100 * multiplier / 1440))).toFixed(1)} 分钟可得 100 积分）
                  </span>
                </>
              ) : (
                <>
                  Base Rate: Stake <strong>1 USDT</strong> to earn <strong>{Math.round(200 * multiplier)} Credits/day</strong> (current boost: {multiplier.toFixed(1)}x).
                  <br />
                  <span style={{ color: "var(--text-dim)", fontSize: "0.72rem" }}>
                    • Stake <strong>10 USDT</strong> ➔ ~{((200 * 10 * multiplier) / 24).toFixed(0)} Credits/hr (~{((100 / (200 * 10 * multiplier / 1440))).toFixed(0)} mins to reach 100 Credits)
                    <br />
                    • Stake <strong>100 USDT</strong> ➔ ~{((200 * 100 * multiplier) / 24).toFixed(0)} Credits/hr (~{((100 / (200 * 100 * multiplier / 1440))).toFixed(1)} mins to reach 100 Credits)
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Staking Actions */}
          {(() => {
            const parsedDeposit = depositAmount ? parseFloat(depositAmount) : 0;
            const parsedStaked = parseFloat(stakedBalance);
            const exceedsBalance = !!(depositAmount && parsedDeposit > parseFloat(usdtBalance));
            const exceedsLimit = !!(depositAmount && parsedDeposit > 10);
            const totalWouldExceedLimit = !!(depositAmount && (parsedDeposit + parsedStaked) > 10);
            const isInvalidDeposit = exceedsBalance || exceedsLimit || totalWouldExceedLimit;
            
            const exceedsStaked = !!(withdrawAmount && parseFloat(withdrawAmount) > parsedStaked);

            return (
              <div className="staking-actions">
                <div style={{ marginBottom: "12px" }}>
                  <div className="action-row">
                    <input
                      className="panel-input font-mono"
                      type="text"
                      placeholder="0.0"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={loading}
                    />
                    {!isApproved ? (
                      <button className="btn btn-approve btn-panel" onClick={handleApprove} disabled={loading || isInvalidDeposit}>
                        {language === "zh" ? "授权" : "APPROVE"}
                      </button>
                    ) : (
                      <button className="btn btn-primary btn-panel" onClick={handleDeposit} disabled={loading || !depositAmount || isInvalidDeposit}>
                        {language === "zh" ? "质押" : "STAKE"}
                      </button>
                    )}
                  </div>
                  {exceedsBalance && (
                    <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", padding: "0 4px", fontWeight: "500", display: "flex", gap: "4px" }}>
                      <span>⚠️</span>
                      <span>{language === "zh" ? "余额不足！输入金额超过您的钱包余额。" : "Insufficient balance! Amount exceeds your wallet balance."}</span>
                    </div>
                  )}
                  {(exceedsLimit || totalWouldExceedLimit) && !exceedsBalance && (
                    <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", padding: "0 4px", fontWeight: "500", display: "flex", gap: "4px" }}>
                      <span>⚠️</span>
                      <span>{language === "zh" ? "第二阶段限制：最多只能质押 10 USDT。" : "Phase 2 Limit: You can stake a maximum of 10 USDT."}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="action-row">
                    <input
                      className="panel-input font-mono"
                      type="text"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={loading}
                    />
                    <button className="btn btn-panel" onClick={handleWithdraw} disabled={loading || !withdrawAmount || exceedsStaked}>
                      {language === "zh" ? "赎回" : "UNSTAKE"}
                    </button>
                  </div>
                  {exceedsStaked && (
                    <div style={{ color: "#ef4444", fontSize: "0.75rem", marginTop: "4px", padding: "0 4px", fontWeight: "500", display: "flex", gap: "4px" }}>
                      <span>⚠️</span>
                      <span>{language === "zh" ? "质押余额不足！输入金额超过您的质押余额。" : "Insufficient staked balance! Amount exceeds your staked balance."}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}



          {/* Delegation Section */}
          <div className="delegation-box glass-card">
            <div className="delegation-header" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RobotIcon />
              <strong>{language === "zh" ? "委托特工操盘" : "Delegate Scout Agent"}</strong>
            </div>
            <p className="delegation-desc">
              {language === "zh" ? "将您虚拟特工积分的支出权限委托给 AI 特工。该特工会实时监测世预赛及世界杯新闻并自动代您买入/卖出球员指数份额。" : "Delegate spending authority of your virtual Scout Credits to an AI Scout agent. The agent will monitor World Cup news and automatically buy/sell player shares on your behalf."}
            </p>

            <div className="delegation-select">
              <select
                className="panel-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                disabled={loading}
              >
                {dynamicAgentsList.map((agent) => (
                  <option key={agent.address} value={agent.address}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="delegation-status">
              <span>{language === "zh" ? "当前委托特工:" : "Current Delegate:"}</span>
              <strong className="font-mono text-blue">
                {delegatedAgent === ethers.ZeroAddress
                  ? (language === "zh" ? "无" : "None")
                  : dynamicAgentsList.find((a) => a.address.toLowerCase() === delegatedAgent.toLowerCase())?.name ||
                    `${delegatedAgent.slice(0, 10)}...`}
              </strong>
            </div>

            <button className="btn btn-primary btn-delegate" onClick={handleDelegate} disabled={loading}>
              {language === "zh" ? "确认委托" : "Confirm Delegation"}
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
