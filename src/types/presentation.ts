/**
 * Core types for presentation data structures.
 * These types define the shape of presentations, slides, and elements.
 */

/**
 * Position coordinates for elements on a slide
 */
export interface Position {
  x: number
  y: number
}

/**
 * Dimensions for elements
 */
export interface Dimensions {
  width: number
  height: number
}

/**
 * Element types that can be placed on a slide
 */
export type ElementType = 'text' | 'shape' | 'image'

/**
 * Shape types for shape elements
 */
export type ShapeType = 'rectangle' | 'circle' | 'line' | 'triangle'

/**
 * Base properties shared by all elements
 */
export interface BaseElement {
  id: string
  type: ElementType
  position: Position
  dimensions: Dimensions
  rotation: number
  zIndex: number
  opacity: number
  locked: boolean
}

/**
 * Text element with text-specific properties
 */
export interface TextElement extends BaseElement {
  type: 'text'
  content: string
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

/**
 * Shape element with shape-specific properties
 */
export interface ShapeElement extends BaseElement {
  type: 'shape'
  shapeType: ShapeType
  fillColor: string
  strokeColor: string
  strokeWidth: number
  cornerRadius?: number
}

/**
 * Image element with image-specific properties
 */
export interface ImageElement extends BaseElement {
  type: 'image'
  src: string
  alt: string
  objectFit: 'cover' | 'contain' | 'fill' | 'none'
}

/**
 * Union type of all possible slide elements
 */
export type SlideElement = TextElement | ShapeElement | ImageElement

/**
 * Background image fill mode options
 */
export type BackgroundImageFillMode = 'stretch' | 'tile' | 'cover' | 'contain'

/**
 * Transition effect types for slides
 */
export type SlideTransitionType = 'none' | 'fade' | 'slide' | 'zoom'

/**
 * Transition configuration for a slide
 */
export interface SlideTransition {
  type: SlideTransitionType
  duration: number // Duration in milliseconds (100-2000ms)
}

/**
 * Default slide transition configuration
 */
export const DEFAULT_SLIDE_TRANSITION: SlideTransition = {
  type: 'none',
  duration: 500,
}

/**
 * Background configuration for a slide
 */
export interface SlideBackground {
  type: 'solid' | 'gradient' | 'image'
  color?: string
  gradientStart?: string
  gradientEnd?: string
  gradientDirection?: 'horizontal' | 'vertical' | 'diagonal'
  imageSrc?: string
  imageFillMode?: BackgroundImageFillMode
}

/**
 * A single slide in a presentation
 */
export interface Slide {
  id: string
  title: string
  elements: SlideElement[]
  background: SlideBackground
  transition: SlideTransition
  notes: string
  thumbnail?: string
  createdAt: string
  updatedAt: string
}

/**
 * Theme configuration for a presentation
 */
export interface PresentationTheme {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  textColor: string
  fontFamily: string
}

/**
 * A complete presentation
 */
export interface Presentation {
  id: string
  name: string
  description: string
  slides: Slide[]
  theme: PresentationTheme
  createdAt: string
  updatedAt: string
}

/**
 * Default values for creating new presentations
 */
export const DEFAULT_THEME: PresentationTheme = {
  primaryColor: '#f97316',
  secondaryColor: '#64748b',
  backgroundColor: '#ffffff',
  textColor: '#1e293b',
  fontFamily: 'DM Sans, system-ui, sans-serif',
}

export const DEFAULT_SLIDE_BACKGROUND: SlideBackground = {
  type: 'solid',
  color: '#ffffff',
}

/**
 * Creates a new blank slide with default values
 */
export function createBlankSlide(id: string, title = 'Untitled Slide'): Slide {
  const now = new Date().toISOString()
  return {
    id,
    title,
    elements: [],
    background: { ...DEFAULT_SLIDE_BACKGROUND },
    transition: { ...DEFAULT_SLIDE_TRANSITION },
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Creates a new presentation with default values
 */
export function createBlankPresentation(id: string, name = 'Untitled Presentation'): Presentation {
  const now = new Date().toISOString()
  const firstSlide = createBlankSlide(`${id}-slide-1`, 'Title Slide')
  return {
    id,
    name,
    description: '',
    slides: [firstSlide],
    theme: { ...DEFAULT_THEME },
    createdAt: now,
    updatedAt: now,
  }
}
