/**
 * crypto.randomUUID() ベースのドメインイベント ID 生成器。
 */
import type { DomainEventId } from "@contracts/core-public";
import type { DomainEventIdGenerator } from "./domain-event-id-generator.ts";

export function createUuidDomainEventIdGenerator(): DomainEventIdGenerator {
	return {
		generate(): DomainEventId {
			return crypto.randomUUID() as DomainEventId;
		},
	};
}
