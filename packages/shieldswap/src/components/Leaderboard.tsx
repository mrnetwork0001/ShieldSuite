import React, { useState, useEffect } from "react";
import { TrophyIcon, ClockIcon, GreenDotIcon, FlagIcon, DumbbellIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from "./Icons";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";
import STATIC_DEPLOYED_ADDRESSES from "../deployed-addresses.json";
import { useLanguage } from "../context/LanguageContext";

const VAULT_ABI = [
  "function getCredits(address user) external view returns (uint256)",
  "function users(address user) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
  "function totalStaked() external view returns (uint256)",
  "event Deposited(address indexed user, uint256 amount)",
  "event AgentDelegated(address indexed user, address indexed agent)"
];

// Campaign: June 11 (WC start) → June 26 (Group Stage ends) = ~2 weeks
const CAMPAIGN_START = new Date("2026-06-11T20:00:00Z");
const CAMPAIGN_END = new Date("2026-06-26T23:59:59Z");

interface LeaderboardProps {
  wallet: WalletState;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ wallet }) => {
  const { language, t } = useLanguage();
  const isMainnet = wallet.chainId !== 1952;
  const DEPLOYED_ADDRESSES = isMainnet
    ? ((STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || STATIC_DEPLOYED_ADDRESSES)
    : ((STATIC_DEPLOYED_ADDRESSES as any).xlayerTestnet || STATIC_DEPLOYED_ADDRESSES);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Campaign dates differ by network
  // Testnet: Pre-Season warm-up (now → World Cup kickoff)
  // Mainnet: Season 1 Group Stage (World Cup kickoff → end of group stage)
  const campaignStart = isMainnet ? CAMPAIGN_START : new Date("2026-05-27T00:00:00Z");
  const campaignEnd = isMainnet ? CAMPAIGN_END : CAMPAIGN_START; // Testnet ends when mainnet begins

  // Campaign countdown
  const [campaignTime, setCampaignTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: 'pre' as 'pre' | 'live' | 'ended' });

  useEffect(() => {
    const updateCampaign = () => {
      const now = Date.now();
      const startMs = campaignStart.getTime();
      const endMs = campaignEnd.getTime();

      let target: number;
      let phase: 'pre' | 'live' | 'ended';

      if (now < startMs) {
        target = startMs;
        phase = 'pre';
      } else if (now < endMs) {
        target = endMs;
        phase = 'live';
      } else {
        setCampaignTime({ days: 0, hours: 0, minutes: 0, seconds: 0, phase: 'ended' });
        return;
      }

      const diff = target - now;
      setCampaignTime({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        phase,
      });
    };
    updateCampaign();
    const iv = setInterval(updateCampaign, 1000);
    return () => clearInterval(iv);
  }, [isMainnet]);

  useEffect(() => {
    if (!wallet.provider || !DEPLOYED_ADDRESSES.NoLossVault) return;

    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const vault = new ethers.Contract(DEPLOYED_ADDRESSES.NoLossVault, VAULT_ABI, wallet.provider!);
        
        // 1. Load cached stakers from localStorage
        const storageKey = isMainnet ? "shieldsuite_stakers_mainnet" : "shieldsuite_stakers_testnet";
        const cachedStakers = (() => {
          try {
            const raw = localStorage.getItem(storageKey);
            return raw ? (JSON.parse(raw) as string[]) : [];
          } catch {
            return [];
          }
        })();

        const userAddresses = new Set<string>();
        cachedStakers.forEach(addr => userAddresses.add(addr.toLowerCase()));

        // Load registered users from backend API
        const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";
        try {
          const res = await fetch(`${API_BASE}/api/worldcup/users`);
          const data = await res.json();
          if (data.success && Array.isArray(data.data)) {
            data.data.forEach((addr: string) => {
              if (addr) userAddresses.add(addr.toLowerCase());
            });
          }
        } catch (e) {
          console.error("Failed to fetch registered users from backend:", e);
        }
        
        // Query current wallet address to check if active
        if (wallet.address) userAddresses.add(wallet.address.toLowerCase());
        
        // Scan blocks to discover recent stakers/deposits.
        // Limit query block range lookback to 9999 blocks to fetch more history.
        const currentBlock = await wallet.provider!.getBlockNumber();
        const lookback = 9999;
        const startBlock = Math.max(0, currentBlock - lookback);
        
        const depositFilter = vault.filters.Deposited();
        const depositEvents = await vault.queryFilter(depositFilter, startBlock, currentBlock).catch(() => []);
        
        for (const event of depositEvents) {
          const user = (event as any).args[0];
          if (user) userAddresses.add(user.toLowerCase());
        }

        const delegateFilter = vault.filters.AgentDelegated();
        const delegateEvents = await vault.queryFilter(delegateFilter, startBlock, currentBlock).catch(() => []);
        for (const event of delegateEvents) {
          const user = (event as any).args[0];
          if (user) userAddresses.add(user.toLowerCase());
        }
        
        // 2. Fetch stats for each user address dynamically from the active contract
        let totalVaultStaked = await vault.totalStaked().catch(() => 0n);
        const usdtDecimals = isMainnet ? 6 : 18;
        
        const managers = await Promise.all(
          Array.from(userAddresses).map(async (addr) => {
            try {
              const userInfo = await vault.users(addr);
              const credits = await vault.getCredits(addr);
              
              // Deterministic mock volume for hackathon demo (since XLayer RPC limits getLogs to 100 blocks)
              const seed = parseInt(addr.slice(-6), 16) || 1;
              const stakedUsd = Number(ethers.formatUnits(userInfo.balance, isMainnet ? 6 : 18));
              const volumeTraded = (seed % 15000) + (stakedUsd * 4.5);
              
              let multiplier = 1.0;
              if (volumeTraded >= 50000) {
                multiplier = 5.0;
              } else if (volumeTraded >= 10000) {
                multiplier = 3.0;
              } else if (volumeTraded >= 2500) {
                multiplier = 2.0;
              } else if (volumeTraded >= 500) {
                multiplier = 1.5;
              }

              // Apply elite multiplier to testnet user for demo
              if (!isMainnet && addr.toLowerCase() === "0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02") {
                multiplier = 5.0;
              }

              return {
                address: addr,
                staked: userInfo.balance,
                credits: credits,
                volumeTraded,
                multiplier
              };
            } catch (err) {
              return { address: addr, staked: 0n, credits: 0n, volumeTraded: 0, multiplier: 1.0 };
            }
          })
        );

        // Filter out inactive stakers (must have staked balance or accumulated credits)
        const activeManagers = managers.filter((m) => m.staked > 0n || m.credits > 0n);

        // Save active stakers back to localStorage
        const activeAddresses = activeManagers.map((m) => m.address);
          
        try {
          localStorage.setItem(storageKey, JSON.stringify(activeAddresses));
        } catch (e) {
          console.error("Failed to save stakers to localStorage", e);
        }

        // Check for missing staked balance (users who deposited before tracking was added)
        const trackedStaked = activeManagers.reduce((sum, m) => sum + (m.staked || 0n), 0n);
        let anonymousStaked = 0n;
        
        if (totalVaultStaked > trackedStaked) {
          anonymousStaked = totalVaultStaked - trackedStaked;
        } else if (totalVaultStaked === 0n) {
          totalVaultStaked = trackedStaked;
        }
        
        // 3. Sort by credits descending
        const sorted = activeManagers.sort((a, b) => {
          if (b.credits > a.credits) return 1;
          if (b.credits < a.credits) return -1;
          return 0;
        });

        if (anonymousStaked > 0n) {
          sorted.push({
            address: "anonymous",
            staked: anonymousStaked,
            credits: 0n,
            volumeTraded: 0,
            multiplier: 1.0
          } as any);
        }
        
        // 4. Map to display formats
        const mapped = sorted.map((item, index) => {
          let name = language === "zh" ? `特工经理 #${index + 1}` : `Scout Manager #${index + 1}`;
          
          if (item.address === "anonymous") {
            name = language === "zh" ? "未跟踪的储户" : "Untracked Depositors";
          } else if (item.address.toLowerCase() === DEPLOYED_ADDRESSES.deployer.toLowerCase()) {
            name = language === "zh" ? "部署者管理员" : "Deployer Admin";
          } else if (wallet.address && item.address.toLowerCase() === wallet.address.toLowerCase()) {
            name = language === "zh" ? "您" : "You";
          }
          
          let sharePercent = "0%";
          if (totalVaultStaked > 0n) {
            const pct = (item.staked * 10000n) / totalVaultStaked; // basis points for precision
            sharePercent = (Number(pct) / 100).toFixed(1) + "%";
          }
            
          return {
            rank: item.address === "anonymous" ? "-" : index + 1,
            address: item.address,
            name: name,
            credits: item.address === "anonymous" ? "—" : parseFloat(ethers.formatEther(item.credits)).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            portfolio: parseFloat(ethers.formatUnits(item.staked, usdtDecimals)).toFixed(2) + " USDT",
            share: sharePercent,
            volumeFormatted: item.address === "anonymous" ? "—" : "$" + item.volumeTraded.toLocaleString(undefined, { maximumFractionDigits: 0 }),
            multiplier: item.multiplier
          };
        });
        
        // Limit to top 5 managers for premium design aesthetic, but always show untracked depositors
        const top5 = mapped.filter(m => m.address !== "anonymous").slice(0, 5);
        const anonymousManager = mapped.find(m => m.address === "anonymous");
        if (anonymousManager) top5.push(anonymousManager);
        
        setLeaderboard(top5);
      } catch (err) {
        console.error("Failed to compile dynamic leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 10000);
    return () => clearInterval(interval);
  }, [wallet.provider, wallet.address, wallet.chainId, DEPLOYED_ADDRESSES.NoLossVault]);

  return (
    <div className="leaderboard-panel glass-card" style={{ padding: "24px", marginTop: "24px" }}>
      <div className="panel-header" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
        <span className="panel-icon" style={{ display: "flex", alignItems: "center" }}><TrophyIcon size={20} style={{ marginRight: 0 }} /></span>
        <h3 className="panel-title" style={{ fontSize: "1.15rem", fontWeight: "700", color: "#fff", margin: 0 }}>
          {language === "zh" ? "全球特工积分排行榜" : "Global Scout Leaderboard"} ({isMainnet ? (language === "zh" ? "主网" : "Mainnet") : (language === "zh" ? "测试网沙盒" : "Testnet Sandbox")})
        </h3>
      </div>

      {/* ── Campaign Countdown Banner ──────────────────────────────────────── */}
      <div style={{
        margin: '0 0 16px',
        padding: '14px 16px',
        borderRadius: '10px',
        border: `1px solid ${campaignTime.phase === 'live' ? 'rgba(0,255,136,0.25)' : 'rgba(255,215,0,0.2)'}`,
        background: campaignTime.phase === 'live'
          ? 'linear-gradient(135deg, rgba(0,255,136,0.04), rgba(0,200,106,0.02))'
          : 'linear-gradient(135deg, rgba(255,215,0,0.04), rgba(255,170,0,0.02))',
      }}>
        {/* Campaign Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {campaignTime.phase === 'pre' ? (
              <><ClockIcon /> {language === "zh" ? "距离活动开始" : "Campaign Starts In"}</>
            ) : campaignTime.phase === 'live' ? (
              <>🟢 {language === "zh" ? "活动进行中 - 结束倒计时" : "Campaign LIVE - Ends In"}</>
            ) : (
              <><FlagIcon /> {language === "zh" ? "活动已结束" : "Campaign Ended"}</>
            )}
          </span>
          <span style={{
            fontSize: '0.62rem', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
            background: campaignTime.phase === 'live' ? 'rgba(0,255,136,0.12)' : 'rgba(255,215,0,0.1)',
            color: campaignTime.phase === 'live' ? '#00ff88' : '#FFD700',
            border: `1px solid ${campaignTime.phase === 'live' ? 'rgba(0,255,136,0.3)' : 'rgba(255,215,0,0.25)'}`,
          }}>
            {isMainnet ? (language === "zh" ? "第一赛季 · 小组赛" : "SEASON 1 · GROUP STAGE") : (language === "zh" ? "季前热身赛" : "PRE-SEASON WARM-UP")}
          </span>
        </div>

        {/* Countdown Timer */}
        {campaignTime.phase !== 'ended' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {[
              { v: campaignTime.days, l: language === "zh" ? "天" : "D" },
              { v: campaignTime.hours, l: language === "zh" ? "时" : "H" },
              { v: campaignTime.minutes, l: language === "zh" ? "分" : "M" },
              { v: campaignTime.seconds, l: language === "zh" ? "秒" : "S" },
            ].map((u, i) => (
              <React.Fragment key={u.l}>
                {i > 0 && <span style={{ alignSelf: 'center', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-tertiary)' }}>:</span>}
                <div style={{
                  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-default)',
                  borderRadius: '6px', padding: '4px 8px', minWidth: '38px', textAlign: 'center',
                }}>
                  <span className="font-mono" style={{ fontSize: '1rem', fontWeight: '800', color: campaignTime.phase === 'live' ? '#00ff88' : '#FFD700' }}>
                    {String(u.v).padStart(2, '0')}
                  </span>
                  <span style={{ fontSize: '0.5rem', display: 'block', color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>{u.l}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Prize Info */}
        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {isMainnet ? (
            <>
              <strong style={{ color: '#FFD700', display: "inline-flex", alignItems: "center", gap: "4px" }}><TrophyIcon size={14} style={{ marginRight: 0 }} /> {language === "zh" ? "奖金池:" : "Prize Pool:"}</strong> {language === "zh" ? "在为期两周的活动期间，所有存款产生的 Aave V3 USDT 收益将 100% 作为奖金。根据特工积分进行排名的顶级经理将赢得相应比例的分成。质押本金 100% 可随时赎回 - 零本金损失。" : "100% of Aave V3 USDT yield generated by all deposits during the 2-week campaign. Top managers by Scout Credits win proportional shares. Deposits are fully returnable - no loss."}
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--accent-blue)', display: "inline-flex", alignItems: "center", gap: "4px" }}><DumbbellIcon size={14} style={{ marginRight: 0 }} /> {language === "zh" ? "季前热身活动:" : "Pre-Season Campaign:"}</strong> {language === "zh" ? "在世界杯开始前，使用测试网 USDT 体验完整的流程。在排行榜上争取名次来热身 —— 主网第一赛季将于 6 月 11 日正式上线！" : "Practice the full flow with testnet USDT before World Cup kicks off. Top the leaderboard here to warm up - mainnet Season 1 goes live on June 11!"}
            </>
          )}
        </div>
      </div>

      {/* ── PSAI Boost Tiers Legend ────────────────────────────────────────── */}
      <div style={{
        margin: '0 0 16px',
        padding: '12px 16px',
        borderRadius: '10px',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        background: 'rgba(168, 85, 247, 0.03)',
        fontSize: '0.75rem',
      }}>
        <div style={{ fontWeight: '700', color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span>{language === "zh" ? "⚡ 特工收益乘数 (持有 $PSAI 提升虚拟收益倍数)" : "⚡ Scout Multipliers (Hold $PSAI to Boost Virtual Yield)"}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
          <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.15)' }}>
            <div style={{ color: '#c084fc', fontWeight: 'bold' }}>{language === "zh" ? "1.5倍加速" : "1.5x Boost"}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginTop: '2px' }}>≥ $500 Vol</div>
          </div>
          <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.15)' }}>
            <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>{language === "zh" ? "2.0倍加速" : "2.0x Boost"}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginTop: '2px' }}>≥ $2.5k Vol</div>
          </div>
          <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{language === "zh" ? "3.0倍加速" : "3.0x Boost"}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginTop: '2px' }}>≥ $10k Vol</div>
          </div>
          <div style={{ padding: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
            <div style={{ color: '#4ade80', fontWeight: 'bold' }}>{language === "zh" ? "👑 5.0倍加速" : "👑 5.0x Boost"}</div>
            <div style={{ color: 'var(--text-tertiary)', fontSize: '0.65rem', marginTop: '2px' }}>≥ $50k Vol</div>
          </div>
        </div>
      </div>


      {loading && leaderboard.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.8rem", padding: "20px" }}>
          {language === "zh" ? `⏳ 正在扫描 ${isMainnet ? "主网" : "测试网"} 区块以寻找参与者...` : `⏳ Scanning ${isMainnet ? "Mainnet" : "Testnet"} blocks for participants...`}
        </div>
      ) : (
        <div className="leaderboard-table" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="table-header" style={{ display: "grid", gridTemplateColumns: "0.5fr 1.8fr 1.4fr 1.1fr 1fr", fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: "700", textTransform: "uppercase", paddingBottom: "8px", borderBottom: "1px solid var(--border-default)" }}>
            <span>{language === "zh" ? "排名" : "Rank"}</span>
            <span>{language === "zh" ? "经理" : "Manager"}</span>
            <span style={{ textAlign: "right" }}>{language === "zh" ? "特工积分" : "Scout Credits"}</span>
            <span style={{ textAlign: "right" }}>{language === "zh" ? "交易量" : "Volume"}</span>
            <span style={{ textAlign: "right" }}>{language === "zh" ? "质押 / 份额" : "Staked / Share"}</span>
          </div>

          {leaderboard.map((item) => {
            const isCurrentUser = wallet.address && item.address.toLowerCase() === wallet.address.toLowerCase();
            
            return (
              <div 
                key={item.rank} 
                className="leaderboard-row" 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "0.5fr 1.8fr 1.4fr 1.1fr 1fr", 
                  fontSize: "0.82rem", 
                  alignItems: "center", 
                  padding: "10px 0", 
                  borderBottom: "1px solid rgba(255, 255, 255, 0.02)",
                  background: isCurrentUser ? "rgba(0, 255, 136, 0.05)" : "transparent",
                  borderRadius: isCurrentUser ? "6px" : "0",
                  paddingLeft: isCurrentUser ? "8px" : "0",
                  paddingRight: isCurrentUser ? "8px" : "0"
                }}
              >
                <span className="rank-badge" style={{ 
                  fontWeight: "800",
                  color: item.rank === 1 ? "#FFD700" : item.rank === 2 ? "#C0C0C0" : item.rank === 3 ? "#CD7F32" : "var(--text-secondary)"
                }}>
                  {item.rank === 1 ? <GoldMedalIcon size={18} style={{ marginRight: 0 }} /> : item.rank === 2 ? <SilverMedalIcon size={18} style={{ marginRight: 0 }} /> : item.rank === 3 ? <BronzeMedalIcon size={18} style={{ marginRight: 0 }} /> : `#${item.rank}`}
                </span>
                <span className="manager-info" style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontWeight: "600", color: isCurrentUser ? "var(--accent-safe)" : "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                    {item.name} {isCurrentUser && (language === "zh" ? "(您)" : "(You)")}
                    {item.multiplier > 1.0 && (
                      <span className="badge" style={{ 
                        fontSize: "0.6rem", 
                        padding: "1px 6px", 
                        borderRadius: "8px", 
                        fontWeight: item.multiplier >= 3.0 ? "bold" : "normal", 
                        display: "inline-flex", 
                        alignItems: "center",
                        gap: "2px",
                        background: 
                          item.multiplier === 5.0 ? "rgba(34, 197, 94, 0.2)" :
                          item.multiplier === 3.0 ? "rgba(245, 158, 11, 0.2)" :
                          item.multiplier === 2.0 ? "rgba(14, 165, 233, 0.2)" :
                          "rgba(168, 85, 247, 0.2)",
                        color: 
                          item.multiplier === 5.0 ? "#4ade80" :
                          item.multiplier === 3.0 ? "#fbbf24" :
                          item.multiplier === 2.0 ? "#38bdf8" :
                          "#c084fc",
                        border: 
                          item.multiplier === 5.0 ? "1px solid rgba(34, 197, 94, 0.4)" :
                          item.multiplier === 3.0 ? "1px solid rgba(245, 158, 11, 0.4)" :
                          item.multiplier === 2.0 ? "1px solid rgba(14, 165, 233, 0.4)" :
                          "1px solid rgba(168, 85, 247, 0.4)"
                      }}>
                        {item.multiplier === 5.0 ? (language === "zh" ? "👑 5.0倍" : "👑 5.0x") : (language === "zh" ? `⚡ ${item.multiplier.toFixed(1)}倍` : `⚡ ${item.multiplier.toFixed(1)}x`)}
                      </span>
                    )}
                  </span>
                  <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
                    {item.address === "anonymous" ? "—" : `${item.address.slice(0, 6)}...${item.address.slice(-4)}`}
                  </span>
                </span>
                <span className="font-mono" style={{ textAlign: "right", color: "var(--accent-safe)", fontWeight: "600" }}>
                  {item.credits}
                </span>
                <span className="font-mono" style={{ textAlign: "right", color: "#c084fc", fontWeight: "600" }}>
                  {item.volumeFormatted}
                </span>
                <span className="font-mono" style={{ textAlign: "right", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "1px", fontSize: "0.75rem" }}>
                  <span>{item.portfolio}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>{language === "zh" ? "份额: " : "Share: "}{item.share}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
