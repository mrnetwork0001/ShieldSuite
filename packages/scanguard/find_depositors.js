const { ethers } = require("ethers");
const fs = require("fs");

const rpcUrl = "https://rpc.xlayer.tech";
const provider = new ethers.JsonRpcProvider(rpcUrl);

const vaultAddress = "0x758ec85fc3047afff7977ec6edab43d21e9538ac"; // Mainnet Vault
const vaultAbi = ["event Deposited(address indexed user, uint256 amount, uint256 shares)"];
const vault = new ethers.Contract(vaultAddress, vaultAbi, provider);

async function findDepositors() {
    console.log("Starting historical scan for all depositors...");
    const currentBlock = await provider.getBlockNumber();
    const startBlock = 3000000; // rough deployment block, or just go back 50,000 blocks
    let users = new Set([
        "0xcd0a2370f2dc12c1802707b7d9ab3fec891e3c02".toLowerCase(),
        "0xddf8b18404fabae7bf6e30c2c74c9c1fe77d9cda".toLowerCase()
    ]);

    const BATCH_SIZE = 99;
    let end = currentBlock;
    let start = end - BATCH_SIZE;

    console.log(`Scanning backwards from block ${currentBlock}...`);

    let foundNew = false;
    // Scan backwards for up to 100,000 blocks
    for (let i = 0; i < 2000; i++) {
        if (end <= 0) break;
        try {
            const logs = await vault.queryFilter(vault.filters.Deposited(), start, end);
            for (const log of logs) {
                const user = log.args[0].toLowerCase();
                if (!users.has(user)) {
                    console.log(`FOUND MISSING USER: ${user} at block ${log.blockNumber}`);
                    users.add(user);
                    foundNew = true;
                }
            }
        } catch (e) {
            console.log(`RPC Error at ${start}-${end}: ${e.message}`);
        }
        end = start - 1;
        start = end - BATCH_SIZE;
        
        if (i % 50 === 0) {
            console.log(`Scanned back to block ${end}...`);
        }
    }

    if (foundNew) {
        fs.writeFileSync(
            "data/worldcup_users.json",
            JSON.stringify(Array.from(users), null, 2)
        );
        console.log("Updated worldcup_users.json with newly found users!");
    } else {
        console.log("No missing users found within the scanned block range.");
    }
}

findDepositors();
