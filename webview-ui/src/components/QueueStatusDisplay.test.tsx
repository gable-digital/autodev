import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { QueueStatusDisplay } from "./QueueStatusDisplay"
import { ExtensionStateContextProvider } from "../context/ExtensionStateContext"
import { QueueItemStatus, QueuePriority } from "../../../src/shared/QueueTypes"

// Mock the vscode API
const mockPostMessage = jest.fn()
const vscode = {
  postMessage: mockPostMessage
}
;(global as any).acquireVsCodeApi = () => vscode

// Mock state for testing
const mockQueueState = {
  items: [
    {
      id: "1",
      message: { type: "newTask", text: "Test task 1" },
      priority: QueuePriority.NORMAL,
      status: QueueItemStatus.PENDING,
      timestamp: Date.now(),
      retryCount: 0,
      childIds: [],
    },
    {
      id: "2",
      message: { type: "newTask", text: "Test task 2" },
      priority: QueuePriority.HIGH,
      status: QueueItemStatus.PROCESSING,
      timestamp: Date.now() - 5000,
      startTime: Date.now() - 5000,
      retryCount: 0,
      childIds: ["3"],
    },
    {
      id: "3",
      message: { type: "newTask", text: "Test task 3" },
      priority: QueuePriority.NORMAL,
      status: QueueItemStatus.PENDING,
      timestamp: Date.now(),
      retryCount: 0,
      parentId: "2",
      childIds: [],
    },
    {
      id: "4",
      message: { type: "newTask", text: "Test task 4" },
      priority: QueuePriority.NORMAL,
      status: QueueItemStatus.FAILED,
      timestamp: Date.now() - 10000,
      startTime: Date.now() - 10000,
      endTime: Date.now() - 9000,
      error: "Test error",
      retryCount: 2,
      childIds: [],
    }
  ],
  isProcessing: true,
  currentItemId: "2",
  processingChain: ["2", "3"],
  stats: {
    totalProcessed: 10,
    totalFailed: 2,
    totalRetries: 3,
    averageProcessingTime: 1500
  }
}

const renderWithContext = () => {
  return render(
    <ExtensionStateContextProvider>
      <QueueStatusDisplay />
    </ExtensionStateContextProvider>
  )
}

describe("QueueStatusDisplay", () => {
  beforeEach(() => {
    mockPostMessage.mockClear()
  })

  it("should not render when queue is empty", () => {
    renderWithContext()
    expect(screen.queryByText("Instruction Queue")).toBeNull()
  })

  it("should render queue stats correctly", () => {
    renderWithContext()
    // Set mock state
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("Total: 4")).toBeInTheDocument()
    expect(screen.getByText("Processing: 1")).toBeInTheDocument()
    expect(screen.getByText("Completed: 10")).toBeInTheDocument()
    expect(screen.getByText("Failed: 2")).toBeInTheDocument()
    expect(screen.getByText("Retries: 3")).toBeInTheDocument()
    expect(screen.getByText("Avg Time: 1.5s")).toBeInTheDocument()
  })

  it("should render queue items with correct status and priority", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("PENDING")).toBeInTheDocument()
    expect(screen.getByText("PROCESSING")).toBeInTheDocument()
    expect(screen.getByText("FAILED")).toBeInTheDocument()
    expect(screen.getByText("HIGH")).toBeInTheDocument()
  })

  it("should render retry count when present", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("Retry 2")).toBeInTheDocument()
  })

  it("should render parent-child relationships", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("Has 1 sub-tasks")).toBeInTheDocument()
    expect(screen.getByText("Sub-task")).toBeInTheDocument()
  })

  it("should render processing time for items", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("Time: 1.0s")).toBeInTheDocument() // Failed item processing time
  })

  it("should handle item cancellation", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    const cancelButtons = screen.getAllByTitle("Cancel this instruction")
    fireEvent.click(cancelButtons[0])

    expect(mockPostMessage).toHaveBeenCalledWith({
      type: "queueOperation",
      queueOperation: "cancelItem",
      text: "1" // ID of the first pending item
    })
  })

  it("should render error messages", () => {
    renderWithContext()
    vscode.postMessage({ type: "state", state: { queueState: mockQueueState } })

    expect(screen.getByText("Test error")).toBeInTheDocument()
  })
})
