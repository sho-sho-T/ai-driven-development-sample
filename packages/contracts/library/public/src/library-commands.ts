import type { DependencyError, LibraryId } from "@shared-kernel/public";
import { z } from "zod";

/**
 * 図書館登録コマンドの入力スキーマ
 */
export const RegisterLibraryInputSchema = z.object({
	name: z.string().min(1, "Name must not be empty"),
	email: z.string().email("Email must be valid"),
});

export type RegisterLibraryInput = z.infer<typeof RegisterLibraryInputSchema>;

// ===========================
// Admin Commands
// ===========================

/**
 * 図書館登録コマンド
 */
export const RegisterLibraryCommandSchema = z.object({
	type: z.literal("library.registerLibrary"),
	input: RegisterLibraryInputSchema,
});

export type RegisterLibraryCommand = z.infer<
	typeof RegisterLibraryCommandSchema
>;

export type RegisterLibraryResult = {
	libraryId: LibraryId;
};

/**
 * メール認証コマンドの入力スキーマ
 */
export const VerifyLibraryEmailInputSchema = z.object({
	libraryId: z.string().min(1),
});

export type VerifyLibraryEmailInput = z.infer<
	typeof VerifyLibraryEmailInputSchema
>;

/**
 * メール認証コマンド
 */
export const VerifyLibraryEmailCommandSchema = z.object({
	type: z.literal("library.verifyEmail"),
	input: VerifyLibraryEmailInputSchema,
});

export type VerifyLibraryEmailCommand = z.infer<
	typeof VerifyLibraryEmailCommandSchema
>;

export type VerifyLibraryEmailResult = void;

/**
 * コマンド型 → 結果型のマッピング。
 * Bus の型安全な execute に使用する。
 */
export type LibraryCommandResultMap = {
	"library.registerLibrary": [RegisterLibraryResult, DependencyError];
	"library.verifyEmail": [VerifyLibraryEmailResult, DependencyError];
};

/** 全 library コマンドの discriminated union */
export type LibraryCommands =
	| RegisterLibraryCommand
	| VerifyLibraryEmailCommand;

/** 全 library コマンドの type 文字列 union */
export type LibraryCommandType = LibraryCommands["type"];
