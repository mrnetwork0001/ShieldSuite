import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const XLAYER_RPC = "https://rpc.xlayer.tech";
const XLAYER_CHAIN_ID = 196;
const LOCAL_RPC = "http://127.0.0.1:8545";

let cachedProvider: ethers.JsonRpcProvider | null = null;

export async function detectProvider(): Promise<ethers.JsonRpcProvider> {
  if (cachedProvider) return cachedProvider;

  const addresses = getDeployedAddresses();
  if (!addresses) {
    console.warn(`⚠️ No deployed-addresses.json found. Defaulting to XLAYER_RPC: ${XLAYER_RPC}`);
    cachedProvider = new ethers.JsonRpcProvider(XLAYER_RPC, XLAYER_CHAIN_ID, { staticNetwork: true });
    return cachedProvider;
  }

  // 1. Try XLayer RPC first (Mainnet/Testnet depending on config)
  try {
    console.log(`Checking contracts on XLayer RPC: ${XLAYER_RPC}`);
    const rpcProvider = new ethers.JsonRpcProvider(XLAYER_RPC, XLAYER_CHAIN_ID, { staticNetwork: true });
    const code = await rpcProvider.getCode(addresses.MockUSDT);
    if (code !== "0x" && code.length > 2) {
      console.log("🟢 Detected deployed contracts on XLayer Mainnet. Using RPC.");
      cachedProvider = rpcProvider;
      return cachedProvider;
    }
  } catch (err: any) {
    console.warn(`⚠️ XLayer RPC check failed: ${err.message}`);
  }

  // 2. Try Localhost as fallback
  try {
    const localProvider = new ethers.JsonRpcProvider(LOCAL_RPC, 31337, { staticNetwork: true });
    const code = await localProvider.getCode(addresses.MockUSDT);
    if (code !== "0x" && code.length > 2) {
      console.log("🟢 Detected deployed contracts on Localhost. Using Localhost RPC.");
      cachedProvider = localProvider;
      return cachedProvider;
    }
  } catch (err) {
    // Localhost not running
  }

  // 3. Fallback to XLAYER_RPC
  console.log(`⚠️ Deployed contracts not confirmed. Falling back to XLAYER_RPC: ${XLAYER_RPC}`);
  cachedProvider = new ethers.JsonRpcProvider(XLAYER_RPC, XLAYER_CHAIN_ID, { staticNetwork: true });
  return cachedProvider;
}

export function getProvider(): ethers.JsonRpcProvider {
  if (!cachedProvider) {
    const rpc = "https://rpc.xlayer.tech";
    cachedProvider = new ethers.JsonRpcProvider(rpc, 196, { staticNetwork: true });
  }
  return cachedProvider;
}

export function getAgentWallet(provider: ethers.JsonRpcProvider): ethers.Wallet {
  const pk = process.env.AGENT_PRIVATE_KEY;
  if (pk) {
    try {
      return new ethers.Wallet(pk, provider);
    } catch {
      console.warn("⚠️ Invalid AGENT_PRIVATE_KEY. Generating ephemeral wallet.");
    }
  }
  
  // Use a hardhat default private key if it exists, otherwise generate ephemeral
  const hardhatDefaultPk = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  try {
    return new ethers.Wallet(hardhatDefaultPk, provider);
  } catch {
    const randomWallet = ethers.Wallet.createRandom();
    return new ethers.Wallet(randomWallet.privateKey, provider);
  }
}

export interface DeployedAddresses {
  MockUSDT: string;
  NoLossVault: string;
  PlayerShares: string;
  PlayerDex: string;
  deployer: string;
}

export function getDeployedAddresses(): DeployedAddresses | null {
  try {
    const addressPath = path.resolve(__dirname, "../../../contracts/deployed-addresses.json");
    if (fs.existsSync(addressPath)) {
      const content = fs.readFileSync(addressPath, "utf-8");
      const data = JSON.parse(content);
      
      if (data.xlayerMainnet) {
        return data.xlayerMainnet as DeployedAddresses;
      }
      return data as DeployedAddresses;
    }
  } catch (err: any) {
    console.error("Failed to read deployed addresses:", err.message);
  }
  return null;
}
