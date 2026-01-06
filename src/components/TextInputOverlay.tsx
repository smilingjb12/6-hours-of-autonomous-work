/**
 * TextInputOverlay Component
 * Provides inline text editing on the canvas for text elements
 *
 * Features:
 * - Positioned overlay that matches text element location
 * - Auto-resizing textarea for text input
 * - Handles text creation and editing
 * - Accessibility support with proper ARIA attributes
 */

import { useRef, useEffect, useCallback, useState } from 'react'
import type { Position, Dimensions } from '@/types/presentation'
import type { ViewportState } from '@/types/editor'

/**
 * Props for TextInputOverlay component
 */
interface TextInputOverlayProps {
  /** Position on the slide (slide coordinates) */
  position: Position
  /** Initial dimensions of the text box */
  dimensions: Dimensions
  /** Viewport state for coordinate transformation */
  viewport: ViewportState
  /** Canvas dimensions */
  canvasWidth: number
  canvasHeight: number
  /** Initial text content */
  initialContent?: string
  /** Font size in pixels */
  fontSize?: number
  /** Font family */
  fontFamily?: string
  /** Text color */
  color?: string
  /** Text alignment */
  textAlign?: 'left' | 'center' | 'right'
  /** Callback when text editing is complete */
  onComplete: (content: string) => void
  /** Callback when editing is cancelled */
  onCancel: () => void
}

/**
 * TextInputOverlay displays an editable text input over the canvas
 */
export function TextInputOverlay({
  position,
  dimensions,
  viewport,
  canvasWidth,
  canvasHeight,
  initialContent = '',
  fontSize = 24,
  fontFamily = 'Inter, system-ui, sans-serif',
  color = '#1e293b',
  textAlign = 'left',
  onComplete,
  onCancel,
}: TextInputOverlayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [content, setContent] = useState(initialContent)
  // Track if we've been mounted long enough to allow blur cancellation
  // This prevents immediate cancellation from mouseup events
  const mountedTimeRef = useRef<number>(Date.now())
  const hasInteractedRef = useRef<boolean>(false)

  // Calculate screen position from slide coordinates
  const calculateScreenPosition = useCallback(() => {
    const { zoom, panX, panY } = viewport

    // Apply viewport transformation
    const screenX = (position.x - canvasWidth / 2 + panX) * zoom + canvasWidth / 2
    const screenY = (position.y - canvasHeight / 2 + panY) * zoom + canvasHeight / 2

    return {
      left: screenX,
      top: screenY,
      width: dimensions.width * zoom,
      height: dimensions.height * zoom,
    }
  }, [position, dimensions, viewport, canvasWidth, canvasHeight])

  const screenPos = calculateScreenPosition()

  // Focus the textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Select all text for editing existing text
      if (initialContent) {
        textareaRef.current.select()
      }
    }
  }, [initialContent])

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        // Enter without shift completes editing
        // Shift+Enter creates a new line
        e.preventDefault()
        const trimmedContent = content.trim()
        if (trimmedContent) {
          onComplete(trimmedContent)
        } else {
          onCancel()
        }
      }
    },
    [content, onComplete, onCancel]
  )

  // Handle blur (click outside)
  const handleBlur = useCallback(() => {
    const trimmedContent = content.trim()
    if (trimmedContent) {
      onComplete(trimmedContent)
    } else {
      // Only cancel if we've been mounted for at least 100ms or user has interacted
      // This prevents immediate cancellation from mouseup events during initial click
      const timeSinceMount = Date.now() - mountedTimeRef.current
      if (timeSinceMount > 100 || hasInteractedRef.current) {
        onCancel()
      } else {
        // Re-focus the textarea if blur happened too quickly
        textareaRef.current?.focus()
      }
    }
  }, [content, onComplete, onCancel])

  return (
    <div
      className="text-input-overlay absolute pointer-events-none"
      style={{
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: 1000,
      }}
      data-testid="text-input-overlay"
    >
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => {
          hasInteractedRef.current = true
          setContent(e.target.value)
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="absolute pointer-events-auto resize-none border-2 border-primary-500 bg-transparent outline-none"
        style={{
          left: screenPos.left,
          top: screenPos.top,
          width: screenPos.width,
          height: screenPos.height,
          minWidth: 100,
          minHeight: fontSize * 1.5 * viewport.zoom,
          fontSize: fontSize * viewport.zoom,
          fontFamily,
          color,
          textAlign,
          lineHeight: 1.2,
          padding: '4px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
        placeholder="Type text here..."
        aria-label="Text input for slide element"
        data-testid="text-input-textarea"
      />
    </div>
  )
}

export default TextInputOverlay
