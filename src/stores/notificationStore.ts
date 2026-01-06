/**
 * Zustand store for managing toast notifications.
 * Provides a centralized notification system for user feedback.
 *
 * Features:
 * - Multiple notification types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss capability
 * - Queue management for multiple notifications
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * Notification type enum
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info'

/**
 * Individual notification interface
 */
export interface Notification {
  id: string
  type: NotificationType
  title: string
  message?: string
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Options for creating a notification
 */
export interface NotificationOptions {
  title: string
  message?: string
  type?: NotificationType
  duration?: number
  dismissible?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Default durations for different notification types (in ms)
 */
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
}

/**
 * Maximum number of notifications to display at once
 */
const MAX_NOTIFICATIONS = 5

/**
 * Generate a unique ID for notifications
 */
function generateNotificationId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Notification store state interface
 */
interface NotificationState {
  notifications: Notification[]

  // Actions
  addNotification: (options: NotificationOptions) => string
  removeNotification: (id: string) => void
  clearAllNotifications: () => void

  // Convenience methods for different notification types
  success: (title: string, message?: string, options?: Partial<NotificationOptions>) => string
  error: (title: string, message?: string, options?: Partial<NotificationOptions>) => string
  warning: (title: string, message?: string, options?: Partial<NotificationOptions>) => string
  info: (title: string, message?: string, options?: Partial<NotificationOptions>) => string
}

/**
 * Notification store for managing toast notifications
 */
export const useNotificationStore = create<NotificationState>()(
  devtools(
    (set, get) => ({
      notifications: [],

      /**
       * Add a new notification to the queue
       */
      addNotification: (options: NotificationOptions): string => {
        const id = generateNotificationId()
        const type = options.type ?? 'info'
        const duration = options.duration ?? DEFAULT_DURATIONS[type]
        const dismissible = options.dismissible ?? true

        const notification: Notification = {
          id,
          type,
          title: options.title,
          duration,
          dismissible,
        }

        // Only add optional properties if they are defined
        if (options.message !== undefined) {
          notification.message = options.message
        }
        if (options.action !== undefined) {
          notification.action = options.action
        }

        set((state) => {
          // Remove oldest notification if at max capacity
          const notifications =
            state.notifications.length >= MAX_NOTIFICATIONS
              ? state.notifications.slice(1)
              : state.notifications

          return {
            notifications: [...notifications, notification],
          }
        })

        // Auto-dismiss after duration (if duration > 0)
        if (duration > 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, duration)
        }

        return id
      },

      /**
       * Remove a notification by ID
       */
      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      /**
       * Clear all notifications
       */
      clearAllNotifications: () => {
        set({ notifications: [] })
      },

      /**
       * Show a success notification
       */
      success: (
        title: string,
        message?: string,
        options?: Partial<NotificationOptions>
      ): string => {
        const notificationOptions: NotificationOptions = {
          ...options,
          title,
          type: 'success',
        }
        if (message !== undefined) {
          notificationOptions.message = message
        }
        return get().addNotification(notificationOptions)
      },

      /**
       * Show an error notification
       */
      error: (
        title: string,
        message?: string,
        options?: Partial<NotificationOptions>
      ): string => {
        const notificationOptions: NotificationOptions = {
          ...options,
          title,
          type: 'error',
        }
        if (message !== undefined) {
          notificationOptions.message = message
        }
        return get().addNotification(notificationOptions)
      },

      /**
       * Show a warning notification
       */
      warning: (
        title: string,
        message?: string,
        options?: Partial<NotificationOptions>
      ): string => {
        const notificationOptions: NotificationOptions = {
          ...options,
          title,
          type: 'warning',
        }
        if (message !== undefined) {
          notificationOptions.message = message
        }
        return get().addNotification(notificationOptions)
      },

      /**
       * Show an info notification
       */
      info: (
        title: string,
        message?: string,
        options?: Partial<NotificationOptions>
      ): string => {
        const notificationOptions: NotificationOptions = {
          ...options,
          title,
          type: 'info',
        }
        if (message !== undefined) {
          notificationOptions.message = message
        }
        return get().addNotification(notificationOptions)
      },
    }),
    { name: 'notification-store' }
  )
)

export default useNotificationStore
