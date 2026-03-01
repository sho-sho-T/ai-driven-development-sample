/**
 * ドメインイベント型定義。
 *
 * 全コンテキスト共通のイベント基底型・スキーマ・ファクトリを提供する。
 */
import { z } from "zod";

/** ドメインイベント ID（Branded UUID） */
export const DomainEventIdSchema = z.uuid().brand("DomainEventId");
export type DomainEventId = z.infer<typeof DomainEventIdSchema>;

/** イベント実行者 */
export const UserActorSchema = z.object({
	type: z.literal("user"),
	id: z.string(),
});

export const SystemActorSchema = z.object({
	type: z.literal("system"),
});

export const ActorSchema = z.discriminatedUnion("type", [
	UserActorSchema,
	SystemActorSchema,
]);
export type Actor = z.infer<typeof ActorSchema>;

/** イベントの目的 */
export const PurposeSchema = z.enum(["event_sourcing", "audit_only"]);
export type Purpose = z.infer<typeof PurposeSchema>;

/** ドメインイベント基底スキーマ */
export const DomainEventBaseSchema = z.object({
	id: DomainEventIdSchema,
	type: z.string(),
	occurredAt: z.string(),
	aggregateType: z.string(),
	aggregateId: z.string(),
	aggregateVersion: z.number().int().nonnegative(),
	schemaVersion: z.number().int().positive(),
	correlationId: z.string(),
	causationId: z.string().optional(),
	actor: ActorSchema,
	purpose: PurposeSchema,
});
export type DomainEventBase = z.infer<typeof DomainEventBaseSchema>;

/** ペイロード付きドメインイベント型 */
export type DomainEvent<P> = DomainEventBase & { readonly payload: P };

/** ペイロードスキーマからドメインイベントスキーマを生成するファクトリ */
export function createDomainEventSchema<T extends z.ZodTypeAny>(
	payloadSchema: T,
) {
	return DomainEventBaseSchema.extend({
		payload: payloadSchema,
	});
}
