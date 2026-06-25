import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const data = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));
  const addresses = data.xlayerMainnet;

  const userAddress = "0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02";
  const tokenId = 1; // Lionel Messi

  console.log(`Simulating buyShares for user: ${userAddress}, tokenId: ${tokenId}`);

  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  const vault = new ethers.Contract(addresses.NoLossVault, [
    "function users(address user) external view returns (uint256 balance, uint256 lastUpdated, uint256 accumulatedCredits, address delegatedAgent)",
    "function getCredits(address user) external view returns (uint256)",
    "function creditsPerTokenPerSecond() external view returns (uint256)"
  ], provider);
  const dex = new ethers.Contract(addresses.PlayerDex, [
    "function buyShares(uint256 tokenId, uint256 amount) external",
    "function getSharePrice(uint256 tokenId) public view returns (uint256)",
    "function vault() external view returns (address)"
  ], provider);

  // Query raw stats
  const dexVault = await dex.vault();
  console.log(`\nPlayerDex linked vault: ${dexVault}`);
  
  const userInfo = await vault.users(userAddress);
  const credits = await vault.getCredits(userAddress);
  const rate = await vault.creditsPerTokenPerSecond();
  const price = await dex.getSharePrice(tokenId);

  console.log(`\n--- Raw Contract State ---`);
  console.log(`User: ${userAddress}`);
  console.log(`UserInfo.balance: ${userInfo.balance.toString()}`);
  console.log(`UserInfo.lastUpdated: ${userInfo.lastUpdated.toString()}`);
  console.log(`UserInfo.accumulatedCredits: ${userInfo.accumulatedCredits.toString()}`);
  console.log(`getCredits(user): ${credits.toString()}`);
  console.log(`creditsPerTokenPerSecond: ${rate.toString()}`);
  console.log(`Messi Share Price: ${price.toString()}`);

  const block = await provider.getBlock("latest");
  console.log(`Latest Block Timestamp: ${block?.timestamp}`);
  
  if (block) {
    const elapsed = BigInt(block.timestamp) - userInfo.lastUpdated;
    console.log(`Elapsed seconds: ${elapsed.toString()}`);
    const earned = (userInfo.balance * elapsed * rate) / 10n**12n;
    console.log(`Calculated earned: ${earned.toString()}`);
    console.log(`Calculated total: ${(userInfo.accumulatedCredits + earned).toString()}`);
  }

  // Encode the transaction data
  const txData = dex.interface.encodeFunctionData("buyShares", [tokenId, ethers.parseEther("1")]);

  try {
    console.log("Estimating gas...");
    const gasEstimate = await provider.estimateGas({
      from: userAddress,
      to: addresses.PlayerDex,
      data: txData
    });
    console.log(`✓ Gas estimation succeeded! Estimate: ${gasEstimate.toString()}`);
  } catch (err: any) {
    console.error("❌ Gas estimation failed!");
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    if (err.data) {
      console.error("Error data:", err.data);
    }
  }
}

main().catch(console.error);
