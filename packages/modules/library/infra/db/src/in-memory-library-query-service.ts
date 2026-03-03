import type { LibraryQueryService } from "@modules/library-read";
import { okAsync } from "neverthrow";
import { libraryStore } from "./store.ts";

export class InMemoryLibraryQueryService implements LibraryQueryService {
	findAll() {
		const libraries = Array.from(libraryStore.values()).map((library) => ({
			id: library.id,
			name: library.name,
			email: library.email,
			authenticationStatus: library.authenticationStatus,
		}));
		return okAsync(
			libraries as ReadonlyArray<{
				id: string;
				name: string;
				email: string;
				authenticationStatus: string;
			}>,
		);
	}
}
