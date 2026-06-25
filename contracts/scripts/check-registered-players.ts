import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Checking registered players on network: ${network.name}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ No deployed-addresses.json found.");
    process.exit(1);
  }

  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  if (!networkAddresses || !networkAddresses.PlayerShares) {
    console.error(`❌ PlayerShares address not found for network: ${network.name}`);
    process.exit(1);
  }

  const sharesAddress = networkAddresses.PlayerShares;
  console.log(`PlayerShares contract address: ${sharesAddress}`);

  const [signer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", sharesAddress, signer);

  // Let's check IDs 1 to 20, 31 to 35, 46 to 48, 61 to 65, 76 to 78, 121, 151, 9999
  const idsToCheck = [
    1, 2, 16, 17, 31, 32, 33, 46, 47, 61, 63, 76, 77, 121, 151, 9999
  ];

  console.log("\nQuerying player details from contract...");
  for (const id of idsToCheck) {
    try {
      const player = await shares.players(id);
      if (player.nameString && player.nameString.trim() !== "") {
        console.log(`  ✓ ID ${id}: Name="${player.nameString}", Country="${player.country}", Rating=${player.rating.toString()}`);
      } else {
        console.log(`  ❌ ID ${id}: Not registered (empty name)`);
      }
    } catch (err: any) {
      console.log(`  ❌ ID ${id}: Error querying player: ${err.message}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
