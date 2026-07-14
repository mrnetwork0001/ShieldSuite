# ShieldSuite A2A daemon (Railway)

Runs the OKX **agent-to-agent (A2A)** daemon 24/7 so the **Pitchside AI** marketplace
listing (service #30903) stays reachable independently of any personal machine. Deploy as a
**new, separate Railway service** in the same project as the ScanGuard API.

## Where this fits in the stack

| Component | Role | Where it runs |
|---|---|---|
| ScanGuard (A2MCP / API) | Security scan endpoint, pay-per-call | `@shield-suite/scanguard` (already live) |
| Pitchside AI **Scout** | Autonomous trading engine (watches matches, trades PlayerDex) | `@shield-suite/agent` (already live) |
| Pitchside AI **A2A listing** | Lets another agent **hire** Pitchside via the OKX task marketplace | **this service** (new) |

The Scout runs fine without this. This daemon only serves the *marketplace* side: it listens on
the XMTP network for inbound task requests and dispatches them to the AI provider. It connects
**outbound** to XMTP, so it needs **no public port/domain** — it's a background worker.

Agent: **ShieldSuite** `#4959` · communicationAddress `0xE8920DB7F4BbC7C0FC2CcA9bC75095429Aa314b1`

## Deploy

1. **New Service → same Railway project → Deploy from Repo**, root directory `deploy/a2a`
   (uses the `Dockerfile` here). No Nixpacks.
2. **Do NOT generate a domain** — the daemon does not listen for HTTP.
3. **Restart policy:** Always.

## Environment variables

Promote these to **project Shared Variables** (they already exist on `scanguard`, except the
Anthropic key) and attach them to this service:

| Var | Purpose | Have it? |
|---|---|---|
| `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` | Non-interactive OKX login (no email+OTP). **Must be generated from the same OKX account that owns agent #4959.** | ✅ on scanguard |
| `ANTHROPIC_API_KEY` | Auths the Claude Code CLI headlessly so the agent can generate replies | ❌ add this |

## Persistent volume

Mount a Railway volume at **`/root/.okx-agent-task`** so daemon state survives redeploys.

## XMTP identity — likely NO manual copy needed

The agent's XMTP key is server-managed (it has a `keyUuid`, and `agent refresh` reports
`activeClients=1`). On first boot the daemon logs into the same OKX account and re-establishes
the same client — so the `communicationAddress` should come back as `0xE892…14b1` on its own.

**Verify on first boot:** check the daemon logs / run `onchainos agent get-my-agents` and confirm
the communicationAddress still reads `0xE892…14b1`.
- Matches → done.
- Differs → restore the fallback snapshot (`okx-agent-task-identity.tgz`, produced during setup)
  into the volume at `/root/.okx-agent-task`, then redeploy.

**Run in exactly ONE place.** Once the Railway daemon is healthy, stop the local Mac daemon
(`okx-a2a stop`) so two installations aren't both answering for the same agent.

## Provider quality (follow-up, not blocking)

Out of the box the daemon dispatches hires to a *generic* Claude subsession, not the Pitchside
brain. Point it at `pitchside_ai_master_prompt.md` (repo root) so hires are fulfilled with real
Scout intelligence. Do this after the daemon is confirmed reachable.
