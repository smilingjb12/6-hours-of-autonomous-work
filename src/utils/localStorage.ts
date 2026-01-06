/**
 * localStorage utility functions for presentation persistence.
 * Provides save, load, export, and import functionality with JSON serialization.
 */

import type { Presentation } from '../types/presentation'

// Storage keys
export const STORAGE_KEYS = {
  PRESENTATIONS: 'presentation-storage',
  STORAGE_VERSION: 'presentation-storage-version',
} as const

// Current storage version for migration support
export const CURRENT_STORAGE_VERSION = 1

/**
 * Storage data structure that matches Zustand persist format
 */
interface StorageData {
  state: {
    presentations: Presentation[]
    currentPresentationId: string | null
  }
  version?: number
}

/**
 * Result type for storage operations
 */
export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Check if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): { used: number; available: number; total: number } {
  if (!isLocalStorageAvailable()) {
    return { used: 0, available: 0, total: 0 }
  }

  let used = 0
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const value = localStorage.getItem(key)
      if (value) {
        used += key.length + value.length
      }
    }
  }

  // localStorage typically has a 5MB limit (5 * 1024 * 1024 bytes)
  // But we measure in characters (2 bytes each in UTF-16)
  const total = 5 * 1024 * 1024
  return {
    used,
    available: total - used,
    total,
  }
}

/**
 * Load presentations from localStorage
 */
export function loadFromLocalStorage(): StorageResult<{
  presentations: Presentation[]
  currentPresentationId: string | null
}> {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage is not available' }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESENTATIONS)
    if (!raw) {
      return {
        success: true,
        data: { presentations: [], currentPresentationId: null },
      }
    }

    const parsed: StorageData = JSON.parse(raw)

    // Validate the data structure
    if (!parsed.state || !Array.isArray(parsed.state.presentations)) {
      return { success: false, error: 'Invalid storage data format' }
    }

    return {
      success: true,
      data: {
        presentations: parsed.state.presentations,
        currentPresentationId: parsed.state.currentPresentationId ?? null,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse localStorage data: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Save presentations to localStorage manually
 * Note: Zustand persist handles automatic saving, this is for explicit saves
 */
export function saveToLocalStorage(
  presentations: Presentation[],
  currentPresentationId: string | null
): StorageResult<void> {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage is not available' }
  }

  try {
    const data: StorageData = {
      state: {
        presentations,
        currentPresentationId,
      },
      version: CURRENT_STORAGE_VERSION,
    }

    const serialized = JSON.stringify(data)

    // Check if data will exceed storage limit
    const storageInfo = getStorageInfo()
    if (serialized.length > storageInfo.available) {
      return {
        success: false,
        error: 'Storage quota exceeded. Please delete some presentations.',
      }
    }

    localStorage.setItem(STORAGE_KEYS.PRESENTATIONS, serialized)
    return { success: true }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return { success: false, error: 'Storage quota exceeded' }
    }
    return {
      success: false,
      error: `Failed to save to localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Clear all presentation data from localStorage
 */
export function clearLocalStorage(): StorageResult<void> {
  if (!isLocalStorageAvailable()) {
    return { success: false, error: 'localStorage is not available' }
  }

  try {
    localStorage.removeItem(STORAGE_KEYS.PRESENTATIONS)
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Failed to clear localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Export a single presentation to JSON string
 */
export function exportPresentationToJson(presentation: Presentation): string {
  return JSON.stringify(presentation, null, 2)
}

/**
 * Export all presentations to JSON string
 */
export function exportAllPresentationsToJson(presentations: Presentation[]): string {
  const exportData = {
    version: CURRENT_STORAGE_VERSION,
    exportedAt: new Date().toISOString(),
    presentations,
  }
  return JSON.stringify(exportData, null, 2)
}

/**
 * Import a presentation from JSON string
 */
export function importPresentationFromJson(jsonString: string): StorageResult<Presentation> {
  try {
    const parsed = JSON.parse(jsonString)

    // Check if it's a valid presentation object
    if (!isValidPresentation(parsed)) {
      return { success: false, error: 'Invalid presentation format' }
    }

    return { success: true, data: parsed as Presentation }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Import multiple presentations from JSON string (export format)
 */
export function importAllPresentationsFromJson(
  jsonString: string
): StorageResult<Presentation[]> {
  try {
    const parsed = JSON.parse(jsonString)

    // Check if it's an array of presentations directly
    if (Array.isArray(parsed)) {
      const validPresentations = parsed.filter(isValidPresentation)
      if (validPresentations.length === 0) {
        return { success: false, error: 'No valid presentations found in import' }
      }
      return { success: true, data: validPresentations as Presentation[] }
    }

    // Check if it's an export object with presentations array
    if (parsed.presentations && Array.isArray(parsed.presentations)) {
      const validPresentations = parsed.presentations.filter(isValidPresentation)
      if (validPresentations.length === 0) {
        return { success: false, error: 'No valid presentations found in import' }
      }
      return { success: true, data: validPresentations as Presentation[] }
    }

    // Check if it's a single presentation
    if (isValidPresentation(parsed)) {
      return { success: true, data: [parsed as Presentation] }
    }

    return { success: false, error: 'Invalid import format' }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Validate if an object is a valid Presentation
 */
function isValidPresentation(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false

  const p = obj as Record<string, unknown>

  // Check required fields using bracket notation for index signatures
  if (typeof p['id'] !== 'string' || (p['id']).length === 0) return false
  if (typeof p['name'] !== 'string') return false
  if (!Array.isArray(p['slides'])) return false

  // Validate each slide has required fields
  const slides = p['slides'] as unknown[]
  for (const slide of slides) {
    if (!slide || typeof slide !== 'object') return false
    const s = slide as Record<string, unknown>
    if (typeof s['id'] !== 'string') return false
    if (!Array.isArray(s['elements'])) return false
  }

  return true
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Trigger file input for importing
 */
export function triggerFileImport(onFileContent: (content: string) => void): void {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,application/json'
  input.onchange = (event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        onFileContent(content)
      }
      reader.readAsText(file)
    }
  }
  input.click()
}
