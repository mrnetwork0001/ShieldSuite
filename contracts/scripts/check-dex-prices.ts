import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Checking DEX prices on network: ${network.name}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  const dexAddress = networkAddresses.PlayerDex;
  const sharesAddress = networkAddresses.PlayerShares;

  console.log(`DEX Address: ${dexAddress}`);
  console.log(`PlayerShares Address: ${sharesAddress}`);

  const [signer] = await ethers.getSigners();
  const dex = await ethers.getContractAt("PlayerDex", dexAddress, signer);

  const idsToCheck = [
    1, 2, 16, 17, 31, 32, 33, 46, 47, 61, 63, 76, 77, 121, 151, 9999
  ];

  for (const id of idsToCheck) {
    try {
      const price = await dex.getSharePrice(id);
      console.log(`  ✓ ID ${id}: Price = ${ethers.formatEther(price)} Credits`);
    } catch (err: any) {
      console.error(`  ❌ ID ${id}: Failed to get price: ${err.message}`);
    }
  }
}

main().catch(console.error);
