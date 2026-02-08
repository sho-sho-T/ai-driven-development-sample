# task-done ワークフロー

## トリガー

ユーザーが「Task XXX-YYY を完了して」「コミットして PR 作って」と指示したとき。

## Flow

### 1. 検証を実行

```bash
mise run lint
bun test  # 該当テストがある場合
```

### 2. 変更をコミット

```bash
git add -A
git commit -m "<type>(<scope>): <description>"
```

- Conventional Commits 形式を使用
- TASK.md の Commit Plan に従う

### 3. PR を作成

```bash
git push -u origin feat/issue-<issue>-task-<task>
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

### 4. ステータスを更新

- TASK.md の status を `done` に変更
- すべての Task が完了していれば PLAN.md の status も `done` に変更
