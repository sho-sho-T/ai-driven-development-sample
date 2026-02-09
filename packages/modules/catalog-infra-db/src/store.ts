/**
 * インメモリストア。
 *
 * Book 集約をメモリ上の Map に保持する。
 * DB 不要でサンプルとして動作可能にするためのシンプルな実装。
 *
 * 注意: アプリケーション再起動でデータは消失する。
 * 本番環境では DB 実装（Drizzle + Supabase 等）に差し替える。
 */
import type { Book } from "@modules/catalog-write";

/** シングルトンのインメモリストア */
export const bookStore = new Map<string, Book>();
