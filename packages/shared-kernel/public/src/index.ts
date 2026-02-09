/**
 * @shared-kernel/public
 *
 * FE/BE 共通の基盤パッケージ。
 * エラー型、ID スキーマ、ユーティリティを提供する。
 */
export {
	type AppError,
	defineError,
	dependencyError,
} from "./error/app-error.ts";
export {
	BookIdSchema,
	type BookId,
	MemberIdSchema,
	type MemberId,
	LoanIdSchema,
	type LoanId,
	generateId,
} from "./id/id-schemas.ts";
