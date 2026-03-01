/**
 * @shared-kernel/public
 *
 * FE/BE 共通の基盤パッケージ。
 * エラー型、ロガー、ID スキーマ、ユーティリティを提供する。
 */

// ID
export {
	type BookId,
	BookIdSchema,
	generateId,
	type LibraryId,
	LibraryIdSchema,
	type LoanId,
	LoanIdSchema,
	type MemberId,
	MemberIdSchema,
} from "./core-types.ts";
// Error
export {
	AppError,
	type BugError,
	type ConcurrencyError,
	type ConfigError,
	type DependencyError,
	defineError,
	dependencyError,
	type ErrorDef,
	type ErrorPayload,
	type ErrorType,
	KernelErrors,
	type ResourceError,
} from "./error/index.ts";
// Logger
export type {
	LogContext,
	LogEntry,
	Logger,
	LoggerConfig,
	LogLevel,
	LogTransport,
} from "./logger/index.ts";
export { createLogger, logger } from "./logger/index.ts";
