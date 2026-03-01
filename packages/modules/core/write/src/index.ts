/**
 * @modules/core-write
 *
 * ドメインイベントシステムのインターフェース定義。
 * DomainEventStore, DomainEventPublisher, DomainEventSubscriber を提供する。
 */
export type { DomainEventStore } from "./domain-event-store.ts";
export type { DomainEventPublisher } from "./domain-event-publisher.ts";
export type { DomainEventSubscriber } from "./domain-event-subscriber.ts";
