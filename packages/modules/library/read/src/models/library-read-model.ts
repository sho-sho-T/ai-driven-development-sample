/**
 * LibraryReadModel: クエリ最適化された図書館のビュー。
 *
 * Read 側は Domain Model を経由せず、ReadModel を直接返す。
 * Write 側の Library 集約とは独立しており、クエリに最適化した構造にできる。
 */
import { z } from "zod";

/** 図書館の ReadModel スキーマ */
export const LibraryReadModelSchema = z.object({
	id: z.string(),
	name: z.string(),
	location: z.string(),
});

export type LibraryReadModel = z.infer<typeof LibraryReadModelSchema>;
