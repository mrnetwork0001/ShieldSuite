# 🏆 Implementation Plan — Hackathon Victory Sprint

## Goal
Implement 8 high-impact features to maximize scoring across all 4 judging criteria (25% each) and qualify for multiple special prizes ($500 USDT each, stackable).

---

## Workstream 1: Uniswap Integration (Scoring: 25% criterion)

### 1A. Uniswap Liquidity Check in ScanGuard

**What:** When scanning a token, query Uniswap V3 Factory on X Layer to check if a pool exists and how much liquidity it has. Display "Uniswap V3 Liquidity: $X" in scan results.

**Technical approach:**
- Uniswap V3 Factory uses deterministic CREATE2 addresses: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- Call `factory.getPool(tokenA, tokenB, fee)` with WOKB/USDT as paired token
- If pool exists, call `pool.slot0()` for price and `pool.liquidity()` for active liquidity
- Add a `uniswapLiquidity` field to `ScanResult` type
- Show as a new "Liquidity" row in RiskReport and as a scan flag

#### [MODIFY] [scanner.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/scanner.ts)
- Add `checkUniswapLiquidity(tokenAddress, provider)` function
- Call it during the scan pipeline (after bytecode checks)
- Add liquidity data to scan result

#### [MODIFY] [types.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/types.ts)
- Add `uniswapLiquidity: string | null` and `uniswapPoolAddress: string | null` to `ScanResult`

#### [MODIFY] [RiskReport.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/components/RiskReport.tsx)
- Display Uniswap liquidity row with Uniswap logo/brand color

---

### 1B. Uniswap Quote Comparison in ShieldSwap

**What:** After fetching the OKX DEX quote, also fetch a Uniswap Quoter quote and display both with a "Best Route" indicator.

**Technical approach:**
- Uniswap V3 QuoterV2: `0x61fFE014bA17989E743c5F6cB21bF9697530B21e`
- Call `quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, 0)` as a static call
- Display "OKX DEX: X.XX" vs "Uniswap V3: X.XX" with checkmark on best
- If Uniswap has no pool, show "No Uniswap pool" gracefully

#### [NEW] [uniswap.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/uniswap.ts)
- Uniswap V3 Factory, QuoterV2 contract calls
- `getUniswapQuote()`, `checkUniswapPool()`, `getUniswapLiquidity()`

#### [MODIFY] [index.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/index.ts)
- Add `GET /api/dex/uniswap-quote` endpoint

#### [MODIFY] [SwapCard.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/components/SwapCard.tsx)
- Fetch Uniswap quote alongside OKX quote
- Display comparison UI with "Best Route" badge

---

## Workstream 2: AI Interactive Experience (Scoring: 25% criterion)

### 2A. AI Chat Interface

**What:** A chat bar at the bottom of ShieldSwap where users type natural language commands:
- "Is USDT safe?" → triggers scan
- "Scan 0x1E4a..." → triggers scan
- "Swap 10 USDC to OKB" → fills swap form and executes

**Technical approach:**
- Simple pattern matching (no LLM needed — we parse intent locally):
  - `/scan|check|safe|secure/i` → extract token name/address → trigger scan
  - `/swap|trade|buy|sell/i` → extract amount + tokens → fill form
  - `/help/i` → show available commands
- Floating chat pill at bottom-right, expands to input
- Shows agent responses in chat bubble style

#### [NEW] [AgentChat.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/components/AgentChat.tsx)
- Chat UI component with input bar and message history
- Intent parser function
- Integration with existing scan/swap hooks

#### [MODIFY] [App.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/App.tsx)
- Mount AgentChat component

---

### 2B. Agent "Thinking" Animation

**What:** When scanning, show a real-time step-by-step log in the Security Report:
```
[1/5] Checking contract bytecode...
[2/5] Reading ERC-20 metadata...
[3/5] Querying OKX Security API...
[4/5] Checking Uniswap V3 liquidity...
[5/5] Generating risk assessment...
```

**Technical approach:**
- Backend streams scan steps via response events OR frontend simulates based on timing
- Simplest: frontend shows animated steps with staggered delays before final result

#### [MODIFY] [RiskReport.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/components/RiskReport.tsx)
- Add scanning phase animation before result display

---

### 2C. Agent Recommendations

**What:** After scan: "🤖 Agent recommends: Token is safe. Best swap route: OKX DEX (0.01% price impact)"

#### [MODIFY] [RiskReport.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/shieldswap/src/components/RiskReport.tsx)
- Add recommendation section at bottom of report

---

## Workstream 3: Agent Economy & Activity (Special Prizes)

### 3A. Economy Loop

**What:** ShieldSwap adds 0.1% fee on swaps → Agent wallet earns → Pays for x402 scans

> [!IMPORTANT]
> This is primarily a **narrative/documentation** feature. We don't need to deploy a fee contract — we document the architecture and show the fee parameter in swap calldata.

#### [MODIFY] [README.md](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/README.md)
- Add "Economy Loop" architecture diagram

#### [MODIFY] [onchainos.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/onchainos.ts)
- Add `referrerAddress` parameter to swap calls (OKX DEX supports referral fees)

---

### 3B. Agent Activity (Automated Scanning)

**What:** A cron script that uses the agent wallet to scan top X Layer tokens periodically, generating on-chain x402 payment transactions.

> [!WARNING]
> This requires the agent wallet to have USDC/OKB for gas + x402 payments. The user needs to fund the wallet.

#### [NEW] [agent-cron.ts](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/scanguard/src/agent-cron.ts)
- Script that scans TOKEN_LIST tokens every N minutes
- Logs results to console + dashboard feed
- Each scan = 1 API call (visible in agent wallet history)

---

## Workstream 4: Dashboard & Polish

### 4A. X Layer Chain Stats on Dashboard

**What:** Show live block height, gas price, txn count on the ScanGuard dashboard header.

#### [MODIFY] [App.tsx](file:///c:/Users/IFEANYICHUKWU/OneDrive/Desktop/shield-suite/packages/dashboard/src/App.tsx)
- Add chain stats section (poll RPC every 15s)
- Display: Block #, Gas Price, Network Status

### 4B. Error Handling Polish

- Swap errors show user-friendly messages
- Network errors suggest checking VPN
- Scan timeouts show retry button

---

## Execution Order (Priority)

| Phase | Features | Time | Impact |
|-------|----------|------|--------|
| **1** | 1A (Uniswap liquidity in scans) | 2-3 hrs | Fills 25% scoring gap |
| **2** | 2A (AI chat interface) | 3-4 hrs | Fills 25% scoring gap |
| **3** | 2B + 2C (Thinking + Recommendations) | 1-2 hrs | Polish for AI criterion |
| **4** | 1B (Uniswap quote comparison) | 2-3 hrs | Bonus Uniswap points |
| **5** | 4A (X Layer chain stats) | 1 hr | Ecosystem integration |
| **6** | 3A + 3B (Economy loop + cron) | 2-3 hrs | Special prizes |
| **7** | 4B (Error handling) | 1 hr | Product completeness |

**Total: ~14-18 hours of work**

---

## Open Questions

> [!IMPORTANT]
> 1. **Uniswap on X Layer:** The Uniswap docs don't explicitly list X Layer in V3 deployments. The standard CREATE2 Factory (`0x1F98431c8aD98523631AE4a59f267346ea31F984`) may or may not exist on X Layer chain 196. We need to verify by checking bytecode at that address. If it doesn't exist, we'll use Uniswap's universal deployment or reference pools from OKX's internal routing.
>
> 2. **AI Chat:** Should we use a simple pattern matcher (fast, no dependencies) or integrate with an actual LLM API for natural language understanding? Pattern matcher is faster to build and has no API costs.
>
> 3. **Agent Wallet Funding:** To generate on-chain activity, the agent wallet `0x821b...` needs OKB for gas. Do you have funds in it?

## Verification Plan

### Automated Tests
- Test Uniswap liquidity check against known USDT/WOKB pair
- Test chat intent parser with sample commands
- Verify scan results include Uniswap data field

### Manual Verification
- Scan USDT → see Uniswap liquidity in report
- Type "Is USDT safe?" in chat → see scan trigger
- Check dashboard shows live block height
