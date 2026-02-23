/**
 * BookQueryService の Supabase 実装。
 *
 * Read 側の BookQueryService インターフェースを Supabase（PostgreSQL）で実装する。
 */
import type { AppError } from "@shared-kernel/public";
import { dependencyError } from "@shared-kernel/public";
import type { BookQueryService, BookReadModel } from "@modules/catalog-read";
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

function rowToReadModel(row: BookRow): BookReadModel {
	return {
		id: row.id,
		isbn: row.isbn,
		title: row.title,
		author: row.author,
		publisher: row.publisher,
		publishedYear: row.published_year,
		status: row.status as BookReadModel["status"],
	};
}

function wrapError(err: unknown): AppError {
	return dependencyError(err instanceof Error ? err : new Error(String(err)));
}

export class SupabaseBookQueryService implements BookQueryService {
	findAll(): ResultAsync<ReadonlyArray<BookReadModel>, AppError> {
		return ResultAsync.fromPromise(
			getSupabaseClient()
				.from("books")
				.select("*")
				.then(({ data, error }) => {
					if (error) throw new Error(error.message);
					return (data as BookRow[]).map(rowToReadModel);
				}),
			wrapError,
		);
	}

	findById(id: string): ResultAsync<BookReadModel | null, AppError> {
		return ResultAsync.fromPromise(
			getSupabaseClient()
				.from("books")
				.select("*")
				.eq("id", id)
				.maybeSingle()
				.then(({ data, error }) => {
					if (error) throw new Error(error.message);
					return data ? rowToReadModel(data as BookRow) : null;
				}),
			wrapError,
		);
	}
}
