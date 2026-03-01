/**
 * In-memory ストア。
 *
 * Repository と QueryService で共有する Map ストア。
 * 開発・テスト用途。本番では DB 実装に置き換える。
 */
import type { Library } from "@modules/library-write";

/** 図書館データの共有ストア */
export const libraryStore = new Map<string, Library>();
