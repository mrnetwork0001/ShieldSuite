import pkg from "hardhat";
const { ethers, network } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Setting rate on network "${network.name}" with the account:`, deployer.address);

  // Load deployed addresses
  const addressPath = path.resolve(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressPath)) {
    console.error("❌ No deployed-addresses.json found!");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(addressPath, "utf-8"));
  
  let targetAddress = "";
  let decimals = 18;

  if (network.name === "xlayerMainnet") {
    targetAddress = data.xlayerMainnet?.NoLossVault;
    decimals = 6;
  } else {
    console.error("❌ Unsupported network!");
    process.exit(1);
  }

  if (!targetAddress) {
    console.error(`❌ NoLossVault address not found for network: ${network.name}`);
    process.exit(1);
  }

  console.log(`NoLossVault Address: ${targetAddress}`);

  // Base rate set to target exactly 200 credits per day per 1 USDT
  let newRate = 2314814814n;
  if (decimals === 6) {
    // scale up by 1e12 for 6-decimal USDT to yield 18-decimal virtual credits on mainnet
    newRate = newRate * 1000000000000n;
  }

  console.log(`Setting creditsPerTokenPerSecond to: ${newRate.toString()}`);

  const vault = await ethers.getContractAt("NoLossVault", targetAddress);
  const tx = await vault.setCreditsPerTokenPerSecond(newRate);
  console.log("Transaction sent:", tx.hash);

  console.log("Waiting for transaction confirmation...");
  await tx.wait();
  console.log(`✅ Credits rate successfully adjusted to ${newRate.toString()} on ${network.name}!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
