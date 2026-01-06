/**
 * Jest Setup File
 *
 * This file runs after Jest is initialized but before tests are executed.
 * It's used to set up the testing environment and extend Jest with custom matchers.
 */

// Import jest-dom for extended DOM matchers
import '@testing-library/jest-dom'

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver for components that use it
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver for components that use it
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
}))

// Mock scrollTo for components that use window scrolling
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
})

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
})
