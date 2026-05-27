import { ethers } from "hardhat";

async function main() {
  const USDT_ADDR = "0x5a32108DF4B45F3490Bf08349Ac1Fe69190B9F97";
  
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  
  const provider = deployer.provider!;
  
  // 1. Check bytecode exists
  const code = await provider.getCode(USDT_ADDR);
  console.log("Contract bytecode length:", code.length, "(0x = empty, >2 = deployed)");
  
  // 2. Check chain ID
  const network = await provider.getNetwork();
  console.log("Chain ID:", network.chainId.toString());
  
  // 3. Check deployer OKB balance
  const bal = await provider.getBalance(deployer.address);
  console.log("Deployer OKB balance:", ethers.formatEther(bal));
  
  // 4. Try view functions
  const usdt = new ethers.Contract(USDT_ADDR, [
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function mint(address to, uint256 amount) external"
  ], deployer);
  
  try {
    const symbol = await usdt.symbol();
    console.log("Symbol:", symbol);
  } catch (e: any) {
    console.log("symbol() FAILED:", e.message);
  }
  
  try {
    const decimals = await usdt.decimals();
    console.log("Decimals:", decimals);
  } catch (e: any) {
    console.log("decimals() FAILED:", e.message);
  }
  
  try {
    const bal = await usdt.balanceOf(deployer.address);
    console.log("Deployer USDT balance:", ethers.formatEther(bal));
  } catch (e: any) {
    console.log("balanceOf() FAILED:", e.message);
  }
  
  // 5. Try mint
  try {
    console.log("Attempting mint(deployer, 1 USDT)...");
    const tx = await usdt.mint(deployer.address, ethers.parseEther("1"));
    console.log("TX hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("TX status:", receipt?.status, "(1 = success)");
    
    const newBal = await usdt.balanceOf(deployer.address);
    console.log("New deployer USDT balance:", ethers.formatEther(newBal));
  } catch (e: any) {
    console.log("mint() FAILED:", e.message);
  }
}

main().catch(console.error);
