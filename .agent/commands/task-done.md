# task-done コマンド

## Usage

`/task-done <issue-number> <task-number>`

## Flow

### 1. タスクの完了処理

`aidd` CLI が利用可能な場合:

```bash
aidd task done <issue-number> <task-number>
```

これにより以下が自動実行される:
- `mise run lint` の実行
- `bun test` の実行
- 変更のステージングとコミット
- ブランチの push
- PR の作成
- TASK.md の status を `done` に更新
- 全タスク完了時に PLAN.md の status も `done` に更新

### 手動フォールバック（`aidd` 未導入時）

#### 検証を実行

```bash
mise run lint
bun test  # 該当テストがある場合
```

#### 変更をコミット

```bash
git add -A
git commit -m "<type>(<scope>): <description>"
```

- Conventional Commits 形式を使用
- TASK.md の Commit Plan に従う

#### PR を作成

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

### 2. ステータスを更新

- TASK.md の status を `done` に変更
- すべての Task が完了していれば PLAN.md の status も `done` に変更
