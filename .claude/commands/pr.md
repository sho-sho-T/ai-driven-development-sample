---
description: commit・push・PR 作成までを行う
argument-hint: "issue=<issue-number>"
allowed-tools:
  - Bash
---

# pr コマンド

## Usage

`/pr issue=<issue-number>`

## 引数の解析

`$ARGUMENTS` から issue 番号を取得する。

- `issue=<N>` 形式の場合: `<N>` を issue 番号として使用
- 数値のみの場合: そのまま issue 番号として使用

## Flow

### 1. lint・テストを実行

```bash
mise run lint
bun test  # 該当テストがある場合
```

### 2. 変更をコミット

Conventional Commits 形式でコミットする。

```bash
git add <変更ファイル>
git commit -m "<type>(<scope>): <description>"
```

### 3. ブランチを push

```bash
git push -u origin <current-branch>
```

### 4. PR を作成

`aidd` CLI が利用可能な場合:

```bash
aidd pr create <issue-number>
```

### 手動フォールバック（`aidd` 未導入時）

```bash
gh pr create \
  --title "[ISSUE-<issue>] <summary>" \
  --body "## Summary
...

## Related Issue
Closes #<issue>

## Verification
- [x] mise run lint
- [x] bun test"
```

### 5. PR URL を出力

作成した PR の URL を表示する。
