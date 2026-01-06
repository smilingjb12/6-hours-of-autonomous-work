/**
 * ImageUploadDialog Component
 * Dialog for uploading images via file input or URL
 *
 * Features:
 * - File input for local images
 * - Drag-and-drop support
 * - URL input for external images
 * - Image preview before insertion
 * - Alt text input for accessibility
 *
 * WCAG 2.1 AA Compliant:
 * - Focus trap keeps focus within modal when open
 * - Proper ARIA attributes for dialog pattern
 * - Accessible drag-and-drop zone with keyboard support
 */

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Upload, Link, Image as ImageIcon, X } from 'lucide-react'

/**
 * Props for the ImageUploadDialog component
 */
interface ImageUploadDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Callback when the dialog is closed */
  onClose: () => void
  /** Callback when an image is confirmed for insertion */
  onInsert: (imageSrc: string, alt: string) => void
}

/**
 * Maximum file size in bytes (5MB)
 */
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * Supported image types
 */
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']

/**
 * Dialog component for uploading and inserting images.
 * Supports both file upload and URL input methods.
 */
export function ImageUploadDialog({
  isOpen,
  onClose,
  onInsert,
}: ImageUploadDialogProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload')
  const [imageSrc, setImageSrc] = useState('')
  const [altText, setAltText] = useState('')
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('upload')
      setImageSrc('')
      setAltText('')
      setError('')
      setImagePreview(null)
      setIsDragging(false)
      setIsValidating(false)
    }
  }, [isOpen])

  /**
   * Validate and process an image file
   */
  const processFile = useCallback((file: File) => {
    setError('')

    // Validate file type
    if (!SUPPORTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please use JPEG, PNG, GIF, WebP, or SVG.')
      return
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError('File size exceeds 5MB limit. Please choose a smaller image.')
      return
    }

    // Read file as data URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setImageSrc(result)
      setImagePreview(result)
      // Auto-generate alt text from filename (without extension)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setAltText(nameWithoutExt)
    }
    reader.onerror = () => {
      setError('Failed to read the image file. Please try again.')
    }
    reader.readAsDataURL(file)
  }, [])

  /**
   * Handle file input change
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  /**
   * Handle drag events
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're leaving the drop zone
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  /**
   * Validate URL and load image preview
   */
  const validateUrl = useCallback(async (url: string) => {
    if (!url.trim()) {
      setImagePreview(null)
      return
    }

    setIsValidating(true)
    setError('')

    try {
      // Try to load the image
      const img = new window.Image()
      img.crossOrigin = 'anonymous'

      await new Promise<void>((resolve, reject) => {
        img.onload = () => { resolve(); }
        img.onerror = () => { reject(new Error('Failed to load image')); }
        img.src = url
      })

      setImagePreview(url)
      setIsValidating(false)
    } catch {
      setError('Could not load image from URL. Please check the URL and try again.')
      setImagePreview(null)
      setIsValidating(false)
    }
  }, [])

  /**
   * Handle URL input change
   */
  const handleUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value
      setImageSrc(url)
      // Debounce URL validation
      const timeoutId = setTimeout(() => {
        void validateUrl(url)
      }, 500)
      return () => { clearTimeout(timeoutId); }
    },
    [validateUrl]
  )

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()

      if (!imageSrc.trim()) {
        setError('Please select an image or enter a URL')
        return
      }

      if (!imagePreview) {
        setError('Please wait for the image to load')
        return
      }

      onInsert(imageSrc, altText.trim() || 'Image')
      onClose()
    },
    [imageSrc, altText, imagePreview, onInsert, onClose]
  )

  /**
   * Handle clicking the upload zone
   */
  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Handle keyboard activation of upload zone
   */
  const handleUploadKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleUploadClick()
      }
    },
    [handleUploadClick]
  )

  /**
   * Clear the current image
   */
  const clearImage = useCallback(() => {
    setImageSrc('')
    setImagePreview(null)
    setAltText('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const errorId = 'image-upload-error'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" data-testid="image-upload-dialog">
        <DialogHeader>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogDescription>
            Upload an image from your device or enter an image URL.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-4" role="tablist" aria-label="Image source options">
            <Button
              type="button"
              variant={activeTab === 'upload' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('upload')
                clearImage()
              }}
              role="tab"
              aria-selected={activeTab === 'upload'}
              aria-controls="upload-panel"
              data-testid="upload-tab"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <Button
              type="button"
              variant={activeTab === 'url' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                setActiveTab('url')
                clearImage()
              }}
              role="tab"
              aria-selected={activeTab === 'url'}
              aria-controls="url-panel"
              data-testid="url-tab"
            >
              <Link className="h-4 w-4 mr-2" />
              URL
            </Button>
          </div>

          <div className="space-y-4 py-2">
            {/* Upload Panel */}
            {activeTab === 'upload' && (
              <div
                id="upload-panel"
                role="tabpanel"
                aria-labelledby="upload-tab"
              >
                {/* File Input (hidden) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={SUPPORTED_TYPES.join(',')}
                  onChange={handleFileChange}
                  className="sr-only"
                  data-testid="image-file-input"
                  aria-label="Choose image file"
                />

                {/* Drop Zone */}
                <div
                  ref={dropZoneRef}
                  className={`
                    relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                    transition-colors duration-200
                    ${isDragging ? 'border-primary-500 bg-primary-50' : 'border-secondary-300 hover:border-secondary-400'}
                    ${imagePreview ? 'bg-secondary-50' : ''}
                  `}
                  onClick={handleUploadClick}
                  onKeyDown={handleUploadKeyDown}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  tabIndex={0}
                  role="button"
                  aria-label="Click to upload or drag and drop an image"
                  data-testid="image-drop-zone"
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearImage()
                        }}
                        aria-label="Remove image"
                        data-testid="clear-image-button"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageIcon
                        className="h-10 w-10 mx-auto text-secondary-400 mb-3"
                        aria-hidden="true"
                      />
                      <p className="text-sm text-secondary-600 mb-1">
                        <span className="font-medium text-primary-600">Click to upload</span>
                        {' '}or drag and drop
                      </p>
                      <p className="text-xs text-secondary-500">
                        PNG, JPG, GIF, WebP, SVG (max 5MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* URL Panel */}
            {activeTab === 'url' && (
              <div
                id="url-panel"
                role="tabpanel"
                aria-labelledby="url-tab"
              >
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="image-url">Image URL</Label>
                    <Input
                      ref={urlInputRef}
                      type="url"
                      id="image-url"
                      placeholder="https://example.com/image.jpg"
                      value={imageSrc}
                      onChange={handleUrlChange}
                      data-testid="image-url-input"
                      aria-describedby={error ? errorId : undefined}
                    />
                  </div>

                  {/* URL Preview */}
                  {isValidating && (
                    <p className="text-sm text-secondary-500">Loading preview...</p>
                  )}
                  {imagePreview && activeTab === 'url' && (
                    <div className="border rounded-lg p-2 bg-secondary-50">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="max-h-40 mx-auto rounded"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Alt Text Input */}
            <div className="space-y-2">
              <Label htmlFor="image-alt">
                Alt Text
                <span className="text-secondary-500 text-xs ml-2">(for accessibility)</span>
              </Label>
              <Input
                type="text"
                id="image-alt"
                placeholder="Describe the image..."
                value={altText}
                onChange={(e) => { setAltText(e.target.value); }}
                data-testid="image-alt-input"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p
                id={errorId}
                className="text-sm text-error-600"
                data-testid="image-upload-error"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </p>
            )}
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
            <Button
              type="submit"
              disabled={!imagePreview || isValidating}
              data-testid="dialog-insert-button"
            >
              Insert Image
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default ImageUploadDialog
