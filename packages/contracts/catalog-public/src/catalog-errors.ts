/**
 * catalog コンテキスト固有のエラー定義。
 *
 * defineError でエラー定義を作成し、ハンドラーやドメイン関数から使用する。
 * ペイロードにコンテキスト情報を持たせることで、ログや UI での詳細表示が可能。
 *
 * エラーインスタンス型が必要な場合は ErrorType<typeof XxxError> を使用する。
 */
import { defineError } from "@shared-kernel/public";

/** ISBN が既に登録済みのエラー */
export const IsbnAlreadyExistsError = defineError<{ isbn: string }>({
	code: "ISBN_ALREADY_EXISTS",
	name: "IsbnAlreadyExistsError",
	description: "指定されたISBNは既に登録されています",
	meta: { exposure: "EXPECTED" },
});

/** 指定された書籍が見つからないエラー */
export const BookNotFoundError = defineError<{ id: string }>({
	code: "BOOK_NOT_FOUND",
	name: "BookNotFoundError",
	description: "指定された書籍が見つかりません",
	meta: { exposure: "EXPECTED" },
});

/** 入力バリデーションエラー */
export const CatalogValidationError = defineError<{ details: string }>({
	code: "CATALOG_VALIDATION_ERROR",
	name: "CatalogValidationError",
	description: "入力値にバリデーションエラーが発生しました",
	meta: { exposure: "EXPECTED" },
});
