# Coding Rules

## Linter / Formatter

- Biome を使用する（`biome.json` に定義済み）
- 実装完了後に `mise run lint` を実行する
- フォーマットは `mise run format` で統一する

## Import Rules

- 相対パスは同一モジュール内のみ許可
- モジュール間の参照は `contracts` を経由する（`packages/modules/*/contracts`）
- `shared-kernel` は任意のモジュールから参照可能

## Prohibited Patterns

- `any` 型の使用禁止（型安全を維持する）
- `console.log` を本番コードに残さない（デバッグ用は commit 前に削除）
- `// TODO` を残す場合は Issue 番号を付与する: `// TODO(#123): ...`

## Module Boundaries

- `packages/modules/*` はコンテキストをまたいで参照しない
- コンテキスト間の連携は `contracts` を通じて行う
- 詳細は `docs/application-architecture.md` を参照
