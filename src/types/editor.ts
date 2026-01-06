/**
 * Types for editor state management.
 * These types track the current state of the editor UI and user interactions.
 */

/**
 * Available tools in the editor
 */
export type EditorTool = 'select' | 'text' | 'shape' | 'image' | 'pan'

/**
 * Shape tool subtypes
 */
export type ShapeToolType = 'rectangle' | 'circle' | 'line' | 'triangle'

/**
 * Current interaction mode of the editor
 */
export type InteractionMode =
  | 'idle'
  | 'selecting'
  | 'dragging'
  | 'resizing'
  | 'rotating'
  | 'drawing'

/**
 * Resize handle positions
 */
export type ResizeHandle =
  | 'top-left'
  | 'top'
  | 'top-right'
  | 'right'
  | 'bottom-right'
  | 'bottom'
  | 'bottom-left'
  | 'left'

/**
 * Selection box coordinates for multi-select
 */
export interface SelectionBox {
  startX: number
  startY: number
  endX: number
  endY: number
}

/**
 * Zoom and pan state for the canvas
 */
export interface ViewportState {
  zoom: number
  panX: number
  panY: number
}

/**
 * History entry for undo/redo functionality
 */
export interface HistoryEntry {
  id: string
  timestamp: string
  description: string
}

/**
 * Clipboard state for copy/paste functionality
 */
export interface ClipboardState {
  elementIds: string[]
  sourceSlideId: string | null
}

/**
 * Editor state for managing UI and interactions
 */
export interface EditorState {
  // Current context
  currentPresentationId: string | null
  currentSlideId: string | null

  // Selection state
  selectedElementIds: string[]
  hoveredElementId: string | null

  // Tool state
  activeTool: EditorTool
  activeShapeType: ShapeToolType

  // Interaction state
  interactionMode: InteractionMode
  activeResizeHandle: ResizeHandle | null
  selectionBox: SelectionBox | null

  // Viewport state
  viewport: ViewportState

  // Clipboard
  clipboard: ClipboardState

  // History tracking
  historyIndex: number
  canUndo: boolean
  canRedo: boolean

  // UI state
  isSidebarOpen: boolean
  isPropertiesPanelOpen: boolean
  isFullscreen: boolean
  showGrid: boolean
  snapToGrid: boolean
  gridSize: number
}

/**
 * Default editor state values
 */
export const DEFAULT_EDITOR_STATE: EditorState = {
  currentPresentationId: null,
  currentSlideId: null,
  selectedElementIds: [],
  hoveredElementId: null,
  activeTool: 'select',
  activeShapeType: 'rectangle',
  interactionMode: 'idle',
  activeResizeHandle: null,
  selectionBox: null,
  viewport: {
    zoom: 1,
    panX: 0,
    panY: 0,
  },
  clipboard: {
    elementIds: [],
    sourceSlideId: null,
  },
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  isSidebarOpen: true,
  isPropertiesPanelOpen: true,
  isFullscreen: false,
  showGrid: false,
  snapToGrid: true,
  gridSize: 10,
}

/**
 * Zoom level constraints
 */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 5
export const ZOOM_STEP = 0.1
