/**
 * Toast Component
 * Individual toast notification item with animation and accessibility support.
 *
 * WCAG 2.1 AA Compliant:
 * - role="alert" for important notifications
 * - aria-live for dynamic content
 * - Keyboard accessible dismiss button
 * - Sufficient color contrast
 */

import * as React from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { cn } from '@lib/utils'
import type { Notification, NotificationType } from '@stores/notificationStore'

/**
 * Icon mapping for notification types
 */
const icons: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

/**
 * Styles for different notification types - Light theme
 */
const typeStyles: Record<NotificationType, string> = {
  success: 'bg-success-50 border-success-200 text-success-800',
  error: 'bg-error-50 border-error-200 text-error-800',
  warning: 'bg-warning-50 border-warning-200 text-warning-800',
  info: 'bg-secondary-50 border-secondary-200 text-secondary-800',
}

/**
 * Icon color styles for different notification types
 */
const iconStyles: Record<NotificationType, string> = {
  success: 'text-success-600',
  error: 'text-error-600',
  warning: 'text-warning-600',
  info: 'text-primary-600',
}

/**
 * Props for the Toast component
 */
interface ToastProps {
  notification: Notification
  onDismiss: (id: string) => void
}

/**
 * Toast component - Individual notification item
 */
export function Toast({ notification, onDismiss }: ToastProps) {
  const { id, type, title, message, dismissible, action } = notification
  const Icon = icons[type]

  const handleDismiss = React.useCallback(() => {
    onDismiss(id)
  }, [id, onDismiss])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        handleDismiss()
      }
    },
    [dismissible, handleDismiss]
  )

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-[1rem] border',
        'shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_1px_rgba(0,0,0,0.1)]',
        'animate-[slideIn_0.3s_ease-out]',
        'transition-all duration-300 ease-in-out',
        typeStyles[type]
      )}
      onKeyDown={handleKeyDown}
      data-testid={`toast-${type}`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <Icon className={cn('h-5 w-5', iconStyles[type])} aria-hidden="true" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" data-testid="toast-title">
              {title}
            </p>
            {message && (
              <p className="mt-1 text-sm opacity-80" data-testid="toast-message">
                {message}
              </p>
            )}
            {action && (
              <div className="mt-3">
                <button
                  type="button"
                  className={cn(
                    'text-sm font-medium underline-offset-2 hover:underline',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent rounded',
                    type === 'success' && 'text-success-700 focus:ring-success-500',
                    type === 'error' && 'text-error-700 focus:ring-error-500',
                    type === 'warning' && 'text-warning-700 focus:ring-warning-500',
                    type === 'info' && 'text-primary-700 focus:ring-primary-500'
                  )}
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && (
            <div className="flex-shrink-0">
              <button
                type="button"
                className={cn(
                  'inline-flex rounded-[0.5rem] p-1.5',
                  'transition-colors duration-150',
                  'hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-offset-0',
                  type === 'success' && 'text-success-600 focus:ring-success-500',
                  type === 'error' && 'text-error-600 focus:ring-error-500',
                  type === 'warning' && 'text-warning-600 focus:ring-warning-500',
                  type === 'info' && 'text-secondary-600 focus:ring-primary-500'
                )}
                onClick={handleDismiss}
                aria-label="Dismiss notification"
                data-testid="toast-dismiss"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Toast
