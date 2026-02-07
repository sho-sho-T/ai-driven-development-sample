#!/bin/bash
set -uo pipefail

echo "=== post-start.sh: Starting services ==="

# Ensure mise is on PATH
export PATH="$HOME/.local/bin:$PATH"
eval "$(mise activate bash 2>/dev/null || true)"

# ---------------------------------------------------
# 1. Check Docker access
# ---------------------------------------------------
echo "--- Checking Docker access ---"
if ! docker info &>/dev/null; then
  echo "WARN: Docker is not accessible. Supabase services will not start."
  echo "WARN: You can still develop without Supabase. Run 'supabase start' manually later."
  exit 0
fi

# ---------------------------------------------------
# 2. Start Supabase services
# ---------------------------------------------------
echo "--- Starting Supabase ---"
if command -v supabase &>/dev/null; then
  if supabase start 2>&1; then
    echo ""
    echo "=== Supabase services are running ==="
    echo "  Studio:   http://localhost:54323"
    echo "  API:      http://localhost:54321"
    echo "  DB:       postgresql://postgres:postgres@localhost:54322/postgres"
    echo "  Inbucket: http://localhost:54324"
    echo ""
  else
    echo "WARN: supabase start failed. You can retry manually with 'supabase start'."
  fi
else
  echo "WARN: supabase CLI not found. Run 'mise install' first."
fi

echo "=== post-start.sh: Done ==="
