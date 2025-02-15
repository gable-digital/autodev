import { ApiConfiguration, ModelInfo } from "./api"
import { AutoApprovalSettings } from "./AutoApprovalSettings"
import { BrowserSettings } from "./BrowserSettings"
import { ChatSettings } from "./ChatSettings"
import { McpServer } from "./mcp"

export interface WebviewMessage {
	type:
		| "apiConfiguration"
		| "customInstructions"
		| "webviewDidLaunch"
		| "verifyState"
		| "newTask"
		| "askResponse"
		| "clearTask"
		| "didShowAnnouncement"
		| "selectImages"
		| "exportCurrentTask"
		| "showTaskWithId"
		| "deleteTaskWithId"
		| "exportTaskWithId"
		| "resetState"
		| "requestOllamaModels"
		| "requestLmStudioModels"
		| "openImage"
		| "openFile"
		| "openMention"
		| "cancelTask"
		| "refreshOpenRouterModels"
		| "refreshOpenAiModels"
		| "openMcpSettings"
		| "restartMcpServer"
		| "autoApprovalSettings"
		| "browserSettings"
		| "chatSettings"
		| "checkpointDiff"
		| "checkpointRestore"
		| "taskCompletionViewChanges"
		| "openExtensionSettings"
		| "requestVsCodeLmModels"
		| "toggleToolAutoApprove"
		| "toggleMcpServer"
		| "getLatestState"
		| "accountLoginClicked"
		| "accountLogoutClicked"
		| "subscribeEmail"
		| "queueOperation"
		| "theme"
		| "selectedImages"
		| "ollamaModels"
		| "lmStudioModels"
		| "vsCodeLmModels"
		| "openRouterModels"
		| "openAiModels"
		| "mcpServers"
	text?: string
	disabled?: boolean
	askResponse?: AutoDevAskResponse
	apiConfiguration?: ApiConfiguration
	images?: string[]
	bool?: boolean
	number?: number
	autoApprovalSettings?: AutoApprovalSettings
	browserSettings?: BrowserSettings
	chatSettings?: ChatSettings

	// For toggleToolAutoApprove
	serverName?: string
	toolName?: string
	autoApprove?: boolean

	// For queue operations
	queueOperation?: "cancelItem" | "clearQueue"

	// For model lists
	ollamaModels?: string[]
	lmStudioModels?: string[]
	vsCodeLmModels?: { vendor?: string; family?: string; version?: string; id?: string }[]
	openRouterModels?: Record<string, ModelInfo>
	openAiModels?: string[]
	mcpServers?: McpServer[]
}

export type AutoDevAskResponse = "yesButtonClicked" | "noButtonClicked" | "messageResponse"

export type AutoDevCheckpointRestore = "task" | "workspace" | "taskAndWorkspace"
