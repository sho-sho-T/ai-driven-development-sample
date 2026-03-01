/**
 * コマンドハンドラーファクトリー汎用型。
 *
 * - Deps: ハンドラーが必要とする依存の型
 * - Commands: コマンドの discriminated union
 * - ResultMap: コマンドタイプ → [Result, Error] のマッピング
 * - Key: 処理対象のコマンドタイプ
 */
import type { ResultAsync } from "neverthrow";
import type { ExecutionContext, Message } from "./types.ts";

export type CommandHandlerFactory<
	Deps,
	Commands extends Message,
	ResultMap extends Record<string, [unknown, unknown]>,
	Key extends keyof ResultMap & string,
> = (
	deps: Deps,
) => (
	command: Extract<Commands, { type: Key }>,
	context: ExecutionContext,
) => ResultAsync<
	ResultMap[Key] extends [infer R, unknown] ? R : never,
	ResultMap[Key] extends [unknown, infer E] ? E : never
>;
