/**
 * useToast Hook
 * Provides convenient access to toast notification functionality.
 * Wraps the notification store with a cleaner API.
 */

import { useCallback } from 'react'
import { useNotificationStore, type NotificationOptions } from '@stores/notificationStore'

/**
 * Toast hook return type
 */
interface UseToastReturn {
  /** Show a success toast */
  success: (title: string, message?: string) => string
  /** Show an error toast */
  error: (title: string, message?: string) => string
  /** Show a warning toast */
  warning: (title: string, message?: string) => string
  /** Show an info toast */
  info: (title: string, message?: string) => string
  /** Show a custom toast with full options */
  toast: (options: NotificationOptions) => string
  /** Dismiss a specific toast by ID */
  dismiss: (id: string) => void
  /** Dismiss all toasts */
  dismissAll: () => void
}

/**
 * Hook for showing toast notifications
 *
 * @example
 * ```tsx
 * const { success, error } = useToast()
 *
 * // Show success message
 * success('Saved!', 'Your changes have been saved.')
 *
 * // Show error message
 * error('Error', 'Failed to save changes.')
 * ```
 */
export function useToast(): UseToastReturn {
  const addNotification = useNotificationStore((state) => state.addNotification)
  const removeNotification = useNotificationStore((state) => state.removeNotification)
  const clearAllNotifications = useNotificationStore((state) => state.clearAllNotifications)
  const successFn = useNotificationStore((state) => state.success)
  const errorFn = useNotificationStore((state) => state.error)
  const warningFn = useNotificationStore((state) => state.warning)
  const infoFn = useNotificationStore((state) => state.info)

  const success = useCallback(
    (title: string, message?: string) => successFn(title, message),
    [successFn]
  )

  const error = useCallback(
    (title: string, message?: string) => errorFn(title, message),
    [errorFn]
  )

  const warning = useCallback(
    (title: string, message?: string) => warningFn(title, message),
    [warningFn]
  )

  const info = useCallback(
    (title: string, message?: string) => infoFn(title, message),
    [infoFn]
  )

  const toast = useCallback(
    (options: NotificationOptions) => addNotification(options),
    [addNotification]
  )

  const dismiss = useCallback(
    (id: string) => { removeNotification(id); },
    [removeNotification]
  )

  const dismissAll = useCallback(
    () => { clearAllNotifications(); },
    [clearAllNotifications]
  )

  return {
    success,
    error,
    warning,
    info,
    toast,
    dismiss,
    dismissAll,
  }
}

export default useToast
