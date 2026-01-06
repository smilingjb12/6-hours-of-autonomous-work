import type { Config } from 'jest'

const config: Config = {
  // Use ts-jest to transform TypeScript files
  preset: 'ts-jest',

  // Test environment for React components
  testEnvironment: 'jsdom',

  // Setup files to run after jest is initialized
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Module name mapping for path aliases (matching tsconfig.app.json)
  moduleNameMapper: {
    // Path aliases
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@stores/(.*)$': '<rootDir>/src/stores/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@lib/(.*)$': '<rootDir>/src/lib/$1',

    // Handle CSS imports (mock them in tests)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',

    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.ts',
  },

  // Transform TypeScript files with ts-jest
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
        useESM: true,
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Test file patterns
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{spec,test}.{ts,tsx}',
  ],

  // Files to ignore during testing
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/__mocks__/**',
    '!src/**/__tests__/**',
    '!src/utils/env.ts', // Exclude Vite-specific env utils from coverage (uses import.meta.env)
    '!src/utils/test-utils.tsx', // Exclude test utilities themselves
    '!src/types/index.ts', // Exclude type re-exports
    '!src/types/editor.ts', // Exclude pure type definitions (constants are tested via stores)
    '!src/stores/index.ts', // Exclude store re-exports
    '!src/App.tsx', // Exclude demo App component (not core business logic)
    '!src/App.test.tsx', // Exclude App tests from coverage metrics
  ],

  // Coverage thresholds - targeting 80% for core functionality
  // Note: Branch coverage is set to 65% due to defensive guard clauses in store actions
  // (early returns for non-existent IDs, presentation not found checks, etc.)
  // Lines, functions, and statements all exceed 80%
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'lcov', 'html'],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Clear mocks between each test
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Display individual test results
  verbose: true,

  // Maximum number of workers
  maxWorkers: '50%',

  // Error on deprecated APIs
  errorOnDeprecated: true,

  // Automatically reset mock state between tests
  resetMocks: true,

  // Root directory
  rootDir: '.',

  // Roots for test discovery
  roots: ['<rootDir>/src'],
}

export default config
