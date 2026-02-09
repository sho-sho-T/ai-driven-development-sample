# AI駆動開発 クイックスタートガイド

このガイドでは、本プロジェクトで実現しているAI駆動開発環境を他のプロジェクトにセットアップする手順を、実践的に説明します。

> 📘 詳細な設計思想や理論については、[ai-driven-development-setup.md](./ai-driven-development-setup.md) を参照してください。

## 🎯 実現できること

✅ GitHub Issueからタスクを取得し、Plan Modeで計画
✅ タスク実行時にWorktreeを立ち上げ、隔離された環境で作業
✅ `/pr` でPull Requestを自動作成
✅ `/done` でWorktreeとブランチを削除し、次のタスクへスムーズに移行

---

## 📋 前提条件

- Git リポジトリが既に存在すること
- GitHub リポジトリにアクセス可能なこと
- ターミナルで基本的なコマンド操作ができること

---

## 🚀 セットアップ手順

### Step 1: 必要なツールをインストール

```bash
# mise (ツールマネージャー)
curl https://mise.run | sh

# mise の有効化（bash の場合）
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
source ~/.bashrc

# プロジェクトに移動
cd <your-project-root>

# mise.toml を作成（またはプロジェクトに合わせて編集）
cat > mise.toml <<'EOF'
[tools]
bun = "latest"
node = "22"
gh = "latest"
rust = "latest"

[tasks.lint]
description = "Run lint checks"
run = "bun run lint"

[tasks.format]
description = "Format code"
run = "bun run format"
EOF

# ツールをインストール
mise install
```

### Step 2: GitHub CLI の認証

```bash
gh auth login
```

指示に従ってGitHubアカウントで認証してください。

### Step 3: ディレクトリ構造を作成

```bash
# 必要なディレクトリを作成
mkdir -p .claude/commands .claude/rules
mkdir -p .agent/commands .agent/rules .agent/templates
mkdir -p features
mkdir -p tools/aidd/src

# .gitignore に Worktree ディレクトリを追加
echo '.worktrees/' >> .gitignore
```

### Step 4: ルールファイルを配置

本プロジェクトの `.claude/rules/` ディレクトリから以下のファイルをコピー：

```bash
# 本プロジェクトをクローン済みの場合
TEMPLATE_PROJECT="/path/to/ai-driven-development-sample"

# ルールファイルをコピー
cp -r $TEMPLATE_PROJECT/.claude/rules/* .claude/rules/
cp -r $TEMPLATE_PROJECT/.agent/rules/* .agent/rules/

# コマンドファイルをコピー
cp -r $TEMPLATE_PROJECT/.claude/commands/* .claude/commands/
cp -r $TEMPLATE_PROJECT/.agent/commands/* .agent/commands/

# テンプレートファイルをコピー
cp -r $TEMPLATE_PROJECT/.agent/templates/* .agent/templates/

# aidd CLI をコピー
cp -r $TEMPLATE_PROJECT/tools/aidd/* tools/aidd/
```

または、以下のファイルを手動で作成：

<details>
<summary>必要なファイル一覧（クリックで展開）</summary>

#### `.claude/rules/branch-strategy.md`
```markdown
# Branch Strategy

## Naming
- 形式: `feat/issue-{issue-number}-task-{task-number}`
- 例: `feat/issue-123-task-1`

## Rules
- main への直接 push は禁止
- すべての変更は feature ブランチで行う
- feature ブランチは Worktree 経由で作成する
- マージ後のブランチは削除する

## Worktree Path
- 形式: `.worktrees/issue-{issue-number}-task-{task-number}`
- ルートの `.gitignore` に `.worktrees/` を追加する
```

#### `.claude/rules/commit.md`
```markdown
# Commit Rules

## Format
Conventional Commits: `<type>(<scope>): <description>`

## Types
- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `docs`: ドキュメント変更
- `chore`: ビルド・CI 設定変更

## Scope
- モジュール名またはアプリ名を使用
- 例: `feat(auth): add login endpoint`
- 例: `fix(web): resolve routing error`

## Rules
- 1 commit = 1 関心事
- WIP コミット禁止（squash 前提の場合を除く）
- commit 前に `mise run lint` を実行する
- commit message は英語で記述する
```

#### `.claude/rules/coding-work.md`
```markdown
# Coding Rules

## Linter / Formatter
- プロジェクトで使用するLinter/Formatterに従う（Biomeなど）
- 実装完了後に `mise run lint` を実行する
- フォーマットは `mise run format` で統一する

## Import Rules
- 相対パスは同一モジュール内のみ許可（プロジェクト規約に従う）

## Prohibited Patterns
- `any` 型の使用禁止（型安全を維持する）
- `console.log` を本番コードに残さない（デバッグ用は commit 前に削除）
- `// TODO` を残す場合は Issue 番号を付与する: `// TODO(#123): ...`
```

#### `.claude/rules/testing.md`
```markdown
# Testing Rules

## Execution
- テスト実行コマンド: `bun test`（またはプロジェクトのコマンド）
- lint 実行コマンド: `mise run lint`
- フォーマット実行コマンド: `mise run format`

## Before PR
- `mise run lint` がエラーなしで通ること
- `bun test` が全テストパスすること（該当する場合）
- 新規コードにはテストを追加すること（該当する場合）

## Test Naming
- テスト名は振る舞いを記述する: `should return user when valid id is provided`
- テストファイル名: `<target>.test.ts`
```

#### `.claude/rules/review-checklist.md`
```markdown
# PR 提出前チェックリスト

PR を作成する前に、以下をすべて確認する。

- [ ] `mise run lint` がエラーなしで通る
- [ ] `bun test`（該当するテストがある場合）がパスする
- [ ] TASK.md の status が `done` に更新されている
- [ ] TASK.md の Verification チェック項目がすべて完了している
- [ ] 不要なデバッグコード・`console.log` が残っていない
- [ ] `.env` ファイルがコミットに含まれていない
- [ ] PR タイトルが規約に従っている: `[TASK-<issue>-<task>] <summary>`
- [ ] commit message が Conventional Commits 形式である
```

</details>

### Step 5: aidd CLI をセットアップ

```bash
# シェルスクリプト版に実行権限を付与
chmod +x tools/aidd/aidd.sh

# Rust版をビルドする場合（オプション）
cd tools/aidd
cargo build --release
cd ../..
```

### Step 6: Claude Code の権限設定

`.claude/settings.local.json` を作成：

```json
{
  "permissions": {
    "allow": [
      "Bash(bun:*)",
      "Bash(gh issue view:*)",
      "Bash(gh pr create:*)",
      "Bash(gh label:*)",
      "Bash(mise run lint:*)",
      "Bash(mise run format:*)",
      "Bash(<project-root>/tools/aidd/aidd.sh:*)"
    ]
  }
}
```

> **Note:** `<project-root>` は実際のプロジェクトルートの絶対パスに置き換えてください。

### Step 7: 動作確認

```bash
# aidd CLI の動作確認
./tools/aidd/aidd.sh help

# GitHub CLI の動作確認
gh auth status

# mise タスクの確認
mise tasks
```

---

## 💡 使い方（ワークフロー）

### 1. Issue を作成

GitHubで通常通りIssueを作成するか、Claude Codeで：

```
> /issue-create ユーザーがログインできるようにする
```

### 2. Issue を Plan に分解

```
> /issue-plan 123
```

これにより以下が生成されます：
- `features/123/PLAN.md`: Issue全体の計画
- `features/123/1/TASK.md`: タスク1の詳細
- `features/123/2/TASK.md`: タスク2の詳細
- ...

Claude Code が Plan Mode で自動的にタスクに分解します。

### 3. タスクを実行

```
> /task-run 123 1
```

これにより以下が自動実行されます：
- Worktree を作成（`.worktrees/issue-123-task-1`）
- ブランチを作成（`feat/issue-123-task-1`）
- 依存関係をインストール
- TASK.md を表示

Claude Code が TASK.md の手順に従って実装を開始します。

### 4. PR を作成

実装が完了したら：

```
> /pr-create 123 1
```

これにより以下が自動実行されます：
- `mise run lint` を実行
- `bun test` を実行（該当する場合）
- 変更をコミット
- ブランチを push
- Pull Request を作成

### 5. タスクを完了

PRがマージされたら：

```
> /task-done 123 1
```

これにより以下が自動実行されます：
- TASK.md の status を `done` に更新
- Worktree を削除
- ローカルブランチを削除
- main ブランチを最新化

次のタスクに移行できます。

---

## 🔧 aidd CLI リファレンス

### Worktree 管理

```bash
# Worktree を作成
./tools/aidd/aidd.sh wt ensure <issue-number> <task-number>

# Worktree を削除
./tools/aidd/aidd.sh wt remove <issue-number> <task-number>
```

### タスク管理

```bash
# タスクを開始（Worktree作成 + TASK.md表示）
./tools/aidd/aidd.sh task run <issue-number> <task-number>

# タスクを完了（lint/test + commit + PR + status更新）
./tools/aidd/aidd.sh task done <issue-number> <task-number>
```

### PR 作成

```bash
# PR を作成
./tools/aidd/aidd.sh pr create <issue-number> <task-number>
```

### ステータス確認

```bash
# 全Issue/Taskのステータスを表示
./tools/aidd/aidd.sh status
```

---

## 📁 ディレクトリ構成

セットアップ後のディレクトリ構成：

```
.
├── .claude/
│   ├── settings.local.json      # 権限設定（gitignore済み）
│   ├── commands/                # カスタムコマンド
│   │   ├── issue-create.md
│   │   ├── issue-plan.md
│   │   ├── task-run.md
│   │   ├── pr-create.md
│   │   └── task-done.md
│   └── rules/                   # コーディング規約
│       ├── branch-strategy.md
│       ├── coding-work.md
│       ├── commit.md
│       ├── testing.md
│       └── review-checklist.md
├── .agent/                       # テンプレート（レガシー互換）
│   ├── commands/
│   ├── rules/
│   └── templates/
│       ├── PLAN.md
│       └── TASK.md
├── features/                     # Issue/Task管理
│   └── <issue-number>/
│       ├── PLAN.md
│       └── <task-number>/
│           └── TASK.md
├── .worktrees/                   # Worktree用（gitignore済み）
│   └── issue-<N>-task-<T>/
├── tools/
│   └── aidd/                    # カスタムCLI
│       ├── aidd.sh              # シェルスクリプト版
│       └── src/                 # Rust版（オプション）
└── mise.toml                     # タスク定義
```

---

## ❓ トラブルシューティング

### Q: `mise: command not found`

```bash
# mise を再インストール
curl https://mise.run | sh

# シェル設定に追加
echo 'eval "$(~/.local/bin/mise activate bash)"' >> ~/.bashrc
source ~/.bashrc
```

### Q: Worktreeが作成できない

```bash
# 既存のWorktreeを削除
git worktree remove .worktrees/issue-123-task-1 --force

# 再作成
./tools/aidd/aidd.sh wt ensure 123 1
```

### Q: `gh` が認証エラーになる

```bash
# 再認証
gh auth login
```

### Q: Claude Codeでコマンドが実行されない

`.claude/settings.local.json` の `permissions.allow` に必要なコマンドが含まれているか確認してください。

---

## 📚 次のステップ

- ✅ セットアップが完了したら、実際にIssueを作成して試してみましょう
- ✅ チーム全体で運用する場合は、CIワークフローの追加を検討してください
- ✅ より詳細な設計思想やカスタマイズについては、[ai-driven-development-setup.md](./ai-driven-development-setup.md) を参照してください

---

## 🔗 参考リンク

- [詳細セットアップ手順](./ai-driven-development-setup.md)
- [アプリケーションアーキテクチャ](./application-architecture.md)
- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [mise Documentation](https://mise.jdx.dev)
- [Conventional Commits](https://www.conventionalcommits.org/)
