/**
 * 型安全な QueryBus インターフェース。
 * execute<K> でクエリタイプに応じた Result/Error 型が推論される。
 */
import type { ResultAsync } from "neverthrow";
import type { ExecutionContext, Message } from "./types.ts";

export interface QueryBus<
	Queries extends Message,
	ResultMap extends Record<Queries["type"], [unknown, unknown]>,
> {
	execute<K extends Queries["type"]>(
		query: Extract<Queries, { type: K }>,
		context: ExecutionContext,
	): ResultAsync<
		ResultMap[K & keyof ResultMap] extends [infer R, unknown] ? R : never,
		ResultMap[K & keyof ResultMap] extends [unknown, infer E] ? E : never
	>;
}
