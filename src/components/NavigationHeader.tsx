/**
 * NavigationHeader Component
 * Top navigation bar with menu items for File, Edit, View, and Help.
 * Includes presentation title display and basic controls for save, undo, and redo.
 *
 * WCAG 2.1 AA Compliant:
 * - Full keyboard navigation with arrow keys
 * - ARIA menu pattern implementation
 * - Focus management for menu items
 * - Screen reader announcements
 */

import { useState } from 'react'
import { usePresentationStore } from '@stores/presentationStore'
import { useEditorStore } from '@stores/editorStore'
import { useHistoryStore } from '@stores/historyStore'
import { useToast } from '@hooks/useToast'
import { operationHandlers } from '@utils/operationHandlers'
import { Button } from '@components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@components/ui/dropdown-menu'
import { ExportPdfDialog } from '@components/ExportPdfDialog'
import { ExportImageDialog } from '@components/ExportImageDialog'
import { Save, Undo2, Redo2, Play } from 'lucide-react'
import { cn } from '@lib/utils'

/**
 * Props for NavigationHeader component
 */
interface NavigationHeaderProps {
  /** Optional class name for custom styling */
  className?: string
}

/**
 * Menu item definition
 */
interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  divider?: boolean
}

/**
 * Menu definition
 */
interface Menu {
  label: string
  items: MenuItem[]
}

/**
 * NavigationHeader provides the main application menu bar
 * with File, Edit, View, and Help menus, plus action buttons
 * Implements full WCAG 2.1 AA keyboard navigation
 */
export function NavigationHeader({ className = '' }: NavigationHeaderProps) {
  // Local state for PDF export dialog
  const [isPdfDialogOpen, setIsPdfDialogOpen] = useState(false)
  // Local state for Image export dialog
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false)

  // Get presentation data
  const presentations = usePresentationStore((state) => state.presentations)
  const currentPresentationId = usePresentationStore((state) => state.currentPresentationId)
  const createPresentation = usePresentationStore((state) => state.createPresentation)
  const saveToStorage = usePresentationStore((state) => state.saveToStorage)
  const exportCurrentPresentation = usePresentationStore((state) => state.exportCurrentPresentation)
  const importPresentations = usePresentationStore((state) => state.importPresentations)

  // Get editor state
  const canUndo = useEditorStore((state) => state.canUndo)
  const canRedo = useEditorStore((state) => state.canRedo)
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)
  const toggleGrid = useEditorStore((state) => state.toggleGrid)
  const toggleFullscreen = useEditorStore((state) => state.toggleFullscreen)
  const zoomIn = useEditorStore((state) => state.zoomIn)
  const zoomOut = useEditorStore((state) => state.zoomOut)
  const resetZoom = useEditorStore((state) => state.resetZoom)
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen)
  const isPropertiesPanelOpen = useEditorStore((state) => state.isPropertiesPanelOpen)
  const showGrid = useEditorStore((state) => state.showGrid)
  const setCurrentSlide = useEditorStore((state) => state.setCurrentSlide)
  const currentSlideId = useEditorStore((state) => state.currentSlideId)

  // Get history store
  const historyUndo = useHistoryStore((state) => state.undo)
  const historyRedo = useHistoryStore((state) => state.redo)
  const historyCanUndo = useHistoryStore((state) => state.canUndo)
  const historyCanRedo = useHistoryStore((state) => state.canRedo)

  // Get toast notifications
  const { success, info } = useToast()

  // Get current presentation
  const currentPresentation = presentations.find((p) => p.id === currentPresentationId)

  // Handle creating new presentation
  const handleNewPresentation = () => {
    const id = createPresentation('Untitled Presentation')
    const newPresentation = usePresentationStore.getState().presentations.find((p) => p.id === id)
    if (newPresentation && newPresentation.slides.length > 0 && newPresentation.slides[0]) {
      setCurrentSlide(newPresentation.slides[0].id)
    }
    success('Created', 'New presentation created.')
  }

  // Handle save
  const handleSave = () => {
    const result = saveToStorage()
    operationHandlers.save(result)
  }

  // Handle export (JSON)
  const handleExport = () => {
    exportCurrentPresentation()
    success('Exported', 'Presentation exported successfully.')
  }

  // Handle export to PDF
  const handleExportPdf = () => {
    setIsPdfDialogOpen(true)
  }

  // Handle PDF export completion
  const handlePdfExportComplete = (exportSuccess: boolean, error?: string) => {
    if (exportSuccess) {
      success('PDF Exported', 'Presentation exported to PDF successfully.')
    } else {
      // Error is handled by the dialog
      console.error('PDF export failed:', error)
    }
  }

  // Handle export to Images
  const handleExportImages = () => {
    setIsImageDialogOpen(true)
  }

  // Handle Image export completion
  const handleImageExportComplete = (exportSuccess: boolean, exportedCount?: number, error?: string) => {
    if (exportSuccess) {
      const slideText = exportedCount === 1 ? 'slide' : 'slides'
      success('Images Exported', `Successfully exported ${exportedCount} ${slideText} as images.`)
    } else {
      // Error is handled by the dialog
      console.error('Image export failed:', error)
    }
  }

  // Handle import
  const handleImport = () => {
    importPresentations((result) => {
      operationHandlers.import(result)
    })
  }

  // Handle start presentation
  const handleStartPresentation = () => {
    toggleFullscreen()
  }

  // Undo/redo handlers connected to history store
  const handleUndo = () => {
    if (historyCanUndo()) {
      historyUndo()
    }
  }

  const handleRedo = () => {
    if (historyCanRedo()) {
      historyRedo()
    }
  }

  // Menu definitions
  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'New Presentation', shortcut: 'Ctrl+N', action: handleNewPresentation },
        { label: 'divider', divider: true },
        { label: 'Save', shortcut: 'Ctrl+S', action: handleSave, disabled: !currentPresentationId },
        { label: 'Export', shortcut: 'Ctrl+E', action: handleExport, disabled: !currentPresentationId },
        { label: 'Export to PDF', shortcut: 'Ctrl+P', action: handleExportPdf, disabled: !currentPresentationId },
        { label: 'Export as Image', action: handleExportImages, disabled: !currentPresentationId },
        { label: 'Import', action: handleImport },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: handleUndo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl+Y', action: handleRedo, disabled: !canRedo },
        { label: 'divider', divider: true },
        { label: 'Cut', shortcut: 'Ctrl+X', disabled: true },
        { label: 'Copy', shortcut: 'Ctrl+C', disabled: true },
        { label: 'Paste', shortcut: 'Ctrl+V', disabled: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Start Presentation', shortcut: 'F5', action: handleStartPresentation, disabled: !currentPresentationId },
        { label: 'divider', divider: true },
        {
          label: isSidebarOpen ? 'Hide Slides Panel' : 'Show Slides Panel',
          action: () => { toggleSidebar(); },
        },
        {
          label: isPropertiesPanelOpen ? 'Hide Properties Panel' : 'Show Properties Panel',
          action: () => { togglePropertiesPanel(); },
        },
        { label: showGrid ? 'Hide Grid' : 'Show Grid', action: () => { toggleGrid(); } },
        { label: 'divider', divider: true },
        { label: 'Zoom In', shortcut: 'Ctrl++', action: () => { zoomIn(); } },
        { label: 'Zoom Out', shortcut: 'Ctrl+-', action: () => { zoomOut(); } },
        { label: 'Reset Zoom', shortcut: 'Ctrl+0', action: () => { resetZoom(); } },
      ],
    },
    {
      label: 'Help',
      items: [
        {
          label: 'About PP-Like',
          action: () => {
            info('PP-Like Presentation Editor', 'Version 1.0.0')
          },
        },
        {
          label: 'Keyboard Shortcuts',
          action: () => {
            info('Keyboard Shortcuts', 'Ctrl+S: Save | Ctrl+Z: Undo | Ctrl+Y: Redo | Ctrl+C: Copy | Ctrl+V: Paste | Delete: Remove')
          },
        },
      ],
    },
  ]

  return (
    <header
      className={cn(
        'flex items-center h-10 px-3 bg-secondary-800 border-b border-secondary-700 gap-2',
        className
      )}
      data-testid="navigation-header"
      role="banner"
    >
      {/* Logo / App Name */}
      <div className="flex items-center pr-4 border-r border-secondary-600">
        <h1 className="text-sm font-semibold text-white" data-testid="app-title">
          PP-Like
        </h1>
      </div>

      {/* Menu Bar - Using shadcn DropdownMenu */}
      <nav className="flex items-center gap-1" aria-label="Main menu" role="menubar">
        {menus.map((menu) => (
          <DropdownMenu key={menu.label}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-secondary-200 hover:text-white hover:bg-secondary-700 data-[state=open]:bg-secondary-600 data-[state=open]:text-white"
                data-testid={`menu-${menu.label.toLowerCase()}`}
              >
                {menu.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[14rem]">
              {menu.items.map((item, index) => {
                if (item.divider) {
                  return <DropdownMenuSeparator key={`divider-${index}`} />
                }

                return (
                  <DropdownMenuItem
                    key={item.label}
                    onClick={item.action}
                    disabled={item.disabled ?? false}
                    data-testid={`menu-item-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                    {item.shortcut && <DropdownMenuShortcut>{item.shortcut}</DropdownMenuShortcut>}
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}
      </nav>

      {/* Presentation Title */}
      <div className="flex-1 flex justify-center px-4">
        <span
          className="text-sm text-secondary-300 max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap"
          data-testid="presentation-title"
          role="status"
          aria-live="polite"
        >
          {currentPresentation?.name ?? 'No presentation selected'}
        </span>
      </div>

      {/* Action Buttons - Toolbar pattern */}
      <div
        className="flex items-center gap-1 pl-2 border-l border-secondary-600"
        role="toolbar"
        aria-label="Quick actions"
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-secondary-300 hover:text-white hover:bg-secondary-700 disabled:text-secondary-500"
          onClick={handleStartPresentation}
          disabled={!currentPresentationId}
          title="Start Presentation (F5)"
          data-testid="present-button"
          aria-label="Start presentation"
          aria-keyshortcuts="F5"
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-secondary-300 hover:text-white hover:bg-secondary-700 disabled:text-secondary-500"
          onClick={handleSave}
          disabled={!currentPresentationId}
          title="Save (Ctrl+S)"
          data-testid="save-button"
          aria-label="Save presentation"
          aria-keyshortcuts="Control+S"
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-secondary-300 hover:text-white hover:bg-secondary-700 disabled:text-secondary-500"
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          data-testid="undo-button"
          aria-label="Undo last action"
          aria-keyshortcuts="Control+Z"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-secondary-300 hover:text-white hover:bg-secondary-700 disabled:text-secondary-500"
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          data-testid="redo-button"
          aria-label="Redo last action"
          aria-keyshortcuts="Control+Y"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>

      {/* PDF Export Dialog */}
      <ExportPdfDialog
        isOpen={isPdfDialogOpen}
        onClose={() => { setIsPdfDialogOpen(false); }}
        presentation={currentPresentation ?? null}
        onExportComplete={handlePdfExportComplete}
      />

      {/* Image Export Dialog */}
      <ExportImageDialog
        isOpen={isImageDialogOpen}
        onClose={() => { setIsImageDialogOpen(false); }}
        presentation={currentPresentation ?? null}
        currentSlideId={currentSlideId}
        onExportComplete={handleImageExportComplete}
      />
    </header>
  )
}

export default NavigationHeader
