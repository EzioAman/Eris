import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

const checkEnvExists = () => {
  const baseDir = import.meta.dirname || process.cwd()
  const rootEnv = path.resolve(baseDir, '../.env')
  const localEnv = path.resolve(baseDir, '.env')
  return fs.existsSync(rootEnv) || fs.existsSync(localEnv)
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'eris-env-checker',
      configureServer(server) {
        server.middlewares.use('/api/system/check-env', (_req, res) => {
          const hasEnv = checkEnvExists()
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ hasEnv }))
        })
      },
    },
  ],
  define: {
    __ENV_EXISTS__: JSON.stringify(checkEnvExists()),
  },
  server: {
    port: 5173,
    watch: {
      ignored: ['**/dist-electron/**', '**/dist/**', '**/.venv/**', '**/memory/**'],
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5174',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:5174',
        ws: true,
      },
    },
  },
})
