/**
 * Bus 関連の型定義。
 *
 * CQRS パターンの Command / Query を Bus 経由でハンドラーにディスパッチする。
 *
 * - Message: Command / Query の基底型。`type` で識別する。
 * - Handler: Message を処理し ResultAsync を返す関数。
 * - HandlerDefinition: ハンドラーのファクトリ + 設定。DI コンテナから依存を取得して生成する。
 * - Bus: Message をハンドラーにディスパッチする実行エンジン。
 * - Middleware: Bus 実行をラップする関数（ロギング、トランザクション等）。
 * - ExecutionContext: リクエスト単位のコンテキスト情報。
 */
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { Container } from "../container/container.ts";
import type { Context } from "../context/context.ts";

/** Command / Query の基底型。`type` フィールドで識別する */
export interface Message {
	readonly type: string;
}

/** リクエスト単位の実行コンテキスト（Context の型エイリアス） */
export type ExecutionContext = Context;

/** Message を処理するハンドラー関数 */
export type Handler<TMessage extends Message, TResult> = (
	message: TMessage,
	context: ExecutionContext,
) => ResultAsync<TResult, AppError>;

/** ハンドラー定義。DI コンテナからハンドラー関数を生成するファクトリ */
export interface HandlerDefinition<TMessage extends Message, TResult> {
	readonly type: TMessage["type"];
	readonly factory: (container: Container) => Handler<TMessage, TResult>;
}

/** ミドルウェア。Bus の execute を前後でラップする */
export type Middleware = <TResult>(
	message: Message,
	context: ExecutionContext,
	next: (
		message: Message,
		context: ExecutionContext,
	) => ResultAsync<TResult, AppError>,
) => ResultAsync<TResult, AppError>;

/** Bus インターフェース。Message をハンドラーにディスパッチする */
export interface Bus {
	execute<TResult>(
		message: Message,
		context: ExecutionContext,
	): ResultAsync<TResult, AppError>;
}
