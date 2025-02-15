import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./tests",
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: "html",
	use: {
		baseURL: "http://localhost:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "npm run start",
		url: "http://localhost:3000",
		reuseExistingServer: !process.env.CI,
	},
	expect: {
		// Maximum time expect() should wait for the condition to be met
		timeout: 5000,
		toHaveScreenshot: {
			maxDiffPixels: 100, // Allow slight differences due to rendering
		},
	},
})
