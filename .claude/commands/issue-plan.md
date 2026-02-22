---
description: Issue の Plan 策定・PLAN.md 生成・実装までを行う
argument-hint: "item=<issue-number>"
allowed-tools:
  - Bash
  - Read
  - Write
---

# issue-plan コマンド

## Usage

`/issue-plan item=<issue-number>`

## 引数の解析

`$ARGUMENTS` から issue 番号を取得する。

- `item=<N>` 形式の場合: `<N>` を issue 番号として使用
- 数値のみの場合: そのまま issue 番号として使用

## Flow

### 1. Issue の Plan ファイルを生成

`aidd issue plan` が GitHub Issue を取得し、PLAN.md を自動生成する。

```bash
aidd issue plan <issue-number>
```

生成される:
- `features/<issue-number>/PLAN.md`

### 2. Plan Mode でプランを確認・承認

生成された PLAN.md を読み込み、Plan Mode で内容を提示する。

- Goal / Scope / Risks を確認する
- 実装アプローチを開発者に提示する
- 承認を得る

### 3. ワークツリーを作成して実装

承認後、ワークツリーを作成する。

```bash
aidd wt ensure <issue-number>
```

- `.claude/rules/coding-work.md` のルールに従う
- `.claude/rules/frontend-patterns.md` / `frontend-structure.md` を参照する（フロントエンドの場合）
- 実装完了後に `mise run lint` を実行する
