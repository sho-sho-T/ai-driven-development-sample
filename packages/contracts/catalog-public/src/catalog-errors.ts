/**
 * catalog コンテキスト固有のエラー定義。
 *
 * defineError でエラーファクトリを定義し、
 * ハンドラーやドメイン関数から使用する。
 */
import { defineError } from "@shared-kernel/public";

/** ISBN が既に登録済みのエラー */
export const isbnAlreadyExists = defineError("ISBN_ALREADY_EXISTS", "EXPECTED");

/** 指定された書籍が見つからないエラー */
export const bookNotFound = defineError("BOOK_NOT_FOUND", "EXPECTED");

/** 入力バリデーションエラー */
export const catalogValidationError = defineError(
	"CATALOG_VALIDATION_ERROR",
	"EXPECTED",
);
