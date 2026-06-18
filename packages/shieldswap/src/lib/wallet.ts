import { ethers } from "ethers";
import { XLAYER_CHAIN, switchToChain } from "./xlayer";

export interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isXLayer: boolean;
  provider: ethers.BrowserProvider | ethers.JsonRpcProvider | null;
  signer: ethers.Signer | null;
}

const INITIAL_STATE: WalletState = {
  connected: false,
  address: null,
  chainId: null,
  balance: null,
  isXLayer: false,
  provider: null,
  signer: null,
};

/** Connect to MetaMask or injected wallet */
export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error("No wallet detected. Please install MetaMask or OKX Wallet.");
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
      throw new Error("No accounts found. Please unlock your wallet.");
    }

    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const balance = ethers.formatEther(await provider.getBalance(address));
    
    // Check if the current chain is supported (Mainnet only)
    const isSupported = chainId === XLAYER_CHAIN.chainId;

    if (!isSupported) {
      // By default, switch to XLayer Mainnet (196)
      await switchToChain(XLAYER_CHAIN.chainId);
      // Re-check after switch
      const updatedNetwork = await provider.getNetwork();
      const updatedChainId = Number(updatedNetwork.chainId);
      return {
        connected: true,
        address,
        chainId: updatedChainId,
        balance,
        isXLayer: updatedChainId === XLAYER_CHAIN.chainId,
        provider,
        signer,
      };
    }

    return {
      connected: true,
      address,
      chainId,
      balance,
      isXLayer: chainId === XLAYER_CHAIN.chainId,
      provider,
      signer,
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Connection rejected. Please approve the wallet connection.");
    }
    throw error;
  }
}

/** Disconnect wallet (reset state) */
export function disconnectWallet(): WalletState {
  return { ...INITIAL_STATE };
}

/** Shorten an address for display */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Format balance with proper decimals */
export function formatBalance(balance: string, decimals = 4): string {
  const num = parseFloat(balance);
  if (num === 0) return "0";
  if (num < 0.0001) return "<0.0001";
  return num.toFixed(decimals);
}

// Extend Window for ethereum provider
declare global {
  interface Window {
    ethereum?: any;
  }
}

