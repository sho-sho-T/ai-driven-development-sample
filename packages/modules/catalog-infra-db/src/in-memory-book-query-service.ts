/**
 * BookQueryService のインメモリ実装。
 *
 * Read 側の BookQueryService インターフェースをインメモリ Map で実装する。
 * 同じストアを参照し、ReadModel として返す。
 */
import { okAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";
import type { BookQueryService, BookReadModel } from "@modules/catalog-read";
import { bookStore } from "./store.ts";

export class InMemoryBookQueryService implements BookQueryService {
	findAll(): ResultAsync<ReadonlyArray<BookReadModel>, AppError> {
		const books: BookReadModel[] = Array.from(bookStore.values()).map(
			(book) => ({
				id: book.id,
				isbn: book.isbn,
				title: book.title,
				author: book.author,
				publisher: book.publisher,
				publishedYear: book.publishedYear,
				status: book.status,
			}),
		);
		return okAsync(books);
	}

	findById(id: string): ResultAsync<BookReadModel | null, AppError> {
		const book = bookStore.get(id);
		if (!book) {
			return okAsync(null);
		}
		return okAsync({
			id: book.id,
			isbn: book.isbn,
			title: book.title,
			author: book.author,
			publisher: book.publisher,
			publishedYear: book.publishedYear,
			status: book.status,
		});
	}
}
