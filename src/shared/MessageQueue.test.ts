import "should"
import { MessageQueue } from "./MessageQueue"
import { QueuePriority, QueueItemStatus, QueueEvent } from "./QueueTypes"
import { WebviewMessage } from "./WebviewMessage"
import { AutoDevMessage } from "./ExtensionMessage"

describe("MessageQueue", () => {
  let queue: MessageQueue
  const mockMessage: WebviewMessage = {
    type: "newTask",
    text: "test instruction"
  }

  beforeEach(() => {
    queue = new MessageQueue()
  })

  describe("initialization", () => {
    it("should initialize with default config", () => {
      const state = queue.getState()
      state.items.should.have.length(0)
      state.isProcessing.should.be.false()
      state.processingChain.should.have.length(0)
      state.stats.should.be.Object()
    })

    it("should initialize with custom config", () => {
      queue = new MessageQueue({
        maxSize: 5,
        maxChainSize: 3,
        processingTimeout: 5000,
        retryAttempts: 2,
        retryDelay: 500,
        maxConcurrent: 2,
        statsWindow: 1800000
      })
      const state = queue.getState()
      state.items.should.have.length(0)
    })
  })

  describe("enqueue", () => {
    it("should add item with default priority", () => {
      const item = queue.enqueue(mockMessage)
      const state = queue.getState()
      
      state.items.should.have.length(1)
      item.priority.should.equal(QueuePriority.NORMAL)
      item.status.should.equal(QueueItemStatus.PENDING)
      item.retryCount.should.equal(0)
      item.childIds.should.have.length(0)
    })

    it("should maintain priority order", () => {
      const lowPriority = queue.enqueue(mockMessage, QueuePriority.LOW)
      const criticalPriority = queue.enqueue(mockMessage, QueuePriority.CRITICAL)
      const highPriority = queue.enqueue(mockMessage, QueuePriority.HIGH)
      const normalPriority = queue.enqueue(mockMessage, QueuePriority.NORMAL)
      
      const state = queue.getState()
      state.items[0].id.should.equal(criticalPriority.id)
      state.items[1].id.should.equal(highPriority.id)
      state.items[2].id.should.equal(normalPriority.id)
      state.items[3].id.should.equal(lowPriority.id)
    })

    it("should handle parent-child relationships", () => {
      const parent = queue.enqueue(mockMessage)
      const child = queue.enqueue(mockMessage, QueuePriority.NORMAL, parent.id)
      
      const state = queue.getState()
      state.items.should.have.length(2)
      should(child.parentId).equal(parent.id)
      parent.childIds.should.containEql(child.id)
    })

    it("should throw error when queue is full", () => {
      queue = new MessageQueue({ maxSize: 1 })
      queue.enqueue(mockMessage)
      
      try {
        queue.enqueue(mockMessage)
        throw new Error("Should have thrown")
      } catch (error: any) {
        error.message.should.equal("Queue has reached maximum size")
      }
    })

    it("should emit events when item is queued", () => {
      let itemQueuedCount = 0
      let stateChangedCount = 0
      
      queue.on(QueueEvent.ITEM_QUEUED, () => itemQueuedCount++)
      queue.on(QueueEvent.STATE_CHANGED, () => stateChangedCount++)
      
      queue.enqueue(mockMessage)
      
      itemQueuedCount.should.equal(1)
      stateChangedCount.should.equal(1)
    })
  })

  describe("cancel", () => {
    it("should cancel pending item", () => {
      const item = queue.enqueue(mockMessage)
      const result = queue.cancel(item.id)
      
      result.should.be.true()
      queue.getState().items.should.have.length(0)
    })

    it("should cancel child items", () => {
      const parent = queue.enqueue(mockMessage)
      const child = queue.enqueue(mockMessage, QueuePriority.NORMAL, parent.id)
      
      queue.cancel(parent.id)
      
      const state = queue.getState()
      state.items.should.have.length(0)
    })

    it("should not cancel non-existent item", () => {
      const result = queue.cancel("non-existent-id")
      result.should.be.false()
    })

    it("should emit events when item is cancelled", () => {
      let itemCancelledCount = 0
      let stateChangedCount = 0
      
      queue.on(QueueEvent.ITEM_CANCELLED, () => itemCancelledCount++)
      queue.on(QueueEvent.STATE_CHANGED, () => stateChangedCount++)
      
      const item = queue.enqueue(mockMessage)
      queue.cancel(item.id)
      
      itemCancelledCount.should.equal(1)
      stateChangedCount.should.equal(1)
    })
  })

  describe("processing", () => {
    it("should process message and emit events", (done) => {
      let processingStartedCount = 0
      let processingCompletedCount = 0
      let stateChangedCount = 0
      
      queue.on(QueueEvent.PROCESSING_STARTED, () => processingStartedCount++)
      queue.on(QueueEvent.PROCESSING_COMPLETED, () => processingCompletedCount++)
      queue.on(QueueEvent.STATE_CHANGED, () => stateChangedCount++)
      
      const mockResponse: AutoDevMessage = {
        type: "say",
        ts: Date.now(),
        say: "text",
        text: "test response"
      }
      
      queue.on("processMessage", (message, callback) => callback(undefined, mockResponse))
      
      queue.enqueue(mockMessage)
      
      setTimeout(() => {
        processingStartedCount.should.equal(1)
        processingCompletedCount.should.equal(1)
        stateChangedCount.should.be.greaterThan(0)
        queue.getState().items.should.have.length(0)
        done()
      }, 100)
    })

    it("should handle processing errors and retry", (done) => {
      let processingFailedCount = 0
      let retryScheduledCount = 0
      let retryStartedCount = 0
      
      queue.on(QueueEvent.PROCESSING_FAILED, () => processingFailedCount++)
      queue.on(QueueEvent.RETRY_SCHEDULED, () => retryScheduledCount++)
      queue.on(QueueEvent.RETRY_STARTED, () => retryStartedCount++)
      
      let attempts = 0
      queue.on("processMessage", (message, callback) => {
        attempts++
        if (attempts === 1) {
          callback(new Error("Test error"))
        } else {
          callback()
        }
      })
      
      queue.enqueue(mockMessage)
      
      setTimeout(() => {
        processingFailedCount.should.equal(1)
        retryScheduledCount.should.equal(1)
        retryStartedCount.should.equal(1)
        queue.getState().items.should.have.length(0)
        done()
      }, 1500)
    })

    it("should handle processing timeout", (done) => {
      queue = new MessageQueue({ processingTimeout: 100 })
      let processingFailedCount = 0
      
      queue.on(QueueEvent.PROCESSING_FAILED, () => processingFailedCount++)
      queue.on("processMessage", () => {
        // Don't call callback to simulate timeout
      })
      
      queue.enqueue(mockMessage)
      
      setTimeout(() => {
        processingFailedCount.should.equal(1)
        const state = queue.getState()
        const item = state.items[0]
        should(item.error).equal("Processing timeout exceeded")
        done()
      }, 200)
    })

    it("should process items in chain order", (done) => {
      let chainStartedCount = 0
      let chainCompletedCount = 0
      
      queue.on(QueueEvent.CHAIN_STARTED, () => chainStartedCount++)
      queue.on(QueueEvent.CHAIN_COMPLETED, () => chainCompletedCount++)
      
      const parent = queue.enqueue(mockMessage)
      const child = queue.enqueue(mockMessage, QueuePriority.NORMAL, parent.id)
      
      const processedIds: string[] = []
      queue.on("processMessage", (message, callback) => {
        const item = queue.getState().items[0]
        if (item) {
          processedIds.push(item.id)
        }
        callback()
      })
      
      setTimeout(() => {
        chainStartedCount.should.equal(1)
        chainCompletedCount.should.equal(1)
        processedIds[0].should.equal(parent.id)
        processedIds[1].should.equal(child.id)
        done()
      }, 200)
    })
  })

  describe("stats", () => {
    it("should track processing statistics", (done) => {
      queue.on("processMessage", (message, callback) => callback())
      
      queue.enqueue(mockMessage)
      queue.enqueue(mockMessage)
      
      setTimeout(() => {
        const stats = queue.getState().stats
        stats.totalProcessed.should.equal(2)
        stats.totalFailed.should.equal(0)
        stats.totalRetries.should.equal(0)
        stats.averageProcessingTime.should.be.above(0)
        done()
      }, 200)
    })

    it("should track failed processing statistics", (done) => {
      queue.on("processMessage", (message, callback) => callback(new Error("Test error")))
      
      queue.enqueue(mockMessage)
      
      setTimeout(() => {
        const stats = queue.getState().stats
        stats.totalFailed.should.equal(1)
        stats.totalRetries.should.be.above(0)
        done()
      }, 200)
    })
  })

  describe("clear", () => {
    it("should clear all items and reset state", () => {
      queue.enqueue(mockMessage)
      queue.enqueue(mockMessage)
      
      let queueEmptyCount = 0
      let stateChangedCount = 0
      
      queue.on(QueueEvent.QUEUE_EMPTY, () => queueEmptyCount++)
      queue.on(QueueEvent.STATE_CHANGED, () => stateChangedCount++)
      
      queue.clear()
      
      const state = queue.getState()
      state.items.should.have.length(0)
      state.isProcessing.should.be.false()
      should(state.currentItemId).be.undefined()
      state.processingChain.should.have.length(0)
      queueEmptyCount.should.equal(1)
      stateChangedCount.should.equal(1)
    })
  })
})
