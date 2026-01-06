/**
 * ExportPdfDialog Component
 * Dialog for exporting presentations to PDF format with layout and quality options.
 *
 * WCAG 2.1 AA Compliant:
 * - Focus trap keeps focus within modal when open
 * - Focus returns to trigger element on close
 * - Escape key closes the dialog
 * - Proper ARIA attributes for dialog pattern
 * - Progress updates announced to screen readers
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog'
import { Button } from '@components/ui/button'
import { Label } from '@components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { FileDown, Loader2 } from 'lucide-react'
import type { Presentation } from '@/types/presentation'
import {
  exportToPdf,
  estimatePdfSize,
  QUALITY_LABELS,
  LAYOUT_LABELS,
  type PageLayout,
  type QualitySetting,
} from '@utils/pdfExporter'

/**
 * Props for the ExportPdfDialog component
 */
interface ExportPdfDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** The presentation to export */
  presentation: Presentation | null
  /** Callback when export is complete */
  onExportComplete?: (success: boolean, error?: string) => void
}

/**
 * Dialog component for exporting presentations to PDF.
 * Allows the user to configure layout and quality settings.
 */
export function ExportPdfDialog({
  isOpen,
  onClose,
  presentation,
  onExportComplete,
}: ExportPdfDialogProps) {
  const [layout, setLayout] = useState<PageLayout>('landscape')
  const [quality, setQuality] = useState<QualitySetting>('high')
  const [includeNotes, setIncludeNotes] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLayout('landscape')
      setQuality('high')
      setIncludeNotes(false)
      setIsExporting(false)
      setProgress(0)
      setError('')
    }
  }, [isOpen])

  // Handle export
  const handleExport = useCallback(async () => {
    if (!presentation) {
      setError('No presentation selected')
      return
    }

    setIsExporting(true)
    setProgress(0)
    setError('')

    const result = await exportToPdf(presentation, {
      layout,
      quality,
      includeNotes,
      onProgress: setProgress,
    })

    setIsExporting(false)

    if (result.success) {
      onExportComplete?.(true)
      onClose()
    } else {
      setError(result.error || 'Export failed')
      onExportComplete?.(false, result.error)
    }
  }, [presentation, layout, quality, includeNotes, onClose, onExportComplete])

  // Calculate estimated file size
  const estimatedSize = presentation
    ? estimatePdfSize(presentation.slides.length, quality)
    : '0 KB'

  const slideCount = presentation?.slides.length ?? 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExporting && onClose()}>
      <DialogContent
        data-testid="export-pdf-dialog"
        aria-describedby="export-pdf-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5" aria-hidden="true" />
            Export to PDF
          </DialogTitle>
          <DialogDescription id="export-pdf-description">
            Export your presentation as a PDF document. Configure layout and quality settings below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Presentation Info */}
          <div className="rounded-md bg-secondary-50 p-3">
            <p className="text-sm text-secondary-700">
              <span className="font-medium">Presentation:</span>{' '}
              {presentation?.name ?? 'None selected'}
            </p>
            <p className="text-sm text-secondary-600 mt-1">
              {slideCount} slide{slideCount !== 1 ? 's' : ''} | Estimated size: {estimatedSize}
            </p>
          </div>

          {/* Layout Selection */}
          <div className="space-y-2">
            <Label htmlFor="pdf-layout">Page Layout</Label>
            <Select
              value={layout}
              onValueChange={(value) => { setLayout(value as PageLayout); }}
              disabled={isExporting}
            >
              <SelectTrigger id="pdf-layout" data-testid="pdf-layout-select">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LAYOUT_LABELS) as PageLayout[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`layout-${key}`}>
                    {LAYOUT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {layout === 'landscape'
                ? 'Best for standard 16:9 presentations'
                : 'Better for printing on standard paper'}
            </p>
          </div>

          {/* Quality Selection */}
          <div className="space-y-2">
            <Label htmlFor="pdf-quality">Export Quality</Label>
            <Select
              value={quality}
              onValueChange={(value) => { setQuality(value as QualitySetting); }}
              disabled={isExporting}
            >
              <SelectTrigger id="pdf-quality" data-testid="pdf-quality-select">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(QUALITY_LABELS) as QualitySetting[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`quality-${key}`}>
                    {QUALITY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {quality === 'high'
                ? 'Best for printing, larger file size'
                : quality === 'medium'
                  ? 'Good balance of quality and file size'
                  : 'Smallest file size, lower image quality'}
            </p>
          </div>

          {/* Include Notes Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="include-notes"
              checked={includeNotes}
              onChange={(e) => { setIncludeNotes(e.target.checked); }}
              disabled={isExporting}
              className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
              data-testid="include-notes-checkbox"
            />
            <Label htmlFor="include-notes" className="text-sm font-normal cursor-pointer">
              Include slide notes
            </Label>
          </div>

          {/* Progress Bar */}
          {isExporting && (
            <div className="space-y-2" role="status" aria-live="polite">
              <div className="flex items-center justify-between text-sm">
                <span className="text-secondary-600">Exporting...</span>
                <span className="text-secondary-700 font-medium">{progress}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary-200 overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Export progress"
                />
              </div>
              <p className="text-xs text-secondary-500 sr-only">
                Export progress: {progress} percent complete
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div
              className="rounded-md bg-error-50 border border-error-200 p-3"
              role="alert"
              aria-live="assertive"
              data-testid="export-error"
            >
              <p className="text-sm text-error-700">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isExporting}
            data-testid="export-cancel-button"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting || !presentation || slideCount === 0}
            data-testid="export-pdf-button"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" aria-hidden="true" />
                Export PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportPdfDialog
