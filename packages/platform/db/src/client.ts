/**
 * Drizzle ORM クライアントの初期化。
 *
 * 環境変数 DATABASE_URL から接続情報を読み取り、Drizzle DB インスタンスを返す。
 *
 * process.env は Node.js で標準利用可能。
 * Cloudflare Workers では nodejs_compat_v2 フラグにより process.env に
 * Worker 変数（.dev.vars / secrets）が注入される。
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Db {
	const databaseUrl = process.env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("Missing required environment variable: DATABASE_URL");
	}

	const client = postgres(databaseUrl, {
		max: 1,
		prepare: false,
	});
	return drizzle(client, { schema });
}
