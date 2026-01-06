/**
 * Unit tests for presentationStore
 * Tests all CRUD operations for presentations, slides, and elements
 */

import { act } from '@testing-library/react'
import { usePresentationStore } from '../presentationStore'
import type { TextElement, ShapeElement } from '../../types/presentation'

// Helper to reset the store between tests
const resetStore = () => {
  act(() => {
    usePresentationStore.setState({
      presentations: [],
      currentPresentationId: null,
    })
  })
}

// Helper to create a test text element
const createTestTextElement = (id: string, zIndex = 0): TextElement => ({
  id,
  type: 'text',
  position: { x: 100, y: 100 },
  dimensions: { width: 200, height: 50 },
  rotation: 0,
  zIndex,
  opacity: 1,
  locked: false,
  content: 'Test text',
  fontSize: 16,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textAlign: 'left',
  color: '#000000',
})

// Helper to create a test shape element
const createTestShapeElement = (id: string, zIndex = 0): ShapeElement => ({
  id,
  type: 'shape',
  position: { x: 50, y: 50 },
  dimensions: { width: 100, height: 100 },
  rotation: 0,
  zIndex,
  opacity: 1,
  locked: false,
  shapeType: 'rectangle',
  fillColor: '#ff0000',
  strokeColor: '#000000',
  strokeWidth: 2,
})

// Helper to safely get the first presentation
const getFirstPresentation = () => {
  const state = usePresentationStore.getState()
  const pres = state.presentations[0]
  if (!pres) throw new Error('No presentation found')
  return pres
}

// Helper to safely get the first slide of first presentation
const getFirstSlide = () => {
  const pres = getFirstPresentation()
  const slide = pres.slides[0]
  if (!slide) throw new Error('No slide found')
  return slide
}

describe('presentationStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('Initial State', () => {
    it('should have empty presentations array initially', () => {
      const state = usePresentationStore.getState()
      expect(state.presentations).toEqual([])
    })

    it('should have null currentPresentationId initially', () => {
      const state = usePresentationStore.getState()
      expect(state.currentPresentationId).toBeNull()
    })
  })

  describe('Presentation Actions', () => {
    describe('createPresentation', () => {
      it('should create a new presentation with default name', () => {
        const { createPresentation } = usePresentationStore.getState()

        act(() => {
          createPresentation()
        })

        const state = usePresentationStore.getState()
        expect(state.presentations).toHaveLength(1)
        expect(getFirstPresentation().name).toBe('Untitled Presentation')
      })

      it('should create a new presentation with custom name', () => {
        const { createPresentation } = usePresentationStore.getState()

        act(() => {
          createPresentation('My Presentation')
        })

        expect(getFirstPresentation().name).toBe('My Presentation')
      })

      it('should set currentPresentationId to the new presentation', () => {
        const { createPresentation } = usePresentationStore.getState()

        let newId = ''
        act(() => {
          newId = createPresentation()
        })

        const state = usePresentationStore.getState()
        expect(state.currentPresentationId).toBe(newId)
      })

      it('should create presentation with one default slide', () => {
        const { createPresentation } = usePresentationStore.getState()

        act(() => {
          createPresentation()
        })

        expect(getFirstPresentation().slides).toHaveLength(1)
        expect(getFirstSlide().title).toBe('Title Slide')
      })

      it('should return the new presentation ID', () => {
        const { createPresentation } = usePresentationStore.getState()

        let newId = ''
        act(() => {
          newId = createPresentation()
        })

        expect(newId).toBeDefined()
        expect(typeof newId).toBe('string')
        expect(newId.length).toBeGreaterThan(0)
      })
    })

    describe('deletePresentation', () => {
      it('should delete a presentation by id', () => {
        const { createPresentation, deletePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation('To Delete')
        })

        expect(usePresentationStore.getState().presentations).toHaveLength(1)

        act(() => {
          deletePresentation(id)
        })

        expect(usePresentationStore.getState().presentations).toHaveLength(0)
      })

      it('should clear currentPresentationId if the deleted presentation was current', () => {
        const { createPresentation, deletePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation()
        })

        expect(usePresentationStore.getState().currentPresentationId).toBe(id)

        act(() => {
          deletePresentation(id)
        })

        expect(usePresentationStore.getState().currentPresentationId).toBeNull()
      })

      it('should not affect currentPresentationId if different presentation was deleted', () => {
        const { createPresentation, deletePresentation } = usePresentationStore.getState()

        let id1 = ''
        let id2 = ''
        act(() => {
          id1 = createPresentation('First')
          id2 = createPresentation('Second')
        })

        expect(usePresentationStore.getState().currentPresentationId).toBe(id2)

        act(() => {
          deletePresentation(id1)
        })

        expect(usePresentationStore.getState().currentPresentationId).toBe(id2)
        expect(usePresentationStore.getState().presentations).toHaveLength(1)
      })
    })

    describe('updatePresentation', () => {
      it('should update presentation name', () => {
        const { createPresentation, updatePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation('Original')
        })

        act(() => {
          updatePresentation(id, { name: 'Updated' })
        })

        expect(getFirstPresentation().name).toBe('Updated')
      })

      it('should update presentation description', () => {
        const { createPresentation, updatePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation()
        })

        act(() => {
          updatePresentation(id, { description: 'New description' })
        })

        expect(getFirstPresentation().description).toBe('New description')
      })

      it('should update updatedAt timestamp', () => {
        const { createPresentation, updatePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation()
        })

        act(() => {
          updatePresentation(id, { name: 'Changed' })
        })

        const newUpdatedAt = getFirstPresentation().updatedAt
        expect(newUpdatedAt).toBeDefined()
      })
    })

    describe('setCurrentPresentation', () => {
      it('should set the current presentation id', () => {
        const { createPresentation, setCurrentPresentation } = usePresentationStore.getState()

        let id1 = ''
        act(() => {
          id1 = createPresentation('First')
          createPresentation('Second')
        })

        act(() => {
          setCurrentPresentation(id1)
        })

        expect(usePresentationStore.getState().currentPresentationId).toBe(id1)
      })

      it('should allow setting to null', () => {
        const { createPresentation, setCurrentPresentation } = usePresentationStore.getState()

        act(() => {
          createPresentation()
        })

        act(() => {
          setCurrentPresentation(null)
        })

        expect(usePresentationStore.getState().currentPresentationId).toBeNull()
      })
    })

    describe('duplicatePresentation', () => {
      it('should create a copy of the presentation', () => {
        const { createPresentation, duplicatePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation('Original')
        })

        act(() => {
          duplicatePresentation(id)
        })

        const state = usePresentationStore.getState()
        expect(state.presentations).toHaveLength(2)
      })

      it('should append "(Copy)" to the duplicated presentation name', () => {
        const { createPresentation, duplicatePresentation } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation('Original')
        })

        act(() => {
          duplicatePresentation(id)
        })

        const state = usePresentationStore.getState()
        const duplicated = state.presentations.find(p => p.name === 'Original (Copy)')
        expect(duplicated).toBeDefined()
      })

      it('should return null if presentation does not exist', () => {
        const { duplicatePresentation } = usePresentationStore.getState()

        let result: string | null = ''
        act(() => {
          result = duplicatePresentation('non-existent-id')
        })

        expect(result).toBeNull()
      })

      it('should create new IDs for slides and elements', () => {
        const { createPresentation, duplicatePresentation } = usePresentationStore.getState()

        let originalId = ''
        let duplicatedId: string | null = null
        act(() => {
          originalId = createPresentation('Original')
        })

        act(() => {
          duplicatedId = duplicatePresentation(originalId)
        })

        const original = usePresentationStore.getState().getPresentation(originalId)
        const duplicated = usePresentationStore.getState().getPresentation(duplicatedId!)

        expect(original?.slides[0]?.id).not.toBe(duplicated?.slides[0]?.id)
      })

      it('should duplicate presentation with elements and create new element IDs', () => {
        const { createPresentation, addElement, duplicatePresentation } = usePresentationStore.getState()

        let originalId = ''
        act(() => {
          originalId = createPresentation('Original')
        })

        const slideId = getFirstSlide().id
        const element = createTestTextElement('element-1')
        act(() => {
          addElement(originalId, slideId, element)
        })

        let duplicatedId: string | null = null
        act(() => {
          duplicatedId = duplicatePresentation(originalId)
        })

        const original = usePresentationStore.getState().getPresentation(originalId)
        const duplicated = usePresentationStore.getState().getPresentation(duplicatedId!)

        // Check elements were duplicated with new IDs
        expect(original?.slides[0]?.elements[0]?.id).toBe('element-1')
        expect(duplicated?.slides[0]?.elements[0]?.id).not.toBe('element-1')
        expect(duplicated?.slides[0]?.elements).toHaveLength(1)
      })
    })

    describe('updatePresentationTheme', () => {
      it('should update the presentation theme', () => {
        const { createPresentation, updatePresentationTheme } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation()
        })

        act(() => {
          updatePresentationTheme(id, { primaryColor: '#ff0000' })
        })

        expect(getFirstPresentation().theme.primaryColor).toBe('#ff0000')
      })

      it('should preserve other theme properties', () => {
        const { createPresentation, updatePresentationTheme } = usePresentationStore.getState()

        let id = ''
        act(() => {
          id = createPresentation()
        })

        const originalTheme = getFirstPresentation().theme

        act(() => {
          updatePresentationTheme(id, { primaryColor: '#ff0000' })
        })

        expect(getFirstPresentation().theme.secondaryColor).toBe(originalTheme.secondaryColor)
        expect(getFirstPresentation().theme.fontFamily).toBe(originalTheme.fontFamily)
      })
    })
  })

  describe('Slide Actions', () => {
    let presentationId: string

    beforeEach(() => {
      act(() => {
        presentationId = usePresentationStore.getState().createPresentation()
      })
    })

    describe('addSlide', () => {
      it('should add a new slide to the presentation', () => {
        const { addSlide } = usePresentationStore.getState()

        act(() => {
          addSlide(presentationId)
        })

        expect(getFirstPresentation().slides).toHaveLength(2)
      })

      it('should add slide after specified slide', () => {
        const { addSlide } = usePresentationStore.getState()
        const firstSlideId = getFirstSlide().id

        act(() => {
          addSlide(presentationId)
          addSlide(presentationId)
        })

        // Add after first slide
        let newSlideId: string | null = null
        act(() => {
          newSlideId = addSlide(presentationId, firstSlideId)
        })

        const slides = getFirstPresentation().slides
        // The new slide should be at index 1 (after the first slide)
        expect(slides[1]?.id).toBe(newSlideId)
      })

      it('should return null if presentation does not exist', () => {
        const { addSlide } = usePresentationStore.getState()

        let result: string | null = ''
        act(() => {
          result = addSlide('non-existent-id')
        })

        expect(result).toBeNull()
      })

      it('should return the new slide ID', () => {
        const { addSlide } = usePresentationStore.getState()

        let newSlideId: string | null = null
        act(() => {
          newSlideId = addSlide(presentationId)
        })

        expect(newSlideId).toBeDefined()
        expect(typeof newSlideId).toBe('string')
      })

      it('should add slide at end when afterSlideId does not exist', () => {
        const { addSlide } = usePresentationStore.getState()

        // Add slide referencing non-existent afterSlideId
        let newSlideId: string | null = null
        act(() => {
          newSlideId = addSlide(presentationId, 'non-existent-slide-id')
        })

        const slides = getFirstPresentation().slides
        // The new slide should be at the end
        expect(slides[slides.length - 1]?.id).toBe(newSlideId)
      })
    })

    describe('deleteSlide', () => {
      it('should delete a slide from the presentation', () => {
        const { addSlide, deleteSlide } = usePresentationStore.getState()

        let slideToDelete: string | null = null
        act(() => {
          slideToDelete = addSlide(presentationId)
        })

        expect(getFirstPresentation().slides).toHaveLength(2)

        act(() => {
          deleteSlide(presentationId, slideToDelete!)
        })

        expect(getFirstPresentation().slides).toHaveLength(1)
      })
    })

    describe('updateSlide', () => {
      it('should update slide title', () => {
        const { updateSlide } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          updateSlide(presentationId, slideId, { title: 'New Title' })
        })

        expect(getFirstSlide().title).toBe('New Title')
      })

      it('should update slide notes', () => {
        const { updateSlide } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          updateSlide(presentationId, slideId, { notes: 'Speaker notes' })
        })

        expect(getFirstSlide().notes).toBe('Speaker notes')
      })
    })

    describe('reorderSlides', () => {
      it('should reorder slides according to the provided array', () => {
        const { addSlide, reorderSlides } = usePresentationStore.getState()

        let slide2Id: string | null = null
        let slide3Id: string | null = null
        act(() => {
          slide2Id = addSlide(presentationId)
          slide3Id = addSlide(presentationId)
        })

        const firstSlideId = getFirstSlide().id

        // Reverse the order
        act(() => {
          reorderSlides(presentationId, [slide3Id!, slide2Id!, firstSlideId])
        })

        const slides = getFirstPresentation().slides
        expect(slides[0]?.id).toBe(slide3Id)
        expect(slides[1]?.id).toBe(slide2Id)
        expect(slides[2]?.id).toBe(firstSlideId)
      })
    })

    describe('duplicateSlide', () => {
      it('should create a copy of the slide', () => {
        const { duplicateSlide } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          duplicateSlide(presentationId, slideId)
        })

        expect(getFirstPresentation().slides).toHaveLength(2)
      })

      it('should append "(Copy)" to the duplicated slide title', () => {
        const { duplicateSlide, updateSlide } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          updateSlide(presentationId, slideId, { title: 'Original Slide' })
        })

        act(() => {
          duplicateSlide(presentationId, slideId)
        })

        const slides = getFirstPresentation().slides
        expect(slides[1]?.title).toBe('Original Slide (Copy)')
      })

      it('should return null if slide does not exist', () => {
        const { duplicateSlide } = usePresentationStore.getState()

        let result: string | null = ''
        act(() => {
          result = duplicateSlide(presentationId, 'non-existent-id')
        })

        expect(result).toBeNull()
      })

      it('should insert the copy after the original slide', () => {
        const { addSlide, duplicateSlide } = usePresentationStore.getState()

        act(() => {
          addSlide(presentationId)
        })

        const firstSlideId = getFirstSlide().id

        let duplicatedId: string | null = null
        act(() => {
          duplicatedId = duplicateSlide(presentationId, firstSlideId)
        })

        const slides = getFirstPresentation().slides
        // Duplicated slide should be at index 1 (after original at index 0)
        expect(slides[1]?.id).toBe(duplicatedId)
      })

      it('should duplicate slide with elements and create new element IDs', () => {
        const { addElement, duplicateSlide } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        const element = createTestTextElement('element-1')
        act(() => {
          addElement(presentationId, slideId, element)
        })

        let duplicatedId: string | null = null
        act(() => {
          duplicatedId = duplicateSlide(presentationId, slideId)
        })

        const slides = getFirstPresentation().slides
        const originalSlide = slides.find(s => s.id === slideId)
        const duplicatedSlide = slides.find(s => s.id === duplicatedId)

        // Check elements were duplicated with new IDs
        expect(originalSlide?.elements[0]?.id).toBe('element-1')
        expect(duplicatedSlide?.elements[0]?.id).not.toBe('element-1')
        expect(duplicatedSlide?.elements).toHaveLength(1)
      })

      it('should return null if presentation does not exist', () => {
        const { duplicateSlide } = usePresentationStore.getState()

        let result: string | null = ''
        act(() => {
          result = duplicateSlide('non-existent-pres', 'any-slide')
        })

        expect(result).toBeNull()
      })
    })

    describe('updateSlideBackground', () => {
      it('should update slide background color', () => {
        const { updateSlideBackground } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          updateSlideBackground(presentationId, slideId, { color: '#000000' })
        })

        expect(getFirstSlide().background.color).toBe('#000000')
      })

      it('should update slide background type', () => {
        const { updateSlideBackground } = usePresentationStore.getState()
        const slideId = getFirstSlide().id

        act(() => {
          updateSlideBackground(presentationId, slideId, { type: 'gradient', gradientStart: '#fff', gradientEnd: '#000' })
        })

        expect(getFirstSlide().background.type).toBe('gradient')
      })
    })
  })

  describe('Element Actions', () => {
    let presentationId: string
    let slideId: string

    beforeEach(() => {
      act(() => {
        presentationId = usePresentationStore.getState().createPresentation()
        slideId = getFirstSlide().id
      })
    })

    describe('addElement', () => {
      it('should add an element to the slide', () => {
        const { addElement } = usePresentationStore.getState()
        const element = createTestTextElement('element-1')

        act(() => {
          addElement(presentationId, slideId, element)
        })

        const elements = getFirstSlide().elements
        expect(elements).toHaveLength(1)
        expect(elements[0]?.id).toBe('element-1')
      })

      it('should add multiple elements to the slide', () => {
        const { addElement } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1')
        const element2 = createTestShapeElement('element-2')

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        expect(getFirstSlide().elements).toHaveLength(2)
      })
    })

    describe('deleteElement', () => {
      it('should delete an element from the slide', () => {
        const { addElement, deleteElement } = usePresentationStore.getState()
        const element = createTestTextElement('element-1')

        act(() => {
          addElement(presentationId, slideId, element)
        })

        expect(getFirstSlide().elements).toHaveLength(1)

        act(() => {
          deleteElement(presentationId, slideId, 'element-1')
        })

        expect(getFirstSlide().elements).toHaveLength(0)
      })
    })

    describe('deleteElements', () => {
      it('should delete multiple elements from the slide', () => {
        const { addElement, deleteElements } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1')
        const element2 = createTestShapeElement('element-2')
        const element3 = createTestTextElement('element-3')

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
          addElement(presentationId, slideId, element3)
        })

        expect(getFirstSlide().elements).toHaveLength(3)

        act(() => {
          deleteElements(presentationId, slideId, ['element-1', 'element-3'])
        })

        const elements = getFirstSlide().elements
        expect(elements).toHaveLength(1)
        expect(elements[0]?.id).toBe('element-2')
      })
    })

    describe('updateElement', () => {
      it('should update an element position', () => {
        const { addElement, updateElement } = usePresentationStore.getState()
        const element = createTestTextElement('element-1')

        act(() => {
          addElement(presentationId, slideId, element)
        })

        act(() => {
          updateElement(presentationId, slideId, 'element-1', { position: { x: 200, y: 200 } })
        })

        expect(getFirstSlide().elements[0]?.position).toEqual({ x: 200, y: 200 })
      })

      it('should update element dimensions', () => {
        const { addElement, updateElement } = usePresentationStore.getState()
        const element = createTestTextElement('element-1')

        act(() => {
          addElement(presentationId, slideId, element)
        })

        act(() => {
          updateElement(presentationId, slideId, 'element-1', { dimensions: { width: 300, height: 100 } })
        })

        expect(getFirstSlide().elements[0]?.dimensions).toEqual({ width: 300, height: 100 })
      })
    })

    describe('updateElements', () => {
      it('should update multiple elements at once', () => {
        const { addElement, updateElements } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1')
        const element2 = createTestShapeElement('element-2')

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        act(() => {
          updateElements(presentationId, slideId, [
            { id: 'element-1', changes: { position: { x: 10, y: 10 } } },
            { id: 'element-2', changes: { position: { x: 20, y: 20 } } },
          ])
        })

        const elements = getFirstSlide().elements
        expect(elements[0]?.position).toEqual({ x: 10, y: 10 })
        expect(elements[1]?.position).toEqual({ x: 20, y: 20 })
      })
    })

    describe('reorderElements', () => {
      it('should reorder elements and update zIndex', () => {
        const { addElement, reorderElements } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)
        const element3 = createTestTextElement('element-3', 2)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
          addElement(presentationId, slideId, element3)
        })

        // Reverse order
        act(() => {
          reorderElements(presentationId, slideId, ['element-3', 'element-2', 'element-1'])
        })

        const elements = getFirstSlide().elements
        expect(elements[0]?.id).toBe('element-3')
        expect(elements[0]?.zIndex).toBe(0)
        expect(elements[1]?.id).toBe('element-2')
        expect(elements[1]?.zIndex).toBe(1)
        expect(elements[2]?.id).toBe('element-1')
        expect(elements[2]?.zIndex).toBe(2)
      })
    })

    describe('bringElementForward', () => {
      it('should increase element zIndex by swapping with next element', () => {
        const { addElement, bringElementForward } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        act(() => {
          bringElementForward(presentationId, slideId, 'element-1')
        })

        const elements = getFirstSlide().elements
        const el1 = elements.find(e => e.id === 'element-1')
        const el2 = elements.find(e => e.id === 'element-2')
        expect(el1?.zIndex).toBe(1)
        expect(el2?.zIndex).toBe(0)
      })

      it('should do nothing if element is already at front', () => {
        const { addElement, bringElementForward } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        act(() => {
          bringElementForward(presentationId, slideId, 'element-2')
        })

        const elements = getFirstSlide().elements
        const el2 = elements.find(e => e.id === 'element-2')
        expect(el2?.zIndex).toBe(1)
      })
    })

    describe('sendElementBackward', () => {
      it('should decrease element zIndex by swapping with previous element', () => {
        const { addElement, sendElementBackward } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        act(() => {
          sendElementBackward(presentationId, slideId, 'element-2')
        })

        const elements = getFirstSlide().elements
        const el1 = elements.find(e => e.id === 'element-1')
        const el2 = elements.find(e => e.id === 'element-2')
        expect(el1?.zIndex).toBe(1)
        expect(el2?.zIndex).toBe(0)
      })

      it('should do nothing if element is already at back', () => {
        const { addElement, sendElementBackward } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
        })

        act(() => {
          sendElementBackward(presentationId, slideId, 'element-1')
        })

        const elements = getFirstSlide().elements
        const el1 = elements.find(e => e.id === 'element-1')
        expect(el1?.zIndex).toBe(0)
      })
    })

    describe('bringElementToFront', () => {
      it('should move element to highest zIndex', () => {
        const { addElement, bringElementToFront } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)
        const element3 = createTestTextElement('element-3', 2)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
          addElement(presentationId, slideId, element3)
        })

        act(() => {
          bringElementToFront(presentationId, slideId, 'element-1')
        })

        const elements = getFirstSlide().elements
        const el1 = elements.find(e => e.id === 'element-1')
        expect(el1?.zIndex).toBe(2) // Highest zIndex
      })
    })

    describe('sendElementToBack', () => {
      it('should move element to lowest zIndex', () => {
        const { addElement, sendElementToBack } = usePresentationStore.getState()
        const element1 = createTestTextElement('element-1', 0)
        const element2 = createTestShapeElement('element-2', 1)
        const element3 = createTestTextElement('element-3', 2)

        act(() => {
          addElement(presentationId, slideId, element1)
          addElement(presentationId, slideId, element2)
          addElement(presentationId, slideId, element3)
        })

        act(() => {
          sendElementToBack(presentationId, slideId, 'element-3')
        })

        const elements = getFirstSlide().elements
        const el3 = elements.find(e => e.id === 'element-3')
        expect(el3?.zIndex).toBe(0) // Lowest zIndex
      })
    })
  })

  describe('Selector Methods', () => {
    let presentationId: string
    let slideId: string

    beforeEach(() => {
      act(() => {
        presentationId = usePresentationStore.getState().createPresentation()
        slideId = getFirstSlide().id
      })
    })

    describe('getCurrentPresentation', () => {
      it('should return the current presentation', () => {
        const presentation = usePresentationStore.getState().getCurrentPresentation()
        expect(presentation).toBeDefined()
        expect(presentation?.id).toBe(presentationId)
      })

      it('should return null if no presentation is selected', () => {
        act(() => {
          usePresentationStore.getState().setCurrentPresentation(null)
        })

        const presentation = usePresentationStore.getState().getCurrentPresentation()
        expect(presentation).toBeNull()
      })
    })

    describe('getPresentation', () => {
      it('should return presentation by id', () => {
        const presentation = usePresentationStore.getState().getPresentation(presentationId)
        expect(presentation).toBeDefined()
        expect(presentation?.id).toBe(presentationId)
      })

      it('should return undefined for non-existent id', () => {
        const presentation = usePresentationStore.getState().getPresentation('non-existent')
        expect(presentation).toBeUndefined()
      })
    })

    describe('getSlide', () => {
      it('should return slide by id', () => {
        const slide = usePresentationStore.getState().getSlide(presentationId, slideId)
        expect(slide).toBeDefined()
        expect(slide?.id).toBe(slideId)
      })

      it('should return undefined for non-existent slide', () => {
        const slide = usePresentationStore.getState().getSlide(presentationId, 'non-existent')
        expect(slide).toBeUndefined()
      })
    })

    describe('getElement', () => {
      it('should return element by id', () => {
        const { addElement } = usePresentationStore.getState()
        const element = createTestTextElement('element-1')

        act(() => {
          addElement(presentationId, slideId, element)
        })

        const foundElement = usePresentationStore.getState().getElement(presentationId, slideId, 'element-1')
        expect(foundElement).toBeDefined()
        expect(foundElement?.id).toBe('element-1')
      })

      it('should return undefined for non-existent element', () => {
        const element = usePresentationStore.getState().getElement(presentationId, slideId, 'non-existent')
        expect(element).toBeUndefined()
      })
    })
  })
})
