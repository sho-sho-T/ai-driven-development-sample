---
issueNumber: 1
title: "Rustでaiddを実装しIssue起点フローで利用可能にする"
status: done
ownerAgent: claude
createdAt: 2026-02-08T00:00:00Z
---

# Goal

Rust 製 `aidd` CLI を導入し、Worktree・Issue・Task・PR の操作を標準化する。AI エージェントが `aidd` を通じて Issue 取得 → Plan/Task 生成 → 実装 → 検証 → PR 作成を完走できる状態にする。

# Scope

- `tools/aidd/` 配下に Rust CLI プロジェクトを構築（既存の `aidd.sh` を Rust で置き換え）
- サブコマンド: `wt ensure`, `wt remove`, `issue plan`, `task run`, `task done`, `pr create`, `status`
- `.agent/commands/*.md` を `aidd` 利用前提に更新
- エラー処理・ログ・終了コードの整備
- ユニットテスト・統合テスト
- 利用ドキュメント更新

# Task Breakdown

| # | タスク概要 | ブランチ名 | 見積 |
|---|-----------|-----------|------|
| 1 | Rust CLI 基盤のセットアップ（Cargo.toml, main.rs, サブコマンド定義） | feat/issue-1-task-1 | S |
| 2 | `wt ensure` / `wt remove` コマンドの実装 | feat/issue-1-task-2 | M |
| 3 | `issue plan` コマンドの実装 | feat/issue-1-task-3 | M |
| 4 | `task run` / `task done` コマンドの実装 | feat/issue-1-task-4 | M |
| 5 | `pr create` / `status` コマンドの実装 | feat/issue-1-task-5 | S |
| 6 | エラー処理・ログ・テスト整備 | feat/issue-1-task-6 | M |
| 7 | `.agent/commands/*.md` 更新とドキュメント整備 | feat/issue-1-task-7 | S |

# Risks

| リスク | 対策 |
|--------|------|
| DevContainer 環境に Rust ツールチェインがない | `mise.toml` に rust を追加、または devcontainer に rustup を含める |
| `gh` CLI 等の外部コマンド依存 | `std::process::Command` でラップし、未インストール時に明確なエラーを返す |
| Worktree 操作の冪等性担保 | 既存の `aidd.sh` のロジックを踏襲しつつ、エッジケース（不正状態のworktree等）を処理 |
| PLAN.md / TASK.md のパース | frontmatter 解析ライブラリ（serde_yaml）を使用 |

# Definition of Done

- [ ] すべての Task が done
- [ ] lint/test パス
- [ ] PR レビュー済み
