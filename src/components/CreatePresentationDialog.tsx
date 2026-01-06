import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'

/**
 * Props for the CreatePresentationDialog component
 */
interface CreatePresentationDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** Callback when a new presentation is created */
  onCreate: (name: string) => void
}

/**
 * Dialog component for creating a new presentation.
 * Allows the user to enter a name for the presentation before creating it.
 *
 * WCAG 2.1 AA Compliant:
 * - Focus trap keeps focus within modal when open
 * - Focus returns to trigger element on close
 * - Escape key closes the dialog
 * - Proper ARIA attributes for dialog pattern
 * - Error messages associated with inputs
 */
export function CreatePresentationDialog({
  isOpen,
  onClose,
  onCreate,
}: CreatePresentationDialogProps) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('')
      setError('')
      // Focus input after a brief delay to ensure the dialog is rendered
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Please enter a presentation name')
      inputRef.current?.focus()
      return
    }

    onCreate(trimmedName)
    onClose()
  }

  const errorId = 'presentation-name-error'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent data-testid="create-presentation-dialog">
        <DialogHeader>
          <DialogTitle>Create New Presentation</DialogTitle>
          <DialogDescription>
            A new presentation will be created with one blank slide.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presentation-name">
                Presentation Name
                <span className="text-error-500 ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                ref={inputRef}
                type="text"
                id="presentation-name"
                className={error ? 'border-error-500 focus-visible:ring-error-500' : ''}
                placeholder="Enter presentation name..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError('')
                }}
                data-testid="presentation-name-input"
                aria-required="true"
                aria-invalid={!!error}
                aria-describedby={error ? errorId : undefined}
                autoComplete="off"
              />
              {error && (
                <p
                  id={errorId}
                  className="text-sm text-error-600"
                  data-testid="input-error"
                  role="alert"
                  aria-live="assertive"
                >
                  {error}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="dialog-cancel-button"
            >
              Cancel
            </Button>
            <Button type="submit" data-testid="dialog-create-button">
              Create Presentation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default CreatePresentationDialog
