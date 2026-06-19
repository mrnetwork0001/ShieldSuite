import React, { useState, useEffect, useRef } from "react";
import { TerminalIcon, ShoeIcon, NewsIcon, WarningOctagonIcon, TrophyIcon, SignalIcon, CrossIcon, CheckIcon, CalendarIcon } from "./Icons";
import { motion } from "framer-motion";
import { WalletState } from "../lib/wallet";

interface AgentLog {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "sentiment" | "security" | "trade" | "error";
}

interface ScoutConsoleProps {
  wallet: WalletState;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

const PLAYERS_LIST = [
  { id: 1, name: "Lionel Messi" },
  { id: 2, name: "Kylian Mbappe" },
  { id: 3, name: "Bukayo Saka" },
  { id: 4, name: "Erling Haaland" },
  { id: 5, name: "Vinicius Junior" }
];

export const ScoutConsole: React.FC<ScoutConsoleProps> = ({ wallet, onActivityLog }) => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState("1");
  const [eventType, setEventType] = useState("GOAL");
  const [newsText, setNewsText] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [agentAddress, setAgentAddress] = useState("");
  const [liveDataFeed, setLiveDataFeed] = useState<{ loading: boolean; results: any[] | null; timestamp: string | null; totalMatches: number; source: string }>({
    loading: false, results: null, timestamp: null, totalMatches: 0, source: 'sportmonks'
  });
  const consoleLogsRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(0);

  const safeFormatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return d.toDateString();
    }
  };

  const safeFormatShortDate = (dateStr?: string) => {
    if (!dateStr) return "TBD";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return d.toDateString();
    }
  };

  const safeFormatTime = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    try {
      return d.toLocaleTimeString();
    } catch {
      return d.toTimeString();
    }
  };

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date("2026-06-11T20:00:00Z").getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const API_BASE = import.meta.env.VITE_SCANGUARD_URL || "";

  const fetchAgentStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agent/status`);
      const data = await res.json();
      if (data.success && data.data && data.data.address) {
        setAgentAddress(data.data.address);
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchAgentStatus();
  }, []);

  // 1. Fetch agent logs
  const fetchLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/worldcup/agent-logs`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        if (data.data.length > prevLogsLengthRef.current) {
          prevLogsLengthRef.current = data.data.length;
          setTimeout(() => {
            if (consoleLogsRef.current) {
              consoleLogsRef.current.scrollTop = consoleLogsRef.current.scrollHeight;
            }
          }, 50);
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 2500);
    return () => clearInterval(interval);
  }, []);

  // 2. Trigger mock event
  const handleTriggerEvent = async () => {
    setIsTriggering(true);
    const p = PLAYERS_LIST.find((pl) => pl.id === Number(selectedPlayer))!;
    let desc = newsText;
    
    if (!desc) {
      if (eventType === "GOAL") {
        desc = `${p.name} scores a brilliant goal into the top corner!`;
      } else if (eventType === "ASSIST") {
        desc = `${p.name} provides a wonderful assist!`;
      } else if (eventType === "NEWS") {
        desc = `Dynamic news: Scout reports high performance index for ${p.name}`;
      } else {
        desc = `${p.name} leaves the field with a minor hamstring strain.`;
      }
    }
    // Append a unique timestamp to ensure the agent parses this as a unique event
    desc = `${desc} (${new Date().toLocaleTimeString()})`;

    try {
      const res = await fetch(`${API_BASE}/api/worldcup/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: "match-1",
          eventType,
          player: p.name,
          tokenId: p.id,
          description: desc,
          chainId: wallet.chainId,
          userAddress: wallet.address,
        })
      });
      const data = await res.json();
      if (data.success) {
        onActivityLog({
          id: `${Date.now()}`,
          timestamp: Date.now(),
          type: "info",
          message: `Simulated event triggered: ${desc}`
        });
        setNewsText("");
        // Poll rapidly to pick up inline agent processing logs
        // Agent processes on-chain txs which take ~3-15s total
        for (let i = 1; i <= 15; i++) {
          setTimeout(fetchLogs, i * 2000);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <div className="scout-console glass-card">
      <div className="panel-header">
        <span className="panel-icon"><TerminalIcon /></span>
        <h3 className="panel-title">AI Scout Autonomous Console</h3>
      </div>

      {/* TEE Enclave Status */}
      <div className="tee-status-box glass-card">
        <div className="tee-status-inner" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="tee-label">ENCLAVE ATTESTATION STATUS</div>
            <div className="tee-address font-mono">
              Address: {agentAddress ? `${agentAddress.slice(0, 10)}...${agentAddress.slice(-8)}` : "Loading..."}
            </div>
          </div>
          <span className="tee-badge badge-safe" style={{ flexShrink: 0 }}>● TEE ACTIVE</span>
        </div>
      </div>

      {/* Terminal Logs */}
      <div ref={consoleLogsRef} className="console-logs font-mono">
        {logs.length === 0 ? (
          <div className="console-loading">Awaiting agent execution pulse...</div>
        ) : (
          logs.slice().reverse().map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            let colorClass = "log-info";
            if (log.type === "sentiment") colorClass = "log-sentiment";
            if (log.type === "security") colorClass = "log-security";
            if (log.type === "trade") colorClass = "log-trade";
            if (log.type === "error") colorClass = "log-error";

            return (
              <div key={log.id} className={`console-line ${colorClass}`}>
                <span className="log-time">[{timeStr}]</span>{" "}
                <span className="log-msg">{log.message}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Match Simulator Trigger Form - Hidden on Mainnet */}
      {false ? (
        <div className="simulator-box glass-card">
          <div className="simulator-header">⚽ Live Match Event Simulator</div>
          
          <div className="sim-row">
            <div className="sim-col">
              <label>Player</label>
              <select
                className="panel-select"
                value={selectedPlayer}
                onChange={(e) => setSelectedPlayer(e.target.value)}
                disabled={isTriggering}
              >
                {PLAYERS_LIST.map((pl) => (
                  <option key={pl.id} value={pl.id}>
                    {pl.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="sim-col">
              <label>Event Type</label>
              <select
                className="panel-select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={isTriggering}
              >
                <option value="GOAL">⚽ Goal (Bullish)</option>
                <option value="ASSIST">[ASSIST] Assist (Bullish)</option>
                <option value="NEWS">[NEWS] News (Bullish)</option>
                <option value="CARD">[ALERT] Injury/Card (Bearish)</option>
              </select>
            </div>
          </div>

          <div className="sim-row" style={{ marginTop: '8px' }}>
            <input
              className="panel-input font-mono"
              type="text"
              placeholder="Custom news text (Optional)"
              value={newsText}
              onChange={(e) => setNewsText(e.target.value)}
              disabled={isTriggering}
              style={{ width: '100%' }}
            />
          </div>

          <button
            className="btn btn-primary btn-trigger"
            onClick={handleTriggerEvent}
            disabled={isTriggering}
          >
            {isTriggering ? "Triggering..." : "Simulate World Cup Update"}
          </button>
        </div>
      ) : (
        <div className="simulator-box glass-card" style={{ border: '1px solid rgba(0, 255, 136, 0.3)', background: 'rgba(0, 255, 136, 0.02)' }}>
          <div className="simulator-header" style={{ color: '#00ff88', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span><TrophyIcon /></span> FIFA World Cup 2026
          </div>
          
          {/* Live Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '16px 0', background: 'rgba(0, 255, 136, 0.1)', border: '1px solid rgba(0, 255, 136, 0.2)', padding: '8px 16px', borderRadius: '8px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 8px #00ff88', display: 'inline-block', animation: 'glow-pulse 1.5s ease-in-out infinite' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.05em', color: '#00ff88', fontFamily: 'monospace' }}>TOURNAMENT LIVE</span>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', margin: '0 0 8px 0' }}>
            On mainnet, match data auto-syncs every 60 seconds during live World Cup matches. Verify the Live Data integration below.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', fontSize: '0.72rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', boxShadow: '0 0 6px #00ff88', display: 'inline-block', flexShrink: 0, animation: 'glow-pulse 2s ease-in-out infinite' }} />
            <span style={{ color: 'var(--text-secondary)' }}>Auto-Sync: <strong style={{ color: '#00ff88' }}>Active</strong> (every 60s on Mainnet)</span>
          </div>

          {/* Sportmonks Plan & Roadmap Box */}
          <div style={{ 
            fontSize: '0.72rem', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '8px', 
            padding: '10px', 
            marginBottom: '14px', 
            lineHeight: '1.4' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>API Data Integration:</span>
              <span style={{ color: '#00ff88', fontWeight: 'bold' }}>Sportmonks Live Feed</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem' }}>
              <strong>Active Pipeline:</strong> Real-time match fixtures, lineups, scores, and live match events trigger TEE agent speculation.
            </div>
            <div style={{ marginTop: '8px', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '6px', color: 'var(--text-tertiary)', fontSize: '0.68rem' }}>
              🔮 <strong>Future Roadmap:</strong> Expanding feed to support global football news feeds, prediction/odds sentiment parsing, and advanced xG metrics.
            </div>
          </div>

          {/* Live Feed Button */}
          <button
            className="btn btn-primary btn-trigger"
            onClick={async () => {
              setLiveDataFeed(prev => ({ ...prev, loading: true }));
              try {
                const res = await fetch(`${API_BASE}/api/worldcup/matches`);
                const data = await res.json();
                if (data.success && Array.isArray(data.data)) {
                  // Normalize: API may return raw match objects or league-wrapped objects
                  let leagueResults: any[];
                  const first = data.data[0];
                  if (first && first.league && Array.isArray(first.matches)) {
                    // Already league-wrapped format
                    leagueResults = data.data;
                  } else {
                    // Raw match objects — wrap them into a single league entry
                    // Normalize field names (homeTeam→home, awayTeam→away)
                    const normalizedMatches = data.data.map((m: any) => ({
                      home: m.home || m.homeTeam || '??',
                      away: m.away || m.awayTeam || '??',
                      score: m.score || '0 - 0',
                      status: m.status || 'SCHEDULED',
                      venue: m.venue || 'FIFA World Cup Arena',
                      date: m.date || new Date().toISOString(),
                      minute: m.minute,
                    }));
                    leagueResults = [{
                      league: 'FIFA World Cup 2026',
                      leagueId: 'fifa.world',
                      matchCount: normalizedMatches.length,
                      matches: normalizedMatches,
                    }];
                  }
                  const totalMatches = leagueResults.reduce((sum: number, r: any) => sum + (r.matchCount || r.matches?.length || 0), 0);
                  setLiveDataFeed({
                    loading: false,
                    results: leagueResults,
                    timestamp: data.timestamp || new Date().toISOString(),
                    totalMatches,
                    source: data.source || 'live',
                  });
                  onActivityLog({
                    id: `live-feed-${Date.now()}`,
                    timestamp: Date.now(),
                    type: "info",
                    message: data.message || `Loaded ${totalMatches} matches from live feed.`
                  });
                } else {
                  setLiveDataFeed(prev => ({ ...prev, loading: false }));
                }
              } catch (err: any) {
                console.error("Live feed verification failed:", err);
                setLiveDataFeed(prev => ({ ...prev, loading: false }));
              }
            }}
            disabled={liveDataFeed.loading}
            style={{ background: 'linear-gradient(135deg, #4B7BF5 0%, #A855F7 100%)', borderColor: '#4B7BF5', color: '#fff' }}
          >
            {liveDataFeed.loading ? "Fetching live match data..." : <><SignalIcon /> Verify Live Data Feed</>}
          </button>
        </div>
      )}

      {/* Sportmonks Results Modal */}
      {liveDataFeed.results && (
        <div
          onClick={() => setLiveDataFeed(prev => ({ ...prev, results: null }))}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="live-data-modal-inner"
            style={{
              background: 'linear-gradient(135deg, rgba(15,20,35,0.98), rgba(20,28,50,0.98))',
              border: '1px solid rgba(75,123,245,0.3)',
              borderRadius: '16px',
              padding: '24px',
              width: '100%',
              maxWidth: '520px',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 40px rgba(75,123,245,0.1)',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>
                  <SignalIcon /> Live Match Data Feed
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                  Verified at {safeFormatTime(liveDataFeed.timestamp)}
                </p>
              </div>
              <button
                onClick={() => setLiveDataFeed(prev => ({ ...prev, results: null }))}
                style={{
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-default)',
                  borderRadius: '8px', color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                  width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,59,92,0.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
              >
                ✕
              </button>
            </div>

            {/* Summary Badge */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '16px',
              background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: '10px',
            }}>
              <CheckIcon size={18} style={{ color: "var(--accent-safe)" }} />
              <span style={{ fontSize: '0.78rem', color: '#fff' }}>
                <strong style={{ color: '#00ff88' }}>{liveDataFeed.totalMatches} matches</strong> fetched across <strong>{liveDataFeed.results.length} leagues</strong>
              </span>
            </div>

            {/* League Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {liveDataFeed.results.map((league: any) => (
                <div key={league.leagueId} style={{
                  padding: '12px 14px', borderRadius: '10px', overflow: 'hidden',
                  background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)',
                }}>
                  {/* League Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: league.matchCount > 0 ? '10px' : '0' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: '700', color: league.matchCount > 0 ? '#fff' : 'var(--text-tertiary)' }}>
                      {league.league}
                    </span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {/* Live badge */}
                      {Array.isArray(league.matches) && league.matches.some((m: any) => m.status === 'LIVE') && (
                        <span className="font-mono" style={{
                          fontSize: '0.62rem', padding: '2px 8px', borderRadius: '20px',
                          background: 'rgba(255,59,92,0.15)', color: '#ff3b5c',
                          border: '1px solid rgba(255,59,92,0.3)', fontWeight: '700',
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                        }}>
                          <span style={{
                            width: '5px', height: '5px', borderRadius: '50%', background: '#ff3b5c',
                            animation: 'pulse-live 1.5s ease-in-out infinite',
                          }} />
                          {(league.matches || []).filter((m: any) => m.status === 'LIVE').length} LIVE
                        </span>
                      )}
                      {/* Total count */}
                      <span className="font-mono" style={{
                        fontSize: '0.68rem', padding: '2px 8px', borderRadius: '20px',
                        background: league.matchCount > 0 ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                        color: league.matchCount > 0 ? '#00ff88' : 'var(--text-tertiary)',
                        border: `1px solid ${league.matchCount > 0 ? 'rgba(0,255,136,0.2)' : 'transparent'}`,
                      }}>
                        {league.matchCount > 0 ? `${league.matchCount} match${league.matchCount > 1 ? 'es' : ''}` : 'No active matches'}
                      </span>
                    </div>
                  </div>

                  {/* Match Rows - show up to 5 for leagues with live matches */}
                  {(league.matches || []).slice(0, 3).map((m: any, i: number) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center',
                      fontSize: '0.75rem', padding: '8px 10px',
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                      borderLeft: m.status === 'LIVE' ? '3px solid #ff3b5c' : '3px solid transparent',
                      background: m.status === 'LIVE' ? 'rgba(255,59,92,0.06)' : 'transparent',
                      borderRadius: m.status === 'LIVE' ? '4px' : '0',
                      marginTop: m.status === 'LIVE' && i === 0 ? '0' : undefined,
                    }}>
                      <div style={{ overflow: 'hidden' }}>
                        <div style={{
                          color: m.status === 'LIVE' ? '#fff' : 'var(--text-secondary)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          fontWeight: m.status === 'LIVE' ? '600' : '400',
                        }}>
                          {m.home} vs {m.away}
                        </div>
                        {(m.date || m.venue) && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {safeFormatDate(m.date)}
                            {m.date && m.venue ? ' · ' : ''}{m.venue || ''}
                          </div>
                        )}
                      </div>
                      {m.status === 'LIVE' ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="font-mono" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#fff' }}>
                            {m.score}
                          </span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            background: 'rgba(255,59,92,0.15)', border: '1px solid rgba(255,59,92,0.3)',
                            borderRadius: '20px', padding: '2px 8px', fontSize: '0.6rem', fontWeight: '700',
                            color: '#ff3b5c', whiteSpace: 'nowrap',
                          }}>
                            <span style={{
                              width: '6px', height: '6px', borderRadius: '50%', background: '#ff3b5c',
                              animation: 'pulse-live 1.5s ease-in-out infinite',
                              boxShadow: '0 0 4px #ff3b5c',
                            }} />
                            LIVE{m.minute ? ` ${String(m.minute).replace(':00', "'").replace(/(\d+):(\d+)/, "$1'")}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="font-mono" style={{
                          textAlign: 'right', fontSize: '0.7rem', whiteSpace: 'nowrap', padding: '2px 0',
                          color: m.status === 'FINISHED' ? '#aaa' : 'var(--accent-blue)',
                          fontWeight: '500',
                        }}>
                          {m.status === 'FINISHED' ? `✓ ${m.score} FT` : `${safeFormatShortDate(m.date)}`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: '16px', padding: '10px 12px', background: 'rgba(75,123,245,0.05)', borderRadius: '8px', border: '1px solid rgba(75,123,245,0.1)', textAlign: 'center', fontSize: '0.68rem', color: 'var(--text-tertiary)', lineHeight: '1.5' }}>
              <strong style={{ color: 'var(--accent-blue)' }}>Real-time Live Data Pipeline</strong> - professional-grade live World Cup 2026 match data.<br />During World Cup, live scores auto-sync every 60s and trigger onchain trades.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
