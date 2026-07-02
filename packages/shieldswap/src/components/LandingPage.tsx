import React, { useState, useEffect } from "react";
import { ShieldIcon, CalendarIcon, TrophyIcon, ScienceIcon, CardIcon, RobotIcon, SignalIcon, WarningIcon, CrossIcon, LockIcon, SwapIcon, ArrowRightIcon, VaultIcon } from "./Icons";
import { motion, AnimatePresence } from "framer-motion";
import { ethers } from "ethers";
import DEPLOYED_ADDRESSES from "../deployed-addresses.json";
import { useLanguage } from "../context/LanguageContext";


interface LandingPageProps {
  setActiveTab: (tab: "home" | "swap" | "pitchside") => void;
}

const mockFixtures = [
  { id: "mock-f1", homeTeam: "United States", awayTeam: "Australia", date: "June 19, 2026", time: "19:00 UTC", stadium: "Lumen Field, Seattle", group: "Group D" },
  { id: "mock-f2", homeTeam: "Scotland", awayTeam: "Morocco", date: "June 19, 2026", time: "16:00 UTC", stadium: "Gillette Stadium, Boston", group: "Group C" },
  { id: "mock-f3", homeTeam: "Brazil", awayTeam: "Haiti", date: "June 19, 2026", time: "21:00 UTC", stadium: "Lincoln Financial Field, Philadelphia", group: "Group C" },
  { id: "mock-f4", homeTeam: "Turkey", awayTeam: "Paraguay", date: "June 19, 2026", time: "18:00 UTC", stadium: "Levi's Stadium, San Francisco", group: "Group D" },
  { id: "mock-f5", homeTeam: "Netherlands", awayTeam: "Sweden", date: "June 20, 2026", time: "20:00 UTC", stadium: "NRG Stadium, Houston", group: "Group F" },
  { id: "mock-f6", homeTeam: "Germany", awayTeam: "Ivory Coast", date: "June 20, 2026", time: "17:00 UTC", stadium: "BMO Field, Toronto", group: "Group E" },
  { id: "mock-f7", homeTeam: "Spain", awayTeam: "Saudi Arabia", date: "June 21, 2026", time: "15:00 UTC", stadium: "MetLife Stadium, New York/New Jersey", group: "Group A" },
  { id: "mock-f8", homeTeam: "Belgium", awayTeam: "Iran", date: "June 21, 2026", time: "18:00 UTC", stadium: "SoFi Stadium, Los Angeles", group: "Group B" },
  { id: "mock-f9", homeTeam: "Norway", awayTeam: "Senegal", date: "June 22, 2026", time: "16:00 UTC", stadium: "Mercedes-Benz Stadium, Atlanta", group: "Group G" },
  { id: "mock-f10", homeTeam: "Bosnia and Herzegovina", awayTeam: "Qatar", date: "June 24, 2026", time: "19:00 UTC", stadium: "Hard Rock Stadium, Miami", group: "Group H" },
  { id: "mock-f11", homeTeam: "Ecuador", awayTeam: "Germany", date: "June 25, 2026", time: "20:00 UTC", stadium: "AT&T Stadium, Dallas", group: "Group E" },
  { id: "mock-f12", homeTeam: "Panama", awayTeam: "England", date: "June 27, 2026", time: "17:00 UTC", stadium: "Arrowhead Stadium, Kansas City", group: "Group A" },
  { id: "mock-f13", homeTeam: "Portugal", awayTeam: "Colombia", date: "June 27, 2026", time: "21:00 UTC", stadium: "BC Place, Vancouver", group: "Group F" },
  { id: "mock-f14", homeTeam: "Round of 32 Match 1", awayTeam: "Round of 32 Match 2", date: "June 28, 2026", time: "18:00 UTC", stadium: "SoFi Stadium, Los Angeles", group: "Round of 32" }
];

const mockLiveMatches = [
  { id: "mock-l1", homeTeam: "Mexico", awayTeam: "South Korea", homeScore: 2, awayScore: 1, minute: "78'", status: "LIVE", event: "Goal by Alexis Vega 64'" },
  { id: "mock-l2", homeTeam: "Canada", awayTeam: "Qatar", homeScore: 1, awayScore: 0, minute: "42'", status: "LIVE", event: "Jonathan David scores clinical finish 31'" },
  { id: "mock-l3", homeTeam: "Switzerland", awayTeam: "Bosnia and Herzegovina", homeScore: 1, awayScore: 1, minute: "15'", status: "LIVE", event: "Equalizer by Edin Dzeko 12'" },
  { id: "mock-l4", homeTeam: "Czechia", awayTeam: "South Africa", homeScore: 0, awayScore: 0, minute: "8'", status: "LIVE", event: "Dynamic midfield battle underway" }
];

function getFlagUrl(teamName: string): string {
  const name = teamName.toLowerCase();
  let code = "un"; // default United Nations globe

  if (name.includes("united states") || name.includes("usa") || name.includes("la galaxy")) code = "us";
  else if (name.includes("england") || name.includes("chelsea") || name.includes("arsenal") || name.includes("manchester")) code = "gb-eng";
  else if (name.includes("mexico") || name.includes("america") || name.includes("chivas")) code = "mx";
  else if (name.includes("argentina") || name.includes("boca") || name.includes("river")) code = "ar";
  else if (name.includes("canada") || name.includes("vancouver") || name.includes("toronto")) code = "ca";
  else if (name.includes("germany") || name.includes("bayern") || name.includes("dortmund")) code = "de";
  else if (name.includes("brazil") || name.includes("flamengo") || name.includes("santos")) code = "br";
  else if (name.includes("france") || name.includes("psg") || name.includes("marseille")) code = "fr";
  else if (name.includes("spain") || name.includes("barcelona") || name.includes("madrid")) code = "es";
  else if (name.includes("japan") || name.includes("tokyo")) code = "jp";
  else if (name.includes("italy") || name.includes("juventus") || name.includes("milan") || name.includes("inter")) code = "it";
  else if (name.includes("croatia") || name.includes("zagreb")) code = "hr";
  else if (name.includes("uruguay") || name.includes("penarol")) code = "uy";
  else if (name.includes("netherlands") || name.includes("ajax") || name.includes("psv")) code = "nl";
  else if (name.includes("portugal") || name.includes("benfica") || name.includes("porto")) code = "pt";
  else if (name.includes("senegal")) code = "sn";
  else if (name.includes("china")) code = "cn";
  else if (name.includes("korea")) code = "kr";
  else if (name.includes("morocco")) code = "ma";
  else if (name.includes("colombia")) code = "co";
  else if (name.includes("belgium")) code = "be";
  else if (name.includes("switzerland")) code = "ch";
  else if (name.includes("denmark")) code = "dk";
  else if (name.includes("sweden")) code = "se";
  else if (name.includes("poland")) code = "pl";
  else if (name.includes("ukraine")) code = "ua";
  else if (name.includes("austria")) code = "at";
  else if (name.includes("wales")) code = "gb-wls";
  else if (name.includes("scotland")) code = "gb-sct";
  else if (name.includes("turkey")) code = "tr";
  else if (name.includes("czech") || name.includes("cz")) code = "cz";
  else if (name.includes("south africa")) code = "za";
  else if (name.includes("bosnia")) code = "ba";
  else if (name.includes("qatar")) code = "qa";
  else if (name.includes("australia")) code = "au";
  else if (name.includes("haiti")) code = "ht";
  else if (name.includes("paraguay")) code = "py";
  else if (name.includes("ivory coast") || name.includes("côte d'ivoire") || name.includes("cote d'ivoire")) code = "ci";
  else if (name.includes("norway")) code = "no";
  else if (name.includes("panama")) code = "pa";
  else if (name.includes("ecuador")) code = "ec";
  else if (name.includes("saudi arabia")) code = "sa";
  else if (name.includes("iran")) code = "ir";

  if (code === "un") {
    return "https://flagcdn.com/w80/un.png";
  }
  return `https://flagcdn.com/w80/${code}.png`;
}

export const LandingPage: React.FC<LandingPageProps> = ({ setActiveTab }) => {
  const { t, language } = useLanguage();
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [currentFixtureIndex, setCurrentFixtureIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // ── Protocol Statistics Hooks ─────────────────────────────────────
  const [tvl, setTvl] = useState<string>("0.00");
  const [activeUsersCount, setActiveUsersCount] = useState<number>(4); // default mock/starter count
  const [psaiHeld, setPsaiHeld] = useState<string>("0");

  useEffect(() => {
    const fetchProtocolStats = async () => {
      let usersList: string[] = [];
      try {
        // 1. Fetch users count from backend
        const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
        const res = await fetch(`${API_BASE}/api/worldcup/users`);
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data)) {
          setActiveUsersCount(json.data.length);
          usersList = json.data;
        }
      } catch (err) {
        console.error("Failed to fetch registered users count:", err);
      }

      try {
        // 2. Fetch TVL and Speculator PSAI Holdings from X Layer Mainnet
        const rpcUrl = "https://rpc.xlayer.tech";
        const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
        const vaultAddress = DEPLOYED_ADDRESSES.xlayerMainnet.NoLossVault;
        
        const vaultContract = new ethers.Contract(
          vaultAddress,
          ["function totalStaked() external view returns (uint256)"],
          provider
        );
        const stakedRaw = await vaultContract.totalStaked();
        const stakedFormatted = parseFloat(ethers.formatUnits(stakedRaw, 6)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        setTvl(stakedFormatted);

        // Fetch speculator $PSAI holdings
        if (usersList.length > 0) {
          const psaiTokenAddress = "0xaef068ea820aafa00a2854bfd6cfab6d891ede5d";
          const psaiContract = new ethers.Contract(
            psaiTokenAddress,
            ["function balanceOf(address) external view returns (uint256)"],
            provider
          );
          const balances = await Promise.all(
            usersList.map(async (user: string) => {
              try {
                return await psaiContract.balanceOf(user);
              } catch {
                return 0n;
              }
            })
          );
          const total = balances.reduce((sum, bal) => sum + bal, 0n);
          const formattedPsai = parseFloat(ethers.formatEther(total)).toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          });
          setPsaiHeld(formattedPsai);
        }
      } catch (err) {
        console.error("Failed to fetch stats from chain:", err);
        setTvl((prev) => prev === "0.00" ? "0.00" : prev);
      }
    };

    fetchProtocolStats();
    const interval = setInterval(fetchProtocolStats, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("0xaef068ea820aafa00a2854bfd6cfab6d891ede5d");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Auto-slide Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (fixtures.length === 0) return;
    const timer = setInterval(() => {
      setCurrentFixtureIndex((prev) => (prev + 1) % fixtures.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [fixtures.length]);

  // ── Fetch Matches API ────────────────────────────────────────────────
  useEffect(() => {
    const parseDate = (dateStr: string) => {
      let parseStr = dateStr;
      if (dateStr && !dateStr.includes("Z") && !dateStr.includes("+") && !dateStr.toLowerCase().includes("utc")) {
        parseStr = dateStr.replace(" ", "T") + "Z";
      }
      return new Date(parseStr);
    };

    const fetchMatches = async () => {
      try {
        const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";
        const res = await fetch(`${API_BASE}/api/worldcup/matches`);
        const json = await res.json();
        
        if (json.success && json.data) {
          const allMatches: any[] = [];
          json.data.forEach((league: any) => {
            league.matches.forEach((m: any) => {
              allMatches.push({
                ...m,
                leagueName: league.league,
                leagueId: league.leagueId
              });
            });
          });

          const isWorldCupLeague = (leagueName?: string, leagueId?: string) => {
            const name = (leagueName || "").toLowerCase();
            const id = (leagueId || "").toLowerCase();
            return name.includes("world cup") || name.includes("worldcup") || id.includes("fifa.world") || id.includes("world_cup") || id.includes("worldcup");
          };

          // Separate live and scheduled
          const live = allMatches.filter(m => {
            return m.status === "LIVE" && isWorldCupLeague(m.leagueName, m.leagueId);
          });
          const scheduled = allMatches.filter(m => {
            if (m.status !== "SCHEDULED") return false;
            return isWorldCupLeague(m.leagueName, m.leagueId);
          });

          // Sort scheduled matches chronologically (closest first)
          scheduled.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
          
          // Slice top 5
          const latest5Upcoming = scheduled.slice(0, 5);

          if (latest5Upcoming.length > 0) {
            const mappedScheduled = latest5Upcoming.map((m, idx) => ({
              id: `api-sched-${idx}`,
              homeTeam: m.home,
              awayTeam: m.away,
              date: (() => {
                if (!m.date) return "TBD Date";
                const d = parseDate(m.date);
                return isNaN(d.getTime()) ? m.date : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
              })(),
              time: (() => {
                if (!m.date) return "TBD Time";
                const d = parseDate(m.date);
                return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) + " UTC";
              })(),
              stadium: m.venue || "Global Stadium",
              group: m.leagueName || "Group Stage"
            }));
            setFixtures(mappedScheduled);
          } else {
            setFixtures([]);
          }

          if (live.length > 0) {
            const mappedLive = live.map((m, idx) => {
              const scores = m.score ? m.score.split("-") : ["0", "0"];
              return {
                id: `api-live-${idx}`,
                homeTeam: m.home,
                awayTeam: m.away,
                homeScore: parseInt(scores[0]) || 0,
                awayScore: parseInt(scores[1]) || 0,
                minute: m.minute ? (m.minute.endsWith("'") || isNaN(Number(m.minute)) ? m.minute : `${m.minute}'`) : "LIVE",
                status: "LIVE",
                event: `Match in progress at ${m.venue || 'Stadium'}`
              };
            });
            setLiveMatches(mappedLive);
          } else {
            setLiveMatches([]);
          }
        }
      } catch (err) {
        console.error("Failed to fetch live matches:", err);
      }
    };

    fetchMatches();
    const interval = setInterval(fetchMatches, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const activeFixture = fixtures[currentFixtureIndex];

  return (
    <div className="landing-container">
      {/* Stadium Pitch Background Grid Overlay */}
      <div className="pitch-overlay" />
      <div className="stadium-glow" />

      {/* $PSAI Token Live Banner */}
      <motion.div
        className="token-banner-glow"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="token-banner-inner">
          <div className="token-banner-content">
            <div className="token-banner-left">
              <span className="token-banner-badge font-mono" style={{ background: "rgba(255, 50, 50, 0.2)", color: "#ff5555" }}>{language === "zh" ? "已结束" : "ENDED"}</span>
              <span className="token-banner-title font-mono">{language === "zh" ? "第一阶段" : "PHASE 1"}</span>
              <div className="token-banner-ca-box" onClick={handleCopyAddress}>
                <span className="ca-label font-mono">CA:</span>
                <span className="ca-address font-mono">0xaef0...ede5d</span>
                <button className="btn-copy-ca font-mono">
                  {copied ? (language === "zh" ? "已复制" : "Copied") : (language === "zh" ? "复制" : "Copy")}
                </button>
              </div>
              <span className="token-banner-desc">
                {language === "zh" ? "🏆 $PSAI 交易大赛第一阶段已结束！获奖者请前往用户中心领取奖励。" : "🏆 $PSAI Trading Campaign Phase 1 has ended! Winners please head to the User Hub to claim your rewards."}
              </span>
            </div>
            <div className="token-banner-right">
              <button
                onClick={() => {
                  setActiveTab("rewards" as any);
                  setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }, 100);
                }}
                className="btn btn-primary btn-banner-swap font-mono"
              >
                {language === "zh" ? "前往用户中心" : "Go to User Hub"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hero Section Split Layout */}
      <section className="landing-hero-split">
        {/* Left Column */}
        <div className="hero-left">
          <motion.div
            className="hero-badge"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="soccer-ball-emoji">⚽</span> {language === "zh" ? "世界杯 2026 之路" : "ROAD TO WORLD CUP 2026"}
          </motion.div>

          <motion.h1
            className="hero-main-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {language === "zh" ? (
              <>
                安全优先的 DeFi 聚合 & <br />
                <span className="glow-text text-purple">零本金损失竞猜网络</span>
              </>
            ) : (
              <>
                Secure DeFi Aggregator & <br />
                <span className="glow-text text-purple">No-Loss Speculation Network</span>
              </>
            )}
          </motion.h1>

          <motion.p
            className="hero-desc"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            {t("lp_hero_desc")}
          </motion.p>

          {/* Workflow Pathway */}
          <div className="workflow-pathway">
            <div className="pathway-step active">
              <span className="step-num">1</span>
              <span className="step-label">{language === "zh" ? "扫描与验证" : "Scan & Verify"}</span>
            </div>
            <div className="pathway-arrow"><ArrowRightIcon /></div>
            <div className="pathway-step active-glow">
              <span className="step-num">2</span>
              <span className="step-label">{language === "zh" ? "质押 USDT" : "Stake USDT"}</span>
            </div>
            <div className="pathway-arrow"><ArrowRightIcon /></div>
            <div className="pathway-step active-purple">
              <span className="step-num">3</span>
              <span className="step-label">{language === "zh" ? "零风险竞猜" : "Speculate Risk-Free"}</span>
            </div>
          </div>

          {/* CTA Actions */}
          <motion.div
            className="hero-ctas"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <button
              className="btn btn-primary btn-lg-cta hover-glow"
              onClick={() => setActiveTab("pitchside")}
            >
              ⚽ {language === "zh" ? "运行赛场 AI" : "Launch Pitchside AI"}
            </button>
            <button
              className="btn btn-ghost btn-lg-cta"
              onClick={() => setActiveTab("swap")}
            >
              <ShieldIcon /> {language === "zh" ? "进入防卫兑换" : "Enter ShieldSwap DEX"}
            </button>
          </motion.div>
        </div>

        {/* Right Column: Sliding Match Fixture Card */}
        <div className="hero-right">
          <div className="fixtures-card glass-card">
            <div className="fixtures-card-glow" />
            {fixtures.length > 0 && activeFixture ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFixtureIndex}
                  initial={{ opacity: 0, x: 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  transition={{ duration: 0.3 }}
                  className="fixture-slide-content"
                >
                  <div className="fixtures-header">
                    <span className="fixture-tag font-mono" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><CalendarIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "即将开始的比赛" : "UPCOMING FIXTURE"}</span>
                    <span className="group-badge font-mono">{activeFixture.group}</span>
                  </div>

                  <div className="matchup-container">
                    <div className="team-display">
                      <img src={getFlagUrl(activeFixture.homeTeam)} alt={activeFixture.homeTeam} className="team-flag-img" />
                      <span className="team-name">{activeFixture.homeTeam}</span>
                    </div>
                    <div className="vs-badge font-mono">VS</div>
                    <div className="team-display">
                      <img src={getFlagUrl(activeFixture.awayTeam)} alt={activeFixture.awayTeam} className="team-flag-img" />
                      <span className="team-name">{activeFixture.awayTeam}</span>
                    </div>
                  </div>

                  <div className="fixture-details">
                    <div className="detail-row">
                      <span className="detail-label">{language === "zh" ? "场馆:" : "Stadium:"}</span>
                      <span className="detail-value">{activeFixture.stadium}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">{language === "zh" ? "日期:" : "Date:"}</span>
                      <span className="detail-value">{activeFixture.date}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">{language === "zh" ? "时间:" : "Time:"}</span>
                      <span className="detail-value">{activeFixture.time}</span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="fixture-skeleton font-mono">
                <div className="skeleton-line title" />
                <div className="skeleton-matchup">
                  <div className="skeleton-team" />
                  <div className="skeleton-vs">VS</div>
                  <div className="skeleton-team" />
                </div>
                <div className="skeleton-details">
                  <div className="skeleton-line detail" />
                  <div className="skeleton-line detail" />
                </div>
              </div>
            )}

            <button 
              className="speculate-card-btn font-mono"
              onClick={() => setActiveTab("pitchside")}
            >
              <TrophyIcon /> {language === "zh" ? "对比赛进行竞猜" : "Speculate on Match"}
            </button>
          </div>
        </div>
      </section>

      {/* Live Ticker Section */}
      <section className="live-ticker-section glass-card">
        <div className="live-ticker-header">
          <span className="live-pulse" />
          <span className="live-ticker-title font-mono">{language === "zh" ? "世界杯实时赛事" : "LIVE WORLD CUP MATCHES"}</span>
        </div>
        <div className="live-ticker-scroll-container">
          {liveMatches.length > 0 ? (
            <div className="live-ticker-wrapper">
              {liveMatches.map((match) => (
                <div key={match.id} className="live-match-card" onClick={() => setActiveTab("pitchside")}>
                  <div className="live-match-meta">
                    <span className="live-badge font-mono">{language === "zh" ? "直播中" : "LIVE"} {match.minute}</span>
                  </div>
                  <div className="live-matchup-row">
                    <div className="live-team">
                      <img src={getFlagUrl(match.homeTeam)} alt={match.homeTeam} className="live-flag-img" />
                      <span className="live-team-name">{match.homeTeam}</span>
                    </div>
                    <div className="live-score font-mono">{match.homeScore} - {match.awayScore}</div>
                    <div className="live-team">
                      <img src={getFlagUrl(match.awayTeam)} alt={match.awayTeam} className="live-flag-img" />
                      <span className="live-team-name">{match.awayTeam}</span>
                    </div>
                  </div>
                  <div className="live-event font-mono">{match.event}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-live-matches-container">
              <span className="rolling-football">⚽</span>
              <span className="no-live-text font-mono">{language === "zh" ? "目前没有进行中的比赛" : "No live match at the moment"}</span>
            </div>
          )}
        </div>
      </section>

      {/* Protocol Statistics Section */}
      <section className="landing-section">
        <h2 className="section-title text-center" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          {language === "zh" ? "ShieldSuite 协议实时运行状态" : "ShieldSuite Live Protocol Activity"}
        </h2>
        <p className="section-subtitle text-center">
          {language === "zh" ? "数据直接从 X Layer 主网实时读取监测。" : "Real-time metrics monitored directly on X Layer mainnet."}
        </p>

        <div className="metrics-grid">
          <div className="glass-card metric-card">
            <div className="metric-header">
              <span className="metric-icon">
                <VaultIcon size={22} style={{ marginRight: 0, color: "var(--accent-blue)" }} />
              </span>
              <span className="metric-label font-mono">{t("lp_stats_tvl")}</span>
            </div>
            <div className="metric-value font-mono" style={{ color: "var(--accent-blue)" }}>
              ${tvl}
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-header">
              <span className="metric-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span className="metric-label font-mono">{language === "zh" ? "活跃竞猜玩家" : "ACTIVE SPECULATORS"}</span>
            </div>
            <div className="metric-value font-mono" style={{ color: "var(--accent-purple)" }}>
              {activeUsersCount} <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>{language === "zh" ? "人" : "Scouts"}</span>
            </div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-header">
              <span className="metric-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-safe)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}>
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5" />
                  <polygon points="12 6 18 10 18 14 12 18 6 14 6 10" fill="currentColor" fillOpacity="0.1" />
                </svg>
              </span>
              <span className="metric-label font-mono">{language === "zh" ? "持有的 $PSAI 代币" : "SPECULATOR $PSAI HELD"}</span>
            </div>
            <div className="metric-value font-mono" style={{ color: "var(--accent-safe)" }}>
              {psaiHeld} <span style={{ fontSize: "0.85rem", color: "var(--text-tertiary)" }}>$PSAI</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Ecosystem Loop Section */}
      <section className="landing-section">
        <h2 className="section-title text-center">⚽ {language === "zh" ? "赛场 AI: 零损失竞猜循环" : "Pitchside AI: No-Loss Speculation Loop"}</h2>
        <p className="section-subtitle text-center">
          {language === "zh" ? "工作原理：利用本金保护的质押，零风险竞猜 2026 年世界杯。" : "How it works: Speculate on the World Cup 2026 risk-free using principal-protected staking."}
        </p>

        <div className="loop-grid">
          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="step-num font-mono">01</div>
            <h3>{language === "zh" ? "本金受保护质押" : "Principal-Protected Staking"}</h3>
            <p>
              {language === "zh" ? "将稳定币（USDT/USDC）存入我们的无损失保险库。在主网上，资金将直接存入 Aave V3 资金池以产生收益。您的本金 100% 安全，且随时可以赎回。" : "Deposit stablecoins (USDT/USDC) into our No-Loss Vault. On mainnet, funds are securely supplied directly into Aave V3 Pools to generate interest. Your principal remains 100% safe and withdrawable at any moment."}
            </p>
          </motion.div>

          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <div className="step-num font-mono">02</div>
            <h3>{language === "zh" ? "赚取虚拟特工积分" : "Earn Virtual Scout Credits"}</h3>
            <p>
              {language === "zh" ? "您质押的稳定币会持续以特工积分（Scout Credits）的形式赚取虚拟收益。这些积分会在您的控制面板上实时增长，代表着您的委托和竞猜额度。" : "Your staked stablecoins continuously earn virtual interest in the form of Scout Credits. These credits tick upward in real-time on your dashboard and represent your delegation and speculation power."}
            </p>
          </motion.div>

          <motion.div
            className="glass-card loop-card"
            whileHover={{ scale: 1.02 }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <div className="step-num font-mono">03</div>
            <h3>{language === "zh" ? "委托特工与竞猜" : "Delegate & Speculate"}</h3>
            <p>
              {language === "zh" ? "将您的特工积分委托给我们的 TEE 隔离 AI 特工。特工将自动读取实时比赛比分、分析体育新闻舆情、扫描代币字节码，并代表您交易球员指数份额。" : "Delegate your Scout Credits to our TEE-isolated AI Scout Agent. The agent reads real-time live match scores, parses sports sentiment, scans token bytecode, and trades player index shares on your behalf."}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ScanGuard & Security Core Section */}
      <section className="landing-section layout-split">
        <div className="split-text">
          <h2 className="section-title text-center" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><ShieldIcon size={28} style={{ marginRight: 0 }} /> {language === "zh" ? "ScanGuard 与 ShieldSwap DEX 聚合器" : "ScanGuard & ShieldSwap DEX Aggregator"}</h2>
          <p className="section-desc-para">
            {language === "zh" ? "传统的 DEX 路由执行交易时是盲目的。ShieldSuite 在您的交易触链之前，使用原生安全网进行前置拦截，守卫您的钱包本金安全。" : "Traditional DEX routers execute swaps blindly. ShieldSuite intercepts transactions with a native security guard before they can harm your wallet."}
          </p>

          <div className="security-features">
            <div className="sec-feature">
              <span className="sec-icon"><ScienceIcon size={24} style={{ marginRight: 0 }} /></span>
              <div>
                <h4>{t("lp_feat_security_title")}</h4>
                <p>{t("lp_feat_security_desc")}</p>
              </div>
            </div>

            <div className="sec-feature">
              <span className="sec-icon"><CardIcon size={24} style={{ marginRight: 0 }} /></span>
              <div>
                <h4>{language === "zh" ? "x402 按需支付扫描协议" : "x402 Pay-Per-Scan Protocol"}</h4>
                <p>{language === "zh" ? "标准的商业变现闭环，自动化客户端特工可以流式小额支付稳定币，以实时访问 ScanGuard 字节码安全报告。" : "A standard monetization loop where automated client agents stream micro-payments in stablecoins to access ScanGuard security reports in real-time."}</p>
              </div>
            </div>

            <div className="sec-feature">
              <span className="sec-icon"><RobotIcon size={24} style={{ marginRight: 0 }} /></span>
              <div>
                <h4>{language === "zh" ? "对话式 AI 交易助理" : "Conversational AI Chatbot"}</h4>
                <p>{language === "zh" ? "在交易终端内直接使用自然语言扫描并准备兑换。您的专属 AI 特工会解析意图、评估安全性并自动填写交易单据。" : "Scan and stage swaps using natural language directly inside the swap terminal. Your personal agent parses the intent, scans safety, and populates the slip."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Terminal Panel */}
        <motion.div
          className="glass-card terminal-visual"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7 }}
        >
          <div className="terminal-header">
            <span className="term-dot red" />
            <span className="term-dot yellow" />
            <span className="term-dot green" />
            <span className="term-title font-mono">scanguard-mcp-v1.0.0</span>
          </div>
          <div className="terminal-content font-mono">
            <div className="term-line prompt">&gt; scan --address 0x779d...3736</div>
            <div className="term-line success" style={{ display: "flex", alignItems: "center", gap: "6px" }}><SignalIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "正在解析代币元数据... 完成。 (WOKB/USDT)" : "Resolving token metadata... Done. (WOKB/USDT)"}</div>
            <div className="term-line success" style={{ display: "flex", alignItems: "center", gap: "6px" }}><RobotIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "正在对比 ScanGuard 核心字节码哈希库..." : "Checking bytecode hashes against ScanGuard Core..."}</div>
            <div className="term-line warning" style={{ display: "flex", alignItems: "center", gap: "6px" }}><WarningIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "警告：在代理合约中检测到蜜罐代码特征。" : "Warning: Honeypot code snippet detected in proxy contract."}</div>
            <div className="term-line danger" style={{ display: "flex", alignItems: "center", gap: "6px" }}><CrossIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "风险等级：极高 (89/100) - 强行拦截兑换交易。" : "RISK LEVEL: HIGH (89/100) - Blocked swap."}</div>
            <div className="term-line success" style={{ display: "flex", alignItems: "center", gap: "6px" }}><LockIcon size={12} style={{ marginRight: 0 }} /> {language === "zh" ? "用户本金安全。扫描完成，耗时 42 毫秒。" : "User principal protected. Scan complete in 42ms."}</div>
          </div>
        </motion.div>
      </section>



      {/* Call to Action Footer */}
      <section className="landing-cta-bottom text-center">
        <div className="glass-card cta-card">
          <h2>{language === "zh" ? "准备好零风险竞猜 2026 世界杯了吗？" : "Ready to speculate on World Cup 2026?"}</h2>
          <p>{language === "zh" ? "加入下一代安全受护的 DeFi 协议。零本金风险质押稳定币，赚取积分并委托给自治特工。" : "Join the next generation of security-gated DeFi. Stake stablecoins risk-free, earn credits, and delegate them to autonomous agents."}</p>
          <div className="cta-buttons">
            <button className="btn btn-primary hover-glow" onClick={() => setActiveTab("pitchside")}>
              <TrophyIcon /> {language === "zh" ? "打开赛场 AI" : "Open Pitchside AI"}
            </button>
            <button className="btn btn-ghost" onClick={() => setActiveTab("swap")}>
              <SwapIcon /> {language === "zh" ? "安全兑换代币" : "Swap Tokens Safely"}
            </button>
          </div>
        </div>
      </section>

      <style>{`
        .landing-container {
          position: relative;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 48px;
          padding: 0 16px;
          color: var(--text-primary);
        }

        /* Stadium Overlay Grid Effect */
        .pitch-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(ellipse at center, transparent 30%, var(--bg-primary) 90%),
            linear-gradient(rgba(255, 255, 255, 0.01) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.01) 1px, transparent 1px);
          background-size: 100% 100%, 40px 40px, 40px 40px;
          z-index: -2;
          pointer-events: none;
          opacity: 0.65;
        }

        .stadium-glow {
          position: absolute;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 800px;
          height: 600px;
          background: radial-gradient(circle, rgba(75, 123, 245, 0.1) 0%, transparent 70%);
          z-index: -1;
          pointer-events: none;
        }

        /* Hero Split Layout */
        .landing-hero-split {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap: 48px;
          align-items: center;
          padding-top: 48px;
          min-height: 480px;
        }

        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }

        .hero-right {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .hero-badge {
          display: inline-flex;
          align-self: flex-start;
          align-items: center;
          gap: 8px;
          background: rgba(75, 123, 245, 0.1);
          border: 1px solid rgba(75, 123, 245, 0.3);
          border-radius: var(--radius-full);
          padding: 6px 18px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--accent-blue);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .soccer-ball-emoji {
          display: inline-block;
          animation: spin 6s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .hero-main-title {
          font-size: 3rem;
          font-weight: 900;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin: 0;
        }

        .glow-text {
          position: relative;
          text-shadow: 0 0 30px rgba(168, 85, 247, 0.35);
        }

        .hero-desc {
          font-size: 1.05rem;
          color: var(--text-secondary);
          max-width: 680px;
          line-height: 1.6;
          margin: 0;
        }

        /* Workflow Pathway */
        .workflow-pathway {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
          flex-wrap: wrap;
        }

        .pathway-step {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-default);
          background: rgba(255, 255, 255, 0.01);
          font-size: 0.8rem;
          color: var(--text-secondary);
          transition: all 0.3s ease;
        }

        .pathway-step.active {
          border-color: var(--accent-blue);
          background: rgba(75, 123, 245, 0.05);
          color: #fff;
        }

        .pathway-step.active-glow {
          border-color: var(--accent-safe);
          background: rgba(0, 255, 136, 0.05);
          color: #fff;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.15);
        }

        .pathway-step.active-purple {
          border-color: var(--accent-purple);
          background: rgba(168, 85, 247, 0.05);
          color: #fff;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.15);
        }

        .pathway-step .step-num {
          background: rgba(255, 255, 255, 0.1);
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .pathway-step.active .step-num {
          background: var(--accent-blue);
          color: #000;
        }

        .pathway-step.active-glow .step-num {
          background: var(--accent-safe);
          color: #000;
        }

        .pathway-step.active-purple .step-num {
          background: var(--accent-purple);
          color: #000;
        }

        .pathway-arrow {
          color: var(--text-tertiary);
          font-size: 0.8rem;
        }

        .hero-ctas {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .btn-lg-cta {
          padding: 14px 28px;
          font-size: 0.95rem;
        }

        .hover-glow:hover {
          box-shadow: 0 0 25px rgba(75, 123, 245, 0.5);
        }

        /* Fixtures Card */
        .fixtures-card {
          width: 100%;
          max-width: 400px;
          padding: 24px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 20px;
          border-color: rgba(75, 123, 245, 0.2);
          overflow: hidden;
        }

        .fixtures-card-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top right, rgba(75, 123, 245, 0.08), transparent 60%);
          pointer-events: none;
        }

        .fixture-slide-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .fixtures-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-default);
          padding-bottom: 12px;
        }

        .fixture-tag {
          font-size: 0.7rem;
          color: var(--accent-blue);
          font-weight: 700;
          letter-spacing: 0.05em;
        }

        .group-badge {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-default);
          font-size: 0.65rem;
          color: var(--text-secondary);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
        }

        .matchup-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .team-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .team-flag-img {
          width: 54px;
          height: 36px;
          border-radius: 4px;
          object-fit: cover;
          border: 2px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 12px rgba(0, 0, 0, 0.4);
        }

        .team-name {
          font-size: 0.95rem;
          font-weight: 700;
          color: #fff;
          text-align: center;
        }

        .vs-badge {
          font-size: 0.8rem;
          font-weight: 800;
          color: var(--text-tertiary);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-default);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          margin: 0 16px;
        }

        .fixture-details {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.78rem;
          line-height: 1.4;
        }

        .detail-label {
          color: var(--text-tertiary);
        }

        .detail-value {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .speculate-card-btn {
          width: 100%;
          background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple));
          border: none;
          color: var(--bg-primary);
          padding: 12px;
          font-size: 0.85rem;
          font-weight: 700;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .speculate-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(168, 85, 247, 0.3);
        }

        /* Live Ticker Section */
        .live-ticker-section {
          padding: 16px 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .live-ticker-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .live-pulse {
          width: 8px;
          height: 8px;
          background-color: #ff3b30;
          border-radius: 50%;
          display: inline-block;
          box-shadow: 0 0 8px #ff3b30;
          animation: blink 1.5s infinite;
        }

        @keyframes blink {
          0% { opacity: 0.4; }
          50% { opacity: 1; }
          100% { opacity: 0.4; }
        }

        .live-ticker-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #ff3b30;
          letter-spacing: 0.08em;
        }

        .live-ticker-scroll-container {
          width: 100%;
          overflow-x: auto;
        }

        .live-ticker-scroll-container::-webkit-scrollbar {
          height: 4px;
        }
        .live-ticker-scroll-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .live-ticker-wrapper {
          display: flex;
          gap: 16px;
          width: max-content;
          padding-bottom: 4px;
        }

        .live-match-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 14px 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 250px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .live-match-card:hover {
          border-color: var(--accent-blue);
          background: rgba(75, 123, 245, 0.03);
          transform: translateY(-1px);
        }

        .live-match-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .live-badge {
          font-size: 0.62rem;
          font-weight: 700;
          color: #ff3b30;
          background: rgba(255, 59, 48, 0.08);
          border: 1px solid rgba(255, 59, 48, 0.2);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .live-matchup-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .live-team {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .live-team:last-child {
          justify-content: flex-end;
        }

        .live-flag-img {
          width: 33px;
          height: 22px;
          border-radius: 2px;
          object-fit: cover;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
        }

        .live-team-name {
          font-size: 0.82rem;
          font-weight: 700;
          color: #fff;
        }

        .live-score {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--accent-safe);
          background: rgba(0, 255, 136, 0.05);
          border: 1px solid rgba(0, 255, 136, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
          letter-spacing: 0.05em;
        }

        .live-event {
          font-size: 0.68rem;
          color: var(--text-tertiary);
          font-style: italic;
          text-align: center;
          border-top: 1px solid var(--border-default);
          padding-top: 6px;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Metrics */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 24px;
        }

        .metric-card {
          padding: 28px 24px 24px;
          text-align: center;
        }

        .metric-card::before {
          content: '+--- SHIELD_STAT ---+' !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
        }

        .metric-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }

        .metric-icon {
          font-size: 1.25rem;
        }

        .metric-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
        }

        .metric-value {
          font-size: 1.8rem;
          font-weight: 800;
        }

        /* Sections */
        .landing-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-top: 24px;
        }

        .section-title {
          font-size: 1.8rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .section-subtitle {
          font-size: 1rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }

        .text-center {
          text-align: center;
        }

        /* How it works grid */
        .loop-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .loop-card {
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .step-num {
          font-size: 2.2rem;
          font-weight: 800;
          color: rgba(255, 255, 255, 0.05);
          line-height: 1;
        }

        .loop-card h3 {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
        }

        .loop-card p {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Layout Split */
        .layout-split {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 48px;
          align-items: center;
        }

        .split-text {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .section-desc-para {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        .security-features {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .sec-feature {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .sec-icon {
          font-size: 1.5rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-default);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          flex-shrink: 0;
        }

        .sec-feature h4 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 4px;
        }

        .sec-feature p {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Terminal visual card */
        .terminal-visual {
          background: #060911 !important;
          border: 1px solid rgba(75, 123, 245, 0.15);
          padding: 0 !important;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        }

        .terminal-header {
          background: rgba(255, 255, 255, 0.02);
          border-bottom: 1px solid var(--border-default);
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .term-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }
        .term-dot.red { background: #ff5f56; }
        .term-dot.yellow { background: #ffbd2e; }
        .term-dot.green { background: #27c93f; }

        .term-title {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          margin-left: 8px;
        }

        .terminal-content {
          padding: 20px;
          font-size: 0.78rem;
          line-height: 1.7;
          text-align: left;
        }

        .term-line {
          margin-bottom: 6px;
        }

        .term-line.prompt { color: var(--text-secondary); }
        .term-line.success { color: var(--accent-safe); }
        .term-line.warning { color: #FFB020; }
        .term-line.danger { color: #FF3B5C; }



        /* Bottom CTA */
        .cta-card {
          padding: 64px 32px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .cta-card h2 {
          font-size: 2.2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .cta-card p {
          font-size: 1.05rem;
          color: var(--text-secondary);
          line-height: 1.6;
          max-width: 580px;
        }

        .cta-buttons {
          display: flex;
          gap: 16px;
          margin-top: 12px;
        }

        @media (max-width: 900px) {
          .landing-hero-split {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .hero-left {
            text-align: center;
            align-items: center;
          }
          .hero-badge {
            align-self: center;
          }
          .workflow-pathway {
            justify-content: center;
          }
          .hero-main-title {
            font-size: 2.2rem;
          }
          .layout-split {
            grid-template-columns: 1fr;
            gap: 32px;
          }
          .diagram-arrow {
            transform: rotate(90deg);
            margin: 10px 0;
          }
          .diagram-wrapper {
            flex-direction: column;
          }
        }

        @media (max-width: 480px) {
          .landing-container {
            gap: 48px;
          }
          .cta-card h2 {
            font-size: 1.6rem;
          }
          .cta-buttons {
            flex-direction: column;
            width: 100%;
          }
          .cta-buttons button {
            width: 100%;
          }
          .hero-ctas {
            flex-direction: column;
            width: 100%;
            padding: 0 20px;
          }
          .hero-ctas button {
            width: 100%;
          }
        }

        /* Skeleton Loading styles */
        .fixture-skeleton {
          display: flex;
          flex-direction: column;
          gap: 16px;
          opacity: 0.6;
        }

        .skeleton-line {
          height: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-line.title {
          width: 60%;
        }

        .skeleton-line.detail {
          width: 80%;
          height: 10px;
        }

        .skeleton-matchup {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 0;
        }

        .skeleton-team {
          width: 50px;
          height: 50px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
          animation: pulse 1.5s infinite ease-in-out;
        }

        .skeleton-vs {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        .skeleton-details {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @keyframes pulse {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.3; }
        }

        /* Rolling Football / No Live Match styles */
        .no-live-matches-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          min-height: 80px;
          background: rgba(255, 255, 255, 0.01);
          border: 1px dashed rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          padding: 12px;
        }

        .rolling-football {
          font-size: 1.5rem;
          display: inline-block;
          animation: spin-and-roll 3s ease-in-out infinite alternate;
        }

        .no-live-text {
          font-size: 0.82rem;
          color: var(--text-tertiary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        @keyframes spin-and-roll {
          0% {
            transform: translateX(-15px) rotate(0deg);
          }
          100% {
            transform: translateX(15px) rotate(360deg);
          }
        }

        /* $PSAI Token Live Banner Styling */
        .token-banner-glow {
          position: relative;
          width: 100%;
          background: rgba(10, 14, 23, 0.45);
          box-shadow: 0 0 25px rgba(168, 85, 247, 0.15), inset 0 0 20px rgba(168, 85, 247, 0.05);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-top: 24px;
          backdrop-filter: blur(12px);
          transition: all 0.3s ease;
          z-index: 10;
          padding: 1px; /* 1px padding acts as the border width */
        }

        .token-banner-glow::before {
          content: '';
          position: absolute;
          top: -150%;
          left: -150%;
          width: 400%;
          height: 400%;
          background: conic-gradient(
            transparent,
            rgba(168, 85, 247, 0.1) 10%,
            rgba(168, 85, 247, 1) 30%,
            rgba(0, 229, 255, 1) 50%,
            rgba(75, 123, 245, 1) 70%,
            transparent 90%
          );
          animation: neon-border-spin 6s infinite linear;
          z-index: 1;
        }

        @keyframes neon-border-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .token-banner-inner {
          position: relative;
          background: rgba(10, 14, 23, 0.94);
          border-radius: calc(var(--radius-lg) - 1px);
          width: 100%;
          height: 100%;
          z-index: 2;
          background-image: linear-gradient(135deg, rgba(168, 85, 247, 0.03) 0%, rgba(75, 123, 245, 0.03) 100%);
        }

        .token-banner-glow:hover {
          box-shadow: 0 0 35px rgba(168, 85, 247, 0.25), inset 0 0 20px rgba(168, 85, 247, 0.1);
        }

        .token-banner-content {
          padding: 16px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          z-index: 3;
        }

        .token-banner-left {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }

        .token-banner-badge {
          background: var(--accent-purple);
          color: #000;
          font-weight: 800;
          font-size: 0.65rem;
          padding: 3px 8px;
          border-radius: 4px;
          letter-spacing: 0.08em;
          box-shadow: 0 0 10px rgba(168, 85, 247, 0.3);
        }

        .token-banner-title {
          font-weight: 900;
          font-size: 1.15rem;
          color: var(--accent-purple);
          text-shadow: 0 0 10px rgba(168, 85, 247, 0.2);
        }

        .token-banner-desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .token-banner-ca-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .token-banner-ca-box:hover {
          background: rgba(168, 85, 247, 0.08);
          border-color: rgba(168, 85, 247, 0.3);
        }

        .ca-label {
          font-size: 0.72rem;
          color: var(--text-tertiary);
          font-weight: 700;
        }

        .ca-address {
          font-size: 0.8rem;
          color: #fff;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .btn-copy-ca {
          background: transparent;
          border: none;
          color: var(--accent-purple);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0 4px;
          cursor: pointer;
          text-transform: uppercase;
        }

        .token-banner-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }

        .btn-banner-swap {
          padding: 8px 16px;
          font-size: 0.82rem;
        }

        @media (max-width: 900px) {
          .token-banner-content {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            padding: 20px;
          }
          
          .token-banner-left {
            justify-content: flex-start;
          }

          .token-banner-right {
            justify-content: stretch;
          }

          .btn-banner-swap {
            flex: 1;
            text-align: center;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};
