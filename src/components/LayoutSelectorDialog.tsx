/**
 * LayoutSelectorDialog Component
 * Dialog for selecting slide layouts when creating or changing slides
 *
 * WCAG 2.1 AA Compliant:
 * - Focus trap within dialog
 * - Keyboard navigation with arrow keys
 * - Screen reader announcements
 * - Clear visual focus indicators
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { cn } from '@lib/utils'
import { SLIDE_LAYOUTS, type SlideLayoutType, type SlideLayoutMeta } from '../types/layout'

/**
 * Props for LayoutSelectorDialog
 */
interface LayoutSelectorDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when dialog closes */
  onClose: () => void
  /** Callback when a layout is selected */
  onSelectLayout: (layoutType: SlideLayoutType) => void
  /** Title for the dialog */
  title?: string
  /** Description for the dialog */
  description?: string
}

/**
 * Render a visual preview of the layout
 */
function LayoutPreview({ layoutType }: { layoutType: SlideLayoutType }) {
  return (
    <div className="w-full aspect-[16/9] bg-white border border-secondary-200 rounded-sm overflow-hidden relative">
      {layoutType === 'blank' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-secondary-300 text-xs">Blank</span>
        </div>
      )}
      {layoutType === 'title' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
          <div className="w-3/4 h-3 bg-secondary-300 rounded" />
          <div className="w-1/2 h-2 bg-secondary-200 rounded" />
        </div>
      )}
      {layoutType === 'title-content' && (
        <div className="absolute inset-0 flex flex-col p-2 gap-1">
          <div className="w-3/4 h-2 bg-secondary-300 rounded" />
          <div className="flex-1 w-full bg-secondary-100 rounded mt-1" />
        </div>
      )}
      {layoutType === 'two-column' && (
        <div className="absolute inset-0 flex flex-col p-2 gap-1">
          <div className="w-3/4 h-2 bg-secondary-300 rounded" />
          <div className="flex-1 flex gap-1 mt-1">
            <div className="flex-1 bg-secondary-100 rounded" />
            <div className="flex-1 bg-secondary-100 rounded" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual layout option card
 */
interface LayoutCardProps {
  layout: SlideLayoutMeta
  isSelected: boolean
  onSelect: () => void
  onKeyDown: (e: React.KeyboardEvent) => void
  tabIndex: number
  buttonRef: (el: HTMLButtonElement | null) => void
}

function LayoutCard({
  layout,
  isSelected,
  onSelect,
  onKeyDown,
  tabIndex,
  buttonRef,
}: LayoutCardProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onSelect}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      className={cn(
        'flex flex-col items-center p-3 rounded-lg border-2 transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'hover:border-primary-400 hover:bg-primary-50',
        isSelected
          ? 'border-primary-500 bg-primary-50 shadow-sm'
          : 'border-secondary-200 bg-white'
      )}
      role="option"
      aria-selected={isSelected}
      data-testid={`layout-option-${layout.id}`}
    >
      <LayoutPreview layoutType={layout.id} />
      <div className="mt-2 text-center">
        <div className={cn(
          'font-medium text-sm',
          isSelected ? 'text-primary-700' : 'text-secondary-900'
        )}>
          {layout.name}
        </div>
        <div className="text-xs text-secondary-500 mt-0.5">
          {layout.description}
        </div>
      </div>
    </button>
  )
}

/**
 * LayoutSelectorDialog allows users to select a layout for a new or existing slide
 */
export function LayoutSelectorDialog({
  isOpen,
  onClose,
  onSelectLayout,
  title = 'Choose a Layout',
  description = 'Select a layout template for your slide',
}: LayoutSelectorDialogProps) {
  const [selectedLayout, setSelectedLayout] = useState<SlideLayoutType>('blank')
  const [focusedIndex, setFocusedIndex] = useState(0)
  const layoutRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedLayout('blank')
      setFocusedIndex(0)
      // Focus first layout option after dialog opens
      setTimeout(() => {
        layoutRefs.current[0]?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleConfirm = useCallback((layoutType?: SlideLayoutType) => {
    onSelectLayout(layoutType ?? selectedLayout)
    onClose()
  }, [selectedLayout, onSelectLayout, onClose])

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex = index === SLIDE_LAYOUTS.length - 1 ? 0 : index + 1
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex = index === 0 ? SLIDE_LAYOUTS.length - 1 : index - 1
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = SLIDE_LAYOUTS.length - 1
          break
        case 'Enter':
        case ' ': {
          e.preventDefault()
          const layout = SLIDE_LAYOUTS[index]
          if (layout) {
            handleConfirm(layout.id)
          }
          return
        }
        default:
          return
      }

      setFocusedIndex(newIndex)
      const newLayout = SLIDE_LAYOUTS[newIndex]
      if (newLayout) {
        setSelectedLayout(newLayout.id)
      }
      layoutRefs.current[newIndex]?.focus()
    },
    [handleConfirm]
  )

  const handleLayoutClick = useCallback((layout: SlideLayoutMeta, index: number) => {
    setSelectedLayout(layout.id)
    setFocusedIndex(index)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl"
        data-testid="layout-selector-dialog"
        aria-labelledby="layout-dialog-title"
        aria-describedby="layout-dialog-description"
      >
        <DialogHeader>
          <DialogTitle id="layout-dialog-title">{title}</DialogTitle>
          <DialogDescription id="layout-dialog-description">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Layout options grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4"
          role="listbox"
          aria-label="Slide layouts"
        >
          {SLIDE_LAYOUTS.map((layout, index) => (
            <LayoutCard
              key={layout.id}
              layout={layout}
              isSelected={selectedLayout === layout.id}
              onSelect={() => { handleLayoutClick(layout, index); }}
              onKeyDown={(e) => { handleKeyDown(e, index); }}
              tabIndex={index === focusedIndex ? 0 : -1}
              buttonRef={(el) => {
                layoutRefs.current[index] = el
              }}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-testid="layout-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => { handleConfirm(); }}
            data-testid="layout-confirm-button"
          >
            Create Slide
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default LayoutSelectorDialog
