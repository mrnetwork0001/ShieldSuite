# 🔄 ShieldSwap — Security-First DEX Aggregator

> **X Layer Build X Season 2 AI Hackathon — X Layer Arena Submission**

ShieldSwap is a premium, security-first DEX aggregator that **scans every token for threats before allowing a swap**. Paste a token address → ShieldSwap calls [ScanGuard](#) to verify the token is safe → if safe, executes the swap → if risky, blocks the swap and shows a detailed threat report.

---

## 🎯 How It Works

```
1. User pastes token address + swap amount
2. ShieldSwap calls ScanGuard API (POST /api/scan)
3. ScanGuard analyzes the contract on-chain
4. Results displayed:
   ✅ SAFE  → Swap enabled, user can proceed
   ⚠️ RISKY → Warning shown, swap allowed with caution
   🚫 DANGER → Swap BLOCKED, detailed threat report shown
5. If safe: swap executes via Uniswap/DEX aggregation on X Layer
```

## ✨ Features

- **AI-Powered Token Scanning** — Every token verified before trading via ScanGuard MCP
- **Risk Score Visualization** — Animated SVG ring with 0–100 score and color-coded severity
- **Threat Report** — Detailed breakdown of detected risks with evidence
- **Swap Blocking** — High-risk tokens are automatically blocked from trading
- **Agent Activity Log** — Real-time feed of scan decisions and swap activity
- **Glassmorphism UI** — Premium dark mode design with blur effects and micro-animations
- **X Layer Native** — Built specifically for X Layer (Chain ID: 196) with OKB gas
- **Wallet Integration** — MetaMask / OKX Wallet with auto chain switching

## 🚀 Quick Start

```bash
# From the monorepo root
npm install

# Start ScanGuard backend first
npm run dev:scanguard

# In another terminal, start ShieldSwap
npm run dev:shieldswap

# Open http://localhost:5173
```

## 🎨 Design System

| Token | Value |
|-------|-------|
| Background | `#0A0E17` (deep space) |
| Card | `#12172B` + glassmorphism blur |
| Safe | `#00FF88` (neon green) |
| Danger | `#FF3B5C` (alert red) |
| Interactive | `#4B7BF5` (electric blue) |
| UI Font | Inter (300–900) |
| Data Font | JetBrains Mono |

## 🏗️ Architecture

```
ShieldSwap Frontend (Vite + React)
├── components/
│   ├── Header.tsx      → Logo, wallet connect, chain status
│   ├── SwapCard.tsx    → Main swap interface with multi-stage flow
│   ├── TokenInput.tsx  → Address input with validation & quick-select
│   └── RiskReport.tsx  → Animated risk score & threat flags
├── hooks/
│   ├── useScanGuard.ts → Calls ScanGuard API
│   └── useSwap.ts      → Swap quoting & execution
└── lib/
    ├── xlayer.ts       → X Layer chain config
    └── wallet.ts       → Wallet connection logic
```

## 📱 Screenshots

_Coming soon — deploy in progress_

## 📄 License

MIT — Built for the X Layer Build X Season 2 AI Hackathon
