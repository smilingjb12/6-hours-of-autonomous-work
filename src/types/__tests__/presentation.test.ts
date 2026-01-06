/**
 * Unit tests for presentation type utilities
 * Tests createBlankSlide and createBlankPresentation helper functions
 */

import {
  createBlankSlide,
  createBlankPresentation,
  DEFAULT_THEME,
  DEFAULT_SLIDE_BACKGROUND,
} from '../presentation'

describe('presentation type utilities', () => {
  describe('DEFAULT_THEME', () => {
    it('should have all required theme properties', () => {
      expect(DEFAULT_THEME).toHaveProperty('primaryColor')
      expect(DEFAULT_THEME).toHaveProperty('secondaryColor')
      expect(DEFAULT_THEME).toHaveProperty('backgroundColor')
      expect(DEFAULT_THEME).toHaveProperty('textColor')
      expect(DEFAULT_THEME).toHaveProperty('fontFamily')
    })

    it('should have valid color values', () => {
      expect(DEFAULT_THEME.primaryColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(DEFAULT_THEME.secondaryColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(DEFAULT_THEME.backgroundColor).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(DEFAULT_THEME.textColor).toMatch(/^#[0-9a-fA-F]{6}$/)
    })

    it('should have a valid font family', () => {
      expect(typeof DEFAULT_THEME.fontFamily).toBe('string')
      expect(DEFAULT_THEME.fontFamily.length).toBeGreaterThan(0)
    })
  })

  describe('DEFAULT_SLIDE_BACKGROUND', () => {
    it('should have type solid', () => {
      expect(DEFAULT_SLIDE_BACKGROUND.type).toBe('solid')
    })

    it('should have a white color', () => {
      expect(DEFAULT_SLIDE_BACKGROUND.color).toBe('#ffffff')
    })
  })

  describe('createBlankSlide', () => {
    it('should create a slide with the given id', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.id).toBe('test-slide-1')
    })

    it('should create a slide with default title when not provided', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.title).toBe('Untitled Slide')
    })

    it('should create a slide with custom title when provided', () => {
      const slide = createBlankSlide('test-slide-1', 'My Custom Title')
      expect(slide.title).toBe('My Custom Title')
    })

    it('should create a slide with empty elements array', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.elements).toEqual([])
    })

    it('should create a slide with default background', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.background.type).toBe('solid')
      expect(slide.background.color).toBe('#ffffff')
    })

    it('should create a slide with empty notes', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.notes).toBe('')
    })

    it('should create a slide with valid timestamps', () => {
      const before = new Date().toISOString()
      const slide = createBlankSlide('test-slide-1')
      const after = new Date().toISOString()

      expect(slide.createdAt).toBeDefined()
      expect(slide.updatedAt).toBeDefined()
      expect(slide.createdAt).toBe(slide.updatedAt)
      expect(slide.createdAt >= before).toBe(true)
      expect(slide.createdAt <= after).toBe(true)
    })

    it('should not have thumbnail by default', () => {
      const slide = createBlankSlide('test-slide-1')
      expect(slide.thumbnail).toBeUndefined()
    })

    it('should create independent background objects', () => {
      const slide1 = createBlankSlide('slide-1')
      const slide2 = createBlankSlide('slide-2')

      // Modify one slide's background
      slide1.background.color = '#000000'

      // Other slide should not be affected
      expect(slide2.background.color).toBe('#ffffff')
    })
  })

  describe('createBlankPresentation', () => {
    it('should create a presentation with the given id', () => {
      const presentation = createBlankPresentation('test-pres-1')
      expect(presentation.id).toBe('test-pres-1')
    })

    it('should create a presentation with default name when not provided', () => {
      const presentation = createBlankPresentation('test-pres-1')
      expect(presentation.name).toBe('Untitled Presentation')
    })

    it('should create a presentation with custom name when provided', () => {
      const presentation = createBlankPresentation('test-pres-1', 'My Presentation')
      expect(presentation.name).toBe('My Presentation')
    })

    it('should create a presentation with empty description', () => {
      const presentation = createBlankPresentation('test-pres-1')
      expect(presentation.description).toBe('')
    })

    it('should create a presentation with one default slide', () => {
      const presentation = createBlankPresentation('test-pres-1')
      expect(presentation.slides).toHaveLength(1)
    })

    it('should create first slide with correct id pattern', () => {
      const presentation = createBlankPresentation('test-pres-1')
      const firstSlide = presentation.slides[0]
      expect(firstSlide?.id).toBe('test-pres-1-slide-1')
    })

    it('should create first slide with title "Title Slide"', () => {
      const presentation = createBlankPresentation('test-pres-1')
      const firstSlide = presentation.slides[0]
      expect(firstSlide?.title).toBe('Title Slide')
    })

    it('should create a presentation with default theme', () => {
      const presentation = createBlankPresentation('test-pres-1')
      expect(presentation.theme.primaryColor).toBe(DEFAULT_THEME.primaryColor)
      expect(presentation.theme.secondaryColor).toBe(DEFAULT_THEME.secondaryColor)
      expect(presentation.theme.backgroundColor).toBe(DEFAULT_THEME.backgroundColor)
      expect(presentation.theme.textColor).toBe(DEFAULT_THEME.textColor)
      expect(presentation.theme.fontFamily).toBe(DEFAULT_THEME.fontFamily)
    })

    it('should create a presentation with valid timestamps', () => {
      const before = new Date().toISOString()
      const presentation = createBlankPresentation('test-pres-1')
      const after = new Date().toISOString()

      expect(presentation.createdAt).toBeDefined()
      expect(presentation.updatedAt).toBeDefined()
      expect(presentation.createdAt).toBe(presentation.updatedAt)
      expect(presentation.createdAt >= before).toBe(true)
      expect(presentation.createdAt <= after).toBe(true)
    })

    it('should create independent theme objects', () => {
      const pres1 = createBlankPresentation('pres-1')
      const pres2 = createBlankPresentation('pres-2')

      // Modify one presentation's theme
      pres1.theme.primaryColor = '#000000'

      // Other presentation should not be affected
      expect(pres2.theme.primaryColor).toBe(DEFAULT_THEME.primaryColor)
    })

    it('should create presentations with different ids', () => {
      const pres1 = createBlankPresentation('pres-1')
      const pres2 = createBlankPresentation('pres-2')

      expect(pres1.id).not.toBe(pres2.id)
      const slide1 = pres1.slides[0]
      const slide2 = pres2.slides[0]
      expect(slide1?.id).not.toBe(slide2?.id)
    })
  })
})
