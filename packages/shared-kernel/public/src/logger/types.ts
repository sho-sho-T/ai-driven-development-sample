/**
 * Frontend/Backend統一ログインターフェース
 *
 * Browser、 Node.jsで共通して使用できるロガー。
 * JSON形式で構造化されたログを出力する。
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LoggerConfig = {
	level: LogLevel;
	prefix?: string;
	transport?: LogTransport;
};

export type LogEntry = {
	level: LogLevel;
	message: string;
	context?: LogContext;
	timestamp: Date;
	prefix?: string;
};

export type LogTransport = (entry: LogEntry) => void;

export interface Logger {
	debug(message: string, context?: LogContext): void;
	info(message: string, context?: LogContext): void;
	warn(message: string, context?: LogContext): void;
	error(message: string, context?: LogContext): void;
	child(prefix: string): Logger;
	isLevelEnabled(level: LogLevel): boolean;
}
