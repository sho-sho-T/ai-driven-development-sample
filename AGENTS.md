# AGENTS.md

## Project

TanStack Start + Supabase モジュラーモノリス。
Bun workspaces モノレポ（`apps/*`, `packages/*`）。

## Read Order

1. `docs/ai-driven-development-setup.md` — AI駆動開発の全体設計
2. `docs/application-architecture.md` — アーキテクチャ設計
3. `.agent/rules/*` — 遵守ルール一式
4. `.agent/templates/*` — PLAN/TASK テンプレート

## Global Rules

- すべての作業は Issue 番号起点で開始する
- 実装前に PLAN.md / TASK.md を生成・更新する
- すべての変更は Worktree 上で行う（main 直接変更禁止）
- 完了前に lint / test を実行する
- 破壊的コマンド（force push, reset --hard, drop table 等）は禁止

## Forbidden Actions

- main ブランチへの直接 commit / push
- `.env` ファイルのコミット
- 他人の Worktree の削除
- `AGENTS.md` / `.agent/rules/*` の無断変更
