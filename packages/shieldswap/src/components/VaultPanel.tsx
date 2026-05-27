import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { motion } from "framer-motion";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";

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

interface VaultPanelProps {
  wallet: WalletState;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

export const VaultPanel: React.FC<VaultPanelProps> = ({ wallet, onActivityLog }) => {
  const DEPLOYED_ADDRESSES = wallet.chainId === 196
    ? ((STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || (STATIC_DEPLOYED_ADDRESSES as any).xlayerTestnet || STATIC_DEPLOYED_ADDRESSES)
    : ((STATIC_DEPLOYED_ADDRESSES as any).xlayerTestnet || STATIC_DEPLOYED_ADDRESSES);

  const isMainnet = wallet.chainId === 196;
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
    ? [{ name: `🤖 Active TEE Scout Agent (${activeAgentAddress.slice(0, 6)}...${activeAgentAddress.slice(-4)})`, address: activeAgentAddress }]
    : [{ name: "Loading agent...", address: "" }];

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

        // Credits rate
        const rate = await vault.creditsPerTokenPerSecond();
        setCreditsRate(rate);

        // Initial credits
        const creds = await vault.getCredits(wallet.address);
        setCredits(creds);

        // Allowance
        const currentAllowance = await usdt.allowance(wallet.address, DEPLOYED_ADDRESSES.NoLossVault);
        setAllowance(currentAllowance);

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
    if (parseFloat(stakedBalance) <= 0) return;

    const interval = setInterval(() => {
      // Credits rate is credits per token per second (scaled by 1e12)
      // Credits earned per 100ms = balance * 0.1 * rate / 1e12
      const balanceRaw = ethers.parseUnits(stakedBalance, usdtDecimals);
      const earnedPerTick = (balanceRaw * creditsRate * 100n) / 1000n / 1000000000000n;
      setCredits((prev) => prev + earnedPerTick);
    }, 100);

    return () => clearInterval(interval);
  }, [stakedBalance, creditsRate, usdtDecimals]);

  // 3. Faucet claim
  const handleFaucet = async () => {
    if (!wallet.signer || !wallet.address) return;
    setLoading(true);
    setFaucetStatus("signing");
    addLog("Requesting 1000 Mock USDT from Faucet...");
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
      addLog(`Faucet TX sent: ${tx.hash.slice(0, 14)}... Waiting for confirmation...`);
      const receipt = await tx.wait();
      console.log("[Faucet] TX confirmed, status:", receipt?.status);
      if (receipt?.status === 1) {
        setFaucetStatus("success");
        addLog("✅ 1000 Mock USDT minted successfully!");
      } else {
        setFaucetStatus("error");
        addLog("❌ Faucet transaction reverted onchain.", "warning");
      }
      setRefreshKey((k) => k + 1);
      // Reset status after 3 seconds
      setTimeout(() => setFaucetStatus("idle"), 3000);
    } catch (err: any) {
      console.error("[Faucet] Error:", err);
      setFaucetStatus("error");
      addLog(`Faucet error: ${err.message}`, "warning");
      setTimeout(() => setFaucetStatus("idle"), 3000);
    } finally {
      setLoading(false);
    }
  };

  // 4. USDT Approval
  const handleApprove = async () => {
    if (!wallet.signer) return;
    setLoading(true);
    addLog("Approving NoLossVault to spend USDT...");
    try {
      const usdt = new ethers.Contract(DEPLOYED_ADDRESSES.MockUSDT, USDT_ABI, wallet.signer);
      const tx = await usdt.approve(DEPLOYED_ADDRESSES.NoLossVault, ethers.MaxUint256);
      await tx.wait();
      setAllowance(ethers.MaxUint256);
      addLog("✅ NoLossVault approved successfully!");
    } catch (err: any) {
      addLog(`Approval error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 5. Deposit
  const handleDeposit = async () => {
    if (!wallet.signer || !depositAmount) return;
    setLoading(true);
    addLog(`Depositing ${depositAmount} USDT into Vault...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);
      const tx = await vault.deposit(ethers.parseUnits(depositAmount, usdtDecimals));
      await tx.wait();
      addLog(`✅ Staked ${depositAmount} USDT successfully! Tx: ${tx.hash.slice(0, 14)}...`);
      setDepositAmount("");
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Stake", txHash: tx.hash, amount: depositAmount });
    } catch (err: any) {
      addLog(`Deposit error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 6. Withdraw
  const handleWithdraw = async () => {
    if (!wallet.signer || !withdrawAmount) return;
    setLoading(true);
    addLog(`Initiating unstake of ${withdrawAmount} USDT from Vault...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);

      // ── MAINNET FIX: Aave holds aToken balance that can be 1 unit less than
      //    the vault's stored user balance due to 6-decimal rounding.
      //    To prevent "execution reverted" from Aave, we cap the requested
      //    withdrawal to the vault's actual aToken holdings.
      let rawAmount = ethers.parseUnits(withdrawAmount, usdtDecimals);
      if (vaultATokenBalance > 0n && rawAmount > vaultATokenBalance) {
        rawAmount = vaultATokenBalance;
        addLog(`ℹ️ Capping withdrawal to ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT (Aave rounding adjustment)`);
      }

      const tx = await vault.withdraw(rawAmount);
      const receipt = await tx.wait();
      addLog(`✅ Unstaked ${ethers.formatUnits(rawAmount, usdtDecimals)} USDT successfully! Tx: ${tx.hash.slice(0, 14)}...`);
      setWithdrawAmount("");
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Unstake", txHash: tx.hash, amount: ethers.formatUnits(rawAmount, usdtDecimals) });
    } catch (err: any) {
      addLog(`Withdrawal error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // 7. Delegate Agent
  const handleDelegate = async () => {
    if (!wallet.signer) return;
    setLoading(true);
    addLog(`Delegating credit authority to scout agent: ${selectedAgent}...`);
    try {
      const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.signer);
      const tx = await vault.delegateAgent(selectedAgent);
      await tx.wait();
      addLog(`✅ Agent delegation completed! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Delegation", txHash: tx.hash });
    } catch (err: any) {
      addLog(`Delegation error: ${err.message}`, "warning");
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
            <div className="tx-modal-icon">✅</div>
            <h3 className="tx-modal-title">
              {txModal.type === "Stake" && `${txModal.amount} USDT Staked!`}
              {txModal.type === "Unstake" && `${txModal.amount} USDT Unstaked!`}
              {txModal.type === "Delegation" && "Agent Delegated!"}
            </h3>
            <p className="tx-modal-sub">
              Your transaction was confirmed on {isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.
            </p>
            <a
              href={`${explorerBase}${txModal.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-modal-link"
            >
              🔍 View Transaction on Explorer ↗
            </a>
            <button
              className="btn btn-primary tx-modal-close"
              onClick={() => setTxModal(m => ({ ...m, visible: false }))}
            >
              Done
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
        <span className="panel-icon">🏦</span>
        <h3 className="panel-title">No-Loss Scouting Vault</h3>
      </div>

      {!wallet.connected ? (
        <div className="vault-connect-message">
          <p>Please connect your wallet to access the No-Loss Vault and earn scout credits.</p>
        </div>
      ) : (
        <div className="vault-content">
          {/* Credits Box */}
          <div className="credits-display glass-card">
            <div className="credits-title">YOUR SCOUT CREDITS (VIRTUAL YIELD)</div>
            <div className="credits-value">{formattedCredits}</div>
            <div className="credits-sub">
              Accumulating at <span className="text-green font-mono">5% APY</span> (Simulated Fast APY)
            </div>
          </div>

          {/* Staking Details */}
          <div className="staking-balances">
            <div className="balance-item">
              <span>Staked Balance:</span>
              <strong className="font-mono">{stakedBalance} USDT</strong>
            </div>
            <div className="balance-item">
              <span>Wallet Balance:</span>
              <strong className="font-mono">{parseFloat(usdtBalance).toFixed(2)} USDT</strong>
            </div>
          </div>

          <div style={{ fontSize: "0.75rem", color: "var(--fg-dim)", marginBottom: "16px", lineHeight: "1.4", padding: "0 4px" }}>
            ℹ️ Staked USDT is securely supplied to <strong>Aave V3</strong> yield pools under the hood to generate risk-free interest while you accumulate Scout Credits.
          </div>

          {/* Staking Actions */}
          <div className="staking-actions">
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
                <button className="btn btn-approve btn-panel" onClick={handleApprove} disabled={loading}>
                  Approve USDT
                </button>
              ) : (
                <button className="btn btn-primary btn-panel" onClick={handleDeposit} disabled={loading || !depositAmount}>
                  Stake USDT
                </button>
              )}
            </div>

            <div className="action-row">
              <input
                className="panel-input font-mono"
                type="text"
                placeholder="0.0"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={loading}
              />
              <button className="btn btn-panel" onClick={handleWithdraw} disabled={loading || !withdrawAmount}>
                Unstake USDT
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '8px 0' }}>
            {wallet.chainId !== 196 && (
              <button 
                className="btn btn-faucet" 
                onClick={handleFaucet} 
                disabled={loading || faucetStatus === "confirming"} 
                style={{ 
                  width: '100%', 
                  fontSize: '0.8rem', 
                  padding: '8px 12px',
                  ...(faucetStatus === "success" ? { background: 'rgba(0, 255, 136, 0.2)', borderColor: 'rgba(0, 255, 136, 0.4)', color: '#00ff88' } : {}),
                  ...(faucetStatus === "error" ? { background: 'rgba(255, 59, 92, 0.2)', borderColor: 'rgba(255, 59, 92, 0.4)', color: '#ff3b5c' } : {}),
                }}
              >
                {faucetStatus === "signing" && "✍️ Sign in Wallet..."}
                {faucetStatus === "confirming" && "⏳ Confirming onchain..."}
                {faucetStatus === "success" && "✅ 1,000 USDT Claimed!"}
                {faucetStatus === "error" && "❌ Claim Failed - Try Again"}
                {faucetStatus === "idle" && "🚰 Claim 1,000 Mock USDT (Testnet Faucet)"}
              </button>
            )}
            {wallet.chainId === 1952 && (
              <a 
                href="https://www.okx.com/explorer/xlayer-test" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: 'var(--accent-blue)', textDecoration: 'underline', textAlign: 'center' }}
              >
                ⚓ Need Gas? Get XLayer Testnet OKB here
              </a>
            )}
          </div>

          {/* Delegation Section */}
          <div className="delegation-box glass-card">
            <div className="delegation-header">
              <span>🤖</span>
              <strong>Delegate Scout Agent</strong>
            </div>
            <p className="delegation-desc">
              Delegate spending authority of your virtual Scout Credits to an AI Scout agent. The agent will monitor World Cup news and automatically buy/sell player shares on your behalf.
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
              <span>Current Delegate:</span>
              <strong className="font-mono text-blue">
                {delegatedAgent === ethers.ZeroAddress
                  ? "None"
                  : dynamicAgentsList.find((a) => a.address.toLowerCase() === delegatedAgent.toLowerCase())?.name ||
                    `${delegatedAgent.slice(0, 10)}...`}
              </strong>
            </div>

            <button className="btn btn-primary btn-delegate" onClick={handleDelegate} disabled={loading}>
              Confirm Delegation
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
