/**
 * LibraryQueryBusBuilder: 型安全な QueryBus ビルダー。
 *
 * CommandBusBuilder と同じパターンだが、DomainEventStore 関連がない。
 *
 * - register() を呼ぶたびに Registered 型パラメータにキーを積み上げる
 * - build() の this 制約で全クエリが登録済みであることを型レベルで保証する
 * - resolveDeps パターンで依存を遅延解決する
 * - ミドルウェアチェーンを外側から順に適用する
 */

import type {
	LibraryQueries,
	LibraryQueryType,
} from "@contracts/library-public";
import type {
	LibraryQueryBus,
	LibraryQueryHandler,
	LibraryQueryHandlerFactory,
	LibraryQueryHandlerSettings,
} from "@contracts/library-server";
import type { AppError } from "@shared-kernel/public";
import { KernelErrors } from "@shared-kernel/public";
import type {
	Container,
	ExecutionContext,
	Message,
	Middleware,
} from "@shared-kernel/server";
import type { ResultAsync } from "neverthrow";
import { errAsync } from "neverthrow";

/** ハンドラー登録情報 */
type HandlerRegistration<Deps> = {
	handlerFactory: (deps: Deps) => LibraryQueryHandler<LibraryQueryType>;
	settings: LibraryQueryHandlerSettings<LibraryQueryType>;
};

/** ビルドオプション */
type BuildOptions<Deps> = {
	resolveDeps: (container: Container) => Deps;
};

/** 未登録クエリを検出する型 */
type MissingKeys<Registered> = Exclude<LibraryQueryType, keyof Registered>;

export class LibraryQueryBusBuilder<
	Deps,
	Registered extends Partial<Record<LibraryQueryType, unknown>> = {},
> {
	private readonly handlers: Partial<
		Record<LibraryQueryType, HandlerRegistration<Deps>>
	> = {};
	private readonly middlewares: Middleware[] = [];

	use(middleware: Middleware): this {
		this.middlewares.push(middleware);
		return this;
	}

	register<K extends LibraryQueryType>(
		queryType: K,
		registration: {
			handlerFactory: LibraryQueryHandlerFactory<Deps, K>;
			settings: LibraryQueryHandlerSettings<K>;
		},
	): LibraryQueryBusBuilder<
		Deps,
		Registered & Record<K, LibraryQueryHandler<K>>
	> {
		this.handlers[queryType] =
			registration as unknown as HandlerRegistration<Deps>;
		return this as unknown as LibraryQueryBusBuilder<
			Deps,
			Registered & Record<K, LibraryQueryHandler<K>>
		>;
	}

	build(
		this: MissingKeys<Registered> extends never
			? LibraryQueryBusBuilder<Deps, Registered>
			: never,
		options: BuildOptions<Deps>,
	): LibraryQueryBus {
		const { resolveDeps } = options;
		const handlers = this.handlers;
		const middlewares = this.middlewares;

		return {
			execute: (query, context) => {
				const registration = handlers[query.type as LibraryQueryType] as
					| HandlerRegistration<Deps>
					| undefined;

				if (!registration) {
					return errAsync(
						KernelErrors.BUG.create(
							{},
							{
								cause: new Error(
									`No handler registered for query type: ${query.type}`,
								),
							},
						),
					);
				}

				const { handlerFactory } = registration;

				/** 最内層: resolveDeps で依存を解決し、ハンドラーを実行 */
				type NextFn = (
					msg: Message,
					ctx: ExecutionContext,
				) => ResultAsync<unknown, AppError>;

				const innermost: NextFn = (msg, ctx) => {
					const deps = resolveDeps(ctx.container);
					const handler = handlerFactory(deps);
					return handler(
						msg as Extract<LibraryQueries, { type: typeof query.type }>,
						ctx,
					);
				};

				/** ミドルウェアチェーンを構築（外側から順に実行） */
				const chain = middlewares.reduceRight<NextFn>(
					(next, mw) => (msg, ctx) => mw(msg, ctx, next),
					innermost,
				);

				return chain(query, context) as ReturnType<LibraryQueryBus["execute"]>;
			},
		} as LibraryQueryBus;
	}
}
