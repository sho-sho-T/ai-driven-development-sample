/**
 * library コンテキストのクエリ定義と DTO。
 *
 * - ListLibrariesQuery: 図書館一覧取得クエリ
 * - LibraryQueryResultMap: クエリ型 → 成功/エラー型のマッピング
 * - LibraryDto / LibraryListDto: クエリ結果の DTO
 */
import { type DependencyError, LibraryIdSchema } from "@shared-kernel/public";
import { z } from "zod";

/** 図書館 DTO スキーマ */
export const LibraryDtoSchema = z.object({
	id: LibraryIdSchema,
	name: z.string(),
	location: z.string(),
});

export type LibraryDto = z.infer<typeof LibraryDtoSchema>;

/**
 * 図書館管理者向け図書館一覧クエリ
 */
export const LibraryListQuerySchema = z.object({
	type: z.literal("library.listLibraries"),
	name: z.string(),
	location: z.string(),
});
export type LibraryListQuery = z.infer<typeof LibraryListQuerySchema>;

/** 図書館一覧取得結果 */
export interface LibraryListResult {
	libraries: LibraryDto[];
}

/**
 * クエリ型 → 結果型のマッピング。
 * Bus の型安全な execute に使用する。
 */
export type LibraryQueryResultMap = {
	"library.listLibraries": [LibraryListResult, DependencyError];
};

/** 全 library クエリの discriminated union */
export type LibraryQueries = LibraryListQuery;

/** 全 library クエリの type 文字列 union */
export type LibraryQueryType = LibraryQueries["type"];
