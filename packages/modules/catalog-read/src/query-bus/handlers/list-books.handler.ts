/**
 * ListBooks クエリハンドラー。
 *
 * 「書籍一覧取得」ユースケースを実装する。
 *
 * フロー:
 * 1. BookQueryService で全書籍の ReadModel を取得
 * 2. BookListDto に変換して返却
 */
import type { HandlerDefinition, Container } from "@shared-kernel/server";
import type { ListBooksQuery, BookListDto } from "@contracts/catalog-public";
import { BookQueryServiceToken } from "@contracts/catalog-server";
import type { BookQueryService } from "../../models/book-query-service.ts";

export const listBooksHandler: HandlerDefinition<ListBooksQuery, BookListDto> =
	{
		type: "catalog.listBooks",
		factory: (container: Container) => {
			const queryService = container.resolve(
				BookQueryServiceToken,
			) as BookQueryService;

			return () => {
				return queryService.findAll().map((books) => ({
					books: books.map((book) => ({
						id: book.id,
						isbn: book.isbn,
						title: book.title,
						author: book.author,
						publisher: book.publisher,
						publishedYear: book.publishedYear,
						status: book.status,
					})),
					total: books.length,
				}));
			};
		},
	};
