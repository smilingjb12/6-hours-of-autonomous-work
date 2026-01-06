/**
 * Custom hooks barrel export
 */

export { useCanvasRenderer } from './useCanvasRenderer'
export type { UseCanvasRendererOptions, UseCanvasRendererReturn } from './useCanvasRenderer'

export { useToast } from './useToast'
export { useKeyboardShortcuts } from './useKeyboardShortcuts'

// Responsive design hooks
export {
  useMediaQuery,
  useViewportType,
  useIsTablet,
  useIsMobile,
  useIsDesktop,
  useIsTouchDevice,
  BREAKPOINTS,
} from './useMediaQuery'
export type { ViewportType } from './useMediaQuery'
