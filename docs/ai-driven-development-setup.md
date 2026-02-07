# AI駆動開発と開発体験向上の設定概要

このドキュメントは、「AI駆動開発を実現する設定」と「開発体験（DX）を高める設定」を、他プロジェクトへ再適用できる粒度でまとめたものです。

## 1. 目的と設計方針

- AIエージェントに「読むべき文書」「守るべきルール」「実行フロー」を明示して、出力品質を安定させる。
- 人間とAIが同じ手順（branch/worktree/test/PR）で作業し、レビュー容易性と再現性を確保する。
- ローカル開発環境をコンテナ＋タスクランナー＋CLIで標準化し、オンボーディングコストを下げる。
- 進捗管理（PLAN/TASK）をコード管理対象にし、運用ログをCIで自動検証する。

## 2. AI駆動開発の中核設定

### 2.1 共通エントリポイント

- `AGENTS.md`
  - プロジェクト説明、必読ドキュメント、利用可能スキルを定義。
  - エージェント起動時に読むべき一次情報として機能。
- `CLAUDE.md`
  - Claude向けの最小プロジェクト情報。

### 2.2 ルールの集中管理（`.agent/rules`）

以下のような「守るべき規約」をMarkdown化してAIに強制する。

- ブランチ戦略: `feat/*`, `docs/*`, `chore/*`（`.agent/rules/branch-strategy.md`）
- 作業ルール: worktree必須、完了時の lint/test/integration/e2e 実行（`.agent/rules/coding-work.md`）
- コミット規約: Conventional Commits + AIタグ（`.agent/rules/commit.md`）
- 設定変更時の承認制御（`.agent/rules/config-change-confirmation.md`）
- ディレクトリ/パッケージ構造、TDD、Reactテスト方針（`.agent/rules/*.md`）

ポイント:
- 「AIの判断に任せる」ではなく、判断基準をファイル化して毎回読ませる。
- ルールはコードと同じリポジトリでバージョン管理する。

### 2.3 AIコマンド化（`.agent/commands`）

プロンプトを定型化し、作業単位ごとに再利用する。

- 例: `/cc-plan`, `/cc-chore`, `/cc-docs`, `/task-run`, `/task-done`, `/pr`, `/done`
- 例: Notion連携コマンド `/ticket-get`, `/ticket-create`

効果:
- 作業開始時に必要なブランチ名・worktree作成・PRテンプレート反映を自動化できる。
- チーム内で「AIへの依頼手順」を統一できる。

### 2.4 PLAN/TASKテンプレート運用（`.agent/templates` + `features/`）

- テンプレート: `.agent/templates/PLAN.md`, `.agent/templates/TASK.md`
- 実体: `features/{itemNo}/PLAN.md`, `features/{itemNo}/{taskNo}/TASK.md`

FrontMatterで `status`, `completedDate`, `codingAgent(s)`, `branchName` を管理し、AI作業の監査ログとして使う。

### 2.5 エージェント別アダプタ設定

- Claude Code
  - `.claude/settings.local.json`: 許可コマンドを明示（Bash, notion MCP, git, gh など）
  - `.claude/hooks/on-notification.sh`, `.claude/hooks/on-stop.sh`: `orc slack send` でSlack通知
- Codex
  - `.codex/config.toml` は機密情報を含むためGit管理しない（`README.md`, `.gitignore`）
  - 通知例は `README.md` に記載
- Cursor
  - `.cursor/notify.sh`: 最終ユーザーメッセージ時刻を見て通知抑制しつつローカル通知

### 2.6 スキル運用

- 方針: `docs/guidelines/agent-skills.md`
- 共通スキル配置: `.agent/skills`（プロジェクト用）
- ローカル専用スキルは `.gitignore` で除外して管理可能（`.agent/skills/.system/`）

## 3. 並行開発（Worktree）を成立させる設定

### 3.1 worktree運用CLI（`orc`）

- ソース: `tools/orc`
- 主機能:
  - `orc wt add/ls/rm/cd`
  - `orc features is-done-task/check-plan/done-task/done-plan/update`
  - `orc doctor`, `orc slack send`

### 3.2 worktreeフック（`.orc.toml`）

`orc wt add` 時に以下を自動化。

- `.env` 複製
- `mise trust` / 依存インストール（`ni`）
- ブランチ名ベースでDB作成・DB名書き換え・migrate/seed
- docsブランチではDB関連処理をスキップ（`exclude_branch = ["docs/**"]`）
- VSCode window title, zellijタブ名の自動設定

`orc wt rm` 時は、通常DBとテストDBを削除。

### 3.3 開発フローガイド

- `docs/guidelines/development-workflow.md`
- `docs/guidelines/orc-wt.md`
- `docs/guidelines/feature-plan-and-task.md`

AI作業と人手作業を同じフロー（Notion item → PLAN/TASK → worktree → PR → done）に合わせている。

## 4. 開発体験（DX）を支える設定

### 4.1 ツールチェーン統一（`mise.toml`）

- Node/Bun/Rust/Go/AWS CLI/gh/Codex CLI などを宣言的に管理
- `mise run` に主要タスクを集約
  - `dev`, `lint`, `test`, `integration`, `e2e`
  - `db:*`
  - `orc:install`, `toys3:install`

### 4.2 Dev Container標準化（`.devcontainer/`）

- `devcontainer.json`
  - 各種永続volume（mise, aws, node_modules, worktrees, codex, claude, cursor, rust）
  - VSCode拡張・formatter設定を配布
- `post-create.sh`
  - ビルドツール導入、`mise install`、Claude CLI導入、`orc/toys3` ビルド
  - `core.hooksPath=.githooks` を設定
- `post-start.sh`
  - postgres起動（`docker-compose up -d`）
  - `orc doctor` / `toys3 start`

### 4.3 Git Hooks（`.githooks/`）

- `commit-msg`
  - Conventional Commits + type/scopeチェック
  - ブランチ名から `[ITEM-x]` `[TASK-x-y]` を自動付与
- `pre-push`
  - `tools/orc/**/*.rs` / `tools/toys3/**/*.rs` 変更時、`Cargo.toml` の version bump を必須化

### 4.4 GitHub Actions（`.github/workflows/`）

- `pr.yml`: PR時に lint/test（TypeScript/Rust変更時）
- `check-task-done.yml`: PRタイトルの `[TASK-x-y]` をもとに `orc features is-done-task` 実行
- `update-features.yml`: `features/**` 更新を契機に `FEATURES.md` / `PLAN.md` 同期PRを自動作成

### 4.5 ドキュメント配置

- 全体方針: `docs/`
- 運用ガイド: `docs/guidelines/`
- Tips: `docs/tips/`

実装だけでなく、運用ルールを文書で持つことでAIのコンテキスト品質を担保している。

## 5. 他プロジェクトへ適用するための実装チェックリスト

### Phase 1: 最小構成（まず入れる）

1. `AGENTS.md` を作成し、必読ルール一覧を定義する。
2. `.agent/rules` に branch/workflow/commit/test 方針を文書化する。
3. `.agent/commands` で `plan -> run -> pr -> done` の依頼テンプレートを作る。
4. `features/` に PLAN/TASK テンプレートを導入する。
5. `mise.toml` で `dev/lint/test` を統一する。

### Phase 2: 並行開発と自動化

1. `orc` 相当CLI（または同等スクリプト）で worktree管理を自動化する。
2. `.orc.toml` 相当で worktree作成/削除時フックを設定する。
3. `.githooks` を導入し commit/push ガードを追加する。
4. GitHub Actions に `PR checks` と `TASK done check` を追加する。

### Phase 3: 通知・運用強化

1. Claude/Codex/Cursorごとの通知連携を実装する。
2. `orc features update` 相当でダッシュボードファイル（`FEATURES.md`）を自動更新する。
3. `docs/guidelines` を拡充し、AIが参照できる設計知識を蓄積する。

## 6. 設計時の注意点（AI参照用）

- AIに対する指示は「口頭運用」ではなく、必ずファイル化してリポジトリ管理する。
- エージェント固有設定は分離しつつ、共通ルールは `.agent` に集約する。
- worktree + ブランチ単位DB分離を組み合わせると、AIの並列実装時の衝突を大きく減らせる。
- CIは「コード品質」だけでなく「運用メタデータ（PLAN/TASK整合）」も検証対象にする。
- 機密情報を含む設定（例: `.codex/config.toml`, 認証情報）はGit管理から除外し、READMEで手動設定手順を提供する。

## 7. 参照ファイル（このプロジェクト）

- AI共通: `AGENTS.md`, `.agent/rules/*`, `.agent/commands/*`, `.agent/templates/*`
- エージェント別: `.claude/*`, `.cursor/notify.sh`, `docs/codex.md`, `README.md`
- 並行開発: `.orc.toml`, `tools/orc/*`, `docs/guidelines/orc-wt.md`
- DX: `mise.toml`, `.devcontainer/*`, `.githooks/*`, `.github/workflows/*`, `docker-compose.yml`
- 運用ドキュメント: `docs/guidelines/*`, `FEATURES.md`