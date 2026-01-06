/**
 * Zustand store for managing undo/redo history.
 * This store maintains a stack of presentation states for undo/redo functionality.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Presentation } from '../types/presentation'
import { usePresentationStore } from './presentationStore'
import { useEditorStore } from './editorStore'

/**
 * Maximum number of history entries to keep
 */
const MAX_HISTORY_SIZE = 50

/**
 * History entry containing a snapshot of presentation state
 */
export interface HistorySnapshot {
  id: string
  timestamp: string
  description: string
  presentations: Presentation[]
  currentPresentationId: string | null
}

/**
 * History store state interface
 */
interface HistoryState {
  // History stacks
  past: HistorySnapshot[]
  future: HistorySnapshot[]

  // Flag to prevent recording during undo/redo operations
  isUndoRedoAction: boolean

  // Last recorded state to detect changes
  lastRecordedState: string | null

  // Actions
  recordSnapshot: (description: string) => void
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  clearHistory: () => void

  // Internal actions
  setIsUndoRedoAction: (value: boolean) => void
}

/**
 * Generate a unique ID for history entries
 */
function generateId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create a hash of the current presentation state for comparison
 */
function createStateHash(presentations: Presentation[]): string {
  return JSON.stringify(presentations)
}

/**
 * History store for managing undo/redo functionality
 */
export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      // Initial state
      past: [],
      future: [],
      isUndoRedoAction: false,
      lastRecordedState: null,

      /**
       * Record a snapshot of the current presentation state
       */
      recordSnapshot: (description: string) => {
        const state = get()

        // Don't record if this is part of an undo/redo operation
        if (state.isUndoRedoAction) {
          return
        }

        const presentationState = usePresentationStore.getState()
        const currentStateHash = createStateHash(presentationState.presentations)

        // Don't record if state hasn't changed
        if (state.lastRecordedState === currentStateHash) {
          return
        }

        const snapshot: HistorySnapshot = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          description,
          presentations: JSON.parse(JSON.stringify(presentationState.presentations)),
          currentPresentationId: presentationState.currentPresentationId,
        }

        set(
          (state) => {
            const newPast = [...state.past, snapshot]
            // Limit history size
            if (newPast.length > MAX_HISTORY_SIZE) {
              newPast.shift()
            }
            return {
              past: newPast,
              future: [], // Clear future when new action is recorded
              lastRecordedState: currentStateHash,
            }
          },
          undefined,
          'recordSnapshot'
        )

        // Update editor store with undo/redo availability
        const newState = get()
        useEditorStore.getState().setHistoryState(
          newState.past.length - 1,
          newState.past.length > 0,
          false
        )
      },

      /**
       * Undo the last action
       */
      undo: () => {
        const state = get()
        if (state.past.length === 0) return

        // Get current state to push to future
        const presentationState = usePresentationStore.getState()
        const currentSnapshot: HistorySnapshot = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          description: 'Current state',
          presentations: JSON.parse(JSON.stringify(presentationState.presentations)),
          currentPresentationId: presentationState.currentPresentationId,
        }

        // Get the previous state
        const previousSnapshot = state.past[state.past.length - 1]
        if (!previousSnapshot) return

        // Set flag to prevent recording this state change
        set({ isUndoRedoAction: true }, undefined, 'setUndoRedoFlag')

        // Restore the previous presentation state
        usePresentationStore.setState({
          presentations: JSON.parse(JSON.stringify(previousSnapshot.presentations)),
          currentPresentationId: previousSnapshot.currentPresentationId,
        })

        set(
          (state) => {
            const newPast = state.past.slice(0, -1)
            return {
              past: newPast,
              future: [currentSnapshot, ...state.future],
              isUndoRedoAction: false,
              lastRecordedState: createStateHash(previousSnapshot.presentations),
            }
          },
          undefined,
          'undo'
        )

        // Update editor store
        const newState = get()
        useEditorStore.getState().setHistoryState(
          newState.past.length - 1,
          newState.past.length > 0,
          newState.future.length > 0
        )
      },

      /**
       * Redo the last undone action
       */
      redo: () => {
        const state = get()
        if (state.future.length === 0) return

        // Get current state to push to past
        const presentationState = usePresentationStore.getState()
        const currentSnapshot: HistorySnapshot = {
          id: generateId(),
          timestamp: new Date().toISOString(),
          description: 'Current state',
          presentations: JSON.parse(JSON.stringify(presentationState.presentations)),
          currentPresentationId: presentationState.currentPresentationId,
        }

        // Get the next state
        const nextSnapshot = state.future[0]
        if (!nextSnapshot) return

        // Set flag to prevent recording this state change
        set({ isUndoRedoAction: true }, undefined, 'setUndoRedoFlag')

        // Restore the next presentation state
        usePresentationStore.setState({
          presentations: JSON.parse(JSON.stringify(nextSnapshot.presentations)),
          currentPresentationId: nextSnapshot.currentPresentationId,
        })

        set(
          (state) => {
            const newFuture = state.future.slice(1)
            return {
              past: [...state.past, currentSnapshot],
              future: newFuture,
              isUndoRedoAction: false,
              lastRecordedState: createStateHash(nextSnapshot.presentations),
            }
          },
          undefined,
          'redo'
        )

        // Update editor store
        const newState = get()
        useEditorStore.getState().setHistoryState(
          newState.past.length - 1,
          newState.past.length > 0,
          newState.future.length > 0
        )
      },

      /**
       * Check if undo is available
       */
      canUndo: () => {
        return get().past.length > 0
      },

      /**
       * Check if redo is available
       */
      canRedo: () => {
        return get().future.length > 0
      },

      /**
       * Clear all history
       */
      clearHistory: () => {
        set(
          {
            past: [],
            future: [],
            lastRecordedState: null,
          },
          undefined,
          'clearHistory'
        )
        useEditorStore.getState().setHistoryState(-1, false, false)
      },

      /**
       * Set the undo/redo action flag
       */
      setIsUndoRedoAction: (value: boolean) => {
        set({ isUndoRedoAction: value }, undefined, 'setIsUndoRedoAction')
      },
    }),
    { name: 'HistoryStore' }
  )
)

export default useHistoryStore
