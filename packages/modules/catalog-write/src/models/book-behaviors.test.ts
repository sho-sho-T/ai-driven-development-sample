/**
 * Book 集約の振る舞いユニットテスト。
 *
 * 純粋関数であるドメインロジックを検証する。
 * - 正常系: 有効な入力で Book が生成される
 * - 異常系: 不正な ISBN / 空タイトル / 空著者でエラーが返る
 * - 状態遷移: changeBookStatus で status が変更される
 */
import { describe, expect, it } from "vitest";
import { createBook, changeBookStatus } from "./book-behaviors.ts";

describe("createBook", () => {
	it("should create a book with valid input", () => {
		const result = createBook({
			isbn: "9784101010014",
			title: "吾輩は猫である",
			author: "夏目漱石",
			publisher: "新潮社",
			publishedYear: 1905,
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.isbn).toBe("9784101010014");
			expect(result.value.title).toBe("吾輩は猫である");
			expect(result.value.author).toBe("夏目漱石");
			expect(result.value.publisher).toBe("新潮社");
			expect(result.value.publishedYear).toBe(1905);
			expect(result.value.status).toBe("available");
			expect(result.value.id).toBeDefined();
			expect(result.value.id.length).toBeGreaterThan(0);
		}
	});

	it("should create a book without optional fields", () => {
		const result = createBook({
			isbn: "9784101010014",
			title: "吾輩は猫である",
			author: "夏目漱石",
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.publisher).toBe("");
			expect(result.value.publishedYear).toBeUndefined();
		}
	});

	it("should return error for invalid ISBN (not 13 digits)", () => {
		const result = createBook({
			isbn: "1234",
			title: "テスト",
			author: "著者",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("CATALOG_VALIDATION_ERROR");
		}
	});

	it("should return error for empty title", () => {
		const result = createBook({
			isbn: "9784101010014",
			title: "",
			author: "著者",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("CATALOG_VALIDATION_ERROR");
		}
	});

	it("should return error for empty author", () => {
		const result = createBook({
			isbn: "9784101010014",
			title: "テスト",
			author: "",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("CATALOG_VALIDATION_ERROR");
		}
	});
});

describe("changeBookStatus", () => {
	it("should change status from available to onLoan", () => {
		const bookResult = createBook({
			isbn: "9784101010014",
			title: "テスト",
			author: "著者",
		});
		expect(bookResult.isOk()).toBe(true);

		if (bookResult.isOk()) {
			const result = changeBookStatus(bookResult.value, "onLoan");
			expect(result.isOk()).toBe(true);
			if (result.isOk()) {
				expect(result.value.status).toBe("onLoan");
				// 元の book は変更されていないこと（イミュータブル）
				expect(bookResult.value.status).toBe("available");
			}
		}
	});

	it("should change status from onLoan to available", () => {
		const bookResult = createBook({
			isbn: "9784101010014",
			title: "テスト",
			author: "著者",
		});
		expect(bookResult.isOk()).toBe(true);

		if (bookResult.isOk()) {
			const onLoan = changeBookStatus(bookResult.value, "onLoan");
			expect(onLoan.isOk()).toBe(true);
			if (onLoan.isOk()) {
				const result = changeBookStatus(onLoan.value, "available");
				expect(result.isOk()).toBe(true);
				if (result.isOk()) {
					expect(result.value.status).toBe("available");
				}
			}
		}
	});
});
