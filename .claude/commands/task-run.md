# task-run コマンド

## Usage

`/task-run <issue-number> <task-number>`

## Flow

### 1. TASK.md を読み込む

```bash
cat features/<issue-number>/<task-number>/TASK.md
```

### 2. Worktree を準備

```bash
aidd wt ensure <issue-number> <task-number>
```

CLI が未導入の場合は以下を手動実行:

```bash
BRANCH=feat/issue-<issue>-task-<task>
WT_PATH=.worktrees/issue-<issue>-task-<task>
git worktree add -b $BRANCH $WT_PATH main
cd $WT_PATH
bun install
```

### 3. 実装

- TASK.md の Implementation Steps に従って実装する
- TASK.md の status を `doing` に更新する

### 4. 検証

- TASK.md の Verification 項目を実行する
