/**
 * Library QueryBus ファクトリー。
 *
 * LibraryQueryBusBuilder を使って全ハンドラーを登録し、
 * 型安全な LibraryQueryBus を返す。
 */
import type { LibraryQueryBus } from "@contracts/library-server";
import type { Container, Middleware } from "@shared-kernel/server";
import type { LibraryQueryService } from "../models/library-query-service.ts";
import { LibraryQueryBusBuilder } from "./builder.ts";
import { listLibrariesHandler } from "./handlers/index.ts";

/** ハンドラーが必要とする依存の和集合 */
type Deps = {
	queryService: LibraryQueryService;
};

/** ファクトリーに渡す依存 */
type BuildLibraryQueryBusDeps = {
	resolveDeps: (container: Container) => Deps;
	middlewares?: Middleware[];
};

export function buildLibraryQueryBus(
	deps: BuildLibraryQueryBusDeps,
): LibraryQueryBus {
	const builder = new LibraryQueryBusBuilder<Deps>();

	if (deps.middlewares) {
		for (const mw of deps.middlewares) {
			builder.use(mw);
		}
	}

	return builder
		.register("library.listLibraries", {
			handlerFactory: (allDeps) =>
				listLibrariesHandler.factory({
					queryService: allDeps.queryService,
				}),
			settings: listLibrariesHandler.settings,
		})
		.build({
			resolveDeps: deps.resolveDeps,
		});
}
