import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

const SHARES_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function players(uint256 id) external view returns (string name, string country, uint256 rating, uint256 goals, uint256 assists)",
  "function getPlayers(uint256[] ids) view returns (tuple(string nameString, string country, uint256 rating, uint256 goals, uint256 assists)[])",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])"
];

const DEX_ABI = [
  "function getSharePrice(uint256 tokenId) public view returns (uint256)",
  "function getSharePrices(uint256[] tokenIds) view returns (uint256[])",
  "function buyShares(uint256 tokenId, uint256 amount) external",
  "function sellShares(uint256 tokenId, uint256 amount) external"
];

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const data = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = data.xlayerMainnet;

  console.log("Testing with address set:", addresses);

  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const shares = new ethers.Contract(addresses.PlayerShares, SHARES_ABI, provider);
  const dex = new ethers.Contract(addresses.PlayerDex, DEX_ABI, provider);

  const onChainIds = [1, 2, 16, 17, 31, 32, 33, 46, 47, 61, 63, 76, 77, 121, 151, 9999];

  console.log("Querying players...");
  const statsPromises = onChainIds.map(async (id) => {
    try {
      const res = await shares.players(id);
      return {
        id,
        nameString: res[0] || "",
        country: res[1] || "",
        rating: res[2] || 0n,
        goals: res[3] || 0n,
        assists: res[4] || 0n
      };
    } catch (e: any) {
      console.error(`Error querying player ID ${id}:`, e.message);
      return null;
    }
  });

  const pricesPromises = onChainIds.map(async (id) => {
    try {
      return await dex.getSharePrice(id);
    } catch (e: any) {
      console.error(`Error querying DEX price for ID ${id}:`, e.message);
      return 0n;
    }
  });

  const [playersStats, pricesRaw] = await Promise.all([
    Promise.all(statsPromises),
    Promise.all(pricesPromises)
  ]);

  console.log("Query completed!");
  playersStats.forEach((p, i) => {
    if (p) {
      console.log(`Player ID ${p.id}: ${p.nameString} (${p.country}) - OVR ${p.rating.toString()} | Price: ${ethers.formatEther(pricesRaw[i])} CRD`);
    } else {
      console.log(`Player ID ${onChainIds[i]}: NULL`);
    }
  });
}

main().catch(console.error);
