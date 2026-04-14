# 🛡️ Shield Suite

> **Security-first DeFi infrastructure for X Layer** — AI-powered token scanning skill + security-gated DEX aggregator  
> Built for **X Layer Build X Season 2 AI Hackathon**

[![OnchainOS](https://img.shields.io/badge/OnchainOS-Integrated-6366F1?style=flat-square)](https://web3.okx.com)
[![MCP](https://img.shields.io/badge/MCP-Compatible-06B6D4?style=flat-square)](https://modelcontextprotocol.io)
[![x402](https://img.shields.io/badge/x402-Monetized-10B981?style=flat-square)](https://www.x402.org)
[![X Layer](https://img.shields.io/badge/X_Layer-Mainnet-F59E0B?style=flat-square)](https://www.okx.com/xlayer)

---

## 🏗️ Architecture

Shield Suite is a **monorepo** with three packages that work together:

```
shield-suite/
├── packages/scanguard/       # 🔍 Security scanning engine (Express API + MCP server)
├── packages/shieldswap/      # 🔄 Security-first DEX aggregator (React + Vite)
├── packages/dashboard/       # 📊 ScanGuard interactive dashboard (React + Vite)
└── docs/                     # 📖 Architecture documentation
```

### Data Flow
```mermaid
graph LR
  A[User / AI Agent] --> B[ShieldSwap UI<br/>Port 5173]
  A --> C[ScanGuard Dashboard<br/>Port 5174]
  A --> D[MCP Client<br/>Claude / Cursor]
  
  B --> E[ScanGuard API<br/>Port 3402]
  C --> E
  D --> E
  
  E --> F[OKX Security API<br/>okx-security skill]
  E --> G[Custom Bytecode<br/>Analysis Engine]
  E --> H[X Layer RPC<br/>Chain ID 196]
  
  B --> I[OKX DEX API<br/>okx-dex-swap skill]
```

---

## 🏆 Hackathon Submissions

### Submission 1: **ScanGuard** → Skills Arena
A reusable, MCP-compatible security scanning skill that any AI agent can call. Uses the **dual-layer scanning** approach:
- **Layer 1:** OKX OnchainOS Security API (`okx-security` skill) — official token risk data
- **Layer 2:** Custom bytecode analysis — deep dive into contract code for additional risk flags

**Monetized via x402** — agents pay $0.005/scan in USDC stablecoins.

### Submission 2: **ShieldSwap** → X Layer Arena  
A premium, security-first DEX aggregator. Paste a token address → ScanGuard scans it → if safe, swap via OKX DEX aggregation → if risky, block with detailed threat report.

### Submission 3: **Autonomous Shield Agent** → Most Active Agent Arena
A completely autonomous Node.js scanning agent running 24/7 on a VPS. It continuously invokes the ScanGuard API to monitor the top 11 X Layer core tokens for emerging threats.
- **TEE-Secured Identity:** Uses the **OKX Agentic Wallet** with Trusted Execution Environment (TEE) signing. The private key is never exposed to the application code, providing institutional-grade security.
- **On-Chain Heartbeats:** Emits a real `0 OKB` self-transfer on the ledger every 5 minutes, attaching UTF-8 encoded metadata (e.g., `"ScanGuard Cycle Success"`) as an immutable record of system health.
- **Live Agent Ledger:** The Dashboard UI cryptographically tracks the Agent's public wallet address (`0x821b...`) and audits its activity in real-time.

---

## 🔧 OnchainOS Integration

| Skill | Usage | Package |
|-------|-------|---------|
| `okx-security` | Token risk scanning, honeypot detection, buy/sell tax analysis | ScanGuard |
| `okx-dex-swap` | DEX aggregation (500+ liquidity sources) for swap execution | ShieldSwap |
| `okx-dex-token` | Token search, metadata, market data | ShieldSwap |
| `okx-x402-payment` | x402 payment authorization via TEE | ScanGuard |
| `okx-agentic-wallet` | Agent on-chain identity and wallet lifecycle | Both |

### API Authentication
```bash
# .env (never commit this file)
OKX_API_KEY=your-api-key
OKX_SECRET_KEY=your-secret-key
OKX_PASSPHRASE=your-passphrase
```

Requests are signed with HMAC-SHA256: `HMAC(timestamp + method + path + body, secretKey)`

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- OKX API credentials ([Developer Portal](https://web3.okx.com/onchainos/dev-portal))
- onchainos CLI (`irm https://raw.githubusercontent.com/okx/onchainos-skills/main/install.ps1 | iex`)

### Install & Run
```bash
# Clone
git clone https://github.com/mrnetwork0001/ShieldSuite.git
cd shield-suite

# Install all dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your OKX API credentials

# Start all services (ScanGuard + ShieldSwap + Dashboard)
npm run dev
```

### VPS Deployment (24/7 Autonomous Mode)
For industrial-grade uptime, deploy the agent to a VPS using PM2:
```bash
# 1. Install PM2 globally
sudo npm install -g pm2

# 2. Start Project Ecosystem
pm2 start "npm run dev:scanguard" --name scanguard-api
pm2 start "npm run agent" --name shield-agent

# 3. Setup Persistent Startup
pm2 save
pm2 startup
```

### Access Points
| Service | URL | Description |
|---------|-----|-------------|
| ShieldSwap | [https://shieldswap-main.vercel.app](https://shieldswap-main.vercel.app) | Security-first DEX aggregator |
| ScanGuard Dashboard | [https://scanguard-dashboard-main.vercel.app](https://scanguard-dashboard-main.vercel.app) | Interactive scanning interface |
| ScanGuard API (Live VPS) | `http://38.49.216.120:3402` | REST + MCP Server |

---

## 🔍 API Reference

### Scan a Token
```bash
POST /api/scan
Content-Type: application/json

{
  "tokenAddress": "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
  "chainId": 196
}
```

### MCP Tool Call
```bash
POST /mcp/call
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "scan_token",
    "arguments": {
      "tokenAddress": "0x..."
    }
  }
}
```

### Health Check
```bash
GET /api/health
# Returns: service status, OnchainOS configuration, uptime
```

---

## 💳 x402 Payment Protocol

ScanGuard implements the [x402 Payment Required](https://www.x402.org) protocol:

1. Agent calls `POST /api/scan` without payment
2. Server returns `HTTP 402 Payment Required` with payment instructions
3. Agent pays $0.005 USDC on X Layer
4. Agent retries with `X-402-Payment: <signed-receipt>` header
5. Server verifies payment and returns scan results

This creates an **agent economy loop** where AI agents securely pay for high-value security intelligence.

*Note: For the live Hackathon version, the protocol operates in **LIVE (Subsidized)** mode to prevent endlessly draining the agent's real USDC funds over a 24/7 timeline, while successfully recording the x402 payment requirements publicly on the Dashboard.*

---

## 🤖 MCP Integration

ScanGuard exposes an HTTP Model Context Protocol (MCP) server that any AI or script can query natively.

### List Available Tools
```bash
curl http://38.49.216.120:3402/mcp/tools
```

### Call specific MCP Tool (scan_token)
```bash
curl -X POST http://38.49.216.120:3402/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"scan_token","arguments":{"tokenAddress":"0x779ded0c9e1022225f8e0630b35a9b54be713736"}}'
```
*(Windows users should execute above curl command in a single line)*

> **Note on Desktop Clients:** Claude Desktop natively expects `stdio` or `sse` MCP servers. Since ScanGuard leverages an HTTP REST proxy to be highly accessible for lightweight on-chain bots and web dashboards, integration involves direct API calling or spinning up an MCP SSE bridge.

---

## 🏗️ Tech Stack

- **Runtime:** Node.js 18+ / TypeScript 5.7
- **Backend:** Express.js, ethers.js v6
- **Frontend:** React 19, Vite 6, Framer Motion
- **Chain:** X Layer Mainnet (Chain ID: 196)
- **SDK:** OKX OnchainOS Skills (okx-security, okx-dex-swap, okx-dex-token)
- **Protocols:** MCP, x402, JSON-RPC
- **Design:** Glassmorphism, dark mode, Inter/JetBrains Mono

---

## 📊 Live Infrastructure

- **Chain:** X Layer Mainnet (Chain ID 196)
- **Agentic Wallet (EVM):** `0x821b9cc6a54272d0b5b106416fe360c162f2af85`
- **Agentic Wallet (Solana):** `B72H614ET6scyxhN7Fdzn3PeKzzMqjJg3UYVp7EDFUh6`
- **Dashboard Hub:** [scanguard-dashboard-main.vercel.app](https://scanguard-dashboard-main.vercel.app)
- **ShieldSwap App:** [shieldswap-main.vercel.app](https://shieldswap-main.vercel.app)

---

## 👥 Team

- **Shield Suite Core Team** — Full-stack decentralized security

---

## 📜 License

MIT — © 2026 Shield Suite
