import { WebviewMessage } from "./WebviewMessage"
import { AutoDevMessage } from "./ExtensionMessage"

/**
 * Priority levels for queued instructions
 * Follows the pattern of existing priority systems in the codebase
 */
export enum QueuePriority {
  CRITICAL = "critical", // Must be processed immediately (e.g., cancellation)
  HIGH = "high",        // Important operations (e.g., error recovery)
  NORMAL = "normal",    // Standard operations (default)
  LOW = "low"          // Background operations
}

/**
 * Status tracking for queued instructions
 * Aligns with existing state management patterns
 */
export enum QueueItemStatus {
  PENDING = "pending",       // Initial state
  PROCESSING = "processing", // Currently being handled
  COMPLETED = "completed",   // Successfully processed
  FAILED = "failed",        // Processing failed
  CANCELLED = "cancelled",  // Cancelled by user
  RETRYING = "retrying"    // Failed but will retry
}

/**
 * Represents a queued instruction with metadata
 * Follows the pattern of existing message handling
 */
export interface QueueItem {
  id: string                     // Unique identifier (timestamp-based like existing IDs)
  message: WebviewMessage        // The instruction to process
  response?: AutoDevMessage        // Response message if any
  priority: QueuePriority        // Processing priority
  status: QueueItemStatus        // Current status
  timestamp: number              // Queue entry time
  startTime?: number            // Processing start time
  endTime?: number             // Processing end time
  error?: string               // Error details if failed
  retryCount: number           // Number of retry attempts
  parentId?: string           // ID of parent instruction if any
  childIds: string[]          // IDs of child instructions
}

/**
 * Queue state management
 * Follows existing state management patterns
 */
export interface QueueState {
  items: QueueItem[]            // All queue items
  isProcessing: boolean         // Processing status
  currentItemId?: string        // Currently processing item
  lastProcessedId?: string      // Last completed item
  processingChain: string[]     // Chain of related items being processed
  stats: {
    totalProcessed: number      // Total items processed
    totalFailed: number         // Total failures
    totalRetries: number        // Total retry attempts
    averageProcessingTime: number // Average processing time
  }
}

/**
 * Queue events
 * Follows existing event patterns in the codebase
 */
export enum QueueEvent {
  ITEM_QUEUED = "item_queued",           // New item added
  PROCESSING_STARTED = "processing_started", // Item processing began
  PROCESSING_COMPLETED = "processing_completed", // Item completed
  PROCESSING_FAILED = "processing_failed",    // Item failed
  RETRY_SCHEDULED = "retry_scheduled",      // Retry planned
  RETRY_STARTED = "retry_started",         // Retry began
  ITEM_CANCELLED = "item_cancelled",       // Item cancelled
  QUEUE_EMPTY = "queue_empty",            // Queue is empty
  STATE_CHANGED = "state_changed",        // State updated
  CHAIN_STARTED = "chain_started",        // Related items started
  CHAIN_COMPLETED = "chain_completed"     // Related items done
}

/**
 * Queue configuration
 * Aligns with existing configuration patterns
 */
export interface QueueConfig {
  maxSize?: number              // Maximum queue size
  maxChainSize?: number         // Maximum related items
  processingTimeout?: number    // Processing timeout (ms)
  retryAttempts?: number       // Maximum retries
  retryDelay?: number          // Delay between retries (ms)
  maxConcurrent?: number       // Maximum concurrent items
  statsWindow?: number         // Stats calculation window (ms)
}
