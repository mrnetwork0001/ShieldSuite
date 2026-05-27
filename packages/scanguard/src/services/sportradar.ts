/**
 * Sportradar Soccer API v4 — Integration Service
 * Packages: Soccer Base + Soccer Extended Base (REST)
 * Docs: https://developer.sportradar.com/docs/read/soccer/Soccer_v4
 */
import { logger } from "../logger.js";

function getApiKey(): string {
  return process.env.SPORTRADAR_API_KEY || "";
}
const BASE_URL = "https://api.sportradar.com/soccer/trial/v4/en";

// ── Response Cache (respect 1 req/sec trial rate limit) ───────────────────
const cache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 30_000; // 30 seconds

function getCached(key: string): any | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

// ── Rate limiter (1 req/sec for trial) ────────────────────────────────────
let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1500) {
    await new Promise(r => setTimeout(r, 1500 - elapsed));
  }
  lastRequestTime = Date.now();

  const res = await fetch(url, {
    headers: { "Accept": "application/json" }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sportradar API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

// ── Internal match format ─────────────────────────────────────────────────
export interface SportradarMatch {
  id: string;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  status: "LIVE" | "FINISHED" | "SCHEDULED";
  matchStatus: string; // e.g. "1st_half", "halftime", "ended"
  minute: string;
  competition: string;
  season: string;
  venue: string | null;
  scheduled: string;
  events: SportradarEvent[];
}

export interface SportradarEvent {
  type: "score_change" | "yellow_card" | "red_card" | "substitution" | string;
  time: string;
  matchTime: number;
  player: string;
  team: "home" | "away";
  homeScore?: number;
  awayScore?: number;
}

// ── Parse Sportradar response into our format ─────────────────────────────
function parseMatch(item: any): SportradarMatch {
  const se = item.sport_event || {};
  const status = item.sport_event_status || {};
  const competitors = se.competitors || [];
  const context = se.sport_event_context || {};

  const home = competitors.find((c: any) => c.qualifier === "home") || {};
  const away = competitors.find((c: any) => c.qualifier === "away") || {};

  let matchState: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
  const rawStatus = (status.status || "").toLowerCase();
  const matchStatusRaw = (status.match_status || "").toLowerCase();

  // Check both status and match_status for live indicators
  const liveMatchStatuses = ["1st_half", "2nd_half", "halftime", "extra_time", "penalty", "awaiting_extra_time", "awaiting_penalties", "interrupted"];
  if (rawStatus === "live" || rawStatus === "inprogress" || liveMatchStatuses.includes(matchStatusRaw)) {
    matchState = "LIVE";
  } else if (rawStatus === "closed" || rawStatus === "ended" || matchStatusRaw === "ended" || matchStatusRaw === "aet" || matchStatusRaw === "ap") {
    matchState = "FINISHED";
  }

  return {
    id: se.id || "",
    home: home.name || "TBD",
    away: away.name || "TBD",
    homeScore: status.home_score ?? 0,
    awayScore: status.away_score ?? 0,
    status: matchState,
    matchStatus: status.match_status || rawStatus || "not_started",
    minute: status.clock?.played || status.match_status || "",
    competition: context.competition?.name || context.category?.name || "Unknown",
    season: context.season?.name || "",
    venue: se.venue?.name || null,
    scheduled: se.scheduled || "",
    events: [],
  };
}

// ── Public API Methods ────────────────────────────────────────────────────

/** Check if Sportradar is configured */
export function isConfigured(): boolean {
  return getApiKey().length > 0;
}

/** Fetch all currently live matches across all competitions */
export async function fetchLiveMatches(): Promise<SportradarMatch[]> {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];

  const cacheKey = "live_summaries";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/schedules/live/summaries.json?api_key=${API_KEY}`;
    const data = await rateLimitedFetch(url);
    const matches = (data.summaries || []).map(parseMatch);
    setCache(cacheKey, matches);
    logger.info(`[Sportradar] Fetched ${matches.length} live matches`);
    return matches;
  } catch (err: any) {
    logger.error(`[Sportradar] Failed to fetch live matches: ${err.message}`);
    return [];
  }
}

/** Fetch all matches for a specific date (YYYY-MM-DD) */
export async function fetchDaySchedule(date?: string): Promise<SportradarMatch[]> {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];

  const d = date || new Date().toISOString().split("T")[0];
  const cacheKey = `schedule_${d}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // Try results endpoint first (available on Soccer Base)
    const url = `${BASE_URL}/schedules/${d}/results.json?api_key=${API_KEY}`;
    const data = await rateLimitedFetch(url);
    const matches = (data.results || data.summaries || []).map(parseMatch);
    setCache(cacheKey, matches);
    logger.info(`[Sportradar] Fetched ${matches.length} matches for ${d}`);
    return matches;
  } catch (err: any) {
    logger.warn(`[Sportradar] Day schedule for ${d} failed: ${err.message}. Skipping.`);
    return [];
  }
}

/** Fetch World Cup competition schedule */
export async function fetchWorldCupSchedule(): Promise<SportradarMatch[]> {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];

  const cacheKey = "worldcup_schedule";
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // FIFA World Cup competition ID — sr:competition:17
  try {
    const url = `${BASE_URL}/competitions/sr:competition:17/summaries.json?api_key=${API_KEY}`;
    const data = await rateLimitedFetch(url);
    const matches = (data.summaries || []).map(parseMatch);
    setCache(cacheKey, matches);
    logger.info(`[Sportradar] Fetched ${matches.length} World Cup matches`);
    return matches;
  } catch (err: any) {
    logger.warn(`[Sportradar] Failed to fetch WC schedule: ${err.message}`);
    return [];
  }
}

/** Fetch match timeline (goals, cards, events) for a specific match */
export async function fetchMatchTimeline(eventId: string): Promise<SportradarEvent[]> {
  const API_KEY = getApiKey();
  if (!API_KEY) return [];

  const cacheKey = `timeline_${eventId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${BASE_URL}/sport_events/${eventId}/timeline.json?api_key=${API_KEY}`;
    const data = await rateLimitedFetch(url);
    const events: SportradarEvent[] = (data.timeline || [])
      .filter((e: any) => ["score_change", "yellow_card", "red_card"].includes(e.type))
      .map((e: any) => ({
        type: e.type,
        time: e.time || "",
        matchTime: e.match_time || 0,
        player: e.player?.name || "Unknown",
        team: e.team || "home",
        homeScore: e.home_score,
        awayScore: e.away_score,
      }));
    setCache(cacheKey, events);
    return events;
  } catch (err: any) {
    logger.warn(`[Sportradar] Failed to fetch timeline for ${eventId}: ${err.message}`);
    return [];
  }
}

/** Multi-league demo: fetch today's matches grouped by competition */
export async function fetchMultiLeagueDemo(): Promise<{
  source: string;
  timestamp: string;
  totalMatches: number;
  leagues: Array<{
    name: string;
    matchCount: number;
    matches: Array<{
      home: string;
      away: string;
      score: string;
      status: string;
      matchStatus: string;
      venue: string | null;
      date: string;
      minute: string;
    }>;
  }>;
}> {
  const API_KEY = getApiKey();
  if (!API_KEY) {
    return { source: "sportradar", timestamp: new Date().toISOString(), totalMatches: 0, leagues: [] };
  }

  // 1) Fetch LIVE matches first — most critical for real-time display
  const liveMatches = await fetchLiveMatches();
  const matchMap = new Map<string, SportradarMatch>();

  // Add live matches first (they have real-time scores)
  for (const lm of liveMatches) {
    matchMap.set(lm.id, lm);
  }
  logger.info(`[Sportradar Demo] ${liveMatches.length} live matches loaded`);

  // 2) Backfill with today's day schedule (adds finished + scheduled matches)
  const today = new Date().toISOString().split("T")[0];
  const todayMatches = await fetchDaySchedule(today);
  for (const m of todayMatches) {
    if (!matchMap.has(m.id)) {
      matchMap.set(m.id, m); // Only add if not already from live feed
    }
  }

  // 3) If we have few matches, also fetch yesterday
  if (matchMap.size < 10) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const yestMatches = await fetchDaySchedule(yesterday);
    for (const m of yestMatches) {
      if (!matchMap.has(m.id)) matchMap.set(m.id, m);
    }
  }

  let allMatches = [...matchMap.values()];

  // Group by competition
  const leagueMap = new Map<string, SportradarMatch[]>();
  for (const m of allMatches) {
    const key = m.competition || "Other";
    if (!leagueMap.has(key)) leagueMap.set(key, []);
    leagueMap.get(key)!.push(m);
  }

  // Sort leagues: those with LIVE matches first, then by match count
  const statusPriority = (s: string) => s === 'LIVE' ? 0 : s === 'FINISHED' ? 1 : 2;
  const sortedLeagues = [...leagueMap.entries()]
    .sort((a, b) => {
      const aLive = a[1].filter(m => m.status === 'LIVE').length;
      const bLive = b[1].filter(m => m.status === 'LIVE').length;
      if (bLive !== aLive) return bLive - aLive; // Leagues with live matches first
      return b[1].length - a[1].length;
    })
    .slice(0, 6);

  const leagues = sortedLeagues.map(([name, matches]) => {
    // Sort matches: LIVE first, then FINISHED, then SCHEDULED
    const sorted = [...matches].sort((a, b) => statusPriority(a.status) - statusPriority(b.status));
    return {
    name,
    matchCount: matches.length,
    liveCount: matches.filter(m => m.status === 'LIVE').length,
    matches: sorted.slice(0, 5).map(m => ({
      home: m.home,
      away: m.away,
      score: `${m.homeScore} - ${m.awayScore}`,
      status: m.status,
      matchStatus: m.matchStatus,
      venue: m.venue,
      date: m.scheduled,
      minute: m.minute,
    })),
  };
  });

  const totalMatches = allMatches.length;

  return {
    source: "sportradar",
    timestamp: new Date().toISOString(),
    totalMatches,
    leagues,
  };
}
