/**
 * LibraryCommandBusBuilder: 型安全な CommandBus ビルダー。
 *
 * - register() を呼ぶたびに Registered 型パラメータにキーを積み上げる
 * - build() の this 制約で全コマンドが登録済みであることを型レベルで保証する
 * - resolveDeps パターンで依存を遅延解決する（TX middleware の container.fork() に対応）
 * - ミドルウェアチェーンを外側から順に適用する
 */

import type {
	LibraryCommands,
	LibraryCommandType,
} from "@contracts/library-public";
import type {
	LibraryCommandBus,
	LibraryCommandHandler,
	LibraryCommandHandlerFactory,
	LibraryCommandHandlerSettings,
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
	handlerFactory: (deps: Deps) => LibraryCommandHandler<LibraryCommandType>;
	settings: LibraryCommandHandlerSettings<LibraryCommandType>;
};

/** ビルドオプション */
type BuildOptions<Deps> = {
	resolveDeps: (container: Container) => Deps;
};

/** 未登録コマンドを検出する型 */
type MissingKeys<Registered> = Exclude<LibraryCommandType, keyof Registered>;

export class LibraryCommandBusBuilder<
	Deps,
	Registered extends Partial<Record<LibraryCommandType, unknown>> = {},
> {
	private readonly handlers: Partial<
		Record<LibraryCommandType, HandlerRegistration<Deps>>
	> = {};
	private readonly middlewares: Middleware[] = [];

	use(middleware: Middleware): this {
		this.middlewares.push(middleware);
		return this;
	}

	register<K extends LibraryCommandType>(
		commandType: K,
		registration: {
			handlerFactory: LibraryCommandHandlerFactory<Deps, K>;
			settings: LibraryCommandHandlerSettings<K>;
		},
	): LibraryCommandBusBuilder<
		Deps,
		Registered & Record<K, LibraryCommandHandler<K>>
	> {
		this.handlers[commandType] =
			registration as unknown as HandlerRegistration<Deps>;
		return this as unknown as LibraryCommandBusBuilder<
			Deps,
			Registered & Record<K, LibraryCommandHandler<K>>
		>;
	}

	build(
		this: MissingKeys<Registered> extends never
			? LibraryCommandBusBuilder<Deps, Registered>
			: never,
		options: BuildOptions<Deps>,
	): LibraryCommandBus {
		const { resolveDeps } = options;
		const handlers = this.handlers;
		const middlewares = this.middlewares;

		return {
			execute: (command, context) => {
				const registration = handlers[command.type as LibraryCommandType] as
					| HandlerRegistration<Deps>
					| undefined;

				if (!registration) {
					return errAsync(
						KernelErrors.BUG.create(
							{},
							{
								cause: new Error(
									`No handler registered for command type: ${command.type}`,
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
						msg as Extract<LibraryCommands, { type: typeof command.type }>,
						ctx,
					);
				};

				/** ミドルウェアチェーンを構築（外側から順に実行） */
				const chain = middlewares.reduceRight<NextFn>(
					(next, mw) => (msg, ctx) => mw(msg, ctx, next),
					innermost,
				);

				return chain(command, context) as ReturnType<
					LibraryCommandBus["execute"]
				>;
			},
		} as LibraryCommandBus;
	}
}
