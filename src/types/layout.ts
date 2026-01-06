/**
 * Types and definitions for slide layouts.
 * Layouts are pre-defined templates that can be applied when creating or modifying slides.
 */

import type { Slide, SlideElement, TextElement, SlideBackground } from './presentation'
import { DEFAULT_SLIDE_BACKGROUND, DEFAULT_SLIDE_TRANSITION } from './presentation'

/**
 * Available slide layout types
 */
export type SlideLayoutType = 'blank' | 'title' | 'title-content' | 'two-column'

/**
 * Layout metadata for display in the layout selector
 */
export interface SlideLayoutMeta {
  id: SlideLayoutType
  name: string
  description: string
}

/**
 * All available layouts with metadata
 */
export const SLIDE_LAYOUTS: SlideLayoutMeta[] = [
  {
    id: 'blank',
    name: 'Blank',
    description: 'Empty slide with no content',
  },
  {
    id: 'title',
    name: 'Title Slide',
    description: 'Title and subtitle centered on the slide',
  },
  {
    id: 'title-content',
    name: 'Title + Content',
    description: 'Title at top with content area below',
  },
  {
    id: 'two-column',
    name: 'Two Column',
    description: 'Title with two content columns',
  },
]

/**
 * Generate a unique ID for elements
 */
function generateElementId(): string {
  return `elem-${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Create a text element with default properties
 */
function createTextElement(
  content: string,
  options: {
    x: number
    y: number
    width: number
    height: number
    fontSize?: number
    fontWeight?: 'normal' | 'bold'
    textAlign?: 'left' | 'center' | 'right'
    color?: string
    zIndex?: number
  }
): TextElement {
  return {
    id: generateElementId(),
    type: 'text',
    content,
    position: { x: options.x, y: options.y },
    dimensions: { width: options.width, height: options.height },
    rotation: 0,
    zIndex: options.zIndex ?? 0,
    opacity: 1,
    locked: false,
    fontSize: options.fontSize ?? 24,
    fontFamily: 'Inter, system-ui, sans-serif',
    fontWeight: options.fontWeight ?? 'normal',
    fontStyle: 'normal',
    textAlign: options.textAlign ?? 'left',
    color: options.color ?? '#1e293b',
  }
}

/**
 * Create elements for a blank layout
 */
function createBlankLayoutElements(): SlideElement[] {
  return []
}

/**
 * Create elements for a title slide layout
 */
function createTitleLayoutElements(): SlideElement[] {
  return [
    createTextElement('Click to add title', {
      x: 80,
      y: 180,
      width: 800,
      height: 80,
      fontSize: 48,
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: 0,
    }),
    createTextElement('Click to add subtitle', {
      x: 160,
      y: 280,
      width: 640,
      height: 50,
      fontSize: 24,
      fontWeight: 'normal',
      textAlign: 'center',
      color: '#64748b',
      zIndex: 1,
    }),
  ]
}

/**
 * Create elements for a title + content layout
 */
function createTitleContentLayoutElements(): SlideElement[] {
  return [
    createTextElement('Click to add title', {
      x: 40,
      y: 30,
      width: 880,
      height: 60,
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      zIndex: 0,
    }),
    createTextElement('Click to add content', {
      x: 40,
      y: 110,
      width: 880,
      height: 380,
      fontSize: 20,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#475569',
      zIndex: 1,
    }),
  ]
}

/**
 * Create elements for a two-column layout
 */
function createTwoColumnLayoutElements(): SlideElement[] {
  return [
    createTextElement('Click to add title', {
      x: 40,
      y: 30,
      width: 880,
      height: 60,
      fontSize: 36,
      fontWeight: 'bold',
      textAlign: 'left',
      zIndex: 0,
    }),
    createTextElement('Left column content', {
      x: 40,
      y: 110,
      width: 420,
      height: 380,
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#475569',
      zIndex: 1,
    }),
    createTextElement('Right column content', {
      x: 500,
      y: 110,
      width: 420,
      height: 380,
      fontSize: 18,
      fontWeight: 'normal',
      textAlign: 'left',
      color: '#475569',
      zIndex: 2,
    }),
  ]
}

/**
 * Get layout elements based on layout type
 */
export function getLayoutElements(layoutType: SlideLayoutType): SlideElement[] {
  switch (layoutType) {
    case 'blank':
      return createBlankLayoutElements()
    case 'title':
      return createTitleLayoutElements()
    case 'title-content':
      return createTitleContentLayoutElements()
    case 'two-column':
      return createTwoColumnLayoutElements()
    default:
      return createBlankLayoutElements()
  }
}

/**
 * Get default slide title based on layout type
 */
export function getLayoutDefaultTitle(layoutType: SlideLayoutType): string {
  switch (layoutType) {
    case 'blank':
      return 'Blank Slide'
    case 'title':
      return 'Title Slide'
    case 'title-content':
      return 'Content Slide'
    case 'two-column':
      return 'Two Column Slide'
    default:
      return 'Untitled Slide'
  }
}

/**
 * Creates a new slide with the specified layout
 */
export function createSlideWithLayout(
  id: string,
  layoutType: SlideLayoutType,
  background: SlideBackground = { ...DEFAULT_SLIDE_BACKGROUND }
): Slide {
  const now = new Date().toISOString()
  return {
    id,
    title: getLayoutDefaultTitle(layoutType),
    elements: getLayoutElements(layoutType),
    background,
    transition: { ...DEFAULT_SLIDE_TRANSITION },
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Apply a layout to an existing slide (replaces elements)
 */
export function applyLayoutToSlide(
  slide: Slide,
  layoutType: SlideLayoutType
): Slide {
  return {
    ...slide,
    title: getLayoutDefaultTitle(layoutType),
    elements: getLayoutElements(layoutType),
    updatedAt: new Date().toISOString(),
  }
}
