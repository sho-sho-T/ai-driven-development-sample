import { describe, expect, it } from "vitest";
import { createLibrary, verifyEmail } from "./library-behaviors.ts";
import type { Library } from "./library.ts";

describe("createLibrary", () => {
	it("should create a library with valid input including email", () => {
		const result = createLibrary({
			name: "中央図書館",
			email: "central@example.com",
		});

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.name).toBe("中央図書館");
			expect(result.value.email).toBe("central@example.com");
			expect(result.value.authenticationStatus).toBe("unauthenticated");
			expect(result.value.id).toBeDefined();
			expect(result.value.id.length).toBeGreaterThan(0);
		}
	});

	it("should return error for empty name", () => {
		const result = createLibrary({
			name: "",
			email: "test@example.com",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});

	it("should return error for invalid email", () => {
		const result = createLibrary({
			name: "図書館",
			email: "invalid-email",
		});

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_VALIDATION_ERROR");
		}
	});
});

describe("verifyEmail", () => {
	it("should change authentication status to authenticated", () => {
		const library: Library = {
			id: "test-id",
			name: "テスト図書館",
			email: "test@example.com",
			authenticationStatus: "unauthenticated",
		};

		const result = verifyEmail(library);

		expect(result.isOk()).toBe(true);
		if (result.isOk()) {
			expect(result.value.authenticationStatus).toBe("authenticated");
			expect(result.value.id).toBe("test-id");
			expect(result.value.name).toBe("テスト図書館");
			expect(result.value.email).toBe("test@example.com");
		}
	});

	it("should return error when already authenticated", () => {
		const library: Library = {
			id: "test-id",
			name: "テスト図書館",
			email: "test@example.com",
			authenticationStatus: "authenticated",
		};

		const result = verifyEmail(library);

		expect(result.isErr()).toBe(true);
		if (result.isErr()) {
			expect(result.error.code).toBe("LIBRARY_ALREADY_VERIFIED");
		}
	});
});
