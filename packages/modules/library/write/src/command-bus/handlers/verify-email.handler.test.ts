import type { VerifyLibraryEmailCommand } from "@contracts/library-public";
import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { Library } from "../../models/library.ts";
import type { LibraryRepository } from "../../models/library-repository.ts";
import { verifyEmailHandler } from "./verify-email.handler.ts";

function createMockRepository(
	library: Library | null = null,
): LibraryRepository {
	return {
		save: () => okAsync(undefined),
		findAll: () => okAsync([]),
		findById: () => okAsync(library),
	};
}

describe("verifyEmailHandler", () => {
	it("should verify email for unauthenticated library", async () => {
		const library: Library = {
			id: "lib-1",
			name: "テスト図書館",
			email: "test@example.com",
			authenticationStatus: "unauthenticated",
		};
		const repository = createMockRepository(library);
		const handler = verifyEmailHandler.factory({ repository });
		const command: VerifyLibraryEmailCommand = {
			type: "library.verifyEmail",
			input: { libraryId: "lib-1" },
		};

		const result = await handler(command, {} as never);

		expect(result.isOk()).toBe(true);
	});

	it("should return error when library not found", async () => {
		const repository = createMockRepository(null);
		const handler = verifyEmailHandler.factory({ repository });
		const command: VerifyLibraryEmailCommand = {
			type: "library.verifyEmail",
			input: { libraryId: "non-existent" },
		};

		const result = await handler(command, {} as never);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_NOT_FOUND");
		}
	});

	it("should return error when library already verified", async () => {
		const library: Library = {
			id: "lib-1",
			name: "テスト図書館",
			email: "test@example.com",
			authenticationStatus: "authenticated",
		};
		const repository = createMockRepository(library);
		const handler = verifyEmailHandler.factory({ repository });
		const command: VerifyLibraryEmailCommand = {
			type: "library.verifyEmail",
			input: { libraryId: "lib-1" },
		};

		const result = await handler(command, {} as never);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_ALREADY_VERIFIED");
		}
	});
});
