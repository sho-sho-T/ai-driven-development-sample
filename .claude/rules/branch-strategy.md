# Branch Strategy

## Naming

- 形式: `{prefix}/{issue-number}-{タスクの要約}`
- 例: `feat/123-add-library-registration`

### Prefix

| prefix | 用途 |
|--------|------|
| `feat` | 新機能 |
| `fix` | バグ修正 |
| `refactor` | リファクタリング |
| `test` | テスト追加・修正 |
| `docs` | ドキュメント変更 |
| `chore` | ビルド・CI 設定変更 |

## Rules

- main への直接 push は禁止
- すべての変更は feature ブランチで行う
- feature ブランチは Worktree 経由で作成する
- マージ後のブランチは削除する

## Worktree Path

- 形式: `.worktrees/{issue-number}-{タスクの要約}`
- ルートの `.gitignore` に `.worktrees/` を追加する
