/**
 * Library 集約の型定義。
 *
 * 関数型 DDD パターンに従い、集約を Zod スキーマ + 型として定義する。
 * class ではなくプレーンなデータ型とし、振る舞いは純粋関数で表現する。
 *
 * - LibrarySchema: Library 集約の完全スキーマ
 */
import { z } from "zod";

/** Library 集約スキーマ */
export const LibrarySchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1, "Name must not be empty"),
	location: z.string(),
});

/** Library 集約の型 */
export type Library = z.infer<typeof LibrarySchema>;
