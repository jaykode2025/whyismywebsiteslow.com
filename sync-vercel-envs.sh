#!/usr/bin/env bash
set -euo pipefail

# sync-vercel-envs.sh
# Copies ALL Production env vars into Preview + Development.
# Requires: vercel CLI, project linked (vercel link), and access to Production env vars.

PROJECT_NAME="${1:-}" # optional: pass project name as first arg (not required if already linked)

echo "==> Checking Vercel CLI..."
command -v vercel >/dev/null 2>&1 || { echo "ERROR: vercel CLI not found. Install: npm i -g vercel"; exit 1; }

if [[ -n "$PROJECT_NAME" ]]; then
  echo "==> Linking to Vercel project: $PROJECT_NAME"
  vercel link --project "$PROJECT_NAME" --yes >/dev/null
else
  echo "==> Using currently linked Vercel project (from .vercel/project.json if present)."
fi

TMP_ENV="$(mktemp -t vercel-prod-env-XXXXXX)"
cleanup() { rm -f "$TMP_ENV"; }
trap cleanup EXIT

echo "==> Pulling Production env vars..."
# This writes key/value pairs to the temp file
vercel env pull "$TMP_ENV" --environment=production --yes >/dev/null

if [[ ! -s "$TMP_ENV" ]]; then
  echo "ERROR: Production env pull returned empty. Are you logged in and linked to the right project?"
  exit 1
fi

echo "==> Syncing Production -> Preview + Development (overwrite mode)..."

# Helper to add env var safely via stdin
add_env() {
  local name="$1"
  local env="$2"
  local value="$3"

  # Remove existing var in that environment (ignore failures)
  vercel env rm "$name" "$env" --yes >/dev/null 2>&1 || true

  # Add new value (stdin)
  printf "%s" "$value" | vercel env add "$name" "$env" >/dev/null
  echo "   ✔ $name -> $env"
}

# Parse .env file:
# - ignore comments/blank
# - support "export KEY=VALUE"
# - keep everything after first '=' as value
while IFS= read -r line || [[ -n "$line" ]]; do
  # trim leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  [[ -z "$line" ]] && continue
  [[ "$line" == \#* ]] && continue

  # Remove optional "export "
  if [[ "$line" == export\ * ]]; then
    line="${line#export }"
  fi

  # Must contain '='
  [[ "$line" != *"="* ]] && continue

  key="${line%%=*}"
  val="${line#*=}"

  # Strip surrounding quotes if present (simple cases)
  if [[ "$val" == \"*\" && "$val" == *\" ]]; then
    val="${val:1:${#val}-2}"
  elif [[ "$val" == \'*\' && "$val" == *\' ]]; then
    val="${val:1:${#val}-2}"
  fi

  # Skip empty keys
  [[ -z "$key" ]] && continue

  # Push to Preview + Development
  add_env "$key" "preview" "$val"
  add_env "$key" "development" "$val"

done < "$TMP_ENV"

echo
echo "==> Done. Verify:"
echo "    vercel env ls"
echo
echo "==> Redeploy Preview:"
echo "    vercel deploy"
echo
echo "==> Or deploy Production:"
echo "    vercel --prod"
