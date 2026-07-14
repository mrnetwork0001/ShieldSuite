# A2A daemon service for ShieldSuite (Pitchside AI / agent-to-agent)
# Deploy as a SEPARATE Railway service in the same project as the ScanGuard API.
# This is a background worker — it needs NO public port/domain (XMTP is outbound).

FROM node:22-slim

# System deps: onchainos installer (curl/bash) + sha256 verify + the native binary's runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates bash coreutils \
    && rm -rf /var/lib/apt/lists/*

# AI provider CLI (Claude Code) + OKX A2A daemon — both from npm
RUN npm i -g @anthropic-ai/claude-code@latest @okxweb3/a2a-node@latest

# onchainos native CLI via OKX's official installer (same one you ran locally).
# The installer detects the Linux platform, downloads the matching release binary,
# verifies its SHA256 against the release checksums.txt, and installs to ~/.local/bin.
# It is non-interactive and safe to pipe in a build. (Add `-s -- --beta` for pre-releases.)
RUN curl -sSL https://raw.githubusercontent.com/okx/onchainos-skills/main/install.sh | sh
ENV PATH="/root/.local/bin:${PATH}"

WORKDIR /app
COPY start-a2a.sh /app/start-a2a.sh
RUN chmod +x /app/start-a2a.sh

CMD ["/app/start-a2a.sh"]
