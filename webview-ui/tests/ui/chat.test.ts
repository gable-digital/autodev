import { test, expect } from "../helpers/vscode"

test.describe("Chat UI", () => {
	test("chat input should be positioned correctly", async ({ page }) => {
		// Launch extension
		await page.goto("http://localhost:3000")

		// Wait for chat view to be visible
		await page.waitForSelector(".chat-input-container")

		// Get chat input container
		const chatInputContainer = await page.locator(".chat-input-container").first()

		// Verify chat input is at bottom
		const box = await chatInputContainer.boundingBox()
		const containerBottom = box ? box.y + box.height : 0
		const viewportHeight = page.viewportSize()?.height || 0
		expect(Math.abs(containerBottom - viewportHeight)).toBeLessThan(100) // Allow for some padding

		// Verify chat input takes full width
		const containerWidth = box?.width || 0
		const viewportWidth = page.viewportSize()?.width || 0
		expect(Math.abs(containerWidth - viewportWidth)).toBeLessThan(32) // Account for padding

		// Take screenshot for visual regression
		await expect(page).toHaveScreenshot("chat-view.png", {
			mask: [page.locator(".codicon")], // Mask icons that might change
			maxDiffPixelRatio: 0.01,
		})
	})

	test("chat input should maintain position when content scrolls", async ({ page }) => {
		await page.goto("http://localhost:3000")

		// Wait for chat input
		const chatInput = await page.locator(".chat-input-container")
		await chatInput.waitFor()

		// Type a message to create content
		await chatInput.type("Test message")
		await page.keyboard.press("Enter")

		// Wait for message to appear
		await page.waitForSelector(".message-row")

		// Verify chat input stays at bottom
		const inputBox = await chatInput.boundingBox()
		const inputBottom = inputBox ? inputBox.y + inputBox.height : 0
		const viewportHeight = page.viewportSize()?.height || 0
		expect(Math.abs(inputBottom - viewportHeight)).toBeLessThan(100)

		// Take screenshot
		await expect(page).toHaveScreenshot("chat-view-with-content.png", {
			mask: [page.locator(".codicon")],
			maxDiffPixelRatio: 0.01,
		})
	})
})
