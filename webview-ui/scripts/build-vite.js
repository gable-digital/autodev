#!/usr/bin/env node

const { build } = require("vite")
const { resolve } = require("path")

async function buildWebview() {
	try {
		await build({
			root: resolve(__dirname, ".."),
			configFile: resolve(__dirname, "../vite.config.js"),
			build: {
				outDir: "build",
				emptyOutDir: true,
				rollupOptions: {
					input: {
						main: resolve(__dirname, "../src/index.tsx"),
					},
					output: {
						entryFileNames: `static/js/[name].js`,
						chunkFileNames: `static/js/[name].js`,
						assetFileNames: `static/[ext]/[name].[ext]`,
					},
				},
				sourcemap: true,
				cssCodeSplit: false,
			},
		})
		console.log("Build completed successfully")
	} catch (error) {
		console.error("Build failed:", error)
		process.exit(1)
	}
}

buildWebview()
