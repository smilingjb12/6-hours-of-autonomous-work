/**
 * Environment utilities for accessing Vite environment variables
 * with type safety and runtime validation
 */

/**
 * Get the application name
 */
export const getAppName = (): string => {
  return import.meta.env.VITE_APP_NAME || 'PP-Like'
}

/**
 * Get the application version
 */
export const getAppVersion = (): string => {
  return import.meta.env.VITE_APP_VERSION || __APP_VERSION__
}

/**
 * Get the API base URL
 */
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

/**
 * Check if debug mode is enabled
 */
export const isDebugEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_DEBUG === 'true'
}

/**
 * Check if analytics is enabled
 */
export const isAnalyticsEnabled = (): boolean => {
  return import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
}

/**
 * Check if running in development mode
 */
export const isDevMode = (): boolean => {
  return import.meta.env.VITE_DEV_MODE === 'true' || __DEV_MODE__
}

/**
 * Check if running in production mode
 */
export const isProdMode = (): boolean => {
  return import.meta.env.MODE === 'production'
}

/**
 * Get the public path for assets
 */
export const getPublicPath = (): string => {
  return import.meta.env.VITE_PUBLIC_PATH || '/'
}

/**
 * Environment configuration object
 */
export const env = {
  appName: getAppName(),
  appVersion: getAppVersion(),
  apiBaseUrl: getApiBaseUrl(),
  debugEnabled: isDebugEnabled(),
  analyticsEnabled: isAnalyticsEnabled(),
  isDevMode: isDevMode(),
  isProdMode: isProdMode(),
  publicPath: getPublicPath(),
} as const

export default env
