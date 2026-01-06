/**
 * Zustand store for managing presentations, slides, and elements.
 * This store handles all data operations for the presentation editor.
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type {
  Presentation,
  Slide,
  SlideElement,
  SlideBackground,
  SlideTransition,
  PresentationTheme,
} from '../types/presentation'
import { createBlankPresentation, createBlankSlide } from '../types/presentation'
import type { SlideLayoutType } from '../types/layout'
import { createSlideWithLayout, applyLayoutToSlide } from '../types/layout'
import {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  exportPresentationToJson,
  exportAllPresentationsToJson,
  importAllPresentationsFromJson,
  downloadFile,
  triggerFileImport,
  type StorageResult,
} from '../utils/localStorage'

/**
 * Generate a unique ID for entities
 */
function generateId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Presentation store state interface
 */
interface PresentationState {
  // Data
  presentations: Presentation[]
  currentPresentationId: string | null

  // Presentation actions
  createPresentation: (name?: string) => string
  deletePresentation: (id: string) => void
  updatePresentation: (id: string, updates: Partial<Omit<Presentation, 'id'>>) => void
  setCurrentPresentation: (id: string | null) => void
  duplicatePresentation: (id: string) => string | null
  updatePresentationTheme: (id: string, theme: Partial<PresentationTheme>) => void

  // Slide actions
  addSlide: (presentationId: string, afterSlideId?: string) => string | null
  addSlideWithLayout: (
    presentationId: string,
    layoutType: SlideLayoutType,
    afterSlideId?: string
  ) => string | null
  applyLayout: (presentationId: string, slideId: string, layoutType: SlideLayoutType) => void
  deleteSlide: (presentationId: string, slideId: string) => void
  updateSlide: (
    presentationId: string,
    slideId: string,
    updates: Partial<Omit<Slide, 'id'>>
  ) => void
  reorderSlides: (presentationId: string, slideIds: string[]) => void
  duplicateSlide: (presentationId: string, slideId: string) => string | null
  updateSlideBackground: (
    presentationId: string,
    slideId: string,
    background: Partial<SlideBackground>
  ) => void
  updateSlideTransition: (
    presentationId: string,
    slideId: string,
    transition: Partial<SlideTransition>
  ) => void

  // Element actions
  addElement: (presentationId: string, slideId: string, element: SlideElement) => void
  deleteElement: (presentationId: string, slideId: string, elementId: string) => void
  deleteElements: (presentationId: string, slideId: string, elementIds: string[]) => void
  updateElement: (
    presentationId: string,
    slideId: string,
    elementId: string,
    updates: Partial<SlideElement>
  ) => void
  updateElements: (
    presentationId: string,
    slideId: string,
    updates: Array<{ id: string; changes: Partial<SlideElement> }>
  ) => void
  reorderElements: (presentationId: string, slideId: string, elementIds: string[]) => void
  bringElementForward: (presentationId: string, slideId: string, elementId: string) => void
  sendElementBackward: (presentationId: string, slideId: string, elementId: string) => void
  bringElementToFront: (presentationId: string, slideId: string, elementId: string) => void
  sendElementToBack: (presentationId: string, slideId: string, elementId: string) => void

  // Selectors (computed helpers)
  getCurrentPresentation: () => Presentation | null
  getPresentation: (id: string) => Presentation | undefined
  getSlide: (presentationId: string, slideId: string) => Slide | undefined
  getElement: (
    presentationId: string,
    slideId: string,
    elementId: string
  ) => SlideElement | undefined

  // Storage actions
  saveToStorage: () => StorageResult<void>
  loadFromStorage: () => StorageResult<{ presentations: Presentation[]; currentPresentationId: string | null }>
  clearStorage: () => StorageResult<void>
  exportCurrentPresentation: () => void
  exportAllPresentations: () => void
  importPresentations: (onComplete?: (result: StorageResult<Presentation[]>) => void) => void
}

/**
 * Presentation store for managing all presentation data
 */
export const usePresentationStore = create<PresentationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        presentations: [],
        currentPresentationId: null,

        // Presentation actions
        createPresentation: (name) => {
          const id = generateId()
          const presentation = createBlankPresentation(id, name)
          set(
            (state) => ({
              presentations: [...state.presentations, presentation],
              currentPresentationId: id,
            }),
            undefined,
            'createPresentation'
          )
          return id
        },

        deletePresentation: (id) => {
          set(
            (state) => ({
              presentations: state.presentations.filter((p) => p.id !== id),
              currentPresentationId:
                state.currentPresentationId === id ? null : state.currentPresentationId,
            }),
            undefined,
            'deletePresentation'
          )
        },

        updatePresentation: (id, updates) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
              ),
            }),
            undefined,
            'updatePresentation'
          )
        },

        setCurrentPresentation: (id) => {
          set({ currentPresentationId: id }, undefined, 'setCurrentPresentation')
        },

        duplicatePresentation: (id) => {
          const state = get()
          const original = state.presentations.find((p) => p.id === id)
          if (!original) return null

          const newId = generateId()
          const now = new Date().toISOString()
          const duplicated: Presentation = {
            ...original,
            id: newId,
            name: `${original.name} (Copy)`,
            slides: original.slides.map((slide) => ({
              ...slide,
              id: generateId(),
              elements: slide.elements.map((el) => ({ ...el, id: generateId() })),
            })),
            createdAt: now,
            updatedAt: now,
          }

          set(
            (state) => ({
              presentations: [...state.presentations, duplicated],
            }),
            undefined,
            'duplicatePresentation'
          )
          return newId
        },

        updatePresentationTheme: (id, theme) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === id
                  ? {
                      ...p,
                      theme: { ...p.theme, ...theme },
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updatePresentationTheme'
          )
        },

        // Slide actions
        addSlide: (presentationId, afterSlideId) => {
          const state = get()
          const presentation = state.presentations.find((p) => p.id === presentationId)
          if (!presentation) return null

          const newSlideId = generateId()
          const newSlide = createBlankSlide(newSlideId)

          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                let newSlides: Slide[]
                if (afterSlideId) {
                  const index = p.slides.findIndex((s) => s.id === afterSlideId)
                  if (index !== -1) {
                    newSlides = [
                      ...p.slides.slice(0, index + 1),
                      newSlide,
                      ...p.slides.slice(index + 1),
                    ]
                  } else {
                    newSlides = [...p.slides, newSlide]
                  }
                } else {
                  newSlides = [...p.slides, newSlide]
                }

                return {
                  ...p,
                  slides: newSlides,
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'addSlide'
          )
          return newSlideId
        },

        addSlideWithLayout: (presentationId, layoutType, afterSlideId) => {
          const state = get()
          const presentation = state.presentations.find((p) => p.id === presentationId)
          if (!presentation) return null

          const newSlideId = generateId()
          const newSlide = createSlideWithLayout(newSlideId, layoutType)

          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                let newSlides: Slide[]
                if (afterSlideId) {
                  const index = p.slides.findIndex((s) => s.id === afterSlideId)
                  if (index !== -1) {
                    newSlides = [
                      ...p.slides.slice(0, index + 1),
                      newSlide,
                      ...p.slides.slice(index + 1),
                    ]
                  } else {
                    newSlides = [...p.slides, newSlide]
                  }
                } else {
                  newSlides = [...p.slides, newSlide]
                }

                return {
                  ...p,
                  slides: newSlides,
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'addSlideWithLayout'
          )
          return newSlideId
        },

        applyLayout: (presentationId, slideId, layoutType) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId ? applyLayoutToSlide(s, layoutType) : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'applyLayout'
          )
        },

        deleteSlide: (presentationId, slideId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.filter((s) => s.id !== slideId),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'deleteSlide'
          )
        },

        updateSlide: (presentationId, slideId, updates) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? { ...s, ...updates, updatedAt: new Date().toISOString() }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updateSlide'
          )
        },

        reorderSlides: (presentationId, slideIds) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                const slidesMap = new Map(p.slides.map((s) => [s.id, s]))
                const reorderedSlides = slideIds
                  .map((id) => slidesMap.get(id))
                  .filter((s): s is Slide => s !== undefined)

                return {
                  ...p,
                  slides: reorderedSlides,
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'reorderSlides'
          )
        },

        duplicateSlide: (presentationId, slideId) => {
          const state = get()
          const presentation = state.presentations.find((p) => p.id === presentationId)
          if (!presentation) return null

          const original = presentation.slides.find((s) => s.id === slideId)
          if (!original) return null

          const newId = generateId()
          const now = new Date().toISOString()
          const duplicated: Slide = {
            ...original,
            id: newId,
            title: `${original.title} (Copy)`,
            elements: original.elements.map((el) => ({ ...el, id: generateId() })),
            createdAt: now,
            updatedAt: now,
          }

          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                const index = p.slides.findIndex((s) => s.id === slideId)
                const newSlides = [
                  ...p.slides.slice(0, index + 1),
                  duplicated,
                  ...p.slides.slice(index + 1),
                ]

                return {
                  ...p,
                  slides: newSlides,
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'duplicateSlide'
          )
          return newId
        },

        updateSlideBackground: (presentationId, slideId, background) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              background: { ...s.background, ...background },
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updateSlideBackground'
          )
        },

        updateSlideTransition: (presentationId, slideId, transition) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              transition: { ...s.transition, ...transition },
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updateSlideTransition'
          )
        },

        // Element actions
        addElement: (presentationId, slideId, element) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              elements: [...s.elements, element],
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'addElement'
          )
        },

        deleteElement: (presentationId, slideId, elementId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              elements: s.elements.filter((e) => e.id !== elementId),
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'deleteElement'
          )
        },

        deleteElements: (presentationId, slideId, elementIds) => {
          const idsToDelete = new Set(elementIds)
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              elements: s.elements.filter((e) => !idsToDelete.has(e.id)),
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'deleteElements'
          )
        },

        updateElement: (presentationId, slideId, elementId, updates) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              elements: s.elements.map((e) =>
                                e.id === elementId ? ({ ...e, ...updates } as SlideElement) : e
                              ),
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updateElement'
          )
        },

        updateElements: (presentationId, slideId, updates) => {
          const updatesMap = new Map(updates.map((u) => [u.id, u.changes]))
          set(
            (state) => ({
              presentations: state.presentations.map((p) =>
                p.id === presentationId
                  ? {
                      ...p,
                      slides: p.slides.map((s) =>
                        s.id === slideId
                          ? {
                              ...s,
                              elements: s.elements.map((e) => {
                                const changes = updatesMap.get(e.id)
                                return changes ? ({ ...e, ...changes } as SlideElement) : e
                              }),
                              updatedAt: new Date().toISOString(),
                            }
                          : s
                      ),
                      updatedAt: new Date().toISOString(),
                    }
                  : p
              ),
            }),
            undefined,
            'updateElements'
          )
        },

        reorderElements: (presentationId, slideId, elementIds) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                return {
                  ...p,
                  slides: p.slides.map((s) => {
                    if (s.id !== slideId) return s

                    const elementsMap = new Map(s.elements.map((e) => [e.id, e]))
                    const reorderedElements = elementIds
                      .map((id) => elementsMap.get(id))
                      .filter((e): e is SlideElement => e !== undefined)
                      .map((e, index) => ({ ...e, zIndex: index }))

                    return {
                      ...s,
                      elements: reorderedElements,
                      updatedAt: new Date().toISOString(),
                    }
                  }),
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'reorderElements'
          )
        },

        bringElementForward: (presentationId, slideId, elementId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                return {
                  ...p,
                  slides: p.slides.map((s) => {
                    if (s.id !== slideId) return s

                    const sorted = [...s.elements].sort((a, b) => a.zIndex - b.zIndex)
                    const index = sorted.findIndex((e) => e.id === elementId)
                    if (index === -1 || index === sorted.length - 1) return s

                    // Swap with the next element
                    const current = sorted[index]
                    const next = sorted[index + 1]
                    if (!current || !next) return s
                    sorted[index] = next
                    sorted[index + 1] = current

                    const reindexed = sorted.map((e, i) => ({ ...e, zIndex: i }))

                    return {
                      ...s,
                      elements: reindexed,
                      updatedAt: new Date().toISOString(),
                    }
                  }),
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'bringElementForward'
          )
        },

        sendElementBackward: (presentationId, slideId, elementId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                return {
                  ...p,
                  slides: p.slides.map((s) => {
                    if (s.id !== slideId) return s

                    const sorted = [...s.elements].sort((a, b) => a.zIndex - b.zIndex)
                    const index = sorted.findIndex((e) => e.id === elementId)
                    if (index === -1 || index === 0) return s

                    // Swap with the previous element
                    const current = sorted[index]
                    const prev = sorted[index - 1]
                    if (!current || !prev) return s
                    sorted[index] = prev
                    sorted[index - 1] = current

                    const reindexed = sorted.map((e, i) => ({ ...e, zIndex: i }))

                    return {
                      ...s,
                      elements: reindexed,
                      updatedAt: new Date().toISOString(),
                    }
                  }),
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'sendElementBackward'
          )
        },

        bringElementToFront: (presentationId, slideId, elementId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                return {
                  ...p,
                  slides: p.slides.map((s) => {
                    if (s.id !== slideId) return s

                    const element = s.elements.find((e) => e.id === elementId)
                    if (!element) return s

                    const others = s.elements.filter((e) => e.id !== elementId)
                    const reindexed = [...others, element].map((e, i) => ({ ...e, zIndex: i }))

                    return {
                      ...s,
                      elements: reindexed,
                      updatedAt: new Date().toISOString(),
                    }
                  }),
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'bringElementToFront'
          )
        },

        sendElementToBack: (presentationId, slideId, elementId) => {
          set(
            (state) => ({
              presentations: state.presentations.map((p) => {
                if (p.id !== presentationId) return p

                return {
                  ...p,
                  slides: p.slides.map((s) => {
                    if (s.id !== slideId) return s

                    const element = s.elements.find((e) => e.id === elementId)
                    if (!element) return s

                    const others = s.elements.filter((e) => e.id !== elementId)
                    const reindexed = [element, ...others].map((e, i) => ({ ...e, zIndex: i }))

                    return {
                      ...s,
                      elements: reindexed,
                      updatedAt: new Date().toISOString(),
                    }
                  }),
                  updatedAt: new Date().toISOString(),
                }
              }),
            }),
            undefined,
            'sendElementToBack'
          )
        },

        // Selectors
        getCurrentPresentation: () => {
          const state = get()
          if (!state.currentPresentationId) return null
          return state.presentations.find((p) => p.id === state.currentPresentationId) ?? null
        },

        getPresentation: (id) => {
          return get().presentations.find((p) => p.id === id)
        },

        getSlide: (presentationId, slideId) => {
          const presentation = get().presentations.find((p) => p.id === presentationId)
          return presentation?.slides.find((s) => s.id === slideId)
        },

        getElement: (presentationId, slideId, elementId) => {
          const slide = get().getSlide(presentationId, slideId)
          return slide?.elements.find((e) => e.id === elementId)
        },

        // Storage actions
        saveToStorage: () => {
          const state = get()
          return saveToLocalStorage(state.presentations, state.currentPresentationId)
        },

        loadFromStorage: () => {
          const result = loadFromLocalStorage()
          if (result.success && result.data) {
            set(
              {
                presentations: result.data.presentations,
                currentPresentationId: result.data.currentPresentationId,
              },
              undefined,
              'loadFromStorage'
            )
          }
          return result
        },

        clearStorage: () => {
          const result = clearLocalStorage()
          if (result.success) {
            set(
              {
                presentations: [],
                currentPresentationId: null,
              },
              undefined,
              'clearStorage'
            )
          }
          return result
        },

        exportCurrentPresentation: () => {
          const state = get()
          const presentation = state.getCurrentPresentation()
          if (presentation) {
            const json = exportPresentationToJson(presentation)
            const filename = `${presentation.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`
            downloadFile(json, filename)
          }
        },

        exportAllPresentations: () => {
          const state = get()
          if (state.presentations.length > 0) {
            const json = exportAllPresentationsToJson(state.presentations)
            const filename = `presentations_backup_${new Date().toISOString().split('T')[0]}.json`
            downloadFile(json, filename)
          }
        },

        importPresentations: (onComplete) => {
          triggerFileImport((content) => {
            const result = importAllPresentationsFromJson(content)
            if (result.success && result.data) {
              // Generate new IDs to avoid conflicts
              const now = new Date().toISOString()
              const importedPresentations = result.data.map((p) => ({
                ...p,
                id: generateId(),
                slides: p.slides.map((s) => ({
                  ...s,
                  id: generateId(),
                  elements: s.elements.map((e) => ({ ...e, id: generateId() })),
                })),
                createdAt: now,
                updatedAt: now,
              }))

              set(
                (state) => ({
                  presentations: [...state.presentations, ...importedPresentations],
                }),
                undefined,
                'importPresentations'
              )
            }
            onComplete?.(result)
          })
        },
      }),
      {
        name: 'presentation-storage',
        partialize: (state) => ({
          presentations: state.presentations,
          currentPresentationId: state.currentPresentationId,
        }),
      }
    ),
    { name: 'PresentationStore' }
  )
)

export default usePresentationStore
