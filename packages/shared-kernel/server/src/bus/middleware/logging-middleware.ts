/**
 * ロギングミドルウェア。
 *
 * Bus の execute 実行前後でメッセージ型と結果をログ出力する。
 * 開発時のデバッグに役立つサンプル実装。
 */
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { ExecutionContext, Message, Middleware } from "../types.ts";

export const loggingMiddleware: Middleware = <TResult>(
	message: Message,
	context: ExecutionContext,
	next: (
		message: Message,
		context: ExecutionContext,
	) => ResultAsync<TResult, AppError>,
): ResultAsync<TResult, AppError> => {
	const start = performance.now();
	return next(message, context).map((result) => {
		const duration = (performance.now() - start).toFixed(2);
		console.info(`[Bus] ${message.type} completed in ${duration}ms`);
		return result;
	});
};
