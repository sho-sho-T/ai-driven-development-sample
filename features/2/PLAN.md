---
issueNumber: 2
title: "Supabase DB にデータを永続化する"
status: in-progress
ownerAgent: claude
createdAt: 2026-02-15T00:00:00Z
---

# Goal

インメモリ `Map` による書籍データの揮発問題を解消するため、`catalog-infra-db` パッケージの Repository / QueryService 実装を Supabase（PostgreSQL）に差し替え、データを永続化する。

# Scope

- `supabase/migrations/` — `books` テーブル作成マイグレーション SQL
- `packages/modules/catalog-infra-db/` — Supabase 実装ファイル追加 + DI 登録切り替え
- `apps/web/` — 環境変数追加（`.env.example` 等）

変更不要:
- contracts パッケージ / インターフェース定義
- コマンド・クエリハンドラー
- フロントエンド / Server Functions

# Task Breakdown

| # | タスク概要 | ブランチ名 | 見積 |
|---|-----------|-----------|------|
| 1 | Supabase マイグレーション作成 + クライアント初期化 | feat/issue-2-task-1 | S |
| 2 | Supabase Repository / QueryService 実装 | feat/issue-2-task-2 | M |
| 3 | DI 登録切り替え + 環境変数設定 | feat/issue-2-task-3 | S |

# Risks

- **Supabase 接続情報**: `.env` に `SUPABASE_URL` / `SUPABASE_ANON_KEY` が設定されていない場合、ランタイムエラー → `.env.example` にプレースホルダーを追加し、README に記載する
- **DB エラーの型変換**: Supabase クライアントのエラーを `AppError`（neverthrow）に変換するラッパーが必要
- **ISBN 一意性制約**: DB 側で UNIQUE 制約を設けることで、重複 ISBN の登録がアプリ層より先に DB で弾かれる → エラーハンドリングを適切に実装する

# Definition of Done

- [ ] すべての Task が done
- [ ] lint/test パス
- [ ] PR レビュー済み
