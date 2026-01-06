/**
 * Central export file for all application types.
 * Import types from this file for cleaner imports across the codebase.
 */

// Presentation types
export type {
  Position,
  Dimensions,
  ElementType,
  ShapeType,
  BaseElement,
  TextElement,
  ShapeElement,
  ImageElement,
  SlideElement,
  SlideBackground,
  Slide,
  PresentationTheme,
  Presentation,
} from './presentation'

export {
  DEFAULT_THEME,
  DEFAULT_SLIDE_BACKGROUND,
  createBlankSlide,
  createBlankPresentation,
} from './presentation'

// Editor types
export type {
  EditorTool,
  ShapeToolType,
  InteractionMode,
  ResizeHandle,
  SelectionBox,
  ViewportState,
  HistoryEntry,
  ClipboardState,
  EditorState,
} from './editor'

export { DEFAULT_EDITOR_STATE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from './editor'

// Layout types
export type { SlideLayoutType, SlideLayoutMeta } from './layout'

export {
  SLIDE_LAYOUTS,
  getLayoutElements,
  getLayoutDefaultTitle,
  createSlideWithLayout,
  applyLayoutToSlide,
} from './layout'
