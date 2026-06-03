import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'

const isBuild = process.argv.includes('build')
import path from 'node:path'

function saveEnvPlugin() {
  return {
    name: 'save-env',
    configureServer(server) {
      server.middlewares.use('/api/save-env', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', c => body += c)
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            const envPath = path.resolve(process.cwd(), '.env.local')
            let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''

            const map = {
              aiProvider: 'VITE_AI_PROVIDER',
              // LLM Gateway
              baseUrl: 'VITE_AI_GATEWAY_BASE_URL',
              apiKey: 'VITE_AI_GATEWAY_API_KEY',
              model: 'VITE_AI_GATEWAY_MODEL',
              // Claude 官方 API
              claudeApiKey: 'VITE_CLAUDE_API_KEY',
              claudeModel: 'VITE_CLAUDE_API_MODEL',
              // OpenAI 官方 API
              openaiApiKey: 'VITE_OPENAI_API_KEY',
              openaiModel: 'VITE_OPENAI_API_MODEL',
              // Ollama
              ollamaEndpoint: 'VITE_OLLAMA_ENDPOINT',
              ollamaModel: 'VITE_OLLAMA_MODEL',
              // Wiki MCP
              mcpUrl: 'VITE_DOCMOST_MCP_URL',
              mcpToken: 'VITE_DOCMOST_TOKEN'
            }

            for (const [k, vk] of Object.entries(map)) {
              if (data[k] === undefined) continue
              const val = String(data[k])
              const re = new RegExp(`^${vk}=.*`, 'm')
              content = re.test(content) ? content.replace(re, `${vk}=${val}`) : content.trimEnd() + `\n${vk}=${val}\n`
            }

            fs.writeFileSync(envPath, content)
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500; res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    }
  }
}

async function getPlugins() {
  const plugins = [vue(), tailwindcss(), saveEnvPlugin()]
  if (isBuild) {
    const electron = (await import('vite-plugin-electron/simple')).default
    plugins.push(electron({
      main: { entry: 'electron/main.cjs' },
      preload: { input: 'electron/preload.cjs' },
    }))
  }
  return plugins
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const mcpUrl = env.VITE_DOCMOST_MCP_URL || ''
  const origin = mcpUrl ? new URL(mcpUrl).origin : 'http://localhost'
  const pathname = mcpUrl ? new URL(mcpUrl).pathname : '/'

  return {
    base: './',
    plugins: await getPlugins(),
    server: {
      proxy: {
        '/api/mcp-proxy': { target: origin, changeOrigin: true, secure: false, rewrite: () => pathname }
      }
    }
  }
})
