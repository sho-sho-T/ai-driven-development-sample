/**
 * library コンテキストのクエリ側サーバー型定義。
 *
 * QueryBus / QueryHandler / HandlerDefinition の
 * library 専用型エイリアスを提供する。
 */
import type { LibraryQueryResultMap } from "@contracts/library-public";
import type {
	ExecutionContext,
	QueryBus,
	QueryHandlerFactory,
} from "@shared-kernel/server";
import type { ResultAsync } from "neverthrow";
import {
	LibraryQueries,
	LibraryQueryType,
} from "../../public/src/library-queries";

// Helper types
export type LibraryQueryOf<K extends LibraryQueryType> = Extract<
	LibraryQueries,
	{ type: K }
>;

type ResultOf<K extends LibraryQueryType> = LibraryQueryResultMap[K] extends [
	infer R,
	unknown,
]
	? R
	: never;

type ErrorOf<K extends LibraryQueryType> = LibraryQueryResultMap[K] extends [
	unknown,
	infer E,
]
	? E
	: never;

/** library クエリバス型 */
export type LibraryQueryBus = QueryBus<LibraryQueries, LibraryQueryResultMap>;

/** library クエリハンドラーファクトリー型 */
export type LibraryQueryHandlerFactory<
	Deps,
	Key extends keyof LibraryQueryResultMap,
> = QueryHandlerFactory<
	Deps,
	LibraryQueries,
	LibraryQueryResultMap,
	Key & string
>;

/** library クエリハンドラー関数型 */
export type LibraryQueryHandler<K extends LibraryQueryType> = (
	query: LibraryQueryOf<K>,
	context: ExecutionContext,
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;

/** 全クエリハンドラーのマップ型 */
export type LibraryQueryHandlers = {
	[K in LibraryQueryType]: LibraryQueryHandler<K>;
};

/**
 * クエリハンドラー設定 retry設定がある場合、errorMapperを必須にする設定型
 * */
export type LibraryQueryHandlerSettings<K extends LibraryQueryType> =
	| {
			retry: {
				maxAttempts: number;
				backoffMs?: number;
				shouldRetry?: (error: ErrorOf<K>) => boolean;
				errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;
			};
	  }
	| { retry?: never };

/** クエリハンドラー定義（ファクトリー + 設定） */
export type LibraryQueryHandlerDefinition<Deps, K extends LibraryQueryType> = {
	factory: LibraryQueryHandlerFactory<Deps, K>;
	settings: LibraryQueryHandlerSettings<K>;
};
