---
issueNumber: 1
taskNumber: 2
status: done
branchName: feat/issue-1-task-2
worktreePath: .worktrees/issue-1-task-2
---

# Context

`aidd wt ensure` と `aidd wt remove` を実装する。これは Worktree 自動化の中核コマンドであり、冪等に動作する必要がある。既存の `aidd.sh` の `cmd_wt_ensure` / `cmd_wt_remove` のロジックを Rust に移植する。

# Implementation Steps

1. `tools/aidd/src/commands/wt.rs` モジュールを作成
2. `wt ensure` の実装:
   - ブランチ存在確認（`git branch --list`）
   - Worktree 存在確認（ディレクトリチェック）
   - Worktree 作成（`git worktree add`）
   - 依存インストール（`mise install` + `bun install`）
   - `.env` コピー（存在する場合）
   - 冪等性: 既存 Worktree がある場合はパスを返して終了
3. `wt remove` の実装:
   - Worktree 削除（`git worktree remove --force`）
   - ローカルブランチ削除（`git branch -d`、マージ済みの場合のみ）
4. ヘルパー関数の共通化:
   - `branch_name(issue, task) -> String`
   - `worktree_path(issue, task) -> PathBuf`
   - `repo_root() -> PathBuf`
5. ユニットテスト（パス生成・ブランチ名生成）

# Files to Change

- `tools/aidd/src/commands/mod.rs`（新規）
- `tools/aidd/src/commands/wt.rs`（新規）
- `tools/aidd/src/helpers.rs`（新規 - 共通ヘルパー）
- `tools/aidd/src/main.rs`（コマンド接続）

# Verification

- [ ] `cargo run -- wt ensure 999 1` で Worktree が作成される
- [ ] 再実行時に冪等に動作する（エラーにならない）
- [ ] `cargo run -- wt remove 999 1` で Worktree が削除される
- [ ] `cargo test` パス
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): implement wt ensure and wt remove commands`
