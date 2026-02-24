/**
 * BookQueryService の Drizzle 実装。
 *
 * Read 側の BookQueryService インターフェースを Drizzle ORM（PostgreSQL）で実装する。
 */
import type { AppError } from "@shared-kernel/public";
import { dependencyError } from "@shared-kernel/public";
import type { BookQueryService, BookReadModel } from "@modules/catalog-read";
import { ResultAsync } from "neverthrow";
import { eq } from "drizzle-orm";
import { getDb, books } from "@platform/db";

function rowToReadModel(row: typeof books.$inferSelect): BookReadModel {
	return {
		id: row.id,
		isbn: row.isbn,
		title: row.title,
		author: row.author,
		publisher: row.publisher ?? "",
		publishedYear: row.publishedYear ?? undefined,
		status: row.status as BookReadModel["status"],
	};
}

function wrapError(err: unknown): AppError {
	return dependencyError(err instanceof Error ? err : new Error(String(err)));
}

export class DrizzleBookQueryService implements BookQueryService {
	findAll(): ResultAsync<ReadonlyArray<BookReadModel>, AppError> {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(books)
				.then((rows) => rows.map(rowToReadModel)),
			wrapError,
		);
	}

	findById(id: string): ResultAsync<BookReadModel | null, AppError> {
		return ResultAsync.fromPromise(
			getDb()
				.select()
				.from(books)
				.where(eq(books.id, id))
				.then((rows) => (rows[0] ? rowToReadModel(rows[0]) : null)),
			wrapError,
		);
	}
}
