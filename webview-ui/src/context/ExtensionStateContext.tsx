import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useEvent } from "react-use"
import { DEFAULT_AUTO_APPROVAL_SETTINGS } from "../../../src/shared/AutoApprovalSettings"
import { ExtensionMessage, ExtensionState, AutoDevMessage } from "../../../src/shared/ExtensionMessage"
import { ApiConfiguration, ModelInfo, openRouterDefaultModelId, openRouterDefaultModelInfo } from "../../../src/shared/api"
import { QueueState } from "../../../src/shared/QueueTypes"
import { findLastIndex } from "../../../src/shared/array"
import { McpServer } from "../../../src/shared/mcp"
import { convertTextMateToHljs } from "../utils/textMateToHljs"
import { vscode } from "../utils/vscode"
import { DEFAULT_BROWSER_SETTINGS } from "../../../src/shared/BrowserSettings"
import { DEFAULT_CHAT_SETTINGS } from "../../../src/shared/ChatSettings"

interface ExtensionStateContextType extends ExtensionState {
	didHydrateState: boolean
	showWelcome: boolean
	theme: any
	openRouterModels: Record<string, ModelInfo>
	openAiModels: string[]
	mcpServers: McpServer[]
	filePaths: string[]
	setApiConfiguration: (config: ApiConfiguration) => void
	setCustomInstructions: (value?: string) => void
	setShowAnnouncement: (value: boolean) => void
	cancelQueueItem: (id: string) => void
}

const ExtensionStateContext = createContext<ExtensionStateContextType | undefined>(undefined)

export const ExtensionStateContextProvider: React.FC<{
	children: React.ReactNode
}> = ({ children }) => {
	const [state, setState] = useState<ExtensionState>({
		version: "",
		autoDevMessages: [],
		taskHistory: [],
		shouldShowAnnouncement: false,
		autoApprovalSettings: DEFAULT_AUTO_APPROVAL_SETTINGS,
		browserSettings: DEFAULT_BROWSER_SETTINGS,
		chatSettings: DEFAULT_CHAT_SETTINGS,
		isLoggedIn: false,
	})
	const [didHydrateState, setDidHydrateState] = useState(false)
	const [showWelcome, setShowWelcome] = useState(false)
	const [theme, setTheme] = useState<any>(undefined)
	const [filePaths, setFilePaths] = useState<string[]>([])
	const [openRouterModels, setOpenRouterModels] = useState<Record<string, ModelInfo>>({
		[openRouterDefaultModelId]: openRouterDefaultModelInfo,
	})

	const [openAiModels, setOpenAiModels] = useState<string[]>([])
	const [mcpServers, setMcpServers] = useState<McpServer[]>([])

	const handleMessage = useCallback((event: MessageEvent) => {
		console.log("Received message in ExtensionStateContext:", event.data)
		const message: any = event.data // Use any type to handle both ExtensionMessage and WebviewMessage

		// Handle getLatestState message type
		if (message.type === "getLatestState") {
			console.log("Received getLatestState message:", message)
			const newState: ExtensionState = {
				version: message.version || "",
				apiConfiguration: message.apiConfiguration,
				customInstructions: message.customInstructions,
				uriScheme: message.uriScheme,
				currentTaskItem: message.currentTaskItem,
				checkpointTrackerErrorMessage: message.checkpointTrackerErrorMessage,
				autoDevMessages: message.autoDevMessages || [],
				taskHistory: message.taskHistory || [],
				shouldShowAnnouncement: message.shouldShowAnnouncement || false,
				autoApprovalSettings: message.autoApprovalSettings || DEFAULT_AUTO_APPROVAL_SETTINGS,
				browserSettings: message.browserSettings || DEFAULT_BROWSER_SETTINGS,
				chatSettings: message.chatSettings || DEFAULT_CHAT_SETTINGS,
				isLoggedIn: message.isLoggedIn || false,
				userInfo: message.userInfo,
				queueState: message.queueState,
			}
			setState(newState)
			const hasKey = message.apiConfiguration
				? [
						message.apiConfiguration.apiKey,
						message.apiConfiguration.openRouterApiKey,
						message.apiConfiguration.awsRegion,
						message.apiConfiguration.vertexProjectId,
						message.apiConfiguration.openAiApiKey,
						message.apiConfiguration.ollamaModelId,
						message.apiConfiguration.lmStudioModelId,
						message.apiConfiguration.geminiApiKey,
						message.apiConfiguration.openAiNativeApiKey,
						message.apiConfiguration.deepSeekApiKey,
						message.apiConfiguration.qwenApiKey,
						message.apiConfiguration.mistralApiKey,
						message.apiConfiguration.vsCodeLmModelSelector,
					].some((key) => key !== undefined)
				: false
			console.log("Setting showWelcome to:", !hasKey)
			setShowWelcome(!hasKey)
			console.log("Setting didHydrateState to true")
			setDidHydrateState(true)
			return
		}

		// Handle other message types
		const extMessage: ExtensionMessage = message
		switch (extMessage.type) {
			case "state": {
				console.log("Received state message:", extMessage.state)
				setState(extMessage.state!)
				const config = extMessage.state?.apiConfiguration
				const hasKey = config
					? [
							config.apiKey,
							config.openRouterApiKey,
							config.awsRegion,
							config.vertexProjectId,
							config.openAiApiKey,
							config.ollamaModelId,
							config.lmStudioModelId,
							config.geminiApiKey,
							config.openAiNativeApiKey,
							config.deepSeekApiKey,
							config.qwenApiKey,
							config.mistralApiKey,
							config.vsCodeLmModelSelector,
						].some((key) => key !== undefined)
					: false
				console.log("Setting showWelcome to:", !hasKey)
				setShowWelcome(!hasKey)
				console.log("Setting didHydrateState to true")
				setDidHydrateState(true)
				// Send state verification response
				vscode.postMessage({ type: "verifyState" })
				break
			}
			case "action": {
				switch (extMessage.action) {
					case "stateVerified":
						// State verification received from extension
						console.log("State verification received")
						break
				}
				break
			}
			case "theme": {
				if (extMessage.text) {
					setTheme(convertTextMateToHljs(JSON.parse(extMessage.text)))
				}
				break
			}
			case "workspaceUpdated": {
				setFilePaths(extMessage.filePaths ?? [])
				break
			}
			case "partialMessage": {
				const partialMessage = extMessage.partialMessage!
				setState((prevState) => {
					// worth noting it will never be possible for a more up-to-date message to be sent here or in normal messages post since the presentAssistantContent function uses lock
					const lastIndex = findLastIndex(
						prevState.autoDevMessages,
						(msg: AutoDevMessage) => msg.ts === partialMessage.ts,
					)
					if (lastIndex !== -1) {
						const newMessages = [...prevState.autoDevMessages]
						newMessages[lastIndex] = partialMessage
						return { ...prevState, autoDevMessages: newMessages }
					}
					return prevState
				})
				break
			}
			case "openRouterModels": {
				const updatedModels = extMessage.openRouterModels ?? {}
				setOpenRouterModels({
					[openRouterDefaultModelId]: openRouterDefaultModelInfo, // in case the extension sent a model list without the default model
					...updatedModels,
				})
				break
			}
			case "openAiModels": {
				const updatedModels = extMessage.openAiModels ?? []
				setOpenAiModels(updatedModels)
				break
			}
			case "mcpServers": {
				setMcpServers(extMessage.mcpServers ?? [])
				break
			}
			case "queueOperation": {
				setState((prevState) => ({
					...prevState,
					queueState: extMessage.state?.queueState,
				}))
				break
			}
		}
	}, [])

	useEvent("message", handleMessage)

	useEffect(() => {
		console.log("ExtensionStateContext mounted")
		try {
			// Add a small delay to ensure VSCode API is ready
			setTimeout(() => {
				console.log("Attempting to send webviewDidLaunch")
				vscode.postMessage({ type: "webviewDidLaunch" })
				console.log("webviewDidLaunch message sent successfully")
			}, 500) // Increased delay to ensure VSCode API is ready
		} catch (error) {
			console.error("Error sending webviewDidLaunch:", error)
		}
	}, [])

	useEffect(() => {
		console.log("Current state:", {
			didHydrateState,
			showWelcome,
			theme,
			openRouterModels,
			openAiModels,
			mcpServers,
			filePaths,
			...state,
		})
	}, [didHydrateState, showWelcome, theme, openRouterModels, openAiModels, mcpServers, filePaths, state])

	const contextValue: ExtensionStateContextType = {
		...state,
		didHydrateState,
		showWelcome,
		theme,
		openRouterModels,
		openAiModels,
		mcpServers,
		filePaths,
		setApiConfiguration: (value) =>
			setState((prevState) => ({
				...prevState,
				apiConfiguration: value,
			})),
		setCustomInstructions: (value) =>
			setState((prevState) => ({
				...prevState,
				customInstructions: value,
			})),
		setShowAnnouncement: (value) =>
			setState((prevState) => ({
				...prevState,
				shouldShowAnnouncement: value,
			})),
		cancelQueueItem: (id) =>
			vscode.postMessage({
				type: "queueOperation",
				queueOperation: "cancelItem",
				text: id,
			}),
	}

	return <ExtensionStateContext.Provider value={contextValue}>{children}</ExtensionStateContext.Provider>
}

export const useExtensionState = () => {
	const context = useContext(ExtensionStateContext)
	if (context === undefined) {
		throw new Error("useExtensionState must be used within an ExtensionStateContextProvider")
	}
	return context
}
