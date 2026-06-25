import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Running on network: ${network.name}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  const sharesAddress = networkAddresses.PlayerShares;

  const [signer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", sharesAddress, signer);

  console.log("Attempting singular registerPlayer for ID 2 (Lautaro Martinez)...");
  try {
    const tx = await shares.registerPlayer(2, "Lautaro Martinez", "Argentina", 87);
    console.log(`Sent transaction: ${tx.hash}`);
    await tx.wait();
    console.log("✓ Success!");
  } catch (err: any) {
    console.error(`❌ Failed: ${err.message}`);
  }
}

main().catch(console.error);
