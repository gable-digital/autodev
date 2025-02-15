# System Patterns

## Core Architecture

### Extension Identity Pattern
1. Extension Identifiers
   - All identifiers follow format: `gds-autodev.[ComponentName]`
   - Used consistently across:
     - View container IDs
     - Command IDs
     - Settings namespace
     - URI scheme handlers
   - Critical for proper activation and state management

2. Activation Events
   - Required for proper extension initialization:
     ```json
     "activationEvents": [
       "onView:gds-autodev.SidebarProvider",
       "onCommand:[command-id]",
       "onUri"
     ]
     ```
   - Ensures extension is loaded when needed
   - Prevents initialization timing issues

### Extension-Webview Communication Pattern
1. Message Flow
   - Extension → Webview: Uses `postMessageToWebview` with ExtensionMessage type
   - Webview → Extension: Uses `onDidReceiveMessage` with WebviewMessage type
   - All messages must follow defined interfaces in type definitions
   - Messages are managed by MessageQueue for asynchronous processing
   - Special message types (e.g., getLatestState) require explicit handling

2. Message Type System
   - ExtensionMessage: Standard extension-to-webview messages
     - Used for regular updates and commands
     - Follows strict type definitions
   - WebviewMessage: Special state-related messages
     - Used for state hydration and initialization
     - Contains complete state information
     - Critical for webview rendering

3. State Hydration Flow
   ```
   AutoDevProvider
   ↓
   postMessageToWebview converts ExtensionMessage to WebviewMessage
   ↓
   ExtensionStateContext handles both message types
   ↓
   State hydration controls UI rendering
   ```

4. Message Handling Best Practices
   - Handle both ExtensionMessage and WebviewMessage types
   - Use type safety with proper message type checking
   - Implement comprehensive logging for debugging
   - Ensure proper state extraction and setting
   - Set state flags (e.g., didHydrateState) correctly

### Queue Management Pattern
1. Message Queue Architecture
   - Centralized queue management through MessageQueue class
   - Event-driven architecture with state updates
   - Priority-based processing with parent-child relationships
   - Comprehensive error handling and retry mechanisms

2. Queue State Management
   ```typescript
   interface QueueState {
     items: QueueItem[]
     isProcessing: boolean
     stats: {
       totalProcessed: number
       totalFailed: number
       totalRetries: number
       averageProcessingTime: number
     }
   }
   ```

3. Queue Operations
   - Enqueue with optional priority and parent-child relationships
   - Cancel pending items
   - Automatic retry on failure
   - State synchronization on queue changes
   - Performance tracking and statistics

4. Queue Events
   ```typescript
   enum QueueEvent {
     ITEM_QUEUED = "itemQueued",
     PROCESSING_STARTED = "processingStarted",
     PROCESSING_COMPLETED = "processingCompleted",
     PROCESSING_FAILED = "processingFailed",
     RETRY_SCHEDULED = "retryScheduled",
     STATE_CHANGED = "stateChanged"
   }
   ```

2. Message Queue Pattern
   - Queue initialization in provider constructor
   - Event-based queue processing with callbacks
   - State synchronization on queue changes
   - Error handling with callback pattern
   ```typescript
   // Queue initialization
   this.messageQueue = new MessageQueue()
   this.messageQueue.on("processMessage", this.handleQueuedMessage.bind(this))
   this.messageQueue.on(QueueEvent.STATE_CHANGED, this.handleQueueStateChanged.bind(this))
   
   // Queue state handling
   private async handleQueueStateChanged(state: QueueState) {
     await this.postMessageToWebview({
       type: "state",
       state: {
         ...await this.getState(),
         queueState: state
       }
     })
   }
   ```

2. Initialization Pattern
   ```
   Extension Launch
   ↓
   resolveWebviewView
   ↓
   Set up webview (HTML, scripts) with error handling
   ↓
   Set up message listeners with error boundary
   ↓
   Wait for webviewDidLaunch
   ↓
   Initialize state with granular error handling:
     - Post initial state (critical)
     - Set up theme (non-critical)
     - Handle cached models (non-critical)
     - Refresh models and update state (non-critical)
   ↓
   Wait for state processing (750ms)
   ↓
   Send visibility notification if view is visible
   ↓
   Log initialization metrics
   ↓
   Begin normal operation
   ```

### State Management
1. Global State
   - Stored in VSCode's extension context
   - Handles API configurations, settings, history
   - Persists across sessions
   - Includes queue state management

2. Queue State
   - Managed by MessageQueue class
   - Tracks message processing status
   - Maintains queue order and priority
   - Synchronizes with webview state

2. Webview State
   - Managed through message passing
   - Updated via postStateToWebview
   - Synchronized with extension state
   - Validated before visibility notifications

### Provider Pattern
- AutoDevProvider class manages:
  - Webview lifecycle
  - State management
  - Message handling
  - Task management
  - Error handling and recovery

## Key Design Decisions

### 1. Webview Initialization
- **Decision**: Ensure state is valid before any visibility notifications
- **Rationale**: Prevents UI inconsistencies and loading issues
- **Implementation**: 
  ```typescript
  // Clear task state first
  await clearTask()
  // Initialize and validate state
  await postStateToWebview()
  // Notify visibility with error handling
  try {
    await postMessageToWebview({
      type: "action",
      action: "didBecomeVisible"
    })
  } catch (error) {
    // Log and show user-friendly error
    outputChannel.appendLine(error)
    showErrorMessage()
  }
  ```

### 2. Message Type System
- **Decision**: Strict typing for all messages
- **Rationale**: Catch communication errors at compile time
- **Implementation**: 
  - ExtensionMessage for outgoing messages
  - WebviewMessage for incoming messages

### 3. State Synchronization
- **Decision**: Single source of truth in extension
- **Rationale**: Prevents state inconsistencies
- **Implementation**: 
  - State flows extension → webview
  - Validation before state updates
  - Error handling for failed synchronization

## Error Handling

### 1. Initialization Errors
- Granular error handling with separate boundaries:
  - Critical errors (state initialization) - halt and notify
  - Non-critical errors (theme, models) - log and continue
- Comprehensive logging at each initialization step
- Performance metrics tracking
- Increased state processing time (750ms) for reliability
- Clear user feedback for critical failures
- Detailed error logging with stack traces
- State validation before critical operations

### 2. Message Errors
- Type checking at compile time
- Runtime validation of message format
- Error logging for debugging
- Recovery mechanisms for failed messages

### 3. State Synchronization Errors
- Validation before state updates
- Granular error handling for different state components
- Separate error boundaries for critical vs non-critical state
- Extended processing time for reliable state updates
- Detailed logging of state transition failures
- Metrics collection for state update performance
- User notifications for critical state failures
- Recovery mechanisms for non-critical state components

## Testing Patterns

### 1. UI Testing with Playwright
- **Decision**: Use Playwright for automated UI testing
- **Rationale**: Provides reliable browser automation and visual testing
- **Implementation**:
  ```typescript
  test('chat input should be positioned correctly', async ({ page }) => {
    // Launch extension
    await page.goto('http://localhost:3000');
    
    // Wait for chat view
    await page.waitForSelector('.chat-input-container');

    // Get chat input container
    const chatInputContainer = await page.locator('.chat-input-container').first();
    
    // Verify positioning
    const box = await chatInputContainer.boundingBox();
    const containerBottom = box ? box.y + box.height : 0;
    const viewportHeight = page.viewportSize()?.height || 0;
    expect(Math.abs(containerBottom - viewportHeight)).toBeLessThan(100);
    
    // Visual regression testing
    await expect(page).toHaveScreenshot('chat-view.png', {
      mask: [page.locator('.codicon')],
      maxDiffPixelRatio: 0.01
    });
  });
  ```

### 2. File Organization Pattern
- **Decision**: Shared code moved to webview-ui/src/shared
- **Rationale**: Better code organization and import management
- **Implementation**:
  ```
  webview-ui/src/
  ├── shared/           # Shared code between extension and webview
  │   ├── ExtensionMessage.ts
  │   ├── WebviewMessage.ts
  │   ├── QueueTypes.ts
  │   ├── array.ts
  │   ├── BrowserSettings.ts
  │   ├── context-mentions.ts
  │   ├── combineApiRequests.ts
  │   ├── combineCommandSequences.ts
  │   └── getApiMetrics.ts
  ├── components/       # React components
  ├── context/         # React context providers
  └── utils/           # Utility functions
  ```

### 3. Component Testing
- Unit tests for message handlers
- Integration tests for state management
- End-to-end tests for full workflows
- Error scenario testing

### 2. Type Testing
- Compile-time type checking
- Interface compliance verification
- Message format validation
- State validation testing

## React Component Patterns

### 1. Component Integration
- **Decision**: Strict prop typing and callback handling
- **Rationale**: Ensures type safety and proper component communication
- **Implementation**:
  ```typescript
  interface ComponentProps {
    // Clearly defined prop types
    inputValue: string
    // Function props with explicit signatures
    setInputValue: (value: string) => void
    // Optional props marked with ?
    onHeightChange?: (height: number) => void
  }
  ```

### 2. State Management
- **Decision**: Centralized state with controlled components
- **Rationale**: Maintains single source of truth and predictable updates
- **Implementation**:
  ```typescript
  // Parent component manages state
  const [value, setValue] = useState("")
  
  // Pass state and updater to child
  <ChildComponent
    value={value}
    setValue={(newValue: string) => setValue(newValue)}
  />
  ```

### 3. Callback Handling
- **Decision**: useCallback for all handler functions
- **Rationale**: Prevents unnecessary re-renders and maintains referential equality
- **Implementation**:
  ```typescript
  const handleSubmit = useCallback(() => {
    // Handler implementation
  }, [/* dependencies */])
  ```

### 4. Hook Rules Compliance
- **Decision**: All hooks at component top level
- **Rationale**: Ensures React hooks rules are followed
- **Implementation**:
  - Define all hooks before any conditional logic
  - Move conditional logic inside effects or callbacks
  - Use separate components for complex conditional rendering

### 5. Component Composition
- **Decision**: Prefer composition over inheritance
- **Rationale**: More flexible and maintainable component structure
- **Implementation**:
  - Break large components into smaller, focused pieces
  - Use props for configuration
  - Share functionality through custom hooks
  - Maintain clear component interfaces

### 6. Error Boundaries
- **Decision**: Granular error handling at component level
- **Rationale**: Prevents cascading failures and improves debugging
- **Implementation**:
  - Component-specific error states
  - Clear error feedback in UI
  - Fallback UI for failed components
  - Detailed error logging

### 7. Performance Optimization
- **Decision**: Optimize re-renders and state updates
- **Rationale**: Maintains responsive UI and efficient updates
- **Implementation**:
  - useMemo for expensive computations
  - useCallback for event handlers
  - Proper dependency arrays in hooks
  - State batching for multiple updates

### 8. Queue Status Display Pattern
- **Decision**: Real-time queue visualization with comprehensive status tracking
- **Rationale**: Provides clear feedback for queued operations and system state
- **Implementation**:
  ```typescript
  // Queue item display with status indicators
  const QueueItemContainer = styled.div<QueueItemProps>`
    border-left-color: ${props => {
      switch (props.status) {
        case 'pending': return 'var(--vscode-badge-background)'
        case 'processing': return 'var(--vscode-statusBarItem-prominentBackground)'
        case 'completed': return 'var(--vscode-testing-iconPassed)'
        case 'failed': return 'var(--vscode-errorForeground)'
        case 'retrying': return 'var(--vscode-statusBarItem-warningBackground)'
        case 'cancelled': return 'var(--vscode-descriptionForeground)'
      }
    }};
  `

  // Time tracking and formatting
  const getProcessingTime = (item: QueueItem): string | null => {
    if (item.startTime && item.endTime) {
      return formatTime(item.endTime - item.startTime)
    }
    if (item.startTime) {
      return formatTime(Date.now() - item.startTime)
    }
    return null
  }

  // Queue statistics display
  const QueueStats = () => (
    <QueueStats>
      <span>Total: {queueState.items.length}</span>
      <span>Processing: {queueState.isProcessing ? 1 : 0}</span>
      <span>Completed: {queueState.stats.totalProcessed}</span>
      {queueState.stats.totalFailed > 0 && (
        <ErrorStat>Failed: {queueState.stats.totalFailed}</ErrorStat>
      )}
    </QueueStats>
  )
  ```
