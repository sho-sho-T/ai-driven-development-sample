import type { RegisterLibraryCommand } from "@contracts/library-public";
import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { LibraryRepository } from "../../models/library-repository.ts";
import { registerLibraryHandler } from "./register-library.handler.ts";

function createMockRepository(): LibraryRepository {
	return {
		save: () => okAsync(undefined),
		findAll: () => okAsync([]),
		findById: () => okAsync(null),
	};
}

describe("registerLibraryHandler", () => {
	it("should register a library with valid input", async () => {
		const repository = createMockRepository();
		const handler = registerLibraryHandler.factory({ repository });
		const command: RegisterLibraryCommand = {
			type: "library.registerLibrary",
			input: { name: "中央図書館", email: "central@example.com" },
		};

		const result = await handler(command, {} as never);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.libraryId).toBeDefined();
		}
	});

	it("should return validation error for empty name", async () => {
		const repository = createMockRepository();
		const handler = registerLibraryHandler.factory({ repository });
		const command: RegisterLibraryCommand = {
			type: "library.registerLibrary",
			input: { name: "", email: "test@example.com" },
		};

		const result = await handler(command, {} as never);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});

	it("should return validation error for invalid email", async () => {
		const repository = createMockRepository();
		const handler = registerLibraryHandler.factory({ repository });
		const command: RegisterLibraryCommand = {
			type: "library.registerLibrary",
			input: { name: "図書館", email: "invalid" },
		};

		const result = await handler(command, {} as never);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});
});
