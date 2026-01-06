/**
 * Zustand store for managing editor state.
 * This store handles UI state, selection, tools, viewport, and user interactions.
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  EditorState,
  EditorTool,
  ShapeToolType,
  InteractionMode,
  ResizeHandle,
  ViewportState,
} from '../types/editor'
import { DEFAULT_EDITOR_STATE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../types/editor'

/**
 * Editor store state and actions interface
 */
interface EditorStoreState extends EditorState {
  // Context actions
  setCurrentPresentation: (id: string | null) => void
  setCurrentSlide: (id: string | null) => void

  // Selection actions
  selectElement: (id: string) => void
  selectElements: (ids: string[]) => void
  addToSelection: (id: string) => void
  toggleSelection: (id: string) => void
  removeFromSelection: (id: string) => void
  clearSelection: () => void
  setHoveredElement: (id: string | null) => void

  // Tool actions
  setActiveTool: (tool: EditorTool) => void
  setActiveShapeType: (shapeType: ShapeToolType) => void

  // Interaction actions
  setInteractionMode: (mode: InteractionMode) => void
  setActiveResizeHandle: (handle: ResizeHandle | null) => void
  startSelectionBox: (x: number, y: number) => void
  updateSelectionBox: (x: number, y: number) => void
  clearSelectionBox: () => void

  // Viewport actions
  setViewport: (viewport: Partial<ViewportState>) => void
  zoomIn: () => void
  zoomOut: () => void
  zoomTo: (level: number) => void
  resetZoom: () => void
  pan: (deltaX: number, deltaY: number) => void
  resetPan: () => void

  // Clipboard actions
  copyElements: (elementIds: string[], slideId: string) => void
  clearClipboard: () => void

  // History actions (placeholders for undo/redo integration)
  setHistoryState: (index: number, canUndo: boolean, canRedo: boolean) => void

  // UI actions
  toggleSidebar: () => void
  togglePropertiesPanel: () => void
  toggleFullscreen: () => void
  toggleGrid: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void

  // Reset
  resetEditorState: () => void
}

/**
 * Editor store for managing all editor UI state
 */
export const useEditorStore = create<EditorStoreState>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...DEFAULT_EDITOR_STATE,

      // Context actions
      setCurrentPresentation: (id) => {
        set({ currentPresentationId: id }, undefined, 'setCurrentPresentation')
      },

      setCurrentSlide: (id) => {
        set(
          {
            currentSlideId: id,
            selectedElementIds: [],
            hoveredElementId: null,
          },
          undefined,
          'setCurrentSlide'
        )
      },

      // Selection actions
      selectElement: (id) => {
        set({ selectedElementIds: [id] }, undefined, 'selectElement')
      },

      selectElements: (ids) => {
        set({ selectedElementIds: ids }, undefined, 'selectElements')
      },

      addToSelection: (id) => {
        const state = get()
        if (!state.selectedElementIds.includes(id)) {
          set(
            { selectedElementIds: [...state.selectedElementIds, id] },
            undefined,
            'addToSelection'
          )
        }
      },

      toggleSelection: (id) => {
        const state = get()
        if (state.selectedElementIds.includes(id)) {
          // Remove from selection
          set(
            { selectedElementIds: state.selectedElementIds.filter((elemId) => elemId !== id) },
            undefined,
            'toggleSelection'
          )
        } else {
          // Add to selection
          set(
            { selectedElementIds: [...state.selectedElementIds, id] },
            undefined,
            'toggleSelection'
          )
        }
      },

      removeFromSelection: (id) => {
        set(
          (state) => ({
            selectedElementIds: state.selectedElementIds.filter((elemId) => elemId !== id),
          }),
          undefined,
          'removeFromSelection'
        )
      },

      clearSelection: () => {
        set({ selectedElementIds: [] }, undefined, 'clearSelection')
      },

      setHoveredElement: (id) => {
        set({ hoveredElementId: id }, undefined, 'setHoveredElement')
      },

      // Tool actions
      setActiveTool: (tool) => {
        set(
          {
            activeTool: tool,
            selectedElementIds: [],
            interactionMode: 'idle',
          },
          undefined,
          'setActiveTool'
        )
      },

      setActiveShapeType: (shapeType) => {
        set({ activeShapeType: shapeType }, undefined, 'setActiveShapeType')
      },

      // Interaction actions
      setInteractionMode: (mode) => {
        set({ interactionMode: mode }, undefined, 'setInteractionMode')
      },

      setActiveResizeHandle: (handle) => {
        set({ activeResizeHandle: handle }, undefined, 'setActiveResizeHandle')
      },

      startSelectionBox: (x, y) => {
        set(
          {
            selectionBox: { startX: x, startY: y, endX: x, endY: y },
            interactionMode: 'selecting',
          },
          undefined,
          'startSelectionBox'
        )
      },

      updateSelectionBox: (x, y) => {
        set(
          (state) => {
            if (!state.selectionBox) return state
            return {
              selectionBox: {
                ...state.selectionBox,
                endX: x,
                endY: y,
              },
            }
          },
          undefined,
          'updateSelectionBox'
        )
      },

      clearSelectionBox: () => {
        set(
          {
            selectionBox: null,
            interactionMode: 'idle',
          },
          undefined,
          'clearSelectionBox'
        )
      },

      // Viewport actions
      setViewport: (viewport) => {
        set(
          (state) => ({
            viewport: { ...state.viewport, ...viewport },
          }),
          undefined,
          'setViewport'
        )
      },

      zoomIn: () => {
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              zoom: Math.min(state.viewport.zoom + ZOOM_STEP, ZOOM_MAX),
            },
          }),
          undefined,
          'zoomIn'
        )
      },

      zoomOut: () => {
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              zoom: Math.max(state.viewport.zoom - ZOOM_STEP, ZOOM_MIN),
            },
          }),
          undefined,
          'zoomOut'
        )
      },

      zoomTo: (level) => {
        const clampedZoom = Math.max(ZOOM_MIN, Math.min(level, ZOOM_MAX))
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              zoom: clampedZoom,
            },
          }),
          undefined,
          'zoomTo'
        )
      },

      resetZoom: () => {
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              zoom: 1,
            },
          }),
          undefined,
          'resetZoom'
        )
      },

      pan: (deltaX, deltaY) => {
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              panX: state.viewport.panX + deltaX,
              panY: state.viewport.panY + deltaY,
            },
          }),
          undefined,
          'pan'
        )
      },

      resetPan: () => {
        set(
          (state) => ({
            viewport: {
              ...state.viewport,
              panX: 0,
              panY: 0,
            },
          }),
          undefined,
          'resetPan'
        )
      },

      // Clipboard actions
      copyElements: (elementIds, slideId) => {
        set(
          {
            clipboard: {
              elementIds,
              sourceSlideId: slideId,
            },
          },
          undefined,
          'copyElements'
        )
      },

      clearClipboard: () => {
        set(
          {
            clipboard: {
              elementIds: [],
              sourceSlideId: null,
            },
          },
          undefined,
          'clearClipboard'
        )
      },

      // History actions
      setHistoryState: (index, canUndo, canRedo) => {
        set(
          {
            historyIndex: index,
            canUndo,
            canRedo,
          },
          undefined,
          'setHistoryState'
        )
      },

      // UI actions
      toggleSidebar: () => {
        set((state) => ({ isSidebarOpen: !state.isSidebarOpen }), undefined, 'toggleSidebar')
      },

      togglePropertiesPanel: () => {
        set(
          (state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen }),
          undefined,
          'togglePropertiesPanel'
        )
      },

      toggleFullscreen: () => {
        set((state) => ({ isFullscreen: !state.isFullscreen }), undefined, 'toggleFullscreen')
      },

      toggleGrid: () => {
        set((state) => ({ showGrid: !state.showGrid }), undefined, 'toggleGrid')
      },

      toggleSnapToGrid: () => {
        set((state) => ({ snapToGrid: !state.snapToGrid }), undefined, 'toggleSnapToGrid')
      },

      setGridSize: (size) => {
        set({ gridSize: Math.max(1, size) }, undefined, 'setGridSize')
      },

      // Reset
      resetEditorState: () => {
        set(DEFAULT_EDITOR_STATE, undefined, 'resetEditorState')
      },
    }),
    { name: 'EditorStore' }
  )
)

export default useEditorStore
