---
issueNumber: 1
taskNumber: 4
status: done
branchName: feat/issue-1-task-4
worktreePath: .worktrees/issue-1-task-4
---

# Context

`aidd task run` と `aidd task done` を実装する。`task run` は Worktree 準備 + TASK.md 読み込み + status 更新を行い、`task done` は検証（lint/test）+ commit + PR 作成 + status 更新を行う。

# Implementation Steps

1. `tools/aidd/src/commands/task.rs` モジュールを作成
2. TASK.md の frontmatter パース機能を実装（`serde_yaml`）
3. `task run` の実装:
   - `features/<issue>/<task>/TASK.md` を読み込み
   - `wt ensure` を内部で呼び出して Worktree を準備
   - TASK.md の status を `doing` に更新
   - TASK.md の内容を標準出力に表示
4. `task done` の実装:
   - Worktree ディレクトリで `mise run lint` を実行
   - `bun test` を実行（失敗時は警告）
   - `git add -A && git commit` を実行
   - `git push -u origin <branch>` を実行
   - `gh pr create` を実行
   - TASK.md の status を `done` に更新
   - 全 Task 完了時に PLAN.md の status も `done` に更新

# Files to Change

- `tools/aidd/src/commands/task.rs`（新規）
- `tools/aidd/src/commands/mod.rs`（更新）
- `tools/aidd/src/frontmatter.rs`（新規 - frontmatter パース）
- `tools/aidd/src/main.rs`（コマンド接続）

# Verification

- [ ] `cargo run -- task run 1 1` で TASK.md が読み込まれ status が `doing` に変わる
- [ ] `cargo run -- task done 1 1` で lint/test/commit/PR が実行される
- [ ] TASK.md の status が `done` に更新される
- [ ] `cargo test` パス
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): implement task run and task done commands`
