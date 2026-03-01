/**
 * In-memory LibraryRepository 実装。
 *
 * Map ベースのシンプルな永続化。開発・テスト用途。
 */

import type { Library, LibraryRepository } from "@modules/library-write";
import { okAsync } from "neverthrow";
import { libraryStore } from "./store.ts";

export class InMemoryLibraryRepository implements LibraryRepository {
	save(library: Library) {
		libraryStore.set(library.id, { ...library });
		return okAsync(undefined);
	}

	findAll() {
		return okAsync(Array.from(libraryStore.values()) as ReadonlyArray<Library>);
	}
}
