---
issueNumber: 1
taskNumber: 7
status: done
branchName: feat/issue-1-task-7
worktreePath: .worktrees/issue-1-task-7
---

# Context

`.agent/commands/*.md` を `aidd` CLI 利用前提の手順に更新し、セットアップ手順と運用ランブックの実行例を更新する。

# Implementation Steps

1. `.agent/commands/issue-plan.md` を更新:
   - `aidd issue plan <issue-number>` の呼び出しを手順に組み込む
2. `.agent/commands/task-run.md` を更新:
   - `aidd task run <issue> <task>` の呼び出しに変更
   - 手動 Worktree 作成手順を `aidd wt ensure` に置き換え
3. `.agent/commands/task-done.md` を更新:
   - `aidd task done <issue> <task>` の呼び出しに変更
4. `.agent/commands/pr-create.md` を更新:
   - `aidd pr create <issue> <task>` の呼び出しに変更
5. セットアップ手順の追加:
   - `cargo install --path tools/aidd` または `cargo build --release` の手順
6. `.claude/commands/` 配下も同様に更新（存在する場合）

# Files to Change

- `.agent/commands/issue-plan.md`
- `.agent/commands/task-run.md`
- `.agent/commands/task-done.md`
- `.agent/commands/pr-create.md`
- `.claude/commands/` 配下（該当ファイル）
- `docs/ai-driven-development-setup.md`（セットアップ手順追加）

# Verification

- [ ] 各コマンドファイルに `aidd` の呼び出し手順が記載されている
- [ ] 手動代替手順も残されている（`aidd` 未導入時のフォールバック）
- [ ] `mise run lint` パス

# Commit Plan

- `docs(aidd): update command docs and setup instructions for Rust CLI`
