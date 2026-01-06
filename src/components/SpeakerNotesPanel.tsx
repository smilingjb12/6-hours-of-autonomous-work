/**
 * SpeakerNotesPanel Component
 * A collapsible panel below the canvas for viewing and editing speaker notes
 *
 * WCAG 2.1 AA Compliant:
 * - Proper form field labeling
 * - Keyboard accessible expand/collapse
 * - ARIA attributes for panel state
 */

import { useState, useCallback, useMemo } from 'react'
import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { useHistoryStore } from '@stores/historyStore'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import { cn } from '@lib/utils'
import { ChevronUp, ChevronDown, StickyNote } from 'lucide-react'

/**
 * Props for SpeakerNotesPanel component
 */
interface SpeakerNotesPanelProps {
  /** Optional class name for custom styling */
  className?: string
}

/**
 * SpeakerNotesPanel displays and allows editing of speaker notes for the current slide
 * Features a collapsible design to maximize canvas space when not needed
 */
export function SpeakerNotesPanel({ className = '' }: SpeakerNotesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Get presentation data - subscribe to presentations directly for proper reactivity
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const updateSlide = usePresentationStore((state) => state.updateSlide)

  // Get editor state
  const currentSlideId = useEditorStore((state) => state.currentSlideId)

  // Get history store for undo support
  const recordSnapshot = useHistoryStore((state) => state.recordSnapshot)

  // Derive current slide from subscribed data for proper reactivity
  const currentSlide = useMemo(() => {
    if (!currentPresentationId || !currentSlideId) return null
    const presentation = presentations.find((p) => p.id === currentPresentationId)
    return presentation?.slides.find((s) => s.id === currentSlideId) ?? null
  }, [presentations, currentPresentationId, currentSlideId])

  // Handler for updating notes
  const handleNotesUpdate = useCallback(
    (notes: string) => {
      if (currentPresentationId && currentSlideId) {
        recordSnapshot('Update speaker notes')
        updateSlide(currentPresentationId, currentSlideId, { notes })
      }
    },
    [currentPresentationId, currentSlideId, updateSlide, recordSnapshot]
  )

  // Toggle panel expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev)
  }, [])

  // Don't render if no slide is selected
  if (!currentSlide) {
    return null
  }

  const panelClasses = cn(
    'speaker-notes-panel bg-white border-t border-secondary-200 transition-all duration-200 ease-smooth',
    isExpanded ? 'h-40' : 'h-10',
    className
  )

  return (
    <div
      className={panelClasses}
      data-testid="speaker-notes-panel"
      role="region"
      aria-label="Speaker notes panel"
      aria-expanded={isExpanded}
    >
      {/* Header - always visible */}
      <div className="flex items-center justify-between px-4 h-10 border-b border-secondary-100">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-secondary-500" aria-hidden="true" />
          <span className="text-sm font-medium text-secondary-700">
            Speaker Notes
          </span>
          {!isExpanded && currentSlide.notes && (
            <span className="text-xs text-secondary-400 truncate max-w-xs">
              {currentSlide.notes.slice(0, 50)}
              {currentSlide.notes.length > 50 ? '...' : ''}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleExpanded}
          aria-label={isExpanded ? 'Collapse notes panel' : 'Expand notes panel'}
          aria-expanded={isExpanded}
          data-testid="toggle-notes-panel"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Notes textarea - visible when expanded */}
      {isExpanded && (
        <div className="p-2 h-[calc(100%-2.5rem)]">
          <Textarea
            className="h-full w-full resize-none text-sm"
            placeholder="Add speaker notes for this slide... (visible only to the presenter)"
            value={currentSlide.notes}
            onChange={(e) => handleNotesUpdate(e.target.value)}
            aria-label="Speaker notes for current slide"
            data-testid="speaker-notes-textarea"
          />
        </div>
      )}
    </div>
  )
}

export default SpeakerNotesPanel
