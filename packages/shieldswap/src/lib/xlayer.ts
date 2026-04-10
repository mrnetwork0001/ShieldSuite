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

// ─── Token Registry ──────────────────────────────────────────────────────────

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoColor: string;   // For UI accent
  isStable?: boolean;
  isNative?: boolean;
}

/** Native OKB (use zero address convention for native gas token) */
const NATIVE_OKB: TokenInfo = {
  address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  symbol: "OKB",
  name: "OKB",
  decimals: 18,
  logoColor: "#4B7BF5",
  isNative: true,
};

/** All known X Layer tokens */
export const TOKEN_LIST: TokenInfo[] = [
  NATIVE_OKB,
  {
    address: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    symbol: "WOKB",
    name: "Wrapped OKB",
    decimals: 18,
    logoColor: "#4B7BF5",
  },
  {
    address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    logoColor: "#26A17B",
    isStable: true,
  },
  {
    address: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoColor: "#2775CA",
    isStable: true,
  },
  {
    address: "0x5A77f1443D16ee5761d310e38b4BEB27E6E2f5Ab",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    logoColor: "#627EEA",
  },
  {
    address: "0x2c03058e5f4e533F2263e748d1f43A3fE66B3e79",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    logoColor: "#F5AC37",
    isStable: true,
  },
];

/** Legacy flat address map */
export const XLAYER_TOKENS = {
  OKB: NATIVE_OKB.address,
  WOKB: "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
  USDT: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
  USDC: "0x74b7F16337b8972027F6196A17a631aC6dE26d22",
  ETH: "0x5A77f1443D16ee5761d310e38b4BEB27E6E2f5Ab",
  DAI: "0x2c03058e5f4e533F2263e748d1f43A3fE66B3e79",
} as const;

/** Find token by address */
export function findToken(address: string): TokenInfo | undefined {
  return TOKEN_LIST.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

/** Get token symbol by address */
export function tokenSymbol(address: string): string {
  return findToken(address)?.symbol || address.slice(0, 6) + "...";
}

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
