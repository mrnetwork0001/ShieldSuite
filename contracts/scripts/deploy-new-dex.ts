import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Running on network: ${network.name}`);
  console.log(`Deployer address: ${deployer.address}`);

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const data = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = data[network.name];

  if (!addresses || !addresses.NoLossVault || !addresses.PlayerShares) {
    console.error("Missing required NoLossVault or PlayerShares address in config.");
    process.exit(1);
  }

  console.log(`Existing NoLossVault: ${addresses.NoLossVault}`);
  console.log(`Existing PlayerShares: ${addresses.PlayerShares}`);

  // 1. Deploy PlayerDex
  console.log("Deploying new PlayerDex contract...");
  const PlayerDex = await ethers.getContractFactory("PlayerDex");
  const dex = await PlayerDex.deploy(addresses.NoLossVault, addresses.PlayerShares);
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log(`✓ New PlayerDex deployed to: ${dexAddress}`);

  // 2. Load vault and shares instances to authorize new DEX
  const vault = await ethers.getContractAt("NoLossVault", addresses.NoLossVault, deployer);
  const shares = await ethers.getContractAt("PlayerShares", addresses.PlayerShares, deployer);

  // 3. Authorize in NoLossVault
  console.log("Authorizing new PlayerDex in NoLossVault...");
  let tx = await vault.setAuthorizedSpender(dexAddress, true);
  await tx.wait();
  console.log("✓ New PlayerDex authorized in NoLossVault");

  // 4. Authorize in PlayerShares
  console.log("Authorizing new PlayerDex in PlayerShares...");
  tx = await shares.setAuthorizedMinter(dexAddress, true);
  await tx.wait();
  console.log("✓ New PlayerDex authorized in PlayerShares");

  // 5. Update local config files
  addresses.PlayerDex = dexAddress;
  data[network.name] = addresses;
  fs.writeFileSync(addressesPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✓ Saved new PlayerDex address to ${addressesPath}`);

  const frontendPath = path.join(__dirname, "../../packages/shieldswap/src/deployed-addresses.json");
  if (fs.existsSync(frontendPath)) {
    const frontendData = JSON.parse(fs.readFileSync(frontendPath, "utf-8"));
    frontendData[network.name] = addresses;
    fs.writeFileSync(frontendPath, JSON.stringify(frontendData, null, 2), "utf-8");
    console.log(`✓ Saved new PlayerDex address to frontend at ${frontendPath}`);
  }
}

main().catch(console.error);
