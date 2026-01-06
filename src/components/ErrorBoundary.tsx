/**
 * ErrorBoundary Component
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Prevents the entire application from crashing due to runtime errors.
 *
 * WCAG 2.1 AA Compliant:
 * - Accessible error message
 * - Keyboard accessible retry button
 * - Focus management on error
 */

import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@components/ui/button'
import { cn } from '@lib/utils'

/**
 * Props for the ErrorBoundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode
  /** Custom fallback UI to render on error */
  fallback?: React.ReactNode
  /** Callback when an error occurs */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  /** Optional class name for the error container */
  className?: string
}

/**
 * State for the ErrorBoundary component
 */
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * ErrorBoundary - Catches and handles React component errors
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private errorContainerRef: React.RefObject<HTMLDivElement | null>

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
    this.errorContainerRef = React.createRef()
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error information and notify parent
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo })

    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Call parent error handler if provided
    this.props.onError?.(error, errorInfo)
  }

  /**
   * Focus the error container when error occurs
   */
  componentDidUpdate(
    _prevProps: ErrorBoundaryProps,
    prevState: ErrorBoundaryState
  ): void {
    if (!prevState.hasError && this.state.hasError) {
      // Focus the error container for accessibility
      this.errorContainerRef.current?.focus()
    }
  }

  /**
   * Reset error state and retry rendering children
   */
  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  /**
   * Reload the page
   */
  handleReload = (): void => {
    window.location.reload()
  }

  render(): React.ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, className } = this.props

    if (hasError) {
      // Render custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Render default error UI
      return (
        <div
          ref={this.errorContainerRef}
          className={cn(
            'flex flex-col items-center justify-center min-h-[400px] p-8',
            'bg-error-50 rounded-lg border border-error-200',
            className
          )}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          data-testid="error-boundary"
        >
          <div className="flex flex-col items-center text-center max-w-md">
            {/* Error Icon */}
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-error-100 mb-4">
              <AlertTriangle
                className="w-8 h-8 text-error-600"
                aria-hidden="true"
              />
            </div>

            {/* Error Title */}
            <h2 className="text-xl font-semibold text-error-800 mb-2">
              Something went wrong
            </h2>

            {/* Error Description */}
            <p className="text-error-600 mb-6">
              An unexpected error occurred. You can try again or reload the page.
            </p>

            {/* Error Details (development only) */}
            {import.meta.env.DEV && error && (
              <div className="w-full mb-6 p-4 bg-error-100 rounded-md text-left overflow-auto">
                <p className="text-sm font-mono text-error-700 break-all">
                  {error.message}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={this.handleRetry}
                className="gap-2"
                data-testid="error-retry-button"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Try Again
              </Button>
              <Button
                variant="destructive"
                onClick={this.handleReload}
                data-testid="error-reload-button"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook to programmatically trigger errors for testing
 * Only available in development mode
 */
export function useErrorBoundaryTest(): { triggerError: () => void } {
  const triggerError = React.useCallback(() => {
    if (import.meta.env.DEV) {
      throw new Error('Test error triggered by useErrorBoundaryTest hook')
    }
  }, [])

  return { triggerError }
}

export default ErrorBoundary
