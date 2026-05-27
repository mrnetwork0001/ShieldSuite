# Shield Suite — System Architecture

> Technical architecture document for X Layer X Cup Hackathon judges

## Overview

Shield Suite consists of two tightly integrated components:

1. **ScanGuard** — An MCP-compatible security scanning skill (backend)
2. **ShieldSwap** — A security-first DEX aggregator (frontend)

## Data Flow

```
User Action: "Swap 100 TOKEN_A for USDT"

1. User enters token address in ShieldSwap UI
2. ShieldSwap calls ScanGuard API:
   POST /api/scan { tokenAddress: "0x...", chainId: 196 }
   Header: X-402-Payment: <txHash or "demo">

3. ScanGuard x402 middleware verifies payment
4. Scanner engine connects to XLayer RPC
5. Scanner reads:
   - Contract bytecode (dangerous selectors, proxy patterns)
   - ERC-20 metadata (name, symbol, decimals, totalSupply)
   - Ownership status (owner(), renounced check)
   - Honeypot indicators (missing transfer/transferFrom)
   - Tax mechanisms (fee/tax patterns in bytecode)
   - Contract balance (liquidity indicator)

6. Scanner produces:
   - Risk score (0–100)
   - Risk level (SAFE / LOW / MEDIUM / HIGH / CRITICAL)
   - Array of RiskFlag objects with category, severity, evidence

7. Result returned to ShieldSwap
8. ShieldSwap displays:
   - If SAFE/LOW → Enable swap, show green indicators
   - If MEDIUM → Allow with warning
   - If HIGH/CRITICAL → BLOCK swap, show threat report

9. If swap approved → Execute via Uniswap Router on XLayer
10. Activity log records all agent decisions in real-time
```

## Security Scanning Checks

| # | Check | Method | Severity Range |
|---|-------|--------|---------------|
| 1 | EOA Detection | getCode() === "0x" | CRITICAL |
| 2 | Non-standard ERC-20 | name/symbol/decimals calls fail | HIGH |
| 3 | Active Ownership | owner() !== 0x0 | MEDIUM |
| 4 | Mint Functions | Bytecode selector 40c10f19 | HIGH |
| 5 | Blacklist Functions | Bytecode selector 44337ea1 | HIGH |
| 6 | Proxy/Delegatecall | Bytecode opcode f4 | MEDIUM |
| 7 | Missing transfer() | Selector a9059cbb absent | CRITICAL |
| 8 | Missing transferFrom() | Selector 23b872dd absent | HIGH |
| 9 | Tax Mechanisms | "fee"/"tax" strings in bytecode | MEDIUM |

## MCP Integration

ScanGuard exposes two MCP tools:

### `scan_token`
Full security analysis returning structured JSON.

### `get_risk_summary`
Human-readable text summary with emoji risk indicators.

Both tools are discoverable via `GET /mcp/tools` and invocable via `POST /mcp/tools/call`.

## x402 Protocol

The x402 payment flow:

```
Agent → POST /api/scan (no payment)
     ← 402 Payment Required + instructions

Agent → Sends $0.005 to payment address on XLayer

Agent → POST /api/scan + X-402-Payment: <txHash>
     ← 200 OK + scan result
```

In development mode, `X-402-Payment: demo` bypasses payment.

## Deployment Architecture

```
┌─────────────────┐     ┌──────────────────┐
│   Vercel/        │     │   Railway/        │
│   Netlify        │     │   Render          │
│                  │     │                   │
│   ShieldSwap     │ ──> │   ScanGuard       │
│   (Static SPA)   │     │   (Node.js API)   │
│   Port: 443      │     │   Port: 3402      │
└─────────────────┘     └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  XLayer RPC     │
                    │  (Chain 196)     │
                    └──────────────────┘
```

## Technology Decisions

| Decision | Rationale |
|----------|-----------|
| Express over Fastify | Simpler middleware model for x402 + MCP routing |
| ethers.js v6 | Best TypeScript support for EVM contract interaction |
| Vite + React | Fast builds, modern DX, excellent TypeScript support |
| Framer Motion | Production-grade animations for premium UX |
| npm workspaces | Zero-config monorepo without extra tools (Turborepo, Nx) |
| Bytecode analysis | On-chain verification without relying on third-party APIs |

