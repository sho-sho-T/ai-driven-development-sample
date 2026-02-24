/**
 * @platform/db
 *
 * Drizzle ORM の DB クライアントとスキーマを提供する。
 * アプリケーション全体で共有するデータベースアクセス層。
 */
export { getDb } from "./client.ts";
export { books } from "./schema.ts";
