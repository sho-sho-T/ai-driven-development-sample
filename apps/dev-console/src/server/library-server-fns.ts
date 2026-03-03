import type {
	LibraryListResult,
	RegisterLibraryInput,
	RegisterLibraryResult,
} from "@contracts/library-public";
import { createServerFn } from "@tanstack/react-start";
import {
	getExecutionContext,
	getLibraryCommandBus,
	getLibraryQueryBus,
} from "./di/configure.ts";

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

export const registerLibrary = createServerFn({ method: "POST" }).handler(
	async ({
		data,
	}: {
		data: RegisterLibraryInput;
	}): Promise<RegisterLibraryResult> => {
		const bus = getLibraryCommandBus();
		const context = getExecutionContext();
		const result = await bus.execute(
			{
				type: "library.registerLibrary",
				input: data,
			},
			context,
		);

		if (result.isOk()) {
			return result.value;
		}
		throw new Error(result.error.message);
	},
);

export const verifyLibraryEmail = createServerFn({ method: "POST" }).handler(
	async ({ data }: { data: VerifyLibraryEmailInput }): Promise<void> => {
		const bus = getLibraryCommandBus();
		const context = getExecutionContext();
		const result = await bus.execute(
			{
				type: "library.verifyEmail",
				input: data,
			},
			context,
		);

		if (result.isOk()) {
			return;
		}
		throw new Error(result.error.message);
	},
);
