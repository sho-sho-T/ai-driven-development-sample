/**
 * @contracts/catalog-public
 *
 * catalog コンテキストの公開契約。
 * FE/BE 共通で使用するコマンド、クエリ、DTO、エラー定義をエクスポートする。
 */

// Commands
export {
	RegisterBookInputSchema,
	type RegisterBookInput,
	type RegisterBookCommand,
	type CatalogCommandResultMap,
} from "./catalog-commands.ts";

// Queries
export {
	type ListBooksQuery,
	type GetBookByIdQuery,
	type CatalogQueryResultMap,
} from "./catalog-queries.ts";

// DTOs
export {
	BookDtoSchema,
	type BookDto,
	type BookListDto,
} from "./catalog-dtos.ts";

// Errors
export {
	isbnAlreadyExists,
	bookNotFound,
	catalogValidationError,
} from "./catalog-errors.ts";
