/**
 * GetBookById クエリハンドラー。
 *
 * 「書籍詳細取得」ユースケースを実装する。
 *
 * フロー:
 * 1. BookQueryService で ID による ReadModel を取得
 * 2. 存在しない場合は BookNotFoundError を返す
 * 3. BookDto に変換して返却
 */
import { okAsync, errAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { HandlerDefinition, Container } from "@shared-kernel/server";
import {
	type GetBookByIdQuery,
	type BookDto,
	BookNotFoundError,
} from "@contracts/catalog-public";
import { BookQueryServiceToken } from "@contracts/catalog-server";
import type { BookQueryService } from "../../models/book-query-service.ts";

export const getBookByIdHandler: HandlerDefinition<GetBookByIdQuery, BookDto> =
	{
		type: "catalog.getBookById",
		factory: (container: Container) => {
			const queryService = container.resolve(
				BookQueryServiceToken,
			) as BookQueryService;

			return (query) => {
				return queryService.findById(query.bookId).andThen((book) => {
					if (book === null) {
						return errAsync<BookDto, AppError>(
							BookNotFoundError.create({ id: query.bookId }),
						);
					}

					return okAsync<BookDto, AppError>({
						id: book.id,
						isbn: book.isbn,
						title: book.title,
						author: book.author,
						publisher: book.publisher,
						publishedYear: book.publishedYear,
						status: book.status,
					});
				});
			};
		},
	};
