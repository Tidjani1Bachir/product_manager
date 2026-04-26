import { defineConfig } from 'vitest/config' 
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://product-manager-api-psi.vercel.app/api'

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/tests/setup.ts',
      include: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
      ],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/tests/**',        // ← exclude Playwright
        'server/**',          // ← exclude backend
      ]
    }
  }
})