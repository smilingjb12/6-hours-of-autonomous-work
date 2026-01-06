/**
 * EditorShell Component
 * Main application shell with three-panel responsive layout:
 * - Left: Slide thumbnails panel (SlidePanel)
 * - Center: Main canvas (CanvasArea)
 * - Right: Properties panel (PropertiesPanel)
 * - Top: Navigation header and Toolbar
 *
 * WCAG 2.1 AA Compliant:
 * - Semantic HTML landmarks (header, main, aside, nav)
 * - Skip links for keyboard navigation
 * - ARIA live region for announcements
 * - Proper heading hierarchy
 */

import { useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { useEditorStore } from '@stores/editorStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useIsTablet, useIsTouchDevice } from '@/hooks/useMediaQuery'
import { NavigationHeader } from './NavigationHeader'
import { Toolbar } from './Toolbar'
import { SlidePanel } from './SlidePanel'
import { CanvasArea } from './CanvasArea'
import { PropertiesPanel } from './PropertiesPanel'
import { SpeakerNotesPanel } from './SpeakerNotesPanel'
import { PanelLeft, PanelRight } from 'lucide-react'
// Lazy load PresentationMode for better initial bundle size
const PresentationMode = lazy(() => import('./PresentationMode'))

/**
 * Props for EditorShell component
 */
interface EditorShellProps {
  /** Optional class name for custom styling */
  className?: string
}

/**
 * Custom hook for accessibility announcements
 */
function useA11yAnnouncements() {
  const announceRef = useRef<HTMLDivElement>(null)

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (announceRef.current) {
      announceRef.current.setAttribute('aria-live', priority)
      announceRef.current.textContent = message
      // Clear after announcement
      setTimeout(() => {
        if (announceRef.current) {
          announceRef.current.textContent = ''
        }
      }, 1000)
    }
  }, [])

  return { announceRef, announce }
}

/**
 * EditorShell is the main application container
 * Implements a responsive three-panel layout for the presentation editor
 * with full WCAG 2.1 AA accessibility support
 */
export function EditorShell({ className = '' }: EditorShellProps) {
  const isSidebarOpen = useEditorStore((state) => state.isSidebarOpen)
  const isPropertiesPanelOpen = useEditorStore((state) => state.isPropertiesPanelOpen)
  const isFullscreen = useEditorStore((state) => state.isFullscreen)
  const toggleFullscreen = useEditorStore((state) => state.toggleFullscreen)
  const toggleSidebar = useEditorStore((state) => state.toggleSidebar)
  const togglePropertiesPanel = useEditorStore((state) => state.togglePropertiesPanel)
  const currentSlideId = useEditorStore((state) => state.currentSlideId)
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds)

  // Responsive hooks
  const isTablet = useIsTablet()
  const isTouchDevice = useIsTouchDevice()

  const { announceRef, announce } = useA11yAnnouncements()
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Initialize global keyboard shortcuts for undo/redo
  useKeyboardShortcuts()

  // Announce slide changes to screen readers
  useEffect(() => {
    if (currentSlideId) {
      announce(`Slide selected`)
    }
  }, [currentSlideId, announce])

  // Announce element selection changes
  useEffect(() => {
    if (selectedElementIds.length > 0) {
      const message = selectedElementIds.length === 1
        ? '1 element selected'
        : `${selectedElementIds.length} elements selected`
      announce(message)
    }
  }, [selectedElementIds, announce])

  // Handle skip link click
  const handleSkipToMain = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    mainContentRef.current?.focus()
  }

  // Handle exit presentation mode
  const handleExitPresentationMode = useCallback(() => {
    toggleFullscreen()
  }, [toggleFullscreen])

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if inside an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // ? key opens keyboard shortcuts help
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        announce('Keyboard shortcuts: Press Tab to navigate, Enter to select, Escape to cancel')
      }

      // F5 or Ctrl+Enter starts presentation mode
      if (e.key === 'F5' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        if (!isFullscreen) {
          toggleFullscreen()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [announce, isFullscreen, toggleFullscreen])

  // Render presentation mode when active
  if (isFullscreen) {
    return (
      <Suspense fallback={<div className="h-screen w-screen bg-black flex items-center justify-center text-white">Loading presentation mode...</div>}>
        <PresentationMode onExit={handleExitPresentationMode} />
      </Suspense>
    )
  }

  // Compute canvas class names
  const canvasClassName = `transition-all duration-200 ease-smooth ${
    !isSidebarOpen && !isPropertiesPanelOpen ? 'flex-1' : ''
  }`

  return (
    <div
      className={`editor-shell h-screen flex flex-col bg-surface overflow-hidden ${className}`}
      data-testid="editor-shell"
      role="application"
      aria-label="PP-Like Presentation Editor"
    >
      {/* Skip Links for Keyboard Users */}
      <nav className="skip-links" aria-label="Skip links">
        <a
          href="#main-content"
          className="skip-link"
          onClick={handleSkipToMain}
        >
          Skip to main content
        </a>
        <a href="#slide-panel" className="skip-link">
          Skip to slides panel
        </a>
        <a href="#properties-panel" className="skip-link">
          Skip to properties panel
        </a>
      </nav>

      {/* ARIA Live Region for Screen Reader Announcements */}
      <div
        ref={announceRef}
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      />

      {/* Top Navigation Header */}
      <NavigationHeader />

      {/* Top Toolbar */}
      <Toolbar />

      {/* Main content area with three-panel layout */}
      <div
        id="main-content"
        ref={mainContentRef}
        className={`editor-content flex flex-1 overflow-hidden relative ${isTouchDevice ? 'touch-device' : ''}`}
        tabIndex={-1}
        role="region"
        aria-label="Editor workspace"
        data-tablet={isTablet}
      >
        {/* Left Panel - Slide Thumbnails */}
        <SlidePanel isTablet={isTablet} />

        {/* Tablet Toggle Button - Left Panel */}
        {isTablet && !isSidebarOpen && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="tablet-panel-toggle left"
            aria-label="Show slides panel"
            aria-expanded={isSidebarOpen}
            data-testid="tablet-toggle-slides"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {/* Center Panel - Canvas Area with Speaker Notes */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <CanvasArea className={`${canvasClassName} flex-1`} isTablet={isTablet} />
          <SpeakerNotesPanel />
        </div>

        {/* Tablet Toggle Button - Right Panel */}
        {isTablet && !isPropertiesPanelOpen && (
          <button
            type="button"
            onClick={togglePropertiesPanel}
            className="tablet-panel-toggle right"
            aria-label="Show properties panel"
            aria-expanded={isPropertiesPanelOpen}
            data-testid="tablet-toggle-properties"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        )}

        {/* Right Panel - Properties */}
        <PropertiesPanel isTablet={isTablet} />
      </div>
    </div>
  )
}

export default EditorShell
