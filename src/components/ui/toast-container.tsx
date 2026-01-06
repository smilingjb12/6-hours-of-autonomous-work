/**
 * ToastContainer Component
 * Container that renders all active toast notifications.
 * Positioned fixed at the top-right of the viewport.
 *
 * WCAG 2.1 AA Compliant:
 * - Uses aria-live region for announcements
 * - Notifications are focusable and dismissible via keyboard
 */

import { createPortal } from 'react-dom'
import { useNotificationStore } from '@stores/notificationStore'
import { Toast } from './toast'
import { cn } from '@lib/utils'

/**
 * Props for the ToastContainer component
 */
interface ToastContainerProps {
  /** Optional class name for custom positioning */
  className?: string
  /** Position of the toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center'
}

/**
 * Position styles mapping
 */
const positionStyles: Record<string, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
}

/**
 * ToastContainer - Renders all active notifications
 */
export function ToastContainer({
  className = '',
  position = 'top-right',
}: ToastContainerProps) {
  const notifications = useNotificationStore((state) => state.notifications)
  const removeNotification = useNotificationStore((state) => state.removeNotification)

  // Don't render anything if there are no notifications
  if (notifications.length === 0) {
    return null
  }

  const content = (
    <div
      className={cn(
        'fixed z-[600] flex flex-col gap-3 pointer-events-none',
        'w-full max-w-sm px-4 sm:px-0',
        positionStyles[position],
        className
      )}
      aria-live="polite"
      aria-label="Notifications"
      role="region"
      data-testid="toast-container"
    >
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
    </div>
  )

  // Use portal to render outside the main React tree
  // This ensures toasts appear above all other content
  return createPortal(content, document.body)
}

export default ToastContainer
