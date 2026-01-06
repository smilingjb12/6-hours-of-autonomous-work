/**
 * SlideThumbnailCanvas Component
 * Renders a miniature canvas-based preview of a slide for the thumbnail panel
 *
 * Features:
 * - Canvas-based rendering for accurate slide preview
 * - Scaled down version of the main slide
 * - Auto-updates when slide content changes
 * - Optimized for thumbnail size rendering
 */

import { useRef, useEffect, useCallback } from 'react'
import { SlideCanvasRenderer } from '@/utils/SlideCanvasRenderer'
import type { Slide } from '@/types/presentation'

/**
 * Default slide dimensions (16:9 aspect ratio)
 */
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

/**
 * Thumbnail dimensions (maintain 16:9 aspect ratio)
 */
const THUMBNAIL_WIDTH = 160
const THUMBNAIL_HEIGHT = 90

/**
 * Props for SlideThumbnailCanvas component
 */
interface SlideThumbnailCanvasProps {
  /** The slide to render as a thumbnail */
  slide: Slide
  /** Optional width override for the thumbnail */
  width?: number
  /** Optional height override for the thumbnail */
  height?: number
  /** Optional class name for custom styling */
  className?: string
}

/**
 * SlideThumbnailCanvas renders a miniature canvas-based preview of a slide
 * Uses the same rendering engine as the main canvas but at a smaller scale
 */
export function SlideThumbnailCanvas({
  slide,
  width = THUMBNAIL_WIDTH,
  height = THUMBNAIL_HEIGHT,
  className = ''
}: SlideThumbnailCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<SlideCanvasRenderer | null>(null)

  /**
   * Initialize and render the thumbnail
   */
  const renderThumbnail = useCallback(() => {
    if (!canvasRef.current) return

    // Initialize renderer if not already done
    if (!rendererRef.current) {
      try {
        rendererRef.current = new SlideCanvasRenderer(canvasRef.current, {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          devicePixelRatio: window.devicePixelRatio || 1,
        })
      } catch (error) {
        console.error('Failed to initialize thumbnail renderer:', error)
        return
      }
    }

    const renderer = rendererRef.current

    // Render the slide at full size first, then the canvas will be scaled via CSS
    const viewport = { zoom: 1, panX: 0, panY: 0 }
    renderer.render(slide, viewport, {
      selectedElementIds: [],
      hoveredElementId: null,
      showGrid: false,
      showSelectionHandles: false,
    })

    // Override the canvas display size to thumbnail dimensions
    // (the renderer sets it to full size, but we want it scaled down)
    canvasRef.current.style.width = `${width}px`
    canvasRef.current.style.height = `${height}px`
  }, [slide, width, height])

  // Initialize renderer and render on mount
  useEffect(() => {
    renderThumbnail()

    // Cleanup on unmount
    return () => {
      if (rendererRef.current) {
        rendererRef.current.clearImageCache()
        rendererRef.current = null
      }
    }
  }, []) // Only run on mount

  // Re-render when slide changes
  useEffect(() => {
    // Preload images first, then render
    const preloadAndRender = async () => {
      if (rendererRef.current && slide) {
        await rendererRef.current.preloadImages(slide)
        renderThumbnail()
      }
    }
    preloadAndRender()
  }, [slide, slide.elements, slide.background, renderThumbnail])

  return (
    <canvas
      ref={canvasRef}
      width={SLIDE_WIDTH}
      height={SLIDE_HEIGHT}
      className={`slide-thumbnail-canvas ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        borderRadius: 'var(--radius-slide)',
      }}
      aria-hidden="true"
      data-testid="slide-thumbnail-canvas"
    />
  )
}

export default SlideThumbnailCanvas
