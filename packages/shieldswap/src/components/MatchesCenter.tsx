import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SignalIcon, CalendarIcon, CheckIcon } from "./Icons";

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

const FLAG_MAP: Record<string, string> = {
  // A-Z World Cup Countries & Common Teams
  "Argentina": "🇦🇷",
  "Australia": "🇦🇺",
  "Belgium": "🇧🇪",
  "Brazil": "🇧🇷",
  "Canada": "🇨🇦",
  "Cameroon": "🇨🇲",
  "Costa Rica": "🇨🇷",
  "Croatia": "🇭🇷",
  "Denmark": "🇩🇰",
  "Ecuador": "🇪🇨",
  "England": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "France": "🇫🇷",
  "Germany": "🇩🇪",
  "Ghana": "🇬🇭",
  "Iran": "🇮🇷",
  "Japan": "🇯🇵",
  "Mexico": "🇲🇽",
  "Morocco": "🇲🇦",
  "Netherlands": "🇳🇱",
  "Poland": "🇵🇱",
  "Portugal": "🇵🇹",
  "Qatar": "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  "Senegal": "🇸🇳",
  "Serbia": "🇷🇸",
  "South Korea": "🇰🇷",
  "South Africa": "🇿🇦",
  "Spain": "🇪🇸",
  "Switzerland": "🇨🇭",
  "Tunisia": "🇹🇳",
  "United States": "🇺🇸",
  "USA": "🇺🇸",
  "Uruguay": "🇺🇾",
  "Wales": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  "Bosnia-Herzegovina": "🇧🇦",
  "Bosnia and Herzegovina": "🇧🇦",
  "Czechia": "🇨🇿",
  "Paraguay": "🇵🇾",
  "Haiti": "🇭🇹",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Turkey": "🇹🇷",
  "Curacao": "🇨🇼",
  "Sweden": "🇸🇪",
  "Ivory Coast": "🇨🇮",
  "Norway": "🇳🇴",
  "Panama": "🇵🇦",
  "Colombia": "🇨🇴",

  // 3-Letter ISO/FIFA Code Mappings (Case-insensitive matches)
  "ARG": "🇦🇷",
  "AUS": "🇦🇺",
  "BEL": "🇧🇪",
  "BRA": "🇧🇷",
  "CAN": "🇨🇦",
  "CRO": "🇭🇷",
  "ECU": "🇪🇨",
  "ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "FRA": "🇫🇷",
  "GER": "🇩🇪",
  "IRN": "🇮🇷",
  "JPN": "🇯🇵",
  "MEX": "🇲🇽",
  "MAR": "🇲🇦",
  "NED": "🇳🇱",
  "POR": "🇵🇹",
  "KSA": "🇸🇦",
  "SEN": "🇸🇳",
  "KOR": "🇰🇷",
  "ESP": "🇪🇸",
  "SUI": "🇨🇭",
  "URU": "🇺🇾",
  "TUR": "🇹🇷",
  "PAR": "🇵🇾"
};

const getFlag = (team: string) => {
  const normalized = team.toLowerCase().trim();
  
  // 1. Exact match or check if key is a substring of the team name
  for (const [key, value] of Object.entries(FLAG_MAP)) {
    if (normalized.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 2. Fallback to generic soccer ball if no flag is found
  return "⚽";
};

export const MatchesCenter: React.FC<MatchesCenterProps> = ({ wallet, onActivityLog }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Pagination states
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const PAGE_SIZE = 20;

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
      message: "Manually synchronized live World Cup match feeds."
    });
  };

  // Categorize
  const liveMatches = matches.filter(m => m.status === "LIVE");
  const scheduledMatches = matches
    .filter(m => m.status === "SCHEDULED")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const finishedMatches = matches
    .filter(m => m.status === "FINISHED" || m.status === "FT")
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Pagination calculation
  const totalUpcomingPages = Math.ceil(scheduledMatches.length / PAGE_SIZE);
  const paginatedUpcoming = scheduledMatches.slice((upcomingPage - 1) * PAGE_SIZE, upcomingPage * PAGE_SIZE);

  const totalCompletedPages = Math.ceil(finishedMatches.length / PAGE_SIZE);
  const paginatedCompleted = finishedMatches.slice((completedPage - 1) * PAGE_SIZE, completedPage * PAGE_SIZE);

  const formatKickoffTime = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusText = (match: Match) => {
    if (match.status === "LIVE") return `LIVE ${match.minute ? match.minute : ""}'`;
    if (match.status === "FINISHED" || match.status === "FT") return "FT";
    return "UPCOMING";
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
          ← Prev
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
          Next →
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
          <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: 0, color: '#fff' }}>⚽ World Cup Matches Hub</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Real-time Sportmonks Live Data Feed (Auto-syncs every 30 seconds)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              Refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleManualRefresh}
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {loading ? "Syncing..." : "🔄 Force Sync"}
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
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Connecting to Sportmonks feed...</span>
        </div>
      ) : (
        <div className="matches-catalog-grid" style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          
          {/* 1. LIVE NOW */}
          <section className="matches-section">
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#00ff88', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
              LIVE MATCHES ({liveMatches.length})
            </h3>
            {liveMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                No matches are currently in play. Speculators can simulate live updates in the Scout Console.
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
                          <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{getFlag(m.home)}</span> {m.home}
                          </span>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[0]?.trim() || '0'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.92rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>{getFlag(m.away)}</span> {m.away}
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
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.3rem' }}>{getFlag(m.home)}</span> {m.home}
                          </span>
                          <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#00ff88', fontFamily: 'monospace' }}>
                            {m.score.split('-')[0]?.trim() || '0'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.3rem' }}>{getFlag(m.away)}</span> {m.away}
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
                          <span style={{ color: '#00ff88', fontWeight: 'bold' }}>⚡ Active updates processing</span>
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
              UPCOMING FIXTURES ({scheduledMatches.length})
            </h3>
            {scheduledMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                No upcoming scheduled fixtures.
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginBottom: '14px' }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{getFlag(m.home)}</span> {m.home}
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{getFlag(m.away)}</span> {m.away}
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
              COMPLETED MATCHES ({finishedMatches.length})
            </h3>
            {finishedMatches.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px dashed var(--border-default)' }}>
                No completed matches.
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
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{getFlag(m.home)}</span> {m.home}
                          </span>
                          <span style={{ fontFamily: 'monospace' }}>{m.score.split('-')[0]?.trim()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{getFlag(m.away)}</span> {m.away}
                          </span>
                          <span style={{ fontFamily: 'monospace' }}>{m.score.split('-')[1]?.trim()}</span>
                        </div>
                      </div>

                      {/* Venue & FT status */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>
                        <span>📍 {m.venue.length > 22 ? `${m.venue.slice(0, 20)}...` : m.venue}</span>
                        <span style={{ color: 'var(--text-tertiary)' }}>✓ FT</span>
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
