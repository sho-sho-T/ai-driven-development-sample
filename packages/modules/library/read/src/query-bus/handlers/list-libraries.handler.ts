import type { LibraryQueryHandlerDefinition } from "@contracts/library-server";
import type { LibraryId } from "@shared-kernel/public";
import type { LibraryQueryService } from "../../models/library-query-service.ts";

type Deps = {
	queryService: LibraryQueryService;
};

export const listLibrariesHandler: LibraryQueryHandlerDefinition<
	Deps,
	"library.listLibraries"
> = {
	factory: (deps) => () => {
		return deps.queryService.findAll().map((libraries) => ({
			libraries: libraries.map((library) => ({
				id: library.id as LibraryId,
				name: library.name,
				email: library.email,
				authenticationStatus: library.authenticationStatus,
			})),
			total: libraries.length,
		}));
	},
	settings: {},
};
