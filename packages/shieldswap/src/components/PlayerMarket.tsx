import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { ethers } from "ethers";
import { WalletState } from "../lib/wallet";
import { useLanguage } from "../context/LanguageContext";

const SHARES_ABI = [
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function players(uint256 id) external view returns (string name, string country, uint256 rating, uint256 goals, uint256 assists)",
  "function getPlayers(uint256[] ids) view returns (tuple(string nameString, string country, uint256 rating, uint256 goals, uint256 assists)[])",
  "function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])"
];

const DEX_ABI = [
  "function getSharePrice(uint256 tokenId) public view returns (uint256)",
  "function getSharePrices(uint256[] tokenIds) view returns (uint256[])",
  "function buyShares(uint256 tokenId, uint256 amount) external",
  "function sellShares(uint256 tokenId, uint256 amount) external"
];

import STATIC_DEPLOYED_ADDRESSES from "../deployed-addresses.json";

import { SearchIcon, CheckIcon, ShoeIcon } from "./Icons";
import ROSTER_PLAYERS from "../data/worldcup_rosters.json";
import { switchToChain } from "../lib/xlayer";

interface PlayerRosterItem {
  id: number;
  name: string;
  country: string;
  rating: number;
  goals: number;
  assists: number;
  price: string;
  balance: string;
  tokenId?: number;
  isTradeable?: boolean;
}

const getInitialPlayers = (): PlayerRosterItem[] => {
  const list: PlayerRosterItem[] = (ROSTER_PLAYERS as any[]).map(p => ({
    id: p.id,
    name: p.name,
    country: p.country,
    rating: p.rating,
    goals: 0,
    assists: 0,
    price: String(p.rating),
    balance: "0",
    isTradeable: false
  }));

  if (!list.some(p => p.name.toLowerCase() === "erling haaland")) {
    list.push({
      id: 9999,
      name: "Erling Haaland",
      country: "Norway",
      rating: 90,
      goals: 0,
      assists: 0,
      price: "90",
      balance: "0",
      tokenId: 9999,
      isTradeable: true
    });
  }
  return list;
};

const INITIAL_PLAYERS = getInitialPlayers();

interface PlayerMarketProps {
  wallet: WalletState;
  onActivityLog: (entry: { id: string; timestamp: number; type: "info" | "warning"; message: string }) => void;
}

export const PlayerMarket: React.FC<PlayerMarketProps> = ({ wallet, onActivityLog }) => {
  const { language, t } = useLanguage();
  const isMainnet = true;
  const DEPLOYED_ADDRESSES = (STATIC_DEPLOYED_ADDRESSES as any).xlayerMainnet || STATIC_DEPLOYED_ADDRESSES;

  const explorerBase = "https://www.okx.com/explorer/xlayer/tx/";

  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [selectedCountry, setSelectedCountry] = useState("All");
  const [tradeError, setTradeError] = useState<string | null>(null);
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

  const getTranslatedCountry = (country: string) => {
    if (language === "zh") {
      const map: Record<string, string> = {
        "All": "所有国家",
        "Argentina": "阿根廷",
        "France": "法国",
        "England": "英格兰",
        "Brazil": "巴西",
        "Spain": "西班牙",
        "Germany": "德国",
        "United States": "美国",
        "Mexico": "墨西哥",
        "Portugal": "葡萄牙",
        "Netherlands": "荷兰",
        "Belgium": "比利时",
        "Uruguay": "乌拉圭",
        "Japan": "日本",
        "Morocco": "摩洛哥",
        "Canada": "加拿大",
        "Norway": "挪威"
      };
      return map[country] || country;
    }
    return country;
  };

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
        const provider = new ethers.JsonRpcProvider("https://rpc.xlayer.tech", undefined, { batchMaxCount: 1 });
        const shares = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerShares, SHARES_ABI, provider);
        const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, provider);

        const onChainIds = INITIAL_PLAYERS.map(p => p.id);

        // Query player stats and prices sequentially to prevent RPC batching issues
        const playersStats = await shares.getPlayers(onChainIds).catch((e: any) => {
          console.error("PlayerMarket getPlayers error:", e.message);
          return [];
        });
        const pricesRaw = await dex.getSharePrices(onChainIds).catch((e: any) => {
          console.error("PlayerMarket getSharePrices error:", e.message);
          return [];
        });

        let balancesRaw: bigint[] = [];
        if (wallet.connected && wallet.address) {
          const accounts = onChainIds.map(() => wallet.address);
          balancesRaw = await shares.balanceOfBatch(accounts, onChainIds).catch((e: any) => {
            console.error("PlayerMarket balanceOfBatch error:", e.message);
            return [];
          });
        }

        const onChainMap: Record<string, { tokenId: number; rating: number; goals: number; assists: number; price: string; balance: string }> = {};

        onChainIds.forEach((id, i) => {
          const stats = playersStats[i];
          const nameString = stats ? (stats.nameString || stats[0] || "") : "";
          if (nameString.trim() !== "") {
            const nameKey = nameString.trim().toLowerCase();
            const priceWei = pricesRaw[i] || 0n;
            const balanceWei = balancesRaw[i] || 0n;

            onChainMap[nameKey] = {
              tokenId: id,
              rating: Number(stats.rating || stats[2] || 0),
              goals: Number(stats.goals || stats[3] || 0),
              assists: Number(stats.assists || stats[4] || 0),
              price: priceWei > 0n ? ethers.formatEther(priceWei) : String(Number(stats.rating || stats[2] || 90)),
              balance: ethers.formatEther(balanceWei)
            };
          }
        });

        const updated = INITIAL_PLAYERS.map((p) => {
          const onChain = onChainMap[p.name.trim().toLowerCase()];
          if (onChain) {
            return {
              id: p.id,
              tokenId: onChain.tokenId,
              name: p.name,
              country: p.country,
              rating: onChain.rating,
              goals: onChain.goals,
              assists: onChain.assists,
              price: onChain.price,
              balance: onChain.balance,
              isTradeable: true
            };
          } else {
            return {
              id: p.id,
              tokenId: undefined,
              name: p.name,
              country: p.country,
              rating: p.rating,
              goals: 0,
              assists: 0,
              price: String(p.rating),
              balance: "0",
              isTradeable: false
            };
          }
        });

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
    setTradeError(null);
    try {
      if (wallet.chainId !== 196) {
        addLog(language === "zh" ? "请将网络切换至 X Layer Mainnet" : "Please switch network to X Layer Mainnet", "warning");
        const switched = await switchToChain(196);
        if (!switched) {
          setLoading(false);
          return;
        }
      }
      addLog(language === "zh" ? `正在以 ${price} 积分买入 1.0 份 ${playerName} 的指数...` : `Buying 1.0 share of ${playerName} at ${price} Credits...`);
      
      // Check user credits first to prevent gas estimation failure (which blocks wallet pop-ups)
      const vault = new ethers.Contract(
        DEPLOYED_ADDRESSES.NoLossVault,
        ["function getCredits(address user) external view returns (uint256)"],
        wallet.signer
      );
      const userCredits = await vault.getCredits(wallet.address).catch(() => 0n);
      const requiredCost = ethers.parseEther(price);
      if (userCredits < requiredCost) {
        const errorMsg = language === "zh"
          ? `积分不足！您当前仅有 ${parseFloat(ethers.formatEther(userCredits)).toFixed(1)} 积分，而购买 1 份 ${playerName} 需要 ${parseFloat(price).toFixed(0)} 积分。建议您在“无损失特工金库”中质押 USDT 或等待时间累积更多积分。`
          : `Insufficient credits! You have ${parseFloat(ethers.formatEther(userCredits)).toFixed(1)} Credits, but purchasing 1 share of ${playerName} requires ${parseFloat(price).toFixed(0)} Credits. Please stake USDT in the No-Loss Vault or wait to accumulate more credits.`;
        
        setTradeError(errorMsg);
        addLog(`✕ ${errorMsg}`, "warning");
        setLoading(false);
        return;
      }

      const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, wallet.signer);
      const tx = await dex.buyShares(tokenId, ethers.parseEther("1"));
      await tx.wait();
      addLog(language === "zh" ? `✓ 成功买入 1 份 ${playerName} 指数！交易: ${tx.hash.slice(0, 14)}...` : `✓ Bought 1 share of ${playerName}! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Buy", playerName, txHash: tx.hash, amount: "1" });
    } catch (err: any) {
      const errMsg = err.message || "";
      if (errMsg.includes("Insufficient credits") || errMsg.includes("revert")) {
        const customErr = language === "zh"
          ? `交易失败：积分不足。请确保您在“无损失特工金库”中质押了 USDT 并累积了足够的特工积分。`
          : `Transaction failed: Insufficient credits. Please make sure you have staked USDT in the Vault and accumulated enough Scout Credits.`;
        setTradeError(customErr);
      } else {
        setTradeError(language === "zh" ? `买入指数错误: ${err.message}` : `Trade Buy Error: ${err.message}`);
      }
      addLog(language === "zh" ? `买入指数错误: ${err.message}` : `Trade Buy Error: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  // Execute sell
  const handleSell = async (tokenId: number, balance: string, playerName: string) => {
    if (!wallet.signer) return;
    if (parseFloat(balance) <= 0) return;
    setLoading(true);
    try {
      if (wallet.chainId !== 196) {
        addLog(language === "zh" ? "请将网络切换至 X Layer Mainnet" : "Please switch network to X Layer Mainnet", "warning");
        const switched = await switchToChain(196);
        if (!switched) {
          setLoading(false);
          return;
        }
      }
      addLog(language === "zh" ? `正在卖出 ${parseFloat(balance).toFixed(1)} 份 ${playerName} 指数...` : `Selling ${parseFloat(balance).toFixed(1)} shares of ${playerName}...`);
      const dex = new ethers.Contract(DEPLOYED_ADDRESSES.PlayerDex, DEX_ABI, wallet.signer);
      const tx = await dex.sellShares(tokenId, ethers.parseEther(balance));
      await tx.wait();
      addLog(language === "zh" ? `✓ 成功卖出 ${parseFloat(balance).toFixed(1)} 份 ${playerName} 指数！交易: ${tx.hash.slice(0, 14)}...` : `✓ Sold ${parseFloat(balance).toFixed(1)} shares of ${playerName}! Tx: ${tx.hash.slice(0, 14)}...`);
      setRefreshKey((k) => k + 1);
      setTxModal({ visible: true, type: "Sell", playerName, txHash: tx.hash, amount: parseFloat(balance).toFixed(1) });
    } catch (err: any) {
      addLog(language === "zh" ? `卖出指数错误: ${err.message}` : `Trade Sell Error: ${err.message}`, "warning");
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
              {txModal.type === "Buy" && (language === "zh" ? `成功买入 ${txModal.amount} 份 ${txModal.playerName} 指数！` : `Bought ${txModal.amount} Share of ${txModal.playerName}!`)}
              {txModal.type === "Sell" && (language === "zh" ? `成功卖出 ${txModal.amount} 份 ${txModal.playerName} 指数！` : `Sold ${txModal.amount} Shares of ${txModal.playerName}!`)}
            </h3>
            <p className="tx-modal-sub">
              {language === "zh" ? `交易已在 ${isMainnet ? "X Layer 主网" : "X Layer 测试网"} 上被确认。` : `Your transaction was confirmed on ${isMainnet ? "X Layer Mainnet" : "X Layer Testnet"}.`}
            </p>
            <a
              href={`${explorerBase}${txModal.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-modal-link"
            >
              <SearchIcon /> {language === "zh" ? "在浏览器上查看交易 ↗" : "View Transaction on Explorer ↗"}
            </a>
            <button
              className="btn btn-primary tx-modal-close"
              onClick={() => setTxModal(m => ({ ...m, visible: false }))}
            >
              {language === "zh" ? "完成" : "Done"}
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
          <h3 className="panel-title">{language === "zh" ? "世界杯球员指数市场" : "World Cup Player Market"}</h3>
        </div>
        <p className="panel-desc">
          {language === "zh" ? "交易球员指数代币。代币价格代表特工的实时评估身价，并随球员数据和场上表现而上涨。" : "Trade Player Index Tokens. Token prices represent the live scouting valuation and increase with player stats and performances."}
        </p>

        {tradeError && (
          <div style={{
            margin: "0 0 16px",
            padding: "12px 16px",
            borderRadius: "8px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            fontSize: "0.82rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0 }}>⚠️</span>
              <span>{tradeError}</span>
            </div>
            <button 
              onClick={() => setTradeError(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#f87171",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "1.1rem",
                padding: "0 4px",
                lineHeight: "1"
              }}
            >
              ×
            </button>
          </div>
        )}

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
                  {c === "All" ? (language === "zh" ? "🌍 所有国家" : "🌍 All Countries") : `${flagCode ? "" : "🏳️"} ${getTranslatedCountry(c)}`}
                </option>
              );
            })}
          </select>

          {/* Search bar */}
          <div style={{ flex: '2 1 200px', position: 'relative' }}>
            <input
              type="text"
              placeholder={language === "zh" ? "搜索球员..." : "Search players..."}
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
            {language === "zh" ? (
              <>显示 {getTranslatedCountry(selectedCountry)} 的 {filteredPlayers.length} 名球员中的 {paginatedPlayers.length} 名</>
            ) : (
              <>Showing {paginatedPlayers.length} of {filteredPlayers.length} players{selectedCountry !== "All" && ` in ${selectedCountry}`}</>
            )}
          </span>
          <span>{language === "zh" ? `第 ${safeCurrentPage} 页，共 ${totalPages} 页` : `Page ${safeCurrentPage} of ${totalPages}`}</span>
        </div>

        <div className={`player-list ${marketExpanded ? "expanded" : "collapsed"}`}>
          {paginatedPlayers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-tertiary)', fontSize: '0.85rem', gridColumn: '1 / -1' }}>
              {language === "zh" ? "没有找到符合条件的球员。" : "No players found matching your criteria."}
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
                      <span className="player-country">{getTranslatedCountry(p.country)}</span>
                      <span className="player-rating-badge">OVR {p.rating}</span>
                    </div>
                    <h4 className="player-name">{p.name}</h4>
                    <div className="player-stats">
                      <span>{language === "zh" ? "⚽ 进球:" : "⚽ Goals:"} <strong>{p.goals}</strong></span>
                      <span><ShoeIcon /> {language === "zh" ? "助攻:" : "Assists:"} <strong>{p.assists}</strong></span>
                    </div>
                  </div>

                  <div className="player-trade-area">
                    <div className="player-price-box">
                      <div className="price-label">{language === "zh" ? "指数单价" : "SHARE PRICE"}</div>
                      <div className="price-value font-mono">{parseFloat(p.price).toFixed(0)} <span className="price-unit">CRD</span></div>
                    </div>

                    <div className="player-balance-box">
                      <div className="balance-label">{language === "zh" ? "持仓份额" : "OWNED"}</div>
                      <div className="balance-value font-mono">{parseFloat(p.balance).toFixed(1)}</div>
                    </div>

                    {(p as any).isTradeable ? (
                      wallet.connected ? (
                        <div className="player-actions">
                          <button
                            className="btn btn-primary btn-buy"
                            onClick={() => handleBuy((p as any).tokenId!, p.price, p.name)}
                            disabled={loading}
                          >
                            {language === "zh" ? "买入 1" : "Buy 1"}
                          </button>
                          <button
                            className="btn btn-sell"
                            onClick={() => handleSell((p as any).tokenId!, p.balance, p.name)}
                            disabled={loading || !hasBalance}
                          >
                            {language === "zh" ? "卖出全部" : "Sell All"}
                          </button>
                        </div>
                      ) : null
                    ) : (
                      <span className="not-tradeable-badge" style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', padding: '6px 10px', borderRadius: '6px' }}>
                        {language === "zh" ? "不可交易" : "Not Tradeable"}
                      </span>
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
              {language === "zh" ? "← 上一页" : "← Prev"}
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
              {language === "zh" ? "下一页 →" : "Next →"}
            </button>
          </div>
        )}

        <button 
          className="btn btn-sm btn-ghost mobile-market-toggle"
          onClick={() => setMarketExpanded(!marketExpanded)}
          style={{ display: 'none', width: '100%', marginTop: '16px', padding: '12px' }}
        >
          {marketExpanded ? (language === "zh" ? "收起 ▴" : "View Less ▴") : (language === "zh" ? "展开更多 ▾" : "View More ▾")}
        </button>
      </div>
    </>
  );
};
