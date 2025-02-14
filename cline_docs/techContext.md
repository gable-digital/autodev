# Technical Context

## Core Technologies

- TypeScript/JavaScript
- VSCode Extension API
- React (for webview UI)
- Webview API
- Node.js

## Development Setup

The project is a VSCode extension that uses:
- TypeScript for the extension logic
- React for the webview UI
- VSCode's Webview API for communication between extension and UI
- Node.js for running the extension

## Technical Constraints

1. Webview Communication
   - Communication between extension and webview must use the postMessage API
   - Messages must follow defined ExtensionMessage and WebviewMessage interfaces
   - All message types must be properly typed in TypeScript
   - Error handling must be implemented for failed communications

2. Initialization Sequence
   - Webview must be fully initialized before receiving state updates
   - State must be validated before sending visibility notifications
   - State updates must follow the correct message type format
   - Visibility events handle differently between WebviewView (sidebar) and WebviewPanel
   - Error handling must be implemented for initialization failures

3. Type Safety
   - All message types must conform to the ExtensionMessage interface
   - Custom message types must be defined in the appropriate type definition files
   - Runtime type validation should complement compile-time checks

## Recent Technical Changes

### Message Queue Implementation (2024-02-14)
- Added message queuing system for handling instructions during processing
- Components:
  1. MessageQueue class for core queue functionality
  2. QueueTypes for type definitions and events
  3. Queue integration in AutoDevProvider
  4. Queue state management and synchronization
- Features:
  - Event-based queue processing
  - State synchronization with UI
  - Error handling with callbacks
  - Queue status tracking
- Implementation:
  - Located in `src/shared/MessageQueue.ts`
  - Types defined in `src/shared/QueueTypes.ts`
  - Integration in `src/core/webview/AutoDevProvider.ts`
  - UI components in `webview-ui/src/components/QueueStatusDisplay.tsx`

### Webview Initialization Improvements (2024-02-11)
- Issue: Main panel was spinning and not showing content on initial load
- Root Cause: Incorrect initialization sequence and message type mismatch
- Solution: 
  1. Moved clearTask() from resolveWebviewView to webviewDidLaunch handler
  2. Fixed message type to use proper ExtensionMessage format
  3. Ensured proper initialization sequence for both panel and sidebar views
  4. Added error handling for initialization failures
  5. Improved state validation before visibility notifications
  6. Added detailed error logging for debugging

### Error Handling Enhancement (2024-02-11)
- Added comprehensive error handling for initialization sequence
- Implemented error logging through outputChannel
- Added user-friendly error notifications
- Improved state validation before updates
- Added error recovery mechanisms for failed state synchronization

## Authentication System

The extension currently uses Firebase Authentication:
- Implementation: Located in `src/services/auth/FirebaseAuthManager.ts`
- Configuration: Uses Firebase config from `autodev-bot` project
- Purpose: User authentication and session management
- Flow:
  1. User initiates login via UI
  2. Redirected to app.autodev.bot/auth
  3. Custom token returned after authentication
  4. Token used for Firebase sign-in
  5. Auth state changes trigger UI updates
- Storage:
  - Auth token stored securely in VSCode secrets
  - Basic user info (display name, email, photo) stored in global state
- Current Status: Non-critical for core functionality, primarily used for user session management

## Build and Package Management

1. Version Management Tools
   - Changesets for version bumping
     - Integrated with npm scripts
     - Used for automated version updates
     - Manages version numbers in package.json
   - Changie for changelog management
     - Configured in .changie.yaml
     - Semantic versioning rules:
       - Added/Deprecated -> minor version bump
       - Changed/Removed -> major version bump
       - Fixed/Security -> patch version bump

2. Package Creation
   - VSCode Extension Packaging (.vsix)
     - `package:vsix` script for basic packaging
     - `package:vsix:bump` script for version bump + package
     - Outputs: gds-autodev-[version].vsix
   - Build Process:
     1. Build webview UI
     2. Check TypeScript types
     3. Run linting
     4. Build extension (production mode)
     5. Create .vsix package

## Technical Debt

1. State Management
   - Consider implementing state validation middleware
   - Add automated testing for state transitions
   - Implement retry mechanisms for failed state updates
   - Queue-related improvements needed:
     - Add queue persistence across sessions
     - Implement queue priority system
     - Add queue operation retry mechanisms
     - Improve queue state recovery

2. Error Handling
   - Add more granular error types
   - Implement error telemetry
   - Create error recovery strategies

3. Testing
   - Add more unit tests for error scenarios
   - Implement integration tests for state synchronization
   - Add end-to-end tests for initialization sequence
   - Queue-specific test improvements:
     - Add queue operation unit tests
     - Test queue state synchronization
     - Test queue error scenarios
     - Add queue performance tests
