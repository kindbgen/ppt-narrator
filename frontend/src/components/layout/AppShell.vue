<template>
  <div class="flex h-screen bg-white text-gray-900 overflow-x-hidden">
    <!-- Collapsed Sidebar -->
    <aside v-if="collapsed" class="w-16 flex flex-col items-center border-r border-gray-100 bg-gray-50/50 shrink-0 py-4 gap-1">
      <button
        @click="collapsed = false"
        class="group relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
        <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">展开侧边栏</span>
      </button>

      <button
        @click="goHome"
        class="group relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
        <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">新建项目</span>
      </button>

      <div class="flex-1" />

      <button
        @click="showSettings = true"
        class="group relative flex items-center justify-center w-10 h-10 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">设置</span>
      </button>
    </aside>

    <!-- Expanded Sidebar -->
    <aside v-else class="w-60 flex flex-col border-r border-gray-100 bg-gray-50/50 shrink-0 transition-all duration-200">
      <div class="px-4 py-3.5 border-b border-gray-100 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2">
          <span class="text-lg">📽️</span>
          <h1 class="text-sm font-bold tracking-tight">PPT 演讲助手</h1>
        </router-link>
        <button
          @click="collapsed = true"
          class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M11 19l-7-7 7-7M19 19l-7-7 7-7" /></svg>
          <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">收起侧边栏</span>
        </button>
      </div>

      <div class="flex items-center justify-between px-4 py-2.5 shrink-0">
        <span class="text-xs font-medium text-gray-400">历史项目</span>
        <button
          @click="goHome"
          class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14" /></svg>
          <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">新建项目</span>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        <p v-if="!projects.length" class="text-xs text-gray-300 text-center py-10 px-4">暂无项目，点击 + 新建</p>
        <div class="px-2">
          <div v-for="p in sortedProjects" :key="p.id" class="relative group">
            <div
              :class="['flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer transition-all mb-0.5', activeId === p.id ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600']"
              @click="openProject(p.id)"
            >
              <div class="flex-1 min-w-0">
                <input v-if="renaming === p.id" v-model="renameText" ref="renameInput" @blur="doRename(p)" @keydown.enter="doRename(p)" @keydown.escape="renaming = null" @click.stop class="w-full text-sm bg-white border border-gray-200 rounded px-1.5 py-0.5 focus:ring-2 focus:ring-gray-300 focus:outline-none" />
                <template v-else>
                  <div class="text-sm truncate">{{ p.title }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">{{ fmtDate(p.updated_at) }}</div>
                </template>
              </div>
              <button @click.stop="menuId = menuId === p.id ? null : p.id" class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-all text-sm">⋯</button>
            </div>
            <div v-if="menuId === p.id" class="absolute left-2 right-2 top-full mt-0.5 bg-white border border-gray-100 rounded-lg shadow-md py-1 z-50">
              <button @click="rename(p)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors">✏️ 重命名</button>
              <button @click="togglePin(p)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors">{{ p.pinned ? '📌 取消置顶' : '📌 置顶' }}</button>
              <button @click="del(p.id)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-red-500 transition-colors">🗑️ 删除</button>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 px-4 py-2.5 flex items-center gap-2">
        <button
          @click="showSettings = true"
          class="group relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 shrink-0"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          <span class="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-[100] shadow-md">设置</span>
        </button>
        <span class="text-xs text-gray-400">设置</span>
        <span v-if="!hasAI" class="w-1.5 h-1.5 rounded-full bg-orange-400 ml-auto" title="AI 未配置"></span>
      </div>
    </aside>

    <main class="flex-1 overflow-auto"><slot /></main>

    <!-- Settings Modal -->
    <Teleport to="body">
      <div v-if="showSettings" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" @click.self="showSettings = false">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto p-6" @click.stop>
          <div class="flex items-center justify-between mb-5"><h2 class="text-lg font-bold">⚙️ 设置</h2><button @click="showSettings = false" class="text-gray-400 hover:text-gray-600 text-xl">✕</button></div>

          <h3 class="text-sm font-medium text-gray-500 mb-3">AI 服务</h3>
          <div class="space-y-3 mb-6">
            <select v-model="cfg.aiProvider" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none">
              <option value="gateway">LLM Gateway</option><option value="claude">Claude API</option><option value="openai">OpenAI API</option><option value="ollama">Ollama 本地</option>
            </select>
            <template v-if="cfg.aiProvider !== 'ollama'">
              <input v-model="cfg.baseUrl" placeholder="Base URL" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
              <input v-model="cfg.apiKey" type="password" placeholder="API Key" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
              <input v-model="cfg.model" placeholder="Model name" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            </template>
            <template v-if="cfg.aiProvider === 'ollama'">
              <input v-model="cfg.ollamaEndpoint" placeholder="Endpoint" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
              <input v-model="cfg.ollamaModel" placeholder="Model" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            </template>
          </div>

          <h3 class="text-sm font-medium text-gray-500 mb-3">Wiki MCP</h3>
          <div class="space-y-3 mb-6">
            <input v-model="cfg.mcpUrl" placeholder="MCP URL" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            <input v-model="cfg.mcpToken" type="password" placeholder="MCP Token" class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
          </div>

          <div class="flex gap-3">
            <button @click="saveSettings" class="flex-1 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">保存设置</button>
            <button @click="exportEnv" class="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">导出 .env</button>
          </div>
          <p class="text-xs text-gray-400 mt-3">设置保存在浏览器本地存储，不会提交到 Git。</p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectList, updateProjectMeta, deleteProject, getProject } from '../../services/storage'
import { usePPTStore } from '../../stores/ppt'

const props = defineProps({ activeId: { type: Number, default: null } })
const emit = defineEmits(['newProject', 'projectDeleted'])
const router = useRouter()
const store = usePPTStore()

const projects = ref([]); const menuId = ref(null); const renaming = ref(null); const renameText = ref(''); const renameInput = ref(null)
const showSettings = ref(false); const collapsed = ref(false)

const cfg = ref({
  aiProvider: localStorage.getItem('ppt-ai-provider') || 'gateway',
  baseUrl: localStorage.getItem('ppt-ai-base-url') || import.meta.env.VITE_AI_GATEWAY_BASE_URL || '',
  apiKey: localStorage.getItem('ppt-ai-api-key') || import.meta.env.VITE_AI_GATEWAY_API_KEY || '',
  model: localStorage.getItem('ppt-ai-model') || import.meta.env.VITE_AI_GATEWAY_MODEL || '',
  ollamaEndpoint: localStorage.getItem('ppt-ollama-endpoint') || 'http://localhost:11434',
  ollamaModel: localStorage.getItem('ppt-ollama-model') || 'llama2',
  mcpUrl: localStorage.getItem('ppt-mcp-url') || import.meta.env.VITE_DOCMOST_MCP_URL || '',
  mcpToken: localStorage.getItem('ppt-mcp-token') || import.meta.env.VITE_DOCMOST_TOKEN || ''
})

const hasAI = computed(() => cfg.value.aiProvider === 'ollama' || !!(cfg.value.baseUrl || cfg.value.apiKey))
const sortedProjects = computed(() => {
  const list = [...projects.value]
  list.sort((a, b) => { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return new Date(b.updated_at) - new Date(a.updated_at) })
  return list
})

function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function togglePin(p) { updateProjectMeta(p.id, { pinned: p.pinned ? 0 : 1 }).then(load) }
async function rename(p) { menuId.value = null; renaming.value = p.id; renameText.value = p.title; await nextTick(); const el = Array.isArray(renameInput.value) ? renameInput.value[renameInput.value.length-1] : renameInput.value; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }
async function doRename(p) { if (renameText.value && renameText.value !== p.title) { await updateProjectMeta(p.id, { title: renameText.value }); await load() } renaming.value = null }
async function del(id) { if (!confirm('确定删除？')) return; await deleteProject(id); await load(); emit('projectDeleted', id); menuId.value = null }
async function load() { try { projects.value = await getProjectList() } catch {} }

function saveSettings() {
  localStorage.setItem('ppt-ai-provider', cfg.value.aiProvider); localStorage.setItem('ppt-ai-base-url', cfg.value.baseUrl)
  localStorage.setItem('ppt-ai-api-key', cfg.value.apiKey); localStorage.setItem('ppt-ai-model', cfg.value.model)
  localStorage.setItem('ppt-ollama-endpoint', cfg.value.ollamaEndpoint); localStorage.setItem('ppt-ollama-model', cfg.value.ollamaModel)
  localStorage.setItem('ppt-mcp-url', cfg.value.mcpUrl); localStorage.setItem('ppt-mcp-token', cfg.value.mcpToken)
  showSettings.value = false
}

function exportEnv() {
  const lines = ['# PPT 演讲助手 环境变量', cfg.value.baseUrl ? `VITE_AI_GATEWAY_BASE_URL=${cfg.value.baseUrl}` : '', cfg.value.apiKey ? `VITE_AI_GATEWAY_API_KEY=${cfg.value.apiKey}` : '', cfg.value.model ? `VITE_AI_GATEWAY_MODEL=${cfg.value.model}` : '', cfg.value.mcpUrl ? `VITE_DOCMOST_MCP_URL=${cfg.value.mcpUrl}` : '', cfg.value.mcpToken ? `VITE_DOCMOST_TOKEN=${cfg.value.mcpToken}` : ''].filter(Boolean).join('\n')
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines+'\n'], { type: 'text/plain' })); a.download = '.env.local'; a.click()
}

async function openProject(id) {
  menuId.value = null
  try {
    const p = await getProject(id)
    if (!p) return alert('项目不存在')
    store.setSlides(p.slides); store.currentProjectId = p.id; store.projectTitle = p.title || ''; store.speaker = p.speaker || ''
    store.department = p.department || ''; store.eventType = p.event_type || '内部技术讲座'; store.startTime = p.start_time || ''
    store.setTemplateStyle(p.template_style || 'business'); store.setAIProvider(p.ai_provider || 'gateway')
    localStorage.setItem('ppt-active-project', p.id); localStorage.setItem('ppt-theme', p.template_style || 'business')
    router.push('/editor')
  } catch (e) { alert('加载失败: ' + e.message) }
}

function goHome() { menuId.value = null; router.push('/'); emit('newProject') }
function closeMenus() { menuId.value = null }
onMounted(() => { load(); document.addEventListener('click', closeMenus); window.addEventListener('sidebar-refresh', load) })
onUnmounted(() => { document.removeEventListener('click', closeMenus); window.removeEventListener('sidebar-refresh', load) })
defineExpose({ load, hasAI, cfg })
</script>
