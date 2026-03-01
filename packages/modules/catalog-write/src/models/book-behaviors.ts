/**
 * Book 集約の振る舞い（純粋関数）。
 *
 * 関数型 DDD パターンに従い、集約の状態遷移を副作用のない純粋関数で表現する。
 * - createBook: ISBN, タイトル等から Book を生成（バリデーション付き）
 * - changeBookStatus: 書籍の貸出状態を変更
 *
 * ルール違反時は err() を返す（例外をスローしない）。
 */
import { ok, err, type Result } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import { generateId } from "@shared-kernel/public";
import { BookSchema, type Book, IsbnSchema } from "./book.ts";
import { CatalogValidationError } from "@contracts/catalog-public";
import type { BookStatus } from "./book.ts";

/** 書籍生成の入力 */
interface CreateBookInput {
	readonly isbn: string;
	readonly title: string;
	readonly author: string;
	readonly publisher?: string;
	readonly publishedYear?: number;
}

/**
 * createBook: 入力から Book 集約を生成する。
 *
 * - ISBN を IsbnSchema でバリデーション
 * - BookSchema で全フィールドをバリデーション
 * - ID は自動生成（ULID 風）
 * - status は "available" で初期化
 */
export function createBook(input: CreateBookInput): Result<Book, AppError> {
	const isbnResult = IsbnSchema.safeParse(input.isbn);
	if (!isbnResult.success) {
		return err(
			CatalogValidationError.create({
				details: isbnResult.error.issues[0]!.message,
			}),
		);
	}

	const bookData = {
		id: generateId(),
		isbn: isbnResult.data,
		title: input.title,
		author: input.author,
		publisher: input.publisher ?? "",
		publishedYear: input.publishedYear,
		status: "available" as const,
	};

	const parseResult = BookSchema.safeParse(bookData);
	if (!parseResult.success) {
		return err(
			CatalogValidationError.create({
				details: parseResult.error.issues[0]!.message,
			}),
		);
	}

	return ok(parseResult.data);
}

/**
 * changeBookStatus: 書籍の貸出状態を変更する。
 *
 * 新しい status を適用した Book を返す（イミュータブル更新）。
 */
export function changeBookStatus(
	book: Book,
	newStatus: BookStatus,
): Result<Book, AppError> {
	return ok({ ...book, status: newStatus });
}
