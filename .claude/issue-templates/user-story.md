# User Story Issue Template

## Title Format

`[User Story] <ユーザーが達成したいこと>`

## Body

```markdown
## ユーザーストーリー

**As a** <ユーザーの役割>,
**I want** <達成したいこと>,
**So that** <得られる価値・理由>.

## 背景・動機

<なぜこの機能が必要なのか。現状の課題や、ユーザーからのフィードバックがあれば記載>

## 受け入れ条件

- [ ] <ユーザー視点で検証可能な条件1>
- [ ] <ユーザー視点で検証可能な条件2>
- [ ] <ユーザー視点で検証可能な条件3>

## 画面・UI 仕様（該当する場合）

- 対象ページ / コンポーネント:
- 表示要素:
- インタラクション:

## 技術的な補足（任意）

<実装上の制約や、参照すべき既存コードがあれば記載>

## 対象スコープ

- 含む:
- 含まない:
```

## Label

`user-story`

## Claude Code 向け実装ガイド

このテンプレートで作成された Issue を実装する際:

1. ユーザーストーリーの「I want」から主要機能を特定する
2. 受け入れ条件を 1 つずつ実装 → テストの単位とする
3. UI 仕様がある場合は `features/<domain>/components/` に Presenter を作成
4. フロントエンド実装は `.claude/rules/frontend-patterns.md` と `frontend-structure.md` に従う
5. バックエンド実装は CQRS パターン（write/read 分離）に従う
