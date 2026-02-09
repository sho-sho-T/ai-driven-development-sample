/**
 * Book 集約の型定義。
 *
 * 関数型 DDD パターンに従い、集約を Zod スキーマ + 型として定義する。
 * class ではなくプレーンなデータ型とし、振る舞いは純粋関数で表現する。
 *
 * - IsbnSchema: ISBN-13 形式バリデーション
 * - BookStatusSchema: 書籍の貸出状態
 * - BookSchema: Book 集約の完全スキーマ
 */
import { z } from "zod";

/** ISBN-13 形式（13桁の数字） */
export const IsbnSchema = z
	.string()
	.regex(/^\d{13}$/, "ISBN must be a 13-digit number")
	.brand("Isbn");
export type Isbn = z.infer<typeof IsbnSchema>;

/** 書籍の貸出状態 */
export const BookStatusSchema = z.enum(["available", "onLoan"]);
export type BookStatus = z.infer<typeof BookStatusSchema>;

/** Book 集約スキーマ */
export const BookSchema = z.object({
	id: z.string().min(1),
	isbn: IsbnSchema,
	title: z.string().min(1, "Title must not be empty"),
	author: z.string().min(1, "Author must not be empty"),
	publisher: z.string().default(""),
	publishedYear: z.number().int().optional(),
	status: BookStatusSchema.default("available"),
});

/** Book 集約の型 */
export type Book = z.infer<typeof BookSchema>;
