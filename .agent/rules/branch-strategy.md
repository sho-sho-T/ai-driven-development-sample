# Branch Strategy

## Naming

- 形式: `feat/issue-{issue-number}-task-{task-number}`
- 例: `feat/issue-123-task-1`

## Rules

- main への直接 push は禁止
- すべての変更は feature ブランチで行う
- feature ブランチは Worktree 経由で作成する
- マージ後のブランチは削除する

## Worktree Path

- 形式: `.worktrees/issue-{issue-number}-task-{task-number}`
- ルートの `.gitignore` に `.worktrees/` を追加する
