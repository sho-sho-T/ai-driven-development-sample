/**
 * KernelErrors: shared-kernel レベルで定義する汎用エラー。
 *
 * アプリケーション全体で発生しうる基盤エラーを定義する。
 * コンテキスト固有のエラーは contracts/ に定義する。
 */
import { type AppError, defineError, type ErrorType } from "./core.ts";

export const KernelErrors = {
	/** コードのバグに起因する想定外エラー */
	BUG: defineError({
		code: "BUG",
		name: "BugError",
		description: "想定外のエラーが発生しました。",
		meta: { exposure: "UNEXPECTED", fault: "BUG" },
	}),
	/** 設定値の不備に起因する想定外エラー */
	CONFIG_ERROR: defineError({
		code: "CONFIG_ERROR",
		name: "ConfigError",
		description: "設定エラーが発生しました。設定値を確認してください。",
		meta: { exposure: "UNEXPECTED", fault: "CONFIG" },
	}),
	/** リソース不足（CPU・メモリ・ディスク等）に起因する想定外エラー */
	RESOURCE_ERROR: defineError({
		code: "RESOURCE_ERROR",
		name: "ResourceError",
		description:
			"リソースに関するエラーが発生しました。CPU、メモリ、ディスクなど。",
		meta: { exposure: "UNEXPECTED", fault: "RESOURCE" },
	}),
	/** 外部依存（DB・API）の障害に起因する想定外エラー */
	DEPENDENCY_ERROR: defineError({
		code: "DEPENDENCY_ERROR",
		name: "DependencyError",
		description: "依存する外部サービスに関するエラーが発生しました。",
		meta: { exposure: "UNEXPECTED", fault: "DEPENDENCY" },
	}),
	/** 排他制御エラー（リソースが他の処理で更新済み） */
	CONCURRENCY_ERROR: defineError({
		code: "CONCURRENCY_ERROR",
		name: "ConcurrencyError",
		description:
			"排他制御エラーが発生しました。リソースが他の処理によって更新されています。",
		meta: { exposure: "EXPECTED" },
	}),
} as const;

export type BugError = ErrorType<typeof KernelErrors.BUG>;
export type ConfigError = ErrorType<typeof KernelErrors.CONFIG_ERROR>;
export type ResourceError = ErrorType<typeof KernelErrors.RESOURCE_ERROR>;
export type DependencyError = ErrorType<typeof KernelErrors.DEPENDENCY_ERROR>;
export type ConcurrencyError = ErrorType<typeof KernelErrors.CONCURRENCY_ERROR>;

/**
 * dependencyError: 外部依存（DB・API）で発生した想定外エラーをラップする便利関数。
 *
 * @example
 * ```typescript
 * ResultAsync.fromPromise(db.query(), (err) =>
 *   dependencyError(err instanceof Error ? err : new Error(String(err)))
 * )
 * ```
 */
export function dependencyError(cause: Error): AppError {
	return KernelErrors.DEPENDENCY_ERROR.create({}, { cause });
}
