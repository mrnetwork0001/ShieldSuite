import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Resolve USDT address (Mainnet vs. Testnet/Local)
  let usdtAddress = "";
  if (network.name === "xlayerMainnet") {
    usdtAddress = "0x1e4a5963abfd975d8c9021ce480b42188849d41d";
    console.log("Using X Layer Mainnet USDT address:", usdtAddress);
  } else {
    console.log("Deploying MockUSDT...");
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    const usdt = await MockUSDT.deploy();
    await usdt.waitForDeployment();
    usdtAddress = await usdt.getAddress();
    console.log("MockUSDT deployed to:", usdtAddress);
  }

  // 2. Deploy NoLossVault
  console.log("Deploying NoLossVault...");
  const NoLossVault = await ethers.getContractFactory("NoLossVault");
  const vault = await NoLossVault.deploy(usdtAddress);
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("NoLossVault deployed to:", vaultAddress);

  // 3. Deploy PlayerShares
  console.log("Deploying PlayerShares...");
  const PlayerShares = await ethers.getContractFactory("PlayerShares");
  const shares = await PlayerShares.deploy();
  await shares.waitForDeployment();
  const sharesAddress = await shares.getAddress();
  console.log("PlayerShares deployed to:", sharesAddress);

  // 4. Deploy PlayerDex
  console.log("Deploying PlayerDex...");
  const PlayerDex = await ethers.getContractFactory("PlayerDex");
  const dex = await PlayerDex.deploy(vaultAddress, sharesAddress);
  await dex.waitForDeployment();
  const dexAddress = await dex.getAddress();
  console.log("PlayerDex deployed to:", dexAddress);

  // 5. Authorize PlayerDex in NoLossVault & PlayerShares
  console.log("Authorizing PlayerDex in NoLossVault...");
  let tx = await vault.setAuthorizedSpender(dexAddress, true);
  await tx.wait();
  console.log("PlayerDex authorized in NoLossVault");

  console.log("Authorizing PlayerDex in PlayerShares...");
  tx = await shares.setAuthorizedMinter(dexAddress, true);
  await tx.wait();
  console.log("PlayerDex authorized in PlayerShares");

  // Save deployed addresses under the active network name
  const addresses = {
    MockUSDT: usdtAddress,
    NoLossVault: vaultAddress,
    PlayerShares: sharesAddress,
    PlayerDex: dexAddress,
    deployer: deployer.address,
  };

  const outputPath = path.join(__dirname, "../deployed-addresses.json");
  let existingAddresses: any = {};
  if (fs.existsSync(outputPath)) {
    try {
      existingAddresses = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    } catch (err) {}
  }
  
  // Save under network name
  existingAddresses[network.name] = addresses;
  fs.writeFileSync(outputPath, JSON.stringify(existingAddresses, null, 2));
  console.log(`Addresses saved under network "${network.name}" to ${outputPath}`);

  // Also write to frontend package if it exists
  const frontendPath = path.join(__dirname, "../../packages/shieldswap/src/deployed-addresses.json");
  try {
    let existingFrontendAddresses: any = {};
    if (fs.existsSync(frontendPath)) {
      try {
        existingFrontendAddresses = JSON.parse(fs.readFileSync(frontendPath, "utf-8"));
      } catch (err) {}
    }
    existingFrontendAddresses[network.name] = addresses;
    fs.writeFileSync(frontendPath, JSON.stringify(existingFrontendAddresses, null, 2));
    console.log(`Addresses saved under network "${network.name}" to frontend at ${frontendPath}`);
  } catch (err: any) {
    console.warn("Could not save to frontend package:", err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
