/**
 * Unit tests for editorStore
 * Tests all UI state, selection, tools, viewport, and interaction handling
 */

import { act } from '@testing-library/react'
import { useEditorStore } from '../editorStore'
import { DEFAULT_EDITOR_STATE, ZOOM_MIN, ZOOM_MAX, ZOOM_STEP } from '../../types/editor'

// Helper to reset the store between tests
const resetStore = () => {
  act(() => {
    useEditorStore.getState().resetEditorState()
  })
}

describe('editorStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('Initial State', () => {
    it('should have default state values', () => {
      const state = useEditorStore.getState()
      expect(state.currentPresentationId).toBeNull()
      expect(state.currentSlideId).toBeNull()
      expect(state.selectedElementIds).toEqual([])
      expect(state.hoveredElementId).toBeNull()
      expect(state.activeTool).toBe('select')
      expect(state.activeShapeType).toBe('rectangle')
      expect(state.interactionMode).toBe('idle')
      expect(state.selectionBox).toBeNull()
    })

    it('should have default viewport state', () => {
      const state = useEditorStore.getState()
      expect(state.viewport.zoom).toBe(1)
      expect(state.viewport.panX).toBe(0)
      expect(state.viewport.panY).toBe(0)
    })

    it('should have default UI state', () => {
      const state = useEditorStore.getState()
      expect(state.isSidebarOpen).toBe(true)
      expect(state.isPropertiesPanelOpen).toBe(true)
      expect(state.isFullscreen).toBe(false)
      expect(state.showGrid).toBe(false)
      expect(state.snapToGrid).toBe(true)
      expect(state.gridSize).toBe(10)
    })

    it('should have default clipboard state', () => {
      const state = useEditorStore.getState()
      expect(state.clipboard.elementIds).toEqual([])
      expect(state.clipboard.sourceSlideId).toBeNull()
    })

    it('should have default history state', () => {
      const state = useEditorStore.getState()
      expect(state.historyIndex).toBe(-1)
      expect(state.canUndo).toBe(false)
      expect(state.canRedo).toBe(false)
    })
  })

  describe('Context Actions', () => {
    describe('setCurrentPresentation', () => {
      it('should set the current presentation id', () => {
        act(() => {
          useEditorStore.getState().setCurrentPresentation('pres-1')
        })

        expect(useEditorStore.getState().currentPresentationId).toBe('pres-1')
      })

      it('should allow setting to null', () => {
        act(() => {
          useEditorStore.getState().setCurrentPresentation('pres-1')
        })

        act(() => {
          useEditorStore.getState().setCurrentPresentation(null)
        })

        expect(useEditorStore.getState().currentPresentationId).toBeNull()
      })
    })

    describe('setCurrentSlide', () => {
      it('should set the current slide id', () => {
        act(() => {
          useEditorStore.getState().setCurrentSlide('slide-1')
        })

        expect(useEditorStore.getState().currentSlideId).toBe('slide-1')
      })

      it('should clear selection when changing slide', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        expect(useEditorStore.getState().selectedElementIds).toHaveLength(2)

        act(() => {
          useEditorStore.getState().setCurrentSlide('slide-2')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual([])
      })

      it('should clear hovered element when changing slide', () => {
        act(() => {
          useEditorStore.getState().setHoveredElement('element-1')
        })

        act(() => {
          useEditorStore.getState().setCurrentSlide('slide-2')
        })

        expect(useEditorStore.getState().hoveredElementId).toBeNull()
      })
    })
  })

  describe('Selection Actions', () => {
    describe('selectElement', () => {
      it('should select a single element', () => {
        act(() => {
          useEditorStore.getState().selectElement('element-1')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1'])
      })

      it('should replace previous selection', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        act(() => {
          useEditorStore.getState().selectElement('element-3')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-3'])
      })
    })

    describe('selectElements', () => {
      it('should select multiple elements', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2', 'element-3'])
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1', 'element-2', 'element-3'])
      })

      it('should replace previous selection', () => {
        act(() => {
          useEditorStore.getState().selectElement('element-0')
        })

        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1', 'element-2'])
      })
    })

    describe('addToSelection', () => {
      it('should add element to existing selection', () => {
        act(() => {
          useEditorStore.getState().selectElement('element-1')
        })

        act(() => {
          useEditorStore.getState().addToSelection('element-2')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1', 'element-2'])
      })

      it('should not add duplicate elements', () => {
        act(() => {
          useEditorStore.getState().selectElement('element-1')
        })

        act(() => {
          useEditorStore.getState().addToSelection('element-1')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1'])
      })
    })

    describe('removeFromSelection', () => {
      it('should remove element from selection', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2', 'element-3'])
        })

        act(() => {
          useEditorStore.getState().removeFromSelection('element-2')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1', 'element-3'])
      })

      it('should do nothing if element is not in selection', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        act(() => {
          useEditorStore.getState().removeFromSelection('element-3')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual(['element-1', 'element-2'])
      })
    })

    describe('clearSelection', () => {
      it('should clear all selected elements', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        act(() => {
          useEditorStore.getState().clearSelection()
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual([])
      })
    })

    describe('setHoveredElement', () => {
      it('should set the hovered element', () => {
        act(() => {
          useEditorStore.getState().setHoveredElement('element-1')
        })

        expect(useEditorStore.getState().hoveredElementId).toBe('element-1')
      })

      it('should allow setting to null', () => {
        act(() => {
          useEditorStore.getState().setHoveredElement('element-1')
        })

        act(() => {
          useEditorStore.getState().setHoveredElement(null)
        })

        expect(useEditorStore.getState().hoveredElementId).toBeNull()
      })
    })
  })

  describe('Tool Actions', () => {
    describe('setActiveTool', () => {
      it('should set the active tool', () => {
        act(() => {
          useEditorStore.getState().setActiveTool('text')
        })

        expect(useEditorStore.getState().activeTool).toBe('text')
      })

      it('should clear selection when changing tool', () => {
        act(() => {
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
        })

        act(() => {
          useEditorStore.getState().setActiveTool('shape')
        })

        expect(useEditorStore.getState().selectedElementIds).toEqual([])
      })

      it('should reset interaction mode when changing tool', () => {
        act(() => {
          useEditorStore.getState().setInteractionMode('dragging')
        })

        act(() => {
          useEditorStore.getState().setActiveTool('pan')
        })

        expect(useEditorStore.getState().interactionMode).toBe('idle')
      })

      it.each(['select', 'text', 'shape', 'image', 'pan'] as const)('should set tool to %s', (tool) => {
        act(() => {
          useEditorStore.getState().setActiveTool(tool)
        })

        expect(useEditorStore.getState().activeTool).toBe(tool)
      })
    })

    describe('setActiveShapeType', () => {
      it('should set the active shape type', () => {
        act(() => {
          useEditorStore.getState().setActiveShapeType('circle')
        })

        expect(useEditorStore.getState().activeShapeType).toBe('circle')
      })

      it.each(['rectangle', 'circle', 'line', 'triangle'] as const)('should set shape type to %s', (shapeType) => {
        act(() => {
          useEditorStore.getState().setActiveShapeType(shapeType)
        })

        expect(useEditorStore.getState().activeShapeType).toBe(shapeType)
      })
    })
  })

  describe('Interaction Actions', () => {
    describe('setInteractionMode', () => {
      it.each(['idle', 'selecting', 'dragging', 'resizing', 'rotating', 'drawing'] as const)('should set mode to %s', (mode) => {
        act(() => {
          useEditorStore.getState().setInteractionMode(mode)
        })

        expect(useEditorStore.getState().interactionMode).toBe(mode)
      })
    })

    describe('setActiveResizeHandle', () => {
      it('should set the active resize handle', () => {
        act(() => {
          useEditorStore.getState().setActiveResizeHandle('top-left')
        })

        expect(useEditorStore.getState().activeResizeHandle).toBe('top-left')
      })

      it.each(['top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom', 'bottom-left', 'left'] as const)('should set handle to %s', (handle) => {
        act(() => {
          useEditorStore.getState().setActiveResizeHandle(handle)
        })

        expect(useEditorStore.getState().activeResizeHandle).toBe(handle)
      })

      it('should allow setting to null', () => {
        act(() => {
          useEditorStore.getState().setActiveResizeHandle('top-left')
        })

        act(() => {
          useEditorStore.getState().setActiveResizeHandle(null)
        })

        expect(useEditorStore.getState().activeResizeHandle).toBeNull()
      })
    })

    describe('startSelectionBox', () => {
      it('should start a selection box at given coordinates', () => {
        act(() => {
          useEditorStore.getState().startSelectionBox(100, 200)
        })

        const state = useEditorStore.getState()
        expect(state.selectionBox).toEqual({
          startX: 100,
          startY: 200,
          endX: 100,
          endY: 200,
        })
      })

      it('should set interaction mode to selecting', () => {
        act(() => {
          useEditorStore.getState().startSelectionBox(100, 200)
        })

        expect(useEditorStore.getState().interactionMode).toBe('selecting')
      })
    })

    describe('updateSelectionBox', () => {
      it('should update selection box end coordinates', () => {
        act(() => {
          useEditorStore.getState().startSelectionBox(100, 200)
        })

        act(() => {
          useEditorStore.getState().updateSelectionBox(300, 400)
        })

        const state = useEditorStore.getState()
        expect(state.selectionBox).toEqual({
          startX: 100,
          startY: 200,
          endX: 300,
          endY: 400,
        })
      })

      it('should do nothing if no selection box exists', () => {
        act(() => {
          useEditorStore.getState().updateSelectionBox(300, 400)
        })

        expect(useEditorStore.getState().selectionBox).toBeNull()
      })
    })

    describe('clearSelectionBox', () => {
      it('should clear the selection box', () => {
        act(() => {
          useEditorStore.getState().startSelectionBox(100, 200)
        })

        act(() => {
          useEditorStore.getState().clearSelectionBox()
        })

        expect(useEditorStore.getState().selectionBox).toBeNull()
      })

      it('should set interaction mode to idle', () => {
        act(() => {
          useEditorStore.getState().startSelectionBox(100, 200)
        })

        act(() => {
          useEditorStore.getState().clearSelectionBox()
        })

        expect(useEditorStore.getState().interactionMode).toBe('idle')
      })
    })
  })

  describe('Viewport Actions', () => {
    describe('setViewport', () => {
      it('should update viewport partially', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: 1.5 })
        })

        const state = useEditorStore.getState()
        expect(state.viewport.zoom).toBe(1.5)
        expect(state.viewport.panX).toBe(0)
        expect(state.viewport.panY).toBe(0)
      })

      it('should update multiple viewport properties', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: 2, panX: 100, panY: 50 })
        })

        const state = useEditorStore.getState()
        expect(state.viewport).toEqual({ zoom: 2, panX: 100, panY: 50 })
      })
    })

    describe('zoomIn', () => {
      it('should increase zoom by ZOOM_STEP', () => {
        const initialZoom = useEditorStore.getState().viewport.zoom

        act(() => {
          useEditorStore.getState().zoomIn()
        })

        expect(useEditorStore.getState().viewport.zoom).toBeCloseTo(initialZoom + ZOOM_STEP, 5)
      })

      it('should not exceed ZOOM_MAX', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: ZOOM_MAX })
        })

        act(() => {
          useEditorStore.getState().zoomIn()
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(ZOOM_MAX)
      })
    })

    describe('zoomOut', () => {
      it('should decrease zoom by ZOOM_STEP', () => {
        const initialZoom = useEditorStore.getState().viewport.zoom

        act(() => {
          useEditorStore.getState().zoomOut()
        })

        expect(useEditorStore.getState().viewport.zoom).toBeCloseTo(initialZoom - ZOOM_STEP, 5)
      })

      it('should not go below ZOOM_MIN', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: ZOOM_MIN })
        })

        act(() => {
          useEditorStore.getState().zoomOut()
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(ZOOM_MIN)
      })
    })

    describe('zoomTo', () => {
      it('should set zoom to specific level', () => {
        act(() => {
          useEditorStore.getState().zoomTo(2.5)
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(2.5)
      })

      it('should clamp zoom to ZOOM_MAX', () => {
        act(() => {
          useEditorStore.getState().zoomTo(10)
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(ZOOM_MAX)
      })

      it('should clamp zoom to ZOOM_MIN', () => {
        act(() => {
          useEditorStore.getState().zoomTo(0.01)
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(ZOOM_MIN)
      })
    })

    describe('resetZoom', () => {
      it('should reset zoom to 1', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: 2.5 })
        })

        act(() => {
          useEditorStore.getState().resetZoom()
        })

        expect(useEditorStore.getState().viewport.zoom).toBe(1)
      })
    })

    describe('pan', () => {
      it('should update pan position', () => {
        act(() => {
          useEditorStore.getState().pan(100, 50)
        })

        const state = useEditorStore.getState()
        expect(state.viewport.panX).toBe(100)
        expect(state.viewport.panY).toBe(50)
      })

      it('should accumulate pan deltas', () => {
        act(() => {
          useEditorStore.getState().pan(100, 50)
        })

        act(() => {
          useEditorStore.getState().pan(50, 25)
        })

        const state = useEditorStore.getState()
        expect(state.viewport.panX).toBe(150)
        expect(state.viewport.panY).toBe(75)
      })

      it('should support negative pan values', () => {
        act(() => {
          useEditorStore.getState().pan(-100, -50)
        })

        const state = useEditorStore.getState()
        expect(state.viewport.panX).toBe(-100)
        expect(state.viewport.panY).toBe(-50)
      })
    })

    describe('resetPan', () => {
      it('should reset pan to 0,0', () => {
        act(() => {
          useEditorStore.getState().pan(100, 50)
        })

        act(() => {
          useEditorStore.getState().resetPan()
        })

        const state = useEditorStore.getState()
        expect(state.viewport.panX).toBe(0)
        expect(state.viewport.panY).toBe(0)
      })

      it('should preserve zoom level', () => {
        act(() => {
          useEditorStore.getState().setViewport({ zoom: 2, panX: 100, panY: 50 })
        })

        act(() => {
          useEditorStore.getState().resetPan()
        })

        const state = useEditorStore.getState()
        expect(state.viewport.zoom).toBe(2)
      })
    })
  })

  describe('Clipboard Actions', () => {
    describe('copyElements', () => {
      it('should copy elements to clipboard', () => {
        act(() => {
          useEditorStore.getState().copyElements(['element-1', 'element-2'], 'slide-1')
        })

        const state = useEditorStore.getState()
        expect(state.clipboard.elementIds).toEqual(['element-1', 'element-2'])
        expect(state.clipboard.sourceSlideId).toBe('slide-1')
      })
    })

    describe('clearClipboard', () => {
      it('should clear the clipboard', () => {
        act(() => {
          useEditorStore.getState().copyElements(['element-1'], 'slide-1')
        })

        act(() => {
          useEditorStore.getState().clearClipboard()
        })

        const state = useEditorStore.getState()
        expect(state.clipboard.elementIds).toEqual([])
        expect(state.clipboard.sourceSlideId).toBeNull()
      })
    })
  })

  describe('History Actions', () => {
    describe('setHistoryState', () => {
      it('should set history state', () => {
        act(() => {
          useEditorStore.getState().setHistoryState(5, true, false)
        })

        const state = useEditorStore.getState()
        expect(state.historyIndex).toBe(5)
        expect(state.canUndo).toBe(true)
        expect(state.canRedo).toBe(false)
      })

      it('should update all history flags', () => {
        act(() => {
          useEditorStore.getState().setHistoryState(10, true, true)
        })

        const state = useEditorStore.getState()
        expect(state.historyIndex).toBe(10)
        expect(state.canUndo).toBe(true)
        expect(state.canRedo).toBe(true)
      })
    })
  })

  describe('UI Actions', () => {
    describe('toggleSidebar', () => {
      it('should toggle sidebar state', () => {
        expect(useEditorStore.getState().isSidebarOpen).toBe(true)

        act(() => {
          useEditorStore.getState().toggleSidebar()
        })

        expect(useEditorStore.getState().isSidebarOpen).toBe(false)

        act(() => {
          useEditorStore.getState().toggleSidebar()
        })

        expect(useEditorStore.getState().isSidebarOpen).toBe(true)
      })
    })

    describe('togglePropertiesPanel', () => {
      it('should toggle properties panel state', () => {
        expect(useEditorStore.getState().isPropertiesPanelOpen).toBe(true)

        act(() => {
          useEditorStore.getState().togglePropertiesPanel()
        })

        expect(useEditorStore.getState().isPropertiesPanelOpen).toBe(false)

        act(() => {
          useEditorStore.getState().togglePropertiesPanel()
        })

        expect(useEditorStore.getState().isPropertiesPanelOpen).toBe(true)
      })
    })

    describe('toggleFullscreen', () => {
      it('should toggle fullscreen state', () => {
        expect(useEditorStore.getState().isFullscreen).toBe(false)

        act(() => {
          useEditorStore.getState().toggleFullscreen()
        })

        expect(useEditorStore.getState().isFullscreen).toBe(true)

        act(() => {
          useEditorStore.getState().toggleFullscreen()
        })

        expect(useEditorStore.getState().isFullscreen).toBe(false)
      })
    })

    describe('toggleGrid', () => {
      it('should toggle grid visibility', () => {
        expect(useEditorStore.getState().showGrid).toBe(false)

        act(() => {
          useEditorStore.getState().toggleGrid()
        })

        expect(useEditorStore.getState().showGrid).toBe(true)

        act(() => {
          useEditorStore.getState().toggleGrid()
        })

        expect(useEditorStore.getState().showGrid).toBe(false)
      })
    })

    describe('toggleSnapToGrid', () => {
      it('should toggle snap to grid', () => {
        expect(useEditorStore.getState().snapToGrid).toBe(true)

        act(() => {
          useEditorStore.getState().toggleSnapToGrid()
        })

        expect(useEditorStore.getState().snapToGrid).toBe(false)

        act(() => {
          useEditorStore.getState().toggleSnapToGrid()
        })

        expect(useEditorStore.getState().snapToGrid).toBe(true)
      })
    })

    describe('setGridSize', () => {
      it('should set grid size', () => {
        act(() => {
          useEditorStore.getState().setGridSize(20)
        })

        expect(useEditorStore.getState().gridSize).toBe(20)
      })

      it('should enforce minimum grid size of 1', () => {
        act(() => {
          useEditorStore.getState().setGridSize(0)
        })

        expect(useEditorStore.getState().gridSize).toBe(1)

        act(() => {
          useEditorStore.getState().setGridSize(-5)
        })

        expect(useEditorStore.getState().gridSize).toBe(1)
      })
    })
  })

  describe('Reset', () => {
    describe('resetEditorState', () => {
      it('should reset all state to defaults', () => {
        // Modify various state properties
        act(() => {
          useEditorStore.getState().setCurrentPresentation('pres-1')
          useEditorStore.getState().setCurrentSlide('slide-1')
          useEditorStore.getState().selectElements(['element-1', 'element-2'])
          useEditorStore.getState().setActiveTool('shape')
          useEditorStore.getState().setViewport({ zoom: 2, panX: 100, panY: 50 })
          useEditorStore.getState().toggleSidebar()
          useEditorStore.getState().toggleGrid()
        })

        // Reset
        act(() => {
          useEditorStore.getState().resetEditorState()
        })

        // Verify all properties are reset to defaults
        const state = useEditorStore.getState()
        expect(state.currentPresentationId).toBe(DEFAULT_EDITOR_STATE.currentPresentationId)
        expect(state.currentSlideId).toBe(DEFAULT_EDITOR_STATE.currentSlideId)
        expect(state.selectedElementIds).toEqual(DEFAULT_EDITOR_STATE.selectedElementIds)
        expect(state.activeTool).toBe(DEFAULT_EDITOR_STATE.activeTool)
        expect(state.viewport).toEqual(DEFAULT_EDITOR_STATE.viewport)
        expect(state.isSidebarOpen).toBe(DEFAULT_EDITOR_STATE.isSidebarOpen)
        expect(state.showGrid).toBe(DEFAULT_EDITOR_STATE.showGrid)
      })
    })
  })
})
