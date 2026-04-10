import { useState, useEffect, useCallback } from 'react';
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

  // ─── Fetch health on mount ─────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => { if (d.success) setHealth(d.data); })
      .catch(() => {});

    fetch('/api/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setTotalScans(d.data.cachedScans || 0); })
      .catch(() => {});
  }, []);

  // ─── Scan Token ────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!scanAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setScanError('Invalid address — must be a 0x-prefixed 40-hex-char address');
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
        setTotalScans(prev => prev + 1);

        // Add to feed
        setFeed(prev => [{
          id: data.data.scanId,
          tokenAddress: data.data.tokenAddress,
          tokenSymbol: data.data.tokenSymbol,
          riskLevel: data.data.riskLevel,
          timestamp: Date.now(),
        }, ...prev].slice(0, 50));
      } else {
        setScanError(data.error?.message || 'Scan failed');
      }
    } catch (err) {
      setScanError('Network error — is ScanGuard backend running on port 3402?');
    } finally {
      setScanning(false);
    }
  }, [scanAddress]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="dashboard">
      {/* Header */}
      <motion.header
        className="dashboard-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1>🛡️ ScanGuard</h1>
        <p className="subtitle">
          AI-Powered Security Scanning Skill for X Layer — OnchainOS × MCP × x402
        </p>
        <div className="badges">
          <span className="badge green">
            {health ? '● Online' : '○ Connecting...'}
          </span>
          <span className="badge cyan">MCP Compatible</span>
          <span className="badge purple">x402 Monetized</span>
          {health?.onchainOs?.configured && (
            <span className="badge green">OnchainOS ✓</span>
          )}
        </div>
      </motion.header>

      {/* Stats Row */}
      <motion.div
        className="grid grid-4"
        style={{ marginBottom: '2rem' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <div className="card">
          <div className="stat-icon green">🔍</div>
          <div className="card-value">{totalScans}</div>
          <div className="stat-label">Total Scans</div>
        </div>
        <div className="card">
          <div className="stat-icon cyan">⛓️</div>
          <div className="card-value">{health?.chainId || '—'}</div>
          <div className="stat-label">Chain ID (X Layer)</div>
        </div>
        <div className="card">
          <div className="stat-icon purple">🔧</div>
          <div className="card-value">{health?.onchainOs?.modules?.length || 4}</div>
          <div className="stat-label">OnchainOS Skills</div>
        </div>
        <div className="card">
          <div className="stat-icon yellow">⏱️</div>
          <div className="card-value">{health ? Math.floor(health.uptime) + 's' : '—'}</div>
          <div className="stat-label">Uptime</div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="tabs">
        {(['scanner', 'feed', 'mcp'] as const).map(tab => (
          <div
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'scanner' && '🔍 Interactive Scanner'}
            {tab === 'feed' && '📡 Live Scan Feed'}
            {tab === 'mcp' && '🔧 MCP Integration Guide'}
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'scanner' && (
          <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid grid-2">
              {/* Scanner Input */}
              <div className="card scanner-card">
                <div className="card-title">🔍 Token Security Scanner</div>
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
                    {scanning ? <><span className="spinner" /> Scanning...</> : 'Scan Token'}
                  </button>
                </div>

                {/* Quick Scan Tokens */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', alignSelf: 'center' }}>Quick:</span>
                  {[
                    { symbol: 'USDT', address: '0x1E4a5963aBFD975d8c9021ce480b42188849D41d' },
                    { symbol: 'WOKB', address: '0xe538905cf8410324e03A5A23C1c177a474D59b2b' },
                    { symbol: 'WETH', address: '0x5A77f1443D16ee5761d310e38b4BEB27E6E2f5Ab' },
                  ].map(t => (
                    <button
                      key={t.symbol}
                      onClick={() => setScanAddress(t.address)}
                      style={{
                        padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)', color: 'var(--text-secondary)', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {t.symbol}
                    </button>
                  ))}
                </div>

                {/* Error */}
                {scanError && (
                  <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'var(--accent-red-dim)', color: 'var(--accent-red)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    ⚠️ {scanError}
                  </div>
                )}

                {/* Result */}
                {scanResult && (
                  <motion.div className="scan-result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="result-header">
                      <div>
                        <div className="result-token">
                          {scanResult.tokenSymbol || 'Unknown'} — {scanResult.tokenName || scanResult.tokenAddress.slice(0, 10) + '...'}
                        </div>
                        <span className={`risk-badge ${scanResult.riskLevel.toLowerCase()}`}>
                          {scanResult.riskLevel}
                        </span>
                      </div>
                      <div className={`result-score ${scanResult.riskLevel.toLowerCase()}`}>
                        {scanResult.riskScore}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', margin: '1rem 0', fontSize: '0.8rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Owner Renounced:</span> {scanResult.ownershipRenounced ? '✅ Yes' : '❌ No'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Proxy:</span> {scanResult.hasProxyPattern ? '⚠️ Yes' : '✅ No'}</div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Scan Time:</span> {scanResult.scanDurationMs}ms</div>
                    </div>

                    {scanResult.flags.length > 0 && (
                      <div className="flags-list">
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                          {scanResult.flags.length} Risk Flag{scanResult.flags.length !== 1 ? 's' : ''} Detected
                        </div>
                        {scanResult.flags.map((flag, i) => (
                          <motion.div
                            key={i}
                            className="flag-item"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                          >
                            <span className={`flag-severity`} style={{
                              color: flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'var(--accent-red)' : flag.severity === 'MEDIUM' ? 'var(--accent-yellow)' : 'var(--accent-green)',
                              background: flag.severity === 'CRITICAL' || flag.severity === 'HIGH' ? 'var(--accent-red-dim)' : flag.severity === 'MEDIUM' ? 'var(--accent-yellow-dim)' : 'var(--accent-green-dim)',
                            }}>
                              {flag.severity}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600 }}>{flag.title}</div>
                              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{flag.description}</div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                      <a href={scanResult.xLayerExplorerUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                        View on X Layer Explorer →
                      </a>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Agent Identity Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card">
                  <div className="card-title">🤖 Agent Identity</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <div><strong>Service:</strong> ScanGuard v1.0.0</div>
                    <div><strong>Chain:</strong> X Layer Mainnet (196)</div>
                    <div><strong>Protocol:</strong> MCP + x402</div>
                    <div><strong>Wallet:</strong> <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{health?.onchainOs?.agenticWallet || 'Not configured'}</span></div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <strong>OnchainOS Skills:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.35rem' }}>
                        {(health?.onchainOs?.modules || ['okx-security', 'okx-dex-swap', 'okx-dex-token', 'okx-x402-payment']).map(m => (
                          <span key={m} className="badge cyan" style={{ fontSize: '0.65rem' }}>{m}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">💳 x402 Payment</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <div><strong>Price per scan:</strong> $0.005 USDC</div>
                    <div><strong>Protocol:</strong> HTTP 402 Payment Required</div>
                    <div><strong>Demo Mode:</strong> <span style={{ color: 'var(--accent-green)' }}>Active (free scans)</span></div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      In production, agents pay per scan via x402 stablecoin micropayments.
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
              <div className="card-title">📡 Live Scan Feed</div>
              {feed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                  No scans yet — use the scanner to generate entries
                </div>
              ) : (
                <div className="feed-list">
                  {feed.map((entry) => (
                    <motion.div
                      key={entry.id}
                      className={`feed-item ${entry.riskLevel === 'HIGH' || entry.riskLevel === 'CRITICAL' ? 'risky' : ''}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div>
                        <span className="feed-token">{entry.tokenSymbol || entry.tokenAddress.slice(0, 10) + '...'}</span>
                        <span className={`risk-badge ${entry.riskLevel.toLowerCase()}`} style={{ marginLeft: '0.5rem' }}>
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
              <div className="card-title">🔧 MCP Integration Guide</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                ScanGuard exposes two MCP tools that any AI agent (Claude, GPT, Cursor) can call via HTTP.
                No SDK required — just standard JSON-RPC over HTTP.
              </p>

              <div className="guide-step">
                <h4>Step 1: Discover Available Tools</h4>
                <p>Query the MCP discovery endpoint:</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText('curl http://localhost:3402/mcp/tools')}>Copy</button>
{`curl http://localhost:3402/mcp/tools

# Returns:
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
                <h4>Step 2: Call a Tool</h4>
                <p>Send a JSON-RPC request to execute a scan:</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(`curl -X POST http://localhost:3402/mcp/call \\
  -H "Content-Type: application/json" \\
  -d '{"method":"tools/call","params":{"name":"scan_token","arguments":{"tokenAddress":"0x1E4a5963aBFD975d8c9021ce480b42188849D41d"}}}'`)}>Copy</button>
{`curl -X POST http://localhost:3402/mcp/call \\
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
                <h4>Step 3: x402 Payment (Production)</h4>
                <p>In production mode, the API returns HTTP 402 with payment instructions:</p>
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
                <h4>Claude Desktop / Cursor Configuration</h4>
                <p>Add ScanGuard to your AI agent's MCP config:</p>
                <div className="code-block">
                  <button className="copy-btn" onClick={() => navigator.clipboard.writeText(`{
  "mcpServers": {
    "scanguard": {
      "url": "http://localhost:3402/mcp",
      "description": "Security scanning for ERC-20 tokens on X Layer"
    }
  }
}`)}>Copy</button>
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

      {/* Footer */}
      <motion.footer
        style={{ textAlign: 'center', marginTop: '3rem', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div>ScanGuard — Built for <strong>X Layer Build X Season 2 AI Hackathon</strong></div>
        <div style={{ marginTop: '0.25rem' }}>OnchainOS × MCP × x402 × Uniswap Skills</div>
      </motion.footer>
    </div>
  );
}
