/**
 * AppError: アプリケーション全体で使用するエラー型。
 *
 * - `type`: エラーを一意に識別するリテラル文字列（例: "BOOK_NOT_FOUND"）
 * - `message`: 人間向けのエラーメッセージ
 * - `exposure`: "EXPECTED"（ユーザーに表示可能）/ "UNEXPECTED"（内部エラー）
 * - `fault`: 想定外エラー時の原因（Error オブジェクト）
 */

/** エラーのメタ情報 */
interface ErrorMeta {
	readonly exposure: "EXPECTED" | "UNEXPECTED";
}

/** アプリケーション共通のエラー型 */
export interface AppError {
	readonly type: string;
	readonly message: string;
	readonly meta: ErrorMeta;
	readonly fault?: Error;
}

/**
 * defineError: 特定のエラー種別を生成するファクトリを定義する。
 *
 * 使用例:
 * ```ts
 * const bookNotFound = defineError("BOOK_NOT_FOUND", "EXPECTED");
 * const error = bookNotFound("Book with id 123 not found");
 * ```
 */
export function defineError(
	type: string,
	exposure: "EXPECTED" | "UNEXPECTED",
): (message: string) => AppError {
	return (message: string): AppError => ({
		type,
		message,
		meta: { exposure },
	});
}

/**
 * dependencyError: 外部依存（DB・API）で発生した想定外エラーをラップする。
 */
export function dependencyError(fault: Error): AppError {
	return {
		type: "DEPENDENCY_ERROR",
		message: fault.message,
		meta: { exposure: "UNEXPECTED" },
		fault,
	};
}
