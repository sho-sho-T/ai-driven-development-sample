# Commit Rules

## Format

Conventional Commits: `<type>(<scope>): <description>`

## Types

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `docs`: ドキュメント変更
- `chore`: ビルド・CI 設定変更

## Scope

- モジュール名またはアプリ名を使用
- 例: `feat(auth): add login endpoint`
- 例: `fix(web): resolve routing error`

## Rules

- 1 commit = 1 関心事
- WIP コミット禁止（squash 前提の場合を除く）
- commit 前に `mise run lint` を実行する
- commit message は英語で記述する
