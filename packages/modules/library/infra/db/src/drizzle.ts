import {
	LibraryQueryServiceToken,
	LibraryRepositoryToken,
} from "@contracts/library-server";
import type { Container } from "@shared-kernel/server";
import { DrizzleLibraryQueryService } from "./drizzle-library-query-service.ts";
import { DrizzleLibraryRepository } from "./drizzle-library-repository.ts";

export { DrizzleLibraryQueryService } from "./drizzle-library-query-service.ts";
export { DrizzleLibraryRepository } from "./drizzle-library-repository.ts";

/**
 * library インフラ実装（Drizzle DB）を DI コンテナに登録する。
 */
export function registerLibraryInfra(container: Container): void {
	container.register(LibraryRepositoryToken, new DrizzleLibraryRepository());
	container.register(
		LibraryQueryServiceToken,
		new DrizzleLibraryQueryService(),
	);
}
