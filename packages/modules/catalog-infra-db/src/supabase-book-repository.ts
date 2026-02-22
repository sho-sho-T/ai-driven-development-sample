/**
 * BookRepository の Supabase 実装。
 *
 * Write 側の BookRepository インターフェースを Supabase（PostgreSQL）で実装する。
 */
import type { Book, BookRepository } from "@modules/catalog-write";
import { IsbnSchema } from "@modules/catalog-write";
import type { AppError } from "@shared-kernel/public";
import { dependencyError } from "@shared-kernel/public";
import { ResultAsync } from "neverthrow";
import { getSupabaseClient } from "./supabase-client.ts";

type BookRow = {
	id: string;
	isbn: string;
	title: string;
	author: string;
	publisher: string;
	published_year: number;
	status: string;
};

function rowToBook(row: BookRow): Book {
	return {
		id: row.id,
		isbn: IsbnSchema.parse(row.isbn),
		title: row.title,
		author: row.author,
		publisher: row.publisher,
		publishedYear: row.published_year,
		status: row.status as Book["status"],
	};
}

function wrapError(err: unknown): AppError {
	return dependencyError(err instanceof Error ? err : new Error(String(err)));
}

export class SupabaseBookRepository implements BookRepository {
	findById(id: string): ResultAsync<Book | null, AppError> {
		return ResultAsync.fromPromise(
			getSupabaseClient()
				.from("books")
				.select("*")
				.eq("id", id)
				.maybeSingle()
				.then(({ data, error }) => {
					if (error) throw new Error(error.message);
					return data ? rowToBook(data as BookRow) : null;
				}),
			wrapError,
		);
	}

	findByIsbn(isbn: string): ResultAsync<Book | null, AppError> {
		return ResultAsync.fromPromise(
			getSupabaseClient()
				.from("books")
				.select("*")
				.eq("isbn", isbn)
				.maybeSingle()
				.then(({ data, error }) => {
					if (error) throw new Error(error.message);
					return data ? rowToBook(data as BookRow) : null;
				}),
			wrapError,
		);
	}

	save(book: Book): ResultAsync<void, AppError> {
		return ResultAsync.fromPromise(
			getSupabaseClient()
				.from("books")
				.upsert({
					id: book.id,
					isbn: book.isbn,
					title: book.title,
					author: book.author,
					publisher: book.publisher,
					published_year: book.publishedYear,
					status: book.status,
				})
				.then(({ error }) => {
					if (error) throw new Error(error.message);
				}),
			wrapError,
		);
	}
}
