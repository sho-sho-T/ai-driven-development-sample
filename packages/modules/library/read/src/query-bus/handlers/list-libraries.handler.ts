/**
 * ListLibraries クエリハンドラー。
 *
 * 「図書館一覧取得」ユースケースを実装する。
 *
 * フロー:
 * 1. LibraryQueryService で全図書館の ReadModel を取得
 * 2. LibraryListResult に変換して返却
 */

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
				location: library.location,
			})),
			total: libraries.length,
		}));
	},
	settings: {},
};
