#!/usr/bin/env bash
# Do NOT use `set -e` here: several steps (login, doctor) may return non-zero
# transiently, and we want to LOG the reason and keep going, not die silently.
set -uo pipefail

log() { echo "[start-a2a] $*"; }

# --- Non-interactive OKX session (OKX_API_KEY / OKX_SECRET_KEY / OKX_PASSPHRASE) ---
log "OKX wallet login (non-interactive)..."
LOGIN_OUT="$(onchainos wallet login 2>&1)" || true
echo "$LOGIN_OUT"
if echo "$LOGIN_OUT" | grep -q '"ok":true'; then
  log "OKX wallet login OK"
else
  log "WARNING: OKX wallet login did not report success — check OKX_API_KEY/OKX_SECRET_KEY/OKX_PASSPHRASE belong to the agent's owning account."
fi

# --- Provider + permissions (headless) ---
log "configuring AI provider (claude, via ANTHROPIC_API_KEY)..."
okx-a2a config provider --provider claude 2>&1 || log "WARNING: 'config provider' returned non-zero"
okx-a2a config permissions --preset bypass 2>&1 || log "WARNING: 'config permissions' returned non-zero"

# --- Repair/verify loop — LOG the full doctor JSON so failures are visible ---
# doctor --fix repairs what it can (daemon start, plugins, XMTP warm-up) but
# CANNOT fix a missing credential (e.g. ANTHROPIC_API_KEY) — if it never reaches
# ready, the printed JSON's failing check + nextActions tell us exactly why.
attempt=0
while true; do
  attempt=$((attempt + 1))
  DOCTOR_OUT="$(okx-a2a doctor --fix --non-interactive --json 2>&1)" || true
  echo "----- doctor attempt ${attempt} -----"
  echo "$DOCTOR_OUT"
  echo "-----------------------------------"
  if echo "$DOCTOR_OUT" | grep -q '"ready":true'; then
    break
  fi
  log "environment not ready (attempt ${attempt}) — see the doctor JSON above (look at failing checks / nextActions). Retrying in 30s..."
  sleep 30
done

log "environment ready — starting daemon in foreground"
# Foreground process keeps the Railway service alive; Railway restarts it if it exits.
exec okx-a2a run
