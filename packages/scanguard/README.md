# 🛡️ ScanGuard & Pitchside API — MCP Security Scanning & Sports Analytics Engine

> **X Layer X Cup Hackathon Submission — Built on X Layer Testnet / Mainnet**

**ScanGuard** is a reusable, MCP-compatible security scanning engine and sports analytics backend. In the Pitchside AI ecosystem, it executes dynamic token scanning and serves as the oracle-feed manager for World Cup match analytics.

---

## 🎯 What It Does

1. **Bytecode Analysis:** Runs dual-layer scans on ERC-20 tokens, scanning for honeypots, delegatecalls, freeze lists, and hidden taxes.
2. **x402 Pay-Per-Scan Economy:** Gated with HTTP 402 Payment Required middleware, charging client agents $0.005/scan dynamically.
3. **World Cup Analytics Feed:** Serves live/simulated match logs (e.g. goals, cards, injuries) to drive autonomous agent trading.
4. **Agent Logging Server:** Feeds execution logs back to the frontend console.

---

## 🚀 Quick Start

1. Start from the monorepo root:
```bash
npm install
```

2. Start the ScanGuard backend server:
```bash
npm run dev:scanguard
```
*(Backend runs at http://localhost:3402)*

---

## 📡 API Endpoints

### 1. Token Scanner API
```bash
POST /api/scan
Content-Type: application/json
X-402-Payment: demo  # Use "demo" for free scans in development

{
  "tokenAddress": "0xE8a63B4a905d9C1C2262F261dee90478d6fFD3De",
  "chainId": 1952
}
```

### 2. World Cup Match & News Feed
```bash
GET /api/worldcup/matches
```
Returns a JSON array of match statistics and player performance events.

### 3. Agent Execution Logging
```bash
POST /api/worldcup/agent-logs
GET /api/worldcup/agent-logs
```
Post and fetch live execution events to render on the Scout Console.

---

## 🔧 MCP Integration

Add ScanGuard to your Claude Desktop or Cursor configuration:

```json
{
  "mcpServers": {
    "scanguard": {
      "url": "http://localhost:3402/mcp",
      "transport": "http"
    }
  }
}
```

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `scan_token` | Performs security scan returning JSON risk score and flags. |
| `get_risk_summary` | Returns a human-readable text summary of the security status. |

---

## 📁 File Structure

```
packages/scanguard/src/
├── index.ts           → Express server and routing definitions
├── scanner.ts         → Core bytecode security analysis engine
├── x402.ts            → x402 HTTP 402 middleware
├── mcp.ts             → Model Context Protocol tools definition
├── routes/
│   └── worldcup.ts    → World Cup sports matches & agent logging APIs
└── types.ts           → Shared types
```

---

## 📄 License

MIT — Expanded for the X Layer X Cup Hackathon (May 19 - May 28, 2026).
