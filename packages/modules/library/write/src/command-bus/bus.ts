/**
 * Library CommandBus ファクトリー。
 *
 * LibraryCommandBusBuilder を使って全ハンドラーを登録し、
 * 型安全な LibraryCommandBus を返す。
 */
import type { LibraryCommandBus } from "@contracts/library-server";
import type { Container, Middleware } from "@shared-kernel/server";
import type { LibraryRepository } from "../models/library-repository.ts";
import { LibraryCommandBusBuilder } from "./builder.ts";
import { registerLibraryHandler } from "./handlers/index.ts";

/** ハンドラーが必要とする依存の和集合 */
type Deps = {
	repository: LibraryRepository;
};

/** ファクトリーに渡す依存 */
type BuildLibraryCommandBusDeps = {
	resolveDeps: (container: Container) => Deps;
	middlewares?: Middleware[];
};

export function buildLibraryCommandBus(
	deps: BuildLibraryCommandBusDeps,
): LibraryCommandBus {
	const builder = new LibraryCommandBusBuilder<Deps>();

	if (deps.middlewares) {
		for (const mw of deps.middlewares) {
			builder.use(mw);
		}
	}

	return builder
		.register("library.registerLibrary", {
			handlerFactory: (allDeps) =>
				registerLibraryHandler.factory({
					repository: allDeps.repository,
				}),
			settings: registerLibraryHandler.settings,
		})
		.build({
			resolveDeps: deps.resolveDeps,
		});
}
