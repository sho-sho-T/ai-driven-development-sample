import type { LibraryListResult } from "@contracts/library-public";
import { createServerFn } from "@tanstack/react-start";
import { getExecutionContext, getLibraryQueryBus } from "./di/configure.ts";

export const listLibraries = createServerFn({ method: "GET" }).handler(
	async (): Promise<LibraryListResult> => {
		const bus = getLibraryQueryBus();
		const context = getExecutionContext();
		const result = await bus.execute(
			{ type: "library.listLibraries" },
			context,
		);

		if (result.isOk()) {
			return result.value;
		}
		throw new Error(result.error.message);
	},
);
