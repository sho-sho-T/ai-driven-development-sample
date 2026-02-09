/**
 * BookQueryService インターフェース（ポート）。
 *
 * Read 側でデータ取得に使用する抽象。
 * 実装はインフラ層（catalog-infra-db）で提供する。
 *
 * - findAll: 全書籍を取得
 * - findById: ID で書籍を取得
 */
import type { ResultAsync } from "neverthrow";
import type { AppError } from "@shared-kernel/public";
import type { BookReadModel } from "./book-read-model.ts";

export interface BookQueryService {
	findAll(): ResultAsync<ReadonlyArray<BookReadModel>, AppError>;
	findById(id: string): ResultAsync<BookReadModel | null, AppError>;
}
