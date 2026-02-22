---
issueNumber: 11
taskNumber: 1
status: done
branchName: feat/issue-11-task-1
worktreePath: .worktrees/issue-11-task-1
---

# Context
`aidd deploy` を実行すると Supabase マイグレーションと TanStack Start デプロイが順に実行される

# Implementation Steps
1. Analyze requirements from the task description
2. Implement the changes
3. Add tests where applicable

# Files to Change
- tools/aidd/src/cli.rs
- tools/aidd/src/commands/deploy.rs
- tools/aidd/src/commands/mod.rs
- tools/aidd/src/main.rs
- tools/aidd/tests/cli_test.rs
- apps/web/vite.config.ts
- apps/web/wrangler.toml
- apps/web/package.json
- mise.toml
- .env.sample

# Verification
- [x] `mise run lint` パス
- [x] `bun test` パス（該当テストがある場合）
- [x] `cargo build --release` パス
- [x] `aidd deploy --help` でヘルプ表示確認

# Commit Plan
- `feat(issue-11): task 1 - `aidd deploy` を実行すると Supabase マイグレーションと TanStack Start デプロイが順に実行される`
