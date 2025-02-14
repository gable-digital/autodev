# Instruction Queue

The instruction queue system allows users to enter follow-up instructions while the extension is processing API calls, editing files, or thinking. This feature improves user experience by preventing UI blocking and enabling better task management.

## Features

- Queue multiple instructions with priority levels
- Parent-child relationships for related tasks
- Real-time status updates and statistics
- Error handling and automatic retries
- Visual queue status display

## Components

### MessageQueue

Core queue management class that handles:
- Instruction prioritization
- Processing and error handling
- State management
- Event emission

Location: `src/shared/MessageQueue.ts`

### QueueStatusDisplay

React component that provides visual feedback for:
- Queue statistics (total, processing, completed, failed)
- Individual item status and priority
- Processing time tracking
- Parent-child relationships
- Error messages and retry counts

Location: `webview-ui/src/components/QueueStatusDisplay.tsx`

## Queue States

Instructions can be in the following states:
- `PENDING`: Awaiting processing
- `PROCESSING`: Currently being handled
- `COMPLETED`: Successfully processed
- `FAILED`: Processing failed
- `CANCELLED`: Cancelled by user
- `RETRYING`: Failed but will retry

## Priority Levels

Instructions can be assigned different priority levels:
- `CRITICAL`: Must be processed immediately
- `HIGH`: Important operations
- `NORMAL`: Standard operations (default)
- `LOW`: Background operations

## Configuration

The queue system can be configured with:
- Maximum queue size
- Maximum chain size for related items
- Processing timeout
- Retry attempts and delay
- Maximum concurrent items
- Statistics calculation window

## Error Handling

The system includes comprehensive error handling:
1. Processing timeouts
2. Automatic retries with configurable attempts
3. Error state display in UI
4. Graceful failure handling
5. User feedback through UI

## Usage Example

```typescript
// Enqueue a new instruction
const item = queue.enqueue({
  type: "newTask",
  text: "instruction text"
}, QueuePriority.NORMAL)

// Create a related sub-task
const childItem = queue.enqueue({
  type: "newTask",
  text: "sub-task text"
}, QueuePriority.NORMAL, item.id)

// Cancel an instruction
queue.cancel(item.id)
```

## Event System

The queue emits various events:
- `ITEM_QUEUED`: New item added
- `PROCESSING_STARTED`: Item processing began
- `PROCESSING_COMPLETED`: Item completed
- `PROCESSING_FAILED`: Item failed
- `RETRY_SCHEDULED`: Retry planned
- `RETRY_STARTED`: Retry began
- `ITEM_CANCELLED`: Item cancelled
- `QUEUE_EMPTY`: Queue is empty
- `STATE_CHANGED`: State updated
- `CHAIN_STARTED`: Related items started
- `CHAIN_COMPLETED`: Related items done

## Testing

The queue system includes comprehensive tests:
- Unit tests for queue operations
- Integration tests for state management
- UI component tests
- Event handling tests
- Error handling tests

Test files:
- `src/shared/MessageQueue.test.ts`
- `webview-ui/src/components/QueueStatusDisplay.test.tsx`
