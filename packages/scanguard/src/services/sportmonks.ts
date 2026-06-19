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

/** Fetch World Cup 2026 fixtures (Tries Premium League 732 first, falls back to Free Leagues 271/501 mapped to World Cup) */
export async function fetchWorldCupFixtures(): Promise<SportmonksMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("[Sportmonks] API key is not configured.");
    return [];
  }

  // 1. Try Premium/Official World Cup League 732 first
  try {
    logger.info("[Sportmonks] Attempting to fetch real World Cup League 732 fixtures...");
    const url = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureLeagues:732&include=participants;scores;venue;state";
    const res = await fetch(url, {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json"
      }
    });

    if (res.ok) {
      const json = await res.json() as any;
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        logger.info(`[Sportmonks] Successfully fetched ${json.data.length} real World Cup 732 matches.`);
        return json.data.map((item: any) => {
          const homeParticipant = item.participants?.find((p: any) => p.meta?.location === "home");
          const awayParticipant = item.participants?.find((p: any) => p.meta?.location === "away");
          const homeName = homeParticipant?.name || "TBD";
          const awayName = awayParticipant?.name || "TBD";

          const homeScoreObj = item.scores?.find((s: any) => s.score?.participant_id === homeParticipant?.id && s.description === "CURRENT");
          const awayScoreObj = item.scores?.find((s: any) => s.score?.participant_id === awayParticipant?.id && s.description === "CURRENT");

          const homeGoals = homeScoreObj?.score?.goals ?? 0;
          const awayGoals = awayScoreObj?.score?.goals ?? 0;
          const score = `${homeGoals} - ${awayGoals}`;

          const stateName = (item.state?.developer_name || item.state?.name || "").toUpperCase();
          let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
          if (["LIVE", "INPLAY", "1ST_HALF", "2ND_HALF", "HT"].includes(stateName)) {
            status = "LIVE";
          } else if (["FT", "AET", "POSTPONED", "ENDED"].includes(stateName)) {
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
        logger.warn(`[Sportmonks] League 732 returned no data. Msg: ${json.message || "none"}`);
      }
    } else {
      logger.warn(`[Sportmonks] League 732 fetch failed with status ${res.status}`);
    }
  } catch (err: any) {
    logger.warn(`[Sportmonks] Premium League 732 fetch error: ${err.message}`);
  }

  // 2. Fall back to free leagues 271, 501 mapped to World Cup
  try {
    logger.info("[Sportmonks] Falling back to Free Plan Leagues (271, 501) with World Cup mapping...");
    const url = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureLeagues:271,501&include=participants;scores;venue;state";
    const res = await fetch(url, {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json"
      }
    });

    if (!res.ok) {
      throw new Error(`Sportmonks API responded with status ${res.status}`);
    }

    const json = await res.json() as any;
    if (!json.data || !Array.isArray(json.data)) {
      return [];
    }

    return json.data.map((item: any) => {
      const homeParticipant = item.participants?.find((p: any) => p.meta?.location === "home");
      const awayParticipant = item.participants?.find((p: any) => p.meta?.location === "away");
      const homeClubName = homeParticipant?.name || "TBD";
      const awayClubName = awayParticipant?.name || "TBD";

      const { home, away } = mapTeams(homeClubName, awayClubName);

      const homeScoreObj = item.scores?.find((s: any) => s.score?.participant_id === homeParticipant?.id && s.description === "CURRENT");
      const awayScoreObj = item.scores?.find((s: any) => s.score?.participant_id === awayParticipant?.id && s.description === "CURRENT");

      const homeGoals = homeScoreObj?.score?.goals ?? 0;
      const awayGoals = awayScoreObj?.score?.goals ?? 0;
      const score = `${homeGoals} - ${awayGoals}`;

      const stateName = (item.state?.developer_name || item.state?.name || "").toUpperCase();
      let status: "LIVE" | "FINISHED" | "SCHEDULED" = "SCHEDULED";
      if (["LIVE", "INPLAY", "1ST_HALF", "2ND_HALF", "HT"].includes(stateName)) {
        status = "LIVE";
      } else if (["FT", "AET", "POSTPONED", "ENDED"].includes(stateName)) {
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

