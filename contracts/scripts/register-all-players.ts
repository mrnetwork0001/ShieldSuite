import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Running on network: ${network.name}`);

  // 1. Resolve Deployed Addresses
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ No deployed-addresses.json found. Deploy contracts first.");
    process.exit(1);
  }

  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  if (!networkAddresses || !networkAddresses.PlayerShares) {
    console.error(`❌ PlayerShares address not found for network: ${network.name}`);
    process.exit(1);
  }

  console.log(`Found PlayerShares at: ${networkAddresses.PlayerShares}`);

  // 2. Load and Prepare Roster Data
  const rosterPath = path.join(__dirname, "../../packages/shieldswap/src/data/worldcup_rosters.json");
  if (!fs.existsSync(rosterPath)) {
    console.error("❌ Roster JSON file not found.");
    process.exit(1);
  }

  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf-8"));
  const players = [
    ...roster,
    { id: 9999, name: "Erling Haaland", country: "Norway", rating: 90 }
  ];

  // Filter out players already registered in the constructor to avoid double-registration gas waste
  const defaultIds = new Set([1, 16, 33, 46, 9999]);
  const playersToRegister = players.filter(p => !defaultIds.has(p.id));

  console.log(`Total players to register: ${playersToRegister.length}`);

  // 3. Connect to Contract
  const [deployer] = await ethers.getSigners();
  console.log(`Using deployer account: ${deployer.address}`);

  const shares = await ethers.getContractAt("PlayerShares", networkAddresses.PlayerShares, deployer);

  // 4. Register in Batches
  const BATCH_SIZE = 40;
  for (let i = 0; i < playersToRegister.length; i += BATCH_SIZE) {
    const batch = playersToRegister.slice(i, i + BATCH_SIZE);
    const ids = batch.map(p => p.id);
    const names = batch.map(p => p.name);
    const countries = batch.map(p => p.country);
    const ratings = batch.map(p => p.rating);

    console.log(`Registering batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(playersToRegister.length / BATCH_SIZE)} (${batch.length} players)...`);
    try {
      const tx = await shares.registerPlayers(ids, names, countries, ratings);
      console.log(`Sent transaction: ${tx.hash}`);
      await tx.wait();
      console.log(`✓ Batch ${Math.floor(i / BATCH_SIZE) + 1} registered successfully.`);
    } catch (err: any) {
      console.error(`❌ Failed to register batch: ${err.message}`);
      process.exit(1);
    }
  }

  console.log("🎉 All players successfully registered on-chain!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
