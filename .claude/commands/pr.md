---
description: commit・push・PR 作成までを行う
allowed-tools:
  - Bash
---

# pr コマンド

## Usage

`/pr`

現在のブランチ名から issue 番号と task 番号を自動で取得する。

## ブランチからの番号解析

```bash
git branch --show-current
# 例: feat/issue-3-task-1 → issue=3, task=1
```

ブランチ名フォーマット: `feat/issue-{issue}-task-{task}`

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

### 3. PR を作成

現在のブランチ名から解析した `<issue>` と `<task>` を使用する。

```bash
aidd pr create <issue> <task>
```

### 4. PR URL を出力

作成した PR の URL を表示する。
