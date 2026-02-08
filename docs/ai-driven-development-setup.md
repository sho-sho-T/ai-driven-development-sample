# AI駆動開発セットアップ手順書（Issue起点・自走運用）

この手順書は、AI エージェントが **Issue 起点で計画→実装→PR** まで自走する開発環境を構築するための実装手順である。
開発者は要件定義と最終レビューに集中し、コーディング作業は AI に委譲する。

## 目次

1. [完成条件（Definition of Done）](#1-完成条件definition-of-done)
2. [前提](#2-前提)
3. [AI実行フロー全体像](#3-ai実行フロー全体像)
4. [生成するディレクトリ構成](#4-生成するディレクトリ構成)
5. [`.agent/` ディレクトリの役割](#5-agent-ディレクトリの役割)
6. [`features/` ディレクトリの役割](#6-features-ディレクトリの役割)
7. [セットアップ手順](#7-セットアップ手順)
8. [独自CLI `aidd` の設計](#8-独自cli-aidd-の設計)
9. [Worktree 自動化](#9-worktree-自動化)
10. [CI による運用ルール強制](#10-ci-による運用ルール強制)
11. [AI自走ランブック（運用時）](#11-ai自走ランブック運用時)
12. [品質を維持するための設計原則](#12-品質を維持するための設計原則)
13. [導入チェックリスト](#13-導入チェックリスト)

---

## 1. 完成条件（Definition of Done）

以下すべてを満たす状態を目標とする。

1. この手順書の内容だけで環境を再現できる
2. AI が `Issue取得 → Plan作成 → Task分解 → 実装 → 検証 → commit → PR作成` を自走できる
3. `features/<issue-number>/PLAN.md` と `features/<issue-number>/<task-number>/TASK.md` が標準化されている
4. Worktree の作成・切替・削除を AI エージェントが自律的に実行できる
5. ルール違反をローカルと CI の両方で検知できる
6. 開発者の介入ポイントは **Plan承認** と **PRレビュー・マージ** の2点のみ

---

## 2. 前提

| 項目 | 内容 |
|------|------|
| 開発環境 | DevContainer（Docker-in-Docker） |
| ランタイム・ツール管理 | `mise.toml`（`bun`, `node`, `supabase`, `gh`） |
| GitHub操作 | `gh` CLI |
| AIエージェント | Claude Code または Codex |
| モノレポ | Bun workspaces（`apps/*`, `packages/*`） |
| リンター | Biome |

> 環境詳細は `docs/development-environment.md` を参照。

---

## 3. AI実行フロー全体像

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI 実行フロー                                  │
│                                                                 │
│  ① Issue取得         gh issue view <N> --json ...               │
│       ↓                                                         │
│  ② Plan作成          features/<N>/PLAN.md を生成                  │
│       ↓                                                         │
│  ③ Task分解          features/<N>/<T>/TASK.md を生成              │
│       ↓                                                         │
│  ★ 開発者承認         Plan/Task の内容を人間が確認                    │
│       ↓                                                         │
│  ④ Worktree準備      aidd wt ensure <N> <T>                     │
│       ↓                                                         │
│  ⑤ 実装              TASK.md の手順に従いコード変更                   │
│       ↓                                                         │
│  ⑥ 検証              mise run lint && テスト実行                   │
│       ↓                                                         │
│  ⑦ commit            Conventional Commits 形式                   │
│       ↓                                                         │
│  ⑧ PR作成            gh pr create                                │
│       ↓                                                         │
│  ★ 開発者レビュー      PR をレビューしマージ                           │
│       ↓                                                         │
│  ⑨ 後処理             TASK/PLAN status更新, Worktree削除           │
└─────────────────────────────────────────────────────────────────┘
```

**人間の介入は ★ の2箇所のみ。**

---

## 4. 生成するディレクトリ構成

以下を新規に追加する。既存の `apps/`, `packages/`, `supabase/` 等はそのまま維持する。

```text
.
├── AGENTS.md                          # AI の入口（必読順序・グローバルルール）
├── .agent/
│   ├── commands/                      # AI が実行するワークフロー定義
│   │   ├── issue-plan.md              # Issue → PLAN/TASK 生成フロー
│   │   ├── task-run.md                # TASK 実行フロー
│   │   ├── task-done.md               # 検証・commit・PR フロー
│   │   └── pr-create.md              # PR 作成フロー
│   ├── rules/                         # AI が遵守すべきルール（機械実行可能）
│   │   ├── branch-strategy.md         # ブランチ命名・運用ルール
│   │   ├── coding-work.md             # コーディング規約・禁止事項
│   │   ├── commit.md                  # コミットメッセージ規約
│   │   ├── testing.md                 # テスト実行ルール
│   │   └── review-checklist.md        # PR 提出前チェックリスト
│   └── templates/                     # PLAN/TASK のテンプレート
│       ├── PLAN.md
│       └── TASK.md
├── features/                          # Issue 単位の計画・タスク管理
│   └── <issue-number>/
│       ├── PLAN.md
│       └── <task-number>/
│           └── TASK.md
├── tools/aidd/                        # 独自 CLI（Worktree・Issue・Task・PR 統合）
│   ├── src/
│   │   └── main.rs                    # エントリポイント (Rust 推奨)
│   └── Cargo.toml
└── .github/workflows/
    ├── pr-check.yml                   # lint/test 実行
    └── task-integrity.yml             # TASK.md 整合性チェック
```

---

## 5. `.agent/` ディレクトリの役割

### 5.1 `commands/` — AI ワークフロー定義

AI エージェントが特定の操作を実行する際の手順書。Claude Code では `/issue-plan 123` のようにスラッシュコマンドとして呼び出す。

| ファイル | 責務 | トリガー例 |
|----------|------|-----------|
| `issue-plan.md` | Issue取得→PLAN/TASK生成 | `/issue-plan 123` |
| `task-run.md` | Worktree準備→実装開始 | `/task-run 123 1` |
| `task-done.md` | 検証→commit→PR | `/task-done 123 1` |
| `pr-create.md` | PR作成のみ | `/pr-create 123 1` |

### 5.2 `rules/` — AIが遵守するルール

ルールは **曖昧な文章を禁止** し、機械実行可能な条件として記述する。

**良い例（実行可能）:**
```
- ブランチ名: feat/issue-{issue-number}-task-{task-number}
- PR 作成前に `mise run lint` を必須実行
- commit message は Conventional Commits 形式: <type>(<scope>): <description>
```

**悪い例（曖昧）:**
```
- 適切なブランチ名をつける
- テストをちゃんとやる
```

| ファイル | 内容 |
|----------|------|
| `branch-strategy.md` | ブランチ命名規則、main への直 push 禁止、Worktree 前提の運用 |
| `coding-work.md` | コーディング規約（Biome準拠）、禁止パターン、import ルール |
| `commit.md` | Conventional Commits、スコープの定義、1 commit 1 関心事 |
| `testing.md` | テスト必須範囲、実行コマンド、カバレッジ基準 |
| `review-checklist.md` | PR 提出前の自己チェック項目（lint/test/型チェック/TASK.md更新） |

### 5.3 `templates/` — PLAN/TASK テンプレート

AI が計画ドキュメントを生成する際の雛形。frontmatter でメタデータを管理する。

---

## 6. `features/` ディレクトリの役割

Issue 単位で計画とタスクを管理する。AI の判断履歴を Git で追跡する。

```text
features/
└── 123/                    # Issue #123
    ├── PLAN.md             # 計画書（タスク分解・リスク・完了条件）
    ├── 1/
    │   └── TASK.md         # Task 1: DB スキーマ作成
    ├── 2/
    │   └── TASK.md         # Task 2: API エンドポイント実装
    └── 3/
        └── TASK.md         # Task 3: フロントエンド実装
```

### PLAN.md テンプレート

```md
---
issueNumber: <number>
title: "<issue-title>"
status: draft | approved | in-progress | done
ownerAgent: claude | codex
createdAt: <ISO-8601>
---

# Goal
<!-- Issue の目的を 1-2 文で要約 -->

# Scope
<!-- 変更対象のモジュール・ファイル範囲 -->

# Task Breakdown
| # | タスク概要 | ブランチ名 | 見積 |
|---|-----------|-----------|------|
| 1 | ... | feat/issue-123-task-1 | S |
| 2 | ... | feat/issue-123-task-2 | M |
| 3 | ... | feat/issue-123-task-3 | S |

# Risks
<!-- 実装上のリスクと対策 -->

# Definition of Done
- [ ] すべての Task が done
- [ ] lint/test パス
- [ ] PR レビュー済み
```

### TASK.md テンプレート

```md
---
issueNumber: <number>
taskNumber: <number>
status: todo | doing | done
branchName: feat/issue-<issue>-task-<task>
worktreePath: .worktrees/issue-<issue>-task-<task>
---

# Context
<!-- この Task が解決する問題 -->

# Implementation Steps
1. ...
2. ...
3. ...

# Files to Change
- `packages/modules/xxx/write/...`
- `apps/web/src/routes/...`

# Verification
- [ ] `mise run lint` パス
- [ ] `bun test` パス（該当テストがある場合）
- [ ] 手動確認項目（該当する場合）

# Commit Plan
- `feat(xxx): <description>`
```

---

## 7. セットアップ手順

### Step 0: ひな形を一括生成する

AI はこのコマンドをそのまま実行してよい。

```bash
# ディレクトリ作成
mkdir -p .agent/commands .agent/rules .agent/templates \
         features \
         tools/aidd/src \
         .github/workflows

# ファイル生成
touch AGENTS.md \
  .agent/commands/issue-plan.md \
  .agent/commands/task-run.md \
  .agent/commands/task-done.md \
  .agent/commands/pr-create.md \
  .agent/rules/branch-strategy.md \
  .agent/rules/coding-work.md \
  .agent/rules/commit.md \
  .agent/rules/testing.md \
  .agent/rules/review-checklist.md \
  .agent/templates/PLAN.md \
  .agent/templates/TASK.md
```

### Step 1: AGENTS.md — AIの入口を固定する

`AGENTS.md` を作成し、AI が最初に読むべき情報と順序を固定する。

```md
# AGENTS.md

## Project
TanStack Start + Supabase モジュラーモノリス。
Bun workspaces モノレポ（apps/*, packages/*）。

## Read Order
1. docs/ai-driven-development-setup.md — AI駆動開発の全体設計
2. docs/application-architecture.md — アーキテクチャ設計
3. .agent/rules/* — 遵守ルール一式
4. .agent/templates/* — PLAN/TASK テンプレート

## Global Rules
- すべての作業は Issue 番号起点で開始する
- 実装前に PLAN.md / TASK.md を生成・更新する
- すべての変更は Worktree 上で行う（main 直接変更禁止）
- 完了前に lint / test を実行する
- 破壊的コマンド（force push, reset --hard, drop table 等）は禁止

## Forbidden Actions
- main ブランチへの直接 commit / push
- .env ファイルのコミット
- 他人の Worktree の削除
- AGENTS.md / .agent/rules/* の無断変更
```

### Step 2: ルールを `.agent/rules/` に配置する

各ルールファイルの記述要件を以下に示す。

#### `branch-strategy.md`

```md
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

#### `commit.md`

```md
# Commit Rules

## Format
Conventional Commits: `<type>(<scope>): <description>`

## Types
- feat: 新機能
- fix: バグ修正
- refactor: リファクタリング
- test: テスト追加・修正
- docs: ドキュメント変更
- chore: ビルド・CI 設定変更

## Scope
- モジュール名またはアプリ名を使用
- 例: `feat(auth): add login endpoint`

## Rules
- 1 commit = 1 関心事
- WIP コミット禁止（squash 前提の場合を除く）
- commit 前に `mise run lint` を実行する
```

#### `review-checklist.md`

```md
# PR 提出前チェックリスト

PR を作成する前に、以下をすべて確認する。

- [ ] `mise run lint` がエラーなしで通る
- [ ] `bun test`（該当するテストがある場合）がパスする
- [ ] TASK.md の status が `done` に更新されている
- [ ] TASK.md の Verification チェック項目がすべて完了している
- [ ] 不要なデバッグコード・console.log が残っていない
- [ ] .env ファイルがコミットに含まれていない
- [ ] PR タイトルが規約に従っている: `[TASK-<issue>-<task>] <summary>`
```

### Step 3: PLAN/TASK テンプレートを配置する

[6. `features/` ディレクトリの役割](#6-features-ディレクトリの役割) に記載したテンプレートを `.agent/templates/PLAN.md` と `.agent/templates/TASK.md` に配置する。

### Step 4: Issue起点の計画フローをコマンド化する

`.agent/commands/issue-plan.md` を作成する。

```md
# issue-plan コマンド

## Usage
`/issue-plan <issue-number>`

## Flow

### 1. Issue 情報を取得
```bash
gh issue view <issue-number> --json number,title,body,labels,assignees
```

### 2. PLAN.md を生成
- テンプレート: `.agent/templates/PLAN.md`
- 出力先: `features/<issue-number>/PLAN.md`
- Issue の body を解析し、Goal / Scope / Risks を埋める

### 3. Task 分解
- Plan Mode で Issue を分析し、実装単位に分解する
- 各 Task に対して `features/<issue-number>/<task-number>/TASK.md` を生成
- テンプレート: `.agent/templates/TASK.md`

### 4. ブランチ名を付与
- 各 TASK.md の frontmatter `branchName` に `feat/issue-<N>-task-<T>` を記入

### 5. 開発者に承認を求める
- PLAN.md の内容を提示し、承認を待つ
```

`.agent/commands/task-run.md`:

```md
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
```

`.agent/commands/task-done.md`:

```md
# task-done コマンド

## Usage
`/task-done <issue-number> <task-number>`

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
  --body "## Summary\n...\n## Related Issue\nCloses #<issue>"
```

### 4. ステータスを更新
- TASK.md の status を `done` に変更
- すべての Task が完了していれば PLAN.md の status も `done` に変更
```

### Step 5: `.gitignore` を更新する

```bash
echo '.worktrees/' >> .gitignore
```

### Step 6: CI ワークフローを作成する

[10. CI による運用ルール強制](#10-ci-による運用ルール強制) の定義に基づいてワークフローを作成する。

---

## 8. 独自CLI `aidd` の設計

Worktree・Issue・Task・PR の操作を統合する CLI ツール。開発者が Worktree 操作を意識せずに AI 経由で作業を完結できるようにする。

### サブコマンド一覧

| コマンド | 責務 |
|---------|------|
| `aidd issue plan <issue-number>` | Issue取得→PLAN/TASK生成 |
| `aidd wt ensure <issue-number> <task-number>` | Worktree作成・ブランチ作成・依存セットアップ |
| `aidd wt remove <issue-number> <task-number>` | Worktree削除・ブランチクリーンアップ |
| `aidd task run <issue-number> <task-number>` | Worktree準備→TASK読み込み→実装開始 |
| `aidd task done <issue-number> <task-number>` | 検証→commit→PR作成→ステータス更新 |
| `aidd pr create <issue-number> <task-number>` | PR作成のみ |
| `aidd status` | 全 Issue/Task のステータス一覧 |

### `aidd wt ensure` の詳細

このコマンドが Worktree 自動化の中核を担う。

```
aidd wt ensure 123 1
  │
  ├─ 1. ブランチ存在確認
  │     git branch --list feat/issue-123-task-1
  │
  ├─ 2. Worktree 作成（なければ）
  │     git worktree add -b feat/issue-123-task-1 \
  │       .worktrees/issue-123-task-1 main
  │
  ├─ 3. 依存インストール
  │     cd .worktrees/issue-123-task-1
  │     mise install
  │     bun install
  │
  ├─ 4. .env 配置（必要なら）
  │     cp ../.env .env  # テンプレートから生成
  │
  └─ 5. 作業ディレクトリを返す
        → .worktrees/issue-123-task-1
```

### 技術選定

| 項目 | 選定 | 理由 |
|------|------|------|
| 言語 | Rust（推奨）またはシェルスクリプト（初期） | Rust: 型安全・クロスプラットフォーム。初期はシェルスクリプトで MVP 可 |
| 配布 | `tools/aidd/` にソースを配置 | モノレポ内で管理 |
| 依存 | `gh`, `git`, `bun`, `mise` | すべて mise 経由でインストール済み前提 |

### 段階的な導入方針

```
Phase 1: シェルスクリプト MVP
  → tools/aidd/aidd.sh として基本コマンドを実装
  → AI エージェントが直接呼び出せる状態を作る

Phase 2: Rust CLI 化
  → tools/aidd/src/main.rs に移行
  → エラーハンドリング・ログ出力を強化

Phase 3: AI エージェント統合
  → Claude Code の custom command として登録
  → /issue-plan, /task-run 等から aidd を透過的に呼び出す
```

---

## 9. Worktree 自動化

### 設計方針

- Worktree は「任意の機能」ではなく「標準の作業経路」とする
- 開発者は Worktree の存在を意識しない — AI が自動で作成・切替・削除する
- `aidd wt ensure` を唯一のエントリポイントとし、冪等に動作させる

### Worktree ライフサイクル

```
[Task開始]
  aidd wt ensure <issue> <task>
    → Worktree作成 + ブランチ作成 + 依存セットアップ

[実装中]
  Worktree 内で作業
    → .worktrees/issue-<N>-task-<T>/ が作業ディレクトリ

[Task完了]
  aidd task done <issue> <task>
    → commit + PR作成

[PR マージ後]
  aidd wt remove <issue> <task>
    → Worktree削除 + ローカルブランチ削除
```

### 並列開発

Worktree により、複数の Issue/Task を同時並行で開発できる。

```
メインリポジトリ (./)
├── .worktrees/
│   ├── issue-123-task-1/    ← AI Agent A が作業中
│   ├── issue-123-task-2/    ← AI Agent B が作業中
│   └── issue-456-task-1/    ← AI Agent C が作業中
```

- 各 Worktree は独立したディレクトリ・ブランチを持つ
- `bun install` は各 Worktree で独立実行する
- `node_modules` は Worktree ごとに作られる

---

## 10. CI による運用ルール強制

### `.github/workflows/pr-check.yml`

PR が作成・更新されたときに実行する基本チェック。

```yaml
name: PR Check
on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jdx/mise-action@v2
      - run: bun install
      - run: mise run lint
      - run: bun test
```

### `.github/workflows/task-integrity.yml`

TASK.md の整合性を検証する。AI が正しいフローで作業したことを保証する。

```yaml
name: Task Integrity
on:
  pull_request:
    branches: [main]

jobs:
  integrity:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Extract issue/task from PR title
        id: extract
        run: |
          TITLE="${{ github.event.pull_request.title }}"
          if [[ "$TITLE" =~ ^\[TASK-([0-9]+)-([0-9]+)\] ]]; then
            echo "issue=${BASH_REMATCH[1]}" >> "$GITHUB_OUTPUT"
            echo "task=${BASH_REMATCH[2]}" >> "$GITHUB_OUTPUT"
          else
            echo "::warning::PR title does not match [TASK-N-N] format"
            exit 0
          fi

      - name: Verify TASK.md exists
        if: steps.extract.outputs.issue
        run: |
          ISSUE=${{ steps.extract.outputs.issue }}
          TASK=${{ steps.extract.outputs.task }}
          TASK_FILE="features/${ISSUE}/${TASK}/TASK.md"
          if [ ! -f "$TASK_FILE" ]; then
            echo "::error::${TASK_FILE} が存在しません"
            exit 1
          fi

      - name: Verify TASK.md status is done
        if: steps.extract.outputs.issue
        run: |
          ISSUE=${{ steps.extract.outputs.issue }}
          TASK=${{ steps.extract.outputs.task }}
          TASK_FILE="features/${ISSUE}/${TASK}/TASK.md"
          if ! grep -q 'status: done' "$TASK_FILE"; then
            echo "::error::${TASK_FILE} の status が done ではありません"
            exit 1
          fi
```

### CI チェック項目一覧

| チェック | ワークフロー | 失敗時の影響 |
|---------|-------------|-------------|
| `mise run lint` パス | pr-check | PR マージ不可 |
| `bun test` パス | pr-check | PR マージ不可 |
| PR タイトルが `[TASK-N-N]` 形式 | task-integrity | 警告（ブロックしない） |
| `TASK.md` が存在する | task-integrity | PR マージ不可 |
| `TASK.md` の status が `done` | task-integrity | PR マージ不可 |
| ルールファイル変更時の必須レビュー | CODEOWNERS | 承認なしでマージ不可 |

### CODEOWNERS（推奨）

```
# .github/CODEOWNERS
AGENTS.md            @project-owner
.agent/rules/*       @project-owner
.agent/templates/*   @project-owner
```

---

## 11. AI自走ランブック（運用時）

AI は Issue 番号を受け取ったら、以下の順で自律的に動作する。

### Phase 1: 計画

```bash
# 1. Issue 情報を取得
gh issue view 123 --json number,title,body,labels,assignees

# 2. features ディレクトリを作成
mkdir -p features/123

# 3. PLAN.md を生成
# .agent/templates/PLAN.md をベースに、Issue の内容から Goal/Scope/Risks を埋める
# → features/123/PLAN.md

# 4. Task 分解
# Plan Mode で Issue を分析し、実装単位の TASK.md を生成
# → features/123/1/TASK.md
# → features/123/2/TASK.md
# → ...
```

### Phase 2: 実装（Task ごとに繰り返す）

```bash
# 5. Worktree を準備
aidd wt ensure 123 1
# CLI 未導入時の手動代替:
#   git worktree add -b feat/issue-123-task-1 \
#     .worktrees/issue-123-task-1 main
#   cd .worktrees/issue-123-task-1 && bun install

# 6. TASK.md に従って実装
# features/123/1/TASK.md の Implementation Steps に従う

# 7. 検証
mise run lint
bun test  # 該当テストがある場合
```

### Phase 3: 完了

```bash
# 8. commit
git add -A
git commit -m "feat(auth): add login endpoint"

# 9. PR 作成
git push -u origin feat/issue-123-task-1
gh pr create \
  --title "[TASK-123-1] Add login endpoint" \
  --body "## Summary
- ログインエンドポイントを追加

## Related Issue
Closes #123

## Verification
- [x] mise run lint
- [x] bun test"

# 10. ステータス更新
# features/123/1/TASK.md の status → done
# すべての Task が done なら features/123/PLAN.md の status → done
```

### Claude Code での実行例

```
> /issue-plan 123
→ PLAN.md と TASK.md が生成される
→ 開発者が Plan を確認・承認

> /task-run 123 1
→ Worktree が作成され、実装が開始される

> /task-done 123 1
→ lint/test → commit → PR 作成
```

### Codex での実行例

```
Plan Mode:
  "Issue #123 を読んで PLAN.md と TASK.md を生成してください"

Execute Mode:
  "features/123/1/TASK.md に従って実装してください"
```

---

## 12. 品質を維持するための設計原則

| 原則 | 実践 |
|------|------|
| ルールは自然言語でなく実行条件として書く | `.agent/rules/*` に機械実行可能な形式で記述 |
| PLAN/TASK は必ず Git 管理する | AI の判断履歴を `features/` 配下で追跡 |
| Worktree は標準経路にする | `aidd wt ensure` を唯一のエントリポイントにする |
| 手動運用を減らす | CLI と CI に責務を寄せる |
| エージェント依存設定は Git 管理しない | `~/.codex`, `~/.claude` は `.gitignore` 対象外（ホーム配下） |
| ルール変更は人間が承認する | CODEOWNERS で `.agent/rules/*` を保護 |
| CI で整合性を強制する | PR チェック + TASK.md 整合性チェック |

---

## 13. 導入チェックリスト

### ファイル・ディレクトリ

- [ ] `AGENTS.md` が存在し、必読順序・グローバルルールが記載されている
- [ ] `.agent/rules/` に以下が存在する:
  - [ ] `branch-strategy.md`
  - [ ] `coding-work.md`
  - [ ] `commit.md`
  - [ ] `testing.md`
  - [ ] `review-checklist.md`
- [ ] `.agent/commands/` に以下が存在する:
  - [ ] `issue-plan.md`
  - [ ] `task-run.md`
  - [ ] `task-done.md`
  - [ ] `pr-create.md`
- [ ] `.agent/templates/PLAN.md` と `.agent/templates/TASK.md` が存在する
- [ ] `.gitignore` に `.worktrees/` が追加されている

### CI

- [ ] `.github/workflows/pr-check.yml` が lint/test を実行する
- [ ] `.github/workflows/task-integrity.yml` が TASK.md の整合性をチェックする
- [ ] `.github/CODEOWNERS` でルールファイルが保護されている（推奨）

### CLI

- [ ] `aidd` CLI が以下のサブコマンドを持つ（または手動代替手順が文書化されている）:
  - [ ] `issue plan`
  - [ ] `wt ensure` / `wt remove`
  - [ ] `task run` / `task done`
  - [ ] `pr create`

### 運用

- [ ] AI が Issue 番号から PLAN.md / TASK.md を生成できる
- [ ] AI が TASK.md に従って実装→commit→PR を完走できる
- [ ] Worktree を使った並列開発が動作する
- [ ] 開発者の介入ポイントが Plan 承認と PR レビューの 2 点のみに制限されている
