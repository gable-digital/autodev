import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { resolve } from "path"

export default defineConfig({
	plugins: [react()],
	build: {
		outDir: "build",
		rollupOptions: {
			input: {
				main: resolve(__dirname, "src/index.tsx"),
			},
			output: {
				entryFileNames: `static/js/[name].js`,
				chunkFileNames: `static/js/[name].js`,
				assetFileNames: `static/[ext]/[name].[ext]`,
			},
		},
		sourcemap: true,
		// Prevent code splitting to ensure all code is in a single file
		// This is important for VSCode webviews
		cssCodeSplit: false,
	},
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: ["./setupTests.js"],
	},
})
