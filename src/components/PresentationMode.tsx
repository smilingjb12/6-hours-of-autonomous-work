/**
 * PresentationMode Component
 * Fullscreen slideshow view for presenting slides.
 *
 * Features:
 * - Fullscreen display with black background
 * - Keyboard navigation (arrow keys, spacebar, escape)
 * - Auto-scaling canvas to fit the viewport
 * - Slide counter display (e.g., 'Slide 5 of 12')
 * - Navigation controls (prev/next buttons)
 * - Jump-to-slide functionality via input field
 *
 * WCAG 2.1 AA Compliant:
 * - Keyboard accessible (arrow keys, spacebar, escape)
 * - Screen reader announcements for slide changes
 * - Focus management
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditorStore } from '@stores/editorStore'
import { usePresentationStore } from '@stores/presentationStore'
import { SlideCanvasRenderer } from '@/utils/SlideCanvasRenderer'
import type { Slide, SlideTransitionType } from '@/types/presentation'

/**
 * Base slide dimensions (16:9 aspect ratio)
 * All slide content is designed for these dimensions
 */
const BASE_SLIDE_WIDTH = 960
const BASE_SLIDE_HEIGHT = 540

/**
 * Props for PresentationMode component
 */
interface PresentationModeProps {
  /** Callback when exiting presentation mode */
  onExit: () => void
}

/**
 * PresentationMode displays slides in fullscreen for presenting
 */
export function PresentationMode({ onExit }: PresentationModeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<SlideCanvasRenderer | null>(null)
  const announceRef = useRef<HTMLDivElement>(null)
  const jumpInputRef = useRef<HTMLInputElement>(null)

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [canvasSize, setCanvasSize] = useState({ width: 960, height: 540 })
  const [showJumpInput, setShowJumpInput] = useState(false)
  const [jumpInputValue, setJumpInputValue] = useState('')
  const [showControls, setShowControls] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Transition state
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionType, setTransitionType] = useState<SlideTransitionType>('none')
  const [transitionDuration, setTransitionDuration] = useState(500)
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward')

  // Get current presentation from store
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const presentations = usePresentationStore((state) => state.presentations)
  const currentSlideId = useEditorStore((state) => state.currentSlideId)

  const currentPresentation = presentations.find((p) => p.id === currentPresentationId)
  const slides = currentPresentation?.slides ?? []
  const totalSlides = slides.length

  // Find the initial slide index based on current selection
  useEffect(() => {
    if (currentSlideId && slides.length > 0) {
      const index = slides.findIndex((s) => s.id === currentSlideId)
      if (index !== -1) {
        setCurrentSlideIndex(index)
      }
    }
  }, [currentSlideId, slides])

  // Announce slide changes to screen readers
  const announce = useCallback((message: string) => {
    if (announceRef.current) {
      announceRef.current.textContent = message
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  // Trigger transition effect when navigating to a new slide
  const triggerTransition = useCallback((targetSlide: Slide, direction: 'forward' | 'backward') => {
    const slideTransition = targetSlide.transition
    const type = slideTransition?.type ?? 'none'
    const duration = slideTransition?.duration ?? 500

    if (type === 'none') {
      return
    }

    setTransitionType(type)
    setTransitionDuration(duration)
    setTransitionDirection(direction)
    setIsTransitioning(true)

    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false)
    }, duration)
  }, [])

  // Navigate to next slide
  const nextSlide = useCallback(() => {
    if (currentSlideIndex < totalSlides - 1) {
      const nextIndex = currentSlideIndex + 1
      const targetSlide = slides[nextIndex]
      if (targetSlide) {
        triggerTransition(targetSlide, 'forward')
      }
      setCurrentSlideIndex(nextIndex)
      announce(`Slide ${nextIndex + 1} of ${totalSlides}`)
    }
  }, [currentSlideIndex, totalSlides, announce, slides, triggerTransition])

  // Navigate to previous slide
  const prevSlide = useCallback(() => {
    if (currentSlideIndex > 0) {
      const prevIndex = currentSlideIndex - 1
      const targetSlide = slides[prevIndex]
      if (targetSlide) {
        triggerTransition(targetSlide, 'backward')
      }
      setCurrentSlideIndex(prevIndex)
      announce(`Slide ${prevIndex + 1} of ${totalSlides}`)
    }
  }, [currentSlideIndex, totalSlides, announce, slides, triggerTransition])

  // Jump to a specific slide
  const jumpToSlide = useCallback((slideNumber: number) => {
    const targetIndex = Math.max(0, Math.min(slideNumber - 1, totalSlides - 1))
    const targetSlide = slides[targetIndex]
    const direction = targetIndex > currentSlideIndex ? 'forward' : 'backward'
    if (targetSlide) {
      triggerTransition(targetSlide, direction)
    }
    setCurrentSlideIndex(targetIndex)
    announce(`Slide ${targetIndex + 1} of ${totalSlides}`)
    setShowJumpInput(false)
    setJumpInputValue('')
  }, [totalSlides, announce, slides, currentSlideIndex, triggerTransition])

  // Handle jump input submit
  const handleJumpInputSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const slideNumber = parseInt(jumpInputValue, 10)
    if (!isNaN(slideNumber) && slideNumber >= 1 && slideNumber <= totalSlides) {
      jumpToSlide(slideNumber)
    }
  }, [jumpInputValue, totalSlides, jumpToSlide])

  // Handle jump input key events
  const handleJumpInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      setShowJumpInput(false)
      setJumpInputValue('')
      containerRef.current?.focus()
    }
  }, [])

  // Show controls on mouse movement
  const handleMouseMove = useCallback(() => {
    setShowControls(true)
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showJumpInput) {
        setShowControls(false)
      }
    }, 3000)
  }, [showJumpInput])

  // Cleanup controls timeout
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Focus jump input when it becomes visible
  useEffect(() => {
    if (showJumpInput && jumpInputRef.current) {
      jumpInputRef.current.focus()
    }
  }, [showJumpInput])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if jump input is active (handled by its own key handler)
      if (showJumpInput) return

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ': // Spacebar
        case 'PageDown':
          e.preventDefault()
          nextSlide()
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault()
          prevSlide()
          break
        case 'Escape':
          e.preventDefault()
          onExit()
          break
        case 'Home':
          e.preventDefault()
          setCurrentSlideIndex(0)
          announce(`Slide 1 of ${totalSlides}`)
          break
        case 'End':
          e.preventDefault()
          setCurrentSlideIndex(totalSlides - 1)
          announce(`Slide ${totalSlides} of ${totalSlides}`)
          break
        case 'g':
        case 'G':
          // Open jump-to-slide input
          e.preventDefault()
          setShowJumpInput(true)
          setJumpInputValue('')
          break
        case 'n':
        case 'N':
          // Toggle speaker notes display
          e.preventDefault()
          setShowNotes((prev) => !prev)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); }
  }, [nextSlide, prevSlide, onExit, totalSlides, announce, showJumpInput])

  // Calculate canvas size to fit viewport while maintaining aspect ratio
  const calculateCanvasSize = useCallback(() => {
    const aspectRatio = 16 / 9 // Standard presentation aspect ratio
    const padding = 0 // No padding for fullscreen

    const viewportWidth = window.innerWidth - padding * 2
    const viewportHeight = window.innerHeight - padding * 2

    let width: number
    let height: number

    if (viewportWidth / viewportHeight > aspectRatio) {
      // Viewport is wider than slide aspect ratio
      height = viewportHeight
      width = height * aspectRatio
    } else {
      // Viewport is taller than slide aspect ratio
      width = viewportWidth
      height = width / aspectRatio
    }

    setCanvasSize({ width: Math.floor(width), height: Math.floor(height) })
  }, [])

  // Handle window resize
  useEffect(() => {
    calculateCanvasSize()
    window.addEventListener('resize', calculateCanvasSize)
    return () => { window.removeEventListener('resize', calculateCanvasSize); }
  }, [calculateCanvasSize])

  // Track renderer ready state
  const [rendererReady, setRendererReady] = useState(0)

  // Initialize canvas renderer at display dimensions for crisp rendering
  useEffect(() => {
    if (!canvasRef.current) return

    // Use device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1

    // Calculate scale factor from base slide dimensions to display size
    // This ensures content renders crisply at the full display resolution
    const contentScale = canvasSize.width / BASE_SLIDE_WIDTH

    try {
      // Set canvas physical size for crisp rendering at display resolution
      // Physical size = display size * device pixel ratio
      canvasRef.current.width = canvasSize.width * dpr
      canvasRef.current.height = canvasSize.height * dpr

      // Initialize renderer with BASE dimensions as the logical coordinate system
      // but use a combined scale factor (contentScale * dpr) so content renders
      // at full display resolution while coordinates remain in 960x540 space
      rendererRef.current = new SlideCanvasRenderer(canvasRef.current, {
        width: BASE_SLIDE_WIDTH,
        height: BASE_SLIDE_HEIGHT,
        devicePixelRatio: contentScale * dpr,
      })

      // Set CSS display size to match the calculated viewport size
      canvasRef.current.style.width = `${canvasSize.width}px`
      canvasRef.current.style.height = `${canvasSize.height}px`

      // Signal that renderer is ready (triggers render effect)
      setRendererReady((prev) => prev + 1)
    } catch (error) {
      console.error('Failed to initialize presentation canvas renderer:', error)
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.clearImageCache()
        rendererRef.current = null
      }
    }
  }, [canvasSize.width, canvasSize.height])

  // Render current slide when slide changes or renderer becomes ready
  useEffect(() => {
    const renderer = rendererRef.current
    const slide = slides[currentSlideIndex]

    if (!renderer || !slide) {
      if (renderer) {
        renderer.clear()
      }
      return
    }

    // Render without selection handles or grid
    // Scaling is handled by the renderer's devicePixelRatio (set to contentScale * dpr)
    renderer.render(slide, { zoom: 1, panX: 0, panY: 0 }, {
      selectedElementIds: [],
      hoveredElementId: null,
      showGrid: false,
      showSelectionHandles: false,
    })
  }, [slides, currentSlideIndex, rendererReady])

  // Preload images for current and adjacent slides
  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return

    const slidesToPreload: Slide[] = []

    // Current slide
    const currentSlide = slides[currentSlideIndex]
    if (currentSlide) {
      slidesToPreload.push(currentSlide)
    }

    // Next slide
    const nextSlideToPreload = slides[currentSlideIndex + 1]
    if (nextSlideToPreload) {
      slidesToPreload.push(nextSlideToPreload)
    }

    // Previous slide
    const prevSlideToPreload = slides[currentSlideIndex - 1]
    if (prevSlideToPreload) {
      slidesToPreload.push(prevSlideToPreload)
    }

    void Promise.all(slidesToPreload.map((slide) => renderer.preloadImages(slide)))
  }, [slides, currentSlideIndex])

  // Request fullscreen on mount
  useEffect(() => {
    const container = containerRef.current
    if (container && document.fullscreenEnabled) {
      container.requestFullscreen().catch((err: unknown) => {
        console.warn('Could not enter fullscreen mode:', err)
      })
    }

    // Exit fullscreen on unmount
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {
          // Ignore errors when exiting fullscreen
        })
      }
    }
  }, [])

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        // User exited fullscreen via browser controls
        onExit()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => { document.removeEventListener('fullscreenchange', handleFullscreenChange); }
  }, [onExit])

  // Focus container for keyboard events
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  // Handle click to advance slide
  const handleClick = useCallback((e: React.MouseEvent) => {
    // Click on left 30% goes back, right 70% goes forward
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const threshold = rect.width * 0.3

    if (clickX < threshold) {
      prevSlide()
    } else {
      nextSlide()
    }
  }, [nextSlide, prevSlide])

  if (!currentPresentation || slides.length === 0) {
    return (
      <div
        ref={containerRef}
        className="presentation-mode"
        tabIndex={0}
        role="dialog"
        aria-modal="true"
        aria-label="Presentation mode - No slides available"
        data-testid="presentation-mode"
      >
        <div className="presentation-mode-empty">
          <p>No slides to present</p>
          <button
            type="button"
            onClick={onExit}
            className="presentation-mode-exit-button"
          >
            Exit Presentation
          </button>
        </div>
      </div>
    )
  }

  const currentSlide = slides[currentSlideIndex]

  return (
    <div
      ref={containerRef}
      className={`presentation-mode ${showControls || showJumpInput ? 'controls-visible' : ''}`}
      tabIndex={0}
      role="dialog"
      aria-modal="true"
      aria-label={`Presentation mode - Slide ${currentSlideIndex + 1} of ${totalSlides}`}
      data-testid="presentation-mode"
      onClick={handleClick}
      onMouseMove={handleMouseMove}
    >
      {/* Screen reader announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />

      {/* Canvas container */}
      <div
        className={`presentation-mode-canvas-container ${
          isTransitioning ? `transition-${transitionType} transition-${transitionDirection}` : ''
        }`}
        style={isTransitioning ? { '--transition-duration': `${transitionDuration}ms` } as React.CSSProperties : undefined}
        data-transitioning={isTransitioning}
      >
        <canvas
          ref={canvasRef}
          className="presentation-mode-canvas"
          aria-label={`Slide ${currentSlideIndex + 1}: ${currentSlide?.title ?? 'Untitled'}`}
          data-testid="presentation-canvas"
        />
      </div>

      {/* Navigation controls bar */}
      <div
        className="presentation-mode-nav-bar"
        aria-label="Presentation navigation"
        data-testid="presentation-nav-bar"
      >
        {/* Previous button */}
        <button
          type="button"
          className="presentation-mode-nav-button"
          onClick={(e) => {
            e.stopPropagation()
            prevSlide()
          }}
          disabled={currentSlideIndex === 0}
          aria-label="Previous slide"
          data-testid="prev-slide-button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Slide counter - clickable to open jump input */}
        <button
          type="button"
          className="presentation-mode-counter"
          onClick={(e) => {
            e.stopPropagation()
            setShowJumpInput(true)
            setJumpInputValue('')
          }}
          aria-label={`Slide ${currentSlideIndex + 1} of ${totalSlides}. Click to jump to slide.`}
          data-testid="slide-counter"
        >
          Slide {currentSlideIndex + 1} of {totalSlides}
        </button>

        {/* Next button */}
        <button
          type="button"
          className="presentation-mode-nav-button"
          onClick={(e) => {
            e.stopPropagation()
            nextSlide()
          }}
          disabled={currentSlideIndex === totalSlides - 1}
          aria-label="Next slide"
          data-testid="next-slide-button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Jump-to-slide modal */}
      {showJumpInput && (
        <div
          className="presentation-mode-jump-overlay"
          onClick={(e) => {
            e.stopPropagation()
            setShowJumpInput(false)
            setJumpInputValue('')
          }}
          data-testid="jump-overlay"
        >
          <form
            className="presentation-mode-jump-form"
            onSubmit={handleJumpInputSubmit}
            onClick={(e) => { e.stopPropagation(); }}
          >
            <label htmlFor="jump-slide-input" className="presentation-mode-jump-label">
              Go to slide:
            </label>
            <div className="presentation-mode-jump-input-group">
              <input
                ref={jumpInputRef}
                id="jump-slide-input"
                type="number"
                min={1}
                max={totalSlides}
                value={jumpInputValue}
                onChange={(e) => { setJumpInputValue(e.target.value); }}
                onKeyDown={handleJumpInputKeyDown}
                className="presentation-mode-jump-input"
                placeholder={`1-${totalSlides}`}
                aria-label={`Enter slide number between 1 and ${totalSlides}`}
                data-testid="jump-slide-input"
              />
              <button
                type="submit"
                className="presentation-mode-jump-button"
                disabled={!jumpInputValue || parseInt(jumpInputValue, 10) < 1 || parseInt(jumpInputValue, 10) > totalSlides}
                data-testid="jump-slide-submit"
              >
                Go
              </button>
            </div>
            <p className="presentation-mode-jump-hint">
              Press Enter to go, Escape to cancel
            </p>
          </form>
        </div>
      )}

      {/* Navigation hints (shown briefly or on hover) */}
      <div
        className="presentation-mode-hints"
        aria-hidden="true"
      >
        <span>← → Navigate</span>
        <span>G to jump</span>
        <span>N for notes</span>
        <span>ESC to exit</span>
      </div>

      {/* Speaker Notes Panel (toggled with N key) */}
      {showNotes && currentSlide && (
        <div
          className="presentation-mode-notes"
          onClick={(e) => { e.stopPropagation(); }}
          data-testid="presentation-notes-panel"
          role="complementary"
          aria-label="Speaker notes"
        >
          <div className="presentation-mode-notes-header">
            <span className="presentation-mode-notes-title">Speaker Notes</span>
            <button
              type="button"
              className="presentation-mode-notes-close"
              onClick={() => { setShowNotes(false); }}
              aria-label="Close notes panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="presentation-mode-notes-content">
            {currentSlide.notes ? (
              <p>{currentSlide.notes}</p>
            ) : (
              <p className="presentation-mode-notes-empty">No notes for this slide</p>
            )}
          </div>
        </div>
      )}

      {/* Exit button (visible on hover) */}
      <button
        type="button"
        className="presentation-mode-exit-button"
        onClick={(e) => {
          e.stopPropagation()
          onExit()
        }}
        aria-label="Exit presentation mode"
        data-testid="exit-presentation-button"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default PresentationMode
