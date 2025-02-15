import React from "react"
import styled from "styled-components"
import { useExtensionState } from "../context/ExtensionStateContext"
import { QueueItemStatus, QueuePriority } from "../shared/QueueTypes"
import type { QueueItem } from "../shared/QueueTypes"

/**
 * QueueStatusDisplay component provides a visual interface for the instruction queue system.
 * It displays queue statistics, item status, processing times, and relationships between items.
 *
 * Features:
 * - Real-time queue statistics (total, processing, completed, failed)
 * - Individual item status with priority levels
 * - Processing time tracking and display
 * - Parent-child relationship visualization
 * - Error messages and retry count display
 * - Scrollable queue list with custom styling
 *
 * The component automatically updates when the queue state changes through the ExtensionState context.
 * It provides user interaction through cancel buttons for pending items.
 *
 * @returns React component or null if queue is empty
 */
export const QueueStatusDisplay: React.FC = () => {
	const { queueState, cancelQueueItem } = useExtensionState()

	if (!queueState || queueState.items.length === 0) {
		return null
	}

	/**
	 * Formats a time duration in milliseconds to a human-readable string.
	 * @param ms Time duration in milliseconds
	 * @returns Formatted string (e.g., "100ms" or "1.5s")
	 */
	const formatTime = (ms: number) => {
		if (ms < 1000) return `${ms}ms`
		return `${(ms / 1000).toFixed(1)}s`
	}

	/**
	 * Calculates and formats the processing time for a queue item.
	 * For completed items, shows total processing time.
	 * For active items, shows current running time.
	 *
	 * @param item Queue item to calculate time for
	 * @returns Formatted time string or null if no time available
	 */
	const getProcessingTime = (item: QueueItem): string | null => {
		if (item.startTime && item.endTime) {
			return formatTime(item.endTime - item.startTime)
		}
		if (item.startTime) {
			return formatTime(Date.now() - item.startTime)
		}
		return null
	}

	return (
		<QueueStatusContainer>
			<QueueHeader>
				<QueueTitle>Instruction Queue</QueueTitle>
				<QueueStats>
					<span>Total: {queueState.items.length}</span>
					<span>Processing: {queueState.isProcessing ? 1 : 0}</span>
					<span>Completed: {queueState.stats.totalProcessed}</span>
					{queueState.stats.totalFailed > 0 && <ErrorStat>Failed: {queueState.stats.totalFailed}</ErrorStat>}
					{queueState.stats.totalRetries > 0 && <RetryStat>Retries: {queueState.stats.totalRetries}</RetryStat>}
					{queueState.stats.averageProcessingTime > 0 && (
						<TimeStat>Avg Time: {formatTime(queueState.stats.averageProcessingTime)}</TimeStat>
					)}
				</QueueStats>
			</QueueHeader>
			<QueueItems>
				{queueState.items.map((item) => (
					<QueueItemContainer key={item.id} status={item.status.toLowerCase()}>
						<ItemContent>
							<ItemHeader>
								<ItemStatus>{item.status}</ItemStatus>
								{item.priority !== QueuePriority.NORMAL && <ItemPriority>{item.priority}</ItemPriority>}
								{item.retryCount > 0 && <RetryCount>Retry {item.retryCount}</RetryCount>}
								{item.parentId && <RelationshipTag>Sub-task</RelationshipTag>}
								{item.childIds.length > 0 && (
									<RelationshipTag>Has {item.childIds.length} sub-tasks</RelationshipTag>
								)}
							</ItemHeader>
							<ItemMessage>{item.message.text}</ItemMessage>
							{item.error && <ItemError>{item.error}</ItemError>}
							{getProcessingTime(item) && <ItemTime>Time: {getProcessingTime(item)}</ItemTime>}
						</ItemContent>
						{item.status === QueueItemStatus.PENDING && (
							<CancelButton onClick={() => cancelQueueItem(item.id)} title="Cancel this instruction">
								✕
							</CancelButton>
						)}
					</QueueItemContainer>
				))}
			</QueueItems>
		</QueueStatusContainer>
	)
}

const QueueStatusContainer = styled.div`
	margin: 1rem 0;
	padding: 1rem;
	border: 1px solid var(--vscode-editorWidget-border);
	border-radius: 4px;
	background: var(--vscode-editorWidget-background);
`

const QueueHeader = styled.div`
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 1rem;
`

const QueueTitle = styled.h3`
	margin: 0;
	color: var(--vscode-editor-foreground);
`

const QueueStats = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 1rem;
	font-size: 0.9em;
	color: var(--vscode-descriptionForeground);
`

const ErrorStat = styled.span`
	color: var(--vscode-errorForeground);
`

const RetryStat = styled.span`
	color: var(--vscode-statusBarItem-warningForeground);
`

const TimeStat = styled.span`
	color: var(--vscode-charts.blue);
`

const QueueItems = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	max-height: 300px;
	overflow-y: auto;
	padding-right: 0.5rem;

	&::-webkit-scrollbar {
		width: 6px;
	}

	&::-webkit-scrollbar-track {
		background: var(--vscode-scrollbarSlider-background);
		border-radius: 3px;
	}

	&::-webkit-scrollbar-thumb {
		background: var(--vscode-scrollbarSlider-hoverBackground);
		border-radius: 3px;
	}
`

interface QueueItemProps {
	status: string
}

const QueueItemContainer = styled.div<QueueItemProps>`
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	padding: 0.5rem;
	border: 1px solid var(--vscode-editorWidget-border);
	border-radius: 3px;
	background: var(--vscode-editor-background);
	border-left: 3px solid;
	border-left-color: ${(props) => {
		switch (props.status) {
			case "pending":
				return "var(--vscode-badge-background)"
			case "processing":
				return "var(--vscode-statusBarItem-prominentBackground)"
			case "completed":
				return "var(--vscode-testing-iconPassed)"
			case "failed":
				return "var(--vscode-errorForeground)"
			case "retrying":
				return "var(--vscode-statusBarItem-warningBackground)"
			case "cancelled":
				return "var(--vscode-descriptionForeground)"
			default:
				return "var(--vscode-badge-background)"
		}
	}};
	opacity: ${(props) => {
		switch (props.status) {
			case "completed":
				return 0.7
			case "cancelled":
				return 0.5
			default:
				return 1
		}
	}};
`

const ItemContent = styled.div`
	flex: 1;
	min-width: 0;
`

const ItemHeader = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
	margin-bottom: 0.25rem;
`

const ItemStatus = styled.span`
	font-size: 0.8em;
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
	background: var(--vscode-badge-background);
	color: var(--vscode-badge-foreground);
`

const ItemPriority = styled.span`
	font-size: 0.8em;
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
	background: var(--vscode-statusBarItem-warningBackground);
	color: var(--vscode-statusBarItem-warningForeground);
`

const RetryCount = styled.span`
	font-size: 0.8em;
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
	background: var(--vscode-statusBarItem-warningBackground);
	color: var(--vscode-statusBarItem-warningForeground);
	opacity: 0.8;
`

const RelationshipTag = styled.span`
	font-size: 0.8em;
	padding: 0.1rem 0.3rem;
	border-radius: 2px;
	background: var(--vscode-charts.blue);
	color: var(--vscode-charts.foreground);
	opacity: 0.8;
`

const ItemMessage = styled.div`
	font-size: 0.9em;
	color: var(--vscode-editor-foreground);
	word-break: break-word;
`

const ItemError = styled.div`
	margin-top: 0.25rem;
	font-size: 0.85em;
	color: var(--vscode-errorForeground);
`

const ItemTime = styled.div`
	margin-top: 0.25rem;
	font-size: 0.85em;
	color: var(--vscode-charts.blue);
	opacity: 0.8;
`

const CancelButton = styled.button`
	padding: 0.2rem 0.4rem;
	margin-left: 0.5rem;
	background: none;
	border: none;
	color: var(--vscode-errorForeground);
	cursor: pointer;
	opacity: 0.7;

	&:hover {
		opacity: 1;
	}
`
