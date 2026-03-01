/**
 * library コンテキストのコマンド定義。
 *
 * - RegisterLibraryCommand: 図書館新規登録コマンド
 * - RegisterLibraryInputSchema: 入力バリデーション用 Zod スキーマ
 * - LibraryCommandResultMap: コマンド型 → 成功/エラー型のマッピング
 */

import type { DependencyError, LibraryId } from "@shared-kernel/public";
import { z } from "zod";

/**
 * 図書館登録コマンドの入力スキーマ
 */
export const RegisterLibraryInputSchema = z.object({
	name: z.string().min(1, "Name must not be empty"),
	location: z.string(),
});

export type RegisterLibraryInput = z.infer<typeof RegisterLibraryInputSchema>;

// ===========================
// Admin Commnands
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
 * コマンド型 → 結果型のマッピング。
 * Bus の型安全な execute に使用する。
 */
export type LibraryCommandResultMap = {
	"library.registerLibrary": [RegisterLibraryResult, DependencyError];
};

/** 全 library コマンドの discriminated union */
export type LibraryCommands = RegisterLibraryCommand;

/** 全 library コマンドの type 文字列 union */
export type LibraryCommandType = LibraryCommands["type"];
