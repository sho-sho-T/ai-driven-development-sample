/**
 * BookRepository インターフェース（ポート）。
 *
 * ドメイン層に定義する永続化の抽象。
 * 実装はインフラ層（catalog-infra-db）で提供する。
 *
 * - findById: ID で書籍を取得（存在しない場合は null）
 * - findByIsbn: ISBN で書籍を検索（重複チェックに使用）
 * - save: 書籍を保存（新規 or 更新）
 */
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { Book } from "../models/book.ts";

export interface BookRepository {
	findById(id: string): ResultAsync<Book | null, AppError>;
	findByIsbn(isbn: string): ResultAsync<Book | null, AppError>;
	save(book: Book): ResultAsync<void, AppError>;
}
