# Shield Suite - XLayer Security Infrastructure

> **The ultimate security-first DeFi infrastructure layer on XLayer.**  
> Built specifically for the **XLayer Build X Season 2 AI Hackathon**.

<img width="1510" height="736" alt="14 04 2026_23 24 57_REC" src="https://github.com/user-attachments/assets/11ff1bf9-193f-486d-b42e-c92e0014d8fd" />


Shield Suite unifies the **Model Context Protocol (MCP)**, **OKX OnchainOS**, and **Autonomous TEE Agents** into a holistic ecosystem that protects users from malicious tokens and provides AI agents with high-fidelity, monetizable security intelligence.

---

## Table of Contents
1. [The Problem & Our Solution](#the-problem--our-solution)
2. [Ecosystem Components](#ecosystem-components)
3. [Autonomous AI Agent (TEE)](#autonomous-ai-agent-tee)
4. [OnchainOS Integration Deep-Dive](#onchainos-integration-deep-dive)
5. [x402 Agent Economy](#x402-agent-economy)
6. [MCP Server Details](#mcp-server-details)
7. [Local Setup & Deployment](#local-setup--deployment)
8. [Live Endpoints & Infrastructure](#live-endpoints--infrastructure)

---

## The Problem & Our Solution

### The Problem
With the proliferation of AI trading agents and rapid deployment of meme coins on L2 networks, malicious actors deploy honeypots, hidden taxes, and toxic bytecode to drain liquidity. Existing DEX aggregators execute swaps blindly, and AI agents lack a standard, machine-readable protocol to verify token safety natively before engaging.

### The Solution: Shield Suite
We built a dual-layer security ecosystem:
1. **For Humans:** **ShieldSwap**, the first security-gated DEX Aggregator. If you attempt to swap a malicious token, the aggregator visually blocks the transaction with an interactive threat report.
2. **For Machines:** **ScanGuard MCP**, a native Model Context Protocol server that implements the **x402 monetization standard**. AI agents (like Claude or Cursor) can query this server to get instantaneous, programmatic token risk data.

---

## Ecosystem Components

The Shield Suite monorepo is divided into three highly integrated packages:

### 1. ScanGuard (`packages/scanguard`)
The brain of the operation. A Node.js backend that serves as both a RESTful API and a standard **MCP Server**. 
- Executes **Dual-Layer Scanning**: Combines `okx-security` APIs with a custom bytecode heuristics engine.
- Manages the **x402 Payment Loop**, requiring micro-payments for access to its intelligence.

### 2. ShieldSwap (`packages/shieldswap`)
A glassmorphic, terminal-inspired frontend built in React/Vite.

<img width="1123" height="909" alt="14 04 2026_23 26 10_REC" src="https://github.com/user-attachments/assets/da2dc17f-4dc9-454f-a2cb-8bccdf66daa6" />


- Integrates `okx-dex-swap` to route trades across 500+ liquidity sources on XLayer, guaranteeing optimal routing.
- Features a conversational **AI Agent Chatbot** seamlessly integrated directly into the trading UI, allowing users to scan tokens and stage trades using natural language.

### 3. Agent Dashboard (`packages/dashboard`)
A real-time command center for monitoring the entire ecosystem.
- Provides a live, WebSocket-style data stream of all tokens being actively scanned across the network.
- Cryptographically tracks the live balances and on-chain heartbeat activity of the autonomous scanning agent.

---

## Autonomous AI Agent (TEE)

We have deployed an autonomous Node.js agent running 24/7 on a VPS. It continuously invokes the ScanGuard API to monitor the top 11 XLayer core tokens (WOKB, USDC, USDT, USDe, etc.) for emerging threats.

- **Institutional Security:** Utilizes the `okx-agentic-wallet` backed by a **Trusted Execution Environment (TEE)**. The private key is strictly isolated and never exposed to the application runtime, rendering it immune to memory-dump attacks.
- **Onchain Checkpoints:** Emits a literal `0 OKB` transaction on the XLayer ledger periodically. Attached to the transaction data is a UTF-8 encoded metadata string (`"ScanGuard Cycle Success"`), acting as an immutable public heartbeat proving the agent's uptime.

---

## OnchainOS Integration Deep-Dive

Our application deeply leverages the OKX OnchainOS ecosystem to provide unparalleled routing and analytical capabilities. Because building AI infrastructure requires scalable underlying primitives, we orchestrated the following Skills:

| SDK Module | Implementation Details |
|------------|------------------------|
| `okx-security` | Powers the core threat-detection engine. Checks for honeypot traits, hardcoded buy/sell taxes, contract authorship, and dynamically scores risk parameters. |
| `okx-dex-swap` | Used in our ShieldSwap frontend to generate highly optimized, low-slippage trade execution call data natively across all aggregated XLayer DEXs. |
| `okx-dex-token` | Provides real-time token metadata, market caps, dynamically fetching token logos, standardizing decimal formats, and validating address formats. |
| `okx-agentic-wallet`| Manages the complex lifecycle of the Autonomous Bot, ensuring transactions are constructed correctly and pushed through securely via enclave signing. |
| `okx-x402-payment` | Facilitates the cryptographic verification and conceptual architecture for streaming micropayments from client agents. |

---

## x402 Agent Economy

ScanGuard pioneers a monetized API standard for AI agents via [x402 Payment Required](https://www.x402.org):

1. **Request:** An external AI agent calls `POST /api/scan` without authorization.
2. **Denial:** Server returns `HTTP 402 Payment Required` with instructions to pay $0.005 USDC.
3. **Payment:** The agent signs and broadcasts the stablecoin transaction natively on XLayer.
4. **Verification:** The agent retries the request providing `X-402-Payment: <signed-receipt>`.
5. **Fulfillment:** The server confirms the on-chain transfer and returns the highly valuable security report.

*(Note: In the live demo environment, the protocol operates in "LIVE Subsidized" mode to prevent endlessly draining the agent's real USDC funds over a continuous 24/7 uptime window, while openly logging the gross revenue metrics on the Dashboard).*

---

## Model Context Protocol (MCP)

ScanGuard exposes an HTTP MCP server that any standard AI client can query natively to give them "XLayer vision".

### Calling the MCP Tool natively via cURL
```bash
curl -X POST http://38.49.216.120:3402/mcp/tools/call \
  -H "Content-Type: application/json" \
  -d '{"name":"scan_token","arguments":{"tokenAddress":"0x779ded0c9e1022225f8e0630b35a9b54be713736"}}'
```

### Config Template
```json
{
  "mcpServers": {
    "scanguard": {
      "url": "http://38.49.216.120:3402/mcp",
      "description": "Native security scanning for ERC-20 tokens on XLayer"
    }
  }
}
```
*(Desktop environments using `stdio` require standard bridging adapters).*

---

## Local Setup & Deployment

### Prerequisites
- Node.js >= 18
- OKX Web3 API credentials (`OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`)
- `onchainos` CLI installed globally

### 1. Installation
```bash
git clone https://github.com/mrnetwork0001/ShieldSuite.git
cd shield-suite
npm install
```

### 2. Environment Variables
Create a root `.env` file (do not commit this):
```env
OKX_API_KEY=your_key
OKX_SECRET_KEY=your_secret
OKX_PASSPHRASE=your_passphrase
PORT=3402
NODE_ENV=development
```

### 3. Start the Ecosystem
```bash
npm run dev
```
This single command orchestrates:
- The Backend / API (Port `3402`)
- The ShieldSwap DEX Workspace (Port `5173`)
- The ScanGuard Data Dashboard (Port `5174`)

---

## Live Endpoints & Infrastructure

- **Network:** XLayer Mainnet (`Chain ID 196`)
- **ShieldSwap Application:** [https://shieldswap-main.vercel.app](https://shieldswap-main.vercel.app)
- **ScanGuard Dashboard:** [https://scanguard-dashboard-main.vercel.app](https://scanguard-dashboard-main.vercel.app)
- **Central API Node & MCP Host:** `http://38.49.216.120:3402`
- **TEE Agent Identity (XLayer):** `0x821b9cc6a54272d0b5b106416fe360c162f2af85`

---
## Contact & Socials
- **Developer:** mrnetwork0001
- **Email:** emma40mike@gmail.com
- **X (Twitter):** [@encrypt_wizard](https://x.com/encrypt_wizard)

---
*Built defensively. Executed autonomously.*

