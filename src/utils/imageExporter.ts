/**
 * Image Exporter utility for exporting slides as PNG/JPG images.
 * Supports exporting individual slides or all slides with configurable resolution and format.
 */

import type { Presentation, Slide } from '@/types/presentation'
import { SlideCanvasRenderer } from './SlideCanvasRenderer'

/**
 * Supported image formats
 */
export type ImageFormat = 'png' | 'jpg'

/**
 * Resolution presets for image export
 */
export type ResolutionPreset = 'standard' | 'high' | 'ultra'

/**
 * Export range options
 */
export type ExportRange = 'current' | 'all'

/**
 * Configuration options for image export
 */
export interface ImageExportOptions {
  /** Image format (PNG or JPG) */
  format: ImageFormat
  /** Resolution preset */
  resolution: ResolutionPreset
  /** Export range (current slide or all slides) */
  range: ExportRange
  /** JPEG quality (0-100), only used for JPG format */
  jpegQuality: number
  /** Callback for progress updates (0-100) */
  onProgress?: (progress: number) => void
  /** Current slide ID (required when range is 'current') */
  currentSlideId?: string
}

/**
 * Default export options
 */
export const DEFAULT_IMAGE_OPTIONS: ImageExportOptions = {
  format: 'png',
  resolution: 'high',
  range: 'current',
  jpegQuality: 90,
}

/**
 * Resolution settings mapped to scale factors
 */
export const RESOLUTION_SETTINGS: Record<ResolutionPreset, { scale: number; label: string; description: string }> = {
  standard: { scale: 1, label: 'Standard (960x540)', description: 'Original slide size, smallest file' },
  high: { scale: 2, label: 'High (1920x1080)', description: 'Full HD, good for most uses' },
  ultra: { scale: 4, label: 'Ultra (3840x2160)', description: '4K quality, largest file' },
}

/**
 * Format display labels
 */
export const FORMAT_LABELS: Record<ImageFormat, string> = {
  png: 'PNG (Lossless)',
  jpg: 'JPEG (Smaller size)',
}

/**
 * Range display labels
 */
export const RANGE_LABELS: Record<ExportRange, string> = {
  current: 'Current Slide',
  all: 'All Slides',
}

/**
 * Standard slide dimensions (16:9 aspect ratio)
 */
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

/**
 * Result type for image export operations
 */
export interface ImageExportResult {
  success: boolean
  exportedCount?: number
  error?: string
}

/**
 * Render a slide to an image data URL
 */
async function renderSlideToImage(
  slide: Slide,
  format: ImageFormat,
  resolution: ResolutionPreset,
  jpegQuality: number
): Promise<string> {
  // Create an offscreen canvas
  const canvas = document.createElement('canvas')
  const { scale } = RESOLUTION_SETTINGS[resolution]

  // Set canvas dimensions based on resolution
  canvas.width = SLIDE_WIDTH * scale
  canvas.height = SLIDE_HEIGHT * scale
  canvas.style.width = `${SLIDE_WIDTH}px`
  canvas.style.height = `${SLIDE_HEIGHT}px`

  // Create renderer with BASE dimensions as the logical coordinate system
  // The scale is passed as devicePixelRatio so the renderer scales
  // all content correctly while keeping coordinates in 960x540 space
  const renderer = new SlideCanvasRenderer(canvas, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    devicePixelRatio: scale,
  })

  // Preload images for this slide
  await renderer.preloadImages(slide)

  // Render the slide with zoom=1 (scaling is handled by devicePixelRatio)
  renderer.render(slide, { zoom: 1, panX: 0, panY: 0 }, {
    showGrid: false,
    showSelectionHandles: false,
    selectedElementIds: [],
    hoveredElementId: null,
  })

  // Convert to data URL with appropriate format and quality
  const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
  const quality = format === 'jpg' ? jpegQuality / 100 : undefined

  return canvas.toDataURL(mimeType, quality)
}

/**
 * Convert a data URL to a Blob
 */
function dataURLToBlob(dataURL: string): Blob {
  const parts = dataURL.split(',')
  const mimeMatch = parts[0]?.match(/:(.*?);/)
  const mimeType = mimeMatch ? mimeMatch[1] ?? 'image/png' : 'image/png'
  const base64Data = parts[1] || ''
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

/**
 * Download an image from a data URL
 */
function downloadImage(dataURL: string, filename: string): void {
  const blob = dataURLToBlob(dataURL)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize filename by removing invalid characters
 */
function sanitizeFilename(name: string): string {
  return name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
}

/**
 * Export a single slide as an image
 */
export async function exportSlideToImage(
  slide: Slide,
  presentationName: string,
  slideIndex: number,
  options: Partial<ImageExportOptions> = {}
): Promise<ImageExportResult> {
  const config = { ...DEFAULT_IMAGE_OPTIONS, ...options }
  const { format, resolution, jpegQuality } = config

  try {
    // Render slide to image
    const imageData = await renderSlideToImage(slide, format, resolution, jpegQuality)

    // Generate filename
    const sanitizedName = sanitizeFilename(presentationName)
    const extension = format === 'png' ? 'png' : 'jpg'
    const filename = `${sanitizedName}_slide_${slideIndex + 1}.${extension}`

    // Download the image
    downloadImage(imageData, filename)

    return { success: true, exportedCount: 1 }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: `Failed to export slide: ${errorMessage}` }
  }
}

/**
 * Export multiple slides as images
 */
export async function exportSlidesToImages(
  slides: Slide[],
  presentationName: string,
  options: Partial<ImageExportOptions> = {}
): Promise<ImageExportResult> {
  const config = { ...DEFAULT_IMAGE_OPTIONS, ...options }
  const { format, resolution, jpegQuality, onProgress } = config

  if (slides.length === 0) {
    return { success: false, error: 'No slides to export' }
  }

  try {
    const totalSlides = slides.length
    const sanitizedName = sanitizeFilename(presentationName)
    const extension = format === 'png' ? 'png' : 'jpg'

    for (let i = 0; i < totalSlides; i++) {
      const slide = slides[i]
      if (!slide) continue

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 0.5) / totalSlides) * 100))
      }

      // Render slide to image
      const imageData = await renderSlideToImage(slide, format, resolution, jpegQuality)

      // Generate filename
      const filename = `${sanitizedName}_slide_${i + 1}.${extension}`

      // Download the image with a small delay to prevent browser blocking
      downloadImage(imageData, filename)

      // Small delay between downloads to prevent browser from blocking
      if (i < totalSlides - 1) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalSlides) * 100))
      }
    }

    return { success: true, exportedCount: totalSlides }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: `Failed to export slides: ${errorMessage}` }
  }
}

/**
 * Main export function that handles both single and multiple slides
 */
export async function exportToImages(
  presentation: Presentation,
  options: Partial<ImageExportOptions> = {}
): Promise<ImageExportResult> {
  const config = { ...DEFAULT_IMAGE_OPTIONS, ...options }
  const { range, currentSlideId, onProgress } = config

  if (presentation.slides.length === 0) {
    return { success: false, error: 'Presentation has no slides to export' }
  }

  if (range === 'current') {
    // Export current slide only
    const slideIndex = presentation.slides.findIndex(s => s.id === currentSlideId)
    if (slideIndex === -1) {
      return { success: false, error: 'Current slide not found' }
    }
    const slide = presentation.slides[slideIndex]
    if (!slide) {
      return { success: false, error: 'Current slide not found' }
    }
    return exportSlideToImage(slide, presentation.name, slideIndex, config)
  } else {
    // Export all slides - only include onProgress if defined
    const exportConfig: Partial<ImageExportOptions> = { ...config }
    if (onProgress) {
      exportConfig.onProgress = onProgress
    }
    return exportSlidesToImages(presentation.slides, presentation.name, exportConfig)
  }
}

/**
 * Estimate file size for image export
 */
export function estimateImageSize(
  slideCount: number,
  format: ImageFormat,
  resolution: ResolutionPreset
): string {
  const { scale } = RESOLUTION_SETTINGS[resolution]
  const pixelCount = SLIDE_WIDTH * scale * SLIDE_HEIGHT * scale

  // Rough estimates based on typical compression
  let bytesPerPixel: number
  if (format === 'png') {
    bytesPerPixel = 2 // PNG with compression
  } else {
    bytesPerPixel = 0.5 // JPEG with high quality
  }

  const bytesPerSlide = pixelCount * bytesPerPixel
  const totalBytes = bytesPerSlide * slideCount

  if (totalBytes < 1024) {
    return `~${totalBytes} B`
  } else if (totalBytes < 1024 * 1024) {
    return `~${Math.round(totalBytes / 1024)} KB`
  } else {
    return `~${(totalBytes / (1024 * 1024)).toFixed(1)} MB`
  }
}
