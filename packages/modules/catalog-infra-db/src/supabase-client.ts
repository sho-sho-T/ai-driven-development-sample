/**
 * Supabase クライアントの初期化。
 *
 * 環境変数 SUPABASE_URL / SUPABASE_ANON_KEY から接続情報を読み取り、
 * シングルトンのクライアントインスタンスを返す。
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let instance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
	if (instance) return instance;

	const processEnv = (
		globalThis as { process?: { env: Record<string, string | undefined> } }
	).process?.env;
	const supabaseUrl = processEnv?.["SUPABASE_URL"];
	const supabaseAnonKey = processEnv?.["SUPABASE_ANON_KEY"];

	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error(
			"Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY",
		);
	}

	instance = createClient(supabaseUrl, supabaseAnonKey);
	return instance;
}
