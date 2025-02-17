# Prompt Queue Implementation Plan

## Overview

The prompt queue feature will allow users to continue typing messages while a task is being processed, queuing them up to be sent once the current processing is complete. This improves the user experience by removing the current limitation where the chat text area becomes disabled during processing.

## Current System Analysis

### Text Area State Management
- Currently controlled by `textAreaDisabled` state in ChatView.tsx
- Becomes disabled when:
  - A task is processing (during API calls)
  - Tool approval is pending
  - Command execution is in progress
  
### Message Flow
1. User enters text in ChatTextArea.tsx
2. Message flows through ChatView.tsx to AutoDevProvider.ts
3. AutoDevProvider.ts passes message to AutoDev.ts
4. AutoDev.ts processes message through recursive API calls

## Required Changes

After analyzing the existing codebase, we can implement this feature with minimal changes by leveraging the existing message processing system. Here's the optimized approach:

### 1. File Modifications

#### ChatView.tsx
```typescript
// Remove textAreaDisabled dependency for input
// Keep submit button disabled during processing
const [submitDisabled, setSubmitDisabled] = useState(false);

// Modify useEffect for message state handling
useEffect(() => {
  if (lastMessage) {
    switch (lastMessage.type) {
      case "ask":
        const isPartial = lastMessage.partial === true;
        setSubmitDisabled(isPartial || enableButtons);
        // Remove setTextAreaDisabled calls
        break;
      case "say":
        if (secondLastMessage?.ask === "command_output") {
          if (lastMessage.say === "api_req_started") {
            setInputValue("");
            setSubmitDisabled(true);
            setSelectedImages([]);
            setAutoDevAsk(undefined);
            setEnableButtons(false);
          }
        }
        break;
    }
  }
}, [lastMessage, secondLastMessage]);

// Modify handleSendMessage to use queue
const handleSendMessage = useCallback((text: string, images: string[]) => {
  if (messages.length === 0) {
    vscode.postMessage({ type: "newTask", text, images });
  } else if (autodevAsk) {
    // Existing ask response logic...
  } else {
    // Check if we should queue the message
    const lastMessage = messages.at(-1);
    const isProcessing = lastMessage?.partial === true || 
                        (lastMessage?.say === "api_req_started" && 
                         !JSON.parse(lastMessage.text || "{}").cost);
    
    if (isProcessing) {
      vscode.postMessage({ 
        type: "queueInput",
        text,
        images 
      });
    } else {
      vscode.postMessage({ type: "sendMessage", text, images });
    }
  }
  
  setInputValue("");
  setSelectedImages([]);
}, [messages, autodevAsk]);
```

#### AutoDev.ts
```typescript
// Add queue management to existing class
private pendingInputs: {text: string, images: string[]}[] = [];

// Add method to queue inputs
public queueInput(text: string, images: string[] = []): void {
  this.pendingInputs.push({text, images});
}

// Modify recursivelyMakeAutoDevRequests to check queue
private async recursivelyMakeAutoDevRequests(userContent: UserContent, includeFileDetails: boolean = false): Promise<boolean> {
  // Existing processing logic...
  
  // After processing completes, check for pending inputs
  if (this.pendingInputs.length > 0) {
    const nextInput = this.pendingInputs.shift();
    if (nextInput) {
      const nextUserContent = [
        ...(nextInput.text ? [{
          type: "text",
          text: nextInput.text
        }] : []),
        ...formatResponse.imageBlocks(nextInput.images)
      ];
      return this.recursivelyMakeAutoDevRequests(nextUserContent, false);
    }
  }
  
  return didEndLoop;
}

// Add queue cleanup on task cancellation
async abortTask() {
  this.pendingInputs = []; // Clear queue
  this.abort = true;
  // Existing cleanup...
}
```

#### AutoDevProvider.ts
```typescript
// Add handler for queued inputs
private setWebviewMessageListener(webview: vscode.Webview) {
  webview.onDidReceiveMessage(async (message: WebviewMessage) => {
    switch (message.type) {
      // Existing cases...
      case "queueInput":
        this.autodev?.queueInput(message.text, message.images);
        break;
    }
  });
}
```

#### types/WebviewMessage.ts
```typescript
export interface WebviewMessage {
  // Existing types...
  type: "newTask" | "sendMessage" | "queueInput" | /* other types */;
  text?: string;
  images?: string[];
}
```

This approach:
1. Removes text area disabled state while maintaining submit button control
2. Leverages existing message processing infrastructure
3. Maintains compatibility with all existing features
4. Handles queue cleanup on task cancellation
5. Preserves existing error handling and recovery mechanisms
6. Requires minimal changes to the UI layer

## Communication Flow

The optimized message flow leverages existing patterns:

```
┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│ ChatTextArea │     │   ChatView   │     │  AutoDev    │
└──────┬───────┘     └──────┬───────┘     └─────┬───────┘
       │                     │                    │
       │   User Input        │                    │
       │──────────►          │                    │
       │                     │                    │
       │              Check last message          │
       │              for processing state        │
       │                     │                    │
       │                     │                    │
       │             If Processing:              │
       │             Queue input                 │
       │                     │                    │
       │                     │    ─────────►      │
       │                     │                    │
       │             If Not Processing:          │
       │             Send normally              │
       │                     │                    │
       │                     │    ─────────►      │
       │                     │                    │
       │                     │   After each       │
       │                     │   completion:      │
       │                     │   Process queue    │
       │                     │                    │
       │                     │                    │
```

Key differences from current flow:
1. Text area remains enabled during processing
2. Submit button reflects processing state
3. Messages are queued internally rather than blocked
4. Queue is processed automatically after each completion
5. Queue is cleared on task cancellation

## Edge Cases

The implementation handles edge cases through existing mechanisms with some enhancements:

1. **Queue Management**
   - Queue stored in AutoDev instance
   - Cleared on task cancellation/completion
   - No persistence needed between sessions
   - Natural memory limit on queue size

2. **Task Cancellation**
   - Queue cleared in abortTask()
   - All pending inputs discarded
   - UI state reset properly

3. **Error Handling**
   - API errors handled by existing error flow
   - Queue preserved during retries
   - Cleared on unrecoverable errors

4. **Mode Switching**
   - Queue cleared on mode switch
   - Prevents cross-mode message leakage
   - UI state reset properly

5. **Tool Interactions**
   - Submit disabled during tool approval
   - Queue processed after tool completion
   - Tool state properly maintained

6. **Browser Sessions**
   - Submit disabled during browser actions
   - Queue processed after browser closes
   - Browser state properly maintained

## UI Considerations

Focused UI changes to maintain usability:

1. **Text Area State**
   - Always enabled for input
   - Retains current styling
   - Preserves keyboard shortcuts
   - Maintains auto-resize behavior

2. **Submit Button**
   - Disabled during processing
   - Visual feedback matches current state
   - Clear enabled/disabled states
   - Maintains current styling

3. **Processing Indicators**
   - Use existing loading states
   - Maintain current animations
   - Clear visual feedback
   - No additional UI elements needed

4. **Queue Feedback**
   - Silent queuing for clean UI
   - No explicit queue indicator
   - Maintain focus on current task
   - Natural interaction flow

## Implementation Steps

1. **Phase 1: Core Changes**
   - Remove textAreaDisabled dependency
   - Add submitDisabled state
   - Implement input queue in AutoDev
   - Add queue cleanup on abort

2. **Phase 2: Message Flow**
   - Update message handling in ChatView
   - Implement queue processing
   - Add queue message type
   - Update provider message handler

3. **Phase 3: Edge Cases**
   - Implement queue cleanup
   - Handle tool interactions
   - Manage browser sessions
   - Add error handling

4. **Phase 4: Testing**
   - Test basic queue operation
   - Verify tool interactions
   - Test error scenarios
   - Validate cleanup

## Testing Scenarios

Comprehensive test coverage needed:

1. **Basic Queue Operation**
   - Submit during processing
   - Multiple queued messages
   - Order preservation
   - Queue cleanup

2. **Tool Interaction**
   - Queue during tool approval
   - Tool completion processing
   - Tool cancellation
   - State preservation

3. **Error Handling**
   - API errors
   - Network failures
   - Task cancellation
   - State recovery

4. **Browser Integration**
   - Queue during browser session
   - Browser action completion
   - Session cleanup
   - State management

5. **Mode Switching**
   - Queue cleanup
   - State preservation
   - UI updates
   - Message handling

## Performance Considerations

Optimized for efficiency:

1. **Memory Management**
   - Queue stored in memory only
   - Automatic cleanup
   - No persistence overhead
   - Efficient data structures

2. **UI Performance**
   - Minimal state updates
   - Efficient re-rendering
   - Optimized event handling
   - Clean state management

3. **Processing Overhead**
   - Lightweight queue checks
   - Efficient message handling
   - Minimal additional logic
   - Optimized cleanup

4. **Resource Usage**
   - No additional storage
   - Minimal memory impact
   - Efficient CPU usage
   - Clean garbage collection

## Security Considerations

Maintaining existing security model:

1. **Input Validation**
   - Validate all queued messages
   - Sanitize user input
   - Maintain type safety
   - Preserve security checks

2. **State Management**
   - Secure queue storage
   - Clean state transitions
   - Safe cleanup procedures
   - Protected message handling

3. **Error Handling**
   - Secure error recovery
   - Safe state cleanup
   - Protected error messages
   - Controlled failure modes

4. **Resource Protection**
   - Memory safety
   - Queue size limits
   - Safe cleanup
   - Resource management

## Future Enhancements

Foundation for future improvements:

1. **Queue Management**
   - Priority queuing
   - Queue size limits
   - Queue persistence
   - Queue visualization

2. **UI Enhancements**
   - Queue status indicator
   - Message preview
   - Queue management UI
   - Progress feedback

3. **Performance Optimization**
   - Batch processing
   - Improved memory management
   - Better error recovery
   - Enhanced cleanup

4. **Advanced Features**
   - Message priorities
   - Queue filtering
   - Enhanced previews
   - Queue analytics

The optimized implementation provides a solid foundation while maintaining compatibility with existing features and minimizing changes to the codebase. This approach reduces risk and maintenance overhead while enabling future enhancements.
