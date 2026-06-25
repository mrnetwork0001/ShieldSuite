import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SHARES_ABI = [
  "function getPlayers(uint256[] ids) view returns (tuple(string nameString, string country, uint256 rating, uint256 goals, uint256 assists)[])"
];

const DEX_ABI = [
  "function getSharePrices(uint256[] tokenIds) view returns (uint256[])"
];

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const data = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = data.xlayerMainnet;

  const [signer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", addresses.PlayerShares, signer);
  const dex = await ethers.getContractAt("PlayerDex", addresses.PlayerDex, signer);
  const vault = await ethers.getContractAt("NoLossVault", addresses.NoLossVault, signer);

  console.log("Checking if PlayerDex is authorized spender on NoLossVault...");
  const isAuthorizedSpender = await vault.authorizedSpenders(addresses.PlayerDex);
  console.log(`Is PlayerDex authorized spender? ${isAuthorizedSpender ? "YES" : "NO"}`);

  console.log("Checking if PlayerDex is authorized minter on PlayerShares...");
  const isAuthorizedMinter = await shares.authorizedMinters(addresses.PlayerDex);
  console.log(`Is PlayerDex authorized minter? ${isAuthorizedMinter ? "YES" : "NO"}`);

  console.log(`\nQuerying staker info for deployer/signer: ${signer.address}...`);
  const userInfo = await vault.users(signer.address);
  const credits = await vault.getCredits(signer.address);
  console.log(`Staked Balance: ${ethers.formatUnits(userInfo.balance, 6)} USDT`);
  console.log(`Delegated Agent: ${userInfo.delegatedAgent}`);
  console.log(`Accumulated Credits: ${ethers.formatEther(credits)} Credits`);

  const onChainIds = [1, 2, 16, 17, 31, 32, 33, 46, 47, 61, 63, 76, 77, 121, 151, 9999];

  console.log("Calling getPlayers...");
  const playersStats = await shares.getPlayers(onChainIds);
  console.log("✓ getPlayers success, length:", playersStats.length);

  console.log("Calling getSharePrices...");
  const pricesRaw = await dex.getSharePrices(onChainIds);
  console.log("✓ getSharePrices success, length:", pricesRaw.length);

  playersStats.forEach((s: any, i: number) => {
    console.log(`Player ID ${onChainIds[i]}: Name=${s.nameString || s[0]}, Rating=${s.rating || s[2]}, Price=${ethers.formatEther(pricesRaw[i])} Credits`);
  });
}

main().catch(console.error);
