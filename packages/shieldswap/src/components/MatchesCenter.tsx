import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignalIcon, CalendarIcon, CheckIcon } from "./Icons";
import { useLanguage } from "../context/LanguageContext";

interface Match {
  home: string;
  away: string;
  score: string;
  status: "FINISHED" | "LIVE" | "SCHEDULED" | string;
  venue: string;
  date: string;
  minute?: string | number;
  events?: any[];
}

interface MatchesCenterProps {
  wallet: any;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning" | "scan" | "swap"; message: string }) => void;
}

const ISO_MAP: Record<string, string> = {
  // Names
  "argentina": "ar",
  "australia": "au",
  "austria": "at",
  "belgium": "be",
  "bolivia": "bo",
  "brazil": "br",
  "bulgaria": "bg",
  "canada": "ca",
  "cameroon": "cm",
  "chile": "cl",
  "china": "cn",
  "colombia": "co",
  "costa rica": "cr",
  "croatia": "hr",
  "cuba": "cu",
  "czechia": "cz",
  "czech republic": "cz",
  "denmark": "dk",
  "ecuador": "ec",
  "egypt": "eg",
  "england": "gb-eng",
  "finland": "fi",
  "france": "fr",
  "germany": "de",
  "ghana": "gh",
  "greece": "gr",
  "haiti": "ht",
  "honduras": "hn",
  "hungary": "hu",
  "iceland": "is",
  "iran": "ir",
  "ireland": "ie",
  "italy": "it",
  "ivory coast": "ci",
  "cote d'ivoire": "ci",
  "côte d'ivoire": "ci",
  "jamaica": "jm",
  "japan": "jp",
  "mexico": "mx",
  "morocco": "ma",
  "netherlands": "nl",
  "holland": "nl",
  "new zealand": "nz",
  "nigeria": "ng",
  "norway": "no",
  "panama": "pa",
  "paraguay": "py",
  "peru": "pe",
  "poland": "pl",
  "portugal": "pt",
  "qatar": "qa",
  "romania": "ro",
  "saudi arabia": "sa",
  "scotland": "gb-sct",
  "senegal": "sn",
  "serbia": "rs",
  "slovakia": "sk",
  "slovenia": "si",
  "south africa": "za",
  "south korea": "kr",
  "korea republic": "kr",
  "korea": "kr",
  "spain": "es",
  "sweden": "se",
  "switzerland": "ch",
  "tunisia": "tn",
  "turkey": "tr",
  "türkiye": "tr",
  "ukraine": "ua",
  "united states": "us",
  "usa": "us",
  "uruguay": "uy",
  "wales": "gb-wls",
  "bosnia-herzegovina": "ba",
  "bosnia and herzegovina": "ba",
  "curacao": "cw",
  "algeria": "dz",
  "cape verde islands": "cv",
  "cape verde": "cv",
  "congo dr": "cd",
  "dr congo": "cd",
  "iraq": "iq",
  "jordan": "jo",
  "uzbekistan": "uz",

  // 3-Letter ISO/FIFA codes
  "arg": "ar",
  "aus": "au",
  "aut": "at",
  "bel": "be",
  "bol": "bo",
  "bra": "br",
  "bul": "bg",
  "can": "ca",
  "cmr": "cm",
  "chi": "cl",
  "chn": "cn",
  "col": "co",
  "crc": "cr",
  "cro": "hr",
  "cub": "cu",
  "cze": "cz",
  "den": "dk",
  "ecu": "ec",
  "egy": "eg",
  "eng": "gb-eng",
  "fin": "fi",
  "fra": "fr",
  "ger": "de",
  "gha": "gh",
  "gre": "gr",
  "hai": "ht",
  "hon": "hn",
  "hun": "hu",
  "isl": "is",
  "irn": "ir",
  "irl": "ie",
  "ita": "it",
  "civ": "ci",
  "jam": "jm",
  "jpn": "jp",
  "mex": "mx",
  "mar": "ma",
  "ned": "nl",
  "nzl": "nz",
  "nga": "ng",
  "nor": "no",
  "pan": "pa",
  "par": "py",
  "per": "pe",
  "pol": "pl",
  "por": "pt",
  "qat": "qa",
  "rou": "ro",
  "ksa": "sa",
  "sco": "gb-sct",
  "sen": "sn",
  "srb": "rs",
  "svk": "sk",
  "slo": "si",
  "rsa": "za",
  "kor": "kr",
  "esp": "es",
  "swe": "se",
  "sui": "ch",
  "tun": "tn",
  "tur": "tr",
  "ukr": "ua",
  "uru": "uy",
  "wal": "gb-wls",
  "bih": "ba",
  "alg": "dz",
  "cpv": "cv",
  "cod": "cd",
  "irq": "iq",
  "jor": "jo",
  "uzb": "uz"
};

const getIsoCode = (team: string): string | null => {
  const normalized = team.trim().toLowerCase();
  
  // 1. First check for exact match of full name or code
  if (ISO_MAP[normalized]) {
    return ISO_MAP[normalized];
  }

  // 2. Split team name by space / non-word chars and check if any word matches a country name or code exactly
  const words = normalized.split(/[\s\-_,]+/);
  for (const word of words) {
    if (ISO_MAP[word]) {
      return ISO_MAP[word];
    }
  }

  // 3. Fallback: check if any country name is a substring of the team name
  // Sort keys by length descending to ensure longer matches take precedence
  const sortedKeys = Object.keys(ISO_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    // Only allow substring match for country names that are long to prevent false short code matches
    if (key.length > 3 && normalized.includes(key)) {
      return ISO_MAP[key];
    }
  }

  // 4. Fallback for tournament placeholders (Group X, Winner, Loser)
  if (normalized.includes("group") || normalized.includes("winner") || normalized.includes("loser")) {
    return "un"; // United Nations flag representing the international tournament stage
  }

  return null;
};

const renderTeamFlag = (teamName: string, size: "sm" | "md" | "lg" = "md") => {
  const isoCode = getIsoCode(teamName);
  const width = size === "sm" ? 36 : size === "md" ? 48 : 64;
  const height = size === "sm" ? 24 : size === "md" ? 32 : 44;
  
  if (isoCode) {
    return (
      <img
        src={`https://flagcdn.com/w80/${isoCode}.png`}
        alt={teamName}
        title={teamName}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          objectFit: "cover",
          borderRadius: "6px",
          border: "1.5px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.35)",
          display: "inline-block",
          verticalAlign: "middle"
        }}
      />
    );
  }

  return (
    <div
      title={teamName}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        background: "linear-gradient(135deg, #1f2937, #111827)",
        border: "1.5px solid rgba(255, 255, 255, 0.1)",
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
        fontSize: size === "sm" ? "1rem" : size === "md" ? "1.3rem" : "1.8rem"
      }}
    >
      ⚽
    </div>
  );
};

const getPrettyName = (team: string): string => {
  const normalized = team.trim().toLowerCase();
  
  const prettyNames: Record<string, string> = {
    "argentina": "Argentina",
    "arg": "Argentina",
    "australia": "Australia",
    "aus": "Australia",
    "austria": "Austria",
    "aut": "Austria",
    "belgium": "Belgium",
    "bel": "Belgium",
    "bolivia": "Bolivia",
    "bol": "Bolivia",
    "brazil": "Brazil",
    "bra": "Brazil",
    "bulgaria": "Bulgaria",
    "bul": "Bulgaria",
    "canada": "Canada",
    "can": "Canada",
    "cameroon": "Cameroon",
    "cmr": "Cameroon",
    "chile": "Chile",
    "chi": "Chile",
    "china": "China",
    "chn": "China",
    "colombia": "Colombia",
    "col": "Colombia",
    "costa rica": "Costa Rica",
    "crc": "Costa Rica",
    "croatia": "Croatia",
    "cro": "Croatia",
    "cuba": "Cuba",
    "cub": "Cuba",
    "czechia": "Czechia",
    "cze": "Czechia",
    "czech republic": "Czechia",
    "denmark": "Denmark",
    "den": "Denmark",
    "ecuador": "Ecuador",
    "ecu": "Ecuador",
    "egypt": "Egypt",
    "egy": "Egypt",
    "england": "England",
    "eng": "England",
    "finland": "Finland",
    "fin": "Finland",
    "france": "France",
    "fra": "France",
    "germany": "Germany",
    "ger": "Germany",
    "ghana": "Ghana",
    "gha": "Ghana",
    "greece": "Greece",
    "gre": "Greece",
    "haiti": "Haiti",
    "hai": "Haiti",
    "honduras": "Honduras",
    "hon": "Honduras",
    "hungary": "Hungary",
    "hun": "Hungary",
    "iceland": "Iceland",
    "isl": "Iceland",
    "iran": "Iran",
    "irn": "Iran",
    "ireland": "Ireland",
    "irl": "Ireland",
    "italy": "Italy",
    "ita": "Italy",
    "ivory coast": "Ivory Coast",
    "cote d'ivoire": "Ivory Coast",
    "civ": "Ivory Coast",
    "jamaica": "Jamaica",
    "jam": "Jamaica",
    "japan": "Japan",
    "jpn": "Japan",
    "mexico": "Mexico",
    "mex": "Mexico",
    "morocco": "Morocco",
    "mar": "Morocco",
    "netherlands": "Netherlands",
    "holland": "Netherlands",
    "ned": "Netherlands",
    "new zealand": "New Zealand",
    "nzl": "New Zealand",
    "nigeria": "Nigeria",
    "nga": "Nigeria",
    "norway": "Norway",
    "nor": "Norway",
    "panama": "Panama",
    "pan": "Panama",
    "paraguay": "Paraguay",
    "par": "Paraguay",
    "peru": "Peru",
    "per": "Peru",
    "poland": "Poland",
    "pol": "Poland",
    "portugal": "Portugal",
    "por": "Portugal",
    "qatar": "Qatar",
    "qat": "Qatar",
    "romania": "Romania",
    "rou": "Romania",
    "saudi arabia": "Saudi Arabia",
    "ksa": "Saudi Arabia",
    "scotland": "Scotland",
    "sco": "Scotland",
    "senegal": "Senegal",
    "sen": "Senegal",
    "serbia": "Serbia",
    "srb": "Serbia",
    "slovakia": "Slovakia",
    "svk": "Slovakia",
    "slovenia": "Slovenia",
    "slo": "Slovenia",
    "south africa": "South Africa",
    "rsa": "South Africa",
    "south korea": "South Korea",
    "korea republic": "South Korea",
    "korea": "South Korea",
    "kor": "South Korea",
    "spain": "Spain",
    "esp": "Spain",
    "sweden": "Sweden",
    "swe": "Sweden",
    "switzerland": "Switzerland",
    "sui": "Switzerland",
    "tunisia": "Tunisia",
    "tun": "Tunisia",
    "turkey": "Turkey",
    "tur": "Turkey",
    "ukraine": "Ukraine",
    "ukr": "Ukraine",
    "united states": "United States",
    "usa": "United States",
    "uruguay": "Uruguay",
    "uru": "Uruguay",
    "wales": "Wales",
    "wal": "Wales",
    "bosnia-herzegovina": "Bosnia",
    "bosnia and herzegovina": "Bosnia",
    "bih": "Bosnia",
    "curacao": "Curacao"
  };

  if (prettyNames[normalized]) {
    return prettyNames[normalized];
  }

  const words = team.split(/[\s\-_,]+/);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
};

const shortenName = (name: string): string => {
  if (name.length > 12) {
    if (name === "Saudi Arabia") return "S. Arabia";
    if (name === "United States") return "USA";
    if (name === "Czech Republic") return "Czechia";
    if (name === "Ivory Coast" || name === "Cote d'Ivoire") return "Ivory Coast";
    return name.slice(0, 10) + ".";
  }
  return name;
};

export const MatchesCenter: React.FC<MatchesCenterProps> = ({ wallet, onActivityLog }) => {
  const { language, t } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Pagination states
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const PAGE_SIZE = isMobile ? 10 : 20;

  const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";

  const fetchMatches = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/worldcup/matches`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        // Flatten all matches across leagues
        let list: Match[] = [];
        for (const item of data.data) {
          if (Array.isArray(item.matches)) {
            list = [...list, ...item.matches];
          }
        }
        setMatches(list);
        setLastRefreshed(new Date());
      } else {
        setError(data.message || "Failed to load matches data.");
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch data from Sportmonks Server.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchMatches(true);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Reset pagination on matches change
  useEffect(() => {
    setUpcomingPage(1);
    setCompletedPage(1);
  }, [matches.length]);

  const handleManualRefresh = () => {
    fetchMatches();
    onActivityLog({
      id: `manual-match-sync-${Date.now()}`,
      timestamp: Date.now(),
      type: "info",
      message: language === "zh" ? "已手动同步实时世界杯赛事数据。" : "Manually synchronized live World Cup match feeds."
    });
  };

  const parseDate = (dateStr: string) => {
    let parseStr = dateStr;
    if (dateStr && !dateStr.includes("Z") && !dateStr.includes("+") && !dateStr.toLowerCase().includes("utc")) {
      parseStr = dateStr.replace(" ", "T") + "Z";
    }
    return new Date(parseStr);
  };

  // Categorize
  const liveMatches = matches.filter(m => m.status === "LIVE");
  const scheduledMatches = matches
    .filter(m => m.status === "SCHEDULED")
    .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
  const finishedMatches = matches
    .filter(m => m.status === "FINISHED" || m.status === "FT")
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

  // Pagination calculation
  const totalUpcomingPages = Math.ceil(scheduledMatches.length / PAGE_SIZE);
  const paginatedUpcoming = scheduledMatches.slice((upcomingPage - 1) * PAGE_SIZE, upcomingPage * PAGE_SIZE);

  const totalCompletedPages = Math.ceil(finishedMatches.length / PAGE_SIZE);
  const paginatedCompleted = finishedMatches.slice((completedPage - 1) * PAGE_SIZE, completedPage * PAGE_SIZE);

  const formatKickoffTime = (dateStr: string) => {
    const d = parseDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getTranslatedTeamName = (teamName: string) => {
    if (language === "zh") {
      const map: Record<string, string> = {
        "Argentina": "阿根廷",
        "France": "法国",
        "England": "英格兰",
        "Brazil": "巴西",
        "Spain": "西班牙",
        "Germany": "德国",
        "United States": "美国",
        "Mexico": "墨西哥",
        "Portugal": "葡萄牙",
        "Netherlands": "荷兰",
        "Belgium": "比利时",
        "Uruguay": "乌拉圭",
        "Japan": "日本",
        "Morocco": "摩洛哥",
        "Canada": "加拿大",
        "Norway": "挪威",
        "China": "中国",
        "Italy": "意大利",
        "Croatia": "克罗地亚",
        "Poland": "波兰",
        "Sweden": "瑞典",
        "Switzerland": "瑞士",
        "Senegal": "塞内加尔",
        "South Korea": "韩国"
      };
      const pretty = getPrettyName(teamName);
      return map[pretty] || pretty;
    }
    return getPrettyName(teamName);
  };

  const getStatusText = (match: Match) => {
    if (match.status === "LIVE") {
      const min = match.minute ? String(match.minute) : "";
      if (!min) return language === "zh" ? "进行中" : "LIVE";
      if (min.endsWith("'") || isNaN(Number(min))) return `${language === "zh" ? "进行中" : "LIVE"} ${min}`;
      return `${language === "zh" ? "进行中" : "LIVE"} ${min}'`;
    }
    if (match.status === "FINISHED" || match.status === "FT") return language === "zh" ? "已完场" : "FT";
    return language === "zh" ? "未开始" : "UPCOMING";
  };

  const renderPagination = (currentPage: number, totalPages: number, onPageChange: (page: number) => void) => {
    if (totalPages <= 1) return null;

    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer' }}
        >
          {language === "zh" ? "← 上一页" : "← Prev"}
        </button>
        {pages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`btn ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              padding: '6px 12px',
              fontSize: '0.72rem',
              cursor: 'pointer',
              background: currentPage === page ? 'linear-gradient(135deg, #4B7BF5 0%, #A855F7 100%)' : undefined,
              borderColor: currentPage === page ? '#4B7BF5' : undefined,
              boxShadow: currentPage === page ? '0 0 10px rgba(75, 123, 245, 0.3)' : undefined
            }}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="btn btn-secondary"
          style={{ padding: '6px 12px', fontSize: '0.72rem', cursor: 'pointer' }}
        >
          {language === "zh" ? "下一页 →" : "Next →"}
        </button>
      </div>
    );
  };

  // Duplicate live matches for infinite marquee when count > 3
  const showMarquee = liveMatches.length > 3;
  const marqueeMatches = showMarquee ? [...liveMatches, ...liveMatches] : liveMatches;
  // Make animation speed scale nicely with count (e.g. 15s per unique match)
  const animationDuration = `${liveMatches.length * 15}s`;

  return (
    <div className="matches-center-container">
      {/* Dynamic Keyframes for Marquee */}
      {showMarquee && (
        <style>{`
          @keyframes live-scroll {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(calc(-50% - 8px));
            }
          }
          .live-carousel-track:hover {
            animation-play-state: paused;
          }
        `}</style>
      )}

      {/* Page Header */}
      <div className="matches-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#fff' }}>⚽ {language === "zh" ? "世界杯赛事中心" : "World Cup Matches Hub"}</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {language === "zh" ? "实时 Sportmonks 比赛数据流（每 30 秒自动同步）" : "Real-time Sportmonks Live Data Feed (Auto-syncs every 30 seconds)"}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {language === "zh" ? "已同步:" : "Refreshed:"} {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleManualRefresh}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? (language === "zh" ? "同步中..." : "Syncing...") : (language === "zh" ? "🔄 强制同步" : "🔄 Force Sync")}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert glass-card" style={{ padding: '16px', border: '1px solid rgba(255, 59, 92, 0.3)', background: 'rgba(255, 59, 92, 0.05)', borderRadius: '12px', color: '#ff3b5c', fontSize: '0.85rem', marginBottom: '24px' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '16px' }}>
          <span className="spin-continuous" style={{ fontSize: '2rem' }}>⚽</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{language === "zh" ? "正在连接 Sportmonks 数据源..." : "Connecting to Sportmonks feed..."}</span>
        </div>
      ) : (
        <div className="matches-catalog-grid" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* 1. LIVE NOW */}
          <section className="matches-section">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#00ff88', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
              {language === "zh" ? "进行中的比赛" : "LIVE MATCHES"} ({liveMatches.length})
            </h3>
            {liveMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                {language === "zh" ? "当前暂无进行中的比赛。特工可以在特工控制台中模拟实时数据更新。" : "No matches are currently in play. Speculators can simulate live updates in the Scout Console."}
              </div>
            ) : showMarquee ? (
              // Marquee Slider Container
              <div className="live-carousel-wrapper" style={{ overflow: 'hidden', width: '100%', padding: '4px 0' }}>
                <div 
                  className="live-carousel-track" 
                  style={{
                    display: 'flex',
                    gap: '16px',
                    width: 'max-content',
                    animation: `live-scroll ${animationDuration} linear infinite`,
                  }}
                >
                  {marqueeMatches.map((m, idx) => (
                    <div
                      key={`live-carousel-${idx}`}
                      className="glass-card live-match-card"
                      style={{
                        width: '320px',
                        flexShrink: 0,
                        padding: '20px',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), rgba(255, 255, 255, 0.02))',
                        boxShadow: '0 0 15px rgba(0, 255, 136, 0.08)',
                        position: 'relative'
                      }}
                    >
                      {/* Live Badge */}
                      <span className="font-mono" style={{
                        position: 'absolute', top: '16px', right: '16px',
                        fontSize: '0.62rem', padding: '3px 8px', borderRadius: '20px',
                        background: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c',
                        border: '1px solid rgba(255, 59, 92, 0.3)', fontWeight: '700',
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff3b5c', animation: 'pulse-live 1.5s ease-in-out infinite' }} />
                        {getStatusText(m)}
                      </span>

                      {/* Teams & Score */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.home, "md")}
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>
                              {language === "zh" ? getTranslatedTeamName(m.home) : shortenName(getPrettyName(m.home))}
                            </span>
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[0]?.trim() || '0'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.away, "md")}
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fff' }}>
                              {language === "zh" ? getTranslatedTeamName(m.away) : shortenName(getPrettyName(m.away))}
                            </span>
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[1]?.trim() || '0'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                        <span>📍 {m.venue.length > 20 ? `${m.venue.slice(0, 18)}...` : m.venue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              // Standard Grid for <= 3 matches
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                <AnimatePresence>
                  {liveMatches.map((m, idx) => (
                    <motion.div
                      key={`live-grid-${idx}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                      className="glass-card live-match-card"
                      style={{
                        padding: '20px',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.03), rgba(255, 255, 255, 0.02))',
                        boxShadow: '0 0 15px rgba(0, 255, 136, 0.08)',
                        position: 'relative'
                      }}
                    >
                      {/* Live Badge */}
                      <span className="font-mono" style={{
                        position: 'absolute', top: '16px', right: '16px',
                        fontSize: '0.62rem', padding: '3px 8px', borderRadius: '20px',
                        background: 'rgba(255, 59, 92, 0.15)', color: '#ff3b5c',
                        border: '1px solid rgba(255, 59, 92, 0.3)', fontWeight: '700',
                        display: 'inline-flex', alignItems: 'center', gap: '4px'
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff3b5c', animation: 'pulse-live 1.5s ease-in-out infinite' }} />
                        {getStatusText(m)}
                      </span>

                      {/* Teams & Score */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.home, "md")}
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
                              {language === "zh" ? getTranslatedTeamName(m.home) : shortenName(getPrettyName(m.home))}
                            </span>
                          </span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[0]?.trim() || '0'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.away, "md")}
                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#fff' }}>
                              {language === "zh" ? getTranslatedTeamName(m.away) : shortenName(getPrettyName(m.away))}
                            </span>
                          </span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[1]?.trim() || '0'}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>
                        <span>📍 {m.venue}</span>
                        {m.events && m.events.length > 0 && (
                          <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{language === "zh" ? "⚡ 特工正在处理实时更新" : "⚡ Active updates processing"}</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>

          {/* 2. UPCOMING FIXTURES */}
          <section className="matches-section">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#4B7BF5', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', color: '#4B7BF5' }}><CalendarIcon size={16} /></span>
              {language === "zh" ? "即将开始的赛程" : "UPCOMING FIXTURES"} ({scheduledMatches.length})
            </h3>
            {scheduledMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                {language === "zh" ? "暂无即将开始的赛程。" : "No upcoming scheduled fixtures."}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {paginatedUpcoming.map((m, idx) => (
                    <div
                      key={`sched-${idx}`}
                      className="glass-card match-card"
                      style={{
                        padding: '16px',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255, 255, 255, 0.01)',
                        position: 'relative',
                        transition: 'transform 0.2s ease, border-color 0.2s ease',
                      }}
                    >
                      <span className="font-mono" style={{
                        position: 'absolute', top: '12px', right: '12px',
                        fontSize: '0.62rem', padding: '2px 8px', borderRadius: '20px',
                        background: 'rgba(75, 123, 245, 0.1)', color: '#4B7BF5',
                        border: '1px solid rgba(75, 123, 245, 0.2)', fontWeight: '600'
                      }}>
                        {getStatusText(m)}
                      </span>

                      {/* Teams */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px', textAlign: 'center' }}>
                          {renderTeamFlag(m.home, "md")}
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getTranslatedTeamName(m.home)}>
                            {language === "zh" ? getTranslatedTeamName(m.home) : shortenName(getPrettyName(m.home))}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', alignSelf: 'center', marginBottom: '16px' }}>VS</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '6px', textAlign: 'center' }}>
                          {renderTeamFlag(m.away, "md")}
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getTranslatedTeamName(m.away)}>
                            {language === "zh" ? getTranslatedTeamName(m.away) : shortenName(getPrettyName(m.away))}
                          </span>
                        </div>
                      </div>

                      {/* Venue & Kickoff */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                        <span>📍 {m.venue.length > 22 ? `${m.venue.slice(0, 20)}...` : m.venue}</span>
                        <span style={{ color: '#4B7BF5', fontWeight: '500' }}>⏰ {formatKickoffTime(m.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination(upcomingPage, totalUpcomingPages, setUpcomingPage)}
              </>
            )}
          </section>

          {/* 3. COMPLETED MATCHES */}
          <section className="matches-section">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ display: 'inline-block', color: 'var(--text-secondary)' }}><CheckIcon size={16} /></span>
              {language === "zh" ? "已结束的比赛" : "COMPLETED MATCHES"} ({finishedMatches.length})
            </h3>
            {finishedMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                {language === "zh" ? "暂无已完场的比赛。" : "No completed matches."}
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                  {paginatedCompleted.map((m, idx) => (
                    <div
                      key={`fin-${idx}`}
                      className="glass-card match-card"
                      style={{
                        padding: '16px',
                        border: '1px solid var(--border-default)',
                        background: 'rgba(255,255,255,0.005)',
                        opacity: 0.85,
                        position: 'relative'
                      }}
                    >
                      <span className="font-mono" style={{
                        position: 'absolute', top: '12px', right: '12px',
                        fontSize: '0.62rem', padding: '2px 8px', borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.03)', color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-default)', fontWeight: '600'
                      }}>
                        {getStatusText(m)}
                      </span>

                      {/* Teams & Score */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.home, "md")}
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                              {language === "zh" ? getTranslatedTeamName(m.home) : shortenName(getPrettyName(m.home))}
                            </span>
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {m.score.split('-')[0]?.trim()}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {renderTeamFlag(m.away, "md")}
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                              {language === "zh" ? getTranslatedTeamName(m.away) : shortenName(getPrettyName(m.away))}
                            </span>
                          </span>
                          <span style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: '700', color: 'var(--text-secondary)' }}>
                            {m.score.split('-')[1]?.trim()}
                          </span>
                        </div>
                      </div>

                      {/* Venue & FT status */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                        <span>📍 {m.venue.length > 22 ? `${m.venue.slice(0, 20)}...` : m.venue}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>✓ {language === "zh" ? "完场" : "FT"}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination(completedPage, totalCompletedPages, setCompletedPage)}
              </>
            )}
          </section>

        </div>
      )}
    </div>
  );
};
