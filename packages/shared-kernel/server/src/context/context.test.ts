import { describe, expect, it } from "vitest";
import { createContainer, createToken } from "../container/container.ts";
import { createNewContext, forkContext, updateContainer } from "./context.ts";

describe("createNewContext", () => {
	it("should create a context with correlationId equal to id", () => {
		const container = createContainer();
		const ctx = createNewContext(container);

		expect(ctx.id).toBeDefined();
		expect(ctx.correlationId).toBe(ctx.id);
	});

	it("should set causationId to undefined", () => {
		const container = createContainer();
		const ctx = createNewContext(container);

		expect(ctx.causationId).toBeUndefined();
	});

	it("should hold the provided container", () => {
		const container = createContainer();
		const token = createToken<string>("test");
		container.register(token, "value");

		const ctx = createNewContext(container);

		expect(ctx.container.resolve(token)).toBe("value");
	});
});

describe("forkContext", () => {
	it("should inherit correlationId from parent", () => {
		const container = createContainer();
		const parent = createNewContext(container);
		const child = forkContext(parent);

		expect(child.correlationId).toBe(parent.correlationId);
	});

	it("should set causationId to parent id", () => {
		const container = createContainer();
		const parent = createNewContext(container);
		const child = forkContext(parent);

		expect(child.causationId).toBe(parent.id);
	});

	it("should generate a new id different from parent", () => {
		const container = createContainer();
		const parent = createNewContext(container);
		const child = forkContext(parent);

		expect(child.id).not.toBe(parent.id);
	});

	it("should fork the container so parent and child are independent", () => {
		const container = createContainer();
		const token = createToken<string>("test");
		container.register(token, "original");

		const parent = createNewContext(container);
		const child = forkContext(parent);

		child.container.register(token, "modified");

		expect(parent.container.resolve(token)).toBe("original");
		expect(child.container.resolve(token)).toBe("modified");
	});
});

describe("updateContainer", () => {
	it("should return a new context with the replaced container", () => {
		const container1 = createContainer();
		const container2 = createContainer();
		const token = createToken<string>("test");
		container2.register(token, "new-value");

		const ctx = createNewContext(container1);
		const updated = updateContainer(ctx, container2);

		expect(updated.id).toBe(ctx.id);
		expect(updated.correlationId).toBe(ctx.correlationId);
		expect(updated.causationId).toBe(ctx.causationId);
		expect(updated.container.resolve(token)).toBe("new-value");
	});
});
