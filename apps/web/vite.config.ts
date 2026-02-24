import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { defineConfig, loadEnv } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => {
	const envDir = fileURLToPath(new URL("../../", import.meta.url));

	// dev 時のみ: root .env から DATABASE_URL を読み取り Worker コードに注入する。
	// @cloudflare/vite-plugin の Worker 環境では process.env が unenv の空オブジェクトになるため、
	// Vite の define で process.env.DATABASE_URL を文字列リテラルに置換する。
	// 本番時は nodejs_compat_v2 フラグにより Worker secrets が process.env に注入される。
	const define: Record<string, string> = {};
	if (command === "serve") {
		const env = loadEnv("development", envDir, "");
		if (env["DATABASE_URL"]) {
			define["process.env.DATABASE_URL"] = JSON.stringify(env["DATABASE_URL"]);
		}
	}

	return {
		envDir,
		define,
		resolve: {
			alias: {
				"@": fileURLToPath(new URL("./src", import.meta.url)),
			},
		},
		plugins: [
			devtools({
				eventBusConfig: {
					port: 42069,
				},
			}),
			viteTsConfigPaths({
				projects: ["./tsconfig.json"],
			}),
			cloudflare({ viteEnvironment: { name: "ssr" } }),
			tanstackStart(),
			tailwindcss(),
			react(),
		],
	};
});
