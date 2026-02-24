/**
 * @modules/catalog-infra-db
 *
 * catalog コンテキストのインフラ実装。
 * Drizzle ORM による BookRepository / BookQueryService の実装を提供する。
 *
 * registerCatalogInfra: DI コンテナにインフラ実装を登録する関数。
 * Composition Root から呼び出す。
 */
import type { Container } from "@shared-kernel/server";
import {
	BookRepositoryToken,
	BookQueryServiceToken,
} from "@contracts/catalog-server";
import { DrizzleBookRepository } from "./drizzle-book-repository.ts";
import { DrizzleBookQueryService } from "./drizzle-book-query-service.ts";

export { DrizzleBookRepository } from "./drizzle-book-repository.ts";
export { DrizzleBookQueryService } from "./drizzle-book-query-service.ts";

/**
 * catalog インフラ実装を DI コンテナに登録する。
 *
 * - BookRepository: Drizzle 実装を登録
 * - BookQueryService: Drizzle 実装を登録
 */
export function registerCatalogInfra(container: Container): void {
	container.register(BookRepositoryToken, new DrizzleBookRepository());
	container.register(BookQueryServiceToken, new DrizzleBookQueryService());
}
