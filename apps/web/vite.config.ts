import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "url";
import { nitro } from "nitro/vite";

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
		nitro(),
		tailwindcss(),
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),

		tanstackStart(),
		viteReact(),
	],
});

export default config;
