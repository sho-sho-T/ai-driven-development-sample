/**
 * @contracts/library-public
 *
 * library コンテキストの公開契約。
 * FE/BE 共通で使用するコマンド、クエリ、DTO、エラー定義をエクスポートする。
 */

// Commands
export {
	RegisterLibraryInputSchema,
	type RegisterLibraryInput,
	type RegisterLibraryCommand,
	type RegisterLibraryResult,
	type LibraryCommandResultMap,
	type LibraryCommands,
	type LibraryCommandType,
} from "./library-commands.ts";

// Queries & DTOs
export {
	LibraryDtoSchema,
	type LibraryDto,
	type LibraryListResult,
	type LibraryListQuery,
	type LibraryQueryResultMap,
	type LibraryQueries,
	type LibraryQueryType,
} from "./library-queries.ts";

// Errors
export {
	LibraryValidationError,
	LibraryNotFoundError,
} from "./library-errors.ts";
