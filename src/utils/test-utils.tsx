/**
 * Test Utilities
 *
 * This file provides custom render functions and utilities for testing React components.
 * It wraps the React Testing Library with common providers and configurations.
 */

import { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/**
 * Props for the AllProviders wrapper component
 */
interface AllProvidersProps {
  children: ReactNode
}

/**
 * AllProviders wraps components with all necessary providers for testing.
 * Add any providers your app needs here (e.g., ThemeProvider, StoreProvider, etc.)
 */
function AllProviders({ children }: AllProvidersProps) {
  return <>{children}</>
}

/**
 * Custom render options that extend the default RenderOptions
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Initial route for router testing (if applicable) */
  route?: string
}

/**
 * Custom render function that wraps the component with all necessary providers.
 *
 * @param ui - The React element to render
 * @param options - Custom render options
 * @returns The render result with additional utilities
 */
function customRender(ui: ReactElement, options?: CustomRenderOptions) {
  const { route = '/', ...renderOptions } = options ?? {}

  // Set the initial route if needed (for router testing)
  window.history.pushState({}, 'Test page', route)

  return {
    user: userEvent.setup(),
    ...render(ui, {
      wrapper: AllProviders,
      ...renderOptions,
    }),
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override the default render with our custom render
export { customRender as render }

// Export userEvent for convenience
export { userEvent }

/**
 * Utility function to wait for a specified amount of time
 *
 * @param ms - Time to wait in milliseconds
 * @returns Promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Utility function to create a mock function with typed return value
 * Note: This is a placeholder - implement with your testing framework's mock function
 *
 * @returns A mock function (use with vitest's vi.fn() or jest.fn())
 */
export function createMockFn<T extends (...args: unknown[]) => unknown>(): (
  ...args: Parameters<T>
) => ReturnType<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fn = (() => undefined) as any
  fn.mock = { calls: [], results: [] }
  return fn
}

/**
 * Utility to suppress console errors during tests
 * Useful for testing error boundaries or components that intentionally log errors
 *
 * @param fn - The test function to run with suppressed console errors
 */
export async function suppressConsoleErrors(fn: () => Promise<void> | void) {
  const originalError = console.error
   
  console.error = () => {}
  try {
    await fn()
  } finally {
    console.error = originalError
  }
}
