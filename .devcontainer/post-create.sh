#!/bin/bash
set -euo pipefail

echo "=== post-create.sh: Starting initial setup ==="

WORKSPACE="/workspace"

# ---------------------------------------------------
# 1. Fix ownership of volume mounts
# ---------------------------------------------------
echo "--- Fixing volume mount ownership ---"
# Volume mounts create parent dirs as root. Fix the entire tree so vscode user can write.
sudo chown -R vscode:vscode /home/vscode/.local 2>/dev/null || true
sudo chown -R vscode:vscode /home/vscode/.claude 2>/dev/null || true
sudo chown -R vscode:vscode /home/vscode/.config 2>/dev/null || true
sudo chown -R vscode:vscode "${WORKSPACE}/node_modules" 2>/dev/null || true

# ---------------------------------------------------
# 2. Install mise (if not already installed)
# ---------------------------------------------------
echo "--- Installing mise ---"
if ! command -v mise &>/dev/null; then
  curl -fsSL https://mise.run | sh
fi
export PATH="$HOME/.local/bin:$PATH"

# ---------------------------------------------------
# 3. Trust and install tools via mise
# ---------------------------------------------------
echo "--- Installing tools via mise ---"
mise trust --all
mise install

# Add mise shims to PATH for this script
export PATH="$HOME/.local/share/mise/shims:$PATH"

# ---------------------------------------------------
# 4. Install dependencies via bun
# ---------------------------------------------------
echo "--- Installing dependencies ---"
if command -v bun &>/dev/null; then
  bun install
else
  echo "WARN: bun not found after mise install, skipping dependency install"
fi

# ---------------------------------------------------
# 5. Install AI development tools
# ---------------------------------------------------
echo "--- Installing Claude Code ---"
curl -fsSL https://claude.ai/install.sh | bash

echo "--- Installing Codex ---"
npm install -g @openai/codex

# ---------------------------------------------------
# 6. Configure shell (bashrc)
# ---------------------------------------------------
echo "--- Configuring shell ---"
BASHRC="$HOME/.bashrc"
MARKER="# === ai-driven-development-sample ==="

if ! grep -q "$MARKER" "$BASHRC" 2>/dev/null; then
  cat >> "$BASHRC" << 'SHELL_CONFIG'

# === ai-driven-development-sample ===
# mise: add shims to PATH (makes all mise-managed tools available)
export PATH="$HOME/.local/share/mise/shims:$HOME/.local/bin:$PATH"

# mise completion
eval "$(~/.local/bin/mise completion bash 2>/dev/null || true)"

# bun completion
if command -v bun &>/dev/null; then
  eval "$(bun completions bash 2>/dev/null || true)"
fi

# aliases
alias mr="mise run"
alias m="mise"
# === end ai-driven-development-sample ===
SHELL_CONFIG
fi

# ---------------------------------------------------
# 7. Git safe.directory
# ---------------------------------------------------
echo "--- Configuring git ---"
git config --global --add safe.directory "${WORKSPACE}"

# ---------------------------------------------------
# 8. Run local customization script (if exists)
# ---------------------------------------------------
if [ -f ".devcontainer/post-create.local.sh" ]; then
  echo "--- Running post-create.local.sh ---"
  bash .devcontainer/post-create.local.sh
fi

echo "=== post-create.sh: Setup complete ==="
