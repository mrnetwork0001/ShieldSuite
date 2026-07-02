import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import { contractCallViaCli } from "../agent-wallet.js";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const rewardsRouter = Router();

const AIRDROP_FILE = path.join(__dirname, "../../data/airdrop.json");
const USDT_ADDRESS = "0x779ded0c9e1022225f8e0630b35a9b54be713736"; // X Layer Mainnet Real USDT
const PSAI_ADDRESS = "0xaef068ea820aafa00a2854bfd6cfab6d891ede5d"; // X Layer Mainnet PSAI
const USDT_DECIMALS = 6;
const PSAI_DECIMALS = 18;

function readAirdropData() {
  try {
    if (fs.existsSync(AIRDROP_FILE)) {
      const data = fs.readFileSync(AIRDROP_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    logger.error("Failed to read airdrop.json: " + e);
  }
  return {};
}

function writeAirdropData(data: any) {
  try {
    fs.writeFileSync(AIRDROP_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    logger.error("Failed to write airdrop.json: " + e);
  }
}

rewardsRouter.get("/eligibility", (req, res) => {
  const address = req.query.address as string;
  if (!address) {
    res.status(400).json({ success: false, error: { message: "Address is required" } });
    return;
  }

  const data = readAirdropData();
  const entryKey = Object.keys(data).find(k => k.toLowerCase() === address.toLowerCase());
  
  if (entryKey && data[entryKey]) {
    res.json({
      success: true,
      data: {
        eligible: true,
        rank: data[entryKey].rank,
        usdt: data[entryKey].usdt,
        psai: data[entryKey].psai,
        claimed: data[entryKey].claimed
      }
    });
  } else {
    res.json({
      success: true,
      data: { eligible: false, usdt: 0, psai: 0, claimed: false }
    });
  }
});

rewardsRouter.post("/claim", async (req, res) => {
  const { address } = req.body;
  if (!address) {
    res.status(400).json({ success: false, error: { message: "Address is required" } });
    return;
  }

  const data = readAirdropData();
  const entryKey = Object.keys(data).find(k => k.toLowerCase() === address.toLowerCase());

  if (!entryKey || !data[entryKey]) {
    res.status(400).json({ success: false, error: { message: "Not eligible" } });
    return;
  }

  if (data[entryKey].claimed) {
    res.status(400).json({ success: false, error: { message: "Already claimed" } });
    return;
  }

  const usdtAmount = data[entryKey].usdt;
  const psaiAmount = data[entryKey].psai;

  try {
    logger.info(`Processing dual-token claim of ${usdtAmount} USDT and ${psaiAmount} PSAI for ${address}`);
    
    const iface = new ethers.Interface(["function transfer(address to, uint256 amount) returns (bool)"]);
    
    // 1. Transfer USDT
    const parsedUsdt = ethers.parseUnits(usdtAmount.toString(), USDT_DECIMALS);
    const usdtData = iface.encodeFunctionData("transfer", [address, parsedUsdt]);
    const usdtResult = await contractCallViaCli({
      to: USDT_ADDRESS,
      inputData: usdtData,
      chain: "196"
    });

    if (!usdtResult?.txHash) {
      throw new Error("Failed to execute USDT transfer");
    }
    logger.info(`USDT Claim successful. TxHash: ${usdtResult.txHash}`);

    // 2. Transfer PSAI
    const parsedPsai = ethers.parseUnits(psaiAmount.toString(), PSAI_DECIMALS);
    const psaiData = iface.encodeFunctionData("transfer", [address, parsedPsai]);
    const psaiResult = await contractCallViaCli({
      to: PSAI_ADDRESS,
      inputData: psaiData,
      chain: "196"
    });

    if (!psaiResult?.txHash) {
      throw new Error("Failed to execute PSAI transfer");
    }
    logger.info(`PSAI Claim successful. TxHash: ${psaiResult.txHash}`);

    // Both succeeded
    data[entryKey].claimed = true;
    data[entryKey].usdtTxHash = usdtResult.txHash;
    data[entryKey].psaiTxHash = psaiResult.txHash;
    writeAirdropData(data);
    
    res.json({ success: true, data: { usdtTxHash: usdtResult.txHash, psaiTxHash: psaiResult.txHash } });

  } catch (err: any) {
    logger.error(`Claim error for ${address}: ${err.message}`);
    res.status(500).json({ success: false, error: { message: err.message || "Claim processing error" } });
  }
});
