/**
 * ExportImageDialog Component
 * Dialog for exporting slides as PNG/JPG images with format and resolution options.
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
import { Image, Loader2 } from 'lucide-react'
import type { Presentation } from '@/types/presentation'
import {
  exportToImages,
  estimateImageSize,
  FORMAT_LABELS,
  RANGE_LABELS,
  RESOLUTION_SETTINGS,
  type ImageFormat,
  type ExportRange,
  type ResolutionPreset,
} from '@utils/imageExporter'

/**
 * Props for the ExportImageDialog component
 */
interface ExportImageDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** The presentation to export */
  presentation: Presentation | null
  /** Current slide ID for single slide export */
  currentSlideId: string | null
  /** Callback when export is complete */
  onExportComplete?: (success: boolean, exportedCount?: number, error?: string) => void
}

/**
 * Dialog component for exporting slides as images.
 * Allows the user to configure format, resolution, and export range.
 */
export function ExportImageDialog({
  isOpen,
  onClose,
  presentation,
  currentSlideId,
  onExportComplete,
}: ExportImageDialogProps) {
  const [format, setFormat] = useState<ImageFormat>('png')
  const [resolution, setResolution] = useState<ResolutionPreset>('high')
  const [range, setRange] = useState<ExportRange>('current')
  const [jpegQuality, setJpegQuality] = useState(90)
  const [isExporting, setIsExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFormat('png')
      setResolution('high')
      setRange('current')
      setJpegQuality(90)
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

    // Build options object, only including currentSlideId if it's defined
    const exportOptions: Parameters<typeof exportToImages>[1] = {
      format,
      resolution,
      range,
      jpegQuality,
      onProgress: setProgress,
    }
    if (currentSlideId) {
      exportOptions.currentSlideId = currentSlideId
    }

    const result = await exportToImages(presentation, exportOptions)

    setIsExporting(false)

    if (result.success) {
      onExportComplete?.(true, result.exportedCount)
      onClose()
    } else {
      setError(result.error || 'Export failed')
      onExportComplete?.(false, 0, result.error)
    }
  }, [presentation, format, resolution, range, jpegQuality, currentSlideId, onClose, onExportComplete])

  // Calculate estimated file size
  const slideCount = range === 'current' ? 1 : (presentation?.slides.length ?? 0)
  const estimatedSize = estimateImageSize(slideCount, format, resolution)

  const totalSlideCount = presentation?.slides.length ?? 0

  // Get current slide index for display
  const currentSlideIndex = presentation?.slides.findIndex(s => s.id === currentSlideId) ?? -1
  const currentSlideName = currentSlideIndex >= 0 ? `Slide ${currentSlideIndex + 1}` : 'Unknown'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isExporting && onClose()}>
      <DialogContent
        data-testid="export-image-dialog"
        aria-describedby="export-image-description"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" aria-hidden="true" />
            Export as Image
          </DialogTitle>
          <DialogDescription id="export-image-description">
            Export your slides as PNG or JPG images. Configure format and resolution settings below.
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
              {totalSlideCount} slide{totalSlideCount !== 1 ? 's' : ''} | Estimated size: {estimatedSize}
            </p>
          </div>

          {/* Export Range Selection */}
          <div className="space-y-2">
            <Label htmlFor="image-range">Export Range</Label>
            <Select
              value={range}
              onValueChange={(value) => setRange(value as ExportRange)}
              disabled={isExporting}
            >
              <SelectTrigger id="image-range" data-testid="image-range-select">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RANGE_LABELS) as ExportRange[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`range-${key}`}>
                    {RANGE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {range === 'current'
                ? `Will export ${currentSlideName}`
                : `Will export all ${totalSlideCount} slides as separate files`}
            </p>
          </div>

          {/* Format Selection */}
          <div className="space-y-2">
            <Label htmlFor="image-format">Image Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ImageFormat)}
              disabled={isExporting}
            >
              <SelectTrigger id="image-format" data-testid="image-format-select">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FORMAT_LABELS) as ImageFormat[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`format-${key}`}>
                    {FORMAT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {format === 'png'
                ? 'Lossless quality, best for graphics and text'
                : 'Smaller file size, best for photos'}
            </p>
          </div>

          {/* Resolution Selection */}
          <div className="space-y-2">
            <Label htmlFor="image-resolution">Resolution</Label>
            <Select
              value={resolution}
              onValueChange={(value) => setResolution(value as ResolutionPreset)}
              disabled={isExporting}
            >
              <SelectTrigger id="image-resolution" data-testid="image-resolution-select">
                <SelectValue placeholder="Select resolution" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(RESOLUTION_SETTINGS) as ResolutionPreset[]).map((key) => (
                  <SelectItem key={key} value={key} data-testid={`resolution-${key}`}>
                    {RESOLUTION_SETTINGS[key].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-secondary-500">
              {RESOLUTION_SETTINGS[resolution].description}
            </p>
          </div>

          {/* JPEG Quality Slider (only for JPEG format) */}
          {format === 'jpg' && (
            <div className="space-y-2">
              <Label htmlFor="jpeg-quality">JPEG Quality: {jpegQuality}%</Label>
              <input
                type="range"
                id="jpeg-quality"
                min="10"
                max="100"
                value={jpegQuality}
                onChange={(e) => setJpegQuality(Number(e.target.value))}
                disabled={isExporting}
                className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                data-testid="jpeg-quality-slider"
              />
              <p className="text-xs text-secondary-500">
                Higher quality means larger file size
              </p>
            </div>
          )}

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
            disabled={isExporting || !presentation || totalSlideCount === 0}
            data-testid="export-image-button"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <Image className="mr-2 h-4 w-4" aria-hidden="true" />
                Export {range === 'current' ? 'Image' : 'Images'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ExportImageDialog
