import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const data = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = data.xlayerMainnet;

  const [signer] = await ethers.getSigners();
  const vault = await ethers.getContractAt("NoLossVault", addresses.NoLossVault, signer);

  console.log("NoLossVault address:", addresses.NoLossVault);

  // Fetch users from backend leaderboard
  const userAddresses = new Set<string>();
  userAddresses.add(signer.address.toLowerCase());
  userAddresses.add("0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02");
  userAddresses.add("0x7621c83f527a38870a6e9164f69cf1fb1e3c8afc");
  userAddresses.add("0xef5a8288bf87eb2b182fd2d93b98c2d50398b338");

  try {
    const res = await fetch("http://localhost:3402/api/worldcup/leaderboard");
    const resData: any = await res.json();
    if (resData.success && Array.isArray(resData.data)) {
      resData.data.forEach((item: any) => {
        if (item.address) {
          userAddresses.add(item.address.toLowerCase());
        }
      });
    }
    console.log(`Fetched ${userAddresses.size} unique addresses (including signer).`);
  } catch (e: any) {
    console.error("Failed to query backend leaderboard:", e.message);
  }

  for (const staker of userAddresses) {
    const userInfo = await vault.users(staker);
    const credits = await vault.getCredits(staker);
    console.log(`\nAddress: ${staker}`);
    console.log(`  Staked Balance: ${ethers.formatUnits(userInfo.balance, 6)} USDT`);
    console.log(`  Delegated Agent: ${userInfo.delegatedAgent}`);
    console.log(`  Accumulated Credits: ${ethers.formatEther(credits)} Credits`);
  }
}

main().catch(console.error);
