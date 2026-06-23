const { ethers } = require("ethers");
const fs = require("fs");

async function exportWinners() {
    console.log("Fetching registered users from Shield Suite API...");
    
    let userAddresses = [];
    try {
        const fetch = (await import('node-fetch')).default;
        const res = await fetch("https://api.shieldsuite.xyz/api/worldcup/users");
        const json = await res.json();
        if (json.success && json.data) {
            userAddresses = json.data;
        } else {
            throw new Error("Invalid API response");
        }
    } catch (err) {
        console.warn("Failed to fetch from production API, falling back to local database...", err.message);
        try {
            const localData = JSON.parse(fs.readFileSync("packages/scanguard/data/worldcup_users.json", "utf-8"));
            userAddresses = localData;
        } catch (e) {
            console.error("Could not find any user database.");
            return;
        }
    }

    console.log(`Found ${userAddresses.length} registered users. Querying blockchain...`);

    const rpcUrl = process.env.XLAYER_RPC_URL || "https://rpc.xlayer.tech";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Mainnet Vault
    const vaultAddress = "0x758ec85fc3047afff7977ec6edab43d21e9538ac"; 
    const vaultAbi = [
        "function getCredits(address user) external view returns (uint256)",
        "function users(address user) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)"
    ];
    
    const vault = new ethers.Contract(vaultAddress, vaultAbi, provider);
    const results = [];

    for (const addr of userAddresses) {
        try {
            const userInfo = await vault.users(addr);
            const credits = await vault.getCredits(addr);
            
            const stakedUsd = Number(ethers.formatUnits(userInfo.balance, 6)); // XLayer mainnet USDT has 6 decimals
            
            // Replicate the deterministic volume logic from Leaderboard.tsx
            const seed = parseInt(addr.slice(-6), 16) || 1;
            const volumeTraded = (seed % 15000) + (stakedUsd * 4.5);
            
            let multiplier = 1.0;
            if (volumeTraded >= 50000) multiplier = 5.0;
            else if (volumeTraded >= 10000) multiplier = 3.0;
            else if (volumeTraded >= 2500) multiplier = 2.0;
            else if (volumeTraded >= 500) multiplier = 1.5;

            const creditsFormatted = parseFloat(ethers.formatEther(credits)).toFixed(2);
            
            results.push({
                Address: addr,
                Staked_USDT: stakedUsd.toFixed(2),
                Scout_Credits: creditsFormatted,
                Volume_Traded: volumeTraded.toFixed(2),
                Multiplier: multiplier.toFixed(1) + "x"
            });
            
            console.log(`Processed: ${addr} - Credits: ${creditsFormatted}`);
        } catch (e) {
            console.error(`Failed to process ${addr}: ${e.message}`);
        }
    }

    // Sort by credits descending
    results.sort((a, b) => parseFloat(b.Scout_Credits) - parseFloat(a.Scout_Credits));

    // Generate CSV
    const csvHeader = "Rank,Address,Staked_USDT,Scout_Credits,Volume_Traded,Multiplier\n";
    const csvRows = results.map((r, index) => 
        `${index + 1},${r.Address},${r.Staked_USDT},${r.Scout_Credits},${r.Volume_Traded},${r.Multiplier}`
    ).join("\n");

    fs.writeFileSync("winners.csv", csvHeader + csvRows);
    console.log(`\nSuccess! Collated ${results.length} winners.`);
    console.log("Exported data to 'winners.csv'");
}

exportWinners().catch(console.error);
