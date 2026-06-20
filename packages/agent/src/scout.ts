import { ethers } from "ethers";
import { getProvider, getAgentWallet, getDeployedAddresses, detectProvider } from "./wallets.js";

// Contract ABIs
const VAULT_ABI = [
  "function getCredits(address user) external view returns (uint256)",
  "function users(address user) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
  "event AgentDelegated(address indexed user, address indexed agent)"
];

const SHARES_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function players(uint256 id) external view returns (string name, string country, uint256 rating, uint256 goals, uint256 assists)",
  "function updatePlayer(uint256 id, uint256 rating, uint256 goals, uint256 assists, string newUri) external"
];

const DEX_ABI = [
  "function getSharePrice(uint256 tokenId) public view returns (uint256)",
  "function buySharesFor(address user, uint256 tokenId, uint256 amount) external",
  "function sellSharesFor(address user, uint256 tokenId, uint256 amount) external"
];

// In-memory set of processed event signatures/descriptions to avoid double trading
const processedEvents = new Set<string>();
const knownUsers = new Set<string>([
  "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02"
]);
let lastScannedBlock = 0;

const PORT = process.env.PORT || "3402";
const SCANGUARD_BASE = process.env.SCANGUARD_URL || `http://localhost:${PORT}`;
const BACKEND_URL = `${SCANGUARD_BASE}/api/worldcup`;
const SCAN_URL = `${SCANGUARD_BASE}/api/scan`;

async function postLog(message: string, type: "info" | "sentiment" | "security" | "trade" | "error") {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  
  try {
    await fetch(`${BACKEND_URL}/agent-logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, type })
    });
  } catch (err: any) {
    console.error("Failed to post log to backend:", err.message);
  }
}

async function scanTokenSecurity(tokenAddress: string): Promise<boolean> {
  try {
    await postLog(`Verifying token security via ScanGuard API: ${tokenAddress}`, "security");
    
    const res = await fetch(SCAN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenAddress })
    });
    
    const data = await res.json() as any;
    if (data.success && data.data) {
      const isSafe = data.data.riskScore < 50;
      if (isSafe) {
        await postLog(`ScanGuard threat evaluation complete. Token is SAFE. (Risk Score: ${data.data.riskScore}/100)`, "security");
        return true;
      } else {
        await postLog(`⚠️ ScanGuard BLOCKED swap! Malicious flags detected. (Risk Score: ${data.data.riskScore}/100)`, "error");
        return false;
      }
    }
    
    // Default to true for demo if server is starting or scan fails
    await postLog("ScanGuard API unreachable. Bypassing safety check for hackathon demo mode.", "security");
    return true;
  } catch (err: any) {
    await postLog(`ScanGuard check failed: ${err.message}. Bypassing for demo.`, "security");
    return true;
  }
}

async function runScoutLoop() {
  const addresses = getDeployedAddresses();
  if (!addresses) {
    console.error("❌ No deployed-addresses.json found. Make sure to compile and deploy contracts first.");
    return;
  }

  const provider = getProvider();
  const wallet = getAgentWallet(provider);
  const agentAddress = wallet.address;

  await postLog(`AI Scout Agent starting loop with wallet: ${agentAddress}`, "info");

  // Instantiate contracts
  const vault = new ethers.Contract(addresses.NoLossVault, VAULT_ABI, wallet);
  const shares = new ethers.Contract(addresses.PlayerShares, SHARES_ABI, wallet);
  const dex = new ethers.Contract(addresses.PlayerDex, DEX_ABI, wallet);

  // 1. Fetch matches and news from API
  let matchesData: any[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/matches`);
    const json = await res.json() as any;
    if (json.success && Array.isArray(json.data)) {
      const first = json.data[0];
      if (first && first.league && Array.isArray(first.matches)) {
        for (const league of json.data) {
          if (Array.isArray(league.matches)) {
            matchesData.push(...league.matches);
          }
        }
      } else {
        matchesData = json.data;
      }
    }
  } catch (err: any) {
    await postLog(`Failed to fetch matches: ${err.message}`, "error");
    return;
  }

  if (matchesData.length === 0) return;

  // 2. Query delegated users
  const delegatedUsers = new Set<string>();
  
  const net = await provider.getNetwork();
  const isMainnet = net.chainId === 196n || net.chainId === 196;
  
  if (!isMainnet) {
    // Always include the deployer wallet so that demo trades still trigger for it in testnet/sandbox
    delegatedUsers.add(addresses.deployer);
  }

  // Fetch candidate users registered via backend registry (bypasses XLayer RPC block query limits)
  try {
    const res = await fetch(`${BACKEND_URL}/users`);
    const json = await res.json() as any;
    if (json.success && Array.isArray(json.data)) {
      for (const u of json.data) {
        knownUsers.add(u);
      }
    }
  } catch (err: any) {
    console.error("⚠️ Failed to fetch candidate users from backend:", err.message);
  }

  try {
    const filter = vault.filters.AgentDelegated(null, agentAddress);
    const currentBlock = await provider.getBlockNumber();
    
    if (lastScannedBlock === 0) {
      lastScannedBlock = Math.max(0, currentBlock - 90);
    }

    if (currentBlock > lastScannedBlock) {
      const batchSize = 90;
      const events: any[] = [];
      for (let from = lastScannedBlock + 1; from <= currentBlock; from += batchSize) {
        const to = Math.min(from + batchSize - 1, currentBlock);
        const batchEvents = await vault.queryFilter(filter, from, to);
        events.push(...batchEvents);
      }
      
      for (const e of events) {
        const user = (e as any).args[0];
        knownUsers.add(user);
      }
      lastScannedBlock = currentBlock;
    }
  } catch (err: any) {
    console.error("⚠️ Failed to scan delegation events:", err.message);
  }

  try {
    // Verify all historical/new users are still delegated
    const usersToRemove: string[] = [];
    for (const user of knownUsers) {
      const userInfo = await vault.users(user);
      if (userInfo.delegatedAgent.toLowerCase() === agentAddress.toLowerCase()) {
        delegatedUsers.add(user);
      } else {
        usersToRemove.push(user);
      }
    }
    for (const u of usersToRemove) {
      knownUsers.delete(u);
    }
  } catch (err: any) {
    console.error("⚠️ Failed to verify delegated users:", err.message);
  }

  // 3. Process match events
  for (const match of matchesData) {
    if (!match.events || !Array.isArray(match.events)) continue;
    for (const event of match.events) {
      if (!event || !event.description || event.tokenId === undefined) continue;
      const eventKey = `${match.id}-${event.tokenId}-${event.minute}-${event.description}`;
      if (processedEvents.has(eventKey)) continue;

      // New event found! Mark it processed
      processedEvents.add(eventKey);

      await postLog(`Scouting News: "${event.description}" (TokenID: ${event.tokenId})`, "sentiment");

      // 4. Evaluate sentiment
      let action: "BUY" | "SELL" | "HOLD" = "HOLD";
      const desc = event.description.toLowerCase();

      if (desc.includes("scores") || desc.includes("goal") || desc.includes("assist") || desc.includes("clinical volley") || desc.includes("brace") || desc.includes("penalty")) {
        action = "BUY";
      } else if (desc.includes("injury") || desc.includes("red card") || desc.includes("conceded") || desc.includes("poor performance")) {
        action = "SELL";
      }

      await postLog(`Sentiment Evaluation: ${action} momentum for Player ID ${event.tokenId}`, "sentiment");

      if (action === "HOLD") continue;

      // Update Player Ratings & Stats On-Chain
      try {
        const currentStats = await shares.players(event.tokenId);
        const name = currentStats[0];
        let currentRating = Number(currentStats[2]);
        let currentGoals = Number(currentStats[3]);
        let currentAssists = Number(currentStats[4]);

        let newRating = currentRating;
        let newGoals = currentGoals;
        let newAssists = currentAssists;

        if (action === "BUY") {
          // Positive event: Goal or Assist
          if (desc.includes("assist")) {
            newAssists += 1;
            newRating += 1;
          } else {
            // Goal
            const isBrace = desc.includes("brace");
            newGoals += isBrace ? 2 : 1;
            newRating += isBrace ? 2 : 1;
          }
          if (newRating > 99) newRating = 99; // Cap at 99
        } else if (action === "SELL") {
          // Negative event
          newRating -= desc.includes("red card") || desc.includes("injury") ? 2 : 1;
          if (newRating < 50) newRating = 50; // Floor at 50
        }

        if (newRating !== currentRating || newGoals !== currentGoals || newAssists !== currentAssists) {
          await postLog(`Updating on-chain stats for ${name || "Player"}: Rating ${currentRating} -> ${newRating}, Goals ${currentGoals} -> ${newGoals}, Assists ${currentAssists} -> ${newAssists}`, "info");
          const updateTx = await shares.updatePlayer(event.tokenId, newRating, newGoals, newAssists, "");
          await updateTx.wait();
          await postLog(`✅ On-chain rating updated. Tx Hash: ${updateTx.hash}`, "info");
        }
      } catch (err: any) {
        await postLog(`⚠️ Failed to update player rating on-chain: ${err.message}`, "error");
      }

      // 5. Scan safety
      const isSafe = await scanTokenSecurity(addresses.PlayerShares);
      if (!isSafe) continue;

      // 6. Execute trade for each delegated user
      for (const user of delegatedUsers) {
        try {
          if (action === "BUY") {
            const price = await dex.getSharePrice(event.tokenId);
            const userCredits = await vault.getCredits(user);

            // Buy 1 share (scaled to 18 decimals)
            const amountToBuy = ethers.parseEther("1");
            const totalCost = (price * amountToBuy) / ethers.parseEther("1");

            if (userCredits >= totalCost) {
              await postLog(`Executing autonomous BUY of 1.0 Share (ID: ${event.tokenId}) on behalf of user ${user.slice(0, 10)}...`, "trade");
              const tx = await dex.buySharesFor(user, event.tokenId, amountToBuy);
              await tx.wait();
              await postLog(`Tx Confirmed! Purchased Player Shares. Tx Hash: ${tx.hash}`, "trade");
            } else {
              await postLog(`User ${user.slice(0, 10)} has insufficient credits (${ethers.formatEther(userCredits)} < ${ethers.formatEther(totalCost)}). Skipping.`, "info");
            }
          } else if (action === "SELL") {
            const balance = await shares.balanceOf(user, event.tokenId);
            if (balance > 0n) {
              await postLog(`Executing autonomous SELL of ${ethers.formatEther(balance)} Shares (ID: ${event.tokenId}) on behalf of user ${user.slice(0, 10)}...`, "trade");
              const tx = await dex.sellSharesFor(user, event.tokenId, balance);
              await tx.wait();
              await postLog(`Tx Confirmed! Liquidated Player Shares. Tx Hash: ${tx.hash}`, "trade");
            }
          }
        } catch (tradeErr: any) {
          await postLog(`Trade execution failed for user ${user.slice(0, 10)}: ${tradeErr.message}`, "error");
        }
      }
    }
  }
}

// Start loop
async function start() {
  await postLog("Starting Pitchside AI Scout loop...", "info");

  try {
    const provider = await detectProvider();
    const network = await provider.getNetwork();
    await postLog(`Connected to network. Chain ID: ${network.chainId.toString()}`, "info");
  } catch (err: any) {
    console.error("Failed to detect provider network:", err.message);
  }
  
  // Seed the processed events with existing events to avoid instant trading on boot
  try {
    const res = await fetch(`${BACKEND_URL}/matches`);
    const json = await res.json() as any;
    if (json.success && Array.isArray(json.data)) {
      let seedMatches: any[] = [];
      const first = json.data[0];
      if (first && first.league && Array.isArray(first.matches)) {
        for (const league of json.data) {
          if (Array.isArray(league.matches)) {
            seedMatches.push(...league.matches);
          }
        }
      } else {
        seedMatches = json.data;
      }

      for (const match of seedMatches) {
        if (Array.isArray(match.events)) {
          for (const event of match.events) {
            const eventKey = `${match.id}-${event.tokenId}-${event.minute}-${event.description}`;
            processedEvents.add(eventKey);
          }
        }
      }
    }
  } catch (err) {}

  while (true) {
    try {
      await runScoutLoop();
    } catch (err: any) {
      console.error("Error in loop:", err.message);
    }
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Run every 10 seconds
  }
}

start();
