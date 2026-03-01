/**
 * Library 集約の振る舞いユニットテスト。
 *
 * 純粋関数であるドメインロジックを検証する。
 * - 正常系: 有効な入力で Library が生成される
 * - 異常系: 空名前でエラーが返る
 */
import { describe, expect, it } from "vitest";
import { createLibrary } from "./library-behaviors.ts";

describe("createLibrary", () => {
	it("should create a library with valid input", () => {
		const result = createLibrary({
			name: "中央図書館",
			location: "東京都千代田区",
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.name).toBe("中央図書館");
			expect(result.value.location).toBe("東京都千代田区");
			expect(result.value.id).toBeDefined();
			expect(result.value.id.length).toBeGreaterThan(0);
		}
	});

	it("should create a library with empty location", () => {
		const result = createLibrary({
			name: "分館",
			location: "",
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.name).toBe("分館");
			expect(result.value.location).toBe("");
		}
	});

	it("should return error for empty name", () => {
		const result = createLibrary({
			name: "",
			location: "東京",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});
});
