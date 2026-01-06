/**
 * Custom hook for handling keyboard shortcuts.
 * Manages global keyboard event listeners for editor operations.
 */

import { useEffect, useCallback } from 'react'
import { useHistoryStore } from '@stores/historyStore'
import { useEditorStore } from '@stores/editorStore'
import { usePresentationStore } from '@stores/presentationStore'
import { operationHandlers } from '@utils/operationHandlers'
import type { SlideElement } from '@/types/presentation'
import {
  calculateAlignmentPositions,
  calculateDistributionPositions,
  type AlignmentType,
  type DistributionType,
} from '@/utils/alignmentUtils'

// Note: KeyboardShortcut interface reserved for future use when implementing
// a configurable keyboard shortcuts system

/**
 * Generate a unique ID for entities
 */
function generateId(): string {
  return `${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Offset value for pasted elements (in pixels)
 */
const PASTE_OFFSET = 20

/**
 * Movement distance for arrow key operations (in pixels)
 * Normal movement uses this value, Shift+Arrow uses 10x this value
 */
const ARROW_MOVE_DISTANCE = 1
const ARROW_MOVE_DISTANCE_LARGE = 10

/**
 * Hook for managing keyboard shortcuts in the editor
 */
export function useKeyboardShortcuts() {
  const undo = useHistoryStore((state) => state.undo)
  const redo = useHistoryStore((state) => state.redo)
  const canUndo = useHistoryStore((state) => state.canUndo)
  const canRedo = useHistoryStore((state) => state.canRedo)

  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const currentPresentationId = useEditorStore((state) => state.currentPresentationId)
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  const clipboard = useEditorStore((state) => state.clipboard)
  const copyElements = useEditorStore((state) => state.copyElements)
  const selectElements = useEditorStore((state) => state.selectElements)

  // Zoom actions
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)
  const resetZoom = useEditorStore((state) => state.resetZoom)
  const zoomTo = useEditorStore((state) => state.zoomTo)

  const deleteElements = usePresentationStore((state) => state.deleteElements)
  const saveToStorage = usePresentationStore((state) => state.saveToStorage)
  const addElement = usePresentationStore((state) => state.addElement)
  const getSlide = usePresentationStore((state) => state.getSlide)
  const updateElements = usePresentationStore((state) => state.updateElements)

  /**
   * Handle delete key for selected elements
   */
  const handleDelete = useCallback(() => {
    if (
      selectedElementIds.length > 0 &&
      currentPresentationId &&
      currentSlideId
    ) {
      // Record snapshot before deleting
      useHistoryStore.getState().recordSnapshot('Delete elements')
      deleteElements(currentPresentationId, currentSlideId, selectedElementIds)
      clearSelection()
      operationHandlers.delete(true)
    }
  }, [selectedElementIds, currentPresentationId, currentSlideId, deleteElements, clearSelection])

  /**
   * Handle save shortcut
   */
  const handleSave = useCallback(() => {
    const result = saveToStorage()
    operationHandlers.save(result)
  }, [saveToStorage])

  /**
   * Handle copy shortcut (Ctrl+C / Cmd+C)
   * Copies selected elements to the clipboard
   */
  const handleCopy = useCallback(() => {
    if (
      selectedElementIds.length > 0 &&
      currentPresentationId &&
      currentSlideId
    ) {
      copyElements(selectedElementIds, currentSlideId)
      operationHandlers.copy(selectedElementIds.length)
    }
  }, [selectedElementIds, currentPresentationId, currentSlideId, copyElements])

  /**
   * Handle paste shortcut (Ctrl+V / Cmd+V)
   * Pastes elements from clipboard to current slide with offset positioning
   */
  const handlePaste = useCallback(() => {
    if (!currentPresentationId || !currentSlideId) {
      return
    }

    // Check if clipboard has elements
    if (clipboard.elementIds.length === 0 || !clipboard.sourceSlideId) {
      return
    }

    // Get the source slide to retrieve the actual element data
    const sourceSlide = getSlide(currentPresentationId, clipboard.sourceSlideId)
    if (!sourceSlide) {
      return
    }

    // Find the elements to copy from the source slide
    const elementsToCopy = clipboard.elementIds
      .map((id) => sourceSlide.elements.find((el) => el.id === id))
      .filter((el): el is SlideElement => el !== undefined)

    if (elementsToCopy.length === 0) {
      return
    }

    // Record snapshot for undo
    useHistoryStore.getState().recordSnapshot('Paste elements')

    // Create duplicates with new IDs and offset positions
    const newElementIds: string[] = []
    const isSameSlide = clipboard.sourceSlideId === currentSlideId

    elementsToCopy.forEach((element) => {
      const newId = generateId()
      newElementIds.push(newId)

      // Deep copy the element and assign new ID
      const duplicatedElement: SlideElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: newId,
        position: {
          // Apply offset only when pasting to the same slide
          // This makes pasted elements visible instead of exactly overlapping
          x: element.position.x + (isSameSlide ? PASTE_OFFSET : 0),
          y: element.position.y + (isSameSlide ? PASTE_OFFSET : 0),
        },
      }

      // Add the duplicated element to the current slide
      addElement(currentPresentationId, currentSlideId, duplicatedElement)
    })

    // Select the newly pasted elements
    selectElements(newElementIds)

    // Show notification
    operationHandlers.paste(newElementIds.length)
  }, [
    currentPresentationId,
    currentSlideId,
    clipboard,
    getSlide,
    addElement,
    selectElements,
  ])

  /**
   * Handle undo shortcut
   */
  const handleUndo = useCallback(() => {
    if (canUndo()) {
      undo()
    }
  }, [undo, canUndo])

  /**
   * Handle redo shortcut
   */
  const handleRedo = useCallback(() => {
    if (canRedo()) {
      redo()
    }
  }, [redo, canRedo])

  /**
   * Handle zoom in shortcut (Ctrl++ / Cmd++)
   */
  const handleZoomIn = useCallback(() => {
    zoomIn()
  }, [zoomIn])

  /**
   * Handle zoom out shortcut (Ctrl+- / Cmd+-)
   */
  const handleZoomOut = useCallback(() => {
    zoomOut()
  }, [zoomOut])

  /**
   * Handle reset zoom shortcut (Ctrl+0 / Cmd+0)
   */
  const handleResetZoom = useCallback(() => {
    resetZoom()
  }, [resetZoom])

  /**
   * Handle zoom to fit (Ctrl+1 / Cmd+1) - zoom to 100%
   */
  const handleZoomToFit = useCallback(() => {
    zoomTo(1)
  }, [zoomTo])

  /**
   * Get currently selected elements
   */
  const getSelectedElements = useCallback((): SlideElement[] => {
    if (!currentPresentationId || !currentSlideId) return []
    const slide = getSlide(currentPresentationId, currentSlideId)
    if (!slide) return []
    return slide.elements.filter((el) => selectedElementIds.includes(el.id))
  }, [currentPresentationId, currentSlideId, getSlide, selectedElementIds])

  /**
   * Handle alignment shortcuts
   */
  const handleAlign = useCallback(
    (alignmentType: AlignmentType) => {
      if (!currentPresentationId || !currentSlideId) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length < 2) return

      // Record snapshot for undo
      useHistoryStore.getState().recordSnapshot(`Align elements ${alignmentType}`)

      // Calculate new positions
      const positionUpdates = calculateAlignmentPositions(selectedElements, alignmentType)

      // Update elements
      const updates = positionUpdates.map((update) => ({
        id: update.id,
        changes: { position: update.position } as Partial<SlideElement>,
      }))

      updateElements(currentPresentationId, currentSlideId, updates)
    },
    [currentPresentationId, currentSlideId, getSelectedElements, updateElements]
  )

  /**
   * Handle distribution shortcuts
   */
  const handleDistribute = useCallback(
    (distributionType: DistributionType) => {
      if (!currentPresentationId || !currentSlideId) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length < 3) return

      // Record snapshot for undo
      useHistoryStore.getState().recordSnapshot(`Distribute elements ${distributionType}`)

      // Calculate new positions
      const positionUpdates = calculateDistributionPositions(selectedElements, distributionType)

      // Update elements
      const updates = positionUpdates.map((update) => ({
        id: update.id,
        changes: { position: update.position } as Partial<SlideElement>,
      }))

      updateElements(currentPresentationId, currentSlideId, updates)
    },
    [currentPresentationId, currentSlideId, getSelectedElements, updateElements]
  )

  /**
   * Handle arrow key movement for selected elements
   * @param direction - The direction to move ('up' | 'down' | 'left' | 'right')
   * @param isLargeMove - Whether to use the large movement distance (Shift key held)
   */
  const handleArrowMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right', isLargeMove: boolean) => {
      if (!currentPresentationId || !currentSlideId) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length === 0) return

      const moveDistance = isLargeMove ? ARROW_MOVE_DISTANCE_LARGE : ARROW_MOVE_DISTANCE

      // Calculate delta based on direction
      let deltaX = 0
      let deltaY = 0

      switch (direction) {
        case 'up':
          deltaY = -moveDistance
          break
        case 'down':
          deltaY = moveDistance
          break
        case 'left':
          deltaX = -moveDistance
          break
        case 'right':
          deltaX = moveDistance
          break
      }

      // Record snapshot for undo
      useHistoryStore.getState().recordSnapshot('Move elements')

      // Update elements with new positions
      const updates = selectedElements.map((element) => ({
        id: element.id,
        changes: {
          position: {
            x: element.position.x + deltaX,
            y: element.position.y + deltaY,
          },
        } as Partial<SlideElement>,
      }))

      updateElements(currentPresentationId, currentSlideId, updates)
    },
    [currentPresentationId, currentSlideId, getSelectedElements, updateElements]
  )

  /**
   * Main keyboard event handler
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't handle shortcuts if typing in an input
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const isCtrlOrMeta = event.ctrlKey || event.metaKey

      // Ctrl+Z or Cmd+Z - Undo
      if (isCtrlOrMeta && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        handleUndo()
        return
      }

      // Ctrl+Y or Cmd+Y - Redo (Windows style)
      // Ctrl+Shift+Z or Cmd+Shift+Z - Redo (Mac style)
      if (
        (isCtrlOrMeta && event.key === 'y') ||
        (isCtrlOrMeta && event.key === 'z' && event.shiftKey)
      ) {
        event.preventDefault()
        handleRedo()
        return
      }

      // Ctrl+S or Cmd+S - Save
      if (isCtrlOrMeta && event.key === 's') {
        event.preventDefault()
        handleSave()
        return
      }

      // Ctrl++ or Cmd++ (or Ctrl+= for keyboards without numpad) - Zoom In
      if (isCtrlOrMeta && (event.key === '+' || event.key === '=' || event.key === 'Add')) {
        event.preventDefault()
        handleZoomIn()
        return
      }

      // Ctrl+- or Cmd+- - Zoom Out
      if (isCtrlOrMeta && (event.key === '-' || event.key === 'Subtract')) {
        event.preventDefault()
        handleZoomOut()
        return
      }

      // Ctrl+0 or Cmd+0 - Reset Zoom to 100%
      if (isCtrlOrMeta && event.key === '0') {
        event.preventDefault()
        handleResetZoom()
        return
      }

      // Ctrl+1 or Cmd+1 - Zoom to 100% (alternative)
      if (isCtrlOrMeta && event.key === '1') {
        event.preventDefault()
        handleZoomToFit()
        return
      }

      // Ctrl+C or Cmd+C - Copy selected elements
      if (isCtrlOrMeta && event.key === 'c') {
        event.preventDefault()
        handleCopy()
        return
      }

      // Ctrl+V or Cmd+V - Paste elements from clipboard
      if (isCtrlOrMeta && event.key === 'v') {
        event.preventDefault()
        handlePaste()
        return
      }

      // Delete or Backspace - Delete selected elements
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete if no elements are selected
        if (selectedElementIds.length > 0) {
          event.preventDefault()
          handleDelete()
        }
        return
      }

      // Escape - Clear selection
      if (event.key === 'Escape') {
        clearSelection()
        return
      }

      // Arrow keys - Move selected elements
      // Only when elements are selected and no modifier keys (except Shift for large moves)
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) &&
        !isCtrlOrMeta &&
        selectedElementIds.length > 0
      ) {
        event.preventDefault()
        const isLargeMove = event.shiftKey
        switch (event.key) {
          case 'ArrowUp':
            handleArrowMove('up', isLargeMove)
            break
          case 'ArrowDown':
            handleArrowMove('down', isLargeMove)
            break
          case 'ArrowLeft':
            handleArrowMove('left', isLargeMove)
            break
          case 'ArrowRight':
            handleArrowMove('right', isLargeMove)
            break
        }
        return
      }

      // Alignment shortcuts (Ctrl+Shift+<key>)
      // Only work when 2+ elements are selected
      if (isCtrlOrMeta && event.shiftKey && selectedElementIds.length >= 2) {
        switch (event.key.toLowerCase()) {
          case 'l': // Align left
            event.preventDefault()
            handleAlign('left')
            return
          case 'e': // Align center (horizontal center)
            event.preventDefault()
            handleAlign('center')
            return
          case 'r': // Align right
            event.preventDefault()
            handleAlign('right')
            return
          case 't': // Align top
            event.preventDefault()
            handleAlign('top')
            return
          case 'm': // Align middle (vertical center)
            event.preventDefault()
            handleAlign('middle')
            return
          case 'b': // Align bottom
            event.preventDefault()
            handleAlign('bottom')
            return
          case 'h': // Distribute horizontally (requires 3+ elements)
            if (selectedElementIds.length >= 3) {
              event.preventDefault()
              handleDistribute('horizontal')
            }
            return
          case 'j': // Distribute vertically (requires 3+ elements)
            if (selectedElementIds.length >= 3) {
              event.preventDefault()
              handleDistribute('vertical')
            }
            return
        }
      }
    },
    [handleUndo, handleRedo, handleSave, handleCopy, handlePaste, handleDelete, handleAlign, handleDistribute, handleArrowMove, handleZoomIn, handleZoomOut, handleResetZoom, handleZoomToFit, selectedElementIds, clearSelection]
  )

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    undo: handleUndo,
    redo: handleRedo,
    save: handleSave,
    deleteSelected: handleDelete,
    copy: handleCopy,
    paste: handlePaste,
    alignLeft: () => handleAlign('left'),
    alignCenter: () => handleAlign('center'),
    alignRight: () => handleAlign('right'),
    alignTop: () => handleAlign('top'),
    alignMiddle: () => handleAlign('middle'),
    alignBottom: () => handleAlign('bottom'),
    distributeHorizontal: () => handleDistribute('horizontal'),
    distributeVertical: () => handleDistribute('vertical'),
    moveUp: (large = false) => handleArrowMove('up', large),
    moveDown: (large = false) => handleArrowMove('down', large),
    moveLeft: (large = false) => handleArrowMove('left', large),
    moveRight: (large = false) => handleArrowMove('right', large),
    // Zoom actions
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    resetZoom: handleResetZoom,
    zoomToFit: handleZoomToFit,
  }
}

export default useKeyboardShortcuts
