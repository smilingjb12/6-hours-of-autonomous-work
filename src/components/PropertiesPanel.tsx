/**
 * PropertiesPanel Component
 * Right sidebar panel for editing element and slide properties
 *
 * WCAG 2.1 AA Compliant:
 * - Proper form field labeling with htmlFor/id associations
 * - Fieldset and legend for grouped form controls
 * - Accessible read-only state indication
 * - Clear heading hierarchy
 */

import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { useId, useCallback, useMemo, useState } from 'react'
import { Input } from '@components/ui/input'
import { Label } from '@components/ui/label'
import { Textarea } from '@components/ui/textarea'
import { Button } from '@components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import { cn } from '@lib/utils'
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceAround,
  AlignVerticalSpaceAround,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  ArrowDownToLine,
  X,
  Image,
  Trash2,
} from 'lucide-react'
import type { TextElement, SlideElement, ImageElement, ShapeElement, SlideBackground, BackgroundImageFillMode, SlideTransition, SlideTransitionType } from '@/types/presentation'
import { useHistoryStore } from '@stores/historyStore'
import {
  calculateAlignmentPositions,
  calculateDistributionPositions,
  canAlign,
  canDistribute,
  type AlignmentType,
  type DistributionType,
} from '@/utils/alignmentUtils'
import { LayoutSelectorDialog } from './LayoutSelectorDialog'
import type { SlideLayoutType } from '@/types/layout'

/**
 * Available web-safe font families
 */
const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (System)' },
] as const

/**
 * Props for PropertiesPanel component
 */
interface PropertiesPanelProps {
  /** Optional class name for custom styling */
  className?: string
  /** Whether the viewport is tablet-sized (768px - 1023px) */
  isTablet?: boolean
}

/**
 * PropertiesPanel displays properties of the selected element or slide
 * Allows editing of various properties like position, size, colors, etc.
 * Implements proper WCAG 2.1 AA form accessibility
 */
export function PropertiesPanel({ className = '', isTablet = false }: PropertiesPanelProps) {
  // Generate unique IDs for form fields
  const baseId = useId()
  const ids = {
    title: `${baseId}-title`,
    bgColor: `${baseId}-bgColor`,
    bgType: `${baseId}-bgType`,
    bgGradientStart: `${baseId}-bgGradientStart`,
    bgGradientEnd: `${baseId}-bgGradientEnd`,
    bgGradientDirection: `${baseId}-bgGradientDirection`,
    bgImageFillMode: `${baseId}-bgImageFillMode`,
    transitionType: `${baseId}-transitionType`,
    transitionDuration: `${baseId}-transitionDuration`,
    notes: `${baseId}-notes`,
    posX: `${baseId}-posX`,
    posY: `${baseId}-posY`,
    width: `${baseId}-width`,
    height: `${baseId}-height`,
    rotation: `${baseId}-rotation`,
    opacity: `${baseId}-opacity`,
    content: `${baseId}-content`,
    fontSize: `${baseId}-fontSize`,
    fontFamily: `${baseId}-fontFamily`,
    color: `${baseId}-color`,
    shapeType: `${baseId}-shapeType`,
    fill: `${baseId}-fill`,
    stroke: `${baseId}-stroke`,
    strokeWidth: `${baseId}-strokeWidth`,
    cornerRadius: `${baseId}-cornerRadius`,
    shapeRotation: `${baseId}-shapeRotation`,
    src: `${baseId}-src`,
    alt: `${baseId}-alt`,
  }

  // Get presentation data - subscribe to presentations directly for proper reactivity
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const updateElement = usePresentationStore((state) => state.updateElement)
  const updateElements = usePresentationStore((state) => state.updateElements)

  // Layer management functions
  const bringElementForward = usePresentationStore((state) => state.bringElementForward)
  const sendElementBackward = usePresentationStore((state) => state.sendElementBackward)
  const bringElementToFront = usePresentationStore((state) => state.bringElementToFront)
  const sendElementToBack = usePresentationStore((state) => state.sendElementToBack)

  // Background update function
  const updateSlideBackground = usePresentationStore((state) => state.updateSlideBackground)

  // Transition update function
  const updateSlideTransition = usePresentationStore((state) => state.updateSlideTransition)

  // Layout function
  const applyLayout = usePresentationStore((state) => state.applyLayout)

  // Get history store for undo support
  const recordSnapshot = useHistoryStore((state) => state.recordSnapshot)

  // Get updateSlide function for notes
  const updateSlide = usePresentationStore((state) => state.updateSlide)

  // Layout selector dialog state
  const [isLayoutSelectorOpen, setIsLayoutSelectorOpen] = useState(false)

  // Get editor state
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)
  const isPropertiesPanelOpen = useEditorStore((state) => state.isPropertiesPanelOpen)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)

  // Derive presentation and slide from subscribed data for proper reactivity
  const presentation = useMemo(
    () => presentations.find((p) => p.id === currentPresentationId) ?? null,
    [presentations, currentPresentationId]
  )
  const currentSlide = useMemo(
    () => presentation?.slides.find((s) => s.id === currentSlideId) ?? null,
    [presentation, currentSlideId]
  )

  // Derive selected element from currentSlide for proper reactivity
  const firstSelectedId = selectedElementIds[0]
  const selectedElement = useMemo(() => {
    if (selectedElementIds.length !== 1 || !currentSlide || !firstSelectedId) return null
    return currentSlide.elements.find((e) => e.id === firstSelectedId) ?? null
  }, [selectedElementIds.length, currentSlide, firstSelectedId])

  // Handler for updating text element properties
  const handleTextPropertyUpdate = useCallback(
    (updates: Partial<TextElement>) => {
      if (currentPresentationId && currentSlideId && firstSelectedId) {
        updateElement(currentPresentationId, currentSlideId, firstSelectedId, updates)
      }
    },
    [currentPresentationId, currentSlideId, firstSelectedId, updateElement]
  )

  // Handler for updating image element properties
  const handleImagePropertyUpdate = useCallback(
    (updates: Partial<ImageElement>) => {
      if (currentPresentationId && currentSlideId && firstSelectedId) {
        updateElement(currentPresentationId, currentSlideId, firstSelectedId, updates)
      }
    },
    [currentPresentationId, currentSlideId, firstSelectedId, updateElement]
  )

  // Handler for updating shape element properties
  const handleShapePropertyUpdate = useCallback(
    (updates: Partial<ShapeElement>) => {
      if (currentPresentationId && currentSlideId && firstSelectedId) {
        updateElement(currentPresentationId, currentSlideId, firstSelectedId, updates)
      }
    },
    [currentPresentationId, currentSlideId, firstSelectedId, updateElement]
  )

  // Handler for updating slide background
  const handleBackgroundUpdate = useCallback(
    (updates: Partial<SlideBackground>) => {
      if (currentPresentationId && currentSlideId) {
        recordSnapshot('Update slide background')
        updateSlideBackground(currentPresentationId, currentSlideId, updates)
      }
    },
    [currentPresentationId, currentSlideId, updateSlideBackground, recordSnapshot]
  )

  // Handler for updating slide transition
  const handleTransitionUpdate = useCallback(
    (updates: Partial<SlideTransition>) => {
      if (currentPresentationId && currentSlideId) {
        recordSnapshot('Update slide transition')
        updateSlideTransition(currentPresentationId, currentSlideId, updates)
      }
    },
    [currentPresentationId, currentSlideId, updateSlideTransition, recordSnapshot]
  )

  // Handler for updating speaker notes
  const handleNotesUpdate = useCallback(
    (notes: string) => {
      if (currentPresentationId && currentSlideId) {
        recordSnapshot('Update speaker notes')
        updateSlide(currentPresentationId, currentSlideId, { notes })
      }
    },
    [currentPresentationId, currentSlideId, updateSlide, recordSnapshot]
  )

  // Handler for background image upload
  const handleBackgroundImageUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file || !currentPresentationId || !currentSlideId) return

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return
      }

      // Read file as data URL
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageSrc = e.target?.result as string
        if (imageSrc) {
          recordSnapshot('Set background image')
          updateSlideBackground(currentPresentationId, currentSlideId, {
            type: 'image',
            imageSrc,
            imageFillMode: 'cover',
          })
        }
      }
      reader.readAsDataURL(file)

      // Reset input value to allow re-uploading same file
      event.target.value = ''
    },
    [currentPresentationId, currentSlideId, updateSlideBackground, recordSnapshot]
  )

  // Handler for removing background image
  const handleRemoveBackgroundImage = useCallback(() => {
    if (currentPresentationId && currentSlideId) {
      recordSnapshot('Remove background image')
      // Remove imageSrc by spreading the background without imageSrc property
      const { imageSrc: _removed, ...restBackground } = currentSlide?.background || {}
      void _removed // silence unused variable warning
      updateSlideBackground(currentPresentationId, currentSlideId, {
        ...restBackground,
        type: 'solid',
        color: currentSlide?.background.color || '#ffffff',
      })
    }
  }, [currentPresentationId, currentSlideId, currentSlide?.background, updateSlideBackground, recordSnapshot])

  // Handler for applying a layout to the current slide
  const handleApplyLayout = useCallback(
    (layoutType: SlideLayoutType) => {
      if (currentPresentationId && currentSlideId) {
        recordSnapshot('Apply slide layout')
        applyLayout(currentPresentationId, currentSlideId, layoutType)
      }
      setIsLayoutSelectorOpen(false)
    },
    [currentPresentationId, currentSlideId, applyLayout, recordSnapshot]
  )

  // Get selected elements for alignment operations
  const getSelectedElements = useCallback((): SlideElement[] => {
    if (!currentSlide || selectedElementIds.length < 2) return []
    return currentSlide.elements.filter((el) => selectedElementIds.includes(el.id))
  }, [currentSlide, selectedElementIds])

  // Handler for aligning elements
  const handleAlign = useCallback(
    (alignmentType: AlignmentType) => {
      if (!currentPresentationId || !currentSlideId) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length < 2) return

      // Record snapshot for undo
      recordSnapshot(`Align elements ${alignmentType}`)

      // Calculate new positions
      const positionUpdates = calculateAlignmentPositions(selectedElements, alignmentType)

      // Update elements
      const updates = positionUpdates.map((update) => ({
        id: update.id,
        changes: { position: update.position } as Partial<SlideElement>,
      }))

      updateElements(currentPresentationId, currentSlideId, updates)
    },
    [currentPresentationId, currentSlideId, getSelectedElements, recordSnapshot, updateElements]
  )

  // Handler for distributing elements
  const handleDistribute = useCallback(
    (distributionType: DistributionType) => {
      if (!currentPresentationId || !currentSlideId) return

      const selectedElements = getSelectedElements()
      if (selectedElements.length < 3) return

      // Record snapshot for undo
      recordSnapshot(`Distribute elements ${distributionType}`)

      // Calculate new positions
      const positionUpdates = calculateDistributionPositions(selectedElements, distributionType)

      // Update elements
      const updates = positionUpdates.map((update) => ({
        id: update.id,
        changes: { position: update.position } as Partial<SlideElement>,
      }))

      updateElements(currentPresentationId, currentSlideId, updates)
    },
    [currentPresentationId, currentSlideId, getSelectedElements, recordSnapshot, updateElements]
  )

  // Layer management handlers with history support
  const handleBringForward = useCallback(() => {
    if (!currentPresentationId || !currentSlideId || !firstSelectedId) return
    recordSnapshot('Bring element forward')
    bringElementForward(currentPresentationId, currentSlideId, firstSelectedId)
  }, [currentPresentationId, currentSlideId, firstSelectedId, recordSnapshot, bringElementForward])

  const handleSendBackward = useCallback(() => {
    if (!currentPresentationId || !currentSlideId || !firstSelectedId) return
    recordSnapshot('Send element backward')
    sendElementBackward(currentPresentationId, currentSlideId, firstSelectedId)
  }, [currentPresentationId, currentSlideId, firstSelectedId, recordSnapshot, sendElementBackward])

  const handleBringToFront = useCallback(() => {
    if (!currentPresentationId || !currentSlideId || !firstSelectedId) return
    recordSnapshot('Bring element to front')
    bringElementToFront(currentPresentationId, currentSlideId, firstSelectedId)
  }, [currentPresentationId, currentSlideId, firstSelectedId, recordSnapshot, bringElementToFront])

  const handleSendToBack = useCallback(() => {
    if (!currentPresentationId || !currentSlideId || !firstSelectedId) return
    recordSnapshot('Send element to back')
    sendElementToBack(currentPresentationId, currentSlideId, firstSelectedId)
  }, [currentPresentationId, currentSlideId, firstSelectedId, recordSnapshot, sendElementToBack])

  // Calculate layer position info for the selected element - memoized
  const layerInfo = useMemo(() => {
    if (!currentSlide || !selectedElement) return null
    const sortedElements = [...currentSlide.elements].sort((a, b) => a.zIndex - b.zIndex)
    const position = sortedElements.findIndex((e) => e.id === selectedElement.id)
    return {
      current: position + 1, // 1-based for display
      total: sortedElements.length,
      isTop: position === sortedElements.length - 1,
      isBottom: position === 0,
    }
  }, [currentSlide, selectedElement])


  // Check if alignment/distribution is available
  const alignmentAvailable = canAlign(selectedElementIds.length)
  const distributionAvailable = canDistribute(selectedElementIds.length)

  // Do not render if panel is closed
  if (!isPropertiesPanelOpen) {
    return null
  }

  // Panel classes with tablet-specific styling
  const panelClasses = cn(
    'properties-panel bg-white border-l border-secondary-200 flex flex-col h-full transition-all duration-200 ease-smooth',
    isTablet && 'tablet-properties-panel',
    className
  )

  return (
    <aside
      id="properties-panel"
      className={panelClasses}
      style={{ width: 'var(--panel-width)' }}
      data-testid="properties-panel"
      aria-label="Properties panel"
      data-tablet={isTablet}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
        <h2 id="properties-heading" className="text-sm font-semibold text-secondary-800">
          Properties
        </h2>
        {/* Close button for tablet mode */}
        {isTablet && (
          <button
            type="button"
            onClick={togglePropertiesPanel}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              'text-secondary-400 hover:text-secondary-700 hover:bg-secondary-100',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'
            )}
            aria-label="Close properties panel"
            data-testid="tablet-close-properties"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto scrollbar-thin"
        role="region"
        aria-labelledby="properties-heading"
      >
        {!presentation ? (
          // No presentation
          <div className="p-4 text-center text-secondary-500 text-sm" role="status">
            <p>No presentation selected</p>
          </div>
        ) : !currentSlide ? (
          // No slide selected
          <div className="p-4 text-center text-secondary-500 text-sm" role="status">
            <p>Select a slide to view properties</p>
          </div>
        ) : selectedElementIds.length === 0 ? (
          // Slide properties (no element selected)
          <form className="p-4 space-y-4" aria-label="Slide properties">
            <fieldset>
              <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Slide Properties
              </legend>

              {/* Slide Title */}
              <div className="space-y-2">
                <Label htmlFor={ids.title}>Title</Label>
                <Input
                  id={ids.title}
                  type="text"
                  value={currentSlide.title}
                  onChange={(e) => {
                    if (currentPresentationId && currentSlideId) {
                      recordSnapshot('Update slide title')
                      updateSlide(currentPresentationId, currentSlideId, { title: e.target.value })
                    }
                  }}
                  data-testid="slide-title-input"
                />
              </div>

              {/* Elements count */}
              <div className="mt-4 p-3 bg-secondary-50 rounded-lg" role="status">
                <p className="text-sm text-secondary-600">
                  <span className="font-medium">{currentSlide.elements.length}</span> element
                  {currentSlide.elements.length !== 1 ? 's' : ''} on this slide
                </p>
              </div>

              {/* Change Layout Button */}
              <div className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => { setIsLayoutSelectorOpen(true); }}
                  data-testid="change-layout-button"
                >
                  Change Layout
                </Button>
                <p className="text-xs text-secondary-500 mt-1">
                  Apply a different layout template to this slide
                </p>
              </div>
            </fieldset>

            {/* Background Settings */}
            <fieldset data-testid="background-settings-panel">
              <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Background
              </legend>

              {/* Background Type Selector */}
              <div className="space-y-2">
                <Label htmlFor={ids.bgType}>Type</Label>
                <Select
                  value={currentSlide.background.type}
                  onValueChange={(value: 'solid' | 'gradient' | 'image') => {
                    if (value === 'solid') {
                      handleBackgroundUpdate({
                        type: 'solid',
                        color: currentSlide.background.color || '#ffffff',
                      })
                    } else if (value === 'gradient') {
                      handleBackgroundUpdate({
                        type: 'gradient',
                        gradientStart: currentSlide.background.gradientStart || '#ffffff',
                        gradientEnd: currentSlide.background.gradientEnd || '#f97316',
                        gradientDirection: currentSlide.background.gradientDirection || 'diagonal',
                      })
                    }
                    // Image type is handled by the upload button
                  }}
                >
                  <SelectTrigger id={ids.bgType} data-testid="background-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid Color</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Solid Color Settings */}
              {currentSlide.background.type === 'solid' && (
                <div className="space-y-2 mt-4" data-testid="solid-color-settings">
                  <Label htmlFor={ids.bgColor}>Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={ids.bgColor}
                      type="color"
                      className="w-10 h-10 p-0 border border-secondary-300 rounded cursor-pointer"
                      value={currentSlide.background.color ?? '#ffffff'}
                      onChange={(e) => { handleBackgroundUpdate({ color: e.target.value }); }}
                      aria-label="Background color picker"
                      data-testid="background-color-picker"
                    />
                    <Input
                      type="text"
                      className="flex-1"
                      value={currentSlide.background.color ?? '#ffffff'}
                      onChange={(e) => { handleBackgroundUpdate({ color: e.target.value }); }}
                      placeholder="#ffffff"
                      data-testid="background-color-input"
                    />
                  </div>
                </div>
              )}

              {/* Gradient Settings */}
              {currentSlide.background.type === 'gradient' && (
                <div className="space-y-4 mt-4" data-testid="gradient-settings">
                  {/* Gradient Direction */}
                  <div className="space-y-2">
                    <Label htmlFor={ids.bgGradientDirection}>Direction</Label>
                    <Select
                      value={currentSlide.background.gradientDirection || 'diagonal'}
                      onValueChange={(value: 'horizontal' | 'vertical' | 'diagonal') =>
                        { handleBackgroundUpdate({ gradientDirection: value }); }
                      }
                    >
                      <SelectTrigger id={ids.bgGradientDirection} data-testid="gradient-direction-select">
                        <SelectValue placeholder="Select direction" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="horizontal">Horizontal</SelectItem>
                        <SelectItem value="vertical">Vertical</SelectItem>
                        <SelectItem value="diagonal">Diagonal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Color */}
                  <div className="space-y-2">
                    <Label htmlFor={ids.bgGradientStart}>Start Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id={ids.bgGradientStart}
                        type="color"
                        className="w-10 h-10 p-0 border border-secondary-300 rounded cursor-pointer"
                        value={currentSlide.background.gradientStart ?? '#ffffff'}
                        onChange={(e) => { handleBackgroundUpdate({ gradientStart: e.target.value }); }}
                        aria-label="Gradient start color picker"
                        data-testid="gradient-start-color-picker"
                      />
                      <Input
                        type="text"
                        className="flex-1"
                        value={currentSlide.background.gradientStart ?? '#ffffff'}
                        onChange={(e) => { handleBackgroundUpdate({ gradientStart: e.target.value }); }}
                        placeholder="#ffffff"
                        data-testid="gradient-start-color-input"
                      />
                    </div>
                  </div>

                  {/* End Color */}
                  <div className="space-y-2">
                    <Label htmlFor={ids.bgGradientEnd}>End Color</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id={ids.bgGradientEnd}
                        type="color"
                        className="w-10 h-10 p-0 border border-secondary-300 rounded cursor-pointer"
                        value={currentSlide.background.gradientEnd ?? '#f97316'}
                        onChange={(e) => { handleBackgroundUpdate({ gradientEnd: e.target.value }); }}
                        aria-label="Gradient end color picker"
                        data-testid="gradient-end-color-picker"
                      />
                      <Input
                        type="text"
                        className="flex-1"
                        value={currentSlide.background.gradientEnd ?? '#f97316'}
                        onChange={(e) => { handleBackgroundUpdate({ gradientEnd: e.target.value }); }}
                        placeholder="#f97316"
                        data-testid="gradient-end-color-input"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Image Settings */}
              {currentSlide.background.type === 'image' && (
                <div className="space-y-4 mt-4" data-testid="image-background-settings">
                  {/* Image Preview */}
                  {currentSlide.background.imageSrc && (
                    <div className="relative w-full aspect-video bg-secondary-100 rounded-lg overflow-hidden">
                      <img
                        src={currentSlide.background.imageSrc}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                        data-testid="background-image-preview"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 bg-white/80 hover:bg-white shadow-sm"
                        onClick={handleRemoveBackgroundImage}
                        aria-label="Remove background image"
                        data-testid="remove-background-image-button"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  )}

                  {/* Image Fill Mode */}
                  <div className="space-y-2">
                    <Label htmlFor={ids.bgImageFillMode}>Fill Mode</Label>
                    <Select
                      value={currentSlide.background.imageFillMode || 'cover'}
                      onValueChange={(value: BackgroundImageFillMode) =>
                        { handleBackgroundUpdate({ imageFillMode: value }); }
                      }
                    >
                      <SelectTrigger id={ids.bgImageFillMode} data-testid="image-fill-mode-select">
                        <SelectValue placeholder="Select fill mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover (fill, crop if needed)</SelectItem>
                        <SelectItem value="contain">Contain (fit inside)</SelectItem>
                        <SelectItem value="stretch">Stretch (fill, may distort)</SelectItem>
                        <SelectItem value="tile">Tile (repeat pattern)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-secondary-500">
                      Controls how the image fills the slide background
                    </p>
                  </div>

                  {/* Change Image Button */}
                  <div>
                    <Label className="block mb-2">Change Image</Label>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 rounded-lg cursor-pointer transition-colors">
                      <Image className="h-4 w-4" aria-hidden="true" />
                      <span className="text-sm font-medium">Select Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleBackgroundImageUpload}
                        aria-label="Upload background image"
                        data-testid="background-image-upload-input"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Upload Image Button for non-image types */}
              {currentSlide.background.type !== 'image' && (
                <div className="mt-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-secondary-100 hover:bg-secondary-200 rounded-lg cursor-pointer transition-colors">
                    <Image className="h-4 w-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Set Background Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleBackgroundImageUpload}
                      aria-label="Upload background image"
                      data-testid="background-image-upload-button"
                    />
                  </label>
                </div>
              )}
            </fieldset>

            {/* Transition Settings */}
            <fieldset data-testid="transition-settings-panel">
              <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Transition
              </legend>

              {/* Transition Type Selector */}
              <div className="space-y-2">
                <Label htmlFor={ids.transitionType}>Effect</Label>
                <Select
                  value={currentSlide.transition?.type ?? 'none'}
                  onValueChange={(value: SlideTransitionType) => {
                    handleTransitionUpdate({ type: value })
                  }}
                >
                  <SelectTrigger id={ids.transitionType} data-testid="transition-type-select">
                    <SelectValue placeholder="Select transition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fade">Fade</SelectItem>
                    <SelectItem value="slide">Slide</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-secondary-500">
                  Transition effect when entering this slide
                </p>
              </div>

              {/* Transition Duration */}
              <div className="space-y-2 mt-4">
                <Label htmlFor={ids.transitionDuration}>Duration (ms)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={ids.transitionDuration}
                    type="number"
                    min={100}
                    max={2000}
                    step={100}
                    value={currentSlide.transition?.duration ?? 500}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10)
                      if (!isNaN(value) && value >= 100 && value <= 2000) {
                        handleTransitionUpdate({ duration: value })
                      }
                    }}
                    className="w-24"
                    data-testid="transition-duration-input"
                  />
                  <span className="text-sm text-secondary-500">
                    {((currentSlide.transition?.duration ?? 500) / 1000).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={100}
                  value={currentSlide.transition?.duration ?? 500}
                  onChange={(e) => {
                    handleTransitionUpdate({ duration: parseInt(e.target.value, 10) })
                  }}
                  className="w-full"
                  aria-label="Transition duration slider"
                  data-testid="transition-duration-slider"
                />
              </div>
            </fieldset>

            {/* Slide Notes */}
            <fieldset>
              <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Notes
              </legend>
              <Label htmlFor={ids.notes} className="sr-only">
                Speaker notes
              </Label>
              <Textarea
                id={ids.notes}
                className="min-h-[100px] resize-y"
                placeholder="Add speaker notes for this slide..."
                value={currentSlide.notes}
                onChange={(e) => { handleNotesUpdate(e.target.value); }}
                data-testid="slide-notes-input"
              />
              <p className="text-xs text-secondary-500 mt-1">
                Notes are visible only to the presenter
              </p>
            </fieldset>
          </form>
        ) : selectedElementIds.length === 1 && selectedElement ? (
          // Single element selected
          <form className="p-4 space-y-4" aria-label="Element properties">
            <fieldset>
              <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Element Properties
              </legend>

              {/* Element Type */}
              <div className="mb-4" role="status">
                <span className="sr-only">Element type: </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700 capitalize">
                  {selectedElement.type}
                </span>
              </div>

              {/* Position */}
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-secondary-700">Position</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={ids.posX} className="text-xs text-secondary-500">
                      X
                    </Label>
                    <Input
                      id={ids.posX}
                      type="number"
                      value={selectedElement.position.x}
                      readOnly
                      aria-readonly="true"
                      data-testid="position-x-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor={ids.posY} className="text-xs text-secondary-500">
                      Y
                    </Label>
                    <Input
                      id={ids.posY}
                      type="number"
                      value={selectedElement.position.y}
                      readOnly
                      aria-readonly="true"
                      data-testid="position-y-input"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Size */}
              <fieldset className="space-y-2 mt-4">
                <legend className="text-sm font-medium text-secondary-700">Size</legend>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor={ids.width} className="text-xs text-secondary-500">
                      Width
                    </Label>
                    <Input
                      id={ids.width}
                      type="number"
                      value={selectedElement.dimensions.width}
                      readOnly
                      aria-readonly="true"
                      data-testid="width-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor={ids.height} className="text-xs text-secondary-500">
                      Height
                    </Label>
                    <Input
                      id={ids.height}
                      type="number"
                      value={selectedElement.dimensions.height}
                      readOnly
                      aria-readonly="true"
                      data-testid="height-input"
                    />
                  </div>
                </div>
              </fieldset>

              {/* Rotation & Opacity */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor={ids.rotation}>Rotation</Label>
                  <Input
                    id={ids.rotation}
                    type="number"
                    value={selectedElement.rotation}
                    readOnly
                    aria-readonly="true"
                    aria-label="Rotation in degrees"
                    data-testid="rotation-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={ids.opacity}>Opacity</Label>
                  <Input
                    id={ids.opacity}
                    type="number"
                    value={Math.round(selectedElement.opacity * 100)}
                    readOnly
                    aria-readonly="true"
                    aria-label="Opacity percentage"
                    data-testid="opacity-input"
                  />
                </div>
              </div>

              {/* Layer Management */}
              <fieldset className="mt-4 pt-4 border-t border-secondary-200" data-testid="layer-management-panel">
                <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                  Layer Order
                </legend>
                <div className="space-y-3">
                  {/* Layer Position Display */}
                  {layerInfo && (
                    <div className="flex items-center gap-2 p-2 bg-secondary-50 rounded-lg" role="status" data-testid="layer-position-display">
                      <Layers className="h-4 w-4 text-secondary-500" aria-hidden="true" />
                      <span className="text-sm text-secondary-600">
                        Layer <span className="font-semibold text-secondary-800" data-testid="layer-position">{layerInfo.current}</span> of <span className="font-semibold text-secondary-800" data-testid="layer-total">{layerInfo.total}</span>
                      </span>
                    </div>
                  )}

                  {/* Layer Control Buttons */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-secondary-700">Arrange</Label>
                    <div className="flex gap-1" role="group" aria-label="Layer order controls">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleBringToFront}
                        disabled={layerInfo?.isTop}
                        title="Bring to front"
                        aria-label="Bring element to front"
                        data-testid="bring-to-front-button"
                      >
                        <ArrowUpToLine className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleBringForward}
                        disabled={layerInfo?.isTop}
                        title="Bring forward"
                        aria-label="Bring element forward one layer"
                        data-testid="bring-forward-button"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSendBackward}
                        disabled={layerInfo?.isBottom}
                        title="Send backward"
                        aria-label="Send element backward one layer"
                        data-testid="send-backward-button"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSendToBack}
                        disabled={layerInfo?.isBottom}
                        title="Send to back"
                        aria-label="Send element to back"
                        data-testid="send-to-back-button"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </fieldset>

              {/* Type-specific properties */}
              {selectedElement.type === 'text' && (
                <fieldset className="mt-4 pt-4 border-t border-secondary-200" data-testid="text-formatting-panel">
                  <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                    Text Formatting
                  </legend>
                  <div className="space-y-4">
                    {/* Content */}
                    <div>
                      <Label htmlFor={ids.content}>Content</Label>
                      <Textarea
                        id={ids.content}
                        className="min-h-[60px] resize-none"
                        value={selectedElement.content}
                        onChange={(e) => { handleTextPropertyUpdate({ content: e.target.value }); }}
                        data-testid="text-content-input"
                      />
                    </div>

                    {/* Font Family */}
                    <div className="space-y-2">
                      <Label htmlFor={ids.fontFamily}>Font Family</Label>
                      <Select
                        value={selectedElement.fontFamily}
                        onValueChange={(value) => { handleTextPropertyUpdate({ fontFamily: value }); }}
                      >
                        <SelectTrigger id={ids.fontFamily} data-testid="font-family-select">
                          <SelectValue placeholder="Select font" />
                        </SelectTrigger>
                        <SelectContent>
                          {FONT_FAMILIES.map((font) => (
                            <SelectItem
                              key={font.value}
                              value={font.value}
                              style={{ fontFamily: font.value }}
                            >
                              {font.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Font Size and Color Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-2">
                        <Label htmlFor={ids.fontSize}>Font Size</Label>
                        <Input
                          id={ids.fontSize}
                          type="number"
                          min={8}
                          max={200}
                          value={selectedElement.fontSize}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 8 && value <= 200) {
                              handleTextPropertyUpdate({ fontSize: value })
                            }
                          }}
                          data-testid="font-size-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={ids.color}>Text Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            id={ids.color}
                            type="color"
                            className="w-8 h-9 p-0 border border-secondary-300 rounded cursor-pointer"
                            value={selectedElement.color}
                            onChange={(e) => { handleTextPropertyUpdate({ color: e.target.value }); }}
                            aria-label="Text color picker"
                            data-testid="text-color-input"
                          />
                          <Input
                            type="text"
                            className="flex-1"
                            value={selectedElement.color}
                            onChange={(e) => { handleTextPropertyUpdate({ color: e.target.value }); }}
                            placeholder="#000000"
                            data-testid="text-color-text-input"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bold and Italic Toggles */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-secondary-700">Style</Label>
                      <div className="flex gap-1" role="group" aria-label="Text style options">
                        <Button
                          type="button"
                          variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() =>
                            { handleTextPropertyUpdate({
                              fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                            }); }
                          }
                          aria-label="Toggle bold"
                          aria-pressed={selectedElement.fontWeight === 'bold'}
                          data-testid="bold-toggle"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() =>
                            { handleTextPropertyUpdate({
                              fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                            }); }
                          }
                          aria-label="Toggle italic"
                          aria-pressed={selectedElement.fontStyle === 'italic'}
                          data-testid="italic-toggle"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-secondary-700">Alignment</Label>
                      <div className="flex gap-1" role="group" aria-label="Text alignment options">
                        <Button
                          type="button"
                          variant={selectedElement.textAlign === 'left' ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() => { handleTextPropertyUpdate({ textAlign: 'left' }); }}
                          aria-label="Align left"
                          aria-pressed={selectedElement.textAlign === 'left'}
                          data-testid="align-left-button"
                        >
                          <AlignLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() => { handleTextPropertyUpdate({ textAlign: 'center' }); }}
                          aria-label="Align center"
                          aria-pressed={selectedElement.textAlign === 'center'}
                          data-testid="align-center-button"
                        >
                          <AlignCenter className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'}
                          size="icon"
                          onClick={() => { handleTextPropertyUpdate({ textAlign: 'right' }); }}
                          aria-label="Align right"
                          aria-pressed={selectedElement.textAlign === 'right'}
                          data-testid="align-right-button"
                        >
                          <AlignRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </fieldset>
              )}

              {selectedElement.type === 'shape' && (
                <fieldset className="mt-4 pt-4 border-t border-secondary-200" data-testid="shape-formatting-panel">
                  <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                    Shape Formatting
                  </legend>
                  <div className="space-y-4">
                    {/* Shape Type (read-only) */}
                    <div>
                      <Label htmlFor={ids.shapeType}>Shape Type</Label>
                      <Input
                        id={ids.shapeType}
                        type="text"
                        className="capitalize"
                        value={selectedElement.shapeType}
                        readOnly
                        aria-readonly="true"
                        data-testid="shape-type-input"
                      />
                    </div>

                    {/* Fill Color */}
                    <div className="space-y-2">
                      <Label htmlFor={ids.fill}>Fill Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id={ids.fill}
                          type="color"
                          className="w-8 h-9 p-0 border border-secondary-300 rounded cursor-pointer"
                          value={selectedElement.fillColor}
                          onChange={(e) => { handleShapePropertyUpdate({ fillColor: e.target.value }); }}
                          aria-label="Fill color picker"
                          data-testid="shape-fill-color-input"
                        />
                        <Input
                          type="text"
                          className="flex-1"
                          value={selectedElement.fillColor}
                          onChange={(e) => { handleShapePropertyUpdate({ fillColor: e.target.value }); }}
                          placeholder="#000000"
                          data-testid="shape-fill-color-text"
                        />
                      </div>
                    </div>

                    {/* Stroke Color */}
                    <div className="space-y-2">
                      <Label htmlFor={ids.stroke}>Stroke Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id={ids.stroke}
                          type="color"
                          className="w-8 h-9 p-0 border border-secondary-300 rounded cursor-pointer"
                          value={selectedElement.strokeColor}
                          onChange={(e) => { handleShapePropertyUpdate({ strokeColor: e.target.value }); }}
                          aria-label="Stroke color picker"
                          data-testid="shape-stroke-color-input"
                        />
                        <Input
                          type="text"
                          className="flex-1"
                          value={selectedElement.strokeColor}
                          onChange={(e) => { handleShapePropertyUpdate({ strokeColor: e.target.value }); }}
                          placeholder="#000000"
                          data-testid="shape-stroke-color-text"
                        />
                      </div>
                    </div>

                    {/* Stroke Width */}
                    <div className="space-y-2">
                      <Label htmlFor={ids.strokeWidth}>Stroke Width</Label>
                      <Input
                        id={ids.strokeWidth}
                        type="number"
                        min={0}
                        max={50}
                        value={selectedElement.strokeWidth}
                        onChange={(e) => {
                          const value = parseInt(e.target.value, 10)
                          if (!isNaN(value) && value >= 0 && value <= 50) {
                            handleShapePropertyUpdate({ strokeWidth: value })
                          }
                        }}
                        data-testid="shape-stroke-width-input"
                      />
                      <p className="text-xs text-secondary-500">
                        Width of the shape border (0-50px)
                      </p>
                    </div>

                    {/* Rotation */}
                    <div className="space-y-2">
                      <Label htmlFor={ids.shapeRotation}>Rotation</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={ids.shapeRotation}
                          type="number"
                          min={-360}
                          max={360}
                          value={selectedElement.rotation}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= -360 && value <= 360) {
                              handleShapePropertyUpdate({ rotation: value })
                            }
                          }}
                          className="flex-1"
                          data-testid="shape-rotation-input"
                        />
                        <span className="text-sm text-secondary-500">°</span>
                      </div>
                      <p className="text-xs text-secondary-500">
                        Rotation angle in degrees (-360 to 360)
                      </p>
                    </div>

                    {/* Corner Radius (only for rectangles) */}
                    {selectedElement.shapeType === 'rectangle' && (
                      <div className="space-y-2">
                        <Label htmlFor={ids.cornerRadius}>Corner Radius</Label>
                        <Input
                          id={ids.cornerRadius}
                          type="number"
                          min={0}
                          max={100}
                          value={selectedElement.cornerRadius ?? 0}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 0 && value <= 100) {
                              handleShapePropertyUpdate({ cornerRadius: value })
                            }
                          }}
                          data-testid="shape-corner-radius-input"
                        />
                        <p className="text-xs text-secondary-500">
                          Round the corners of the rectangle (0-100px)
                        </p>
                      </div>
                    )}
                  </div>
                </fieldset>
              )}

              {selectedElement.type === 'image' && (
                <fieldset className="mt-4 pt-4 border-t border-secondary-200" data-testid="image-properties-panel">
                  <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                    Image Properties
                  </legend>
                  <div className="space-y-4">
                    {/* Image Preview */}
                    <div className="w-full aspect-video bg-secondary-100 rounded-lg overflow-hidden flex items-center justify-center">
                      {selectedElement.src ? (
                        <img
                          loading="lazy"
                          src={selectedElement.src}
                          alt={selectedElement.alt || 'Preview'}
                          className="max-w-full max-h-full object-contain"
                          width="200"
                          height="112"
                          data-testid="image-preview"
                        />
                      ) : (
                        <span className="text-secondary-400 text-sm">No image</span>
                      )}
                    </div>

                    {/* Source URL (read-only display) */}
                    <div>
                      <Label htmlFor={ids.src}>Source</Label>
                      <Input
                        id={ids.src}
                        type="text"
                        value={selectedElement.src.startsWith('data:') ? '(Embedded image)' : selectedElement.src}
                        readOnly
                        aria-readonly="true"
                        className="text-xs"
                        title={selectedElement.src.startsWith('data:') ? 'This image is embedded as a data URL' : selectedElement.src}
                        data-testid="image-src-input"
                      />
                    </div>

                    {/* Alt Text (editable) */}
                    <div>
                      <Label htmlFor={ids.alt}>
                        Alt Text
                        <span className="text-secondary-500 text-xs ml-2">(for accessibility)</span>
                      </Label>
                      <Input
                        id={ids.alt}
                        type="text"
                        value={selectedElement.alt}
                        onChange={(e) => { handleImagePropertyUpdate({ alt: e.target.value }); }}
                        placeholder="Describe the image..."
                        data-testid="image-alt-input"
                      />
                    </div>

                    {/* Object Fit */}
                    <div className="space-y-2">
                      <Label htmlFor={`${ids.src}-fit`}>Object Fit</Label>
                      <Select
                        value={selectedElement.objectFit}
                        onValueChange={(value: 'cover' | 'contain' | 'fill' | 'none') =>
                          { handleImagePropertyUpdate({ objectFit: value }); }
                        }
                      >
                        <SelectTrigger id={`${ids.src}-fit`} data-testid="image-objectfit-select">
                          <SelectValue placeholder="Select fit mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contain">Contain (fit inside)</SelectItem>
                          <SelectItem value="cover">Cover (fill, crop if needed)</SelectItem>
                          <SelectItem value="fill">Fill (stretch to fit)</SelectItem>
                          <SelectItem value="none">None (original size)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-secondary-500">
                        Controls how the image fits within its bounding box
                      </p>
                    </div>
                  </div>
                </fieldset>
              )}
            </fieldset>
          </form>
        ) : (
          // Multiple elements selected - show alignment and distribution tools
          <div className="p-4 space-y-4" data-testid="multi-selection-panel">
            <div>
              <h3 className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                Multiple Selection
              </h3>
              <div className="p-3 bg-secondary-50 rounded-lg">
                <p className="text-sm text-secondary-600">
                  <span className="font-medium">{selectedElementIds.length}</span> elements selected
                </p>
              </div>
            </div>

            {/* Alignment Controls */}
            {alignmentAvailable && (
              <fieldset data-testid="alignment-controls">
                <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                  Align Elements
                </legend>

                {/* Horizontal Alignment */}
                <div className="space-y-2 mb-3">
                  <Label className="text-sm font-medium text-secondary-700">Horizontal</Label>
                  <div className="flex gap-1" role="group" aria-label="Horizontal alignment options">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('left'); }}
                      title="Align left edges"
                      aria-label="Align left edges"
                      data-testid="align-elements-left"
                    >
                      <AlignStartVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('center'); }}
                      title="Align horizontal centers"
                      aria-label="Align horizontal centers"
                      data-testid="align-elements-center"
                    >
                      <AlignCenterVertical className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('right'); }}
                      title="Align right edges"
                      aria-label="Align right edges"
                      data-testid="align-elements-right"
                    >
                      <AlignEndVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Vertical Alignment */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-secondary-700">Vertical</Label>
                  <div className="flex gap-1" role="group" aria-label="Vertical alignment options">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('top'); }}
                      title="Align top edges"
                      aria-label="Align top edges"
                      data-testid="align-elements-top"
                    >
                      <AlignStartHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('middle'); }}
                      title="Align vertical centers"
                      aria-label="Align vertical centers"
                      data-testid="align-elements-middle"
                    >
                      <AlignCenterHorizontal className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleAlign('bottom'); }}
                      title="Align bottom edges"
                      aria-label="Align bottom edges"
                      data-testid="align-elements-bottom"
                    >
                      <AlignEndHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Distribution Controls */}
            {distributionAvailable && (
              <fieldset data-testid="distribution-controls">
                <legend className="text-xs font-semibold text-secondary-500 uppercase tracking-wide mb-3">
                  Distribute Elements
                </legend>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-secondary-700">Spacing</Label>
                  <div className="flex gap-1" role="group" aria-label="Distribution options">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleDistribute('horizontal'); }}
                      title="Distribute horizontally"
                      aria-label="Distribute horizontally"
                      data-testid="distribute-horizontal"
                    >
                      <AlignHorizontalSpaceAround className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => { handleDistribute('vertical'); }}
                      title="Distribute vertically"
                      aria-label="Distribute vertically"
                      data-testid="distribute-vertical"
                    >
                      <AlignVerticalSpaceAround className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-secondary-500 mt-2">
                  Requires 3+ elements selected
                </p>
              </fieldset>
            )}

            {!alignmentAvailable && (
              <p className="text-xs text-secondary-500">
                Select 2+ elements to use alignment tools
              </p>
            )}
          </div>
        )}
      </div>

      {/* Layout selector dialog for changing slide layout */}
      <LayoutSelectorDialog
        isOpen={isLayoutSelectorOpen}
        onClose={() => { setIsLayoutSelectorOpen(false); }}
        onSelectLayout={handleApplyLayout}
        title="Change Slide Layout"
        description="Select a new layout for this slide. This will replace the current elements."
      />
    </aside>
  )
}

export default PropertiesPanel
