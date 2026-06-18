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

/** Fetch World Cup 2026 fixtures (League ID: 732) */
export async function fetchWorldCupFixtures(): Promise<SportmonksMatch[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    logger.warn("[Sportmonks] API key is not configured.");
    return [];
  }

  try {
    // Filter by World Cup (League ID 732) and include participants, scores, venue, and state
    const url = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureLeagues:732&include=participants;scores;venue;state";
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
        venue: item.venue?.name || null,
        date: item.starting_at || new Date().toISOString(),
        minute: item.state?.developer_name || undefined
      };
    });
  } catch (err: any) {
    logger.error(`[Sportmonks] Failed to fetch fixtures: ${err.message}`);
    return [];
  }
}
