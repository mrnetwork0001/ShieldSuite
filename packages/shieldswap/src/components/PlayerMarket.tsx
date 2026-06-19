import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";

const SHARES_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function players(uint256 id) external view returns (string name, string country, uint256 rating, uint256 goals, uint256 assists)"
];

const DEX_ABI = [
  "function getSharePrice(uint256 tokenId) public view returns (uint256)",
  "function buyShares(uint256 tokenId, uint256 amount) external",
  "function sellShares(uint256 tokenId, uint256 amount) external"
];

import STATIC_DEPLOYED_ADDRESSES from "../deployed-addresses.json";

import { SearchIcon, CheckIcon, ShoeIcon } from "./Icons";

const INITIAL_PLAYERS = [
  // 🇦🇷 Argentina
  { id: 1, name: "Lionel Messi", country: "Argentina", rating: 90, goals: 2, assists: 1, price: "90", balance: "0" },
  { id: 2, name: "Lautaro Martinez", country: "Argentina", rating: 87, goals: 1, assists: 0, price: "87", balance: "0" },
  { id: 3, name: "Alexis Mac Allister", country: "Argentina", rating: 85, goals: 0, assists: 1, price: "85", balance: "0" },
  { id: 4, name: "Enzo Fernandez", country: "Argentina", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 5, name: "Rodrigo De Paul", country: "Argentina", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 6, name: "Emiliano Martinez", country: "Argentina", rating: 87, goals: 0, assists: 0, price: "87", balance: "0" },
  { id: 7, name: "Julian Alvarez", country: "Argentina", rating: 84, goals: 1, assists: 0, price: "84", balance: "0" },
  { id: 8, name: "Angel Di Maria", country: "Argentina", rating: 83, goals: 0, assists: 1, price: "83", balance: "0" },
  { id: 9, name: "Cristian Romero", country: "Argentina", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 10, name: "Nicolas Otamendi", country: "Argentina", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 11, name: "Lisandro Martinez", country: "Argentina", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 12, name: "Nahuel Molina", country: "Argentina", rating: 80, goals: 0, assists: 0, price: "80", balance: "0" },
  { id: 13, name: "Nicolas Tagliafico", country: "Argentina", rating: 80, goals: 0, assists: 0, price: "80", balance: "0" },
  { id: 14, name: "Leandro Paredes", country: "Argentina", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 15, name: "Giovani Lo Celso", country: "Argentina", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },

  // 🇫🇷 France
  { id: 16, name: "Kylian Mbappe", country: "France", rating: 91, goals: 1, assists: 0, price: "91", balance: "0" },
  { id: 17, name: "Antoine Griezmann", country: "France", rating: 88, goals: 0, assists: 1, price: "88", balance: "0" },
  { id: 18, name: "Aurelien Tchouameni", country: "France", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 19, name: "Eduardo Camavinga", country: "France", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 20, name: "Ousmane Dembele", country: "France", rating: 84, goals: 0, assists: 1, price: "84", balance: "0" },
  { id: 21, name: "Olivier Giroud", country: "France", rating: 82, goals: 1, assists: 0, price: "82", balance: "0" },
  { id: 22, name: "Kingsley Coman", country: "France", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 23, name: "Marcus Thuram", country: "France", rating: 82, goals: 0, assists: 0, price: "82", balance: "0" },
  { id: 24, name: "Adrien Rabiot", country: "France", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 25, name: "Theo Hernandez", country: "France", rating: 85, goals: 0, assists: 1, price: "85", balance: "0" },
  { id: 26, name: "William Saliba", country: "France", rating: 86, goals: 0, assists: 0, price: "86", balance: "0" },
  { id: 27, name: "Dayot Upamecano", country: "France", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 28, name: "Jules Kounde", country: "France", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 29, name: "Ibrahima Konate", country: "France", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 30, name: "Mike Maignan", country: "France", rating: 87, goals: 0, assists: 0, price: "87", balance: "0" },

  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
  { id: 31, name: "Harry Kane", country: "England", rating: 90, goals: 2, assists: 0, price: "90", balance: "0" },
  { id: 32, name: "Jude Bellingham", country: "England", rating: 89, goals: 1, assists: 1, price: "89", balance: "0" },
  { id: 33, name: "Bukayo Saka", country: "England", rating: 87, goals: 1, assists: 0, price: "87", balance: "0" },
  { id: 34, name: "Phil Foden", country: "England", rating: 88, goals: 0, assists: 1, price: "88", balance: "0" },
  { id: 35, name: "Declan Rice", country: "England", rating: 86, goals: 0, assists: 0, price: "86", balance: "0" },
  { id: 36, name: "Cole Palmer", country: "England", rating: 85, goals: 1, assists: 0, price: "85", balance: "0" },
  { id: 37, name: "Ollie Watkins", country: "England", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 38, name: "Anthony Gordon", country: "England", rating: 82, goals: 0, assists: 0, price: "82", balance: "0" },
  { id: 39, name: "Kobbie Mainoo", country: "England", rating: 79, goals: 0, assists: 0, price: "79", balance: "0" },
  { id: 40, name: "John Stones", country: "England", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 41, name: "Kyle Walker", country: "England", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 42, name: "Kieran Trippier", country: "England", rating: 82, goals: 0, assists: 1, price: "82", balance: "0" },
  { id: 43, name: "Marc Guehi", country: "England", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 44, name: "Jordan Pickford", country: "England", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 45, name: "Trent Alexander-Arnold", country: "England", rating: 85, goals: 0, assists: 1, price: "85", balance: "0" },

  // 🇧🇷 Brazil
  { id: 46, name: "Vinicius Junior", country: "Brazil", rating: 89, goals: 0, assists: 0, price: "89", balance: "0" },
  { id: 47, name: "Rodrygo", country: "Brazil", rating: 86, goals: 1, assists: 0, price: "86", balance: "0" },
  { id: 48, name: "Bruno Guimaraes", country: "Brazil", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 49, name: "Lucas Paqueta", country: "Brazil", rating: 83, goals: 0, assists: 1, price: "83", balance: "0" },
  { id: 50, name: "Raphinha", country: "Brazil", rating: 83, goals: 1, assists: 0, price: "83", balance: "0" },
  { id: 51, name: "Endrick", country: "Brazil", rating: 79, goals: 0, assists: 0, price: "79", balance: "0" },
  { id: 52, name: "Gabriel Martinelli", country: "Brazil", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 53, name: "Douglas Luiz", country: "Brazil", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 54, name: "Casemiro", country: "Brazil", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 55, name: "Marquinhos", country: "Brazil", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 56, name: "Gabriel Magalhaes", country: "Brazil", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 57, name: "Danilo", country: "Brazil", rating: 80, goals: 0, assists: 0, price: "80", balance: "0" },
  { id: 58, name: "Eder Militao", country: "Brazil", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 59, name: "Alisson", country: "Brazil", rating: 87, goals: 0, assists: 0, price: "87", balance: "0" },
  { id: 60, name: "Ederson", country: "Brazil", rating: 86, goals: 0, assists: 0, price: "86", balance: "0" },

  // 🇪🇸 Spain
  { id: 61, name: "Rodri", country: "Spain", rating: 90, goals: 1, assists: 1, price: "90", balance: "0" },
  { id: 62, name: "Pedri", country: "Spain", rating: 86, goals: 0, assists: 1, price: "86", balance: "0" },
  { id: 63, name: "Lamine Yamal", country: "Spain", rating: 84, goals: 1, assists: 2, price: "84", balance: "0" },
  { id: 64, name: "Nico Williams", country: "Spain", rating: 83, goals: 1, assists: 1, price: "83", balance: "0" },
  { id: 65, name: "Dani Olmo", country: "Spain", rating: 84, goals: 0, assists: 1, price: "84", balance: "0" },
  { id: 66, name: "Alvaro Morata", country: "Spain", rating: 82, goals: 1, assists: 0, price: "82", balance: "0" },
  { id: 67, name: "Gavi", country: "Spain", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 68, name: "Martin Zubimendi", country: "Spain", rating: 82, goals: 0, assists: 0, price: "82", balance: "0" },
  { id: 69, name: "Fabian Ruiz", country: "Spain", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 70, name: "Mikel Merino", country: "Spain", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 71, name: "Robin Le Normand", country: "Spain", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 72, name: "Aymeric Laporte", country: "Spain", rating: 83, goals: 0, assists: 0, price: "83", balance: "0" },
  { id: 73, name: "Dani Carvajal", country: "Spain", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 74, name: "Alex Grimaldo", country: "Spain", rating: 84, goals: 0, assists: 1, price: "84", balance: "0" },
  { id: 75, name: "Unai Simon", country: "Spain", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },

  // 🇩🇪 Germany
  { id: 76, name: "Jamal Musiala", country: "Germany", rating: 87, goals: 1, assists: 1, price: "87", balance: "0" },
  { id: 77, name: "Florian Wirtz", country: "Germany", rating: 86, goals: 1, assists: 0, price: "86", balance: "0" },
  { id: 78, name: "Kai Havertz", country: "Germany", rating: 83, goals: 1, assists: 1, price: "83", balance: "0" },
  { id: 79, name: "Leroy Sane", country: "Germany", rating: 84, goals: 0, assists: 0, price: "84", balance: "0" },
  { id: 80, name: "Joshua Kimmich", country: "Germany", rating: 85, goals: 0, assists: 1, price: "85", balance: "0" },
  { id: 81, name: "Ilkay Gundogan", country: "Germany", rating: 85, goals: 0, assists: 0, price: "85", balance: "0" },
  { id: 82, name: "Niclas Fullkrug", country: "Germany", rating: 81, goals: 2, assists: 0, price: "81", balance: "0" },
  { id: 83, name: "Thomas Muller", country: "Germany", rating: 82, goals: 0, assists: 0, price: "82", balance: "0" },
  { id: 84, name: "Toni Kroos", country: "Germany", rating: 85, goals: 0, assists: 1, price: "85", balance: "0" },
  { id: 85, name: "Robert Andrich", country: "Germany", rating: 80, goals: 0, assists: 0, price: "80", balance: "0" },
  { id: 86, name: "Antonio Rudiger", country: "Germany", rating: 86, goals: 0, assists: 0, price: "86", balance: "0" },
  { id: 87, name: "Jonathan Tah", country: "Germany", rating: 82, goals: 0, assists: 0, price: "82", balance: "0" },
  { id: 88, name: "David Raum", country: "Germany", rating: 80, goals: 0, assists: 0, price: "80", balance: "0" },
  { id: 89, name: "Nico Schlotterbeck", country: "Germany", rating: 81, goals: 0, assists: 0, price: "81", balance: "0" },
  { id: 90, name: "Manuel Neuer", country: "Germany", rating: 86, goals: 0, assists: 0, price: "86", balance: "0" }
];

interface PlayerMarketProps {
  wallet: WalletState;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

export const PlayerMarket: React.FC<PlayerMarketProps> = ({ wallet, onActivityLog }) => {
  const DEPLOYED_ADDRESSES = (STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || STATIC_DEPLOYED_ADDRESSES;

  const isMainnet = true;
  const explorerBase = isMainnet
    ? "https://www.okx.com/explorer/xlayer/tx/"
    : "https://www.okx.com/explorer/xlayer-test/tx/";

  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [marketExpanded, setMarketExpanded] = useState(false);

  // ─── Success Modal State ──────────────────────────────────────────────────────
  const [txModal, setTxModal] = useState<{
    visible: boolean;
    type: "Buy" | "Sell";
    playerName: string;
    txHash: string;
    amount?: string;
  }>({ visible: false, type: "Buy", playerName: "", txHash: "" });

  const addLog = (message: string, type: "info" | "warning" = "info") => {
    onActivityLog({
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      type,
      message
    });
  };

  // Fetch player details and user balances
  useEffect(() => {
    const fetchPlayerData = async () => {
      try {
        const provider = wallet.provider || new ethers.JsonRpcProvider("https://rpc.xlayer.tech");
        const shares = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerShares, SHARES_ABI, provider);
        const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, provider);

        const updated = await Promise.all(
          INITIAL_PLAYERS.map(async (p) => {
            try {
              // Try to fetch live details, fallback to static defaults on RPC error
              const data = await shares.players(p.id).catch(() => null);
              const priceWei = await dex.getSharePrice(p.id).catch(() => null);

              let bal = "0";
              if (wallet.connected && wallet.address) {
                const balWei = await shares.balanceOf(wallet.address, p.id).catch(() => null);
                if (balWei !== null) {
                  bal = ethers.formatEther(balWei);
                }
              }

              return {
                id: p.id,
                name: (data && data.name) || p.name,
                country: (data && data.country) || p.country,
                rating: (data && Number(data.rating)) || p.rating,
                goals: (data && Number(data.goals)) || p.goals,
                assists: (data && Number(data.assists)) || p.assists,
                price: priceWei ? ethers.formatEther(priceWei) : p.price,
                balance: bal
              };
            } catch (err) {
              return p;
            }
          })
        );

        setPlayers(updated);
      } catch (err: any) {
        console.error("PlayerMarket fetch error:", err.message);
      }
    };

    fetchPlayerData();
    const interval = setInterval(fetchPlayerData, 5000);
    return () => clearInterval(interval);
  }, [wallet.connected, wallet.address, wallet.provider, refreshKey]);

  // Execute buy
  const handleBuy = async (tokenId: number, price: string, playerName: string) => {
    if (!wallet.signer) return;
    setLoading(true);
    addLog(`Buying 1.0 share of ${playerName} at ${price} Credits...`);
    try {
      const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, wallet.signer);
      const tx = await dex.buyShares(tokenId, ethers.parseEther("1"));
      await tx.wait();
      addLog(`✓ Bought 1 share of ${playerName}! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Buy", playerName, txHash: tx.hash, amount: "1" });
    } catch (err: any) {
      addLog(`Trade Buy Error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // Execute sell
  const handleSell = async (tokenId: number, balance: string, playerName: string) => {
    if (!wallet.signer) return;
    if (parseFloat(balance) <= 0) return;
    setLoading(true);
    addLog(`Selling ${parseFloat(balance).toFixed(1)} shares of ${playerName}...`);
    try {
      const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, wallet.signer);
      const tx = await dex.sellShares(tokenId, ethers.parseEther(balance));
      await tx.wait();
      addLog(`✓ Sold ${parseFloat(balance).toFixed(1)} shares of ${playerName}! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Sell", playerName, txHash: tx.hash, amount: parseFloat(balance).toFixed(1) });
    } catch (err: any) {
      addLog(`Trade Sell Error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // Portal modal - rendered directly into document.body so it is always
  // centered in the viewport regardless of scroll position.
  const modalContent = txModal.visible
    ? ReactDOM.createPortal(
        <div className="tx-modal-overlay" onClick={() => setTxModal(m => ({ ...m, visible: false }))}>
          <div className="tx-modal" onClick={e => e.stopPropagation()}>
            <div className="tx-modal-icon" style={{ color: 'var(--accent-safe)', display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="tx-modal-title">
              {txModal.type === "Buy" && `Bought ${txModal.amount} Share of ${txModal.playerName}!`}
              {txModal.type === "Sell" && `Sold ${txModal.amount} Shares of ${txModal.playerName}!`}
            </h3>
            <p className="tx-modal-sub">
              Transaction confirmed on {isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.
            </p>
            <a
              href={`${explorerBase}${txModal.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-modal-link"
            >
              <SearchIcon /> View Transaction on Explorer ↗
            </a>
            <button
              className="btn btn-primary tx-modal-close"
              onClick={() => setTxModal(m => ({ ...m, visible: false }))}
            >
              Done
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  // Filter logic
  const filteredPlayers = players.filter((p) => {
    const matchesCountry = selectedCountry === "All" || p.country.toLowerCase() === selectedCountry.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCountry && matchesSearch;
  });

  const countries = ["All", "Argentina", "France", "England", "Brazil", "Spain", "Germany"];

  return (
    <>
      {modalContent}
      <div className="player-market glass-card">
        <div className="panel-header">
          <span className="panel-icon">⚽</span>
          <h3 className="panel-title">World Cup Player Market</h3>
        </div>
        <p className="panel-desc">
          Trade Player Index Tokens. Token prices represent the live scouting valuation and increase with player stats and performances.
        </p>

        {/* ── Filter Controls ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '8px', margin: '0 0 16px', flexWrap: 'wrap' }}>
          {/* Country selector */}
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            style={{
              flex: '1 1 120px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {countries.map(c => (
              <option key={c} value={c} style={{ background: '#0d131f' }}>{c === "All" ? "🌍 All Countries" : c}</option>
            ))}
          </select>

          {/* Search bar */}
          <div style={{ flex: '2 1 200px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '10px 14px 10px 36px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                outline: 'none'
              }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
              <SearchIcon size={14} />
            </span>
          </div>
        </div>

        <div className={`player-list ${marketExpanded ? "expanded" : "collapsed"}`}>
          {filteredPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
              No players found matching your criteria.
            </div>
          ) : (
            filteredPlayers.map((p) => {
              const hasBalance = parseFloat(p.balance) > 0;
              const flag = p.country === "Argentina" ? "🇦🇷" : p.country === "France" ? "🇫🇷" : p.country === "England" ? "🏴󠁧󠁢󠁥󠁮󠁧󠁿" : p.country === "Brazil" ? "🇧🇷" : p.country === "Spain" ? "🇪🇸" : p.country === "Germany" ? "🇩🇪" : "🏳️";
              return (
                <div key={p.id} className="player-card glass-card">
                  <div className="player-info-main">
                    <div className="player-meta-top">
                      <span className="player-flag">{flag}</span>
                      <span className="player-country">{p.country}</span>
                      <span className="player-rating-badge">OVR {p.rating}</span>
                    </div>
                    <h4 className="player-name">{p.name}</h4>
                    <div className="player-stats">
                      <span>⚽ Goals: <strong>{p.goals}</strong></span>
                      <span><ShoeIcon /> Assists: <strong>{p.assists}</strong></span>
                    </div>
                  </div>

                  <div className="player-trade-area">
                    <div className="player-price-box">
                      <div className="price-label">SHARE PRICE</div>
                      <div className="price-value font-mono">{parseFloat(p.price).toFixed(0)} <span className="price-unit">CRD</span></div>
                    </div>

                    <div className="player-balance-box">
                      <div className="balance-label">OWNED</div>
                      <div className="balance-value font-mono">{parseFloat(p.balance).toFixed(1)}</div>
                    </div>

                    {wallet.connected && (
                      <div className="player-actions">
                        <button
                          className="btn btn-primary btn-buy"
                          onClick={() => handleBuy(p.id, p.price, p.name)}
                          disabled={loading}
                        >
                          Buy 1
                        </button>
                        <button
                          className="btn btn-sell"
                          onClick={() => handleSell(p.id, p.balance, p.name)}
                          disabled={loading || !hasBalance}
                        >
                          Sell All
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <button 
          className="btn btn-sm btn-ghost mobile-market-toggle"
          onClick={() => setMarketExpanded(!marketExpanded)}
          style={{ display: 'none', width: '100%', marginTop: '16px', padding: '12px' }}
        >
          {marketExpanded ? "View Less ▴" : "View More ▾"}
        </button>
      </div>
    </>
  );
};
