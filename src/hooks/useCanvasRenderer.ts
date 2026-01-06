/**
 * useCanvasRenderer - Custom React hook for managing the SlideCanvasRenderer
 *
 * This hook provides:
 * - Canvas renderer lifecycle management
 * - Automatic re-rendering when dependencies change
 * - Mouse event handling for element interaction
 * - Integration with the editor store
 */

import { useRef, useEffect, useLayoutEffect, useCallback, useState, useMemo } from 'react'
import { SlideCanvasRenderer } from '@/utils/SlideCanvasRenderer'
import type { CanvasRendererConfig } from '@/utils/SlideCanvasRenderer'
import { useEditorStore } from '@/stores/editorStore'
import { usePresentationStore } from '@/stores/presentationStore'
import type { ResizeHandle } from '@/types/editor'

/**
 * Options for the useCanvasRenderer hook
 */
export interface UseCanvasRendererOptions {
  /** Width of the canvas */
  width?: number
  /** Height of the canvas */
  height?: number
  /** Grid size when grid is visible */
  gridSize?: number
  /** ID of element currently being edited (will be hidden from canvas render) */
  editingElementId?: string | null
}

/**
 * Return type of the useCanvasRenderer hook
 */
export interface UseCanvasRendererReturn {
  /** Ref to attach to the canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  /** Whether the canvas is ready */
  isReady: boolean
  /** Force a re-render of the canvas */
  forceRender: () => void
  /** Get element at a canvas point */
  getElementAtPoint: (x: number, y: number) => ReturnType<SlideCanvasRenderer['getElementAtPoint']>
  /** Get resize handle at a canvas point */
  getResizeHandleAtPoint: (x: number, y: number) => ResizeHandle | 'rotation' | null
  /** Convert canvas coordinates to slide coordinates */
  canvasToSlideCoords: (x: number, y: number) => { x: number; y: number }
  /** Export canvas to data URL */
  exportToDataURL: (type?: string, quality?: number) => string | null
}

/**
 * Custom hook for managing canvas rendering
 */
export function useCanvasRenderer(
  options: UseCanvasRendererOptions = {}
): UseCanvasRendererReturn {
  const { width = 960, height = 540, gridSize = 20, editingElementId = null } = options

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SlideCanvasRenderer | null>(null)
  const [isReady, setIsReady] = useState(false)
  // Track canvas element availability for re-initialization
  const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null)

  // Get state from stores
  const viewport = useEditorStore((state) => state.viewport)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const hoveredElementId = useEditorStore((state) => state.hoveredElementId)
  const showGrid = useEditorStore((state) => state.showGrid)
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const selectionBox = useEditorStore((state) => state.selectionBox)

  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  // Subscribe to presentations array to detect changes when slides are added/modified
  const presentations = usePresentationStore((state) => state.presentations)

  // Get current slide - computed from presentations subscription
  const currentSlide = (() => {
    if (!currentPresentationId || !currentSlideId) return null
    const presentation = presentations.find((p) => p.id === currentPresentationId)
    return presentation?.slides.find((s) => s.id === currentSlideId) ?? null
  })()

  // Keep a ref to the current slide so render function always has latest value
  const currentSlideRef = useRef(currentSlide)
  currentSlideRef.current = currentSlide

  // Detect when canvas element becomes available (handles conditional rendering)
  useEffect(() => {
    // Check periodically if canvas ref has changed
    const checkCanvas = () => {
      if (canvasRef.current !== canvasElement) {
        setCanvasElement(canvasRef.current)
      }
    }

    // Initial check
    checkCanvas()

    // Use MutationObserver to detect when canvas is added to DOM
    const observer = new MutationObserver(checkCanvas)
    observer.observe(document.body, { childList: true, subtree: true })

    return () => observer.disconnect()
  }, [canvasElement])

  // Initialize renderer when canvas is mounted
  useEffect(() => {
    // Only initialize when we have a canvas element
    if (!canvasElement) {
      setIsReady(false)
      return
    }

    try {
      const config: Partial<CanvasRendererConfig> = {
        width,
        height,
        gridSize,
      }

      rendererRef.current = new SlideCanvasRenderer(canvasElement, config)
      setIsReady(true)
    } catch (error) {
      console.error('Failed to initialize canvas renderer:', error)
      setIsReady(false)
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.clearImageCache()
        rendererRef.current = null
      }
      setIsReady(false)
    }
  }, [canvasElement, width, height, gridSize])

  // Render function - uses ref to always get latest slide value
  const render = useCallback(() => {
    const renderer = rendererRef.current
    const slide = currentSlideRef.current
    if (!renderer || !slide) {
      // Don't clear canvas here - another render might have valid data
      return
    }

    // Render the slide
    renderer.render(slide, viewport, {
      selectedElementIds,
      hoveredElementId,
      showGrid,
      showSelectionHandles: true,
      editingElementId,
    })

    // Render selection box if active
    if (selectionBox) {
      renderer.renderSelectionBox(
        selectionBox.startX,
        selectionBox.startY,
        selectionBox.endX,
        selectionBox.endY
      )
    }
  }, [viewport, selectedElementIds, hoveredElementId, showGrid, selectionBox, editingElementId])

  // Re-render when dependencies change (using useLayoutEffect for synchronous rendering)
  useLayoutEffect(() => {
    if (isReady && currentSlide) {
      render()
    }
  }, [isReady, render, currentSlideId, currentSlide])

  // Preload images when slide changes
  useEffect(() => {
    const renderer = rendererRef.current
    if (renderer && currentSlide) {
      renderer.preloadImages(currentSlide).then(() => {
        // Re-render after images are loaded
        render()
      })
    }
  }, [currentSlide, render])

  // Force render function
  const forceRender = useCallback(() => {
    if (isReady) {
      render()
    }
  }, [isReady, render])

  // Get element at point
  const getElementAtPoint = useCallback(
    (x: number, y: number) => {
      const renderer = rendererRef.current
      if (!renderer || !currentSlide) return null
      return renderer.getElementAtPoint(currentSlide, viewport, x, y)
    },
    [currentSlide, viewport]
  )

  // Get resize handle at point
  const getResizeHandleAtPoint = useCallback(
    (x: number, y: number): ResizeHandle | 'rotation' | null => {
      const renderer = rendererRef.current
      if (!renderer || !currentSlide) return null

      // Check selected elements for resize handles
      for (const elementId of selectedElementIds) {
        const element = currentSlide.elements.find((el) => el.id === elementId)
        if (element) {
          const handle = renderer.getResizeHandleAtPoint(element, viewport, x, y)
          if (handle) return handle
        }
      }

      return null
    },
    [currentSlide, selectedElementIds, viewport]
  )

  // Canvas to slide coordinates
  const canvasToSlideCoords = useCallback(
    (x: number, y: number) => {
      const renderer = rendererRef.current
      if (!renderer) return { x, y }
      return renderer.canvasToSlideCoordinates(viewport, x, y)
    },
    [viewport]
  )

  // Export to data URL
  const exportToDataURL = useCallback(
    (type?: string, quality?: number) => {
      const renderer = rendererRef.current
      if (!renderer) return null
      return renderer.toDataURL(type, quality)
    },
    []
  )

  return useMemo(() => ({
    canvasRef,
    isReady,
    forceRender,
    getElementAtPoint,
    getResizeHandleAtPoint,
    canvasToSlideCoords,
    exportToDataURL,
  }), [canvasRef, isReady, forceRender, getElementAtPoint, getResizeHandleAtPoint, canvasToSlideCoords, exportToDataURL])
}

export default useCanvasRenderer
