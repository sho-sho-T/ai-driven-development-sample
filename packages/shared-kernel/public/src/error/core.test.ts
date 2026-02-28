import { describe, expect, test } from "vitest";
import { AppError, defineError } from "./core";

describe("defineError", () => {
	test("エラーを定義できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		expect(TestError.code).toBe("TEST_ERROR");
		expect(TestError.name).toBe("TestError");
		expect(TestError.description).toBe("テストエラーです");
		expect(TestError.meta).toEqual({ exposure: "EXPECTED" });
	});

	test("createメソッドでエラーインスタンスを作成できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const error = TestError.create({});

		expect(error).toBeInstanceOf(AppError);
		expect(error.code).toBe("TEST_ERROR");
		expect(error.name).toBe("TestError");
		expect(error.description).toBe("テストエラーです");
		expect(error.meta).toEqual({ exposure: "EXPECTED" });
	});

	test("createメソッドでペイロードを設定できること", () => {
		const TestError = defineError<{ userId: string; reason: string }>({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const payload = { userId: "user123", reason: "validation failed" };
		const error = TestError.create(payload);

		expect(error.payload).toEqual(payload);
		expect(error.payload.userId).toBe("user123");
		expect(error.payload.reason).toBe("validation failed");
	});

	test("createメソッドでcauseを指定できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const cause = new Error("原因エラー");
		const error = TestError.create({}, { cause });

		expect(error.cause).toBe(cause);
	});

	test("isメソッドで同じエラーコードのエラーを正しく判定できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const error = TestError.create({});

		expect(TestError.is(error)).toBe(true);
	});

	test("isメソッドで異なるエラーコードのエラーを正しく除外できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const OtherError = defineError({
			code: "OTHER_ERROR",
			name: "OtherError",
			description: "他のエラーです",
			meta: { exposure: "EXPECTED" },
		});

		const testError = TestError.create({});
		const otherError = OtherError.create({});

		expect(TestError.is(testError)).toBe(true);
		expect(TestError.is(otherError)).toBe(false);
		expect(OtherError.is(otherError)).toBe(true);
		expect(OtherError.is(testError)).toBe(false);
	});

	test("isメソッドで通常のErrorを正しく除外できること", () => {
		const TestError = defineError({
			code: "TEST_ERROR",
			name: "TestError",
			description: "テストエラーです",
			meta: { exposure: "EXPECTED" },
		});

		expect(TestError.is(new Error("通常のエラー"))).toBe(false);
		expect(TestError.is("文字列エラー")).toBe(false);
		expect(TestError.is(null)).toBe(false);
		expect(TestError.is(undefined)).toBe(false);
	});

	test("UNEXPECTEDエラーも正しく定義・作成できること", () => {
		const UnexpectedError = defineError({
			code: "UNEXPECTED_ERROR",
			name: "UnexpectedError",
			description: "想定外のエラーです",
			meta: { exposure: "UNEXPECTED", fault: "BUG" },
		});

		const error = UnexpectedError.create({});

		expect(error.code).toBe("UNEXPECTED_ERROR");
		expect(error.meta).toEqual({ exposure: "UNEXPECTED", fault: "BUG" });
		expect(UnexpectedError.is(error)).toBe(true);
	});

	test("複数のエラー定義が独立して動作すること", () => {
		const Error1 = defineError({
			code: "ERROR_1",
			name: "Error1",
			description: "エラー1",
			meta: { exposure: "EXPECTED" },
		});

		const Error2 = defineError({
			code: "ERROR_2",
			name: "Error2",
			description: "エラー2",
			meta: { exposure: "EXPECTED" },
		});

		const error1 = Error1.create({});
		const error2 = Error2.create({});

		expect(Error1.is(error1)).toBe(true);
		expect(Error1.is(error2)).toBe(false);
		expect(Error2.is(error2)).toBe(true);
		expect(Error2.is(error1)).toBe(false);
	});
});
