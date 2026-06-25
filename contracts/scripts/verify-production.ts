import { ethers } from "hardhat";

async function main() {
  const user = "0xCd0a2370F2dC12c1802707B7d9aB3fec891E3c02";
  const usdtAddress = "0x779ded0c9e1022225f8e0630b35a9b54be713736";
  const vaultAddress = "0xdc5ef9103e12c7595950b25044cf91ad7f860dd3";

  console.log("Connecting to X Layer Mainnet...");

  const USDT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)"
  ];

  const VAULT_ABI = [
    "function stablecoin() view returns (address)",
    "function aToken() view returns (address)",
    "function poolAddressesProvider() view returns (address)",
    "function totalStaked() view returns (uint256)",
    "function creditsPerTokenPerSecond() view returns (uint256)",
    "function users(address) view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
    "function getCredits(address) view returns (uint256)"
  ];

  const provider = ethers.provider;
  const usdt = new ethers.Contract(usdtAddress, USDT_ABI, provider);
  const vault = new ethers.Contract(vaultAddress, VAULT_ABI, provider);

  try {
    const [usdtName, usdtSymbol, usdtDecs, usdtBalance] = await Promise.all([
      usdt.name(),
      usdt.symbol(),
      usdt.decimals(),
      usdt.balanceOf(user)
    ]);

    console.log("\n--- USDT Info ---");
    console.log("Token Address:", usdtAddress);
    console.log("Name:", usdtName);
    console.log("Symbol:", usdtSymbol);
    console.log("Decimals:", usdtDecs);
    console.log(`User balance: ${ethers.formatUnits(usdtBalance, usdtDecs)} ${usdtSymbol}`);

    const [stablecoinInVault, aTokenInVault, providerAddr, totalStaked, rate, userInfo, credits] = await Promise.all([
      vault.stablecoin(),
      vault.aToken(),
      vault.poolAddressesProvider(),
      vault.totalStaked(),
      vault.creditsPerTokenPerSecond(),
      vault.users(user),
      vault.getCredits(user)
    ]);

    console.log("\n--- Vault Info ---");
    console.log("Vault Address:", vaultAddress);
    console.log("Stablecoin set in vault:", stablecoinInVault);
    console.log("aToken set in vault:", aTokenInVault);
    console.log("Pool Addresses Provider:", providerAddr);
    console.log("Total staked in vault:", ethers.formatUnits(totalStaked, usdtDecs));
    console.log("Credits per token per second:", rate.toString());
    console.log(`User staked balance: ${ethers.formatUnits(userInfo.balance, usdtDecs)} USDT`);
    console.log(`User accumulated credits: ${ethers.formatEther(userInfo.accumulatedCredits)}`);
    console.log(`User total credits: ${ethers.formatEther(credits)}`);

    const allowance = await usdt.allowance(user, vaultAddress);
    console.log(`User allowance for vault: ${ethers.formatUnits(allowance, usdtDecs)} USDT`);

  } catch (err) {
    console.error("Error in verification:", err);
  }
}

main().catch(console.error);
