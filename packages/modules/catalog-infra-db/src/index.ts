/**
 * @modules/catalog-infra-db
 *
 * catalog コンテキストのインフラ実装。
 * Supabase による BookRepository / BookQueryService の実装を提供する。
 *
 * registerCatalogInfra: DI コンテナにインフラ実装を登録する関数。
 * Composition Root から呼び出す。
 */
import type { Container } from "@shared-kernel/server";
import {
	BookRepositoryToken,
	BookQueryServiceToken,
} from "@contracts/catalog-server";
import { SupabaseBookRepository } from "./supabase-book-repository.ts";
import { SupabaseBookQueryService } from "./supabase-book-query-service.ts";

export { SupabaseBookRepository } from "./supabase-book-repository.ts";
export { SupabaseBookQueryService } from "./supabase-book-query-service.ts";

/**
 * catalog インフラ実装を DI コンテナに登録する。
 *
 * - BookRepository: Supabase 実装を登録
 * - BookQueryService: Supabase 実装を登録
 */
export function registerCatalogInfra(container: Container): void {
	container.register(BookRepositoryToken, new SupabaseBookRepository());
	container.register(BookQueryServiceToken, new SupabaseBookQueryService());
}
