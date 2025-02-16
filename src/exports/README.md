# AutoDev API

The AutoDev extension exposes an API that can be used by other extensions. To use this API in your extension:

1. Copy `src/extension-api/autodev.d.ts` to your extension's source directory.
2. Include `autodev.d.ts` in your extension's compilation.
3. Get access to the API with the following code:

    ```ts
    const autodevExtension = vscode.extensions.getExtension<AutoDevAPI>("gable-digital-solutions.gds-autodev")

    if (!autodevExtension?.isActive) {
    	throw new Error("AutoDev extension is not activated")
    }

    const autodev = autodevExtension.exports

    if (autodev) {
    	// Now you can use the API

    	// Set custom instructions
    	await autodev.setCustomInstructions("Talk like a pirate")

    	// Get custom instructions
    	const instructions = await autodev.getCustomInstructions()
    	console.log("Current custom instructions:", instructions)

    	// Start a new task with an initial message
    	await autodev.startNewTask("Hello, AutoDev! Let's make a new project...")

    	// Start a new task with an initial message and images
    	await autodev.startNewTask("Use this design language", ["data:image/webp;base64,..."])

    	// Send a message to the current task
    	await autodev.sendMessage("Can you fix the @problems?")

    	// Simulate pressing the primary button in the chat interface (e.g. 'Save' or 'Proceed While Running')
    	await autodev.pressPrimaryButton()

    	// Simulate pressing the secondary button in the chat interface (e.g. 'Reject')
    	await autodev.pressSecondaryButton()
    } else {
    	console.error("AutoDev API is not available")
    }
    ```

    **Note:** To ensure that the `gable-digital-solutions.gds-autodev` extension is activated before your extension, add it to the `extensionDependencies` in your `package.json`:

    ```json
    "extensionDependencies": [
        "gable-digital-solutions.gds-autodev"
    ]
    ```

For detailed information on the available methods and their usage, refer to the `autodev.d.ts` file.
