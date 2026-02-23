import { cloudflare } from "@cloudflare/vite-plugin";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const config = defineConfig({
	envDir: fileURLToPath(new URL("../../", import.meta.url)),
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
		react(),
	],
});

export default config;
