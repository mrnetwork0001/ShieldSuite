import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const apiKey = process.env.SPORTMONKS_API_KEY;

async function test() {
  // Let's check fixtures for league 271 (Superliga) or 501 (Premiership)
  const url = "https://api.sportmonks.com/v3/football/fixtures?filters=fixtureLeagues:271,501&include=participants;scores;venue;state";
  console.log("Fetching url:", url);
  try {
    const res = await fetch(url, {
      headers: {
        "Authorization": apiKey,
        "Accept": "application/json"
      }
    });
    console.log("Status:", res.status);
    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      console.log(`Fixtures count: ${json.data.length}`);
      console.log("First 3 fixtures:");
      json.data.slice(0, 3).forEach(f => {
        console.log(JSON.stringify({
          id: f.id,
          name: f.name,
          starting_at: f.starting_at,
          participants: f.participants?.map(p => ({ id: p.id, name: p.name, location: p.meta?.location })),
          scores: f.scores,
          state: f.state
        }, null, 2));
      });
    } else {
      console.log("JSON response:", JSON.stringify(json, null, 2));
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
