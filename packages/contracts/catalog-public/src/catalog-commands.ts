/**
 * catalog コンテキストのコマンド定義。
 *
 * - RegisterBookCommand: 書籍新規登録コマンド
 * - RegisterBookInputSchema: 入力バリデーション用 Zod スキーマ
 * - CatalogCommandResultMap: コマンド型 → 成功/エラー型のマッピング
 */
import { z } from "zod";
import type { AppError } from "@shared-kernel/public";
import type { BookDto } from "./catalog-dtos.ts";

/** 書籍登録コマンドの入力スキーマ（Zod によるバリデーション） */
export const RegisterBookInputSchema = z.object({
	isbn: z.string().regex(/^\d{13}$/, "ISBN must be a 13-digit number"),
	title: z.string().min(1, "Title must not be empty"),
	author: z.string().min(1, "Author must not be empty"),
	publisher: z.string().optional().default(""),
	publishedYear: z.number().int().optional(),
});

export type RegisterBookInput = z.infer<typeof RegisterBookInputSchema>;

/** 書籍登録コマンド。type で Bus がハンドラーを特定する */
export interface RegisterBookCommand {
	readonly type: "catalog.registerBook";
	readonly input: RegisterBookInput;
}

/**
 * コマンド型 → 結果型のマッピング。
 * Bus の型安全な execute に使用する。
 */
export type CatalogCommandResultMap = {
	"catalog.registerBook": { ok: BookDto; err: AppError };
};
