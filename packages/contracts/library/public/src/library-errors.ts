/**
 * library コンテキスト固有のエラー定義。
 *
 * defineError でエラー定義を作成し、ハンドラーやドメイン関数から使用する。
 * ペイロードにコンテキスト情報を持たせることで、ログや UI での詳細表示が可能。
 *
 * エラーインスタンス型が必要な場合は ErrorType<typeof XxxError> を使用する。
 */
import { defineError } from "@shared-kernel/public";

/** 入力バリデーションエラー */
export const LibraryValidationError = defineError<{ details: string }>({
	code: "LIBRARY_VALIDATION_ERROR",
	name: "LibraryValidationError",
	description: "入力値にバリデーションエラーが発生しました",
	meta: { exposure: "EXPECTED" },
});

/** 指定された図書館が見つからないエラー */
export const LibraryNotFoundError = defineError<{ id: string }>({
	code: "LIBRARY_NOT_FOUND",
	name: "LibraryNotFoundError",
	description: "指定された図書館が見つかりません",
	meta: { exposure: "EXPECTED" },
});
