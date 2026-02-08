# issue-plan ワークフロー

## トリガー

ユーザーが「Issue #XXX を計画して」「Issue XXX から PLAN/TASK を作って」と指示したとき。

## Flow

### 1. Issue 情報を取得

```bash
gh issue view <issue-number> --json number,title,body,labels,assignees
```

### 2. PLAN.md を生成

- テンプレート: `.agent/templates/PLAN.md`
- 出力先: `features/<issue-number>/PLAN.md`
- Issue の body を解析し、Goal / Scope / Risks を埋める

```bash
mkdir -p features/<issue-number>
```

### 3. Task 分解

- Issue を分析し、実装単位に分解する（Plan Mode 推奨）
- 各 Task に対して `features/<issue-number>/<task-number>/TASK.md` を生成
- テンプレート: `.agent/templates/TASK.md`

```bash
mkdir -p features/<issue-number>/<task-number>
```

### 4. ブランチ名を付与

- 各 TASK.md の frontmatter `branchName` に `feat/issue-<N>-task-<T>` を記入

### 5. 開発者に承認を求める

- PLAN.md の内容を提示し、承認を待つ
