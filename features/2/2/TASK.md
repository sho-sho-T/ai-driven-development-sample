---
issueNumber: 2
taskNumber: 2
status: done
branchName: feat/issue-2-task-2
worktreePath: .worktrees/issue-2-task-2
---

# Context

Task 1 で準備した Supabase クライアントを使い、既存の InMemory 実装と同じインターフェースを満たす `BookRepository` / `BookQueryService` の Supabase 実装を作成する。

# Implementation Steps

1. `packages/modules/catalog-infra-db/src/supabase-book-repository.ts` を作成
   - `BookRepository` インターフェースを実装
   - `findById(id)`: `supabase.from('books').select().eq('id', id).single()` → `okAsync(book | null)`
   - `findByIsbn(isbn)`: `supabase.from('books').select().eq('isbn', isbn).single()` → `okAsync(book | null)`
   - `save(book)`: `supabase.from('books').upsert(book)` → `okAsync(undefined)`
   - DB エラーは `errAsync({ code: 'INFRASTRUCTURE_ERROR', message: error.message })` に変換
2. `packages/modules/catalog-infra-db/src/supabase-book-query-service.ts` を作成
   - `BookQueryService` インターフェースを実装
   - `findAll()`: `supabase.from('books').select()` → `okAsync(BookReadModel[])`
   - `findById(id)`: `supabase.from('books').select().eq('id', id).single()` → `okAsync(BookReadModel | null)`
   - DB エラーは `errAsync` に変換
3. `AppError` 型を確認し、エラーコードを合わせる（`@shared-kernel/public` の定義に従う）

# Files to Change

- `packages/modules/catalog-infra-db/src/supabase-book-repository.ts` (新規)
- `packages/modules/catalog-infra-db/src/supabase-book-query-service.ts` (新規)

# Verification

- [ ] `mise run lint` パス
- [ ] `bun test` パス（既存テストが壊れていないこと）
- [ ] 型エラーなし（`any` 禁止）
- [ ] InMemory 実装と同じインターフェースシグネチャを満たしていること

# Commit Plan

- `feat(catalog-infra-db): add supabase book repository and query service`
