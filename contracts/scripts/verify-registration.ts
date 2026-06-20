import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8")).xlayerMainnet;

  console.log("NoLossVault:", addresses.NoLossVault);
  console.log("PlayerShares:", addresses.PlayerShares);
  console.log("PlayerDex:", addresses.PlayerDex);

  const [deployer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", addresses.PlayerShares, deployer);
  const dex = await ethers.getContractAt("PlayerDex", addresses.PlayerDex, deployer);

  // Test with sample IDs:
  // 1: Messi, 16: Mbappe, 2: Lautaro Martinez (roster ID 2), 9999: Haaland (Norway)
  const testIds = [1, 16, 2, 9999];
  console.log("Querying player stats for IDs:", testIds);
  const stats = await shares.getPlayers(testIds);
  const prices = await dex.getSharePrices(testIds);

  testIds.forEach((id, i) => {
    console.log(`\nPlayer Token ID: ${id}`);
    console.log(`Name: ${stats[i].nameString}`);
    console.log(`Country: ${stats[i].country}`);
    console.log(`Rating: ${stats[i].rating.toString()}`);
    console.log(`Share Price: ${ethers.formatEther(prices[i])} Credits`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
