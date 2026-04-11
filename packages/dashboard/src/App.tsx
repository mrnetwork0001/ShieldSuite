import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScanResult {
  scanId: string;
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  riskScore: number;
  riskLevel: string;
  flags: Array<{
    category: string;
    severity: string;
    title: string;
    description: string;
    evidence?: string;
  }>;
  ownershipRenounced: boolean;
  hasProxyPattern: boolean;
  scanDurationMs: number;
  xLayerExplorerUrl: string;
}

interface HealthData {
  status: string;
  service: string;
  version: string;
  chain: string;
  chainId: number;
  uptime: number;
  onchainOs?: {
    configured: boolean;
    modules: string[];
    agenticWallet: string | null;
  };
}

interface FeedEntry {
  id: string;
  tokenAddress: string;
  tokenSymbol: string | null;
  riskLevel: string;
  timestamp: number;
}

// ─── Typewriter Hook ─────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(timer);
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return { displayed, done };
}

// ─── Progress Bar Component ──────────────────────────────────────────────────
function TerminalBar({ value, max, label }: { value: number; max: number; label: string }) {
  const filled = Math.round((value / max) * 20);
  const bar =
    '[' +
    '|'.repeat(Math.min(filled, 20)) +
    '.'.repeat(Math.max(0, 20 - filled)) +
    ']';
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem 0.5rem' }}>
      <span style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: filled > 15 ? 'var(--fg-red)' : filled > 8 ? 'var(--fg-amber)' : 'var(--fg)', fontSize: '0.7rem', wordBreak: 'break-all' }}>
        {bar} {value}/{max}
      </span>
    </div>
  );
}

// ─── Clipboard Helper ────────────────────────────────────────────────────────
const copyToClipboard = (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard!"));
  } else {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "absolute";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      alert("Copied to clipboard!");
    } catch (error) {
      alert("Failed to copy. Please manually select the text.");
    } finally {
      textArea.remove();
    }
  }
};

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'feed' | 'mcp'>('scanner');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [scanAddress, setScanAddress] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [chainStats, setChainStats] = useState<{ blockNumber: number; gasPrice: string } | null>(null);

  const hero = useTypewriter('SCANGUARD v1.0.0', 60);

  // ─── Polling for feed & stats ──────────────────────────────────────────
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.success) setHealth(d.data); })
      .catch(() => {});

    const pollData = () => {
      fetch('/api/stats')
        .then(r => r.json())
        .then(d => { if (d.success) setTotalScans(d.data.cachedScans || 0); })
        .catch(() => {});

      fetch('/api/feed')
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.data)) {
            setFeed(d.data.map((scan: any) => ({
              id: scan.scanId,
              tokenAddress: scan.tokenAddress,
              tokenSymbol: scan.tokenSymbol,
              riskLevel: scan.riskLevel,
              timestamp: scan.scanTimestamp,
            })));
          }
        })
        .catch(() => {});
    };

    pollData();
    const interval = setInterval(pollData, 3000);

    // Poll chain stats from X Layer RPC
    const fetchChainStats = () => {
      Promise.all([
        fetch('https://rpc.xlayer.tech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
        }).then(r => r.json()).catch(() => null),
        fetch('https://rpc.xlayer.tech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 2 }),
        }).then(r => r.json()).catch(() => null),
      ]).then(([blockRes, gasRes]) => {
        if (blockRes?.result && gasRes?.result) {
          const blockNumber = parseInt(blockRes.result, 16);
          const gasPriceGwei = (parseInt(gasRes.result, 16) / 1e9).toFixed(2);
          setChainStats({ blockNumber, gasPrice: gasPriceGwei });
        }
      }).catch(() => {});
    };
    fetchChainStats();
    const chainInterval = setInterval(fetchChainStats, 15000);

    return () => { clearInterval(interval); clearInterval(chainInterval); };
  }, []);

  // ─── Scan Token ────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!scanAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setScanError('[ERR] Invalid address — must be 0x-prefixed 40-hex-char');
      return;
    }

    setScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenAddress: scanAddress }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setScanResult(data.data);
      } else {
        setScanError(`[ERR] ${data.error?.message || 'Scan failed'}`);
      }
    } catch (err) {
      setScanError('[ERR] Network error — is ScanGuard backend running on :3402?');
    } finally {
      setScanning(false);
    }
  }, [scanAddress]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">

      {/* ═══ HEADER ═══ */}
      <motion.header
        className="dashboard-header"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <pre style={{ color: 'var(--fg-dim)', fontSize: '0.65rem', lineHeight: 1.3, marginBottom: '0.5rem' }}>
{`  ╔═══════════════════════════════════════╗
  ║  ███████╗ ██████╗  █████╗ ███╗   ██╗ ║
  ║  ██╔════╝██╔════╝ ██╔══██╗████╗  ██║ ║
  ║  ███████╗██║      ███████║██╔██╗ ██║ ║
  ║  ╚════██║██║      ██╔══██║██║╚██╗██║ ║
  ║  ███████║╚██████╗ ██║  ██║██║ ╚████║ ║
  ║  ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝║
  ╚═══════════════════════════════════════╝`}
        </pre>
        <h1>
          {hero.displayed}
          {!hero.done && <span className="animate-blink">█</span>}
        </h1>
        <p className="subtitle">
          AI-Powered Security Scanning Agent for X Layer — OnchainOS × MCP × x402
        </p>

        <div className="badges">
          <span className="badge green">
            {health ? '[OK] ONLINE' : '[..] CONNECTING'}
          </span>
          <span className="badge cyan">[MCP] COMPATIBLE</span>
          <span className="badge purple">[x402] MONETIZED</span>
          {health?.onchainOs?.configured && (
            <span className="badge green">[ONCHAIN-OS] ACTIVE</span>
          )}
        </div>
      </motion.header>

      {/* ═══ STATS ROW ═══ */}
      <motion.div
        className="grid grid-4"
        style={{ marginBottom: '1.5rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="card">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>scans.total</div>
          <div className="card-value">{totalScans}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>xlayer.block</div>
          <div className="card-value">{chainStats?.blockNumber?.toLocaleString() || '—'}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>gas.gwei</div>
          <div className="card-value">{chainStats?.gasPrice || '—'}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>sys.uptime</div>
          <div className="card-value">{health ? Math.floor(health.uptime) + 's' : '—'}</div>
        </div>
      </motion.div>

      {/* ═══ ECOSYSTEM ROW ═══ */}
      <motion.div
        className="grid grid-2"
        style={{ marginBottom: '1.5rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="card-title">SYSTEM INFO</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.78rem', lineHeight: 1.7 }}>
            <div><span style={{ color: 'var(--fg-dim)' }}>$</span> ScanGuard is a decentralized security intelligence layer acting as an <span style={{ color: 'var(--fg)' }}>autonomous security agent</span> via the Model Context Protocol.</div>
            <div style={{ marginTop: '0.5rem' }}><span style={{ color: 'var(--fg-dim)' }}>$</span> Any DeFi app, bot, or wallet can integrate ScanGuard to pre-flight token approvals on X Layer Mainnet.</div>
          </div>
          <div style={{ marginTop: 'auto', border: '1px solid var(--border)', padding: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>tvl.protected</span>
              <span className="badge green" style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem' }}>[LIVE]</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--fg)', fontFamily: 'var(--font-retro)', textShadow: '0 0 8px var(--glow)' }}>
              $24,082,150 <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>USDC</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">CONNECTED AGENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <div style={{ padding: '0.5rem 0', borderBottom: '1px dashed var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', border: '1px solid var(--fg-dim)', color: 'var(--fg)' }}>[LIVE]</span>
              <div>
                <a href={import.meta.env.VITE_SHIELDSWAP_URL || "http://localhost:5173"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontWeight: 600, fontSize: '0.8rem', color: 'var(--fg)', borderBottom: '1px dotted var(--fg-dim)' }}>ShieldSwap Protocol ↗</a>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>interface=MCP | type=DEX_AGGREGATOR</div>
              </div>
            </div>
            <div style={{ padding: '0.5rem 0', borderBottom: '1px dashed var(--fg-subtle)', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', border: '1px solid var(--fg-amber)', color: 'var(--fg-amber)' }}>[SOON]</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>SentCore Trading Bot</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>interface=API | type=SNIPER_BOT</div>
              </div>
            </div>
            <div style={{ padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '0.1rem 0.4rem', border: '1px solid var(--fg-amber)', color: 'var(--fg-amber)' }}>[SOON]</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>XLayer SafeWallet</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>interface=SDK | type=WALLET_GUARD</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ═══ TABS ═══ */}
      <div className="tabs">
        {(['scanner', 'feed', 'mcp'] as const).map(tab => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'scanner' && 'SCAN'}
            {tab === 'feed' && 'FEED'}
            {tab === 'mcp' && 'MCP'}
          </div>
        ))}
      </div>

      {/* ═══ TAB CONTENT ═══ */}
      <AnimatePresence mode="wait">
        {activeTab === 'scanner' && (
          <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-2">
              {/* Scanner Input */}
              <div className="card scanner-card">
                <div className="card-title">TOKEN SECURITY SCANNER</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ color: 'var(--fg-dim)' }}>scanguard@xlayer:~$</span> scan --token &lt;address&gt;
                </div>
                <div className="scanner-input-row">
                  <input
                    className="scanner-input"
                    type="text"
                    placeholder="0x... paste token contract address"
                    value={scanAddress}
                    onChange={e => setScanAddress(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleScan()}
                  />
                  <button
                    className="scan-btn"
                    onClick={handleScan}
                    disabled={scanning || !scanAddress}
                  >
                    {scanning ? 'SCANNING...' : 'EXECUTE'}
                  </button>
                </div>

                {/* Quick Scan Tokens */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--fg-dim)', fontSize: '0.7rem', alignSelf: 'center' }}>--quick:</span>
                  {[
                    { symbol: 'USDT', address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d' },
                    { symbol: 'WOKB', address: '0xe538905cf8410324e03A5A23C1c177a474D59b2b' },
                    { symbol: 'WETH', address: '0x5A77f1443D16ee5761d310e38b4BEB27E6E2f5Ab' },
                  ].map(t => (
                    <button
                      key={t.symbol}
                      onClick={() => setScanAddress(t.address)}
                      style={{
                        padding: '0.2rem 0.5rem', border: '1px solid var(--border)',
                        background: 'transparent', color: 'var(--fg-cyan)', cursor: 'pointer',
                        fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.target as any).style.background = 'var(--fg-cyan)'; (e.target as any).style.color = 'var(--bg)'; }}
                      onMouseLeave={e => { (e.target as any).style.background = 'transparent'; (e.target as any).style.color = 'var(--fg-cyan)'; }}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>

                {/* Error */}
                {scanError && (
                  <div style={{ padding: '0.5rem 0.75rem', border: '1px solid rgba(255,51,51,0.3)', color: 'var(--fg-red)', fontSize: '0.78rem', marginBottom: '1rem', textShadow: '0 0 5px var(--glow-red)' }}>
                    {scanError}
                  </div>
                )}

                {/* Result */}
                {scanResult && (
                  <motion.div className="scan-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="result-header">
                      <div>
                        <div className="result-token">
                          {scanResult.tokenSymbol || 'UNKNOWN'} — {scanResult.tokenName || scanResult.tokenAddress.slice(0, 10) + '...'}
                        </div>
                        <span className={`risk-badge ${scanResult.riskLevel.toLowerCase()}`}>
                          {scanResult.riskLevel}
                        </span>
                      </div>
                      <div className={`result-score ${scanResult.riskLevel.toLowerCase()}`}>
                        {scanResult.riskScore}
                      </div>
                    </div>

                    <TerminalBar value={scanResult.riskScore} max={100} label="risk.score" />

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', margin: '0.75rem 0', fontSize: '0.75rem' }}>
                      <div><span style={{ color: 'var(--fg-dim)' }}>owner.renounced=</span>{scanResult.ownershipRenounced ? <span style={{ color: 'var(--fg)' }}>true</span> : <span style={{ color: 'var(--fg-red)' }}>false</span>}</div>
                      <div><span style={{ color: 'var(--fg-dim)' }}>proxy.detected=</span>{scanResult.hasProxyPattern ? <span style={{ color: 'var(--fg-amber)' }}>true</span> : <span style={{ color: 'var(--fg)' }}>false</span>}</div>
                      <div><span style={{ color: 'var(--fg-dim)' }}>scan.duration=</span><span style={{ color: 'var(--fg-cyan)' }}>{scanResult.scanDurationMs}ms</span></div>
                    </div>

                    {scanResult.flags.length > 0 && (
                      <div className="flags-list">
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: (scanResult.riskLevel === 'SAFE' || scanResult.riskLevel === 'LOW') ? 'var(--fg)' : 'var(--fg-amber)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>
                          // {scanResult.flags.length} {(scanResult.riskLevel === 'SAFE' || scanResult.riskLevel === 'LOW') ? 'finding' : 'risk flag'}{scanResult.flags.length !== 1 ? 's' : ''} {(scanResult.riskLevel === 'SAFE' || scanResult.riskLevel === 'LOW') ? 'reported' : 'detected'}
                        </div>
                        {scanResult.flags.map((flag, i) => (
                          <motion.div
                            key={i}
                            className="flag-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <span className="flag-severity" style={{
                              color: flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'var(--fg-red)' : flag.severity === 'MEDIUM' ? 'var(--fg-amber)' : 'var(--fg)',
                              borderColor: flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'rgba(255,51,51,0.3)' : flag.severity === 'MEDIUM' ? 'rgba(255,176,0,0.3)' : 'var(--fg-dim)',
                            }}>
                              {flag.severity}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--fg)' }}>{flag.title}</div>
                              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{flag.description}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                      <a href={scanResult.xLayerExplorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem' }}>
                        view on explorer →
                      </a>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Agent Identity + Payment */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                <div className="card">
                  <div className="card-title">AGENT IDENTITY</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    <div><span style={{ color: 'var(--fg-dim)' }}>service=</span><span style={{ color: 'var(--fg)' }}>ScanGuard v1.0.0</span></div>
                    <div><span style={{ color: 'var(--fg-dim)' }}>chain=</span><span style={{ color: 'var(--fg)' }}>X Layer Mainnet (196)</span></div>
                    <div><span style={{ color: 'var(--fg-dim)' }}>protocol=</span><span style={{ color: 'var(--fg-cyan)' }}>MCP + x402</span></div>
                    <div><span style={{ color: 'var(--fg-dim)' }}>wallet=</span><span style={{ color: 'var(--fg)', fontSize: '0.72rem' }}>{health?.onchainOs?.agenticWallet || 'not-configured'}</span></div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ color: 'var(--fg-dim)' }}>skills=</span>
                      <span style={{ color: 'var(--fg-amber)' }}>[{(health?.onchainOs?.modules || ['okx-security', 'okx-dex-swap', 'okx-dex-token', 'okx-x402-payment']).join(', ')}]</span>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">x402 PAYMENT</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', lineHeight: 1.8 }}>
                    <div><span style={{ color: 'var(--fg-dim)' }}>scan.price=</span><span style={{ color: 'var(--fg-amber)' }}>$0.005 USDC</span></div>
                    <div><span style={{ color: 'var(--fg-dim)' }}>protocol=</span>HTTP 402 Payment Required</div>
                    <div><span style={{ color: 'var(--fg-dim)' }}>mode=</span><span style={{ color: 'var(--fg)' }}>DEMO (free scans)</span></div>
                    <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: 'var(--fg-subtle)' }}>
                      // In production, agents pay per scan via x402 stablecoin micropayments
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'feed' && (
          <motion.div key="feed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card">
              <div className="card-title">LIVE SCAN FEED</div>
              {feed.length === 0 ? (
                <div style={{ padding: '2rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  <div>$ tail -f /var/log/scanguard/scans.log</div>
                  <div style={{ color: 'var(--fg-subtle)', marginTop: '0.5rem' }}>-- waiting for scan events --</div>
                  <span className="animate-blink" style={{ color: 'var(--fg)' }}>█</span>
                </div>
              ) : (
                <div className="feed-list">
                  <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.65rem', color: 'var(--fg-subtle)', borderBottom: '1px solid var(--fg-subtle)', textTransform: 'uppercase' }}>
                    TOKEN{' '.repeat(14)}RISK{' '.repeat(10)}TIME
                  </div>
                  {feed.map((entry) => (
                    <motion.div
                      key={entry.id}
                      className={`feed-item ${entry.riskLevel === 'HIGH' || entry.riskLevel === 'CRITICAL' ? 'risky' : ''}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="feed-token">{entry.tokenSymbol || entry.tokenAddress.slice(0, 10) + '...'}</span>
                        <span className={`risk-badge ${entry.riskLevel.toLowerCase()}`}>
                          {entry.riskLevel}
                        </span>
                      </div>
                      <div className="feed-time">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'mcp' && (
          <motion.div key="mcp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card">
              <div className="card-title">MCP INTEGRATION GUIDE</div>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.78rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                <span style={{ color: 'var(--fg-dim)' }}>// </span>
                ScanGuard exposes two MCP tools callable by any AI agent (Claude, GPT, Cursor).
                No SDK required — standard JSON-RPC over HTTP.
              </p>

              <div className="guide-step">
                <h4>STEP 1: DISCOVER TOOLS</h4>
                <p>Query the MCP discovery endpoint</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => copyToClipboard('curl http://localhost:3402/mcp/tools')}>COPY</button>
{`$ curl http://localhost:3402/mcp/tools

# Response:
{
  "tools": [
    {
      "name": "scan_token",
      "description": "Scan ERC-20 token for security risks...",
      "inputSchema": { "tokenAddress": "string", "chainId": "number" }
    },
    {
      "name": "get_risk_summary", 
      "description": "Get human-readable risk summary...",
      "inputSchema": { "scanId": "string" }
    }
  ]
}`}
                </div>
              </div>

              <div className="guide-step">
                <h4>STEP 2: CALL A TOOL</h4>
                <p>Send a JSON-RPC request to execute a scan</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => copyToClipboard(`curl -X POST http://localhost:3402/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{"method":"tools/call","params":{"name":"scan_token","arguments":{"tokenAddress":"0x1E4a5963aBFD975d8c9021ce480b42188849D41d"}}}'`)}>COPY</button>
{`$ curl -X POST http://localhost:3402/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{
    "method": "tools/call",
    "params": {
      "name": "scan_token",
      "arguments": {
        "tokenAddress": "0x1E4a...D41d"
      }
    }
  }'`}
                </div>
              </div>

              <div className="guide-step">
                <h4>STEP 3: x402 PAYMENT (PRODUCTION)</h4>
                <p>In production, the API returns HTTP 402 with payment instructions</p>
                <div className="code-block">
{`HTTP/1.1 402 Payment Required
X-402-Price: 0.005
X-402-Currency: USDC
X-402-Network: xlayer
X-402-Recipient: 0x...agenticWallet

# Include payment proof in subsequent request:
X-402-Payment: <signed-payment-receipt>`}
                </div>
              </div>

              <div className="guide-step">
                <h4>CLAUDE DESKTOP / CURSOR CONFIG</h4>
                <p>Add ScanGuard to your AI agent's MCP config</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => copyToClipboard(`{
  "mcpServers": {
    "scanguard": {
      "url": "http://localhost:3402/mcp",
      "description": "Security scanning for ERC-20 tokens on X Layer"
    }
  }
}`)}>COPY</button>
{`{
  "mcpServers": {
    "scanguard": {
      "url": "http://localhost:3402/mcp",
      "description": "Security scanning for ERC-20 tokens on X Layer"
    }
  }
}`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ FOOTER ═══ */}
      <motion.footer
        style={{ marginTop: '2rem', padding: '1rem 0', borderTop: '1px solid var(--border)', color: 'var(--fg-dim)', fontSize: '0.7rem', textAlign: 'center' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div>// ScanGuard — Built for <span style={{ color: 'var(--fg)' }}>X Layer Build X Season 2 AI Hackathon</span></div>
        <div style={{ marginTop: '0.25rem', color: 'var(--fg-subtle)' }}>OnchainOS × MCP × x402 × Uniswap Skills</div>
      </motion.footer>
    </div>
  );
}
