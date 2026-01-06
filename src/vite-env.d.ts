/// <reference types="vite/client" />

/**
 * Type definitions for Vite environment variables
 * All VITE_ prefixed environment variables are exposed here
 */
interface ImportMetaEnv {
  // Application Configuration
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string

  // API Configuration
  readonly VITE_API_BASE_URL: string

  // Feature Flags
  readonly VITE_ENABLE_DEBUG: string
  readonly VITE_ENABLE_ANALYTICS: string

  // Build Configuration
  readonly VITE_PUBLIC_PATH: string

  // Development-specific settings
  readonly VITE_DEV_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Global constants defined in vite.config.ts
 */
declare const __APP_VERSION__: string
declare const __DEV_MODE__: boolean
