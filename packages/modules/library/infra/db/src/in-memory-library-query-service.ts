/**
 * In-memory LibraryQueryService 実装。
 *
 * Map ベースのシンプルな読み取り。開発・テスト用途。
 */

import type { LibraryQueryService } from "@modules/library-read";
import { okAsync } from "neverthrow";
import { libraryStore } from "./store.ts";

export class InMemoryLibraryQueryService implements LibraryQueryService {
	findAll() {
		const libraries = Array.from(libraryStore.values()).map((library) => ({
			id: library.id,
			name: library.name,
			location: library.location,
		}));
		return okAsync(
			libraries as ReadonlyArray<{
				id: string;
				name: string;
				location: string;
			}>,
		);
	}
}
