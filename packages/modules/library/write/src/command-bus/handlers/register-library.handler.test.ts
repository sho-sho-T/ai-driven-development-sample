/**
 * RegisterLibrary コマンドハンドラーのユニットテスト。
 *
 * - 正常系: 有効な入力で RegisterLibraryResult が返される
 * - 異常系: 空名前でバリデーションエラーが返る
 */

import type { RegisterLibraryCommand } from "@contracts/library-public";
import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { LibraryRepository } from "../../models/library-repository.ts";
import { registerLibraryHandler } from "./register-library.handler.ts";

function createMockRepository(): LibraryRepository {
	return {
		save: () => okAsync(undefined),
		findAll: () => okAsync([]),
	};
}

describe("registerLibraryHandler", () => {
	it("should register a library with valid input", async () => {
		const repository = createMockRepository();
		const handler = registerLibraryHandler.factory({ repository });
		const command: RegisterLibraryCommand = {
			type: "library.registerLibrary",
			input: { name: "中央図書館", location: "東京都千代田区" },
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
			input: { name: "", location: "東京" },
		};

		const result = await handler(command, {} as never);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});
});
