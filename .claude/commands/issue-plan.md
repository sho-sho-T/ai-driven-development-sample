# issue-plan コマンド

## Usage

`/issue-plan <issue-number>`

## Flow

### 1. Issue 情報を取得し Plan/Task を生成

`aidd` CLI が利用可能な場合:

```bash
aidd issue plan <issue-number>
```

これにより以下が自動生成される:
- `features/<issue-number>/PLAN.md`
- `features/<issue-number>/<task-number>/TASK.md`（タスクごと）

### 手動フォールバック（`aidd` 未導入時）

```bash
gh issue view <issue-number> --json number,title,body,labels,assignees
```

- テンプレート: `.agent/templates/PLAN.md`
- 出力先: `features/<issue-number>/PLAN.md`
- Issue の body を解析し、Goal / Scope / Risks を埋める

```bash
mkdir -p features/<issue-number>
```

### 2. Task 分解

- Plan Mode で Issue を分析し、実装単位に分解する
- 各 Task に対して `features/<issue-number>/<task-number>/TASK.md` を生成
- テンプレート: `.agent/templates/TASK.md`

```bash
mkdir -p features/<issue-number>/<task-number>
```

### 3. ブランチ名を付与

- 各 TASK.md の frontmatter `branchName` に `feat/issue-<N>-task-<T>` を記入

### 4. 開発者に承認を求める

- PLAN.md の内容を提示し、承認を待つ
