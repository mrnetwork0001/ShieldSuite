# 🔄 ShieldSwap & Pitchside AI — Dynamic World Cup Speculation & DEX Aggregator

> **X Layer X Cup Hackathon Submission — Built on X Layer Testnet / Mainnet**

**ShieldSwap** is a premium, security-first DEX aggregator and sports speculation platform. It consists of the core **ShieldSwap Aggregator** (which routes swaps safely via OKX OnchainOS) and **Pitchside AI** (the World Cup autonomous speculation loop). 

---

## 🎯 How It Works

```
1. User deposits USDT/USDC into the No-Loss Vault
2. User delegates Scout Credits (yield) to the TEE Scout Agent
3. AI Agent monitors real-time World Cup matches
4. Match events trigger sentiment analysis
5. Agent calls ScanGuard to verify the player share token bytecode
6. If safe, Agent executes the swap on PlayerDex using delegated credits
7. All transaction receipts are shown live in the Scout Console
```

---

## ✨ Features

- **No-Loss Staking Vault** — Stake stablecoins, keep 100% of your principal, and earn virtual Scout Credits to fund speculation.
- **Dynamic Player Index Market** — Buy/Sell dynamic player shares whose prices update on-chain based on real-world FIFA ratings and World Cup performances.
- **Autonomous TEE Agent Trader** — Let a secure, TEE-protected agent scout news, analyze sentiment, verify safety, and trade index tokens on your behalf.
- **ScanGuard Bytecode Verification** — Automatic security scans prevent agents from executing swaps on honeypots or malicious tokens.
- **Real-Time Scout Console** — Live logs showing the AI Scout's decision-making flow and transaction confirmations.
- **Agent Chat Interface** — A natural language copilot allowing you to scan contracts, execute swaps, and interact using conversational prompts.
- **Premium Glassmorphic UI** — High-end dark mode design featuring interactive glow cards, ticker animations, and smooth transitions.

---

## 🏗️ Folder Structure

```
packages/shieldswap/src/
├── components/
│   ├── VaultPanel.tsx     → No-loss vault staking interface
│   ├── PlayerMarket.tsx   → World Cup speculation board
│   ├── ScoutConsole.tsx   → AI Scout real-time logs terminal
│   ├── AgentChat.tsx      → Conversational AI copilot interface
│   ├── SwapCard.tsx       → Core DEX Aggregator swap card
│   └── RiskReport.tsx     → Animated security scan report
├── hooks/
│   ├── useScanGuard.ts    → Calls ScanGuard API
│   └── useSwap.ts         → Swap quoting & execution
└── lib/
    ├── wallet.ts          → Wallet connection & provider logic
    └── xlayer.ts          → X Layer chain metadata
```

---

## 🚀 Quick Start

1. Start from the monorepo root:
```bash
npm install
```

2. Boot all development servers (Backend, Dashboard, Frontend, and TEE Agent):
```bash
npm run dev
```

3. Open `http://localhost:5173` to interact with ShieldSwap & Pitchside AI.

---

## 📄 License

MIT — Expanded for the X Layer X Cup Hackathon (May 19 - May 28, 2026).
