/**
 * library コンテキストのコマンド側サーバー型定義。
 *
 * CommandBus / CommandHandler / HandlerDefinition の
 * library 専用型エイリアスを提供する。
 */
import type {
	LibraryCommandResultMap,
	LibraryCommands,
	LibraryCommandType,
} from "@contracts/library-public";
import type {
	CommandBus,
	CommandHandlerFactory,
	ExecutionContext,
} from "@shared-kernel/server";
import type { ResultAsync } from "neverthrow";

// Helper types
export type LibraryCommandOf<K extends LibraryCommandType> = Extract<
	LibraryCommands,
	{ type: K }
>;

type ResultOf<K extends LibraryCommandType> =
	LibraryCommandResultMap[K] extends [infer R, unknown] ? R : never;

type ErrorOf<K extends LibraryCommandType> =
	LibraryCommandResultMap[K] extends [unknown, infer E] ? E : never;

/** library コマンドバス型 */
export type LibraryCommandBus = CommandBus<
	LibraryCommands,
	LibraryCommandType,
	LibraryCommandResultMap
>;

/** library コマンドハンドラーファクトリー型 */
export type LibraryCommandHandlerFactory<
	Deps,
	Key extends keyof LibraryCommandResultMap,
> = CommandHandlerFactory<
	Deps,
	LibraryCommands,
	LibraryCommandResultMap,
	Key & string
>;

/** library コマンドハンドラー関数型 */
export type LibraryCommandHandler<K extends LibraryCommandType> = (
	command: LibraryCommandOf<K>,
	context: ExecutionContext,
) => ResultAsync<ResultOf<K>, ErrorOf<K>>;

/** 全コマンドハンドラーのマップ型 */
export type LibraryCommandHandlers = {
	[K in LibraryCommandType]: LibraryCommandHandler<K>;
};

/**
 * コマンドハンドラー設定　retry設定がある場合、errorMapperを必須にする設定型
 * */
export type LibraryCommandHandlerSettings<K extends LibraryCommandType> =
	| {
			transactional?: boolean;
			retry: {
				maxAttempts: number;
				backoffMs?: number;
				shouldRetry?: (error: ErrorOf<K>) => boolean;
				errorMapper: (error: ErrorOf<K>) => ErrorOf<K>;
			};
	  }
	| { transactional?: boolean; retry?: never };

/** コマンドハンドラー定義（ファクトリー + 設定） */
export type LibraryCommandHandlerDefinition<
	Deps,
	K extends LibraryCommandType,
> = {
	factory: LibraryCommandHandlerFactory<Deps, K>;
	settings: LibraryCommandHandlerSettings<K>;
};
