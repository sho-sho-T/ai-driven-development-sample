/**
 * 型安全な CommandBus インターフェース。
 * execute<K> でコマンドタイプに応じた Result/Error 型が推論される。
 */
import type { ResultAsync } from "neverthrow";
import type { ExecutionContext, Message } from "./types.ts";

export interface CommandBus<
	Commands extends Message,
	CommandType extends Commands["type"],
	ResultMap extends Record<CommandType, [unknown, unknown]>,
> {
	execute<K extends CommandType>(
		command: Extract<Commands, { type: K }>,
		context: ExecutionContext,
	): ResultAsync<
		ResultMap[K & keyof ResultMap] extends [infer R, unknown] ? R : never,
		ResultMap[K & keyof ResultMap] extends [unknown, infer E] ? E : never
	>;
}
