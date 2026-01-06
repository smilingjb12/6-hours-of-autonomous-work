/**
 * PDF Exporter utility for exporting presentations to PDF format.
 * Uses jsPDF library for PDF generation and SlideCanvasRenderer for slide rendering.
 */

import { jsPDF } from 'jspdf'
import type { Presentation, Slide } from '@/types/presentation'
import { SlideCanvasRenderer } from './SlideCanvasRenderer'

/**
 * Page layout options for PDF export
 */
export type PageLayout = 'landscape' | 'portrait'

/**
 * Quality settings for PDF export
 */
export type QualitySetting = 'low' | 'medium' | 'high'

/**
 * Configuration options for PDF export
 */
export interface PdfExportOptions {
  /** Page layout orientation */
  layout: PageLayout
  /** Export quality setting */
  quality: QualitySetting
  /** Whether to include slide notes */
  includeNotes: boolean
  /** Callback for progress updates (0-100) */
  onProgress?: (progress: number) => void
}

/**
 * Default export options
 */
export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  layout: 'landscape',
  quality: 'high',
  includeNotes: false,
}

/**
 * Quality settings mapped to DPI and compression
 */
const QUALITY_SETTINGS: Record<QualitySetting, { dpi: number; compression: 'NONE' | 'FAST' | 'MEDIUM' | 'SLOW' }> = {
  low: { dpi: 72, compression: 'FAST' },
  medium: { dpi: 150, compression: 'MEDIUM' },
  high: { dpi: 300, compression: 'SLOW' },
}

/**
 * Standard slide dimensions (16:9 aspect ratio)
 */
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

/**
 * PDF page dimensions in mm (A4 based)
 */
const PAGE_DIMENSIONS = {
  landscape: { width: 297, height: 210 }, // A4 landscape
  portrait: { width: 210, height: 297 }, // A4 portrait
}

/**
 * Result type for PDF export operations
 */
export interface PdfExportResult {
  success: boolean
  error?: string
}

/**
 * Render a slide to a canvas and return as data URL
 */
async function renderSlideToImage(
  slide: Slide,
  quality: QualitySetting
): Promise<string> {
  // Create an offscreen canvas
  const canvas = document.createElement('canvas')
  const { dpi } = QUALITY_SETTINGS[quality]

  // Calculate scale factor based on DPI (72 is base DPI)
  const scaleFactor = dpi / 72

  // Set canvas dimensions based on quality
  canvas.width = SLIDE_WIDTH * scaleFactor
  canvas.height = SLIDE_HEIGHT * scaleFactor
  canvas.style.width = `${SLIDE_WIDTH}px`
  canvas.style.height = `${SLIDE_HEIGHT}px`

  // Create renderer with BASE dimensions as the logical coordinate system
  // The scaleFactor is passed as devicePixelRatio so the renderer scales
  // all content correctly while keeping coordinates in 960x540 space
  const renderer = new SlideCanvasRenderer(canvas, {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    devicePixelRatio: scaleFactor,
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

  // Convert to data URL with appropriate quality
  const imageQuality = quality === 'low' ? 0.7 : quality === 'medium' ? 0.85 : 0.95
  return canvas.toDataURL('image/jpeg', imageQuality)
}

/**
 * Export a presentation to PDF format
 */
export async function exportToPdf(
  presentation: Presentation,
  options: Partial<PdfExportOptions> = {}
): Promise<PdfExportResult> {
  const config: PdfExportOptions = { ...DEFAULT_PDF_OPTIONS, ...options }
  const { layout, quality, includeNotes, onProgress } = config

  try {
    // Initialize PDF document
    const pageSize = PAGE_DIMENSIONS[layout]
    const pdf = new jsPDF({
      orientation: layout,
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const totalSlides = presentation.slides.length

    if (totalSlides === 0) {
      return { success: false, error: 'Presentation has no slides to export' }
    }

    // Calculate slide area on page (with margins)
    const margin = 10 // mm
    const availableWidth = pageSize.width - (margin * 2)
    const availableHeight = pageSize.height - (margin * 2)

    // Calculate slide dimensions maintaining aspect ratio
    const slideAspectRatio = SLIDE_WIDTH / SLIDE_HEIGHT
    const pageAspectRatio = availableWidth / availableHeight

    let slideWidth: number
    let slideHeight: number

    if (slideAspectRatio > pageAspectRatio) {
      // Slide is wider than available area
      slideWidth = availableWidth
      slideHeight = slideWidth / slideAspectRatio
    } else {
      // Slide is taller than available area
      slideHeight = availableHeight
      slideWidth = slideHeight * slideAspectRatio
    }

    // Center the slide on the page
    const xOffset = margin + (availableWidth - slideWidth) / 2
    const yOffset = margin + (availableHeight - slideHeight) / 2

    // Process each slide
    for (let i = 0; i < totalSlides; i++) {
      const slide = presentation.slides[i]

      if (!slide) continue

      // Add new page for slides after the first
      if (i > 0) {
        pdf.addPage()
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 0.5) / totalSlides) * 100))
      }

      // Render slide to image
      const imageData = await renderSlideToImage(slide, quality)

      // Add image to PDF
      pdf.addImage(
        imageData,
        'JPEG',
        xOffset,
        yOffset,
        slideWidth,
        slideHeight,
        undefined,
        QUALITY_SETTINGS[quality].compression
      )

      // Add slide notes if enabled
      if (includeNotes && slide.notes?.trim()) {
        pdf.setFontSize(8)
        pdf.setTextColor(100, 100, 100)
        const notesY = yOffset + slideHeight + 5
        const notesText = `Notes: ${slide.notes}`
        const splitNotes = pdf.splitTextToSize(notesText, availableWidth) as string[]
        pdf.text(splitNotes, margin, notesY)
      }

      // Report progress
      if (onProgress) {
        onProgress(Math.round(((i + 1) / totalSlides) * 100))
      }
    }

    // Generate filename
    const sanitizedName = presentation.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()
    const filename = `${sanitizedName}_presentation.pdf`

    // Save the PDF
    pdf.save(filename)

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return { success: false, error: `Failed to export PDF: ${errorMessage}` }
  }
}

/**
 * Get estimated file size for PDF export (in MB)
 */
export function estimatePdfSize(slideCount: number, quality: QualitySetting): string {
  // Rough estimates based on quality and slide count
  const sizePerSlide: Record<QualitySetting, number> = {
    low: 0.1, // ~100KB per slide
    medium: 0.3, // ~300KB per slide
    high: 0.6, // ~600KB per slide
  }

  const estimatedMB = slideCount * sizePerSlide[quality]

  if (estimatedMB < 1) {
    return `~${Math.round(estimatedMB * 1024)} KB`
  }
  return `~${estimatedMB.toFixed(1)} MB`
}

/**
 * Quality setting display names
 */
export const QUALITY_LABELS: Record<QualitySetting, string> = {
  low: 'Low (72 DPI)',
  medium: 'Medium (150 DPI)',
  high: 'High (300 DPI)',
}

/**
 * Layout display names
 */
export const LAYOUT_LABELS: Record<PageLayout, string> = {
  landscape: 'Landscape',
  portrait: 'Portrait',
}
