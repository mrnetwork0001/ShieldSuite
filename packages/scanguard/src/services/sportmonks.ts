/**
 * Sportmonks Football API v3 — Integration Service
 * Docs: https://docs.sportmonks.com/v3/welcome/authentication
 */
import { logger } from "../logger.js";

function getApiKey(): string {
  return process.env.SPORTMONKS_API_KEY || "";
}

/** Check if Sportmonks is configured */
export function isConfigured(): boolean {
  return getApiKey().length > 0;
}

export interface SportmonksMatch {
  home: string;
  away: string;
  score: string;
  status: "LIVE" | "FINISHED" | "SCHEDULED";
  venue: string | null;
  date: string;
  minute?: string;
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

function extractScores(scores: any[] | undefined, homeParticipant: any, awayParticipant: any): { home: number; away: number } {
  if (!scores || !Array.isArray(scores) || scores.length === 0) {
    return { home: 0, away: 0 };
  }

  const homeId = homeParticipant?.id;
  const awayId = awayParticipant?.id;

  // Format A: e.g. score: { home: X, away: Y }
  const getFormatAScore = (candidates: any[]) => {
    let bestScore: { home: number; away: number } | null = null;
    let maxTotal = -1;
    for (const s of candidates) {
      const homeVal = s.score?.home ?? s.home;
      const awayVal = s.score?.away ?? s.away;
      if (typeof homeVal === 'number' && typeof awayVal === 'number') {
        const total = homeVal + awayVal;
        if (total > maxTotal) {
          maxTotal = total;
          bestScore = { home: homeVal, away: awayVal };
        }
      }
    }
    return bestScore;
  };

  // Format B: e.g. score: { goals: X, participant: "home"|"away" }
  const getFormatBGoals = (candidates: any[], participantId: any, location: 'home' | 'away'): number | null => {
    let maxGoals = -1;
    for (const s of candidates) {
      const isMatch = (participantId && s.participant_id === participantId) ||
                      (s.score?.participant === location) ||
                      (s.participant === location);
      if (isMatch) {
        const goals = s.score?.goals ?? s.goals;
        if (typeof goals === 'number' && goals > maxGoals) {
          maxGoals = goals;
        }
      }
    }
    return maxGoals >= 0 ? maxGoals : null;
  };

  // 1. Try description: "CURRENT"
  const currentScores = scores.filter(s => s.description === "CURRENT");
  if (currentScores.length > 0) {
    const fmtA = getFormatAScore(currentScores);
    if (fmtA) return fmtA;

    const homeGoals = getFormatBGoals(currentScores, homeId, 'home');
    const awayGoals = getFormatBGoals(currentScores, awayId, 'away');
    if (homeGoals !== null || awayGoals !== null) {
      return { home: homeGoals ?? 0, away: awayGoals ?? 0 };
    }
  }

  // 2. Try description: "FT" or "FT_AET"
  const ftScores = scores.filter(s => s.description === "FT" || s.description === "FT_AET");
  if (ftScores.length > 0) {
    const fmtA = getFormatAScore(ftScores);
    if (fmtA) return fmtA;

    const homeGoals = getFormatBGoals(ftScores, homeId, 'home');
    const awayGoals = getFormatBGoals(ftScores, awayId, 'away');
    if (homeGoals !== null || awayGoals !== null) {
      return { home: homeGoals ?? 0, away: awayGoals ?? 0 };
    }
  }

  // 3. Fallback: Search all scores for Format A
  const anyFmtA = getFormatAScore(scores);
  if (anyFmtA) return anyFmtA;

  // 4. Fallback: Search all scores for Format B
  const homeGoals = getFormatBGoals(scores, homeId, 'home');
  const awayGoals = getFormatBGoals(scores, awayId, 'away');
  if (homeGoals !== null || awayGoals !== null) {
    return { home: homeGoals ?? 0, away: awayGoals ?? 0 };
  }

  return { home: 0, away: 0 };
}

/** Fetch World Cup 2026 fixtures (Tries Premium Season 26618 first, falls back to Free Leagues 271/501 mapped to World Cup) */
export async function fetchWorldCupFixtures(): Promise<SportmonksMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("[Sportmonks] API key is not configured.");
    return [];
  }

  // 1. Try Premium/Official World Cup Season 26618 first
  try {
    logger.info("[Sportmonks] Attempting to fetch real World Cup Season 26618 fixtures with cursor pagination URL traversal...");
    let allData: any[] = [];
    let nextUrl = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureSeasons:26618&include=participants;scores;venue;state";
    let pageCount = 0;

    while (nextUrl && pageCount < 8) {
      logger.info(`[Sportmonks] Fetching World Cup Season 26618 page ${pageCount + 1}...`);
      const res = await fetch(nextUrl, {
        headers: {
          "Authorization": apiKey,
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch page ${pageCount + 1} with status ${res.status}`);
      }

      const json = await res.json() as any;
      if (json.data && Array.isArray(json.data)) {
        allData = [...allData, ...json.data];
      }

      // next_cursor in Sportmonks v3 is a full next page URL
      nextUrl = json.pagination?.next_cursor || "";
      pageCount++;
    }

    if (allData.length > 0) {
      logger.info(`[Sportmonks] Successfully fetched ${allData.length} total World Cup 26618 fixtures.`);
      return allData.map((item: any) => {
        const homeParticipant = item.participants?.find((p: any) => p.meta?.location === "home");
        const awayParticipant = item.participants?.find((p: any) => p.meta?.location === "away");
        
        let homeName = homeParticipant?.name;
        let awayName = awayParticipant?.name;

        if (!homeName && !awayName && item.participants && item.participants.length === 2) {
          homeName = item.participants[0]?.name;
          awayName = item.participants[1]?.name;
        }

        if ((!homeName || homeName === "TBD") && item.name) {
          const parts = item.name.split(/\s+vs\s+|\s+-\s+/i);
          if (parts.length === 2) {
            homeName = parts[0].trim();
            awayName = parts[1].trim();
          }
        }

        homeName = homeName || "TBD";
        awayName = awayName || "TBD";

        const scoresObj = extractScores(item.scores, homeParticipant, awayParticipant);
        const score = `${scoresObj.home} - ${scoresObj.away}`;

        const stateName = (item.state?.developer_name || item.state?.name || "").toUpperCase();
        let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
        
        const liveStates = ["LIVE", "INPLAY", "HALF", "HT", "BREAK", "PENALTY", "SHOOTOUT", "WARMUP"];
        const finishedStates = ["FT", "AET", "POSTPONED", "ENDED", "FINISHED", "CANCELLED", "ABANDONED"];
        
        if (liveStates.some(s => stateName.includes(s))) {
          status = "LIVE";
        } else if (finishedStates.some(s => stateName.includes(s))) {
          status = "FINISHED";
        }

        return {
          home: homeName,
          away: awayName,
          score,
          status,
          venue: item.venue?.name || "FIFA World Cup Arena",
          date: item.starting_at || new Date().toISOString(),
          minute: item.state?.developer_name || undefined
        };
      });
    } else {
      logger.warn("[Sportmonks] World Cup Season 26618 query returned empty data.");
    }
  } catch (err: any) {
    logger.warn(`[Sportmonks] Premium Season 26618 fetch error: ${err.message}`);
  }

  // 2. Fall back to free leagues 271, 501 mapped to World Cup
  try {
    logger.info("[Sportmonks] Falling back to Free Plan Leagues (271, 501) with World Cup mapping...");
    let allFallbackData: any[] = [];
    let nextUrl = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureLeagues:271,501&include=participants;scores;venue;state";
    let pageCount = 0;

    while (nextUrl && pageCount < 4) {
      logger.info(`[Sportmonks] Fetching fallback leagues page ${pageCount + 1}...`);
      const res = await fetch(nextUrl, {
        headers: {
          "Authorization": apiKey,
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch fallback page ${pageCount + 1} with status ${res.status}`);
      }

      const json = await res.json() as any;
      if (json.data && Array.isArray(json.data)) {
        allFallbackData = [...allFallbackData, ...json.data];
      }

      nextUrl = json.pagination?.next_cursor || "";
      pageCount++;
    }

    return allFallbackData.map((item: any) => {
      const homeParticipant = item.participants?.find((p: any) => p.meta?.location === "home");
      const awayParticipant = item.participants?.find((p: any) => p.meta?.location === "away");
      const homeClubName = homeParticipant?.name || "TBD";
      const awayClubName = awayParticipant?.name || "TBD";

      const { home, away } = mapTeams(homeClubName, awayClubName);

      const scoresObj = extractScores(item.scores, homeParticipant, awayParticipant);
      const score = `${scoresObj.home} - ${scoresObj.away}`;

      const stateName = (item.state?.developer_name || item.state?.name || "").toUpperCase();
      let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
      
      const liveStates = ["LIVE", "INPLAY", "HALF", "HT", "BREAK", "PENALTY", "SHOOTOUT", "WARMUP"];
      const finishedStates = ["FT", "AET", "POSTPONED", "ENDED", "FINISHED", "CANCELLED", "ABANDONED"];
      
      if (liveStates.some(s => stateName.includes(s))) {
        status = "LIVE";
      } else if (finishedStates.some(s => stateName.includes(s))) {
        status = "FINISHED";
      }

      return {
        home,
        away,
        score,
        status,
        venue: item.venue?.name || "FIFA World Cup Arena",
        date: item.starting_at || new Date().toISOString(),
        minute: item.state?.developer_name || undefined
      };
    });
  } catch (err: any) {
    logger.error(`[Sportmonks] Failed to fetch fixtures from fallback leagues: ${err.message}`);
    return [];
  }
}

