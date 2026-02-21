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

### 1. Issue 情報を取得

リポジトリから指定した Issue の情報を取得する。

```bash
aidd issue view <issue-number>
```

### 2. Plan Mode でプランを策定

取得した Issue をもとに Plan Mode で分析し、実装方針を決定する。

- Goal / Scope / Risks を整理する
- 実装アプローチを検討する

### 3. PLAN.md を生成

- テンプレート: `.agent/templates/PLAN.md`
- 出力先: `features/<issue-number>/PLAN.md`
- Issue の body を解析し、Goal / Scope / Risks を埋める

```bash
mkdir -p features/<issue-number>
```

### 4. 開発者に承認を求める

- PLAN.md の内容を提示し、承認を待つ

### 5. 実装

承認後、PLAN.md に従って実装を進める。

- `.claude/rules/coding-work.md` のルールに従う
- `.claude/rules/frontend-patterns.md` / `frontend-structure.md` を参照する（フロントエンドの場合）
- 実装完了後に `mise run lint` を実行する
