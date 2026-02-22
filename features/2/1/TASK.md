---
issueNumber: 2
taskNumber: 1
status: done
branchName: feat/issue-2-task-1
worktreePath: .worktrees/issue-2-task-1
---

# Context

Supabase 実装の前提となるインフラを整備する。`books` テーブルの作成マイグレーション SQL と、Supabase クライアントの初期化コードを用意する。

# Implementation Steps

1. `supabase/migrations/<timestamp>_create_books_table.sql` を作成
   - カラム: `id` (TEXT PK), `isbn` (TEXT UNIQUE NOT NULL, 13桁), `title` (TEXT NOT NULL), `author` (TEXT NOT NULL), `publisher` (TEXT NOT NULL), `published_year` (INT NOT NULL), `status` (TEXT NOT NULL)
2. `packages/modules/catalog-infra-db/package.json` に `@supabase/supabase-js` を依存追加
3. `packages/modules/catalog-infra-db/src/supabase-client.ts` を作成
   - `SUPABASE_URL` / `SUPABASE_ANON_KEY` 環境変数から `createClient` を初期化してエクスポート
4. `.env.example`（または既存の環境変数ドキュメント）に `SUPABASE_URL` / `SUPABASE_ANON_KEY` を追記

# Files to Change

- `supabase/migrations/<timestamp>_create_books_table.sql` (新規)
- `packages/modules/catalog-infra-db/package.json`
- `packages/modules/catalog-infra-db/src/supabase-client.ts` (新規)
- `.env.example` または `apps/web/.env.example` (新規 or 更新)

# Verification

- [ ] `mise run lint` パス
- [ ] マイグレーション SQL が正しい文法で記述されている
- [ ] `supabase-client.ts` が型エラーなしでビルドできる

# Commit Plan

- `feat(catalog-infra-db): add supabase migration and client initialization`
