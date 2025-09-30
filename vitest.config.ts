import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const currentDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    dir: 'tests',
    coverage: {
      reporter: ['text', 'lcov']
    }
  },
  resolve: {
    alias: {
      '~': resolve(currentDir, '.'),
      '@': resolve(currentDir, '.')
    }
  }
})
