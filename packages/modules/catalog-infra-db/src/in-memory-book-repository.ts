/**
 * BookRepository のインメモリ実装。
 *
 * Write 側の BookRepository インターフェースをインメモリ Map で実装する。
 * 本番環境では DB アクセスに差し替えるが、インターフェースは同一。
 */
import { okAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";
import type { Book, BookRepository } from "@modules/catalog-write";
import { bookStore } from "./store.ts";

export class InMemoryBookRepository implements BookRepository {
	findById(id: string): ResultAsync<Book | null, AppError> {
		const book = bookStore.get(id) ?? null;
		return okAsync(book);
	}

	findByIsbn(isbn: string): ResultAsync<Book | null, AppError> {
		for (const book of bookStore.values()) {
			if (book.isbn === isbn) {
				return okAsync(book);
			}
		}
		return okAsync(null);
	}

	save(book: Book): ResultAsync<void, AppError> {
		bookStore.set(book.id, { ...book });
		return okAsync(undefined);
	}
}
