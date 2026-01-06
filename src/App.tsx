/**
 * Main application component for the PowerPoint-like app.
 * This is the root component that hosts the presentation editor.
 *
 * Includes:
 * - ErrorBoundary for catching and handling React errors
 * - ToastContainer for displaying user notifications
 */

import { EditorShell } from './components/EditorShell'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastContainer } from './components/ui/toast-container'

/**
 * App component - Root of the application
 * Renders the EditorShell with three-panel layout
 * Wrapped in ErrorBoundary for error handling
 * Includes ToastContainer for notifications
 */
function App() {
  return (
    <ErrorBoundary>
      <EditorShell />
      <ToastContainer position="top-right" />
    </ErrorBoundary>
  )
}

export default App
