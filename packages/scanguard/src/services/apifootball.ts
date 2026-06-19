/**
 * API-Football (api-sports.io) v3 — Integration Service
 * Docs: https://www.api-football.com/documentation-v3
 */
import { logger } from "../logger.js";

function getApiKey(): string {
  return process.env.APIFOOTBALL_API_KEY || "";
}

/** Check if API-Football is configured */
export function isConfigured(): boolean {
  return getApiKey().length > 0;
}

export interface APIFootballEvent {
  type: "GOAL" | "ASSIST" | "CARD" | "NEWS";
  minute: string | number;
  player: string;
  tokenId: number;
  description: string;
}

export interface APIFootballMatch {
  id: string;
  home: string;
  away: string;
  score: string;
  status: "LIVE" | "FINISHED" | "SCHEDULED";
  venue: string | null;
  date: string;
  minute?: string;
  events?: APIFootballEvent[];
}

const WORLD_CUP_TEAMS = [
  "Argentina", "France", "England", "Brazil", "Spain",
  "Germany", "United States", "Canada", "Mexico", "Portugal",
  "Belgium", "Netherlands", "Uruguay", "Senegal", "Croatia",
  "Morocco", "Japan", "South Korea", "Switzerland", "Ecuador",
  "Saudi Arabia", "Iran", "Australia", "Turkey", "Paraguay"
];

function mapTeamToWorldCup(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = (hash << 5) - hash + teamName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % WORLD_CUP_TEAMS.length;
  return WORLD_CUP_TEAMS[index];
}

function mapTeams(homeClub: string, awayClub: string): { home: string; away: string } {
  const home = mapTeamToWorldCup(homeClub);
  let away = mapTeamToWorldCup(awayClub);
  if (home === away) {
    let hash = 0;
    for (let i = 0; i < awayClub.length; i++) {
      hash = (hash << 5) - hash + awayClub.charCodeAt(i);
      hash |= 0;
    }
    const index = (Math.abs(hash) + 1) % WORLD_CUP_TEAMS.length;
    away = WORLD_CUP_TEAMS[index];
  }
  return { home, away };
}

function mapPlayerNameToTokenId(playerName: string): number {
  const name = playerName.toLowerCase();
  if (name.includes("messi")) return 1;
  if (name.includes("mbapp") || name.includes("mbappe")) return 2;
  if (name.includes("saka")) return 3;
  if (name.includes("haaland")) return 4;
  if (name.includes("vinicius") || name.includes("vini")) return 5;
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 5) + 1;
}

async function fetchMatchEvents(fixtureId: number, apiKey: string): Promise<APIFootballEvent[]> {
  try {
    const url = `https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`;
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });
    if (res.ok) {
      const json = await res.json() as any;
      if (json.response && Array.isArray(json.response)) {
        return json.response.map((ev: any) => {
          const typeStr = (ev.type || "").toUpperCase();
          let type: "GOAL" | "ASSIST" | "CARD" | "NEWS" = "NEWS";
          let description = ev.detail || "";
          
          if (typeStr === "GOAL") {
            type = "GOAL";
            description = `${ev.player?.name || "Player"} scores a goal! (Type: ${ev.detail || "Normal"}${ev.assist?.name ? `, Assist: ${ev.assist.name}` : ""})`;
          } else if (typeStr === "CARD") {
            type = "CARD";
            description = `${ev.player?.name || "Player"} gets a card: ${ev.detail || "Yellow Card"}`;
          } else if (typeStr === "SUBST") {
            type = "NEWS";
            description = `Substitution: ${ev.player?.name || "Player"} off, ${ev.assist?.name || "Player"} on`;
          } else if (typeStr === "VAR") {
            type = "CARD";
            description = `VAR Review: ${ev.detail || "Decision Pending"} involving ${ev.player?.name || "Player"}`;
          }

          const playerName = ev.player?.name || "Unknown Player";
          return {
            type,
            minute: ev.time?.elapsed || 0,
            player: playerName,
            tokenId: mapPlayerNameToTokenId(playerName),
            description
          };
        });
      }
    }
  } catch (err: any) {
    logger.warn(`[API-Football] Failed to fetch events for fixture ${fixtureId}: ${err.message}`);
  }
  return [];
}

export async function fetchWorldCupFixtures(): Promise<APIFootballMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("[API-Football] API key is not configured.");
    return [];
  }

  // Helper function to process fixtures response
  const processFixtures = async (fixturesList: any[]): Promise<APIFootballMatch[]> => {
    const mappedMatches = [];
    for (const item of fixturesList) {
      const homeName = item.teams?.home?.name || "TBD";
      const awayName = item.teams?.away?.name || "TBD";
      const homeGoals = item.goals?.home ?? 0;
      const awayGoals = item.goals?.away ?? 0;
      const score = `${homeGoals} - ${awayGoals}`;

      const shortStatus = (item.fixture?.status?.short || "").toUpperCase();
      let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
      
      if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(shortStatus)) {
        status = "LIVE";
      } else if (["FT", "AET", "PEN", "PST"].includes(shortStatus)) {
        status = "FINISHED";
      }

      const fixtureId = item.fixture?.id;
      let events: APIFootballEvent[] = [];
      if (status === "LIVE" && fixtureId) {
        events = await fetchMatchEvents(fixtureId, apiKey);
      }

      mappedMatches.push({
        id: `apifootball-${fixtureId || Math.random()}`,
        home: homeName,
        away: awayName,
        score,
        status,
        venue: item.fixture?.venue?.name || "FIFA World Cup Arena",
        date: item.fixture?.date || new Date().toISOString(),
        minute: item.fixture?.status?.elapsed ? String(item.fixture.status.elapsed) : undefined,
        events
      });
    }
    return mappedMatches;
  };

  // 1. Try World Cup (League ID 1) - Season 2026 first
  try {
    logger.info("[API-Football] Attempting to fetch real World Cup League 1 fixtures (2026)...");
    const url = "https://v3.football.api-sports.io/fixtures?league=1&season=2026";
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json() as any;
      if (json.response && Array.isArray(json.response) && json.response.length > 0) {
        logger.info(`[API-Football] Successfully fetched ${json.response.length} World Cup 2026 matches.`);
        return await processFixtures(json.response);
      }
      logger.info("[API-Football] World Cup 2026 returned no fixtures (plan restriction or not populated).");
    }
  } catch (err: any) {
    logger.warn(`[API-Football] World Cup League 1 2026 fetch error: ${err.message}`);
  }

  // 1.5 Try World Cup (League ID 1) - Season 2022 (Supported on Free Plan!)
  try {
    logger.info("[API-Football] Attempting to fetch historical World Cup League 1 fixtures (2022)...");
    const url = "https://v3.football.api-sports.io/fixtures?league=1&season=2022";
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json() as any;
      if (json.response && Array.isArray(json.response) && json.response.length > 0) {
        logger.info(`[API-Football] Successfully fetched ${json.response.length} World Cup 2022 matches.`);
        return await processFixtures(json.response);
      }
    }
  } catch (err: any) {
    logger.warn(`[API-Football] World Cup League 1 2022 fetch error: ${err.message}`);
  }

  // 2. Try live matches globally
  try {
    logger.info("[API-Football] Attempting to fetch live matches globally for fallback mapping...");
    const url = "https://v3.football.api-sports.io/fixtures?live=all";
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json() as any;
      if (json.response && Array.isArray(json.response) && json.response.length > 0) {
        logger.info(`[API-Football] Successfully fetched ${json.response.length} live matches. Mapping...`);
        const mappedMatches = [];
        for (const item of json.response) {
          const homeClub = item.teams?.home?.name || "TBD";
          const awayClub = item.teams?.away?.name || "TBD";
          const { home, away } = mapTeams(homeClub, awayClub);
          
          const homeGoals = item.goals?.home ?? 0;
          const awayGoals = item.goals?.away ?? 0;
          const score = `${homeGoals} - ${awayGoals}`;

          const shortStatus = (item.fixture?.status?.short || "").toUpperCase();
          let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
          
          if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(shortStatus)) {
            status = "LIVE";
          } else if (["FT", "AET", "PEN", "PST"].includes(shortStatus)) {
            status = "FINISHED";
          }

          const fixtureId = item.fixture?.id;
          let events: APIFootballEvent[] = [];
          if (status === "LIVE" && fixtureId) {
            events = await fetchMatchEvents(fixtureId, apiKey);
          }

          mappedMatches.push({
            id: `apifootball-${fixtureId || Math.random()}`,
            home,
            away,
            score,
            status,
            venue: item.fixture?.venue?.name || "FIFA World Cup Arena",
            date: item.fixture?.date || new Date().toISOString(),
            minute: item.fixture?.status?.elapsed ? String(item.fixture.status.elapsed) : undefined,
            events
          });
        }
        return mappedMatches;
      }
    }
  } catch (err: any) {
    logger.warn(`[API-Football] Live matches fetch error: ${err.message}`);
  }

  // 3. Fall back to Premier League recent fixtures (League ID 39)
  try {
    logger.info("[API-Football] Falling back to Premier League recent fixtures...");
    const url = "https://v3.football.api-sports.io/fixtures?league=39&season=2024";
    const res = await fetch(url, {
      headers: {
        "x-apisports-key": apiKey,
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json() as any;
      if (json.response && Array.isArray(json.response) && json.response.length > 0) {
        const recentFixtures = json.response.slice(-15);
        const mappedMatches = [];
        for (const item of recentFixtures) {
          const homeClub = item.teams?.home?.name || "TBD";
          const awayClub = item.teams?.away?.name || "TBD";
          const { home, away } = mapTeams(homeClub, awayClub);
          
          const homeGoals = item.goals?.home ?? 0;
          const awayGoals = item.goals?.away ?? 0;
          const score = `${homeGoals} - ${awayGoals}`;

          const shortStatus = (item.fixture?.status?.short || "").toUpperCase();
          let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
          
          if (["1H", "2H", "HT", "ET", "BT", "P", "LIVE"].includes(shortStatus)) {
            status = "LIVE";
          } else if (["FT", "AET", "PEN", "PST"].includes(shortStatus)) {
            status = "FINISHED";
          }

          mappedMatches.push({
            id: `apifootball-${item.fixture?.id || Math.random()}`,
            home,
            away,
            score,
            status,
            venue: item.fixture?.venue?.name || "FIFA World Cup Arena",
            date: item.fixture?.date || new Date().toISOString(),
            minute: item.fixture?.status?.elapsed ? String(item.fixture.status.elapsed) : undefined,
            events: []
          });
        }
        return mappedMatches;
      }
    }
  } catch (err: any) {
    logger.error(`[API-Football] Premier League fallback failed: ${err.message}`);
  }

  return [];
}
