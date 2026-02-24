/**
 * Drizzle ORM クライアントの初期化。
 *
 * 環境変数 DATABASE_URL から接続情報を読み取り、
 * シングルトンの Drizzle DB インスタンスを返す。
 *
 * DATABASE_URL の解決順序:
 * 1. dev 時: vite.config.ts の define により root .env から注入
 * 2. 本番時: nodejs_compat_v2 により Worker secrets が process.env に注入
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

// process は nodejs_compat_v2 フラグで提供される Worker ランタイムのポリフィル。
// dev 時は vite.config.ts の define が process.env.DATABASE_URL を置換する。
declare const process: { env: Record<string, string | undefined> };

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Db {
	// Cloudflare Workers では I/O オブジェクト（TCP ストリーム等）をリクエスト間で共有できない。
	// postgres クライアントは内部でストリームを持つため、リクエストごとに生成する必要がある。
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("Missing required environment variable: DATABASE_URL");
	}

	const client = postgres(databaseUrl, { max: 1 });
	return drizzle(client, { schema });
}
