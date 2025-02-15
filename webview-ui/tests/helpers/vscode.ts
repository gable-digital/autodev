import { test as base, chromium, type BrowserContext } from "@playwright/test"
import path from "path"

// Extend base test with VSCode context
export const test = base.extend<{
	context: BrowserContext
}>({
	context: async ({}, use) => {
		// Launch VSCode in debug mode
		const context = await chromium.launchPersistentContext("", {
			args: ["--disable-web-security", "--allow-file-access-from-files"],
			devtools: true,
		})

		await use(context)
		await context.close()
	},
})

export { expect } from "@playwright/test"
