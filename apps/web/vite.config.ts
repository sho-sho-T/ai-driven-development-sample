import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
	return {
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
