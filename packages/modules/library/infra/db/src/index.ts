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
 * library インフラ実装（In-memory）を DI コンテナに登録する。テスト・開発用。
 */
export function registerLibraryInfraInMemory(container: Container): void {
	container.register(LibraryRepositoryToken, new InMemoryLibraryRepository());
	container.register(
		LibraryQueryServiceToken,
		new InMemoryLibraryQueryService(),
	);
}
