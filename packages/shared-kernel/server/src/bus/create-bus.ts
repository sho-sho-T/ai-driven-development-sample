/**
 * createBus: Bus ファクトリ関数。
 *
 * HandlerDefinition の配列とミドルウェアを受け取り、Bus を生成する。
 * - ハンドラー登録: type → handler のマッピング
 * - ミドルウェア: execute 実行時にチェーン適用（外側から順に実行）
 *
 * 使用例:
 * ```ts
 * const bus = createBus({
 *   handlers: [registerBookHandler],
 *   middlewares: [loggingMiddleware],
 *   container,
 * });
 * const result = await bus.execute(command, context);
 * ```
 */
import { errAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import { KernelErrors } from "@shared-kernel/public";
import type {
	Bus,
	ExecutionContext,
	Handler,
	HandlerDefinition,
	Message,
	Middleware,
} from "./types.ts";
import type { Container } from "../container/container.ts";
import type { ResultAsync } from "neverthrow";

interface CreateBusOptions {
	readonly handlers: ReadonlyArray<HandlerDefinition<Message, unknown>>;
	readonly middlewares?: ReadonlyArray<Middleware>;
	readonly container: Container;
}

export function createBus(options: CreateBusOptions): Bus {
	const { handlers, middlewares = [], container } = options;

	/** type → handler のマッピングを構築 */
	const handlerMap = new Map<string, Handler<Message, unknown>>();
	for (const def of handlers) {
		if (handlerMap.has(def.type)) {
			throw new Error(`Handler already registered for type: ${def.type}`);
		}
		handlerMap.set(def.type, def.factory(container));
	}

	return {
		execute<TResult>(
			message: Message,
			context: ExecutionContext,
		): ResultAsync<TResult, AppError> {
			const handler = handlerMap.get(message.type);
			if (!handler) {
				return errAsync(
					KernelErrors.BUG.create(
						{},
						{
							cause: new Error(
								`No handler registered for message type: ${message.type}`,
							),
						},
					),
				);
			}

			/** ミドルウェアチェーンを構築し、最内層でハンドラーを実行する */
			type NextFn = (
				msg: Message,
				ctx: ExecutionContext,
			) => ResultAsync<TResult, AppError>;

			const innermost: NextFn = (msg, ctx) =>
				handler(msg, ctx) as ResultAsync<TResult, AppError>;

			const chain = middlewares.reduceRight<NextFn>(
				(next, mw) => (msg, ctx) => mw<TResult>(msg, ctx, next),
				innermost,
			);

			return chain(message, context);
		},
	};
}
