/**
 * LibraryRepository インターフェース（ポート）。
 *
 * ドメイン層に定義する永続化の抽象。
 * 実装はインフラ層（library-infra-db）で提供する。
 *
 * - save: 図書館を保存（新規 or 更新）
 * - findAll: 全図書館を取得
 */

import type { AppError } from "@shared-kernel/public";
import type { ResultAsync } from "neverthrow";
import type { Library } from "../models/library.ts";

export interface LibraryRepository {
	save(library: Library): ResultAsync<void, AppError>;
	findAll(): ResultAsync<ReadonlyArray<Library>, AppError>;
}
