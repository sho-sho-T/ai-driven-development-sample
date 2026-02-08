---
issueNumber: <number>
taskNumber: <number>
status: todo
branchName: feat/issue-<issue>-task-<task>
worktreePath: .worktrees/issue-<issue>-task-<task>
---

# Context
<!-- この Task が解決する問題 -->

# Implementation Steps
1. ...
2. ...
3. ...

# Files to Change
- `packages/modules/xxx/write/...`
- `apps/web/src/routes/...`

# Verification
- [ ] `mise run lint` パス
- [ ] `bun test` パス（該当テストがある場合）
- [ ] 手動確認項目（該当する場合）

# Commit Plan
- `feat(xxx): <description>`
