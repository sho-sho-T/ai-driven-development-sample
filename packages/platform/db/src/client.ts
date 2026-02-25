/**
 * Drizzle ORM クライアントの初期化。
 *
 * 環境変数 DATABASE_URL から接続情報を読み取り、Drizzle DB インスタンスを返す。
 *
 * Cloudflare Workers では `cloudflare:workers` の env オブジェクト経由で
 * 環境変数・シークレットにアクセスする（公式推奨）。
 * ローカル dev 時は apps/web/.dev.vars の値が Miniflare 経由で提供される。
 */
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function getDb(): Db {
	// Cloudflare Workers では I/O オブジェクト（TCP ストリーム等）をリクエスト間で共有できない。
	// postgres クライアントは内部でストリームを持つため、リクエストごとに生成する必要がある。
	const databaseUrl = env.DATABASE_URL;

	if (!databaseUrl) {
		throw new Error("Missing required environment variable: DATABASE_URL");
	}

	const client = postgres(databaseUrl, {
		max: 1,
		prepare: false, // ← Cloudflare Workers + pooler では必須
	});
	return drizzle(client, { schema });
}
