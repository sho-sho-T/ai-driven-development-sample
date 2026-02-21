---
description: PR マージ後のワークツリー削除・main 最新化を行う
allowed-tools:
  - Bash
---

# done コマンド

## Usage

`/done`

現在のワークツリーのブランチから issue 番号を自動で取得する。

## Flow

### 1. PR のマージを確認

PR がマージ済みであることを確認してから続行する。

### 2. ワークツリーを削除

現在のブランチ名から issue 番号を解析し、ワークツリーを削除する。

```bash
aidd wt remove
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
