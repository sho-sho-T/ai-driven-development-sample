---
issueNumber: 11
title: "feat: デプロイフローの構築（Supabase + TanStack Start on Cloudflare Workers）"
status: draft
ownerAgent: claude
createdAt: 2026-02-22T13:44:40Z
---

# Goal
feat: デプロイフローの構築（Supabase + TanStack Start on Cloudflare Workers）

# Scope
See individual task definitions in `features/11/*/TASK.md`.

# Task Breakdown
| # | タスク概要 | ブランチ名 | 見積 |
|---|-----------|-----------|------|
| 1 | `aidd deploy` を実行すると Supabase マイグレーションと TanStack Start デプロイが順に実行される | feat/issue-11-task-1 | M |
| 2 | Supabase Cloud 上に `books` テーブルが作成され、マイグレーションが適用される | feat/issue-11-task-2 | M |
| 3 | TanStack Start（apps/web）が Cloudflare Workers にデプロイされる | feat/issue-11-task-3 | M |
| 4 | デプロイ後の本番 URL からアクセスし、ローカル環境と同じように書籍の CRUD 操作ができる | feat/issue-11-task-4 | M |

# Risks
<!-- 実装上のリスクと対策 -->

# Definition of Done
- [ ] すべての Task が done
- [ ] lint/test パス
- [ ] PR レビュー済み
