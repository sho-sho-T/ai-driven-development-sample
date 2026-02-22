---
issueNumber: 2
taskNumber: 3
status: done
branchName: feat/issue-2-task-3
worktreePath: .worktrees/issue-2-task-3
---

# Context

Task 2 で作成した Supabase 実装を DI コンテナに登録し、InMemory 実装から完全に切り替える。環境変数の設定確認も行う。

# Implementation Steps

1. `packages/modules/catalog-infra-db/src/index.ts` を更新
   - `InMemoryBookRepository` / `InMemoryBookQueryService` の登録を削除
   - `SupabaseBookRepository` / `SupabaseBookQueryService` を `registerCatalogInfra` で登録するよう変更
   - export も Supabase 実装に切り替え（InMemory は削除または残すか判断）
2. `.env` / `apps/web/.env` に `SUPABASE_URL` / `SUPABASE_ANON_KEY` を設定（ローカル開発用値）
3. 動作確認: アプリを起動して書籍登録・一覧・詳細が Supabase と通信できること
4. アプリ再起動後もデータが残ることを確認

# Files to Change

- `packages/modules/catalog-infra-db/src/index.ts`
- `.env` または `apps/web/.env`（git 管理外）

# Verification

- [ ] `mise run lint` パス
- [ ] `bun test` パス
- [ ] 書籍の登録（RegisterBook）で Supabase にデータが保存される
- [ ] 書籍一覧（ListBooks）で Supabase からデータが取得される
- [ ] 書籍詳細（GetBookById）で Supabase からデータが取得される
- [ ] ISBN の一意性チェックが DB 上で機能する
- [ ] アプリ再起動後もデータが永続化されている

# Commit Plan

- `feat(catalog-infra-db): switch DI registration from in-memory to supabase`
