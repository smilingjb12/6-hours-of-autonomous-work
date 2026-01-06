/**
 * Central export file for all Zustand stores.
 * Import stores from this file for cleaner imports across the codebase.
 */

export { usePresentationStore, default as presentationStore } from './presentationStore'
export { useEditorStore, default as editorStore } from './editorStore'
export {
  useNotificationStore,
  default as notificationStore,
  type Notification,
  type NotificationType,
  type NotificationOptions,
} from './notificationStore'

// Re-export localStorage utilities for convenience
export {
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  exportPresentationToJson,
  exportAllPresentationsToJson,
  importPresentationFromJson,
  importAllPresentationsFromJson,
  downloadFile,
  triggerFileImport,
  isLocalStorageAvailable,
  getStorageInfo,
  STORAGE_KEYS,
  CURRENT_STORAGE_VERSION,
  type StorageResult,
} from '../utils/localStorage'
