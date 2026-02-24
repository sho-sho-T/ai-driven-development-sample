/**
 * BookRepository の Drizzle 実装。
 *
 * Write 側の BookRepository インターフェースを Drizzle ORM（PostgreSQL）で実装する。
 */
import type { Book, BookRepository } from "@modules/catalog-write";
import { IsbnSchema } from "@modules/catalog-write";
import type { AppError } from "@shared-kernel/public";
import { dependencyError } from "@shared-kernel/public";
import { ResultAsync } from "neverthrow";
import { eq } from "drizzle-orm";
import { getDb, books } from "@platform/db";

function rowToBook(row: typeof books.$inferSelect): Book {
	return {
		id: row.id,
		isbn: IsbnSchema.parse(row.isbn),
		title: row.title,
		author: row.author,
		publisher: row.publisher ?? "",
		publishedYear: row.publishedYear ?? undefined,
		status: row.status as Book["status"],
	};
}

function wrapError(err: unknown): AppError {
	return dependencyError(err instanceof Error ? err : new Error(String(err)));
}

export class DrizzleBookRepository implements BookRepository {
	findById(id: string): ResultAsync<Book | null, AppError> {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(books)
				.where(eq(books.id, id))
				.then((rows) => (rows[0] ? rowToBook(rows[0]) : null)),
			wrapError,
		);
	}

	findByIsbn(isbn: string): ResultAsync<Book | null, AppError> {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(books)
				.where(eq(books.isbn, isbn))
				.then((rows) => (rows[0] ? rowToBook(rows[0]) : null)),
			wrapError,
		);
	}

	save(book: Book): ResultAsync<void, AppError> {
		return ResultAsync.fromPromise(
			getDb()
				.insert(books)
				.values({
					id: book.id,
					isbn: book.isbn,
					title: book.title,
					author: book.author,
					publisher: book.publisher,
					publishedYear: book.publishedYear,
					status: book.status,
				})
				.onConflictDoUpdate({
					target: books.id,
					set: {
						isbn: book.isbn,
						title: book.title,
						author: book.author,
						publisher: book.publisher,
						publishedYear: book.publishedYear,
						status: book.status,
					},
				})
				.then(() => undefined),
			wrapError,
		);
	}
}
