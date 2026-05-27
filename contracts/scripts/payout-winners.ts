import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  if (network.name !== "xlayerMainnet") {
    console.error("❌ This script should only be run on X Layer Mainnet!");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Starting payout distribution script with account:", deployer.address);

  // 1. Load addresses
  const addressPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressPath)) {
    console.error("❌ No deployed-addresses.json found!");
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(addressPath, "utf-8"));
  const mainnetAddresses = data.xlayerMainnet;

  if (!mainnetAddresses || !mainnetAddresses.NoLossVault || !mainnetAddresses.MockUSDT) {
    console.error("❌ Vault or USDT address not found in deployed-addresses.json!");
    process.exit(1);
  }

  const vaultAddress = mainnetAddresses.NoLossVault;
  const usdtAddress = mainnetAddresses.MockUSDT;

  console.log("NoLossVault:", vaultAddress);
  console.log("USDT (Mainnet):", usdtAddress);

  // 2. Instantiate contracts
  const ProductionNoLossVault = await ethers.getContractFactory("ProductionNoLossVault");
  const vault = ProductionNoLossVault.attach(vaultAddress) as any;

  // We load the ERC20 interface for USDT and aUSDT
  const IERC20Abi = [
    "function balanceOf(address account) external view returns (uint256)",
    "function transfer(address recipient, uint256 amount) external returns (bool)",
    "function decimals() external view returns (uint8)"
  ];
  const usdt = new ethers.Contract(usdtAddress, IERC20Abi, deployer);

  const aTokenAddress = await vault.aToken();
  const aToken = new ethers.Contract(aTokenAddress, IERC20Abi, deployer);

  // 3. Calculate Yield Surplus
  const totalStaked = await vault.totalStaked();
  const vaultTotalBalance = await aToken.balanceOf(vaultAddress);
  const decimals = await usdt.decimals();

  console.log(`\nVault Stats:`);
  console.log(`- Total User Staked: ${ethers.formatUnits(totalStaked, decimals)} USDT`);
  console.log(`- Vault aUSDT Collateral Balance: ${ethers.formatUnits(vaultTotalBalance, decimals)} aUSDT`);

  if (vaultTotalBalance <= totalStaked) {
    console.log("ℹ️ No surplus yield has accumulated yet. (No-loss deposits must remain staked to earn interest on Aave).");
    return;
  }

  const surplus = vaultTotalBalance - totalStaked;
  console.log(`- Surplus Yield available to harvest: ${ethers.formatUnits(surplus, decimals)} USDT`);

  // 4. Harvest yield
  console.log("\nHarvesting surplus yield from Aave to deployer...");
  const harvestTx = await vault.harvestYield(deployer.address);
  console.log("Harvest TX sent:", harvestTx.hash);
  await harvestTx.wait();
  console.log("✅ Yield successfully harvested!");

  // 5. Distribute USDT to the winners (e.g. top managers on the leaderboard)
  // Edit winner addresses and percentage allocations below
  const winners = [
    { address: "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02", percent: 60 }, // 1st Place: 60% of yield
    { address: "0xDAce8445a5bD576111cCC8e598B67965252023C2", percent: 40 }, // 2nd Place: 40% of yield
  ];

  console.log(`\nDistributing ${ethers.formatUnits(surplus, decimals)} USDT to winners:`);

  for (const winner of winners) {
    const payoutAmount = (surplus * BigInt(winner.percent)) / 100n;
    if (payoutAmount > 0n) {
      console.log(`Sending ${ethers.formatUnits(payoutAmount, decimals)} USDT to winner ${winner.address} (${winner.percent}%)...`);
      const transferTx = await usdt.transfer(winner.address, payoutAmount);
      console.log(`Payout Transaction: ${transferTx.hash}`);
      await transferTx.wait();
    }
  }

  console.log("✨ All yield rewards successfully distributed to leaderboard winners!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
