import { ethers } from "hardhat";

async function main() {
  const vaultAddress = "0x758ec85fc3047afff7977ec6edab43d21e9538ac";
  const userAddress = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";

  const vault = await ethers.getContractAt([
    "function stablecoin() external view returns (address)",
    "function aToken() external view returns (address)",
    "function poolAddressesProvider() external view returns (address)",
    "function totalStaked() external view returns (uint256)",
    "function users(address) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
    "function withdraw(uint256 amount) external"
  ], vaultAddress);

  const stablecoinAddress = await vault.stablecoin();
  const aTokenAddress = await vault.aToken();

  const stablecoin = await ethers.getContractAt([
    "function balanceOf(address) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ], stablecoinAddress);

  const aToken = await ethers.getContractAt([
    "function balanceOf(address) external view returns (uint256)",
    "function decimals() external view returns (uint8)"
  ], aTokenAddress);

  const vaultStableBalance = await stablecoin.balanceOf(vaultAddress);
  const vaultATokenBalance = await aToken.balanceOf(vaultAddress);
  const userVaultBalance = (await vault.users(userAddress)).balance;

  console.log("=== Vault Balances ===");
  console.log("Vault USDT Balance:", ethers.formatUnits(vaultStableBalance, 6));
  console.log("Vault aUSDT Balance:", ethers.formatUnits(vaultATokenBalance, 6));
  console.log("User Vault Balance:", ethers.formatUnits(userVaultBalance, 6));

  // Simulate withdrawal of 2.0 USDT (2,000,000 units) from the user's address
  const amountToWithdraw = ethers.parseUnits("2.0", 6);
  console.log(`\nSimulating withdraw(${amountToWithdraw}) from user ${userAddress}...`);

  try {
    const txData = vault.interface.encodeFunctionData("withdraw", [amountToWithdraw]);
    const callResult = await ethers.provider.call({
      to: vaultAddress,
      from: userAddress,
      data: txData
    });
    console.log("Simulation call returned successfully:", callResult);
  } catch (error: any) {
    console.error("Simulation failed!");
    console.error("Error Message:", error.message);
    if (error.data) {
      console.error("Error Data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
