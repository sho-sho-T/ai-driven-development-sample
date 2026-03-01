/**
 * @shared-kernel/server
 *
 * サーバー実行基盤パッケージ。
 * DI コンテナ、Bus（CQRS ディスパッチ）、ミドルウェア、コンテキストを提供する。
 */

// Typed Bus
export { type CommandBus } from "./bus/command-bus.ts";
export { type CommandHandlerFactory } from "./bus/command-handler.ts";
export { createBus } from "./bus/create-bus.ts";
// Middleware
export { loggingMiddleware } from "./bus/middleware/logging-middleware.ts";
export { type QueryBus } from "./bus/query-bus.ts";
export { type QueryHandlerFactory } from "./bus/query-handler.ts";
// Bus
export {
	type Bus,
	type ExecutionContext,
	type Handler,
	type HandlerDefinition,
	type Message,
	type Middleware,
} from "./bus/types.ts";
// Container
export {
	type Container,
	createContainer,
	createToken,
	type Token,
} from "./container/container.ts";

// Context
export { createExecutionContext } from "./context/context.ts";
