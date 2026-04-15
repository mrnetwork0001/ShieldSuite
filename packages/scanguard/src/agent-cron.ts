// ─── Autonomous Agent Cron Scanner ───────────────────────────────────────────
//
// Runs 24/7 on a VPS to:
// 1. Periodically scan top X Layer tokens for security threats
// 2. Generate on-chain activity from the agent wallet (via x402 payments)
// 3. Populate the ScanGuard dashboard live feed with real data
//
// This is the "Most Active Agent" prize strategy — each scan = 1 API call
// visible in the agent wallet's transaction history.
//
// Usage: npx tsx packages/scanguard/src/agent-cron.ts
// Or with pm2: pm2 start "npx tsx packages/scanguard/src/agent-cron.ts" --name shield-agent

import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });
config();

// ─── Configuration ───────────────────────────────────────────────────────────

const SCANGUARD_URL = process.env.SCANGUARD_URL || "http://localhost:3402";
const SCAN_INTERVAL_MS = process.env.AGENT_DEMO_MODE === "true" 
  ? 30000 // 30 seconds for quick demo
  : parseInt(process.env.AGENT_SCAN_INTERVAL || "3600000", 10); // 1 hour default
const BATCH_DELAY_MS = process.env.AGENT_DEMO_MODE === "true" ? 2000 : 5000;

// Expanded token list for dynamic demo
const TOKEN_LIST = [
  // Canonical / Safe
  { address: "0x779ded0c9e1022225f8e0630b35a9b54be713736", symbol: "USDT" },
  { address: "0x74b7f16337b8972027f6196a17a631ac6de26d22", symbol: "USDC" },
  { address: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab", symbol: "WETH" },
  { address: "0xe538905cf8410324e03A5A23C1c177a474D59b2b", symbol: "WOKB" },
  { address: "0xC5015b9d9161Dca7e18e32f6f25C4aD850731Fd4", symbol: "DAI" },
  { address: "0x2c03058e5f4e533f2263e748d1f43a3fe66b3e79", symbol: "DAI.old" },
  // Risky / Demo Phishing
  { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC-FAKE" },
  { address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK-SUS" },
  { address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2", symbol: "MKR-MOCK" },
  { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI-ETH" }, // Wrong chain token
  { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", symbol: "USDC-ETH" }, // Phishing check on X Layer
];

// ─── Agent State ─────────────────────────────────────────────────────────────

let totalScansPerformed = 0;
let lastScanCycle = 0;
let isRunning = false;

// ─── Scan Functions ──────────────────────────────────────────────────────────

async function scanToken(address: string, symbol: string): Promise<boolean> {
  try {
    const res = await fetch(`${SCANGUARD_URL}/api/scan`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "X-Shield-Key": "shield-internal-2026"
      },
      body: JSON.stringify({ tokenAddress: address }),
    });

    const data = await res.json() as any;

    if (data.success) {
      const result = data.data;
      console.log(
        `  ✓ ${symbol.padEnd(6)} | Risk: ${result.riskScore}/100 (${result.riskLevel}) | ` +
        `Flags: ${result.flags?.length || 0} | ` +
        `Uniswap: ${result.uniswapHasPool ? `${result.uniswapPoolCount} pool(s)` : 'No pools'} | ` +
        `${result.scanDurationMs}ms`
      );
      totalScansPerformed++;
      return true;
    } else {
      console.log(`  ✗ ${symbol.padEnd(6)} | Error: ${data.error?.message || 'Unknown error'}`);
      return false;
    }
  } catch (err: any) {
    console.log(`  ✗ ${symbol.padEnd(6)} | Network error: ${err.message}`);
    return false;
  }
}

async function runScanCycle(): Promise<void> {
  if (isRunning) {
    console.log("[Agent] Previous scan cycle still running — skipping");
    return;
  }

  isRunning = true;
  lastScanCycle++;
  const cycleStart = Date.now();

  console.log(`\n${"═".repeat(60)}`);
  console.log(`🤖 SHIELD AGENT — Scan Cycle #${lastScanCycle}`);
  console.log(`   Time: ${new Date().toISOString()}`);
  console.log(`   Tokens: ${TOKEN_LIST.length} | Interval: ${SCAN_INTERVAL_MS / 1000}s`);
  console.log(`${"─".repeat(60)}`);

  let successCount = 0;

  for (const token of TOKEN_LIST) {
    const ok = await scanToken(token.address, token.symbol);
    if (ok) successCount++;
    // Delay between scans to be respectful to the API
    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);

  // ── On-chain heartbeat: ping the agentic wallet ──
  console.log(`   Sending on-chain heartbeat...`);
  try {
    const pingRes = await fetch(`${SCANGUARD_URL}/api/agent/ping`, { method: "POST" });
    const pingData = await pingRes.json() as any;
    if (pingData.success) {
      console.log(`   ✓ On-chain ping sent successfully`);
    } else {
      console.log(`   ⚠ On-chain ping skipped: ${pingData.data?.message || 'no gas?'}`);
    }
  } catch {
    console.log(`   ⚠ On-chain ping failed (wallet may not be funded)`);
  }

  console.log(`${"─".repeat(60)}`);
  console.log(`   Cycle complete: ${successCount}/${TOKEN_LIST.length} successful | ${elapsed}s`);
  console.log(`   Total scans lifetime: ${totalScansPerformed}`);
  console.log(`${"═".repeat(60)}\n`);

  isRunning = false;
}

// ─── Health Check ────────────────────────────────────────────────────────────

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SCANGUARD_URL}/api/health`);
    const data = await res.json() as any;
    return data.success === true;
  } catch {
    return false;
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log("🛡️  SHIELD SUITE — Autonomous Scanning Agent");
  console.log(`${"═".repeat(60)}`);
  console.log(`   Backend: ${SCANGUARD_URL}`);
  console.log(`   Interval: ${SCAN_INTERVAL_MS / 1000}s (${(SCAN_INTERVAL_MS / 3600000).toFixed(1)}h)`);
  console.log(`   Tokens: ${TOKEN_LIST.length}`);
  console.log(`   Expected daily scans: ${Math.floor((86400000 / SCAN_INTERVAL_MS) * TOKEN_LIST.length)}`);
  console.log(`${"═".repeat(60)}\n`);

  // Wait for backend to be ready
  console.log("[Agent] Checking backend health...");
  let healthy = false;
  for (let i = 0; i < 10; i++) {
    healthy = await checkHealth();
    if (healthy) break;
    console.log(`[Agent] Backend not ready, retrying in 5s... (${i + 1}/10)`);
    await new Promise((r) => setTimeout(r, 5000));
  }

  if (!healthy) {
    console.error("[Agent] ❌ Backend not reachable. Exiting.");
    process.exit(1);
  }

  console.log("[Agent] ✅ Backend online. Starting scan cycles.\n");

  // Run first cycle immediately
  await runScanCycle();

  // Schedule recurring cycles
  setInterval(runScanCycle, SCAN_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[Agent] Shutting down gracefully...");
    console.log(`[Agent] Total scans performed: ${totalScansPerformed}`);
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Agent] SIGTERM received. Shutting down...");
    process.exit(0);
  });
}

main().catch((err) => {
  console.error("[Agent] Fatal error:", err);
  process.exit(1);
});
