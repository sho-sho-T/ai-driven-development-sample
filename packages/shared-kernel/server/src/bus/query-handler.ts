/**
 * クエリハンドラーファクトリー汎用型。
 *
 * - Deps: ハンドラーが必要とする依存の型
 * - Queries: クエリの discriminated union
 * - ResultMap: クエリタイプ → [Result, Error] のマッピング
 * - Key: 処理対象のクエリタイプ
 */
import type { ResultAsync } from "neverthrow";
import type { ExecutionContext, Message } from "./types.ts";

export type QueryHandlerFactory<
	Deps,
	Queries extends Message,
	ResultMap extends Record<string, [unknown, unknown]>,
	Key extends keyof ResultMap & string,
> = (
	deps: Deps,
) => (
	query: Extract<Queries, { type: Key }>,
	context: ExecutionContext,
) => ResultAsync<
	ResultMap[Key] extends [infer R, unknown] ? R : never,
	ResultMap[Key] extends [unknown, infer E] ? E : never
>;
