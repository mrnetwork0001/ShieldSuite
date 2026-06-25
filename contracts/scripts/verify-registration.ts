import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Running verification on network: ${network.name}`);
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];

  if (!addresses || !addresses.PlayerShares) {
    console.error(`❌ No deployed addresses found for network: ${network.name}`);
    process.exit(1);
  }

  console.log("NoLossVault:", addresses.NoLossVault);
  console.log("PlayerShares:", addresses.PlayerShares);
  console.log("PlayerDex:", addresses.PlayerDex);

  const [deployer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", addresses.PlayerShares, deployer);
  const dex = await ethers.getContractAt("PlayerDex", addresses.PlayerDex, deployer);

  // Test with all 16 player IDs
  const testIds = [1, 2, 16, 17, 31, 32, 33, 46, 47, 61, 63, 76, 77, 121, 151, 9999];
  console.log("Querying player stats for IDs:", testIds);
  
  try {
    const stats = await shares.getPlayers(testIds);
    const prices = await dex.getSharePrices(testIds);

    testIds.forEach((id, i) => {
      console.log(`\nPlayer Token ID: ${id}`);
      console.log(`Name: ${stats[i].nameString}`);
      console.log(`Country: ${stats[i].country}`);
      console.log(`Rating: ${stats[i].rating.toString()}`);
      console.log(`Share Price: ${ethers.formatEther(prices[i])} Credits`);
    });
  } catch (err: any) {
    console.error("❌ Failed to query registration: ", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
