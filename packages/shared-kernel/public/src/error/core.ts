/**
 * AppError / defineError: アプリケーション全体で使用するエラー基盤。
 *
 * - AppError<P>: Error を継承したエラークラス。payload でコンテキスト情報を保持する
 * - defineError: エラー種別ごとの定義（ErrorDef）を生成するファクトリ
 * - ErrorType: ErrorDef からエラーインスタンス型を抽出するユーティリティ型
 */

/**
 * 想定外エラーの原因分類。
 *
 * - BUG: コードのバグ
 * - CONFIG: 設定の不備
 * - RESOURCE: リソースの不足
 * - DEPENDENCY: 依存する外部サービスの障害（DB、API 等）
 */
type Fault = "BUG" | "CONFIG" | "RESOURCE" | "DEPENDENCY";

type ErrorMeta =
	| { readonly exposure: "EXPECTED" }
	| { readonly exposure: "UNEXPECTED"; readonly fault: Fault };

export type ErrorPayload = Record<string, unknown>;

/**
 * ErrorDef: defineError が返す型。
 * メソッドシグネチャを使用することで、異なる P を持つ ErrorDef を
 * ErrorDef<ErrorPayload> として扱えるようにする（双変性を活用）。
 */
export type ErrorDef<P extends ErrorPayload> = Readonly<{
	code: string;
	name: string;
	description: string;
	meta: ErrorMeta;
	create(payload: P, opts?: { cause?: Error }): AppError<P>;
	is(e: unknown): e is AppError<P>;
}>;

/**
 * ErrorDef からエラーインスタンス型を抽出するユーティリティ型。
 *
 * @example
 * ```typescript
 * const BookNotFoundError = defineError<{ id: string }>({ ... });
 * export type BookNotFoundError = ErrorType<typeof BookNotFoundError>;
 * ```
 */
export type ErrorType<T extends ErrorDef<ErrorPayload>> = ReturnType<
	T["create"]
>;

export class AppError<P extends ErrorPayload = ErrorPayload> extends Error {
	public readonly code: string;
	public readonly description: string;
	public readonly meta: ErrorMeta;
	public readonly payload: P;

	constructor(args: {
		code: string;
		name: string;
		description: string;
		meta: ErrorMeta;
		payload: P;
		cause?: Error;
	}) {
		super(args.description, { cause: args.cause });
		this.name = args.name;
		this.code = args.code;
		this.description = args.description;
		this.meta = args.meta;
		this.payload = args.payload;
	}
}

/**
 * defineError: 特定のエラー種別の ErrorDef を定義する。
 *
 * @example
 * ```typescript
 * export const BookNotFoundError = defineError<{ id: string }>({
 *   code: "BOOK_NOT_FOUND",
 *   name: "BookNotFoundError",
 *   description: "指定された書籍が見つかりません",
 *   meta: { exposure: "EXPECTED" },
 * });
 *
 * // インスタンス生成
 * return err(BookNotFoundError.create({ id: bookId }));
 *
 * // 型ガード
 * if (BookNotFoundError.is(error)) { ... }
 * ```
 */
export function defineError<P extends ErrorPayload = ErrorPayload>(def: {
	code: string;
	name: string;
	description: string;
	meta: ErrorMeta;
}): ErrorDef<P> {
	return Object.freeze({
		...def,
		create: (payload: P, opts?: { cause?: Error }) =>
			new AppError<P>({ ...def, payload, cause: opts?.cause }),
		is: (e: unknown): e is AppError<P> =>
			e instanceof AppError && e.code === def.code,
	});
}
