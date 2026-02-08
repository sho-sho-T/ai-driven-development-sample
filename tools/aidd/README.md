# aidd - AI-Driven Development CLI

AI エージェントが **Issue → Plan → Task → 実装 → PR** の開発フローを自動化するための CLI ツール。

## 目的

本プロジェクトでは、GitHub Issue を起点とした開発ワークフローを標準化している。`aidd` は、このワークフロー内で発生する定型作業（Worktree 管理、計画書生成、検証、PR 作成など）をコマンド化し、AI エージェントおよび開発者が一貫した手順で作業を進められるようにする。

## コマンド一覧

| コマンド | 説明 |
|---------|------|
| `aidd wt ensure <issue> <task>` | Worktree + ブランチを作成し依存をインストール（冪等） |
| `aidd wt remove <issue> <task>` | Worktree とブランチを削除 |
| `aidd issue plan <issue>` | GitHub Issue から PLAN.md / TASK.md を自動生成 |
| `aidd task run <issue> <task>` | Worktree を準備し TASK.md の status を `doing` に更新 |
| `aidd task done <issue> <task>` | lint / test / commit / push / PR 作成を一括実行 |
| `aidd pr create <issue> <task>` | ブランチを push し PR を作成 |
| `aidd status` | 全 Issue / Task のステータスを一覧表示 |

グローバルオプション: `--verbose` (`-v`) で詳細ログを有効化。

## セットアップ

### 前提条件

- Rust ツールチェイン（`mise.toml` に定義済み）
- `git`, `gh` (GitHub CLI), `bun`, `mise`

### ビルド

```bash
cd tools/aidd
cargo build --release
```

バイナリは `tools/aidd/target/release/aidd` に生成される。

### 開発時の実行

```bash
cargo run -- <command> [args...]
```

## 利用フロー

```
1. Issue 作成        → GitHub 上で Issue を起票
2. aidd issue plan   → PLAN.md / TASK.md を生成
3. aidd task run     → Worktree を準備し実装を開始
4. （実装作業）
5. aidd task done    → lint → test → commit → PR 作成
```

## プロジェクト構成

```
tools/aidd/
├── Cargo.toml
├── src/
│   ├── main.rs           # エントリポイント
│   ├── cli.rs            # clap サブコマンド定義
│   ├── helpers.rs        # パス生成・コマンド実行・ログ
│   ├── frontmatter.rs    # YAML frontmatter パース / 更新
│   └── commands/
│       ├── wt.rs         # wt ensure / wt remove
│       ├── issue.rs      # issue plan
│       ├── task.rs       # task run / task done
│       ├── pr.rs         # pr create
│       └── status.rs     # status
├── tests/
│   └── cli_test.rs       # 統合テスト
└── aidd.sh               # 旧シェルスクリプト版（参考用）
```

## テスト

```bash
cargo test
```

## 外部依存

| ツール | 用途 |
|--------|------|
| `git` | Worktree / ブランチ操作 |
| `gh` | Issue 取得・PR 作成 |
| `bun` | 依存インストール・テスト実行 |
| `mise` | ツール管理・lint 実行 |
