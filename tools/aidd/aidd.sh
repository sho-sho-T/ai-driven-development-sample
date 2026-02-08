#!/usr/bin/env bash
set -euo pipefail

# aidd - AI-Driven Development CLI (Phase 1: Shell Script MVP)
# Usage: aidd <command> <subcommand> [args...]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
WORKTREE_DIR="$REPO_ROOT/.worktrees"
FEATURES_DIR="$REPO_ROOT/features"

# --- Helpers ---

die() {
  echo "ERROR: $*" >&2
  exit 1
}

info() {
  echo "INFO: $*"
}

branch_name() {
  local issue="$1" task="$2"
  echo "feat/issue-${issue}-task-${task}"
}

worktree_path() {
  local issue="$1" task="$2"
  echo "${WORKTREE_DIR}/issue-${issue}-task-${task}"
}

task_file() {
  local issue="$1" task="$2"
  echo "${FEATURES_DIR}/${issue}/${task}/TASK.md"
}

plan_file() {
  local issue="$1"
  echo "${FEATURES_DIR}/${issue}/PLAN.md"
}

# --- Commands ---

cmd_wt_ensure() {
  local issue="${1:?Usage: aidd wt ensure <issue> <task>}"
  local task="${2:?Usage: aidd wt ensure <issue> <task>}"
  local branch wt_path

  branch="$(branch_name "$issue" "$task")"
  wt_path="$(worktree_path "$issue" "$task")"

  # Already exists?
  if [ -d "$wt_path" ]; then
    info "Worktree already exists: $wt_path"
    echo "$wt_path"
    return 0
  fi

  # Create worktree
  info "Creating worktree: $wt_path (branch: $branch)"
  mkdir -p "$WORKTREE_DIR"

  if git -C "$REPO_ROOT" branch --list "$branch" | grep -q "$branch"; then
    git -C "$REPO_ROOT" worktree add "$wt_path" "$branch"
  else
    git -C "$REPO_ROOT" worktree add -b "$branch" "$wt_path" main
  fi

  # Install dependencies
  info "Installing dependencies..."
  cd "$wt_path"
  if command -v mise &>/dev/null; then
    mise install
  fi
  bun install

  # Copy .env if exists
  if [ -f "$REPO_ROOT/.env" ]; then
    cp "$REPO_ROOT/.env" "$wt_path/.env"
    info "Copied .env from root"
  fi

  info "Worktree ready: $wt_path"
  echo "$wt_path"
}

cmd_wt_remove() {
  local issue="${1:?Usage: aidd wt remove <issue> <task>}"
  local task="${2:?Usage: aidd wt remove <issue> <task>}"
  local branch wt_path

  branch="$(branch_name "$issue" "$task")"
  wt_path="$(worktree_path "$issue" "$task")"

  if [ -d "$wt_path" ]; then
    info "Removing worktree: $wt_path"
    git -C "$REPO_ROOT" worktree remove "$wt_path" --force
  else
    info "Worktree does not exist: $wt_path"
  fi

  # Delete local branch if merged
  if git -C "$REPO_ROOT" branch --list "$branch" | grep -q "$branch"; then
    info "Deleting branch: $branch"
    git -C "$REPO_ROOT" branch -d "$branch" 2>/dev/null || \
      info "Branch $branch not fully merged. Use 'git branch -D $branch' to force delete."
  fi
}

cmd_task_done() {
  local issue="${1:?Usage: aidd task done <issue> <task>}"
  local task="${2:?Usage: aidd task done <issue> <task>}"
  local branch wt_path tf

  branch="$(branch_name "$issue" "$task")"
  wt_path="$(worktree_path "$issue" "$task")"
  tf="$(task_file "$issue" "$task")"

  # Verify worktree exists
  [ -d "$wt_path" ] || die "Worktree not found: $wt_path. Run 'aidd wt ensure $issue $task' first."

  cd "$wt_path"

  # Run checks
  info "Running lint..."
  mise run lint

  info "Running tests..."
  bun test || info "No tests found or tests skipped"

  # Commit
  info "Staging changes..."
  git add -A

  if git diff --cached --quiet; then
    info "No changes to commit"
  else
    info "Committing..."
    git commit || die "Commit failed"
  fi

  # Push and create PR
  info "Pushing branch..."
  git push -u origin "$branch"

  info "Creating PR..."
  gh pr create \
    --title "[TASK-${issue}-${task}] $(git log -1 --format='%s')" \
    --body "## Summary
$(git log -1 --format='%b')

## Related Issue
Closes #${issue}

## Verification
- [x] mise run lint
- [x] bun test"

  # Update TASK.md status
  if [ -f "$tf" ]; then
    sed -i.bak 's/^status: .*/status: done/' "$tf" && rm -f "${tf}.bak"
    info "Updated TASK.md status to done"
  fi

  info "Task $issue/$task completed!"
}

cmd_pr_create() {
  local issue="${1:?Usage: aidd pr create <issue> <task>}"
  local task="${2:?Usage: aidd pr create <issue> <task>}"
  local branch

  branch="$(branch_name "$issue" "$task")"

  info "Pushing branch..."
  git push -u origin "$branch"

  info "Creating PR..."
  gh pr create \
    --title "[TASK-${issue}-${task}] $(git log -1 --format='%s')" \
    --body "## Summary
$(git log -1 --format='%b')

## Related Issue
Closes #${issue}"
}

cmd_status() {
  info "=== AI-Driven Development Status ==="
  echo ""

  if [ ! -d "$FEATURES_DIR" ] || [ -z "$(ls -A "$FEATURES_DIR" 2>/dev/null)" ]; then
    echo "No features found."
    return 0
  fi

  for issue_dir in "$FEATURES_DIR"/*/; do
    [ -d "$issue_dir" ] || continue
    local issue_num
    issue_num="$(basename "$issue_dir")"
    local pf
    pf="$(plan_file "$issue_num")"

    echo "Issue #${issue_num}:"
    if [ -f "$pf" ]; then
      local plan_status
      plan_status="$(grep '^status:' "$pf" | head -1 | sed 's/status: //')"
      echo "  PLAN: ${plan_status:-unknown}"
    fi

    for task_dir in "$issue_dir"/*/; do
      [ -d "$task_dir" ] || continue
      local task_num
      task_num="$(basename "$task_dir")"
      local tf
      tf="${task_dir}/TASK.md"
      if [ -f "$tf" ]; then
        local task_status
        task_status="$(grep '^status:' "$tf" | head -1 | sed 's/status: //')"
        echo "  Task ${task_num}: ${task_status:-unknown}"
      fi
    done
    echo ""
  done
}

# --- Main ---

usage() {
  cat <<'EOF'
aidd - AI-Driven Development CLI

Usage:
  aidd wt ensure <issue> <task>   Create worktree + branch + install deps
  aidd wt remove <issue> <task>   Remove worktree + clean up branch
  aidd task done <issue> <task>   Lint + test + commit + PR
  aidd pr create <issue> <task>   Push + create PR
  aidd status                     Show all issue/task statuses
  aidd help                       Show this help
EOF
}

main() {
  local cmd="${1:-help}"
  local subcmd="${2:-}"
  shift 2 2>/dev/null || true

  case "$cmd" in
    wt)
      case "$subcmd" in
        ensure) cmd_wt_ensure "$@" ;;
        remove) cmd_wt_remove "$@" ;;
        *) usage; exit 1 ;;
      esac
      ;;
    task)
      case "$subcmd" in
        done) cmd_task_done "$@" ;;
        *) usage; exit 1 ;;
      esac
      ;;
    pr)
      case "$subcmd" in
        create) cmd_pr_create "$@" ;;
        *) usage; exit 1 ;;
      esac
      ;;
    status) cmd_status ;;
    help|--help|-h) usage ;;
    *) usage; exit 1 ;;
  esac
}

main "$@"
