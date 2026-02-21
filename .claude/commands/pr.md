---
description: commit・push・PR 作成までを行う
allowed-tools:
  - Bash
---

# pr コマンド

## Usage

`/pr`

現在のワークツリーのブランチから issue 番号を自動で取得する。

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

現在のブランチ名から issue 番号を解析し、PR を作成する。

```bash
aidd pr create
```

### 5. PR URL を出力

作成した PR の URL を表示する。
