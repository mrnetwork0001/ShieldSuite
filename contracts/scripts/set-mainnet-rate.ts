import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  if (network.name !== "xlayerMainnet") {
    console.error("❌ This script should only be run on X Layer Mainnet!");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Setting rate with the account:", deployer.address);

  // Load deployed addresses
  const addressPath = path.resolve(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressPath)) {
    console.error("❌ No deployed-addresses.json found!");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(addressPath, "utf-8"));
  const mainnetAddresses = data.xlayerMainnet;

  if (!mainnetAddresses || !mainnetAddresses.NoLossVault) {
    console.error("❌ Mainnet NoLossVault address not found in deployed-addresses.json!");
    process.exit(1);
  }

  console.log("NoLossVault (Mainnet):", mainnetAddresses.NoLossVault);

  // Load contract
  const NoLossVault = await ethers.getContractFactory("NoLossVault");
  const vault = NoLossVault.attach(mainnetAddresses.NoLossVault) as any;

  // Rate on Testnet is 158440000000 (USDT has 18 decimals)
  // Rate on Mainnet must be 158440000000 * 10^12 (USDT has 6 decimals) to yield the exact same 18-decimal virtual credits.
  const newRate = 158440000000n * 1000000000000n; // 158440000000000000000000
  
  console.log(`Setting creditsPerTokenPerSecond to: ${newRate.toString()}`);
  const tx = await vault.setCreditsPerTokenPerSecond(newRate);
  console.log("Transaction sent:", tx.hash);

  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  console.log("✅ Credits rate successfully adjusted on Mainnet!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
