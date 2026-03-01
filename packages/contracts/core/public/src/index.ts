/**
 * @contracts/core-public
 *
 * ドメインイベントの型定義・スキーマを提供する。
 */
export {
	type Actor,
	ActorSchema,
	createDomainEventSchema,
	type DomainEvent,
	type DomainEventBase,
	DomainEventBaseSchema,
	type DomainEventId,
	DomainEventIdSchema,
	type Purpose,
	PurposeSchema,
	SystemActorSchema,
	UserActorSchema,
} from "./domain-event.ts";
