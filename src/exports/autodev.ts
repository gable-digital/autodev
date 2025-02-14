/**
 * Public API interface for the AutoDev extension.
 * This interface allows other extensions to interact with AutoDev programmatically.
 */
export interface AutoDevAPI {
	/**
	 * Set custom instructions for the AI assistant.
	 * @param value The custom instructions text
	 */
	setCustomInstructions(value: string): Promise<void>

	/**
	 * Get the current custom instructions.
	 * @returns The current custom instructions or undefined if none set
	 */
	getCustomInstructions(): Promise<string | undefined>

	/**
	 * Start a new task with an optional initial message and images.
	 * @param task Optional initial task message
	 * @param images Optional array of image paths
	 */
	startNewTask(task?: string, images?: string[]): Promise<void>

	/**
	 * Send a message to the current task.
	 * @param message Optional message text
	 * @param images Optional array of image paths
	 */
	sendMessage(message?: string, images?: string[]): Promise<void>

	/**
	 * Simulate pressing the primary button in the UI.
	 */
	pressPrimaryButton(): Promise<void>

	/**
	 * Simulate pressing the secondary button in the UI.
	 */
	pressSecondaryButton(): Promise<void>
}
