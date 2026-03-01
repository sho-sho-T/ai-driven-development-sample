/**
 * @modules/library-infra-db
 *
 * library コンテキストのインフラ実装。
 * In-memory による LibraryRepository / LibraryQueryService の実装を提供する。
 *
 * registerLibraryInfra: DI コンテナにインフラ実装を登録する関数。
 * Composition Root から呼び出す。
 */
import type { Container } from "@shared-kernel/server";
import {
	LibraryRepositoryToken,
	LibraryQueryServiceToken,
} from "@contracts/library-server";
import { InMemoryLibraryRepository } from "./in-memory-library-repository.ts";
import { InMemoryLibraryQueryService } from "./in-memory-library-query-service.ts";

export { InMemoryLibraryRepository } from "./in-memory-library-repository.ts";
export { InMemoryLibraryQueryService } from "./in-memory-library-query-service.ts";

/**
 * library インフラ実装を DI コンテナに登録する。
 *
 * - LibraryRepository: In-memory 実装を登録
 * - LibraryQueryService: In-memory 実装を登録
 */
export function registerLibraryInfra(container: Container): void {
	container.register(LibraryRepositoryToken, new InMemoryLibraryRepository());
	container.register(
		LibraryQueryServiceToken,
		new InMemoryLibraryQueryService(),
	);
}
