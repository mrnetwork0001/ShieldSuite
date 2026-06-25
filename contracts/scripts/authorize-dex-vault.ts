import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Running on network: ${network.name}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  
  // Use the old NoLossVault address
  const oldVaultAddress = "0x758ec85fc3047afff7977ec6edab43d21e9538ac";
  const newDexAddress = networkAddresses.PlayerDex;

  console.log(`Authorizing PlayerDex (${newDexAddress}) in existing NoLossVault (${oldVaultAddress})...`);

  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("NoLossVault", oldVaultAddress, signer);

  try {
    const tx = await vault.setAuthorizedSpender(newDexAddress, true);
    console.log(`Sent transaction: ${tx.hash}`);
    await tx.wait();
    console.log("✓ Successfully authorized PlayerDex in existing NoLossVault!");
  } catch (err: any) {
    console.error(`❌ Failed: ${err.message}`);
  }
}

main().catch(console.error);
