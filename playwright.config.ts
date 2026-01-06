import { defineConfig, devices } from '@playwright/test'

/**
 * Cross-Browser Testing Configuration
 *
 * Tests application across Chrome, Firefox, Safari, and Edge (latest 2 versions)
 * to ensure consistent functionality and identify browser-specific issues.
 *
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for cross-browser testing
   * Testing across Chrome, Firefox, Safari, and Edge (latest versions)
   * Each browser project uses device settings that emulate desktop environments
   */
  projects: [
    /* Chromium-based browsers */
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Chrome latest version
      },
    },
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },

    /* Firefox */
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
    },

    /* Safari (WebKit) */
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
      },
    },

    /* Microsoft Edge (Chromium-based) */
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },

    /* Mobile browsers for responsive testing */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  /* Global test timeout */
  timeout: 30 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },
})
