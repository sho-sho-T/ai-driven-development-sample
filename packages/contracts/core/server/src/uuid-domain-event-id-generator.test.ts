import { describe, expect, it } from "vitest";
import { createUuidDomainEventIdGenerator } from "./uuid-domain-event-id-generator.ts";

describe("createUuidDomainEventIdGenerator", () => {
	it("should return a valid UUID", () => {
		const generator = createUuidDomainEventIdGenerator();
		const id = generator.generate();
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
		expect(id).toMatch(uuidRegex);
	});

	it("should return unique IDs on each call", () => {
		const generator = createUuidDomainEventIdGenerator();
		const id1 = generator.generate();
		const id2 = generator.generate();
		expect(id1).not.toBe(id2);
	});
});
