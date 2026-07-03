import React, { useState, useEffect } from "react";
import { GoldMedalIcon, SilverMedalIcon, BronzeMedalIcon } from "./Icons";
import { WalletState } from "../lib/wallet";
import { useLanguage } from "../context/LanguageContext";

interface VolumeLeaderboardProps {
  wallet: WalletState;
}

export const VolumeLeaderboard: React.FC<VolumeLeaderboardProps> = ({ wallet }) => {
  const { language } = useLanguage();
  const tLocal = (en: string, zh: string) => (language === "zh" ? zh : en);

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignStart, setCampaignStart] = useState<number>(1782385200000);
  const [campaignEnd, setCampaignEnd] = useState<number>(1782990000000);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    status: "PRESTART" | "ACTIVE" | "ENDED";
  } | null>(null);

  const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "http://localhost:3402";

  const fetchVolumeLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/worldcup/leaderboard`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        // Sort by volume descending
        const sorted = json.data.sort((a: any, b: any) => b.volume - a.volume);
        setLeaderboard(sorted);
        if (json.campaignStart) setCampaignStart(json.campaignStart);
        if (json.campaignEnd) setCampaignEnd(json.campaignEnd);
      }
    } catch (err) {
      console.error("Failed to fetch volume leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolumeLeaderboard();
    const interval = setInterval(fetchVolumeLeaderboard, 15000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      
      if (now < campaignStart) {
        const diff = campaignStart - now;
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          status: "PRESTART" as const,
        };
      } else if (now < campaignEnd) {
        const diff = campaignEnd - now;
        return {
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((diff / 1000 / 60) % 60),
          seconds: Math.floor((diff / 1000) % 60),
          status: "ACTIVE" as const,
        };
      } else {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          status: "ENDED" as const,
        };
      }
    };

    const updateTimer = () => {
      setTimeLeft(calculateTimeLeft());
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [campaignStart, campaignEnd]);

  const getEstimatedPrize = (rank: number) => {
    if (rank === 1) return "$250";
    if (rank === 2) return "$110";
    if (rank === 3) return "$70";
    if (rank === 4) return "$45";
    if (rank === 5) return "$25";
    return "—";
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) return <GoldMedalIcon size={20} />;
    if (rank === 2) return <SilverMedalIcon size={20} />;
    if (rank === 3) return <BronzeMedalIcon size={20} />;
    return <span className="font-mono text-tertiary">#{rank}</span>;
  };

  // Safe slice of top 100 traders for clean rendering
  const topTraders = leaderboard.slice(0, 100);
  
  const userRankIndex = leaderboard.findIndex(t => wallet.connected && wallet.address && t.address.toLowerCase() === wallet.address.toLowerCase());
  const isUserInTop100 = userRankIndex >= 0 && userRankIndex < 100;
  const userTrader = (!isUserInTop100 && userRankIndex >= 0) ? leaderboard[userRankIndex] : null;

  return (
    <div className="volume-leaderboard glass-card animate-fade-in">
      <div className="leaderboard-header-row">
        <div className="leaderboard-header">
          <h3 className="leaderboard-title">
            🏆 {tLocal("$PSAI Trading Leaderboard", "$PSAI 交易量排行榜")}
          </h3>
          <p className="leaderboard-subtitle">
            {tLocal("Top volume traders ranked on X Layer Mainnet", "X Layer 主网上交易量排名前列 of players")}
          </p>
          <p className="leaderboard-subtitle text-gold">
            {tLocal("🎁 All rewards are distributed 50/50 in USDT and $PSAI", "🎁 所有奖励将以 USDT 和 $PSAI 的形式 50/50 发放")}
          </p>
          {timeLeft && (
            <div className={`campaign-timer-badge ${timeLeft.status}`}>
              {timeLeft.status === "PRESTART" && (
                <span>
                  ⏳ {tLocal("Campaign starts in: ", "活动开始倒计时: ")}
                  <strong>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                  </strong>
                </span>
              )}
              {timeLeft.status === "ACTIVE" && (
                <span>
                  🔥 {tLocal("Campaign ends in: ", "活动结束倒计时: ")}
                  <strong>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
                  </strong>
                </span>
              )}
              {timeLeft.status === "ENDED" && (
                <span>
                  🏆 {tLocal("Campaign Ended! Final rankings locked.", "活动已结束！最终排行榜已锁定。")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="prize-pool-badge">
          <div className="prize-pool-label">{tLocal("TOTAL PRIZE POOL", "总奖池")}</div>
          <div className="prize-pool-value">
            <span className="prize-pool-icon">🎁</span>$500
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>{tLocal("Rank", "排名")}</th>
              <th>{tLocal("Trader Address", "地址")}</th>
              <th>{tLocal("Volume (USDT)", "交易量 (USDT)")}</th>
              <th>{tLocal("Est. Reward", "预计奖励")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && leaderboard.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center font-mono py-4">
                  {tLocal("Loading leaderboard data...", "加载排行榜数据中...")}
                </td>
              </tr>
            ) : topTraders.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center font-mono py-4">
                  {tLocal("No trading activity recorded yet.", "暂无交易记录。")}
                </td>
              </tr>
            ) : (
              <>
                {topTraders.map((trader, idx) => {
                  const rank = idx + 1;
                  const addr = trader.address;
                  const isUser = wallet.connected && wallet.address && wallet.address.toLowerCase() === addr.toLowerCase();
                  const truncatedAddr = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

                  return (
                    <tr key={addr} className={isUser ? "user-row" : ""}>
                      <td>
                        <div className="rank-container">{renderRankBadge(rank)}</div>
                      </td>
                      <td className="font-mono">
                        <span className={isUser ? "text-blue font-bold" : "text-primary"}>
                          {truncatedAddr} {isUser && `(${tLocal("You", "您")})`}
                        </span>
                      </td>
                      <td className="font-mono text-green font-bold">
                        ${trader.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="font-mono text-gold text-prize">
                        {getEstimatedPrize(rank)}
                      </td>
                    </tr>
                  );
                })}
                {userTrader && (
                  <>
                    <tr>
                      <td colSpan={4} className="text-center text-tertiary font-mono py-2">...</td>
                    </tr>
                    <tr className="user-row">
                      <td>
                        <div className="rank-container"><span className="font-mono text-tertiary">#{userRankIndex + 1}</span></div>
                      </td>
                      <td className="font-mono">
                        <span className="text-blue font-bold">
                          {`${userTrader.address.slice(0, 6)}...${userTrader.address.slice(-4)}`} ({tLocal("You", "您")})
                        </span>
                      </td>
                      <td className="font-mono text-green font-bold">
                        ${userTrader.volume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="font-mono text-gold text-prize">
                        {getEstimatedPrize(userRankIndex + 1)}
                      </td>
                    </tr>
                  </>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .volume-leaderboard {
          width: 580px;
          max-width: 100%;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(0, 0, 0, 0.2);
          box-shadow: 0 0 10px rgba(75, 123, 245, 0.05);
        }

        .leaderboard-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          width: 100%;
          gap: 16px;
        }

        .leaderboard-header {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .prize-pool-badge {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.08) 0%, rgba(255, 170, 0, 0.02) 100%);
          border: 1.5px solid rgba(255, 215, 0, 0.25);
          padding: 12px 18px;
          border-radius: 12px;
          box-shadow: 0 0 25px rgba(255, 215, 0, 0.08), inset 0 0 10px rgba(255, 215, 0, 0.05);
          min-width: 135px;
          backdrop-filter: blur(4px);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .prize-pool-badge:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 215, 0, 0.45);
          box-shadow: 0 0 35px rgba(255, 215, 0, 0.18), inset 0 0 15px rgba(255, 215, 0, 0.1);
        }

        .prize-pool-label {
          font-size: 0.65rem;
          color: rgba(255, 215, 0, 0.85);
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .prize-pool-value {
          font-size: 2rem;
          font-weight: 900;
          color: #FFD700;
          line-height: 1.1;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
        }

        .prize-pool-icon {
          font-size: 1.4rem;
        }

        .campaign-timer-badge {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-family: monospace;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          margin-top: 6px;
          width: fit-content;
        }

        .campaign-timer-badge.PRESTART {
          color: #ffaa00;
          background: rgba(255, 170, 0, 0.05);
          border: 1px solid rgba(255, 170, 0, 0.15);
        }

        .campaign-timer-badge.ACTIVE {
          color: #00ffaa;
          background: rgba(0, 255, 170, 0.05);
          border: 1px solid rgba(0, 255, 170, 0.15);
        }

        .campaign-timer-badge.ENDED {
          color: #ff4444;
          background: rgba(255, 68, 68, 0.05);
          border: 1px solid rgba(255, 68, 68, 0.15);
        }

        .leaderboard-title {
          font-size: 1.15rem;
          font-weight: 700;
          color: #fff;
        }

        .leaderboard-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .table-container {
          overflow-x: auto;
        }

        .leaderboard-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 0.82rem;
        }

        .leaderboard-table th, .leaderboard-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-default);
        }

        .leaderboard-table th {
          background: rgba(255, 255, 255, 0.01);
          color: var(--text-tertiary);
          font-weight: 700;
          text-transform: uppercase;
          font-size: 0.65rem;
          letter-spacing: 0.05em;
        }

        .leaderboard-table tr:last-child td {
          border-bottom: none;
        }

        .leaderboard-table td {
          color: var(--text-secondary);
        }

        .rank-container {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          min-height: 20px;
        }

        .user-row {
          background: rgba(75, 123, 245, 0.08);
          border-left: 2px solid var(--accent-blue);
        }

        .text-gold {
          color: #FFD700;
        }

        .text-prize {
          font-size: 0.76rem;
        }

        .text-green {
          color: var(--accent-safe);
        }

        .animate-fade-in {
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .volume-leaderboard {
            width: 480px;
            max-width: 100%;
          }
        }

        @media (max-width: 500px) {
          .leaderboard-header-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .prize-pool-badge {
            align-items: center;
            min-width: 100%;
          }
          .prize-pool-value {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
