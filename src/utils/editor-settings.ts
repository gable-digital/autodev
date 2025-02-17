import * as vscode from "vscode"

interface EditorSettings {
	"editor.quickSuggestions": { [key: string]: string | boolean }
	"editor.suggestOnTriggerCharacters": boolean
	"editor.acceptSuggestionOnCommitCharacter": boolean
	"editor.acceptSuggestionOnEnter": string
	"editor.codeLens": boolean
	"editor.parameterHints.enabled": boolean
	"typescript.suggest.enabled": boolean
	"javascript.suggest.enabled": boolean
	"editor.formatOnType": boolean
	"editor.formatOnPaste": boolean
}

let originalSettings: EditorSettings | null = null

/**
 * Disables editor features that could slow down file editing
 */
export async function disableEditorFeatures() {
	const config = vscode.workspace.getConfiguration()

	// Store original settings
	originalSettings = {
		"editor.quickSuggestions": config.get("editor.quickSuggestions") as { [key: string]: string | boolean },
		"editor.suggestOnTriggerCharacters": config.get("editor.suggestOnTriggerCharacters") as boolean,
		"editor.acceptSuggestionOnCommitCharacter": config.get("editor.acceptSuggestionOnCommitCharacter") as boolean,
		"editor.acceptSuggestionOnEnter": config.get("editor.acceptSuggestionOnEnter") as string,
		"editor.codeLens": config.get("editor.codeLens") as boolean,
		"editor.parameterHints.enabled": config.get("editor.parameterHints.enabled") as boolean,
		"typescript.suggest.enabled": config.get("typescript.suggest.enabled") as boolean,
		"javascript.suggest.enabled": config.get("javascript.suggest.enabled") as boolean,
		"editor.formatOnType": config.get("editor.formatOnType") as boolean,
		"editor.formatOnPaste": config.get("editor.formatOnPaste") as boolean,
	}

	// Disable features
	await config.update("editor.quickSuggestions", { other: false, comments: false, strings: false }, true)
	await config.update("editor.suggestOnTriggerCharacters", false, true)
	await config.update("editor.acceptSuggestionOnCommitCharacter", false, true)
	await config.update("editor.acceptSuggestionOnEnter", "off", true)
	await config.update("editor.codeLens", false, true)
	await config.update("editor.parameterHints.enabled", false, true)
	await config.update("typescript.suggest.enabled", false, true)
	await config.update("javascript.suggest.enabled", false, true)
	await config.update("editor.formatOnType", false, true)
	await config.update("editor.formatOnPaste", false, true)
}

/**
 * Restores editor features to their original state
 */
export async function restoreEditorFeatures() {
	if (!originalSettings) {
		return
	}

	const config = vscode.workspace.getConfiguration()

	// Restore original settings
	for (const [key, value] of Object.entries(originalSettings)) {
		await config.update(key, value, true)
	}

	originalSettings = null
}
