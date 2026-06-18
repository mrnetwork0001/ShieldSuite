import React, { useState, useEffect } from "react";
import { TrophyIcon, ClockIcon, GreenDotIcon, FlagIcon, DumbbellIcon, GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from "./Icons";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";
import STATIC_DEPLOYED_ADDRESSES from "../deployed-addresses.json";

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
  const isMainnet = true;
  const DEPLOYED_ADDRESSES = (STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || STATIC_DEPLOYED_ADDRESSES;

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

        const userAddresses = new Set<string>(cachedStakers);
        
        // Always include default participants to ensure leaderboard layout is full
        if (wallet.address) userAddresses.add(wallet.address);
        if (DEPLOYED_ADDRESSES.deployer) userAddresses.add(DEPLOYED_ADDRESSES.deployer);
        
        // Scan blocks to discover recent stakers/deposits.
        // Limit query block range lookback to 99 blocks to comply with XLayer RPC strict limits.
        const currentBlock = await wallet.provider!.getBlockNumber();
        const lookback = 99;
        const startBlock = Math.max(0, currentBlock - lookback);
        
        const depositFilter = vault.filters.Deposited();
        const depositEvents = await vault.queryFilter(depositFilter, startBlock, currentBlock).catch(() => []);
        
        for (const event of depositEvents) {
          const user = (event as any).args[0];
          if (user) userAddresses.add(user);
        }

        const delegateFilter = vault.filters.AgentDelegated();
        const delegateEvents = await vault.queryFilter(delegateFilter, startBlock, currentBlock).catch(() => []);
        for (const event of delegateEvents) {
          const user = (event as any).args[0];
          if (user) userAddresses.add(user);
        }
        
        // 2. Fetch stats for each user address dynamically from the active contract
        let totalVaultStaked = await vault.totalStaked().catch(() => 0n);
        const usdtDecimals = isMainnet ? 6 : 18;
        
        const managers = await Promise.all(
          Array.from(userAddresses).map(async (addr) => {
            try {
              const userInfo = await vault.users(addr);
              const credits = await vault.getCredits(addr);
              
              return {
                address: addr,
                staked: userInfo.balance,
                credits: credits
              };
            } catch (err) {
              return { address: addr, staked: 0n, credits: 0n };
            }
          })
        );

        // Save active stakers (who have staked balance or accumulated credits) back to localStorage
        const activeAddresses = managers
          .filter((m) => m.staked > 0n || m.credits > 0n)
          .map((m) => m.address);
          
        try {
          localStorage.setItem(storageKey, JSON.stringify(activeAddresses));
        } catch (e) {
          console.error("Failed to save stakers to localStorage", e);
        }

        // Fallback: if totalStaked() returned 0 but users have balances, compute from sum
        if (totalVaultStaked === 0n) {
          totalVaultStaked = managers.reduce((sum, m) => sum + (m.staked || 0n), 0n);
        }
        
        // 3. Sort by credits descending
        const sorted = managers.sort((a, b) => {
          if (b.credits > a.credits) return 1;
          if (b.credits < a.credits) return -1;
          return 0;
        });
        
        // 4. Map to display formats
        const mapped = sorted.map((item, index) => {
          let name = `Scout Manager #${index + 1}`;
          
          if (item.address.toLowerCase() === DEPLOYED_ADDRESSES.deployer.toLowerCase()) {
            name = "Deployer Admin";
          } else if (wallet.address && item.address.toLowerCase() === wallet.address.toLowerCase()) {
            name = "You";
          }
          
          let sharePercent = "0%";
          if (totalVaultStaked > 0n) {
            const pct = (item.staked * 10000n) / totalVaultStaked; // basis points for precision
            sharePercent = (Number(pct) / 100).toFixed(1) + "%";
          }
            
          return {
            rank: index + 1,
            address: item.address,
            name: name,
            credits: parseFloat(ethers.formatEther(item.credits)).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            portfolio: parseFloat(ethers.formatUnits(item.staked, usdtDecimals)).toFixed(2) + " USDT",
            share: sharePercent
          };
        });
        
        // Limit to top 5 managers for premium design aesthetic
        setLeaderboard(mapped.slice(0, 5));
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
          Global Scout Leaderboard ({isMainnet ? "Mainnet" : "Testnet Sandbox"})
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
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#fff' }}>
            {campaignTime.phase === 'pre' ? '<ClockIcon /> Campaign Starts In' : campaignTime.phase === 'live' ? '<GreenDotIcon /> Campaign LIVE - Ends In' : '<FlagIcon /> Campaign Ended'}
          </span>
          <span style={{
            fontSize: '0.62rem', fontWeight: '700', padding: '2px 10px', borderRadius: '20px',
            background: campaignTime.phase === 'live' ? 'rgba(0,255,136,0.12)' : 'rgba(255,215,0,0.1)',
            color: campaignTime.phase === 'live' ? '#00ff88' : '#FFD700',
            border: `1px solid ${campaignTime.phase === 'live' ? 'rgba(0,255,136,0.3)' : 'rgba(255,215,0,0.25)'}`,
          }}>
            {isMainnet ? 'SEASON 1 · GROUP STAGE' : 'PRE-SEASON WARM-UP'}
          </span>
        </div>

        {/* Countdown Timer */}
        {campaignTime.phase !== 'ended' && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            {[
              { v: campaignTime.days, l: 'D' },
              { v: campaignTime.hours, l: 'H' },
              { v: campaignTime.minutes, l: 'M' },
              { v: campaignTime.seconds, l: 'S' },
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
              <strong style={{ color: '#FFD700', display: "inline-flex", alignItems: "center", gap: "4px" }}><TrophyIcon size={14} style={{ marginRight: 0 }} /> Prize Pool:</strong> 100% of Aave V3 USDT yield generated by all deposits during the 2-week campaign.
              Top managers by Scout Credits win proportional shares. <strong style={{ color: '#fff' }}>Deposits are fully returnable - no loss.</strong>
            </>
          ) : (
            <>
              <strong style={{ color: 'var(--accent-blue)', display: "inline-flex", alignItems: "center", gap: "4px" }}><DumbbellIcon size={14} style={{ marginRight: 0 }} /> Pre-Season Campaign:</strong> Practice the full flow with testnet USDT before World Cup kicks off.
              Top the leaderboard here to warm up - <strong style={{ color: '#fff' }}>mainnet Season 1 goes live on June 11!</strong>
            </>
          )}
        </div>
      </div>

      {loading && leaderboard.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.8rem", padding: "20px" }}>
          ⏳ Scanning {isMainnet ? "Mainnet" : "Testnet"} blocks for participants...
        </div>
      ) : (
        <div className="leaderboard-table" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div className="table-header" style={{ display: "grid", gridTemplateColumns: "0.55fr 2fr 1.65fr 1.1fr", fontSize: "0.72rem", color: "var(--text-tertiary)", fontWeight: "700", textTransform: "uppercase", paddingBottom: "8px", borderBottom: "1px solid var(--border-default)" }}>
            <span>Rank</span>
            <span>Manager</span>
            <span style={{ textAlign: "right" }}>Scout Credits</span>
            <span style={{ textAlign: "right" }}>Staked / Share</span>
          </div>

          {leaderboard.map((item) => {
            const isCurrentUser = wallet.address && item.address.toLowerCase() === wallet.address.toLowerCase();
            
            return (
              <div 
                key={item.rank} 
                className="leaderboard-row" 
                style={{ 
                  display: "grid", 
                  gridTemplateColumns: "0.55fr 2fr 1.65fr 1.1fr", 
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
                  <span style={{ fontWeight: "600", color: isCurrentUser ? "var(--accent-safe)" : "#fff" }}>
                    {item.name} {isCurrentUser && "(You)"}
                  </span>
                  <span className="font-mono" style={{ fontSize: "0.68rem", color: "var(--text-tertiary)" }}>
                    {item.address.slice(0, 6)}...{item.address.slice(-4)}
                  </span>
                </span>
                <span className="font-mono" style={{ textAlign: "right", color: "var(--accent-safe)", fontWeight: "600" }}>
                  {item.credits}
                </span>
                <span className="font-mono" style={{ textAlign: "right", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "1px", fontSize: "0.75rem" }}>
                  <span>{item.portfolio}</span>
                  <span style={{ fontSize: "0.65rem", color: "var(--text-tertiary)" }}>Share: {item.share}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
