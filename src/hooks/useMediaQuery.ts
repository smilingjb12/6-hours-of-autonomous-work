/**
 * useMediaQuery Hook
 * Custom hook for responsive design media query detection.
 * Provides reactive viewport detection for tablet and mobile layouts.
 *
 * @module hooks/useMediaQuery
 */

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'

/**
 * Breakpoint definitions matching Tailwind CSS defaults and CSS variables
 */
export const BREAKPOINTS = {
  /** Mobile breakpoint - below 768px */
  mobile: 767,
  /** Tablet breakpoint - 768px to 1023px */
  tablet: 1023,
  /** Desktop breakpoint - 1024px and above */
  desktop: 1024,
} as const

/**
 * Viewport type based on screen width
 */
export type ViewportType = 'mobile' | 'tablet' | 'desktop'

/**
 * Hook to detect if a media query matches
 * Uses useSyncExternalStore for safe subscription to browser APIs
 *
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 *
 * @example
 * const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined') return () => {}

      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', callback)
      return () => {
        mediaQuery.removeEventListener('change', callback)
      }
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Hook to detect the current viewport type (mobile, tablet, desktop)
 *
 * @returns object containing viewport type and boolean flags
 *
 * @example
 * const { viewportType, isMobile, isTablet, isDesktop } = useViewportType()
 */
export function useViewportType(): {
  viewportType: ViewportType
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
} {
  const isMobile = useMediaQuery(`(max-width: ${String(BREAKPOINTS.mobile)}px)`)
  const isTablet = useMediaQuery(
    `(min-width: ${String(BREAKPOINTS.mobile + 1)}px) and (max-width: ${String(BREAKPOINTS.tablet)}px)`
  )
  const isDesktop = useMediaQuery(`(min-width: ${String(BREAKPOINTS.desktop)}px)`)

  const getViewportType = useCallback((): ViewportType => {
    if (isMobile) return 'mobile'
    if (isTablet) return 'tablet'
    return 'desktop'
  }, [isMobile, isTablet])

  return {
    viewportType: getViewportType(),
    isMobile,
    isTablet,
    isDesktop,
  }
}

/**
 * Hook specifically for tablet detection
 * Returns true when viewport is between 768px and 1023px
 *
 * @returns boolean indicating if current viewport is tablet-sized
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${String(BREAKPOINTS.mobile + 1)}px) and (max-width: ${String(BREAKPOINTS.tablet)}px)`
  )
}

/**
 * Hook specifically for mobile detection
 * Returns true when viewport is below 768px
 *
 * @returns boolean indicating if current viewport is mobile-sized
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${String(BREAKPOINTS.mobile)}px)`)
}

/**
 * Hook specifically for desktop detection
 * Returns true when viewport is 1024px or above
 *
 * @returns boolean indicating if current viewport is desktop-sized
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${String(BREAKPOINTS.desktop)}px)`)
}

/**
 * Hook for touch device detection
 * Checks for touch capability using media query and touch event support
 *
 * @returns boolean indicating if device supports touch
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const touchMediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)')
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    return touchMediaQuery.matches || hasTouch
  })

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    // Check using media query
    const touchMediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)')

    // Also check for touch event support
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

    const handleChange = (event: MediaQueryListEvent) => {
      setIsTouch(event.matches || hasTouch)
    }

    touchMediaQuery.addEventListener('change', handleChange)
    return () => {
      touchMediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  return isTouch
}

export default useMediaQuery
