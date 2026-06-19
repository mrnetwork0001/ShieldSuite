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
import INITIAL_PLAYERS from "../data/worldcup_rosters.json";

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
  const [currentPage, setCurrentPage] = useState(1);
  const PLAYERS_PER_PAGE = 10;

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCountry, searchQuery]);

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

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / PLAYERS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * PLAYERS_PER_PAGE;
  const paginatedPlayers = filteredPlayers.slice(startIdx, startIdx + PLAYERS_PER_PAGE);

  // Generate page numbers to show (max 5 visible page buttons)
  const getVisiblePages = () => {
    const pages: number[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const start = Math.max(1, safeCurrentPage - 2);
      const end = Math.min(totalPages, start + 4);
      for (let i = start; i <= end; i++) pages.push(i);
    }
    return pages;
  };

  // Dynamically compute countries represented in the roster
  const countries = ["All", ...Array.from(new Set(INITIAL_PLAYERS.map(p => p.country)))];

  // ISO Alpha-2 Country Codes for Qualified 2026 World Cup Countries
  const countryIsoMap: Record<string, string> = {
    "Argentina": "ar", "France": "fr", "England": "gb-eng", "Brazil": "br",
    "Spain": "es", "Germany": "de", "United States": "us", "Mexico": "mx",
    "Portugal": "pt", "Netherlands": "nl", "Belgium": "be", "Uruguay": "uy",
    "Japan": "jp", "Morocco": "ma", "Canada": "ca"
  };

  const getFlagUrl = (country: string) => {
    const code = countryIsoMap[country];
    if (!code) return "";
    // Using standard flagcdn CDN for lightweight flag images
    return `https://flagcdn.com/w40/${code}.png`;
  };

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
            {countries.map(c => {
              const flagCode = countryIsoMap[c];
              return (
                <option key={c} value={c} style={{ background: '#0d131f' }}>
                  {c === "All" ? "🌍 All Countries" : `${flagCode ? "" : "🏳️"} ${c}`}
                </option>
              );
            })}
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

        {/* ── Player Count Info ─────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '12px', fontSize: '0.78rem', color: 'var(--text-tertiary)'
        }}>
          <span>
            Showing {paginatedPlayers.length} of {filteredPlayers.length} players
            {selectedCountry !== "All" && ` in ${selectedCountry}`}
          </span>
          <span>Page {safeCurrentPage} of {totalPages}</span>
        </div>

        <div className={`player-list ${marketExpanded ? "expanded" : "collapsed"}`}>
          {paginatedPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
              No players found matching your criteria.
            </div>
          ) : (
            paginatedPlayers.map((p) => {
              const hasBalance = parseFloat(p.balance) > 0;
              const flagUrl = getFlagUrl(p.country);
              return (
                <div key={p.id} className="player-card glass-card">
                  <div className="player-info-main">
                    <div className="player-meta-top" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="player-flag" style={{ display: 'flex', alignItems: 'center' }}>
                        {flagUrl ? (
                          <img 
                            src={flagUrl} 
                            alt={`${p.country} flag`} 
                            style={{ width: '18px', height: '12px', borderRadius: '2px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} 
                          />
                        ) : "🏳️"}
                      </span>
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

        {/* ── Pagination Controls ───────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="pagination-controls" style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
            marginTop: '20px', flexWrap: 'wrap'
          }}>
            {/* Previous */}
            <button
              className="btn btn-pagination"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              style={{
                background: safeCurrentPage === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-default)',
                color: safeCurrentPage === 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: safeCurrentPage === 1 ? 0.5 : 1
              }}
            >
              ← Prev
            </button>

            {/* Page numbers */}
            {getVisiblePages().map(pageNum => (
              <button
                key={pageNum}
                className="btn btn-pagination"
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  background: pageNum === safeCurrentPage
                    ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))'
                    : 'rgba(255,255,255,0.06)',
                  border: pageNum === safeCurrentPage
                    ? '1px solid var(--accent-primary)'
                    : '1px solid var(--border-default)',
                  color: pageNum === safeCurrentPage ? '#fff' : 'var(--text-secondary)',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: pageNum === safeCurrentPage ? 700 : 500,
                  cursor: 'pointer',
                  minWidth: '40px',
                  transition: 'all 0.2s ease',
                  boxShadow: pageNum === safeCurrentPage ? '0 0 12px rgba(0,200,255,0.25)' : 'none'
                }}
              >
                {pageNum}
              </button>
            ))}

            {/* Next */}
            <button
              className="btn btn-pagination"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              style={{
                background: safeCurrentPage === totalPages ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-default)',
                color: safeCurrentPage === totalPages ? 'var(--text-tertiary)' : 'var(--text-primary)',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: safeCurrentPage === totalPages ? 0.5 : 1
              }}
            >
              Next →
            </button>
          </div>
        )}

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
