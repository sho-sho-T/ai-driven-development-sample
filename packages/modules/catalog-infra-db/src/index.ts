/**
 * @modules/catalog-infra-db
 *
 * catalog コンテキストのインフラ実装。
 * インメモリストアによる BookRepository / BookQueryService の実装を提供する。
 *
 * registerCatalogInfra: DI コンテナにインフラ実装を登録する関数。
 * Composition Root から呼び出す。
 */
import type { Container } from "@shared-kernel/server";
import {
	BookRepositoryToken,
	BookQueryServiceToken,
} from "@contracts/catalog-server";
import { InMemoryBookRepository } from "./in-memory-book-repository.ts";
import { InMemoryBookQueryService } from "./in-memory-book-query-service.ts";

export { InMemoryBookRepository } from "./in-memory-book-repository.ts";
export { InMemoryBookQueryService } from "./in-memory-book-query-service.ts";

/**
 * catalog インフラ実装を DI コンテナに登録する。
 *
 * - BookRepository: インメモリ実装を登録
 * - BookQueryService: インメモリ実装を登録
 */
export function registerCatalogInfra(container: Container): void {
	container.register(BookRepositoryToken, new InMemoryBookRepository());
	container.register(BookQueryServiceToken, new InMemoryBookQueryService());
}
