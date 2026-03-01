import type { DomainEvent, DomainEventBase } from "@contracts/core-public";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { createInMemoryDomainEventBus } from "./inmemory-domain-event-bus.ts";

function createTestEvent(
	overrides: Partial<DomainEventBase> & { payload?: unknown } = {},
): DomainEvent<unknown> {
	return {
		id: crypto.randomUUID() as DomainEventBase["id"],
		type: overrides.type ?? "TEST_EVENT",
		occurredAt: new Date().toISOString(),
		aggregateType: "TestAggregate",
		aggregateId: "agg-1",
		aggregateVersion: 1,
		schemaVersion: 1,
		correlationId: crypto.randomUUID(),
		actor: { type: "system" as const },
		purpose: "audit_only" as const,
		payload: overrides.payload ?? { value: "test" },
		...overrides,
	};
}

const TestPayloadSchema = z.object({ value: z.string() });

describe("InMemoryDomainEventBus", () => {
	describe("publish + subscribe", () => {
		it("should call handler when event type matches", async () => {
			const bus = createInMemoryDomainEventBus();
			const handler = vi.fn();

			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler,
			});

			const event = createTestEvent();
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(handler).toHaveBeenCalledOnce();
		});

		it("should not call handler when event type does not match", async () => {
			const bus = createInMemoryDomainEventBus();
			const handler = vi.fn();

			bus.subscribe({
				eventType: "OTHER_EVENT",
				eventSchema: TestPayloadSchema,
				handler,
			});

			const event = createTestEvent({ type: "TEST_EVENT" });
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(handler).not.toHaveBeenCalled();
		});

		it("should call multiple handlers for the same event type", async () => {
			const bus = createInMemoryDomainEventBus();
			const handler1 = vi.fn();
			const handler2 = vi.fn();

			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler: handler1,
			});
			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler: handler2,
			});

			const event = createTestEvent();
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(handler1).toHaveBeenCalledOnce();
			expect(handler2).toHaveBeenCalledOnce();
		});
	});

	describe("Zod parse failure", () => {
		it("should skip handler when schema parse fails", async () => {
			const bus = createInMemoryDomainEventBus();
			const handler = vi.fn();

			const StrictSchema = z.object({ value: z.number() });
			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: StrictSchema,
				handler,
			});

			const event = createTestEvent({ payload: { value: "not-a-number" } });
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(handler).not.toHaveBeenCalled();
		});
	});

	describe("retry", () => {
		it("should retry up to 3 times on handler failure", async () => {
			const bus = createInMemoryDomainEventBus();
			let callCount = 0;
			const handler = vi.fn(() => {
				callCount++;
				if (callCount < 3) {
					throw new Error("temporary failure");
				}
			});

			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler,
			});

			const event = createTestEvent();
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(handler).toHaveBeenCalledTimes(3);
		});

		it("should continue to next handler after all retries fail", async () => {
			const bus = createInMemoryDomainEventBus();
			const failingHandler = vi.fn(() => {
				throw new Error("permanent failure");
			});
			const succeedingHandler = vi.fn();

			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler: failingHandler,
			});
			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler: succeedingHandler,
			});

			const event = createTestEvent();
			const result = await bus.publish([event]);

			expect(result.isOk()).toBe(true);
			expect(failingHandler).toHaveBeenCalledTimes(3);
			expect(succeedingHandler).toHaveBeenCalledOnce();
		});
	});

	describe("multiple events", () => {
		it("should process all events in order", async () => {
			const bus = createInMemoryDomainEventBus();
			const receivedPayloads: unknown[] = [];
			bus.subscribe({
				eventType: "TEST_EVENT",
				eventSchema: TestPayloadSchema,
				handler: (parsed) => {
					receivedPayloads.push(parsed);
				},
			});

			const events = [
				createTestEvent({ payload: { value: "first" } }),
				createTestEvent({ payload: { value: "second" } }),
			];
			const result = await bus.publish(events);

			expect(result.isOk()).toBe(true);
			expect(receivedPayloads).toHaveLength(2);
			expect(receivedPayloads[0]).toEqual({ value: "first" });
			expect(receivedPayloads[1]).toEqual({ value: "second" });
		});
	});
});
