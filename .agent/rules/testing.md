# Testing Rules

## Execution

- テスト実行コマンド: `bun test`
- lint 実行コマンド: `mise run lint`
- フォーマット実行コマンド: `mise run format`

## Required Testing

- `packages/modules/*/write` の Application / Domain Model に対してユニットテストを書く
- `packages/modules/*/read` の Application に対してユニットテストを書く
- テストファイルは対象ファイルと同階層に `*.test.ts` として配置する

## Before PR

- `mise run lint` がエラーなしで通ること
- `bun test` が全テストパスすること
- 新規コードにはテストを追加すること（該当する場合）

## Test Naming

- テスト名は振る舞いを記述する: `should return user when valid id is provided`
- テストファイル名: `<target>.test.ts`
