# 🛡️ ScanGuard — MCP Security Scanning Skill

> **XLayer Build X Season 2 AI Hackathon — Skills Arena Submission**

ScanGuard is a reusable, MCP-compatible security scanning skill that any AI agent can call via HTTP. It scans ERC-20 token contracts for rug-pull risk, phishing contracts, honeypots, and suspicious approvals **before** a trade executes.

External agents pay **$0.005/scan** via the [x402 protocol](https://x402.org) (HTTP 402 Payment Required), creating a sustainable pay-per-use economy for AI security services.

---

## 🎯 What It Does

| Check | Description |
|-------|-------------|
| 🪤 Rug-Pull Detection | Identifies active ownership, mint functions, and centralization risks |
| 🍯 Honeypot Detection | Analyzes bytecode for missing/modified transfer functions |
| 🎣 Phishing Detection | Flags non-contract addresses and non-standard ERC-20 implementations |
| 🔐 Approval Risks | Detects unlimited approval patterns and allowance manipulation |
| 📋 Blacklist Detection | Finds blacklist/freeze functions in contract bytecode |
| 🔄 Proxy Detection | Identifies upgradeable/delegatecall proxy contracts |
| 💰 Tax Analysis | Detects hidden fee/tax mechanisms on transfers |
| 📊 Liquidity Analysis | Checks contract balance and liquidity status |

## 🏗️ Architecture

```
AI Agent ──→ POST /api/scan ──→ x402 Payment Check ──→ Scanner Engine ──→ Results
                                     │
Claude/Cursor ──→ POST /mcp/tools/call ──→ MCP Handler ──→ Scanner Engine ──→ Results
```

## 🚀 Quick Start

```bash
# From the monorepo root
npm install
npm run dev:scanguard

# Server starts at http://localhost:3402
```

## 📡 API Endpoints

### Scan a Token
```bash
POST /api/scan
Content-Type: application/json
X-402-Payment: demo  # Use "demo" for free scans in dev mode

{
  "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "chainId": 196
}
```

### Health Check
```bash
GET /api/health
```

### MCP Tool Discovery
```bash
GET /mcp/tools
```

### MCP Tool Invocation
```bash
POST /mcp/tools/call
Content-Type: application/json

{
  "method": "tools/call",
  "params": {
    "name": "scan_token",
    "arguments": {
      "tokenAddress": "0x1234567890abcdef1234567890abcdef12345678"
    }
  }
}
```

## 💳 x402 Payment Protocol

In production mode, agents must pay $0.005 per scan using the x402 protocol:

1. Agent sends `POST /api/scan` without payment → receives **HTTP 402** with payment instructions
2. Agent sends payment to the specified address on XLayer
3. Agent retries with `X-402-Payment: <txHash>` header → scan executes

In development mode, use `X-402-Payment: demo` for free scans.

## 🔧 MCP Integration

Add ScanGuard to your Claude Desktop or Cursor config:

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
| `scan_token` | Full security scan returning JSON with risk score and flags |
| `get_risk_summary` | Human-readable risk summary with emoji indicators |

## 🌐 XLayer

ScanGuard is designed for **XLayer Mainnet** (Chain ID: 196), OKX's EVM-compatible L2. It connects to XLayer's RPC to perform real-time on-chain analysis.

## 📁 File Structure

```
packages/scanguard/
├── src/
│   ├── index.ts      Express server + route setup
│   ├── scanner.ts    Core security scanning engine
│   ├── x402.ts       x402 payment middleware
│   ├── mcp.ts        MCP tool definitions & handlers
│   └── types.ts      Shared TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

## 📄 License

MIT — Built for the XLayer Build X Season 2 AI Hackathon

