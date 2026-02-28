import type {
	LogContext,
	LogEntry,
	Logger,
	LoggerConfig,
	LogLevel,
	LogTransport,
} from "./types";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
};

/**
 * 環境変数 LOG_LEVEL からログレベルを取得する。
 *
 * - Node.js / Cloudflare Workers（nodejs_compat_v2）: process.env.LOG_LEVEL
 *
 * 未設定の場合は "info" をデフォルトとする。
 */
function getLogLevelFromEnv(): LogLevel {
	const env = (
		globalThis as { process?: { env?: Record<string, string | undefined> } }
	).process?.env;
	const value = env?.LOG_LEVEL;
	if (value && isValidLogLevel(value)) return value;
	return "info";
}

function isValidLogLevel(value: string): value is LogLevel {
	return ["debug", "info", "warn", "error"].includes(value);
}

/**
 * Error オブジェクトをシリアライズ可能な形式に変換する。
 */
function serializeError(error: Error): Record<string, unknown> {
	const serialized: Record<string, unknown> = {
		name: error.name,
		message: error.message,
	};

	if (error.stack) {
		serialized.stack = error.stack;
	}

	if (error.cause !== undefined) {
		serialized.cause =
			error.cause instanceof Error ? serializeError(error.cause) : error.cause;
	}

	for (const key of Object.keys(error)) {
		if (!(key in serialized)) {
			serialized[key] = (error as unknown as Record<string, unknown>)[key];
		}
	}

	return serialized;
}

/**
 * context の値を再帰的に処理し、Error オブジェクトをシリアライズ可能な形式に変換する。
 */
function serializeContext(value: unknown): unknown {
	if (value instanceof Error) {
		return serializeError(value);
	}

	if (Array.isArray(value)) {
		return value.map(serializeContext);
	}

	if (value !== null && typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			result[k] = serializeContext(v);
		}
		return result;
	}

	return value;
}

/**
 * デフォルトの Transport。JSON 形式で console に出力する。
 */
function createConsoleTransport(): LogTransport {
	return (entry: LogEntry) => {
		const output: Record<string, unknown> = {
			level: entry.level,
			message: entry.message,
		};

		if (entry.prefix) {
			output.prefix = entry.prefix;
		}

		if (entry.context && Object.keys(entry.context).length > 0) {
			output.context = serializeContext(entry.context);
		}

		output.timestamp = entry.timestamp.toISOString();

		const json = JSON.stringify(output);

		switch (entry.level) {
			case "debug":
				console.debug(json);
				break;
			case "info":
				console.info(json);
				break;
			case "warn":
				console.warn(json);
				break;
			case "error":
				console.error(json);
				break;
		}
	};
}

class LoggerImpl implements Logger {
	private readonly config: Required<LoggerConfig>;

	constructor(config: LoggerConfig) {
		this.config = {
			level: config.level,
			prefix: config.prefix ?? "",
			transport: config.transport ?? createConsoleTransport(),
		};
	}

	debug(message: string, context?: LogContext): void {
		this.log("debug", message, context);
	}

	info(message: string, context?: LogContext): void {
		this.log("info", message, context);
	}

	warn(message: string, context?: LogContext): void {
		this.log("warn", message, context);
	}

	error(message: string, context?: LogContext): void {
		this.log("error", message, context);
	}

	child(prefix: string): Logger {
		const newPrefix = this.config.prefix
			? `${this.config.prefix}:${prefix}`
			: prefix;
		return new LoggerImpl({
			level: this.config.level,
			prefix: newPrefix,
			transport: this.config.transport,
		});
	}

	isLevelEnabled(level: LogLevel): boolean {
		return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.level];
	}

	private log(level: LogLevel, message: string, context?: LogContext): void {
		if (!this.isLevelEnabled(level)) {
			return;
		}

		const entry: LogEntry = {
			level,
			message,
			timestamp: new Date(),
		};

		if (this.config.prefix) {
			entry.prefix = this.config.prefix;
		}

		if (context) {
			entry.context = context;
		}

		this.config.transport(entry);
	}
}

/**
 * 新しい Logger インスタンスを作成する。
 *
 * @example
 * ```typescript
 * const logger = createLogger({ prefix: "catalog" });
 * logger.info("Book registered", { bookId: "..." });
 * ```
 */
export function createLogger(config?: Partial<LoggerConfig>): Logger {
	return new LoggerImpl({
		level: config?.level ?? getLogLevelFromEnv(),
		prefix: config?.prefix,
		transport: config?.transport,
	});
}

/**
 * デフォルトの Logger インスタンス。
 *
 * ログレベルは環境変数 LOG_LEVEL で制御できる。
 *
 * @example
 * ```typescript
 * import { logger } from "@shared-kernel/public";
 *
 * logger.info("Application started");
 *
 * const catalogLogger = logger.child("catalog");
 * catalogLogger.error("Unexpected error", { error });
 * ```
 */
export const logger: Logger = createLogger();
