import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log(`Running on network: ${network.name}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  
  const vaultAddress = networkAddresses.NoLossVault;
  const sharesAddress = networkAddresses.PlayerShares;
  const teeAgentAddress = "0x80f28d975cf34f6213a4e9cda8ebdd8a8f7bceb6";

  console.log(`TEE Agent Address: ${teeAgentAddress}`);
  console.log(`vaultAddress (existing): ${vaultAddress}`);
  console.log(`sharesAddress: ${sharesAddress}`);

  const [signer] = await ethers.getSigners();
  console.log(`Signing with: ${signer.address}`);

  // 1. Authorize TEE Agent as Spender in NoLossVault
  console.log(`Authorizing TEE Agent in existing NoLossVault...`);
  const vault = await ethers.getContractAt("ProductionNoLossVault", vaultAddress, signer);
  try {
    const tx1 = await vault.setAuthorizedSpender(teeAgentAddress, true);
    console.log(`Sent vault authorization tx: ${tx1.hash}`);
    await tx1.wait();
    console.log("✓ Successfully authorized TEE Agent in NoLossVault!");
  } catch (err: any) {
    console.error(`❌ Vault authorization failed: ${err.message}`);
  }

  // 2. Authorize TEE Agent as Minter in PlayerShares
  console.log(`Authorizing TEE Agent as Minter in PlayerShares...`);
  const shares = await ethers.getContractAt("PlayerShares", sharesAddress, signer);
  try {
    const tx2 = await shares.setAuthorizedMinter(teeAgentAddress, true);
    console.log(`Sent PlayerShares minter authorization tx: ${tx2.hash}`);
    await tx2.wait();
    console.log("✓ Successfully authorized TEE Agent as Minter in PlayerShares!");
  } catch (err: any) {
    console.error(`❌ PlayerShares minter authorization failed: ${err.message}`);
  }
}

main().catch(console.error);
