import { ethers } from "hardhat";

async function main() {
  const feeData = await ethers.provider.getFeeData();
  const gasPrice = feeData.gasPrice || 0n;
  console.log(`Current Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei (${gasPrice.toString()} wei)`);

  // Deployment gas estimates
  const PlayerShares = await ethers.getContractFactory("PlayerShares");
  const PlayerDex = await ethers.getContractFactory("PlayerDex");

  const sharesGas = await ethers.provider.estimateGas(await PlayerShares.getDeployTransaction());
  console.log(`PlayerShares deploy gas estimate: ${sharesGas.toString()}`);
  console.log(`Cost: ${ethers.formatEther(sharesGas * gasPrice)} OKB`);
}

main().catch(console.error);
