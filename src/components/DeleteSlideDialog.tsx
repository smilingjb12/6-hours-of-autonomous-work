import { useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { AlertTriangle } from 'lucide-react'

/**
 * Props for the DeleteSlideDialog component
 */
interface DeleteSlideDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** The title of the slide being deleted */
  slideTitle: string
  /** The slide number (1-indexed) */
  slideNumber: number
  /** Whether this is the last slide in the presentation */
  isLastSlide: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** Callback when deletion is confirmed */
  onConfirm: () => void
}

/**
 * Confirmation dialog for deleting a slide.
 * Warns the user about permanent deletion and asks for confirmation.
 *
 * WCAG 2.1 AA Compliant:
 * - Focus trap keeps focus within modal when open
 * - Focus returns to trigger element on close
 * - Escape key closes the dialog
 * - Proper ARIA attributes for alert dialog pattern
 * - Clear warning message with icon
 */
export function DeleteSlideDialog({
  isOpen,
  slideTitle,
  slideNumber,
  isLastSlide,
  onClose,
  onConfirm,
}: DeleteSlideDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  // Focus cancel button when dialog opens (safer default)
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const displayTitle = slideTitle || `Slide ${slideNumber}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="delete-slide-dialog"
        role="alertdialog"
        aria-describedby="delete-slide-description"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-100">
              <AlertTriangle className="h-5 w-5 text-error-600" aria-hidden="true" />
            </div>
            <DialogTitle>Delete Slide?</DialogTitle>
          </div>
          <DialogDescription id="delete-slide-description" className="pt-2">
            {isLastSlide ? (
              <>
                <span className="block text-error-600 font-medium mb-2">
                  This is the only slide in the presentation.
                </span>
                <span>
                  Deleting it will leave the presentation empty. Are you sure you want to delete{' '}
                  <strong className="text-secondary-700">{displayTitle}</strong>?
                </span>
              </>
            ) : (
              <>
                Are you sure you want to delete{' '}
                <strong className="text-secondary-700">{displayTitle}</strong>? This action cannot
                be undone and all content on this slide will be permanently lost.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            onClick={onClose}
            data-testid="delete-slide-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            data-testid="delete-slide-confirm-button"
            className="bg-error-600 hover:bg-error-700 text-white"
          >
            Delete Slide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteSlideDialog
