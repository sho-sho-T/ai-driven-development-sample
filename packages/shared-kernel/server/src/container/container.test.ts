import { describe, expect, it } from "vitest";
import { createContainer, createToken } from "./container.ts";

describe("createContainer", () => {
	describe("register / resolve", () => {
		it("should resolve a registered value", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "hello");
			expect(container.resolve(token)).toBe("hello");
		});

		it("should throw when resolving unregistered token", () => {
			const container = createContainer();
			const token = createToken<string>("missing");
			expect(() => container.resolve(token)).toThrow(
				"No registration found for token: missing",
			);
		});
	});

	describe("isRegistered", () => {
		it("should return true for a registered token", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "hello");
			expect(container.isRegistered(token)).toBe(true);
		});

		it("should return false for an unregistered token", () => {
			const container = createContainer();
			const token = createToken<string>("missing");
			expect(container.isRegistered(token)).toBe(false);
		});
	});

	describe("fork", () => {
		it("should create an independent copy of the registry", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "original");

			const forked = container.fork();
			expect(forked.resolve(token)).toBe("original");
		});

		it("should not affect the parent when modifying the fork", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "original");

			const forked = container.fork();
			forked.register(token, "modified");

			expect(container.resolve(token)).toBe("original");
			expect(forked.resolve(token)).toBe("modified");
		});

		it("should not affect the fork when modifying the parent", () => {
			const container = createContainer();
			const tokenA = createToken<string>("a");
			container.register(tokenA, "original");

			const forked = container.fork();

			const tokenB = createToken<string>("b");
			container.register(tokenB, "new");

			expect(forked.isRegistered(tokenB)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create an independent copy of the registry", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "original");

			const cloned = container.clone();
			expect(cloned.resolve(token)).toBe("original");
		});

		it("should not affect the parent when modifying the clone", () => {
			const container = createContainer();
			const token = createToken<string>("test");
			container.register(token, "original");

			const cloned = container.clone();
			cloned.register(token, "modified");

			expect(container.resolve(token)).toBe("original");
			expect(cloned.resolve(token)).toBe("modified");
		});
	});
});
