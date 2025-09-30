import { defineConfig } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
  },
  reporter: [['list']]
})
