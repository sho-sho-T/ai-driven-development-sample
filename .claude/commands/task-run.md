---
description: タスクの Worktree を準備し実装を開始する
argument-hint: "issue=<issue-number> task=<task-number>"
allowed-tools:
  - Bash
  - Read
---

# task-run コマンド

## Usage

`/task-run issue=<issue-number> task=<task-number>`

## 引数の解析

`$ARGUMENTS` から issue 番号と task 番号を取得する。

- `issue=<N> task=<T>` 形式: `<N>` を issue 番号、`<T>` を task 番号として使用
- スペース区切りの数値 `<N> <T>` 形式: 1つ目を issue 番号、2つ目を task 番号として使用

## Flow

### 1. タスクの準備と開始

`aidd` CLI が利用可能な場合:

```bash
aidd task run <issue-number> <task-number>
```

これにより以下が自動実行される:
- TASK.md の読み込みと表示
- Worktree の作成（`wt ensure` を内部呼び出し）
- TASK.md の status を `doing` に更新

### 手動フォールバック（`aidd` 未導入時）

```bash
cat features/<issue-number>/<task-number>/TASK.md
```

Worktree を手動で準備:

```bash
BRANCH=feat/issue-<issue>-task-<task>
WT_PATH=.worktrees/issue-<issue>-task-<task>
git worktree add -b $BRANCH $WT_PATH main
cd $WT_PATH
bun install
```

### 2. 実装

- TASK.md の Implementation Steps に従って実装する
- TASK.md の status を `doing` に更新する

### 3. 検証

- TASK.md の Verification 項目を実行する
