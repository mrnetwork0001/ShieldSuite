import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  const networkAddresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"))[network.name];
  const sharesAddress = networkAddresses.PlayerShares;

  const [signer] = await ethers.getSigners();
  const shares = await ethers.getContractAt("PlayerShares", sharesAddress, signer);

  const owner = await shares.owner();
  console.log(`Contract owner: ${owner}`);
  console.log(`Signer address: ${signer.address}`);
  console.log(`Is owner? ${owner.toLowerCase() === signer.address.toLowerCase()}`);
}

main().catch(console.error);
