---
description: PR マージ後のワークツリー削除・main 最新化を行う
argument-hint: "issue=<issue-number>"
allowed-tools:
  - Bash
---

# done コマンド

## Usage

`/done issue=<issue-number>`

## 引数の解析

`$ARGUMENTS` から issue 番号を取得する。

- `issue=<N>` 形式の場合: `<N>` を issue 番号として使用
- 数値のみの場合: そのまま issue 番号として使用

## Flow

### 1. PR のマージを確認

PR がマージ済みであることを確認してから続行する。

### 2. ワークツリーを削除

`aidd` CLI が利用可能な場合:

```bash
aidd wt remove <issue-number>
```

### 手動フォールバック（`aidd` 未導入時）

```bash
WT_PATH=.worktrees/issue-<issue-number>
git worktree remove $WT_PATH --force
git branch -d feat/issue-<issue-number>
```

### 3. main ブランチを最新化

```bash
git checkout main
git pull origin main
```

### 4. 完了を報告

次のタスクを開始するには `/issue-plan item=<next-issue-number>` を実行してください。

---

> セッションをリセットするには `/clear` を実行してください。
