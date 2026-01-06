/**
 * SlidePanel Component
 * Left sidebar panel displaying slide thumbnails for navigation
 *
 * WCAG 2.1 AA Compliant:
 * - ARIA listbox pattern for slide list
 * - Full keyboard navigation (Arrow keys, Home, End)
 * - Focus management and visible focus indicators
 * - Screen reader announcements for slide changes
 *
 * Features:
 * - Canvas-based thumbnail previews showing actual slide content
 * - Visual indicators for current slide selection
 * - Hover effects and smooth transitions
 * - Click to select slide functionality
 * - Drag-and-drop to reorder slides
 */

import { useState, useRef, useCallback, memo, useEffect, useMemo } from 'react'
import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { useHistoryStore } from '@stores/historyStore'
import { SlideThumbnailCanvas } from './SlideThumbnailCanvas'
import { DeleteSlideDialog } from './DeleteSlideDialog'
import { LayoutSelectorDialog } from './LayoutSelectorDialog'
import { Button } from '@components/ui/button'
import { Plus, Trash2, GripVertical, X } from 'lucide-react'
import { cn } from '@lib/utils'
import type { Slide } from '../types/presentation'
import type { SlideLayoutType } from '../types/layout'

/**
 * Drag state for slide reordering
 */
interface DragState {
  /** ID of the slide being dragged */
  draggedSlideId: string | null
  /** Index of the slide being dragged */
  draggedIndex: number
  /** Current drop target index (where the slide will be inserted) */
  dropIndex: number | null
  /** Initial Y position of the drag */
  startY: number
}

/**
 * Props for SlidePanel component
 */
interface SlidePanelProps {
  /** Optional class name for custom styling */
  className?: string
  /** Whether the viewport is tablet-sized (768px - 1023px) */
  isTablet?: boolean
}

/**
 * Individual slide thumbnail component
 */
interface SlideThumbnailProps {
  slide: Slide
  index: number
  isSelected: boolean
  isDragging: boolean
  isDropTarget: boolean
  dropPosition: 'above' | 'below' | null
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onDeleteClick: (e: React.MouseEvent) => void
  onDragStart: (e: React.MouseEvent) => void
  tabIndex: number
  buttonRef: (el: HTMLButtonElement | null) => void
}

const SlideThumbnail = memo(function SlideThumbnail({
  slide,
  index,
  isSelected,
  isDragging,
  isDropTarget,
  dropPosition,
  onClick,
  onKeyDown,
  onDeleteClick,
  onDragStart,
  tabIndex,
  buttonRef,
}: SlideThumbnailProps) {
  return (
    <div
      className={cn(
        "relative group/slide",
        isDragging && "opacity-50 scale-95"
      )}
      data-slide-id={slide.id}
    >
      {/* Drop indicator above */}
      {isDropTarget && dropPosition === 'above' && (
        <div
          className="absolute -top-1 left-2 right-2 h-1 bg-primary-500 rounded-full z-10"
          data-testid={`drop-indicator-above-${index}`}
        />
      )}

      <div className="flex items-center gap-1">
        {/* Drag handle */}
        <button
          type="button"
          onMouseDown={onDragStart}
          className={cn(
            'flex-shrink-0 p-1 cursor-grab active:cursor-grabbing rounded transition-colors',
            'text-secondary-400 hover:text-secondary-600 hover:bg-secondary-100',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
          )}
          data-testid={`drag-handle-${index}`}
          aria-label={`Drag to reorder slide ${index + 1}`}
          tabIndex={-1}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <button
          ref={buttonRef}
          type="button"
          onClick={onClick}
          onKeyDown={onKeyDown}
          className={cn(
            'flex-1 min-w-0 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white rounded-lg'
          )}
          data-testid={`slide-thumbnail-${index}`}
          aria-label={`Slide ${index + 1}: ${slide.title ?? 'Untitled'}. ${slide.elements.length} element${slide.elements.length !== 1 ? 's' : ''}`}
          role="option"
          aria-selected={isSelected}
          tabIndex={tabIndex}
        >
          <div
            className={cn(
              'flex items-start gap-2 p-2 rounded-lg transition-all duration-200',
              isSelected
                ? 'bg-primary-50 scale-[1.02]'
                : 'hover:bg-secondary-100 hover:scale-[1.01]'
            )}
          >
            {/* Slide number */}
            <span
              className={cn(
                'text-xs font-medium min-w-[1.5rem] pt-1 transition-colors',
                isSelected ? 'text-primary-600' : 'text-secondary-500'
              )}
              aria-hidden="true"
            >
              {index + 1}
            </span>

            {/* Thumbnail with canvas preview */}
            <div
              className={cn(
                'slide-thumbnail-wrapper flex-1 min-w-0 relative overflow-hidden rounded transition-all duration-200 aspect-video',
                isSelected
                  ? 'ring-2 ring-primary-500 shadow-lg'
                  : 'ring-1 ring-secondary-300 hover:ring-primary-400 hover:shadow-md'
              )}
              aria-hidden="true"
            >
              {/* Canvas-based slide preview */}
              <SlideThumbnailCanvas slide={slide} width={160} height={90} className="w-full h-full object-contain" />

              {/* Selection indicator overlay */}
              {isSelected && <div className="absolute inset-0 bg-primary-500/10 pointer-events-none" />}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 transition-colors pointer-events-none" />
            </div>
          </div>
        </button>

        {/* Delete button - visible on hover */}
        <button
          type="button"
          onClick={onDeleteClick}
          className={cn(
            'absolute top-1 right-1 p-1.5 rounded-md transition-all duration-200',
            'bg-white/90 hover:bg-error-500 text-secondary-400 hover:text-white shadow-sm',
            'opacity-0 group-hover/slide:opacity-100 focus:opacity-100',
            'focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-1 focus:ring-offset-white'
          )}
          data-testid={`delete-slide-button-${index}`}
          aria-label={`Delete slide ${index + 1}`}
          tabIndex={-1}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop indicator below */}
      {isDropTarget && dropPosition === 'below' && (
        <div
          className="absolute -bottom-1 left-2 right-2 h-1 bg-primary-500 rounded-full z-10"
          data-testid={`drop-indicator-below-${index}`}
        />
      )}
    </div>
  )
})

SlideThumbnail.displayName = 'SlideThumbnail';

/**
 * SlidePanel displays slide thumbnails in the left sidebar
 * Allows navigation between slides and shows the current selection
 * Implements WCAG 2.1 AA accessible listbox pattern
 */
export function SlidePanel({ className = '', isTablet = false }: SlidePanelProps) {
  // Get presentation data - subscribe to presentations directly for proper reactivity
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const addSlideWithLayout = usePresentationStore((state) => state.addSlideWithLayout)
  const deleteSlide = usePresentationStore((state) => state.deleteSlide)
  const reorderSlides = usePresentationStore((state) => state.reorderSlides)

  // Get editor state
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide)
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen)
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar)

  // Get history store for undo/redo support
  const recordSnapshot = useHistoryStore((state) => state.recordSnapshot)

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [slideToDelete, setSlideToDelete] = useState<{ id: string; title: string; index: number } | null>(null)

  // Layout selector dialog state
  const [isLayoutSelectorOpen, setIsLayoutSelectorOpen] = useState(false)

  // Drag and drop state
  const [dragState, setDragState] = useState<DragState>({
    draggedSlideId: null,
    draggedIndex: -1,
    dropIndex: null,
    startY: 0,
  })

  // Refs for keyboard navigation and drag tracking
  const slideButtonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const slidesContainerRef = useRef<HTMLDivElement>(null)
  const slideItemRefs = useRef<(HTMLDivElement | null)[]>([])

  // Derive presentation from subscribed data for proper reactivity
  const presentation = useMemo(
    () => presentations.find((p) => p.id === currentPresentationId) ?? null,
    [presentations, currentPresentationId]
  )
  const slides = presentation?.slides ?? []

  // Find current slide index for keyboard navigation
  const currentSlideIndex = slides.findIndex((s) => s.id === currentSlideId)

  /**
   * Calculate drop index based on mouse Y position
   */
  const calculateDropIndex = useCallback((clientY: number): number | null => {
    if (!slidesContainerRef.current) return null

    const containerRect = slidesContainerRef.current.getBoundingClientRect()
    const relativeY = clientY - containerRect.top + slidesContainerRef.current.scrollTop

    // Find the slide we're hovering over
    for (let i = 0; i < slideItemRefs.current.length; i++) {
      const item = slideItemRefs.current[i]
      if (!item) continue

      const itemRect = item.getBoundingClientRect()
      const itemRelativeTop = itemRect.top - containerRect.top + slidesContainerRef.current.scrollTop
      const itemMiddle = itemRelativeTop + itemRect.height / 2

      if (relativeY < itemMiddle) {
        return i
      }
    }

    // If we're past all slides, drop at the end
    return slides.length
  }, [slides.length])

  /**
   * Handle drag start from the drag handle
   */
  const handleDragStart = useCallback((e: React.MouseEvent, slideId: string, index: number) => {
    e.preventDefault()
    e.stopPropagation()

    // Record snapshot before drag starts for undo support
    recordSnapshot('Before slide reorder')

    setDragState({
      draggedSlideId: slideId,
      draggedIndex: index,
      dropIndex: index,
      startY: e.clientY,
    })
  }, [recordSnapshot])

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState.draggedSlideId) return

    const newDropIndex = calculateDropIndex(e.clientY)
    if (newDropIndex !== null && newDropIndex !== dragState.dropIndex) {
      setDragState((prev) => ({ ...prev, dropIndex: newDropIndex }))
    }
  }, [dragState.draggedSlideId, dragState.dropIndex, calculateDropIndex])

  /**
   * Handle mouse up to complete the drag
   */
  const handleMouseUp = useCallback(() => {
    if (!dragState.draggedSlideId || !currentPresentationId) {
      setDragState({ draggedSlideId: null, draggedIndex: -1, dropIndex: null, startY: 0 })
      return
    }

    const { draggedIndex, dropIndex } = dragState

    // Only reorder if the drop position is different from the original position
    if (dropIndex !== null && dropIndex !== draggedIndex && dropIndex !== draggedIndex + 1) {
      // Calculate the new order of slide IDs
      const newSlideIds = [...slides.map((s) => s.id)]
      const removedSlides = newSlideIds.splice(draggedIndex, 1)
      const draggedId = removedSlides[0]

      if (draggedId) {
        // Adjust insert index if dragging to a position after the original
        const insertIndex = dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
        newSlideIds.splice(insertIndex, 0, draggedId)

        // Update the store with the new order
        reorderSlides(currentPresentationId, newSlideIds)

        // Record snapshot after reorder for undo support
        recordSnapshot('Reorder slides')
      }
    }

    // Reset drag state
    setDragState({ draggedSlideId: null, draggedIndex: -1, dropIndex: null, startY: 0 })
  }, [dragState, currentPresentationId, slides, reorderSlides, recordSnapshot])

  // Set up global mouse event listeners for drag
  useEffect(() => {
    if (!dragState.draggedSlideId) {
      return
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Add cursor style to body during drag
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragState.draggedSlideId, handleMouseMove, handleMouseUp])

  /**
   * Determine the drop position for a given slide index
   */
  const getDropPosition = useCallback((index: number): 'above' | 'below' | null => {
    if (dragState.dropIndex === null || dragState.draggedSlideId === null) return null

    // Don't show indicator at the original position or adjacent positions
    if (dragState.dropIndex === dragState.draggedIndex || dragState.dropIndex === dragState.draggedIndex + 1) {
      return null
    }

    if (dragState.dropIndex === index) {
      return 'above'
    }
    if (dragState.dropIndex === slides.length && index === slides.length - 1) {
      return 'below'
    }

    return null
  }, [dragState, slides.length])

  const handleSlideClick = useCallback((slideId: string) => {
    setCurrentSlide(slideId);
  }, [setCurrentSlide])

  // Handle delete button click - opens confirmation dialog
  const handleDeleteClick = useCallback((e: React.MouseEvent, slide: Slide, index: number) => {
    e.stopPropagation() // Prevent slide selection
    setSlideToDelete({ id: slide.id, title: slide.title, index })
    setIsDeleteDialogOpen(true)
  }, [])

  // Handle confirmed deletion
  const handleConfirmDelete = useCallback(() => {
    if (!currentPresentationId || !slideToDelete) return

    const deletedIndex = slideToDelete.index

    // Delete the slide
    deleteSlide(currentPresentationId, slideToDelete.id)

    // Handle slide selection after deletion
    const remainingSlides = slides.filter((s) => s.id !== slideToDelete.id)

    if (remainingSlides.length > 0) {
      // If we deleted the current slide, select an adjacent slide
      if (currentSlideId === slideToDelete.id) {
        // Prefer the slide that was after the deleted one, otherwise the one before
        const newIndex = Math.min(deletedIndex, remainingSlides.length - 1)
        const newSlide = remainingSlides[newIndex]
        if (newSlide) {
          setCurrentSlide(newSlide.id)
          // Focus the new slide after render
          setTimeout(() => {
            slideButtonRefs.current[newIndex]?.focus()
          }, 100)
        }
      }
    } else {
      // No slides left, clear selection
      setCurrentSlide(null)
    }

    // Reset dialog state
    setSlideToDelete(null)
  }, [currentPresentationId, slideToDelete, slides, currentSlideId, deleteSlide, setCurrentSlide])

  // Handle keyboard navigation within slide list
  const handleSlideKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index
      const slide = slides[index]

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          newIndex = index === 0 ? slides.length - 1 : index - 1
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          newIndex = index === slides.length - 1 ? 0 : index + 1
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = slides.length - 1
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (slide) {
            setCurrentSlide(slide.id)
          }
          return
        case 'Delete':
        case 'Backspace':
          // Open delete confirmation dialog for the current slide
          e.preventDefault()
          if (slide) {
            setSlideToDelete({ id: slide.id, title: slide.title, index })
            setIsDeleteDialogOpen(true)
          }
          return
        default:
          return
      }

      // Focus and select the new slide
      slideButtonRefs.current[newIndex]?.focus()
      const newSlide = slides[newIndex]
      if (newSlide) {
        setCurrentSlide(newSlide.id)
      }
    },
    [slides, setCurrentSlide]
  )

  const handleAddSlide = () => {
    if (currentPresentationId) {
      setIsLayoutSelectorOpen(true)
    }
  }

  const handleLayoutSelect = useCallback((layoutType: SlideLayoutType) => {
    if (currentPresentationId) {
      const newSlideId = addSlideWithLayout(currentPresentationId, layoutType, currentSlideId ?? undefined)
      if (newSlideId) {
        setCurrentSlide(newSlideId)
        // Focus the new slide after render
        setTimeout(() => {
          const newIndex = slides.length // New slide will be at the end
          slideButtonRefs.current[newIndex]?.focus()
        }, 100)
      }
    }
    setIsLayoutSelectorOpen(false)
  }, [currentPresentationId, currentSlideId, addSlideWithLayout, setCurrentSlide, slides.length])

  // Don't render if sidebar is closed
  if (!isSidebarOpen) {
    return null
  }

  // Panel classes with tablet-specific styling
  const panelClasses = cn(
    'slide-panel bg-white text-secondary-800 flex flex-col h-full transition-all duration-200 ease-smooth border-r border-secondary-200',
    isTablet && 'tablet-slide-panel',
    className
  )

  return (
    <nav
      id="slide-panel"
      className={panelClasses}
      style={{ width: 'var(--sidebar-width)' }}
      data-testid="slide-panel"
      aria-label="Slides navigation"
      data-tablet={isTablet}
    >
      {/* Header */}
      <div className="sidebar-header flex items-center justify-between px-4 py-3 border-b border-secondary-200">
        <h2 id="slides-heading" className="text-sm font-semibold text-secondary-700">
          Slides
        </h2>
        <div className="flex items-center gap-2">
          <span
            className="text-xs text-secondary-600 inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-100"
            aria-label={`${slides.length} slide${slides.length !== 1 ? 's' : ''} total`}
          >
            {slides.length}
          </span>
          {/* Close button for tablet mode */}
          {isTablet && (
            <button
              type="button"
              onClick={toggleSidebar}
              className={cn(
                'p-1.5 rounded-md transition-colors',
                'text-secondary-500 hover:text-secondary-800 hover:bg-secondary-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
              )}
              aria-label="Close slides panel"
              data-testid="tablet-close-slides"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slides list */}
      <div
        ref={slidesContainerRef}
        className="sidebar-content flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin p-2 space-y-1"
        data-testid="slides-list-container"
      >
        {slides.length === 0 ? (
          /* Empty state - not a listbox */
          <div
            className="text-center py-8 text-secondary-500 text-sm"
            role="status"
            aria-live="polite"
          >
            <p>No slides yet</p>
            <p className="text-xs mt-1">Click the button below to add a slide</p>
          </div>
        ) : (
          /* Listbox pattern for slides */
          <div
            role="listbox"
            aria-labelledby="slides-heading"
            aria-activedescendant={currentSlideId ? `slide-${currentSlideId}` : undefined}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                id={`slide-${slide.id}`}
                ref={(el) => {
                  slideItemRefs.current[index] = el
                }}
              >
                <SlideThumbnail
                  slide={slide}
                  index={index}
                  isSelected={slide.id === currentSlideId}
                  isDragging={slide.id === dragState.draggedSlideId}
                  isDropTarget={getDropPosition(index) !== null}
                  dropPosition={getDropPosition(index)}
                  onClick={() => handleSlideClick(slide.id)}
                  onKeyDown={(e) => handleSlideKeyDown(e, index)}
                  onDeleteClick={(e) => handleDeleteClick(e, slide, index)}
                  onDragStart={(e) => handleDragStart(e, slide.id, index)}
                  tabIndex={
                    slide.id === currentSlideId || (currentSlideIndex === -1 && index === 0)
                      ? 0
                      : -1
                  }
                  buttonRef={(el) => {
                    slideButtonRefs.current[index] = el
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add slide button */}
      <div className="p-3 border-t border-secondary-200">
        <Button
          type="button"
          className="w-full"
          onClick={handleAddSlide}
          data-testid="add-slide-button"
          disabled={!currentPresentationId}
          aria-label="Add new slide"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Slide
        </Button>
      </div>

      {/* Delete slide confirmation dialog */}
      <DeleteSlideDialog
        isOpen={isDeleteDialogOpen}
        slideTitle={slideToDelete?.title ?? ''}
        slideNumber={(slideToDelete?.index ?? 0) + 1}
        isLastSlide={slides.length === 1}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSlideToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
      />

      {/* Layout selector dialog */}
      <LayoutSelectorDialog
        isOpen={isLayoutSelectorOpen}
        onClose={() => setIsLayoutSelectorOpen(false)}
        onSelectLayout={handleLayoutSelect}
        title="Add New Slide"
        description="Choose a layout template for your new slide"
      />
    </nav>
  )
}

export default SlidePanel
