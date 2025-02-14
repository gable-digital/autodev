import { EventEmitter } from "events"
import { WebviewMessage } from "./WebviewMessage"
import { AutoDevMessage } from "./ExtensionMessage"
import { QueueConfig, QueueEvent, QueueItem, QueueItemStatus, QueuePriority, QueueState } from "./QueueTypes"

/**
 * Manages a priority-based queue for processing instructions while maintaining UI responsiveness
 * Part of the AutoDev extension's message processing system
 */
export class MessageQueue extends EventEmitter {
	private state: QueueState
	private config: Required<QueueConfig>
	private processingTimeout?: NodeJS.Timeout

	constructor(config: QueueConfig = {}) {
		super()
		this.state = {
			items: [],
			isProcessing: false,
			processingChain: [],
			stats: {
				totalProcessed: 0,
				totalFailed: 0,
				totalRetries: 0,
				averageProcessingTime: 0,
			},
		}

		// Set default configuration values
		this.config = {
			maxSize: config.maxSize ?? 100,
			maxChainSize: config.maxChainSize ?? 10,
			processingTimeout: config.processingTimeout ?? 30000, // 30 seconds
			retryAttempts: config.retryAttempts ?? 3,
			retryDelay: config.retryDelay ?? 1000, // 1 second
			maxConcurrent: config.maxConcurrent ?? 1,
			statsWindow: config.statsWindow ?? 3600000, // 1 hour
		}
	}

	/**
	 * Add a new instruction to the queue
	 */
	public enqueue(message: WebviewMessage, priority: QueuePriority = QueuePriority.NORMAL, parentId?: string): QueueItem {
		if (this.state.items.length >= this.config.maxSize) {
			throw new Error(`Queue has reached maximum size of ${this.config.maxSize}`)
		}

		const item: QueueItem = {
			id: this.generateId(),
			message,
			priority,
			status: QueueItemStatus.PENDING,
			timestamp: Date.now(),
			retryCount: 0,
			childIds: [],
			parentId,
		}

		// Insert based on priority (maintain priority ordering)
		const insertIndex = this.state.items.findIndex((existing) => existing.priority < priority)

		if (insertIndex === -1) {
			this.state.items.push(item)
		} else {
			this.state.items.splice(insertIndex, 0, item)
		}

		// Update parent's childIds if this is a child instruction
		if (parentId) {
			const parent = this.state.items.find((i) => i.id === parentId)
			if (parent) {
				parent.childIds.push(item.id)
			}
		}

		this.emit(QueueEvent.ITEM_QUEUED, item)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())

		// Start processing if not already processing
		if (!this.state.isProcessing) {
			this.processNext()
		}

		return item
	}

	/**
	 * Cancel a queued instruction and its children
	 */
	public cancel(id: string): boolean {
		const item = this.state.items.find((item) => item.id === id)
		if (!item || item.status !== QueueItemStatus.PENDING) {
			return false
		}

		// Cancel all child instructions first
		item.childIds.forEach((childId) => this.cancel(childId))

		item.status = QueueItemStatus.CANCELLED
		item.endTime = Date.now()

		// Remove from queue if not current
		if (id !== this.state.currentItemId) {
			this.state.items = this.state.items.filter((item) => item.id !== id)
			// Remove from processing chain if present
			this.state.processingChain = this.state.processingChain.filter((chainId) => chainId !== id)
		}

		this.emit(QueueEvent.ITEM_CANCELLED, item)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())
		return true
	}

	/**
	 * Process the next instruction in the queue
	 */
	private async processNext(): Promise<void> {
		if (this.state.isProcessing || this.state.items.length === 0) {
			return
		}

		const item = this.state.items[0]
		if (!item || item.status !== QueueItemStatus.PENDING) {
			return
		}

		// Check if this is part of a chain
		if (item.parentId && !this.state.processingChain.includes(item.parentId)) {
			// Parent hasn't been processed yet, skip for now
			return
		}

		this.state.isProcessing = true
		this.state.currentItemId = item.id
		item.status = QueueItemStatus.PROCESSING
		item.startTime = Date.now()

		// Add to processing chain if part of one
		if (item.parentId) {
			this.state.processingChain.push(item.id)
			if (this.state.processingChain.length === 1) {
				this.emit(QueueEvent.CHAIN_STARTED, item)
			}
		}

		this.emit(QueueEvent.PROCESSING_STARTED, item)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())

		// Set processing timeout
		this.processingTimeout = setTimeout(() => {
			this.handleProcessingError(item, new Error("Processing timeout exceeded"))
		}, this.config.processingTimeout)

		try {
			// Process the message (to be implemented by consumer)
			this.emit("processMessage", item.message, (error?: Error, response?: AutoDevMessage) => {
				if (error) {
					this.handleProcessingError(item, error)
				} else {
					this.handleProcessingSuccess(item, response)
				}
			})
		} catch (error) {
			this.handleProcessingError(item, error as Error)
		}
	}

	/**
	 * Handle successful processing of an instruction
	 */
	private handleProcessingSuccess(item: QueueItem, response?: AutoDevMessage): void {
		if (this.processingTimeout) {
			clearTimeout(this.processingTimeout)
		}

		item.status = QueueItemStatus.COMPLETED
		item.endTime = Date.now()
		item.response = response
		this.state.lastProcessedId = item.id
		this.state.isProcessing = false
		this.state.currentItemId = undefined

		// Update stats
		this.updateStats(item)

		// Remove completed item from queue
		this.state.items = this.state.items.filter((i) => i.id !== item.id)

		// Update processing chain
		if (item.parentId) {
			const chainIndex = this.state.processingChain.indexOf(item.id)
			if (chainIndex !== -1) {
				this.state.processingChain.splice(chainIndex, 1)
				if (this.state.processingChain.length === 0) {
					this.emit(QueueEvent.CHAIN_COMPLETED, item)
				}
			}
		}

		this.emit(QueueEvent.PROCESSING_COMPLETED, item)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())

		if (this.state.items.length === 0) {
			this.emit(QueueEvent.QUEUE_EMPTY)
		} else {
			// Process next item
			this.processNext()
		}
	}

	/**
	 * Handle failed processing of an instruction
	 */
	private handleProcessingError(item: QueueItem, error: Error): void {
		if (this.processingTimeout) {
			clearTimeout(this.processingTimeout)
		}

		item.status = QueueItemStatus.FAILED
		item.endTime = Date.now()
		item.error = error.message
		this.state.isProcessing = false
		this.state.currentItemId = undefined

		// Update stats
		this.updateStats(item)

		this.emit(QueueEvent.PROCESSING_FAILED, item)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())

		// Cancel all child instructions if this is a parent
		if (item.childIds.length > 0) {
			item.childIds.forEach((childId) => this.cancel(childId))
		}

		// Retry if attempts remain
		if (item.retryCount < this.config.retryAttempts) {
			item.retryCount++
			item.status = QueueItemStatus.RETRYING
			this.emit(QueueEvent.RETRY_SCHEDULED, item)

			setTimeout(() => {
				// Reset item state for retry
				item.status = QueueItemStatus.PENDING
				item.startTime = undefined
				item.endTime = undefined
				item.error = undefined
				this.emit(QueueEvent.RETRY_STARTED, item)
				this.processNext()
			}, this.config.retryDelay)
		} else {
			// Remove failed item and process next
			this.state.items = this.state.items.filter((i) => i.id !== item.id)
			// Remove from processing chain if present
			if (item.parentId) {
				this.state.processingChain = this.state.processingChain.filter((chainId) => chainId !== item.id)
				if (this.state.processingChain.length === 0) {
					this.emit(QueueEvent.CHAIN_COMPLETED, item)
				}
			}

			if (this.state.items.length === 0) {
				this.emit(QueueEvent.QUEUE_EMPTY)
			} else {
				this.processNext()
			}
		}
	}

	/**
	 * Update queue statistics
	 */
	private updateStats(item: QueueItem): void {
		const stats = this.state.stats
		stats.totalProcessed++

		if (item.status === QueueItemStatus.FAILED) {
			stats.totalFailed++
		}

		if (item.retryCount > 0) {
			stats.totalRetries += item.retryCount
		}

		if (item.startTime && item.endTime) {
			const processingTime = item.endTime - item.startTime
			stats.averageProcessingTime =
				(stats.averageProcessingTime * (stats.totalProcessed - 1) + processingTime) / stats.totalProcessed
		}
	}

	/**
	 * Get the current state of the queue
	 */
	public getState(): QueueState {
		return { ...this.state }
	}

	/**
	 * Generate a unique ID for queue items
	 */
	private generateId(): string {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
	}

	/**
	 * Clear all items from the queue
	 */
	public clear(): void {
		this.state.items = []
		this.state.isProcessing = false
		this.state.currentItemId = undefined
		this.state.processingChain = []
		if (this.processingTimeout) {
			clearTimeout(this.processingTimeout)
		}
		this.emit(QueueEvent.QUEUE_EMPTY)
		this.emit(QueueEvent.STATE_CHANGED, this.getState())
	}
}
