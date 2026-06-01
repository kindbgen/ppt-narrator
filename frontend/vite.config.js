import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mcpUrl = env.VITE_DOCMOST_MCP_URL || ''
  const origin = mcpUrl ? new URL(mcpUrl).origin : 'http://localhost'
  const pathname = mcpUrl ? new URL(mcpUrl).pathname : '/'

  return {
    plugins: [vue(), tailwindcss()],
    server: {
      proxy: {
        '/api/mcp-proxy': {
          target: origin,
          changeOrigin: true,
          secure: false,
          rewrite: () => pathname
        }
      }
    }
  }
})
