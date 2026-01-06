/**
 * CanvasArea Component
 * Center panel containing the main slide editing canvas using HTML5 Canvas
 *
 * Features:
 * - HTML5 Canvas-based rendering for better performance
 * - Element selection, dragging, and resizing
 * - Viewport transformations (zoom, pan)
 * - Grid overlay support
 * - Multi-select with selection box
 */

import { useRef, useCallback, useEffect, useState } from 'react'
import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { useHistoryStore } from '@stores/historyStore'
import { useCanvasRenderer } from '@/hooks/useCanvasRenderer'
import { TextInputOverlay } from './TextInputOverlay'
import { ImageUploadDialog } from './ImageUploadDialog'
import { LayoutSelectorDialog } from './LayoutSelectorDialog'
import type { SlideElement, Position, TextElement, ImageElement, ShapeElement } from '@/types/presentation'
import type { SlideLayoutType } from '@/types/layout'
import type { ResizeHandle } from '@/types/editor'

/**
 * Slide dimensions (16:9 aspect ratio)
 */
const SLIDE_WIDTH = 960
const SLIDE_HEIGHT = 540

/**
 * Props for CanvasArea component
 */
interface CanvasAreaProps {
  /** Optional class name for custom styling */
  className?: string
  /** Whether the viewport is tablet-sized (768px - 1023px) */
  isTablet?: boolean
}

/**
 * CanvasArea displays the main slide editing canvas
 * Uses HTML5 Canvas for rendering slides with elements
 */
export function CanvasArea({ className = '', isTablet = false }: CanvasAreaProps) {
  // Get presentation data - subscribe to presentations array to detect changes
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const updateElement = usePresentationStore((state) => state.updateElement)
  const updateElements = usePresentationStore((state) => state.updateElements)
  const addElement = usePresentationStore((state) => state.addElement)
  const createPresentation = usePresentationStore((state) => state.createPresentation)
  const addSlideWithLayout = usePresentationStore((state) => state.addSlideWithLayout)

  // Get editor state
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const viewport = useEditorStore((state) => state.viewport)
  const showGrid = useEditorStore((state) => state.showGrid)
  const activeTool = useEditorStore((state) => state.activeTool)
  const activeShapeType = useEditorStore((state) => state.activeShapeType)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const interactionMode = useEditorStore((state) => state.interactionMode)

  // Editor actions
  const selectElement = useEditorStore((state) => state.selectElement)
  const selectElements = useEditorStore((state) => state.selectElements)
  const addToSelection = useEditorStore((state) => state.addToSelection)
  const toggleSelection = useEditorStore((state) => state.toggleSelection)
  const clearSelection = useEditorStore((state) => state.clearSelection)
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide)
  const setHoveredElement = useEditorStore((state) => state.setHoveredElement)
  const setInteractionMode = useEditorStore((state) => state.setInteractionMode)
  const setActiveResizeHandle = useEditorStore((state) => state.setActiveResizeHandle)
  const startSelectionBox = useEditorStore((state) => state.startSelectionBox)
  const updateSelectionBox = useEditorStore((state) => state.updateSelectionBox)
  const clearSelectionBox = useEditorStore((state) => state.clearSelectionBox)
  const pan = useEditorStore((state) => state.pan)
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)

  // Text editing state (declared before useCanvasRenderer so it can use editingTextElementId)
  const [isTextEditing, setIsTextEditing] = useState(false)
  const [textEditPosition, setTextEditPosition] = useState<Position | null>(null)
  const [editingTextElementId, setEditingTextElementId] = useState<string | null>(null)

  // Use canvas renderer hook
  const {
    canvasRef,
    isReady,
    forceRender,
    getElementAtPoint,
    getResizeHandleAtPoint,
    canvasToSlideCoords,
  } = useCanvasRenderer({
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    gridSize: 20,
    editingElementId: editingTextElementId,
  })

  // Container ref for mouse position calculations
  const containerRef = useRef<HTMLDivElement>(null)

  // Get history store for recording snapshots
  const recordSnapshot = useHistoryStore((state) => state.recordSnapshot)

  // Interaction state
  const [dragStart, setDragStart] = useState<Position | null>(null)
  const [elementStartPositions, setElementStartPositions] = useState<Map<string, Position>>(
    new Map()
  )
  const [activeHandle, setActiveHandle] = useState<ResizeHandle | 'rotation' | null>(null)
  const [resizeStart, setResizeStart] = useState<{
    mouseX: number
    mouseY: number
    element: SlideElement
  } | null>(null)
  // Track if any changes were made during interaction (used by setHasInteractionChanges)
  const [, setHasInteractionChanges] = useState(false)

  // Image upload state
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)
  const [imageInsertPosition, setImageInsertPosition] = useState<Position | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Layout selector state for adding slides
  const [isLayoutSelectorOpen, setIsLayoutSelectorOpen] = useState(false)

  // Shape drawing state
  const [shapeDrawStart, setShapeDrawStart] = useState<Position | null>(null)
  const [shapeDrawCurrent, setShapeDrawCurrent] = useState<Position | null>(null)

  // Track if Shift was held when starting selection box (for additive selection)
  const selectionBoxAdditive = useRef(false)

  // Compute presentation and current slide from subscribed state
  const presentation = presentations.find((p) => p.id === currentPresentationId) ?? null
  const currentSlide = presentation?.slides.find((s) => s.id === currentSlideId) ?? null

  /**
   * Get mouse position relative to canvas
   */
  const getCanvasMousePosition = useCallback(
    (event: React.MouseEvent | MouseEvent): Position => {
      if (!canvasRef.current) return { x: 0, y: 0 }

      const rect = canvasRef.current.getBoundingClientRect()
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      }
    },
    [canvasRef]
  )

  /**
   * Handle mouse down on canvas
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!currentSlide || !currentPresentationId) {
        return
      }

      const canvasPos = getCanvasMousePosition(event)
      const slidePos = canvasToSlideCoords(canvasPos.x, canvasPos.y)

      // Check for pan tool
      if (activeTool === 'pan') {
        setInteractionMode('dragging')
        setDragStart(canvasPos)
        return
      }

      // Check for text tool - create new text element
      if (activeTool === 'text') {
        // Check if clicking on an existing text element to edit it
        const clickedElement = getElementAtPoint(canvasPos.x, canvasPos.y)
        if (clickedElement?.type === 'text') {
          // Edit existing text element
          setEditingTextElementId(clickedElement.id)
          setTextEditPosition({
            x: clickedElement.position.x,
            y: clickedElement.position.y,
          })
          setIsTextEditing(true)
          selectElement(clickedElement.id)
        } else {
          // Create new text element
          setTextEditPosition(slidePos)
          setEditingTextElementId(null)
          setIsTextEditing(true)
        }
        return
      }

      // Check for image tool - open image upload dialog
      if (activeTool === 'image') {
        setImageInsertPosition(slidePos)
        setIsImageDialogOpen(true)
        return
      }

      // Check for shape tool - start drawing a shape
      if (activeTool === 'shape') {
        setShapeDrawStart(slidePos)
        setShapeDrawCurrent(slidePos)
        setInteractionMode('drawing')
        return
      }

      // Record snapshot before any element modifications start
      // This ensures we capture the state before the drag/resize operation

      // Check for resize/rotation handles on selected elements
      if (selectedElementIds.length > 0) {
        const handle = getResizeHandleAtPoint(canvasPos.x, canvasPos.y)
        if (handle) {
          // Record snapshot before resize/rotate begins
          recordSnapshot('Before resize/rotate')
          setHasInteractionChanges(false)

          if (handle === 'rotation') {
            setInteractionMode('rotating')
            setActiveHandle('rotation')
          } else {
            setInteractionMode('resizing')
            setActiveHandle(handle)
            setActiveResizeHandle(handle)
          }

          // Get the first selected element for resize reference
          const element = currentSlide.elements.find(
            (el) => el.id === selectedElementIds[0]
          )
          if (element) {
            setResizeStart({
              mouseX: canvasPos.x,
              mouseY: canvasPos.y,
              element: { ...element },
            })
          }
          setDragStart(canvasPos)
          return
        }
      }

      // Check for element click
      const clickedElement = getElementAtPoint(canvasPos.x, canvasPos.y)

      if (clickedElement) {
        // Record snapshot before drag begins
        recordSnapshot('Before move')
        setHasInteractionChanges(false)

        // Check for modifier keys for multi-select behavior
        const isCtrlOrMeta = event.ctrlKey || event.metaKey

        if (isCtrlOrMeta) {
          // Ctrl/Cmd+Click: Toggle selection (add if not selected, remove if selected)
          toggleSelection(clickedElement.id)
          // Don't start dragging when just toggling selection
          return
        } else if (event.shiftKey) {
          // Shift+Click: Add to selection (range-style, always adds)
          addToSelection(clickedElement.id)
        } else if (!selectedElementIds.includes(clickedElement.id)) {
          // Regular click on unselected element: Select only this element
          selectElement(clickedElement.id)
        }
        // If regular click on already selected element, keep selection (for dragging)

        // Start dragging
        setInteractionMode('dragging')
        setDragStart(slidePos)

        // Store initial positions of all selected elements
        const positions = new Map<string, Position>()
        const idsToTrack = selectedElementIds.includes(clickedElement.id)
          ? selectedElementIds
          : [clickedElement.id]

        for (const id of idsToTrack) {
          const element = currentSlide.elements.find((el) => el.id === id)
          if (element) {
            positions.set(id, { ...element.position })
          }
        }
        setElementStartPositions(positions)
      } else {
        // Click on empty space - start selection box
        if (activeTool === 'select') {
          // Store if Shift is held for additive selection
          selectionBoxAdditive.current = event.shiftKey

          // Only clear selection if Shift is not held
          if (!event.shiftKey) {
            clearSelection()
          }
          startSelectionBox(slidePos.x, slidePos.y)
          setInteractionMode('selecting')
        }
      }
    },
    [
      currentSlide,
      currentPresentationId,
      activeTool,
      selectedElementIds,
      getCanvasMousePosition,
      canvasToSlideCoords,
      getElementAtPoint,
      getResizeHandleAtPoint,
      selectElement,
      addToSelection,
      toggleSelection,
      clearSelection,
      setInteractionMode,
      setActiveResizeHandle,
      startSelectionBox,
      recordSnapshot,
    ]
  )

  /**
   * Handle mouse move on canvas
   */
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!currentSlide || !currentPresentationId) return

      const canvasPos = getCanvasMousePosition(event)
      const slidePos = canvasToSlideCoords(canvasPos.x, canvasPos.y)

      // Update hover state
      if (interactionMode === 'idle') {
        const hoveredElement = getElementAtPoint(canvasPos.x, canvasPos.y)
        setHoveredElement(hoveredElement?.id || null)

        // Update cursor based on hover
        if (canvasRef.current) {
          if (selectedElementIds.length > 0) {
            const handle = getResizeHandleAtPoint(canvasPos.x, canvasPos.y)
            if (handle === 'rotation') {
              canvasRef.current.style.cursor = 'crosshair'
            } else if (handle) {
              const cursorMap: Record<ResizeHandle, string> = {
                'top-left': 'nwse-resize',
                'top': 'ns-resize',
                'top-right': 'nesw-resize',
                'right': 'ew-resize',
                'bottom-right': 'nwse-resize',
                'bottom': 'ns-resize',
                'bottom-left': 'nesw-resize',
                'left': 'ew-resize',
              }
              canvasRef.current.style.cursor = cursorMap[handle]
            } else if (hoveredElement) {
              canvasRef.current.style.cursor = 'move'
            } else {
              canvasRef.current.style.cursor = 'default'
            }
          } else if (hoveredElement) {
            canvasRef.current.style.cursor = 'pointer'
          } else {
            // Tool-specific cursors when not hovering over elements
            const toolCursors: Record<string, string> = {
              select: 'default',
              text: 'text',
              shape: 'crosshair',
              image: 'copy',
              pan: 'grab',
            }
            canvasRef.current.style.cursor = toolCursors[activeTool] || 'default'
          }
        }
      }

      // Handle panning
      if (interactionMode === 'dragging' && activeTool === 'pan' && dragStart) {
        const deltaX = (canvasPos.x - dragStart.x) / viewport.zoom
        const deltaY = (canvasPos.y - dragStart.y) / viewport.zoom
        pan(deltaX, deltaY)
        setDragStart(canvasPos)
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'grabbing'
        }
        return
      }

      // Handle element dragging
      if (interactionMode === 'dragging' && dragStart && elementStartPositions.size > 0) {
        const deltaX = slidePos.x - dragStart.x
        const deltaY = slidePos.y - dragStart.y

        const elementUpdates: Array<{ id: string; changes: Partial<SlideElement> }> = []

        for (const [id, startPos] of elementStartPositions) {
          elementUpdates.push({
            id,
            changes: {
              position: {
                x: startPos.x + deltaX,
                y: startPos.y + deltaY,
              },
            },
          })
        }

        if (elementUpdates.length > 0 && currentSlideId) {
          updateElements(currentPresentationId, currentSlideId, elementUpdates)
          setHasInteractionChanges(true)
        }
      }

      // Handle resizing
      if (
        interactionMode === 'resizing' &&
        activeHandle &&
        resizeStart &&
        activeHandle !== 'rotation'
      ) {
        const deltaX = (canvasPos.x - resizeStart.mouseX) / viewport.zoom
        const deltaY = (canvasPos.y - resizeStart.mouseY) / viewport.zoom

        const { element } = resizeStart
        let newX = element.position.x
        let newY = element.position.y
        let newWidth = element.dimensions.width
        let newHeight = element.dimensions.height

        switch (activeHandle) {
          case 'top-left':
            newX = element.position.x + deltaX
            newY = element.position.y + deltaY
            newWidth = element.dimensions.width - deltaX
            newHeight = element.dimensions.height - deltaY
            break
          case 'top':
            newY = element.position.y + deltaY
            newHeight = element.dimensions.height - deltaY
            break
          case 'top-right':
            newY = element.position.y + deltaY
            newWidth = element.dimensions.width + deltaX
            newHeight = element.dimensions.height - deltaY
            break
          case 'right':
            newWidth = element.dimensions.width + deltaX
            break
          case 'bottom-right':
            newWidth = element.dimensions.width + deltaX
            newHeight = element.dimensions.height + deltaY
            break
          case 'bottom':
            newHeight = element.dimensions.height + deltaY
            break
          case 'bottom-left':
            newX = element.position.x + deltaX
            newWidth = element.dimensions.width - deltaX
            newHeight = element.dimensions.height + deltaY
            break
          case 'left':
            newX = element.position.x + deltaX
            newWidth = element.dimensions.width - deltaX
            break
        }

        // Ensure minimum size
        if (newWidth >= 20 && newHeight >= 20 && currentSlideId) {
          updateElement(currentPresentationId, currentSlideId, element.id, {
            position: { x: newX, y: newY },
            dimensions: { width: newWidth, height: newHeight },
          })
          setHasInteractionChanges(true)
        }
      }

      // Handle rotation
      if (interactionMode === 'rotating' && resizeStart && currentSlideId) {
        const { element } = resizeStart
        const centerX =
          element.position.x + element.dimensions.width / 2
        const centerY =
          element.position.y + element.dimensions.height / 2

        const angle = Math.atan2(slidePos.y - centerY, slidePos.x - centerX)
        const degrees = (angle * 180) / Math.PI + 90 // Offset by 90 to align with top handle

        updateElement(currentPresentationId, currentSlideId, element.id, {
          rotation: Math.round(degrees),
        })
        setHasInteractionChanges(true)
      }

      // Handle selection box
      if (interactionMode === 'selecting') {
        updateSelectionBox(slidePos.x, slidePos.y)
      }

      // Handle shape drawing preview
      if (interactionMode === 'drawing' && shapeDrawStart) {
        setShapeDrawCurrent(slidePos)
      }
    },
    [
      currentSlide,
      currentPresentationId,
      currentSlideId,
      interactionMode,
      activeTool,
      dragStart,
      elementStartPositions,
      activeHandle,
      resizeStart,
      viewport.zoom,
      selectedElementIds,
      shapeDrawStart,
      getCanvasMousePosition,
      canvasToSlideCoords,
      getElementAtPoint,
      getResizeHandleAtPoint,
      setHoveredElement,
      pan,
      updateElement,
      updateElements,
      updateSelectionBox,
      canvasRef,
    ]
  )

  /**
   * Generate a unique ID for new elements
   */
  const generateId = useCallback(() => {
    return `${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`
  }, [])

  /**
   * Handle mouse up on canvas
   */
  const handleMouseUp = useCallback(() => {
    if (interactionMode === 'selecting' && currentSlide) {
      // Complete selection box and select elements within it
      const selectionBox = useEditorStore.getState().selectionBox
      if (selectionBox) {
        const minX = Math.min(selectionBox.startX, selectionBox.endX)
        const maxX = Math.max(selectionBox.startX, selectionBox.endX)
        const minY = Math.min(selectionBox.startY, selectionBox.endY)
        const maxY = Math.max(selectionBox.startY, selectionBox.endY)

        const boxSelectedIds = currentSlide.elements
          .filter((element) => {
            const elX = element.position.x
            const elY = element.position.y
            const elMaxX = elX + element.dimensions.width
            const elMaxY = elY + element.dimensions.height

            // Check if element intersects with selection box
            return elX < maxX && elMaxX > minX && elY < maxY && elMaxY > minY
          })
          .map((el) => el.id)

        if (boxSelectedIds.length > 0) {
          if (selectionBoxAdditive.current) {
            // Additive mode (Shift was held): merge with existing selection
            const currentSelection = useEditorStore.getState().selectedElementIds
            const mergedIds = [...new Set([...currentSelection, ...boxSelectedIds])]
            selectElements(mergedIds)
          } else {
            // Normal mode: replace selection
            selectElements(boxSelectedIds)
          }
        }
      }
      clearSelectionBox()
      selectionBoxAdditive.current = false
    }

    // Handle shape drawing completion
    if (interactionMode === 'drawing' && shapeDrawStart && shapeDrawCurrent && currentPresentationId && currentSlideId) {
      // Calculate shape dimensions
      const x = Math.min(shapeDrawStart.x, shapeDrawCurrent.x)
      const y = Math.min(shapeDrawStart.y, shapeDrawCurrent.y)
      const width = Math.abs(shapeDrawCurrent.x - shapeDrawStart.x)
      const height = Math.abs(shapeDrawCurrent.y - shapeDrawStart.y)

      // Only create shape if it has meaningful size (at least 10x10)
      if (width >= 10 && height >= 10) {
        recordSnapshot('Add shape')

        const newShapeElement: ShapeElement = {
          id: generateId(),
          type: 'shape',
          position: { x, y },
          dimensions: { width, height },
          rotation: 0,
          zIndex: currentSlide?.elements.length ?? 0,
          opacity: 1,
          locked: false,
          shapeType: activeShapeType,
          fillColor: '#f97316',
          strokeColor: '#ea580c',
          strokeWidth: 2,
          cornerRadius: 0,
        }

        addElement(currentPresentationId, currentSlideId, newShapeElement)
        selectElement(newShapeElement.id)

        // Switch back to select tool after creating shape
        setActiveTool('select')
      }

      // Reset shape drawing state
      setShapeDrawStart(null)
      setShapeDrawCurrent(null)
    }

    // Reset interaction state
    setInteractionMode('idle')
    setActiveResizeHandle(null)
    setDragStart(null)
    setElementStartPositions(new Map())
    setActiveHandle(null)
    setResizeStart(null)
    setHasInteractionChanges(false)

    if (canvasRef.current) {
      // Reset to tool-specific cursor
      const toolCursors: Record<string, string> = {
        select: 'default',
        text: 'text',
        shape: 'crosshair',
        image: 'copy',
        pan: 'grab',
      }
      canvasRef.current.style.cursor = toolCursors[activeTool] || 'default'
    }
  }, [
    interactionMode,
    currentSlide,
    currentPresentationId,
    currentSlideId,
    activeTool,
    activeShapeType,
    shapeDrawStart,
    shapeDrawCurrent,
    selectElement,
    selectElements,
    clearSelectionBox,
    setInteractionMode,
    setActiveResizeHandle,
    setActiveTool,
    addElement,
    recordSnapshot,
    generateId,
    canvasRef,
  ])

  /**
   * Handle mouse wheel for zooming
   */
  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLCanvasElement>) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault()
        if (event.deltaY < 0) {
          zoomIn()
        } else {
          zoomOut()
        }
      }
    },
    [zoomIn, zoomOut]
  )

  /**
   * Handle mouse leave
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredElement(null)
    // Cancel shape drawing on mouse leave
    if (interactionMode === 'drawing') {
      setShapeDrawStart(null)
      setShapeDrawCurrent(null)
      setInteractionMode('idle')
    } else if (interactionMode !== 'idle') {
      handleMouseUp()
    }
  }, [setHoveredElement, interactionMode, handleMouseUp, setInteractionMode])

  /**
   * Handle double-click on canvas - enter text edit mode for text elements
   */
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!currentSlide || !currentPresentationId) return

      const canvasPos = getCanvasMousePosition(event)
      const clickedElement = getElementAtPoint(canvasPos.x, canvasPos.y)

      // If double-clicking on a text element, enter edit mode
      if (clickedElement?.type === 'text') {
        setEditingTextElementId(clickedElement.id)
        setTextEditPosition({
          x: clickedElement.position.x,
          y: clickedElement.position.y,
        })
        setIsTextEditing(true)
        selectElement(clickedElement.id)
      }
    },
    [
      currentSlide,
      currentPresentationId,
      getCanvasMousePosition,
      getElementAtPoint,
      selectElement,
    ]
  )

  /**
   * Handle text editing complete - create or update text element
   */
  const handleTextComplete = useCallback(
    (content: string) => {
      if (!currentPresentationId || !currentSlideId || !textEditPosition) {
        setIsTextEditing(false)
        setTextEditPosition(null)
        setEditingTextElementId(null)
        return
      }

      if (editingTextElementId) {
        // Update existing text element
        recordSnapshot('Edit text')
        updateElement(currentPresentationId, currentSlideId, editingTextElementId, {
          content,
        })
        selectElement(editingTextElementId)
      } else {
        // Create new text element
        recordSnapshot('Add text')
        const newTextElement: TextElement = {
          id: generateId(),
          type: 'text',
          position: textEditPosition,
          dimensions: { width: 200, height: 50 },
          rotation: 0,
          zIndex: currentSlide?.elements.length ?? 0,
          opacity: 1,
          locked: false,
          content,
          fontSize: 24,
          fontFamily: 'Inter, system-ui, sans-serif',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textAlign: 'left',
          color: '#1e293b',
        }
        addElement(currentPresentationId, currentSlideId, newTextElement)
        selectElement(newTextElement.id)
      }

      setIsTextEditing(false)
      setTextEditPosition(null)
      setEditingTextElementId(null)
      // Switch back to select tool after creating text
      setActiveTool('select')
    },
    [
      currentPresentationId,
      currentSlideId,
      currentSlide,
      textEditPosition,
      editingTextElementId,
      addElement,
      updateElement,
      selectElement,
      recordSnapshot,
      generateId,
      setActiveTool,
    ]
  )

  /**
   * Handle text editing cancel
   */
  const handleTextCancel = useCallback(() => {
    setIsTextEditing(false)
    setTextEditPosition(null)
    setEditingTextElementId(null)
  }, [])

  /**
   * Handle image insertion from dialog
   */
  const handleImageInsert = useCallback(
    (src: string, alt: string) => {
      if (!currentPresentationId || !currentSlideId) {
        setIsImageDialogOpen(false)
        setImageInsertPosition(null)
        return
      }

      // Record snapshot for undo
      recordSnapshot('Add image')

      // Calculate default position - use insert position or center of slide
      const position = imageInsertPosition || { x: SLIDE_WIDTH / 2 - 100, y: SLIDE_HEIGHT / 2 - 75 }

      // Create new image element
      const newImageElement: ImageElement = {
        id: generateId(),
        type: 'image',
        position,
        dimensions: { width: 200, height: 150 },
        rotation: 0,
        zIndex: currentSlide?.elements.length ?? 0,
        opacity: 1,
        locked: false,
        src,
        alt,
        objectFit: 'contain',
      }

      addElement(currentPresentationId, currentSlideId, newImageElement)
      selectElement(newImageElement.id)

      // Reset state and switch back to select tool
      setIsImageDialogOpen(false)
      setImageInsertPosition(null)
      setActiveTool('select')
    },
    [
      currentPresentationId,
      currentSlideId,
      currentSlide,
      imageInsertPosition,
      addElement,
      selectElement,
      recordSnapshot,
      generateId,
      setActiveTool,
    ]
  )

  /**
   * Handle image dialog close
   */
  const handleImageDialogClose = useCallback(() => {
    setIsImageDialogOpen(false)
    setImageInsertPosition(null)
  }, [])

  /**
   * Handle creating a new presentation from empty state
   */
  const handleCreateNewPresentation = useCallback(() => {
    const id = createPresentation('Untitled Presentation')
    const newPresentation = usePresentationStore.getState().presentations.find((p) => p.id === id)
    if (newPresentation && newPresentation.slides.length > 0 && newPresentation.slides[0]) {
      setCurrentSlide(newPresentation.slides[0].id)
    }
  }, [createPresentation, setCurrentSlide])

  /**
   * Handle adding a new slide - opens the layout selector dialog
   */
  const handleAddSlide = useCallback(() => {
    if (currentPresentationId) {
      setIsLayoutSelectorOpen(true)
    }
  }, [currentPresentationId])

  /**
   * Handle layout selection for new slide
   */
  const handleLayoutSelect = useCallback((layoutType: SlideLayoutType) => {
    if (currentPresentationId) {
      const newSlideId = addSlideWithLayout(currentPresentationId, layoutType)
      if (newSlideId) {
        setCurrentSlide(newSlideId)
      }
    }
    setIsLayoutSelectorOpen(false)
  }, [currentPresentationId, addSlideWithLayout, setCurrentSlide])

  /**
   * Handle drag enter for image drop
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (currentSlide && e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true)
    }
  }, [currentSlide])

  /**
   * Handle drag leave for image drop
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only reset if leaving the container
    if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  /**
   * Handle drag over for image drop
   */
  const handleDragOverEvent = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  /**
   * Handle drop for image files
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      if (!currentSlide || !currentPresentationId || !currentSlideId) return

      const file = e.dataTransfer.files?.[0]
      if (!file?.type.startsWith('image/')) return

      // Get drop position
      const canvasPos = getCanvasMousePosition(e.nativeEvent)
      const slidePos = canvasToSlideCoords(canvasPos.x, canvasPos.y)

      // Read file and create image element
      const reader = new FileReader()
      reader.onload = (readerEvent) => {
        const src = readerEvent.target?.result as string
        if (!src) return

        // Record snapshot for undo
        recordSnapshot('Add image (drop)')

        // Create image element
        const newImageElement: ImageElement = {
          id: generateId(),
          type: 'image',
          position: slidePos,
          dimensions: { width: 200, height: 150 },
          rotation: 0,
          zIndex: currentSlide.elements.length,
          opacity: 1,
          locked: false,
          src,
          alt: file.name.replace(/\.[^/.]+$/, ''),
          objectFit: 'contain',
        }

        addElement(currentPresentationId, currentSlideId, newImageElement)
        selectElement(newImageElement.id)
      }
      reader.readAsDataURL(file)
    },
    [
      currentSlide,
      currentPresentationId,
      currentSlideId,
      getCanvasMousePosition,
      canvasToSlideCoords,
      addElement,
      selectElement,
      recordSnapshot,
      generateId,
    ]
  )

  /**
   * Get the current editing text element
   */
  const getEditingTextElement = useCallback(() => {
    if (!editingTextElementId || !currentSlide) return null
    return currentSlide.elements.find(
      (el) => el.id === editingTextElementId && el.type === 'text'
    ) as TextElement | undefined
  }, [editingTextElementId, currentSlide])

  // Re-render when slide or slide elements change
  useEffect(() => {
    if (isReady && currentSlide) {
      forceRender()
    }
  }, [isReady, currentSlideId, currentSlide?.elements, forceRender])

  // Workaround for React 19 synthetic event issue on canvas
  // Native event listeners are needed because React's event delegation
  // is not properly invoking handlers on canvas elements
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    // Create wrapper that converts native MouseEvent to React-like event
    const createSyntheticEvent = (e: MouseEvent): React.MouseEvent<HTMLCanvasElement> => {
      return {
        // Explicitly copy mouse event properties (getters don't spread)
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        pageX: e.pageX,
        pageY: e.pageY,
        movementX: e.movementX,
        movementY: e.movementY,
        button: e.button,
        buttons: e.buttons,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        metaKey: e.metaKey,
        type: e.type,
        nativeEvent: e,
        currentTarget: canvas,
        target: e.target as EventTarget,
        preventDefault: () => { e.preventDefault(); },
        stopPropagation: () => { e.stopPropagation(); },
        isDefaultPrevented: () => e.defaultPrevented,
        isPropagationStopped: () => false,
        persist: () => {},
      } as unknown as React.MouseEvent<HTMLCanvasElement>
    }

    const onMouseDown = (e: MouseEvent) => {
      handleMouseDown(createSyntheticEvent(e))
    }
    const onMouseMove = (e: MouseEvent) => {
      handleMouseMove(createSyntheticEvent(e))
    }
    const onMouseUp = (_e: MouseEvent) => {
      handleMouseUp()
    }
    const onMouseLeave = (_e: MouseEvent) => {
      handleMouseLeave()
    }
    const onDoubleClick = (e: MouseEvent) => {
      handleDoubleClick(createSyntheticEvent(e))
    }

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('dblclick', onDoubleClick)

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('dblclick', onDoubleClick)
    }
  // Re-run when currentSlide changes so listeners attach when canvas becomes available
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave, handleDoubleClick, currentSlide])

  // Calculate canvas transform based on viewport
  const canvasTransform = {
    transform: `scale(${viewport.zoom}) translate(${viewport.panX}px, ${viewport.panY}px)`,
    transformOrigin: 'center center',
  }

  // Generate description for screen readers
  const getCanvasDescription = () => {
    if (!currentSlide) return 'No slide selected'
    const elemCount = currentSlide.elements.length
    const selectedCount = selectedElementIds.length
    let desc = `Slide: ${currentSlide.title || 'Untitled'}. ${elemCount} element${elemCount !== 1 ? 's' : ''}.`
    if (selectedCount > 0) {
      desc += ` ${selectedCount} element${selectedCount !== 1 ? 's' : ''} selected.`
    }
    desc += ` Zoom: ${Math.round(viewport.zoom * 100)}%.`
    return desc
  }

  // Build canvas area class names with tablet-specific styling
  const canvasAreaClasses = [
    'canvas-area',
    'flex-1',
    'flex',
    'items-center',
    'justify-center',
    'bg-editor-canvas',
    'overflow-hidden',
    className,
    isDragOver ? 'ring-2 ring-primary-500 ring-inset' : '',
    isTablet ? 'tablet-canvas-area' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <main
      className={canvasAreaClasses}
      data-testid="canvas-area"
      ref={containerRef}
      role="region"
      aria-label="Slide editing canvas"
      data-tablet={isTablet}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOverEvent}
      onDrop={handleDrop}
    >
      {!presentation ? (
        // No presentation selected
        <div className="text-center text-secondary-500" role="status">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-200 flex items-center justify-center" aria-hidden="true">
            <svg
              className="w-8 h-8 text-secondary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-secondary-600 mb-2">
            No Presentation Selected
          </h2>
          <p className="text-sm mb-4">Create or select a presentation to start editing</p>
          <button
            onClick={handleCreateNewPresentation}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create New Presentation
          </button>
        </div>
      ) : !currentSlide ? (
        // Presentation exists but no slide selected
        <div className="text-center text-secondary-500" role="status">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-200 flex items-center justify-center" aria-hidden="true">
            <svg
              className="w-8 h-8 text-secondary-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-secondary-600 mb-2">
            No Slide Selected
          </h2>
          <p className="text-sm mb-4">Select a slide from the left panel or add a new one</p>
          <button
            onClick={handleAddSlide}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Slide
          </button>
        </div>
      ) : (
        // Show the slide canvas
        <div
          className="canvas-container relative"
          style={canvasTransform}
          role="img"
          aria-label={getCanvasDescription()}
        >
          <canvas
            ref={canvasRef}
            width={SLIDE_WIDTH}
            height={SLIDE_HEIGHT}
            className={`slide-canvas ${showGrid ? 'grid-background' : ''}`}
            style={{
              width: SLIDE_WIDTH,
              height: SLIDE_HEIGHT,
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
              borderRadius: '4px',
            }}
            data-testid="slide-canvas"
            onWheel={handleWheel}
            tabIndex={0}
            aria-label={`Interactive slide canvas. ${getCanvasDescription()} Use mouse to select and manipulate elements.`}
            role="application"
          />
          {/* Screen reader only description for canvas content */}
          <div className="sr-only" aria-live="polite" role="status">
            {selectedElementIds.length > 0
              ? `${selectedElementIds.length} element${selectedElementIds.length !== 1 ? 's' : ''} selected. Use arrow keys to move, Delete to remove.`
              : 'Click on an element to select it, or use the tools above to add content.'
            }
          </div>
          {/* Text input overlay for editing text elements */}
          {isTextEditing && textEditPosition && (
            <TextInputOverlay
              position={textEditPosition}
              dimensions={
                getEditingTextElement()?.dimensions ?? { width: 200, height: 50 }
              }
              viewport={viewport}
              canvasWidth={SLIDE_WIDTH}
              canvasHeight={SLIDE_HEIGHT}
              initialContent={getEditingTextElement()?.content ?? ''}
              fontSize={getEditingTextElement()?.fontSize ?? 24}
              fontFamily={
                getEditingTextElement()?.fontFamily ?? 'Inter, system-ui, sans-serif'
              }
              color={getEditingTextElement()?.color ?? '#1e293b'}
              textAlign={getEditingTextElement()?.textAlign ?? 'left'}
              onComplete={handleTextComplete}
              onCancel={handleTextCancel}
            />
          )}
          {/* Shape drawing preview overlay */}
          {shapeDrawStart && shapeDrawCurrent && interactionMode === 'drawing' && (
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={SLIDE_WIDTH}
              height={SLIDE_HEIGHT}
              data-testid="shape-preview"
            >
              {(() => {
                const x = Math.min(shapeDrawStart.x, shapeDrawCurrent.x)
                const y = Math.min(shapeDrawStart.y, shapeDrawCurrent.y)
                const width = Math.abs(shapeDrawCurrent.x - shapeDrawStart.x)
                const height = Math.abs(shapeDrawCurrent.y - shapeDrawStart.y)

                switch (activeShapeType) {
                  case 'rectangle':
                    return (
                      <rect
                        x={x}
                        y={y}
                        width={width}
                        height={height}
                        fill="rgba(249, 115, 22, 0.3)"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )
                  case 'circle':
                    return (
                      <ellipse
                        cx={x + width / 2}
                        cy={y + height / 2}
                        rx={width / 2}
                        ry={height / 2}
                        fill="rgba(249, 115, 22, 0.3)"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )
                  case 'triangle':
                    return (
                      <polygon
                        points={`${x + width / 2},${y} ${x + width},${y + height} ${x},${y + height}`}
                        fill="rgba(249, 115, 22, 0.3)"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )
                  case 'line':
                    return (
                      <line
                        x1={shapeDrawStart.x}
                        y1={shapeDrawStart.y}
                        x2={shapeDrawCurrent.x}
                        y2={shapeDrawCurrent.y}
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    )
                  default:
                    return null
                }
              })()}
            </svg>
          )}
        </div>
      )}

      {/* Multi-select indicator */}
      {selectedElementIds.length > 1 && (
        <div
          className="absolute top-4 left-4 bg-primary-500 text-white rounded-lg px-3 py-1.5 shadow-md text-sm font-medium flex items-center gap-2"
          role="status"
          aria-live="polite"
          aria-label={`${selectedElementIds.length} elements selected`}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <span>{selectedElementIds.length} selected</span>
        </div>
      )}

      {/* Zoom indicator */}
      <div
        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm text-sm text-secondary-600 font-medium"
        role="status"
        aria-live="polite"
        aria-label={`Zoom level: ${Math.round(viewport.zoom * 100)} percent`}
      >
        <span aria-hidden="true">{Math.round(viewport.zoom * 100)}%</span>
      </div>

      {/* Active tool indicator - shows when a creation tool is selected */}
      {activeTool !== 'select' && currentSlide && (
        <div
          className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border border-secondary-200 flex items-center gap-2"
          style={{ animation: 'slideIn 0.2s ease-out' }}
          role="status"
          aria-live="polite"
        >
          {/* Tool icon */}
          <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
            activeTool === 'text' ? 'bg-primary-100 text-primary-600' :
            activeTool === 'shape' ? 'bg-purple-100 text-purple-600' :
            activeTool === 'image' ? 'bg-green-100 text-green-600' :
            activeTool === 'pan' ? 'bg-amber-100 text-amber-600' :
            'bg-secondary-100 text-secondary-600'
          }`}>
            {activeTool === 'text' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
            {activeTool === 'shape' && (
              <>
                {activeShapeType === 'rectangle' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth={2} />
                  </svg>
                )}
                {activeShapeType === 'circle' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={2} />
                  </svg>
                )}
                {activeShapeType === 'triangle' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4L3 20h18L12 4z" />
                  </svg>
                )}
                {activeShapeType === 'line' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="5" y1="19" x2="19" y2="5" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                )}
              </>
            )}
            {activeTool === 'image' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            {activeTool === 'pan' && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
              </svg>
            )}
          </div>
          {/* Tool name and hint */}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-secondary-800">
              {activeTool === 'text' && 'Text Tool'}
              {activeTool === 'shape' && `${activeShapeType.charAt(0).toUpperCase() + activeShapeType.slice(1)} Shape`}
              {activeTool === 'image' && 'Image Tool'}
              {activeTool === 'pan' && 'Pan Tool'}
            </span>
            <span className="text-xs text-secondary-500">
              {activeTool === 'text' && 'Click to add text'}
              {activeTool === 'shape' && 'Click and drag to draw'}
              {activeTool === 'image' && 'Click to add image'}
              {activeTool === 'pan' && 'Drag to pan canvas'}
            </span>
          </div>
        </div>
      )}

      {/* Drag overlay indicator */}
      {isDragOver && (
        <div
          className="absolute inset-4 border-2 border-dashed border-primary-500 bg-primary-50/50 rounded-lg flex items-center justify-center pointer-events-none"
          role="status"
          aria-live="polite"
        >
          <div className="text-center">
            <p className="text-lg font-medium text-primary-600">Drop image here</p>
            <p className="text-sm text-primary-500">Release to add to slide</p>
          </div>
        </div>
      )}

      {/* Image upload dialog */}
      <ImageUploadDialog
        isOpen={isImageDialogOpen}
        onClose={handleImageDialogClose}
        onInsert={handleImageInsert}
      />

      {/* Layout selector dialog for adding slides */}
      <LayoutSelectorDialog
        isOpen={isLayoutSelectorOpen}
        onClose={() => { setIsLayoutSelectorOpen(false); }}
        onSelectLayout={handleLayoutSelect}
        title="Add New Slide"
        description="Choose a layout template for your new slide"
      />
    </main>
  )
}

export default CanvasArea
