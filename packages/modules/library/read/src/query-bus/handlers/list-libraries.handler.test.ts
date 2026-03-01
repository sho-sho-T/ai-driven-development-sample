/**
 * ListLibraries クエリハンドラーのユニットテスト。
 *
 * - 正常系: 空リストで LibraryListResult が返される
 * - 正常系: 複数件で LibraryListResult が返される
 */

import type { LibraryListQuery } from "@contracts/library-public";
import { okAsync } from "neverthrow";
import { describe, expect, it } from "vitest";
import type { LibraryQueryService } from "../../models/library-query-service.ts";
import { listLibrariesHandler } from "./list-libraries.handler.ts";

function createMockQueryService(
	data: { id: string; name: string; location: string }[],
): LibraryQueryService {
	return {
		findAll: () => okAsync(data),
	};
}

describe("listLibrariesHandler", () => {
	it("should return empty list when no libraries exist", async () => {
		const queryService = createMockQueryService([]);
		const handler = listLibrariesHandler.factory({ queryService });
		const query: LibraryListQuery = { type: "library.listLibraries" };

		const result = await handler(query, {} as never);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.libraries).toEqual([]);
			expect(result.value.total).toBe(0);
		}
	});

	it("should return libraries when they exist", async () => {
		const queryService = createMockQueryService([
			{ id: "1", name: "中央図書館", location: "東京" },
			{ id: "2", name: "分館", location: "大阪" },
		]);
		const handler = listLibrariesHandler.factory({ queryService });
		const query: LibraryListQuery = { type: "library.listLibraries" };

		const result = await handler(query, {} as never);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.libraries).toHaveLength(2);
			expect(result.value.total).toBe(2);
			expect(result.value.libraries[0].name).toBe("中央図書館");
			expect(result.value.libraries[1].name).toBe("分館");
		}
	});
});
