# pr-create コマンド

## Usage

`/pr-create <issue-number> <task-number>`

## Flow

### 1. PR の作成

`aidd` CLI が利用可能な場合:

```bash
aidd pr create <issue-number> <task-number>
```

これにより以下が自動実行される:
- ブランチの push
- PR の作成（タイトル: `[TASK-<issue>-<task>] <summary>`）
- PR URL の出力

### 手動フォールバック（`aidd` 未導入時）

#### ブランチを push

```bash
git push -u origin feat/issue-<issue>-task-<task>
```

#### PR を作成

```bash
gh pr create \
  --title "[TASK-<issue>-<task>] <summary>" \
  --body "## Summary
...

## Related Issue
Closes #<issue>

## Verification
- [x] mise run lint
- [x] bun test"
```

### 2. PR URL を出力

作成した PR の URL を表示する。
