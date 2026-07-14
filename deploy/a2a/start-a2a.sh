#!/usr/bin/env bash
set -euo pipefail

# --- Non-interactive OKX session (reads OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE from env) ---
onchainos wallet login

# --- Provider + permissions, set non-interactively ---
okx-a2a config provider --provider claude          # Claude Code auths via ANTHROPIC_API_KEY
okx-a2a config permissions --preset bypass         # no interactive permission prompt in the subsession

# --- Repair/verify the A2A env without any login prompts; loop until ready ---
until okx-a2a doctor --fix --non-interactive --json | grep -q '"ready":true'; do
  echo "[start-a2a] environment not ready yet, retrying in 5s..."
  sleep 5
done

echo "[start-a2a] environment ready — starting daemon in foreground"
# Foreground process keeps the Railway service alive; Railway restarts it if it exits.
exec okx-a2a run
