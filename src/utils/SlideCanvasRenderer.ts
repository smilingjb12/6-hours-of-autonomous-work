/**
 * SlideCanvasRenderer - HTML5 Canvas rendering engine for slide presentations
 *
 * This class handles all rendering operations for the slide editor including:
 * - Slide background rendering (solid, gradient, image)
 * - Element rendering (text, shapes, images)
 * - Viewport transformations (zoom, pan)
 * - Selection and hover visual feedback
 * - Grid overlay rendering
 */

import type {
  Slide,
  SlideElement,
  TextElement,
  ShapeElement,
  ImageElement,
  SlideBackground,
  Position,
  Dimensions,
} from '@/types/presentation'
import type { ViewportState, ResizeHandle } from '@/types/editor'

/**
 * Configuration options for the canvas renderer
 */
export interface CanvasRendererConfig {
  /** Canvas width in pixels */
  width: number
  /** Canvas height in pixels */
  height: number
  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio?: number
  /** Grid size in pixels (when grid is enabled) */
  gridSize?: number
  /** Selection outline color */
  selectionColor?: string
  /** Hover outline color */
  hoverColor?: string
  /** Handle size for selection handles */
  handleSize?: number
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: Required<CanvasRendererConfig> = {
  width: 960,
  height: 540,
  devicePixelRatio: window.devicePixelRatio || 1,
  gridSize: 20,
  selectionColor: '#f97316',
  hoverColor: '#fb923c',
  handleSize: 8,
}

/**
 * SlideCanvasRenderer class for rendering slides using HTML5 Canvas
 */
export class SlideCanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private config: Required<CanvasRendererConfig>
  private imageCache: Map<string, HTMLImageElement> = new Map()
  private loadingImages: Map<string, Promise<HTMLImageElement>> = new Map()

  constructor(canvas: HTMLCanvasElement, config: Partial<CanvasRendererConfig> = {}) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context')
    }
    this.ctx = ctx
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.setupCanvas()
  }

  /**
   * Set up the canvas with proper dimensions and pixel ratio
   */
  private setupCanvas(): void {
    const { width, height, devicePixelRatio } = this.config

    // Set display size
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    // Set actual size in memory (scaled for high-DPI)
    this.canvas.width = width * devicePixelRatio
    this.canvas.height = height * devicePixelRatio

    // Scale context to account for high-DPI
    this.ctx.scale(devicePixelRatio, devicePixelRatio)
  }

  /**
   * Update canvas dimensions
   */
  public resize(width: number, height: number): void {
    this.config.width = width
    this.config.height = height
    this.setupCanvas()
  }

  /**
   * Clear the entire canvas
   */
  public clear(): void {
    const { width, height } = this.config
    this.ctx.clearRect(0, 0, width, height)
  }

  /**
   * Render the complete slide with all elements
   */
  public render(
    slide: Slide,
    viewport: ViewportState,
    options: {
      selectedElementIds?: string[]
      hoveredElementId?: string | null
      showGrid?: boolean
      showSelectionHandles?: boolean
      editingElementId?: string | null
    } = {}
  ): void {
    const {
      selectedElementIds = [],
      hoveredElementId = null,
      showGrid = false,
      showSelectionHandles = true,
      editingElementId = null,
    } = options

    // Clear canvas
    this.clear()

    // Save the current context state
    this.ctx.save()

    // Apply viewport transformations
    this.applyViewportTransform(viewport)

    // Render slide background
    this.renderBackground(slide.background)

    // Render grid if enabled
    if (showGrid) {
      this.renderGrid()
    }

    // Sort elements by z-index for proper layering
    const sortedElements = [...slide.elements].sort((a, b) => a.zIndex - b.zIndex)

    // Render all elements (skip element being edited - it's shown in TextInputOverlay)
    for (const element of sortedElements) {
      if (element.id === editingElementId) continue
      this.renderElement(element)
    }

    // Render hover state
    if (hoveredElementId && !selectedElementIds.includes(hoveredElementId)) {
      const hoveredElement = slide.elements.find((el) => el.id === hoveredElementId)
      if (hoveredElement) {
        this.renderElementOutline(hoveredElement, this.config.hoverColor, 2)
      }
    }

    // Render selection state
    for (const elementId of selectedElementIds) {
      const selectedElement = slide.elements.find((el) => el.id === elementId)
      if (selectedElement) {
        this.renderElementOutline(selectedElement, this.config.selectionColor, 2)
        if (showSelectionHandles) {
          this.renderSelectionHandles(selectedElement)
        }
      }
    }

    // Restore context state
    this.ctx.restore()
  }

  /**
   * Apply viewport transformations (zoom and pan)
   */
  private applyViewportTransform(viewport: ViewportState): void {
    const { width, height } = this.config
    const { zoom, panX, panY } = viewport

    // Translate to center, apply zoom, then pan
    this.ctx.translate(width / 2, height / 2)
    this.ctx.scale(zoom, zoom)
    this.ctx.translate(-width / 2 + panX, -height / 2 + panY)
  }

  /**
   * Render the slide background
   */
  private renderBackground(background: SlideBackground): void {
    const { width, height } = this.config

    switch (background.type) {
      case 'solid':
        this.ctx.fillStyle = background.color || '#ffffff'
        this.ctx.fillRect(0, 0, width, height)
        break

      case 'gradient': {
        const startColor = background.gradientStart || '#ffffff'
        const endColor = background.gradientEnd || '#000000'
        let gradient: CanvasGradient

        switch (background.gradientDirection) {
          case 'horizontal':
            gradient = this.ctx.createLinearGradient(0, 0, width, 0)
            break
          case 'vertical':
            gradient = this.ctx.createLinearGradient(0, 0, 0, height)
            break
          case 'diagonal':
          default:
            gradient = this.ctx.createLinearGradient(0, 0, width, height)
            break
        }

        gradient.addColorStop(0, startColor)
        gradient.addColorStop(1, endColor)
        this.ctx.fillStyle = gradient
        this.ctx.fillRect(0, 0, width, height)
        break
      }

      case 'image':
        if (background.imageSrc) {
          const cachedImage = this.imageCache.get(background.imageSrc)
          if (cachedImage && cachedImage.complete) {
            const fillMode = background.imageFillMode || 'cover'
            this.renderBackgroundImage(cachedImage, fillMode)
          } else {
            // Load image and trigger re-render when done
            this.loadImage(background.imageSrc)
            // Fill with solid color as fallback while loading
            this.ctx.fillStyle = background.color || '#ffffff'
            this.ctx.fillRect(0, 0, width, height)
          }
        }
        break
    }
  }

  /**
   * Render a background image with the specified fill mode
   */
  private renderBackgroundImage(
    image: HTMLImageElement,
    fillMode: 'stretch' | 'tile' | 'cover' | 'contain'
  ): void {
    const { width, height } = this.config
    const imgWidth = image.width
    const imgHeight = image.height

    switch (fillMode) {
      case 'stretch':
        // Stretch the image to fill the entire slide
        this.ctx.drawImage(image, 0, 0, width, height)
        break

      case 'tile': {
        // Tile the image across the slide
        const pattern = this.ctx.createPattern(image, 'repeat')
        if (pattern) {
          this.ctx.fillStyle = pattern
          this.ctx.fillRect(0, 0, width, height)
        }
        break
      }

      case 'cover': {
        // Scale image to cover the entire slide while maintaining aspect ratio
        const imageRatio = imgWidth / imgHeight
        const containerRatio = width / height
        let sx: number, sy: number, sw: number, sh: number

        if (imageRatio > containerRatio) {
          // Image is wider - crop sides
          sh = imgHeight
          sw = sh * containerRatio
          sy = 0
          sx = (imgWidth - sw) / 2
        } else {
          // Image is taller - crop top/bottom
          sw = imgWidth
          sh = sw / containerRatio
          sx = 0
          sy = (imgHeight - sh) / 2
        }

        this.ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height)
        break
      }

      case 'contain': {
        // Scale image to fit within the slide while maintaining aspect ratio
        const imageRatio = imgWidth / imgHeight
        const containerRatio = width / height
        let dw: number, dh: number, dx: number, dy: number

        // Fill background with color first
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillRect(0, 0, width, height)

        if (imageRatio > containerRatio) {
          // Image is wider - fit to width
          dw = width
          dh = width / imageRatio
          dx = 0
          dy = (height - dh) / 2
        } else {
          // Image is taller - fit to height
          dh = height
          dw = height * imageRatio
          dy = 0
          dx = (width - dw) / 2
        }

        this.ctx.drawImage(image, 0, 0, imgWidth, imgHeight, dx, dy, dw, dh)
        break
      }
    }
  }

  /**
   * Render the grid overlay
   */
  private renderGrid(): void {
    const { width, height, gridSize } = this.config

    this.ctx.save()
    this.ctx.strokeStyle = '#e2e8f0'
    this.ctx.lineWidth = 1

    // Vertical lines
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, height)
      this.ctx.stroke()
    }

    // Horizontal lines
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(width, y)
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  /**
   * Render a single element based on its type
   */
  private renderElement(element: SlideElement): void {
    this.ctx.save()

    // Apply element transformations
    this.applyElementTransform(element)

    // Apply opacity
    this.ctx.globalAlpha = element.opacity

    switch (element.type) {
      case 'text':
        this.renderTextElement(element)
        break
      case 'shape':
        this.renderShapeElement(element)
        break
      case 'image':
        this.renderImageElement(element)
        break
    }

    this.ctx.restore()
  }

  /**
   * Apply element-level transformations (position and rotation)
   */
  private applyElementTransform(element: SlideElement): void {
    const { position, dimensions, rotation } = element
    const centerX = position.x + dimensions.width / 2
    const centerY = position.y + dimensions.height / 2

    // Translate to center, rotate, then translate back
    this.ctx.translate(centerX, centerY)
    this.ctx.rotate((rotation * Math.PI) / 180)
    this.ctx.translate(-centerX, -centerY)
  }

  /**
   * Render a text element
   */
  private renderTextElement(element: TextElement): void {
    const { position, dimensions, content, fontSize, fontFamily, fontWeight, fontStyle, textAlign, color } = element

    this.ctx.fillStyle = color
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
    this.ctx.textBaseline = 'top'

    // Calculate text alignment
    let x = position.x
    if (textAlign === 'center') {
      x = position.x + dimensions.width / 2
      this.ctx.textAlign = 'center'
    } else if (textAlign === 'right') {
      x = position.x + dimensions.width
      this.ctx.textAlign = 'right'
    } else {
      this.ctx.textAlign = 'left'
    }

    // Word wrap and render text
    const lines = this.wrapText(content, dimensions.width, fontSize, fontFamily, fontWeight, fontStyle)
    const lineHeight = fontSize * 1.2

    // Vertical centering
    const totalHeight = lines.length * lineHeight
    let y = position.y + (dimensions.height - totalHeight) / 2

    for (const line of lines) {
      this.ctx.fillText(line, x, y)
      y += lineHeight
    }
  }

  /**
   * Wrap text to fit within a specified width
   */
  private wrapText(
    text: string,
    maxWidth: number,
    fontSize: number,
    fontFamily: string,
    fontWeight: string,
    fontStyle: string
  ): string[] {
    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const metrics = this.ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines.length ? lines : ['']
  }

  /**
   * Render a shape element
   */
  private renderShapeElement(element: ShapeElement): void {
    const { position, dimensions, shapeType, fillColor, strokeColor, strokeWidth, cornerRadius } = element

    this.ctx.fillStyle = fillColor
    this.ctx.strokeStyle = strokeColor
    this.ctx.lineWidth = strokeWidth

    switch (shapeType) {
      case 'rectangle': {
        const { x, y } = position
        const { width, height } = dimensions
        const radius = cornerRadius ?? 0

        this.ctx.beginPath()
        if (radius > 0) {
          // Draw rounded rectangle
          // Clamp radius to not exceed half of width or height
          const maxRadius = Math.min(width / 2, height / 2)
          const r = Math.min(radius, maxRadius)

          this.ctx.moveTo(x + r, y)
          this.ctx.lineTo(x + width - r, y)
          this.ctx.arcTo(x + width, y, x + width, y + r, r)
          this.ctx.lineTo(x + width, y + height - r)
          this.ctx.arcTo(x + width, y + height, x + width - r, y + height, r)
          this.ctx.lineTo(x + r, y + height)
          this.ctx.arcTo(x, y + height, x, y + height - r, r)
          this.ctx.lineTo(x, y + r)
          this.ctx.arcTo(x, y, x + r, y, r)
          this.ctx.closePath()
        } else {
          // Draw regular rectangle
          this.ctx.rect(x, y, width, height)
        }
        this.ctx.fill()
        if (strokeWidth > 0) {
          this.ctx.stroke()
        }
        break
      }

      case 'circle': {
        const radiusX = dimensions.width / 2
        const radiusY = dimensions.height / 2
        const centerX = position.x + radiusX
        const centerY = position.y + radiusY

        this.ctx.beginPath()
        this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2)
        this.ctx.fill()
        if (strokeWidth > 0) {
          this.ctx.stroke()
        }
        break
      }

      case 'triangle': {
        const { x, y } = position
        const { width, height } = dimensions

        this.ctx.beginPath()
        this.ctx.moveTo(x + width / 2, y) // Top vertex
        this.ctx.lineTo(x + width, y + height) // Bottom right
        this.ctx.lineTo(x, y + height) // Bottom left
        this.ctx.closePath()
        this.ctx.fill()
        if (strokeWidth > 0) {
          this.ctx.stroke()
        }
        break
      }

      case 'line': {
        const { x, y } = position
        const { width, height } = dimensions

        this.ctx.beginPath()
        this.ctx.moveTo(x, y)
        this.ctx.lineTo(x + width, y + height)
        this.ctx.strokeStyle = strokeColor || fillColor
        this.ctx.lineWidth = strokeWidth || 2
        this.ctx.stroke()
        break
      }
    }
  }

  /**
   * Render an image element
   */
  private renderImageElement(element: ImageElement): void {
    const { position, dimensions, src, objectFit } = element

    const cachedImage = this.imageCache.get(src)
    if (!cachedImage || !cachedImage.complete) {
      // Load image and show placeholder
      this.loadImage(src)
      this.renderImagePlaceholder(position, dimensions)
      return
    }

    // Calculate source and destination rectangles based on objectFit
    const { sx, sy, sw, sh, dx, dy, dw, dh } = this.calculateImageFit(
      cachedImage.width,
      cachedImage.height,
      position,
      dimensions,
      objectFit
    )

    this.ctx.drawImage(cachedImage, sx, sy, sw, sh, dx, dy, dw, dh)
  }

  /**
   * Calculate image fit dimensions based on objectFit mode
   */
  private calculateImageFit(
    imageWidth: number,
    imageHeight: number,
    position: Position,
    dimensions: Dimensions,
    objectFit: 'cover' | 'contain' | 'fill' | 'none'
  ): { sx: number; sy: number; sw: number; sh: number; dx: number; dy: number; dw: number; dh: number } {
    const { x, y } = position
    const { width, height } = dimensions

    switch (objectFit) {
      case 'cover': {
        const imageRatio = imageWidth / imageHeight
        const containerRatio = width / height
        let sw: number, sh: number, sx: number, sy: number

        if (imageRatio > containerRatio) {
          sh = imageHeight
          sw = sh * containerRatio
          sy = 0
          sx = (imageWidth - sw) / 2
        } else {
          sw = imageWidth
          sh = sw / containerRatio
          sx = 0
          sy = (imageHeight - sh) / 2
        }

        return { sx, sy, sw, sh, dx: x, dy: y, dw: width, dh: height }
      }

      case 'contain': {
        const imageRatio = imageWidth / imageHeight
        const containerRatio = width / height
        let dw: number, dh: number, dx: number, dy: number

        if (imageRatio > containerRatio) {
          dw = width
          dh = width / imageRatio
          dx = x
          dy = y + (height - dh) / 2
        } else {
          dh = height
          dw = height * imageRatio
          dy = y
          dx = x + (width - dw) / 2
        }

        return { sx: 0, sy: 0, sw: imageWidth, sh: imageHeight, dx, dy, dw, dh }
      }

      case 'none':
        return {
          sx: 0,
          sy: 0,
          sw: imageWidth,
          sh: imageHeight,
          dx: x,
          dy: y,
          dw: imageWidth,
          dh: imageHeight,
        }

      case 'fill':
      default:
        return {
          sx: 0,
          sy: 0,
          sw: imageWidth,
          sh: imageHeight,
          dx: x,
          dy: y,
          dw: width,
          dh: height,
        }
    }
  }

  /**
   * Render a placeholder for images that are loading
   */
  private renderImagePlaceholder(position: Position, dimensions: Dimensions): void {
    const { x, y } = position
    const { width, height } = dimensions

    this.ctx.save()
    this.ctx.fillStyle = '#f1f5f9'
    this.ctx.fillRect(x, y, width, height)

    // Draw image icon
    this.ctx.strokeStyle = '#94a3b8'
    this.ctx.lineWidth = 2
    const iconSize = Math.min(width, height) * 0.3
    const iconX = x + (width - iconSize) / 2
    const iconY = y + (height - iconSize) / 2

    // Simple image icon
    this.ctx.strokeRect(iconX, iconY, iconSize, iconSize)
    this.ctx.beginPath()
    this.ctx.moveTo(iconX, iconY + iconSize * 0.7)
    this.ctx.lineTo(iconX + iconSize * 0.3, iconY + iconSize * 0.5)
    this.ctx.lineTo(iconX + iconSize * 0.5, iconY + iconSize * 0.7)
    this.ctx.lineTo(iconX + iconSize, iconY + iconSize * 0.3)
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * Render element selection outline
   */
  private renderElementOutline(element: SlideElement, color: string, lineWidth: number): void {
    this.ctx.save()
    this.applyElementTransform(element)

    const { position, dimensions } = element

    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.setLineDash([])
    this.ctx.strokeRect(position.x, position.y, dimensions.width, dimensions.height)

    this.ctx.restore()
  }

  /**
   * Render selection handles for a selected element
   */
  private renderSelectionHandles(element: SlideElement): void {
    this.ctx.save()
    this.applyElementTransform(element)

    const { position, dimensions } = element
    const { handleSize, selectionColor } = this.config
    const halfHandle = handleSize / 2

    const handles: { x: number; y: number; handle: ResizeHandle }[] = [
      { x: position.x, y: position.y, handle: 'top-left' },
      { x: position.x + dimensions.width / 2, y: position.y, handle: 'top' },
      { x: position.x + dimensions.width, y: position.y, handle: 'top-right' },
      { x: position.x + dimensions.width, y: position.y + dimensions.height / 2, handle: 'right' },
      { x: position.x + dimensions.width, y: position.y + dimensions.height, handle: 'bottom-right' },
      { x: position.x + dimensions.width / 2, y: position.y + dimensions.height, handle: 'bottom' },
      { x: position.x, y: position.y + dimensions.height, handle: 'bottom-left' },
      { x: position.x, y: position.y + dimensions.height / 2, handle: 'left' },
    ]

    for (const { x, y } of handles) {
      this.ctx.fillStyle = '#ffffff'
      this.ctx.strokeStyle = selectionColor
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.rect(x - halfHandle, y - halfHandle, handleSize, handleSize)
      this.ctx.fill()
      this.ctx.stroke()
    }

    // Rotation handle
    const rotationHandleY = position.y - 30
    this.ctx.beginPath()
    this.ctx.moveTo(position.x + dimensions.width / 2, position.y)
    this.ctx.lineTo(position.x + dimensions.width / 2, rotationHandleY)
    this.ctx.strokeStyle = selectionColor
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Rotation handle circle
    this.ctx.beginPath()
    this.ctx.arc(position.x + dimensions.width / 2, rotationHandleY, handleSize / 2, 0, Math.PI * 2)
    this.ctx.fillStyle = '#ffffff'
    this.ctx.fill()
    this.ctx.strokeStyle = selectionColor
    this.ctx.stroke()

    this.ctx.restore()
  }

  /**
   * Render a selection box (for multi-select drag)
   */
  public renderSelectionBox(startX: number, startY: number, endX: number, endY: number): void {
    this.ctx.save()

    const x = Math.min(startX, endX)
    const y = Math.min(startY, endY)
    const width = Math.abs(endX - startX)
    const height = Math.abs(endY - startY)

    this.ctx.fillStyle = 'rgba(37, 99, 235, 0.1)'
    this.ctx.strokeStyle = this.config.selectionColor
    this.ctx.lineWidth = 1
    this.ctx.setLineDash([5, 5])

    this.ctx.fillRect(x, y, width, height)
    this.ctx.strokeRect(x, y, width, height)

    this.ctx.restore()
  }

  /**
   * Load an image and cache it
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    // Check if already loading
    const existingPromise = this.loadingImages.get(src)
    if (existingPromise) {
      return existingPromise
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'

      img.onload = () => {
        this.imageCache.set(src, img)
        this.loadingImages.delete(src)
        resolve(img)
      }

      img.onerror = () => {
        this.loadingImages.delete(src)
        reject(new Error(`Failed to load image: ${src}`))
      }

      img.src = src
    })

    this.loadingImages.set(src, promise)
    return promise
  }

  /**
   * Get the element at a specific canvas coordinate
   */
  public getElementAtPoint(
    slide: Slide,
    viewport: ViewportState,
    canvasX: number,
    canvasY: number
  ): SlideElement | null {
    // Transform canvas coordinates to slide coordinates
    const slideCoords = this.canvasToSlideCoordinates(viewport, canvasX, canvasY)

    // Check elements in reverse z-index order (top to bottom)
    const sortedElements = [...slide.elements].sort((a, b) => b.zIndex - a.zIndex)

    for (const element of sortedElements) {
      if (element.locked) continue
      if (this.isPointInElement(slideCoords.x, slideCoords.y, element)) {
        return element
      }
    }

    return null
  }

  /**
   * Convert canvas coordinates to slide coordinates
   */
  public canvasToSlideCoordinates(viewport: ViewportState, canvasX: number, canvasY: number): Position {
    const { width, height } = this.config
    const { zoom, panX, panY } = viewport

    // Reverse the viewport transformation
    const slideX = (canvasX - width / 2) / zoom + width / 2 - panX
    const slideY = (canvasY - height / 2) / zoom + height / 2 - panY

    return { x: slideX, y: slideY }
  }

  /**
   * Convert slide coordinates to canvas coordinates
   */
  public slideToCanvasCoordinates(viewport: ViewportState, slideX: number, slideY: number): Position {
    const { width, height } = this.config
    const { zoom, panX, panY } = viewport

    // Apply the viewport transformation
    const canvasX = (slideX - width / 2 + panX) * zoom + width / 2
    const canvasY = (slideY - height / 2 + panY) * zoom + height / 2

    return { x: canvasX, y: canvasY }
  }

  /**
   * Check if a point is within an element's bounds (considering rotation)
   */
  private isPointInElement(x: number, y: number, element: SlideElement): boolean {
    const { position, dimensions, rotation } = element

    // If no rotation, simple bounds check
    if (rotation === 0) {
      return (
        x >= position.x &&
        x <= position.x + dimensions.width &&
        y >= position.y &&
        y <= position.y + dimensions.height
      )
    }

    // For rotated elements, transform the point to element's local space
    const centerX = position.x + dimensions.width / 2
    const centerY = position.y + dimensions.height / 2
    const angleRad = (-rotation * Math.PI) / 180

    const translatedX = x - centerX
    const translatedY = y - centerY

    const rotatedX = translatedX * Math.cos(angleRad) - translatedY * Math.sin(angleRad) + centerX
    const rotatedY = translatedX * Math.sin(angleRad) + translatedY * Math.cos(angleRad) + centerY

    return (
      rotatedX >= position.x &&
      rotatedX <= position.x + dimensions.width &&
      rotatedY >= position.y &&
      rotatedY <= position.y + dimensions.height
    )
  }

  /**
   * Get the resize handle at a specific point
   */
  public getResizeHandleAtPoint(
    element: SlideElement,
    viewport: ViewportState,
    canvasX: number,
    canvasY: number
  ): ResizeHandle | 'rotation' | null {
    const slideCoords = this.canvasToSlideCoordinates(viewport, canvasX, canvasY)
    const { position, dimensions } = element
    const { handleSize } = this.config
    const halfHandle = handleSize / 2 / viewport.zoom // Adjust for zoom

    const handles: { x: number; y: number; handle: ResizeHandle | 'rotation' }[] = [
      { x: position.x, y: position.y, handle: 'top-left' },
      { x: position.x + dimensions.width / 2, y: position.y, handle: 'top' },
      { x: position.x + dimensions.width, y: position.y, handle: 'top-right' },
      { x: position.x + dimensions.width, y: position.y + dimensions.height / 2, handle: 'right' },
      { x: position.x + dimensions.width, y: position.y + dimensions.height, handle: 'bottom-right' },
      { x: position.x + dimensions.width / 2, y: position.y + dimensions.height, handle: 'bottom' },
      { x: position.x, y: position.y + dimensions.height, handle: 'bottom-left' },
      { x: position.x, y: position.y + dimensions.height / 2, handle: 'left' },
      { x: position.x + dimensions.width / 2, y: position.y - 30, handle: 'rotation' },
    ]

    for (const { x, y, handle } of handles) {
      if (
        slideCoords.x >= x - halfHandle &&
        slideCoords.x <= x + halfHandle &&
        slideCoords.y >= y - halfHandle &&
        slideCoords.y <= y + halfHandle
      ) {
        return handle
      }
    }

    return null
  }

  /**
   * Preload images for a slide
   */
  public async preloadImages(slide: Slide): Promise<void> {
    const imagePromises: Promise<HTMLImageElement>[] = []

    // Background image
    if (slide.background.type === 'image' && slide.background.imageSrc) {
      imagePromises.push(this.loadImage(slide.background.imageSrc))
    }

    // Element images
    for (const element of slide.elements) {
      if (element.type === 'image') {
        imagePromises.push(this.loadImage(element.src))
      }
    }

    await Promise.allSettled(imagePromises)
  }

  /**
   * Clear the image cache
   */
  public clearImageCache(): void {
    this.imageCache.clear()
  }

  /**
   * Get the canvas context for custom drawing
   */
  public getContext(): CanvasRenderingContext2D {
    return this.ctx
  }

  /**
   * Get the current configuration
   */
  public getConfig(): Required<CanvasRendererConfig> {
    return { ...this.config }
  }

  /**
   * Export the canvas to a data URL
   */
  public toDataURL(type: string = 'image/png', quality?: number): string {
    return this.canvas.toDataURL(type, quality)
  }

  /**
   * Export the canvas to a Blob
   */
  public toBlob(type: string = 'image/png', quality?: number): Promise<Blob | null> {
    return new Promise((resolve) => {
      this.canvas.toBlob(resolve, type, quality)
    })
  }
}

export default SlideCanvasRenderer
