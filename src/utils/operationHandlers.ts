/**
 * Operation Handlers Utility
 * Provides wrappers for async operations with error handling,
 * retry logic, and user feedback via toast notifications.
 */

import { useNotificationStore } from '@stores/notificationStore'
import type { StorageResult } from './localStorage'

/**
 * Configuration for operation execution
 */
interface OperationConfig {
  /** Maximum retry attempts (default: 0, no retry) */
  maxRetries?: number
  /** Delay between retries in ms (default: 1000) */
  retryDelay?: number
  /** Show success notification (default: true) */
  showSuccess?: boolean
  /** Show error notification (default: true) */
  showError?: boolean
  /** Custom success message */
  successMessage?: string
  /** Custom error message */
  errorMessage?: string
  /** Success notification title */
  successTitle?: string
  /** Error notification title */
  errorTitle?: string
}

/**
 * Result type for operation execution
 */
interface OperationResult<T> {
  success: boolean
  data?: T
  error?: Error
  retryCount: number
}

/**
 * Default configuration for operations
 */
const DEFAULT_CONFIG: Required<OperationConfig> = {
  maxRetries: 0,
  retryDelay: 1000,
  showSuccess: true,
  showError: true,
  successMessage: '',
  errorMessage: '',
  successTitle: 'Success',
  errorTitle: 'Error',
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Execute an async operation with error handling and notifications
 *
 * @param operation - The async function to execute
 * @param config - Configuration options
 * @returns Promise with operation result
 *
 * @example
 * ```ts
 * const result = await executeOperation(
 *   () => saveToLocalStorage(data),
 *   {
 *     successTitle: 'Saved!',
 *     errorTitle: 'Save Failed',
 *     maxRetries: 2,
 *   }
 * )
 * ```
 */
export async function executeOperation<T>(
  operation: () => Promise<T> | T,
  config: OperationConfig = {}
): Promise<OperationResult<T>> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const {
    maxRetries,
    retryDelay,
    showSuccess,
    showError,
    successMessage,
    errorMessage,
    successTitle,
    errorTitle,
  } = finalConfig

  let retryCount = 0
  let lastError: Error | undefined

  while (retryCount <= maxRetries) {
    try {
      const data = await operation()

      // Show success notification
      if (showSuccess) {
        useNotificationStore.getState().success(
          successTitle,
          successMessage || undefined
        )
      }

      return {
        success: true,
        data,
        retryCount,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If we have retries left, wait and try again
      if (retryCount < maxRetries) {
        retryCount++
        await sleep(retryDelay)
        continue
      }

      // No more retries, show error notification
      if (showError) {
        useNotificationStore.getState().error(
          errorTitle,
          errorMessage || lastError.message
        )
      }

      return {
        success: false,
        error: lastError,
        retryCount,
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  return {
    success: false,
    error: lastError ?? new Error('Unknown error'),
    retryCount,
  }
}

/**
 * Execute a synchronous operation with error handling and notifications
 *
 * @param operation - The sync function to execute
 * @param config - Configuration options
 * @returns Operation result
 */
export function executeSync<T>(
  operation: () => T,
  config: OperationConfig = {}
): OperationResult<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const {
    showSuccess,
    showError,
    successMessage,
    errorMessage,
    successTitle,
    errorTitle,
  } = finalConfig

  try {
    const data = operation()

    // Show success notification
    if (showSuccess) {
      useNotificationStore.getState().success(
        successTitle,
        successMessage || undefined
      )
    }

    return {
      success: true,
      data,
      retryCount: 0,
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))

    // Show error notification
    if (showError) {
      useNotificationStore.getState().error(
        errorTitle,
        errorMessage || err.message
      )
    }

    return {
      success: false,
      error: err,
      retryCount: 0,
    }
  }
}

/**
 * Handle a StorageResult and show appropriate notification
 *
 * @param result - The StorageResult from localStorage operations
 * @param config - Configuration options
 * @returns boolean indicating success
 */
export function handleStorageResult<T>(
  result: StorageResult<T>,
  config: OperationConfig = {}
): boolean {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const {
    showSuccess,
    showError,
    successMessage,
    errorMessage,
    successTitle,
    errorTitle,
  } = finalConfig

  if (result.success) {
    if (showSuccess) {
      useNotificationStore.getState().success(
        successTitle,
        successMessage || undefined
      )
    }
    return true
  } else {
    if (showError) {
      useNotificationStore.getState().error(
        errorTitle,
        errorMessage || result.error || 'An unknown error occurred'
      )
    }
    return false
  }
}

/**
 * Pre-configured handlers for common operations
 */
export const operationHandlers = {
  /**
   * Handle save operation
   */
  save: (result: StorageResult<void>): boolean => {
    return handleStorageResult(result, {
      successTitle: 'Saved',
      successMessage: 'Your changes have been saved.',
      errorTitle: 'Save Failed',
      errorMessage: 'Failed to save your changes. Please try again.',
    })
  },

  /**
   * Handle export operation
   */
  export: (result: StorageResult<void>): boolean => {
    return handleStorageResult(result, {
      successTitle: 'Exported',
      successMessage: 'Presentation exported successfully.',
      errorTitle: 'Export Failed',
      errorMessage: 'Failed to export presentation.',
    })
  },

  /**
   * Handle import operation
   */
  import: (result: StorageResult<unknown>): boolean => {
    return handleStorageResult(result, {
      successTitle: 'Imported',
      successMessage: 'Presentation imported successfully.',
      errorTitle: 'Import Failed',
      errorMessage: 'Failed to import presentation. Please check the file format.',
    })
  },

  /**
   * Handle delete operation
   */
  delete: (success: boolean, errorMessage?: string): boolean => {
    if (success) {
      useNotificationStore.getState().success(
        'Deleted',
        'Item deleted successfully.'
      )
    } else {
      useNotificationStore.getState().error(
        'Delete Failed',
        errorMessage || 'Failed to delete item.'
      )
    }
    return success
  },

  /**
   * Handle copy operation
   */
  copy: (itemsCopied: number): void => {
    useNotificationStore.getState().info(
      'Copied',
      `${itemsCopied} item${itemsCopied !== 1 ? 's' : ''} copied to clipboard.`
    )
  },

  /**
   * Handle paste operation
   */
  paste: (itemsPasted: number): void => {
    useNotificationStore.getState().success(
      'Pasted',
      `${itemsPasted} item${itemsPasted !== 1 ? 's' : ''} pasted.`
    )
  },

  /**
   * Handle undo operation
   */
  undo: (): void => {
    useNotificationStore.getState().info('Undo', 'Action undone.')
  },

  /**
   * Handle redo operation
   */
  redo: (): void => {
    useNotificationStore.getState().info('Redo', 'Action redone.')
  },

  /**
   * Show a generic info message
   */
  info: (title: string, message?: string): void => {
    useNotificationStore.getState().info(title, message)
  },

  /**
   * Show a warning message
   */
  warning: (title: string, message?: string): void => {
    useNotificationStore.getState().warning(title, message)
  },

  /**
   * Show an error message
   */
  error: (title: string, message?: string): void => {
    useNotificationStore.getState().error(title, message)
  },

  /**
   * Show a success message
   */
  success: (title: string, message?: string): void => {
    useNotificationStore.getState().success(title, message)
  },
}

export default operationHandlers
