/**
 * catalog コンテキストのクエリ定義。
 *
 * - ListBooksQuery: 書籍一覧取得クエリ
 * - GetBookByIdQuery: 書籍詳細取得クエリ
 * - CatalogQueryResultMap: クエリ型 → 成功/エラー型のマッピング
 */
import type { AppError } from "@shared-kernel/public";
import type { BookDto, BookListDto } from "./catalog-dtos.ts";

/** 書籍一覧取得クエリ */
export interface ListBooksQuery {
	readonly type: "catalog.listBooks";
}

/** 書籍詳細取得クエリ */
export interface GetBookByIdQuery {
	readonly type: "catalog.getBookById";
	readonly bookId: string;
}

/**
 * クエリ型 → 結果型のマッピング。
 * Bus の型安全な execute に使用する。
 */
export type CatalogQueryResultMap = {
	"catalog.listBooks": { ok: BookListDto; err: AppError };
	"catalog.getBookById": { ok: BookDto; err: AppError };
};
