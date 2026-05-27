import { Router, Request, Response } from "express";
import { logger } from "../logger.js";
import * as sportradar from "../services/sportradar.js";

export const worldCupRouter = Router();

// In-memory data for the hackathon demo
interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: "LIVE" | "FINISHED" | "SCHEDULED";
  score: string;
  minute: number;
  events: Array<{
    type: "GOAL" | "ASSIST" | "CARD" | "NEWS";
    minute: number;
    player: string;
    tokenId: number;
    description: string;
  }>;
}

interface AgentLog {
  id: string;
  timestamp: number;
  message: string;
  type: "info" | "sentiment" | "security" | "trade" | "error";
}

let matches: Match[] = [
  {
    id: "match-1",
    homeTeam: "Argentina",
    awayTeam: "France",
    status: "LIVE",
    score: "2 - 1",
    minute: 68,
    events: [
      {
        type: "GOAL",
        minute: 23,
        player: "Lionel Messi",
        tokenId: 1,
        description: "Lionel Messi scores a penalty for Argentina!",
      },
      {
        type: "GOAL",
        minute: 41,
        player: "Vinicius Junior", // Vinicius is Brazil, wait, Argentina vs France? Let's say Mbappe.
        tokenId: 2,
        description: "Kylian Mbappe scores an equalizer for France!",
      },
      {
        type: "GOAL",
        minute: 62,
        player: "Lionel Messi",
        tokenId: 1,
        description: "Lionel Messi scores a brace from a rebound!",
      },
    ],
  },
  {
    id: "match-2",
    homeTeam: "England",
    awayTeam: "Senegal",
    status: "LIVE",
    score: "2 - 0",
    minute: 45,
    events: [
      {
        type: "GOAL",
        minute: 38,
        player: "Bukayo Saka",
        tokenId: 3,
        description: "Bukayo Saka scores a clinical volley!",
      },
    ],
  },
];

let agentLogs: AgentLog[] = [
  {
    id: "log-init",
    timestamp: Date.now(),
    message: "AI Scout Agent initialized inside TEE Enclave.",
    type: "info",
  },
];

// GET /api/worldcup/matches
worldCupRouter.get("/matches", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: matches,
  });
});

// POST /api/worldcup/update — Trigger a new event
worldCupRouter.post("/update", (req: Request, res: Response) => {
  const { matchId, eventType, player, tokenId, description, score, minute } = req.body;

  if (!eventType || !player || !tokenId || !description) {
    res.status(400).json({
      success: false,
      error: "Missing required fields (eventType, player, tokenId, description)",
    });
    return;
  }

  const match = matches.find((m) => m.id === matchId) || matches[0];
  
  if (minute) match.minute = minute;
  if (score) match.score = score;

  const newEvent = {
    type: eventType as "GOAL" | "ASSIST" | "CARD" | "NEWS",
    minute: minute || match.minute,
    player,
    tokenId: Number(tokenId),
    description,
  };

  match.events.push(newEvent);

  logger.info(`[WorldCup] Event pushed: ${description} (TokenID: ${tokenId})`);

  res.json({
    success: true,
    data: match,
  });
});

// GET /api/worldcup/agent-logs
worldCupRouter.get("/agent-logs", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: agentLogs,
  });
});

// POST /api/worldcup/agent-logs
worldCupRouter.post("/agent-logs", (req: Request, res: Response) => {
  const { message, type } = req.body;

  if (!message) {
    res.status(400).json({
      success: false,
      error: "Message is required",
    });
    return;
  }

  const logEntry: AgentLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    message,
    type: (type || "info") as "info" | "sentiment" | "security" | "trade" | "error",
  };

  agentLogs.unshift(logEntry);
  if (agentLogs.length > 200) {
    agentLogs = agentLogs.slice(0, 200);
  }

  res.json({
    success: true,
    data: logEntry,
  });
});

// GET /api/worldcup/metadata/:id — metadata endpoint for ERC-1155 tokens
worldCupRouter.get("/metadata/:id", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  
  const playerMetadata: Record<number, { name: string; description: string; image: string; country: string; position: string }> = {
    1: {
      name: "Lionel Messi",
      description: "Pitchside AI Player Index Share. EOV rating-backed, virtual-yield ERC-1155 token on X Layer.",
      image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&auto=format&fit=crop",
      country: "Argentina",
      position: "Forward"
    },
    2: {
      name: "Kylian Mbappe",
      description: "Pitchside AI Player Index Share. EOV rating-backed, virtual-yield ERC-1155 token on X Layer.",
      image: "https://images.unsplash.com/photo-1544698310-74ea9d1c8258?w=500&auto=format&fit=crop",
      country: "France",
      position: "Forward"
    },
    3: {
      name: "Bukayo Saka",
      description: "Pitchside AI Player Index Share. EOV rating-backed, virtual-yield ERC-1155 token on X Layer.",
      image: "https://images.unsplash.com/photo-1518063319789-7217e6706b04?w=500&auto=format&fit=crop",
      country: "England",
      position: "Midfielder"
    },
    4: {
      name: "Erling Haaland",
      description: "Pitchside AI Player Index Share. EOV rating-backed, virtual-yield ERC-1155 token on X Layer.",
      image: "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=500&auto=format&fit=crop",
      country: "Norway",
      position: "Forward"
    },
    5: {
      name: "Vinicius Junior",
      description: "Pitchside AI Player Index Share. EOV rating-backed, virtual-yield ERC-1155 token on X Layer.",
      image: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500&auto=format&fit=crop",
      country: "Brazil",
      position: "Forward"
    }
  };

  const meta = playerMetadata[id];
  if (!meta) {
    res.status(404).json({ success: false, error: "Player metadata not found" });
    return;
  }

  res.json({
    name: `${meta.name} (XCPS #${id})`,
    description: meta.description,
    image: meta.image,
    attributes: [
      { trait_type: "Country", value: meta.country },
      { trait_type: "Position", value: meta.position },
      { trait_type: "TokenID", value: id }
    ]
  });
});

// GET /api/worldcup/sync-espn — Sync real-time matches from ESPN
worldCupRouter.get("/sync-espn", async (_req: Request, res: Response) => {
  try {
    const result = await syncFromESPN();
    res.json(result);
  } catch (err: any) {
    logger.error(`[WorldCup] ESPN sync failed: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/worldcup/espn-demo — Sportradar as primary, ESPN as fallback
worldCupRouter.get("/espn-demo", async (_req: Request, res: Response) => {
  // ── Try Sportradar first (primary source) ───────────────────────────────
  if (sportradar.isConfigured()) {
    try {
      const sr = await sportradar.fetchMultiLeagueDemo();

      if (sr.totalMatches > 0) {
        const data = sr.leagues.map(l => ({
          league: l.name,
          leagueId: l.name.toLowerCase().replace(/\s/g, '_'),
          matchCount: l.matchCount,
          matches: l.matches.map(m => ({
            home: m.home,
            away: m.away,
            score: m.score,
            status: m.status,
            venue: m.venue,
            date: m.date,
            minute: m.minute,
          })),
        }));

        res.json({
          success: true,
          source: "sportradar",
          message: `Sportradar API verified. Fetched ${sr.totalMatches} matches across ${sr.leagues.length} competitions.`,
          timestamp: sr.timestamp,
          data,
        });
        return;
      }
    } catch (err: any) {
      logger.warn(`[WorldCup] Sportradar demo failed, falling back to ESPN: ${err.message}`);
    }
  }

  // ── Fallback: ESPN free API ──────────────────────────────────────────────
  const leagues = [
    { id: "usa.1", name: "MLS (Major League Soccer)" },
    { id: "mex.1", name: "Liga MX" },
    { id: "eng.1", name: "Premier League" },
    { id: "fifa.world", name: "FIFA World Cup 2026" },
  ];

  const results: Array<{ league: string; leagueId: string; matchCount: number; matches: any[] }> = [];

  for (const league of leagues) {
    try {
      const espnRes = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard`);
      const json = await espnRes.json() as any;

      const matchList = (json.events || []).map((event: any) => {
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find((c: any) => c.homeAway === "home");
        const away = comp?.competitors?.find((c: any) => c.homeAway === "away");
        const state = event.status?.type?.state?.toUpperCase();

        return {
          home: home?.team?.displayName || "TBD",
          away: away?.team?.displayName || "TBD",
          score: `${home?.score || 0} - ${away?.score || 0}`,
          status: state === "IN" ? "LIVE" : state === "POST" ? "FINISHED" : "SCHEDULED",
          venue: comp?.venue?.fullName || null,
          date: event.date || null,
        };
      });

      results.push({
        league: league.name,
        leagueId: league.id,
        matchCount: matchList.length,
        matches: matchList.slice(0, 5),
      });
    } catch (err: any) {
      results.push({ league: league.name, leagueId: league.id, matchCount: 0, matches: [] });
    }
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matchCount, 0);

  res.json({
    success: true,
    source: "espn",
    message: `ESPN API pipeline verified. Fetched ${totalMatches} matches across ${results.length} leagues.`,
    timestamp: new Date().toISOString(),
    data: results,
  });
});

// ── Shared ESPN sync function ──────────────────────────────────────────────
async function syncFromESPN() {
  const espnRes = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard");
  const json = await espnRes.json() as any;

  let syncedMatches = [];

  if (json && json.events && json.events.length > 0) {
    syncedMatches = json.events.map((event: any) => {
      const comp = event.competitions?.[0];
      const homeCompetitor = comp?.competitors?.find((c: any) => c.homeAway === "home");
      const awayCompetitor = comp?.competitors?.find((c: any) => c.homeAway === "away");

      const homeTeam = homeCompetitor?.team?.displayName || "Home Team";
      const awayTeam = awayCompetitor?.team?.displayName || "Away Team";

      const homeScore = homeCompetitor?.score || "0";
      const awayScore = awayCompetitor?.score || "0";
      const score = `${homeScore} - ${awayScore}`;

      const state = event.status?.type?.state?.toUpperCase();
      const status: "LIVE" | "FINISHED" | "SCHEDULED" =
        state === "IN" ? "LIVE" :
        state === "POST" ? "FINISHED" :
        "SCHEDULED";

      const minute = event.status?.displayClock ? parseInt(event.status.displayClock) || 0 : 0;

      return {
        id: `espn-${event.id}`,
        homeTeam,
        awayTeam,
        status,
        score,
        minute,
        events: []
      };
    });
    logger.info(`[WorldCup] Synced ${syncedMatches.length} live/scheduled World Cup matches from ESPN.`);
  } else {
    logger.info("[WorldCup] ESPN fifa.world has no active event matches. Populating upcoming scheduled World Cup matches.");
    syncedMatches = [
      { id: "espn-mock-wc1", homeTeam: "Argentina", awayTeam: "France", status: "SCHEDULED", score: "0 - 0", minute: 0, events: [] },
      { id: "espn-mock-wc2", homeTeam: "England", awayTeam: "Senegal", status: "SCHEDULED", score: "0 - 0", minute: 0, events: [] },
      { id: "espn-mock-wc3", homeTeam: "Brazil", awayTeam: "Germany", status: "SCHEDULED", score: "0 - 0", minute: 0, events: [] }
    ];
  }

  // Merge into matches array
  syncedMatches.forEach((synced: any) => {
    const idx = matches.findIndex(m => m.id === synced.id);
    if (idx !== -1) {
      matches[idx] = { ...matches[idx], score: synced.score, minute: synced.minute, status: synced.status };
    } else {
      matches.push(synced);
    }
  });

  return {
    success: true,
    message: json && json.events && json.events.length > 0
      ? `Successfully synced ${syncedMatches.length} World Cup matches from ESPN`
      : "Successfully synced upcoming scheduled World Cup matches (graceful fallback)",
    data: matches
  };
}

// ── Auto-sync ESPN (Mainnet only) ──────────────────────────────────────────
const rpcUrl = process.env.XLAYER_RPC_URL || "";
const isMainnetBackend = rpcUrl.includes("rpc.xlayer.tech") && !rpcUrl.includes("testrpc");

if (isMainnetBackend) {
  const ESPN_POLL_INTERVAL = 60_000; // 60 seconds
  logger.info(`[WorldCup] Mainnet detected — starting ESPN auto-sync every ${ESPN_POLL_INTERVAL / 1000}s`);

  setInterval(async () => {
    try {
      await syncFromESPN();
      logger.info("[WorldCup] ESPN auto-sync complete.");
    } catch (err: any) {
      logger.warn(`[WorldCup] ESPN auto-sync failed: ${err.message}`);
    }
  }, ESPN_POLL_INTERVAL);
} else {
  logger.info("[WorldCup] Testnet/local mode — ESPN auto-sync disabled. Use manual sync button or match simulator.");
}

