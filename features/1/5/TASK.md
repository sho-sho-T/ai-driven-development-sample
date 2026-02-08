---
issueNumber: 1
taskNumber: 5
status: done
branchName: feat/issue-1-task-5
worktreePath: .worktrees/issue-1-task-5
---

# Context

`aidd pr create` と `aidd status` を実装する。`pr create` は PR 作成のみを行う単独コマンド、`status` は全 Issue/Task のステータス一覧を表示するコマンド。

# Implementation Steps

1. `tools/aidd/src/commands/pr.rs` モジュールを作成
2. `pr create` の実装:
   - ブランチを push（`git push -u origin <branch>`）
   - PR タイトルを `[TASK-<issue>-<task>] <latest-commit-summary>` 形式で生成
   - `gh pr create` を実行
3. `tools/aidd/src/commands/status.rs` モジュールを作成
4. `status` の実装:
   - `features/` ディレクトリを走査
   - 各 PLAN.md / TASK.md の frontmatter から status を読み取り
   - 一覧をフォーマットして表示

# Files to Change

- `tools/aidd/src/commands/pr.rs`（新規）
- `tools/aidd/src/commands/status.rs`（新規）
- `tools/aidd/src/commands/mod.rs`（更新）
- `tools/aidd/src/main.rs`（コマンド接続）

# Verification

- [ ] `cargo run -- pr create 1 1` で PR が作成される
- [ ] `cargo run -- status` でステータス一覧が表示される
- [ ] `cargo test` パス
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): implement pr create and status commands`
