/**
 * @shared-kernel/server
 *
 * サーバー実行基盤パッケージ。
 * DI コンテナ、Bus（CQRS ディスパッチ）、ミドルウェア、コンテキストを提供する。
 */

// Container
export {
	type Token,
	createToken,
	type Container,
	createContainer,
} from "./container/container.ts";

// Bus
export {
	type Message,
	type ExecutionContext,
	type Handler,
	type HandlerDefinition,
	type Middleware,
	type Bus,
} from "./bus/types.ts";
export { createBus } from "./bus/create-bus.ts";

// Middleware
export { loggingMiddleware } from "./bus/middleware/logging-middleware.ts";

// Context
export { createExecutionContext } from "./context/context.ts";
