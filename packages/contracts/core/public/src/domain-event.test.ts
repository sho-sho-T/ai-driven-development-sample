import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	ActorSchema,
	type DomainEvent,
	DomainEventBaseSchema,
	type DomainEventId,
	DomainEventIdSchema,
	PurposeSchema,
	createDomainEventSchema,
} from "./domain-event.ts";

describe("DomainEventIdSchema", () => {
	it("should accept a valid UUID", () => {
		const id = crypto.randomUUID();
		const result = DomainEventIdSchema.safeParse(id);
		expect(result.success).toBe(true);
	});

	it("should reject an invalid UUID", () => {
		const result = DomainEventIdSchema.safeParse("not-a-uuid");
		expect(result.success).toBe(false);
	});
});

describe("ActorSchema", () => {
	it("should accept a user actor", () => {
		const result = ActorSchema.safeParse({ type: "user", id: "user-123" });
		expect(result.success).toBe(true);
	});

	it("should accept a system actor", () => {
		const result = ActorSchema.safeParse({ type: "system" });
		expect(result.success).toBe(true);
	});

	it("should reject an invalid actor type", () => {
		const result = ActorSchema.safeParse({ type: "unknown" });
		expect(result.success).toBe(false);
	});
});

describe("PurposeSchema", () => {
	it("should accept event_sourcing", () => {
		const result = PurposeSchema.safeParse("event_sourcing");
		expect(result.success).toBe(true);
	});

	it("should accept audit_only", () => {
		const result = PurposeSchema.safeParse("audit_only");
		expect(result.success).toBe(true);
	});

	it("should reject unknown purpose", () => {
		const result = PurposeSchema.safeParse("other");
		expect(result.success).toBe(false);
	});
});

describe("DomainEventBaseSchema", () => {
	const validBase = {
		id: crypto.randomUUID(),
		type: "TEST_EVENT",
		occurredAt: new Date().toISOString(),
		aggregateType: "TestAggregate",
		aggregateId: "agg-1",
		aggregateVersion: 1,
		schemaVersion: 1,
		correlationId: crypto.randomUUID(),
		actor: { type: "system" as const },
		purpose: "audit_only" as const,
	};

	it("should accept a valid base event", () => {
		const result = DomainEventBaseSchema.safeParse(validBase);
		expect(result.success).toBe(true);
	});

	it("should accept base event with causationId", () => {
		const result = DomainEventBaseSchema.safeParse({
			...validBase,
			causationId: crypto.randomUUID(),
		});
		expect(result.success).toBe(true);
	});

	it("should reject missing required fields", () => {
		const { type: _, ...withoutType } = validBase;
		const result = DomainEventBaseSchema.safeParse(withoutType);
		expect(result.success).toBe(false);
	});
});

describe("createDomainEventSchema", () => {
	const PayloadSchema = z.object({
		bookId: z.string(),
		title: z.string(),
	});

	it("should validate a full domain event with payload", () => {
		const schema = createDomainEventSchema(PayloadSchema);
		const event = {
			id: crypto.randomUUID(),
			type: "BOOK_REGISTERED",
			occurredAt: new Date().toISOString(),
			aggregateType: "Book",
			aggregateId: "book-1",
			aggregateVersion: 1,
			schemaVersion: 1,
			correlationId: crypto.randomUUID(),
			actor: { type: "user" as const, id: "user-1" },
			purpose: "event_sourcing" as const,
			payload: {
				bookId: "book-1",
				title: "Test Book",
			},
		};

		const result = schema.safeParse(event);
		expect(result.success).toBe(true);
	});

	it("should reject invalid payload", () => {
		const schema = createDomainEventSchema(PayloadSchema);
		const event = {
			id: crypto.randomUUID(),
			type: "BOOK_REGISTERED",
			occurredAt: new Date().toISOString(),
			aggregateType: "Book",
			aggregateId: "book-1",
			aggregateVersion: 1,
			schemaVersion: 1,
			correlationId: crypto.randomUUID(),
			actor: { type: "system" as const },
			purpose: "audit_only" as const,
			payload: {
				bookId: "book-1",
				// missing title
			},
		};

		const result = schema.safeParse(event);
		expect(result.success).toBe(false);
	});
});
