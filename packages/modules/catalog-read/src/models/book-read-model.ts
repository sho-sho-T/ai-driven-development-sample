/**
 * BookReadModel: クエリ最適化された書籍のビュー。
 *
 * Read 側は Domain Model を経由せず、ReadModel を直接返す。
 * Write 側の Book 集約とは独立しており、クエリに最適化した構造にできる。
 */
import { z } from "zod";

/** 書籍の ReadModel スキーマ */
export const BookReadModelSchema = z.object({
	id: z.string(),
	isbn: z.string(),
	title: z.string(),
	author: z.string(),
	publisher: z.string(),
	publishedYear: z.number().optional(),
	status: z.enum(["available", "onLoan"]),
});

export type BookReadModel = z.infer<typeof BookReadModelSchema>;
