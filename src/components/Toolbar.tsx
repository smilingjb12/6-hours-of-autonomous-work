/**
 * Toolbar Component
 * Top toolbar with editing tools, zoom controls, and presentation actions
 *
 * WCAG 2.1 AA Compliant:
 * - ARIA toolbar pattern with proper roles
 * - Keyboard navigation with arrow keys within tool groups
 * - Focus management and visible focus indicators
 * - Screen reader announcements for tool changes
 */

import { useState, useRef, useCallback, memo, useMemo } from 'react'
import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { CreatePresentationDialog } from './CreatePresentationDialog'
import { Button } from '@components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import {
  MousePointer2,
  Type,
  Square,
  Circle,
  Triangle,
  Minus,
  Image,
  Hand,
  Grid3X3,
  PanelLeft,
  Settings2,
  ZoomOut,
  ZoomIn,
  Plus,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@lib/utils'
import type { EditorTool, ShapeToolType } from '../types/editor'

/**
 * Props for Toolbar component
 */
interface ToolbarProps {
  /** Optional class name for custom styling */
  className?: string
}

/**
 * Tool button component for consistent styling and accessibility
 */
interface ToolButtonProps {
  tool: EditorTool
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  shortcutKey?: string
  tabIndex?: number
  onKeyDown?: (e: React.KeyboardEvent) => void
  buttonRef?: (el: HTMLButtonElement | null) => void
}

const ToolButton = memo(function ToolButton({
  tool,
  icon,
  label,
  isActive,
  onClick,
  shortcutKey,
  tabIndex = 0,
  onKeyDown,
  buttonRef,
}: ToolButtonProps) {
  return (
    <Button
      ref={buttonRef}
      type="button"
      variant={isActive ? 'secondary' : 'ghost'}
      size="icon"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'h-9 w-9',
        isActive && 'bg-primary-100 text-primary-700 hover:bg-primary-100'
      )}
      title={shortcutKey ? `${label} (${shortcutKey})` : label}
      data-testid={`tool-${tool}`}
      aria-label={shortcutKey ? `${label}, keyboard shortcut ${shortcutKey}` : label}
      aria-keyshortcuts={shortcutKey}
      tabIndex={tabIndex}
      role="radio"
      aria-checked={isActive}
    >
      {icon}
    </Button>
  )
})

ToolButton.displayName = 'ToolButton';

/**
 * Toolbar provides editing tools and controls for the presentation editor
 * Implements WCAG 2.1 AA accessible toolbar pattern
 */
export function Toolbar({ className = '' }: ToolbarProps) {
  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [focusedToolIndex, setFocusedToolIndex] = useState(0)
  const toolButtonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Get presentation data
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const createPresentation = usePresentationStore((state) => state.createPresentation)
  const setCurrentPresentation = usePresentationStore((state) => state.setCurrentPresentation)

  // Get editor state
  const activeTool = useEditorStore((state) => state.activeTool)
  const setActiveTool = useEditorStore((state) => state.setActiveTool)
  const activeShapeType = useEditorStore((state) => state.activeShapeType)
  const setActiveShapeType = useEditorStore((state) => state.setActiveShapeType)
  const viewport = useEditorStore((state) => state.viewport)
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)
  const resetZoom = useEditorStore((state) => state.resetZoom)
  const showGrid = useEditorStore((state) => state.showGrid)
  const toggleGrid = useEditorStore((state) => state.toggleGrid)
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen)
  const isPropertiesPanelOpen = useEditorStore((state) => state.isPropertiesPanelOpen)
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide)

  // Tool definitions for keyboard navigation - memoized to prevent recreation
  const tools = useMemo(() => ([
    { tool: 'select', label: 'Select tool', shortcut: 'V' },
    { tool: 'text', label: 'Text tool', shortcut: 'T' },
    { tool: 'shape', label: 'Shape tool', shortcut: 'S' },
    { tool: 'image', label: 'Image tool', shortcut: 'I' },
    { tool: 'pan', label: 'Pan tool', shortcut: 'H' },
  ]) as { tool: EditorTool; label: string; shortcut: string }[], [])

  // Handle arrow key navigation within tool group
  const handleToolKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      let newIndex = index

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault()
          newIndex = index === 0 ? tools.length - 1 : index - 1
          break
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault()
          newIndex = index === tools.length - 1 ? 0 : index + 1
          break
        case 'Home':
          e.preventDefault()
          newIndex = 0
          break
        case 'End':
          e.preventDefault()
          newIndex = tools.length - 1
          break
        default:
          return
      }

      setFocusedToolIndex(newIndex)
      toolButtonRefs.current[newIndex]?.focus()
      const selectedTool = tools[newIndex]
      if (selectedTool) {
        setActiveTool(selectedTool.tool)
      }
    },
    [tools, setActiveTool]
  )

  const handleCreatePresentation = (name: string) => {
    const id = createPresentation(name)
    // Auto-select the first slide of the new presentation
    const newPresentation = usePresentationStore.getState().presentations.find((p) => p.id === id)
    if (newPresentation && newPresentation.slides.length > 0 && newPresentation.slides[0]) {
      setCurrentSlide(newPresentation.slides[0].id)
    }
    setIsCreateDialogOpen(false)
  }

  const handleSelectPresentation = (id: string) => {
    setCurrentPresentation(id)
    // Auto-select the first slide
    const presentation = presentations.find((p) => p.id === id)
    if (presentation && presentation.slides.length > 0 && presentation.slides[0]) {
      setCurrentSlide(presentation.slides[0].id)
    } else {
      setCurrentSlide(null)
    }
  }

  // Tool icons with Lucide
  const toolIcons = useMemo(() => ({
    select: <MousePointer2 className="h-5 w-5" />,
    text: <Type className="h-5 w-5" />,
    shape: <Square className="h-5 w-5" />,
    image: <Image className="h-5 w-5" />,
    pan: <Hand className="h-5 w-5" />,
  }) as Record<EditorTool, React.ReactNode>, [])

  // Shape type icons
  const shapeTypeIcons = useMemo(() => ({
    rectangle: <Square className="h-4 w-4" />,
    circle: <Circle className="h-4 w-4" />,
    triangle: <Triangle className="h-4 w-4" />,
    line: <Minus className="h-4 w-4" />,
  }) as Record<ShapeToolType, React.ReactNode>, [])

  // Shape type labels for dropdown
  const shapeTypeLabels: Record<ShapeToolType, string> = {
    rectangle: 'Rectangle',
    circle: 'Circle',
    triangle: 'Triangle',
    line: 'Line',
  }

  return (
    <>
      <div
        className={cn(
          'flex items-center h-12 px-4 bg-white border-b border-secondary-200 shadow-sm gap-2',
          className
        )}
        data-testid="toolbar"
        role="toolbar"
        aria-label="Editor toolbar"
        aria-orientation="horizontal"
      >
        {/* Left section - Presentation selector */}
        <div className="flex items-center gap-2 pr-4 border-r border-secondary-200" role="group" aria-label="Presentation controls">
          <Select
            value={currentPresentationId ?? ''}
            onValueChange={handleSelectPresentation}
          >
            <SelectTrigger
              className="w-[180px] h-8"
              data-testid="presentation-selector"
              aria-label="Select presentation"
            >
              <SelectValue placeholder="Select Presentation" />
            </SelectTrigger>
            <SelectContent>
              {presentations.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            onClick={() => { setIsCreateDialogOpen(true); }}
            data-testid="new-presentation-button"
            aria-label="Create new presentation"
          >
            <Plus className="h-4 w-4 mr-1" />
            New
          </Button>
        </div>

        {/* Center section - Tools (Radio Group pattern) */}
        <div
          className="flex items-center gap-1 flex-1 justify-center px-4"
          role="radiogroup"
          aria-label="Drawing tools"
        >
          {tools.map((toolDef, index) => {
            // Special rendering for shape tool with dropdown
            if (toolDef.tool === 'shape') {
              return (
                <div key={toolDef.tool} className="flex items-center">
                  <ToolButton
                    tool={toolDef.tool}
                    icon={shapeTypeIcons[activeShapeType]}
                    label={`${toolDef.label} - ${shapeTypeLabels[activeShapeType]}`}
                    shortcutKey={toolDef.shortcut}
                    isActive={activeTool === toolDef.tool}
                    onClick={() => {
                      setActiveTool(toolDef.tool)
                      setFocusedToolIndex(index)
                    }}
                    tabIndex={index === focusedToolIndex ? 0 : -1}
                    onKeyDown={(e) => { handleToolKeyDown(e, index); }}
                    buttonRef={(el) => {
                      toolButtonRefs.current[index] = el
                    }}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 w-5 px-0 hover:bg-secondary-100"
                        aria-label="Select shape type"
                        data-testid="shape-type-dropdown"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {(['rectangle', 'circle', 'triangle', 'line'] as ShapeToolType[]).map((shapeType) => (
                        <DropdownMenuItem
                          key={shapeType}
                          onClick={() => {
                            setActiveShapeType(shapeType)
                            setActiveTool('shape')
                          }}
                          className={cn(
                            'flex items-center gap-2',
                            activeShapeType === shapeType && 'bg-primary-50'
                          )}
                          data-testid={`shape-type-${shapeType}`}
                        >
                          {shapeTypeIcons[shapeType]}
                          <span>{shapeTypeLabels[shapeType]}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            }

            return (
              <ToolButton
                key={toolDef.tool}
                tool={toolDef.tool}
                icon={toolIcons[toolDef.tool]}
                label={toolDef.label}
                shortcutKey={toolDef.shortcut}
                isActive={activeTool === toolDef.tool}
                onClick={() => {
                  setActiveTool(toolDef.tool)
                  setFocusedToolIndex(index)
                }}
                tabIndex={index === focusedToolIndex ? 0 : -1}
                onKeyDown={(e) => { handleToolKeyDown(e, index); }}
                buttonRef={(el) => {
                  toolButtonRefs.current[index] = el
                }}
              />
            )
          })}
        </div>

        {/* Right section - View controls */}
        <div className="flex items-center gap-1 pl-4 border-l border-secondary-200" role="group" aria-label="View controls">
          {/* Grid toggle */}
          <Button
            type="button"
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleGrid}
            className={cn('h-9 w-9', showGrid && 'bg-primary-100 text-primary-700')}
            title="Toggle grid (G)"
            data-testid="toggle-grid"
            aria-label={showGrid ? 'Hide grid' : 'Show grid'}
            aria-pressed={showGrid}
            aria-keyshortcuts="G"
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>

          {/* Panel toggles */}
          <Button
            type="button"
            variant={isSidebarOpen ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleSidebar}
            className={cn('h-9 w-9', isSidebarOpen && 'bg-primary-100 text-primary-700')}
            title="Toggle slides panel"
            data-testid="toggle-sidebar"
            aria-label={isSidebarOpen ? 'Hide slides panel' : 'Show slides panel'}
            aria-pressed={isSidebarOpen}
            aria-expanded={isSidebarOpen}
            aria-controls="slide-panel"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant={isPropertiesPanelOpen ? 'secondary' : 'ghost'}
            size="icon"
            onClick={togglePropertiesPanel}
            className={cn('h-9 w-9', isPropertiesPanelOpen && 'bg-primary-100 text-primary-700')}
            title="Toggle properties panel"
            data-testid="toggle-properties"
            aria-label={isPropertiesPanelOpen ? 'Hide properties panel' : 'Show properties panel'}
            aria-pressed={isPropertiesPanelOpen}
            aria-expanded={isPropertiesPanelOpen}
            aria-controls="properties-panel"
          >
            <Settings2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 pl-4 border-l border-secondary-200" role="group" aria-label="Zoom controls">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            className="h-9 w-9"
            title="Zoom out (Ctrl+-)"
            data-testid="zoom-out"
            aria-label="Zoom out"
            aria-keyshortcuts="Control+Minus"
          >
            <ZoomOut className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={resetZoom}
            className="px-2 h-9 min-w-[3.5rem] text-sm font-medium"
            title="Reset zoom (Ctrl+0)"
            data-testid="zoom-level"
            aria-label={`Current zoom level ${Math.round(viewport.zoom * 100)}%. Click to reset to 100%`}
            aria-keyshortcuts="Control+0"
          >
            {Math.round(viewport.zoom * 100)}%
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            className="h-9 w-9"
            title="Zoom in (Ctrl++)"
            data-testid="zoom-in"
            aria-label="Zoom in"
            aria-keyshortcuts="Control+Plus"
          >
            <ZoomIn className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Create Presentation Dialog */}
      <CreatePresentationDialog
        isOpen={isCreateDialogOpen}
        onClose={() => { setIsCreateDialogOpen(false); }}
        onCreate={handleCreatePresentation}
      />
    </>
  )
}

export default Toolbar
