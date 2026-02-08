# task-run コマンド

## Usage

`/task-run <issue-number> <task-number>`

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
