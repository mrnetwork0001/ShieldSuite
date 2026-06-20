import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  if (network.name !== "xlayerMainnet") {
    console.error("❌ This script should only be run on X Layer Mainnet!");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} OKB`);

  if (balance < ethers.parseEther("0.005")) {
    console.warn("⚠️ Balance might be too low for deployment gas!");
  }

  // 1. Load existing addresses to get PlayerShares address
  const addressPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressPath)) {
    console.error("❌ No deployed-addresses.json found! Deploy PlayerShares first.");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(addressPath, "utf-8"));
  const mainnetAddresses = data.xlayerMainnet;

  if (!mainnetAddresses || !mainnetAddresses.PlayerShares) {
    console.error("❌ PlayerShares mainnet address not found in deployed-addresses.json!");
    process.exit(1);
  }

  const sharesAddress = mainnetAddresses.PlayerShares.toLowerCase();
  console.log("Using existing PlayerShares (Mainnet):", sharesAddress);

  // Constants for X Layer Mainnet Aave integration (in lowercase to avoid checksum issues)
  const usdtAddress = "0x779Ded0c9e1022225f8E0630b35a9b54bE713736".toLowerCase();
  const aUsdtAddress = "0xF356ae412dB5df43BD3a10746f7ad4e1C4De4297".toLowerCase();
  const aaveProviderAddress = "0xdFf435BCcf782f11187D3a4454d96702eD78e092".toLowerCase();

  // 2. Deploy ProductionNoLossVault
  console.log("Deploying ProductionNoLossVault...");
  const ProductionNoLossVault = await ethers.getContractFactory("ProductionNoLossVault");
  const vault = await ProductionNoLossVault.deploy(usdtAddress, aUsdtAddress, aaveProviderAddress);
  await vault.waitForDeployment();
  const vaultAddress = (await vault.getAddress()).toLowerCase();
  console.log("ProductionNoLossVault deployed to:", vaultAddress);

  // 3. Deploy PlayerDex
  console.log("Deploying PlayerDex...");
  const PlayerDex = await ethers.getContractFactory("PlayerDex");
  const dex = await PlayerDex.deploy(vaultAddress, sharesAddress);
  await dex.waitForDeployment();
  const dexAddress = (await dex.getAddress()).toLowerCase();
  console.log("PlayerDex deployed to:", dexAddress);

  // 4. Authorize PlayerDex in ProductionNoLossVault
  console.log("Authorizing PlayerDex in ProductionNoLossVault...");
  let tx = await vault.setAuthorizedSpender(dexAddress, true);
  await tx.wait();
  console.log("PlayerDex authorized in ProductionNoLossVault");

  // 5. Authorize PlayerDex in PlayerShares
  console.log("Authorizing PlayerDex in PlayerShares...");
  const PlayerShares = await ethers.getContractFactory("PlayerShares");
  const shares = PlayerShares.attach(sharesAddress) as any;
  tx = await shares.setAuthorizedMinter(dexAddress, true);
  await tx.wait();
  console.log("PlayerDex authorized in PlayerShares");

  // 6. Set 18-decimal credit yield rate for 6-decimal USDT
  // Adjusted Rate on Mainnet is 15844000 * 10^12 = 15844000000000000000
  const rate = 15844000n * 1000000000000n;
  console.log("Setting 18-decimal synchronized yield rate...");
  tx = await vault.setCreditsPerTokenPerSecond(rate);
  await tx.wait();
  console.log("Yield rate configured successfully.");

  // 7. Update address records
  const updatedMainnetAddresses = {
    MockUSDT: usdtAddress, // Keep key MockUSDT in registry for frontend mapping compatibility
    NoLossVault: vaultAddress,
    PlayerShares: sharesAddress,
    PlayerDex: dexAddress,
    deployer: deployer.address.toLowerCase(),
  };

  data.xlayerMainnet = updatedMainnetAddresses;
  fs.writeFileSync(addressPath, JSON.stringify(data, null, 2));
  console.log(`Addresses registry updated at: ${addressPath}`);

  // Update frontend addresses registry
  const frontendPath = path.resolve(__dirname, "../../packages/shieldswap/src/deployed-addresses.json");
  if (fs.existsSync(frontendPath)) {
    const frontendData = JSON.parse(fs.readFileSync(frontendPath, "utf-8"));
    frontendData.xlayerMainnet = updatedMainnetAddresses;
    fs.writeFileSync(frontendPath, JSON.stringify(frontendData, null, 2));
    console.log(`Frontend addresses registry updated at: ${frontendPath}`);
  }

  console.log("✨ All upgraded mainnet contracts deployed and configured successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
