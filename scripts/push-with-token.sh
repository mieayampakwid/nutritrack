#!/usr/bin/env bash
set -euo pipefail
# Usage: GH_TOKEN=ghp_xxxxxxxx ./scripts/push-with-token.sh
# Create a token: https://github.com/settings/tokens (classic: repo scope)

: "${GH_TOKEN:?Set GH_TOKEN to a GitHub personal access token}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GH_BIN="${GH_BIN:-$HOME/bin/gh}"

if [[ ! -x "$GH_BIN" ]]; then
  echo "gh not found at $GH_BIN. Install from https://cli.github.com/ or place gh there."
  exit 1
fi

echo "$GH_TOKEN" | "$GH_BIN" auth login --hostname github.com --with-token
"$GH_BIN" auth setup-git

cd "$ROOT"
git remote set-url origin https://github.com/bchnalz/nutritrack.git
git push --force-with-lease -u origin main
