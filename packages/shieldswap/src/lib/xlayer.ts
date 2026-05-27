// ─── XLayer Chain Configuration ──────────────────────────────────────────────

export const XLAYER_CHAIN = {
  chainId: 196,
  chainIdHex: "0xc4",
  chainName: "XLayer Mainnet",
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
  logoColor: string;   // For UI accent fallback
  logoUrl?: string;    // Real token logo
  isStable?: boolean;
  isNative?: boolean;
  isCustom?: boolean;  // Added via contract address paste
}

/** Native OKB (use zero address convention for native gas token) */
const NATIVE_OKB: TokenInfo = {
  address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  symbol: "OKB",
  name: "OKB",
  decimals: 18,
  logoColor: "#4B7BF5",
  logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/3897.png",
  isNative: true,
};

/** All known XLayer tokens */
export const TOKEN_LIST: TokenInfo[] = [
  NATIVE_OKB,
  {
    address: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
    symbol: "WOKB",
    name: "Wrapped OKB",
    decimals: 18,
    logoColor: "#4B7BF5",
    logoUrl: "https://s2.coinmarketcap.com/static/img/coins/64x64/3897.png",
  },
  {
    address: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
    symbol: "USDT",
    name: "USDT0",
    decimals: 6,
    logoColor: "#26A17B",
    logoUrl: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    isStable: true,
  },
  {
    address: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    logoColor: "#2775CA",
    logoUrl: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    isStable: true,
  },
  {
    address: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab",
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    logoColor: "#627EEA",
    logoUrl: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
  },
  {
    address: "0x2c03058e5f4e533f2263e748d1f43a3fe66b3e79",
    symbol: "DAI",
    name: "Dai Stablecoin",
    decimals: 18,
    logoColor: "#F5AC37",
    logoUrl: "https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png",
    isStable: true,
  },
];

/** Legacy flat address map */
export const XLAYER_TOKENS = {
  OKB: NATIVE_OKB.address,
  WOKB: "0xe538905cf8410324e03a5a23c1c177a474d59b2b",
  USDT: "0x779ded0c9e1022225f8e0630b35a9b54be713736",
  USDC: "0x74b7f16337b8972027f6196a17a631ac6de26d22",
  ETH: "0x5a77f1443d16ee5761d310e38b4beb27e6e2f5ab",
  DAI: "0x2c03058e5f4e533f2263e748d1f43a3fe66b3e79",
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

/** Resolve a custom contract address to TokenInfo by querying onchain metadata */
export async function resolveCustomToken(address: string, provider: any): Promise<TokenInfo | null> {
  // Check if already in list
  const existing = findToken(address);
  if (existing) return existing;

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return null;

  try {
    const { ethers } = await import("ethers");
    const contract = new ethers.Contract(
      address,
      [
        "function symbol() view returns (string)",
        "function name() view returns (string)",
        "function decimals() view returns (uint8)",
      ],
      provider
    );

    const [symbol, name, decimals] = await Promise.all([
      contract.symbol().catch(() => "???"),
      contract.name().catch(() => "Unknown Token"),
      contract.decimals().catch(() => 18),
    ]);

    const normalizedAddress = address.toLowerCase();

    return {
      address: normalizedAddress,
      symbol,
      name,
      decimals: Number(decimals),
      logoColor: "#" + normalizedAddress.slice(2, 8),
      isCustom: true,
    };
  } catch {
    return null;
  }
}

export const XLAYER_TESTNET = {
  chainId: 1952,
  chainIdHex: "0x7a0",
  chainName: "XLayer Testnet",
  rpcUrls: ["https://testrpc.xlayer.tech"],
  blockExplorerUrls: ["https://www.okx.com/explorer/xlayer-test"],
  nativeCurrency: {
    name: "OKB",
    symbol: "OKB",
    decimals: 18,
  },
} as const;

/** Default RPC URL */
export const RPC_URL = XLAYER_CHAIN.rpcUrls[0];

/** Explorer link helper */
export function getExplorerUrl(type: "address" | "tx", value: string, chainId = 196): string {
  const base = chainId === 1952 ? XLAYER_TESTNET.blockExplorerUrls[0] : XLAYER_CHAIN.blockExplorerUrls[0];
  return `${base}/${type}/${value}`;
}

/** Add chain to MetaMask / wallet */
export async function addChainToWallet(chainId: number): Promise<boolean> {
  if (!window.ethereum) return false;

  const info = chainId === 1952 ? XLAYER_TESTNET : XLAYER_CHAIN;

  try {
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: info.chainIdHex,
          chainName: info.chainName,
          rpcUrls: info.rpcUrls,
          blockExplorerUrls: info.blockExplorerUrls,
          nativeCurrency: info.nativeCurrency,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

/** Switch wallet to a specific chain */
export async function switchToChain(chainId: number): Promise<boolean> {
  if (!window.ethereum) return false;

  const hex = chainId === 1952 ? XLAYER_TESTNET.chainIdHex : XLAYER_CHAIN.chainIdHex;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: hex }],
    });
    return true;
  } catch (error: any) {
    // Chain not added yet - try adding
    if (error.code === 4902) {
      return addChainToWallet(chainId);
    }
    return false;
  }
}

/** Switch wallet to XLayer Mainnet (backward compatibility) */
export async function switchToXLayer(): Promise<boolean> {
  return switchToChain(196);
}

