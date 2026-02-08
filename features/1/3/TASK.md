---
issueNumber: 1
taskNumber: 3
status: done
branchName: feat/issue-1-task-3
worktreePath: .worktrees/issue-1-task-3
---

# Context

`aidd issue plan` を実装する。`gh issue view` で Issue 情報を取得し、`.agent/templates/PLAN.md` と `.agent/templates/TASK.md` をベースに `features/<issue>/PLAN.md` と `features/<issue>/<task>/TASK.md` を生成する。

# Implementation Steps

1. `tools/aidd/src/commands/issue.rs` モジュールを作成
2. `gh issue view <N> --json number,title,body,labels,assignees` を実行して Issue 情報を取得
3. JSON レスポンスをパース（`serde_json`）
4. Issue の body からタスクリスト（チェックボックス）を抽出
5. `.agent/templates/PLAN.md` テンプレートを読み込み、frontmatter とセクションを埋めて `features/<issue>/PLAN.md` を生成
6. タスクごとに `.agent/templates/TASK.md` をベースに `features/<issue>/<task>/TASK.md` を生成
7. `features/<issue>/` ディレクトリの自動作成

# Files to Change

- `tools/aidd/src/commands/issue.rs`（新規）
- `tools/aidd/src/commands/mod.rs`（更新）
- `tools/aidd/src/main.rs`（コマンド接続）
- `tools/aidd/Cargo.toml`（`serde_json` 追加）

# Verification

- [ ] `cargo run -- issue plan 1` で `features/1/PLAN.md` が生成される
- [ ] 生成された PLAN.md の frontmatter が正しい
- [ ] `cargo test` パス
- [ ] `mise run lint` パス

# Commit Plan

- `feat(aidd): implement issue plan command`
