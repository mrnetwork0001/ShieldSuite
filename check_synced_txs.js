const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function check() {
  const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
  
  const syncedFile = path.join(__dirname, "packages/scanguard/data/worldcup_synced_txs.json");
  if (!fs.existsSync(syncedFile)) {
    console.log("No synced txs file found");
    return;
  }
  
  const txs = JSON.parse(fs.readFileSync(syncedFile, "utf-8"));
  console.log(`Checking ${txs.length} synced transactions...`);
  
  const transferTopic = ethers.id("Transfer(address,address,uint256)");
  const wokbAddress = "0xe538905cf8410324e03a5a23c1c177a474d59b2b";
  const OKB_PRICE_USD = 50.0;
  
  for (const hash of txs) {
    console.log(`\n-----------------------------------------`);
    console.log(`TX HASH: ${hash}`);
    const [tx, receipt] = await Promise.all([
      provider.getTransaction(hash),
      provider.getTransactionReceipt(hash)
    ]);
    
    if (!tx || !receipt) {
      console.log("Tx or receipt not found");
      continue;
    }
    
    console.log(`  tx.value: ${ethers.formatEther(tx.value)} OKB (USD: ${Number(ethers.formatEther(tx.value)) * OKB_PRICE_USD})`);
    
    let maxWokb = 0n;
    for (const l of receipt.logs) {
      if (l.address.toLowerCase() === wokbAddress && l.topics[0] === transferTopic) {
        const val = l.data === "0x" ? 0n : BigInt(l.data);
        if (val > maxWokb) maxWokb = val;
      }
    }
    console.log(`  max WOKB log: ${ethers.formatEther(maxWokb)} WOKB (USD: ${Number(ethers.formatEther(maxWokb)) * OKB_PRICE_USD})`);
  }
}

check().catch(console.error);
