// ─── X Layer Chain Configuration ──────────────────────────────────────────────

export const XLAYER_CHAIN = {
  chainId: 196,
  chainIdHex: "0xc4",
  chainName: "X Layer Mainnet",
  rpcUrls: ["https://rpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
} as const;

/** Common token addresses on X Layer */
export const XLAYER_TOKENS = {
  WOKB: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",  // Wrapped OKB
  USDT: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",  // Tether USD
  USDC: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",  // USD Coin
  ETH:  "0x5A77f1443D16ee5761d310e38b7308aaef1eAFc6",  // Wrapped ETH
} as const;

/** Default RPC URL */
export const RPC_URL = XLAYER_CHAIN.rpcUrls[0];

/** Explorer link helper */
export function getExplorerUrl(type: "address" | "tx", value: string): string {
  return `${XLAYER_CHAIN.blockExplorerUrls[0]}/${type}/${value}`;
}

/** Add X Layer to MetaMask / wallet */
export async function addXLayerToWallet(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: XLAYER_CHAIN.chainIdHex,
          chainName: XLAYER_CHAIN.chainName,
          rpcUrls: XLAYER_CHAIN.rpcUrls,
          blockExplorerUrls: XLAYER_CHAIN.blockExplorerUrls,
          nativeCurrency: XLAYER_CHAIN.nativeCurrency,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Switch wallet to X Layer */
export async function switchToXLayer(): Promise<boolean> {
  if (!window.ethereum) return false;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: XLAYER_CHAIN.chainIdHex }],
    });
    return true;
  } catch (error: any) {
    // Chain not added yet — try adding
    if (error.code === 4902) {
      return addXLayerToWallet();
    }
    return false;
  }
}
