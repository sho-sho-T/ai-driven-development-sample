/**
 * LibraryQueryService インターフェース（ポート）。
 *
 * Read 側でデータ取得に使用する抽象。
 * 実装はインフラ層（library-infra-db）で提供する。
 *
 * - findAll: 全図書館を取得
 */

import type { AppError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";
import type { LibraryReadModel } from "./library-read-model.ts";

export interface LibraryQueryService {
	findAll(): ResultAsync<ReadonlyArray<LibraryReadModel>, AppError>;
}
