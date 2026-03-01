/**
 * ドメインイベント ID 生成器インターフェース。
 */
import type { DomainEventId } from "@contracts/core-public";

export interface DomainEventIdGenerator {
	generate(): DomainEventId;
}
