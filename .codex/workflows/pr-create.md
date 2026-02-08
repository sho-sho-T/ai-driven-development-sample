# pr-create ワークフロー

## トリガー

ユーザーが「PR を作って」「Issue XXX Task YYY の PR を出して」と指示したとき。

## Flow

### 1. ブランチを push

```bash
git push -u origin feat/issue-<issue>-task-<task>
```

### 2. PR を作成

```bash
gh pr create \
  --title "[TASK-<issue>-<task>] <summary>" \
  --body "## Summary
...

## Related Issue
Closes #<issue>"
```

### 3. PR URL を出力

作成した PR の URL を表示する。
