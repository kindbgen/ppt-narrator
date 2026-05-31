<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <h1 class="text-3xl font-bold text-gray-900">PPT演讲助手</h1>
        <p class="text-gray-600 mt-2">将Wiki文档转换为精美PPT，自动生成演讲旁白</p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Step 1: Input Source -->
      <section class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          📝 Step 1: 选择内容来源
        </h2>
        <div class="grid grid-cols-3 gap-4">
          <button
            @click="inputMethod = 'docmost'"
            :class="inputMethod === 'docmost' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
            class="p-4 border-2 rounded-lg transition-all"
          >
            <div class="text-2xl mb-2">🔗</div>
            <div class="font-medium">Docmost Wiki</div>
            <div class="text-sm opacity-70">从Wiki系统导入</div>
          </button>

          <button
            @click="inputMethod = 'upload'"
            :class="inputMethod === 'upload' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
            class="p-4 border-2 rounded-lg transition-all"
          >
            <div class="text-2xl mb-2">📤</div>
            <div class="font-medium">上传文件</div>
            <div class="text-sm opacity-70">MD/HTML文件</div>
          </button>

          <button
            @click="inputMethod = 'paste'"
            :class="inputMethod === 'paste' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
            class="p-4 border-2 rounded-lg transition-all"
          >
            <div class="text-2xl mb-2">✍️</div>
            <div class="font-medium">手动输入</div>
            <div class="text-sm opacity-70">粘贴内容</div>
          </button>
        </div>
      </section>

      <!-- Input Content Area -->
      <section class="mb-8">
        <!-- Docmost URL Input -->
        <div v-if="inputMethod === 'docmost'" class="space-y-3">
          <div class="bg-white rounded-lg p-6 border">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              文档 URL
            </label>
            <input
              v-model="docmostUrl"
              type="text"
              placeholder="https://your-wiki.com/s/space/p/page-id"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            @click="fetchFromDocmost"
            :disabled="!docmostUrl || isFetching"
            class="px-6 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600"
          >
            {{ isFetching ? '获取中...' : '获取文档内容' }}
          </button>
          <p v-if="docmostError" class="text-red-500 text-sm whitespace-pre-wrap">{{ docmostError }}</p>
        </div>

        <!-- File Upload -->
        <div v-if="inputMethod === 'upload'" class="bg-white rounded-lg p-6 border">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            上传文档文件
          </label>
          <input
            type="file"
            accept=".md,.html,.htm"
            @change="handleFileUpload"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg"
          />
          <p class="text-sm text-gray-500 mt-2">
            支持 Markdown (.md) 和 HTML (.html/.htm) 格式
          </p>
        </div>

        <!-- Paste Content -->
        <div v-if="inputMethod === 'paste'" class="bg-white rounded-lg p-6 border">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            粘贴文档内容
          </label>
          <textarea
            v-model="rawContent"
            rows="10"
            placeholder="在此粘贴 Markdown 或 HTML 内容..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <!-- Preview parsed content -->
        <div v-if="parsedContent" class="mt-6 bg-white rounded-lg p-6 border">
          <h3 class="text-lg font-medium text-gray-800 mb-4">📄 内容预览</h3>
          <div class="text-sm text-gray-600 space-y-2">
            <div class="flex gap-6">
              <span>📊 {{ contentStats.chars.toLocaleString() }} 字符</span>
              <span>📑 {{ slideCount }} 个章节</span>
            </div>
            <p class="text-xs text-gray-400">AI 将分析章节结构，智能拆分或合并，生成合适的PPT页数</p>
            <div class="mt-2 p-4 bg-gray-50 rounded overflow-auto max-h-40">
              <pre>{{ previewText }}</pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Step 2: Template Style -->
      <section class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          🎨 Step 2: 选择PPT风格
        </h2>
        <div class="grid grid-cols-4 gap-4">
          <button
            v-for="style in templateStyles"
            :key="style.value"
            @click="selectedStyle = style.value"
            :class="selectedStyle === style.value ? 'ring-2 ring-offset-2 ' + style.accent.split(' ')[0] : ''"
            class="bg-white rounded-lg border-2 transition-all overflow-hidden hover:shadow-lg"
          >
            <!-- 风格预览 -->
            <div :class="'h-24 bg-gradient-to-br ' + style.preview.bg + ' flex flex-col items-center justify-center p-3'">
              <div :class="'text-sm font-bold ' + style.preview.title">标题示例</div>
              <div :class="'text-xs mt-1 ' + style.preview.body">• 要点一</div>
              <div :class="'text-xs ' + style.preview.body">• 要点二</div>
            </div>
            <!-- 标签 -->
            <div :class="selectedStyle === style.value ? style.colors : 'bg-gray-50 text-gray-700'" class="px-3 py-2 text-center transition-all">
              <div class="text-sm font-medium">{{ style.name }}</div>
              <div class="text-xs opacity-70">{{ style.description }}</div>
            </div>
          </button>
        </div>
      </section>

      <!-- Step 3: AI Provider -->
      <section class="mb-8">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">
          🤖 Step 3: 选择AI服务
        </h2>
        <div class="grid grid-cols-5 gap-4">
          <button
            v-for="provider in aiProviders"
            :key="provider.value"
            @click="selectedAI = provider.value"
            :class="selectedAI === provider.value ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'"
            class="p-4 border-2 rounded-lg transition-all"
          >
            <div class="font-medium">{{ provider.name }}</div>
            <div class="text-sm opacity-70">{{ provider.description }}</div>
          </button>
        </div>

        <!-- Gateway Config -->
        <div v-if="selectedAI === 'gateway'" class="mt-4 space-y-3">
          <div class="bg-white rounded-lg p-4 border">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Gateway Base URL
            </label>
            <input
              v-model="gatewayBaseUrl"
              type="text"
              placeholder="例如: https://your-gateway.example.com"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div class="bg-white rounded-lg p-4 border">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              v-model="gatewayApiKey"
              type="password"
              placeholder="输入API Key..."
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div class="bg-white rounded-lg p-4 border">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Model Name
            </label>
            <input
              v-model="gatewayModel"
              type="text"
              placeholder="例如: deepseek-v4-pro"
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <!-- API Key Input (Claude/OpenAI) -->
        <div v-if="selectedAI === 'claude' || selectedAI === 'openai'" class="mt-4 bg-white rounded-lg p-4 border">
          <label class="block text-sm font-medium text-gray-700 mb-2">
            API Key
          </label>
          <input
            v-model="apiKey"
            type="password"
            placeholder="输入API Key..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </section>

      <!-- Generate Button -->
      <section class="mb-8">
        <button
          @click="generatePPT"
          :disabled="!canGenerate"
          class="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg disabled:opacity-50 hover:from-blue-600 hover:to-purple-600 transition-all"
        >
          🚀 生成PPT和旁白
        </button>
        <p v-if="!canGenerate" class="text-sm text-gray-500 mt-2 text-center">
          请先完成内容输入
        </p>

        <!-- 一键快速测试 -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <button
            @click="quickTest"
            class="w-full px-8 py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-all"
          >
            ⚡ 一键快速测试（自动填充内容 + Mock模式）
          </button>
          <p class="text-xs text-gray-400 mt-1 text-center">
            无需任何配置，点击即可体验完整流程
          </p>
        </div>
      </section>

      <!-- 历史项目 -->
      <section class="mb-8">
        <button
          @click="showHistory = !showHistory"
          class="flex items-center gap-2 text-xl font-semibold text-gray-800 mb-4 hover:text-blue-600"
        >
          <span>{{ showHistory ? '▼' : '▶' }}</span>
          📂 历史项目
          <span class="text-sm text-gray-400 font-normal">({{ projectList.length }})</span>
        </button>

        <div v-if="showHistory" class="space-y-3">
          <p v-if="projectList.length === 0" class="text-gray-500 text-sm py-4 text-center">
            暂无保存的项目
          </p>
          <div
            v-for="p in projectList"
            :key="p.id"
            class="bg-white rounded-lg border p-4 flex items-center justify-between hover:shadow transition-shadow"
          >
            <div class="flex-1 min-w-0">
              <h3 class="font-medium text-gray-900 truncate">{{ p.title }}</h3>
              <div class="flex gap-4 mt-1 text-xs text-gray-500">
                <span v-if="p.speaker">👤 {{ p.speaker }}</span>
                <span>📄 {{ p.slide_count }} 页</span>
                <span>{{ formatDate(p.updated_at) }}</span>
              </div>
            </div>
            <div class="flex gap-2 ml-4 shrink-0">
              <button
                @click="loadProject(p.id)"
                class="px-3 py-1.5 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >📖 加载</button>
              <button
                @click="handleDeleteProject(p.id)"
                class="px-3 py-1.5 bg-red-100 text-red-600 rounded text-sm hover:bg-red-200"
              >🗑️ 删除</button>
            </div>
          </div>
        </div>
      </section>

      <!-- Loading State -->
      <div v-if="isGenerating" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-8 text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p class="text-gray-800 font-medium">正在生成PPT和旁白...</p>
          <p class="text-gray-600 text-sm mt-2">AI正在分析内容和生成演讲稿</p>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { parser } from '../utils/parser'
import { AIService } from '../services/ai-provider'
import { DocmostClient } from '../services/docmost'
import { createProject, getProjectList, getProject, deleteProject } from '../services/storage'

const router = useRouter()
const store = usePPTStore()

// Input method
const inputMethod = ref('paste')
const docmostUrl = ref('')
const docmostError = ref('')
const isFetching = ref(false)
const rawContent = ref('')
const uploadedFile = ref(null)

// Template styles
// Template styles with preview config
const templateStyles = [
  {
    value: 'business',
    name: '商务',
    description: '简洁专业',
    colors: 'bg-blue-600 text-white',
    accent: 'border-blue-400',
    preview: { bg: 'from-blue-700 to-blue-900', title: 'text-white', body: 'text-blue-100' }
  },
  {
    value: 'tech',
    name: '科技',
    description: '现代动感',
    colors: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
    accent: 'border-purple-400',
    preview: { bg: 'from-slate-900 to-indigo-950', title: 'text-cyan-300', body: 'text-slate-300' }
  },
  {
    value: 'minimal',
    name: '简约',
    description: '清爽优雅',
    colors: 'bg-white text-gray-800 border-2',
    accent: 'border-gray-300',
    preview: { bg: 'from-gray-50 to-white', title: 'text-gray-800', body: 'text-gray-600' }
  },
  {
    value: 'education',
    name: '教育',
    description: '清晰易读',
    colors: 'bg-emerald-600 text-white',
    accent: 'border-emerald-400',
    preview: { bg: 'from-emerald-50 to-white', title: 'text-emerald-800', body: 'text-gray-700' }
  }
]
const selectedStyle = ref('business')

// AI providers
const aiProviders = [
  { value: 'gateway', name: 'LLM Gateway', description: '自定义中转站' },
  { value: 'claude', name: 'Claude', description: '高质量生成' },
  { value: 'openai', name: 'OpenAI', description: 'GPT-4模型' },
  { value: 'ollama', name: '本地模型', description: '无需API' },
  { value: 'mock', name: '🧪 模拟测试', description: '无API测试流程' }
]
const selectedAI = ref('gateway')
const apiKey = ref(import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '')
const gatewayBaseUrl = ref(import.meta.env.VITE_AI_GATEWAY_BASE_URL || '')
const gatewayApiKey = ref(import.meta.env.VITE_AI_GATEWAY_API_KEY || '')
const gatewayModel = ref(import.meta.env.VITE_AI_GATEWAY_MODEL || '')

// State
const parsedContent = ref(null)
const isGenerating = ref(false)
const projectList = ref([])
const showHistory = ref(false)

// History state
const currentProjectId = ref(null)

// Computed
const slideCount = computed(() => {
  if (!parsedContent.value?.structure) return 0
  return parsedContent.value.structure.filter(item => item.type === 'heading').length || 0
})

const contentStats = computed(() => {
  if (!rawContent.value) return { chars: 0, words: 0 }
  const text = rawContent.value
  return {
    chars: text.length,
    words: text.replace(/[#*`|\[\]()\n\r]/g, ' ').split(/\s+/).filter(Boolean).length
  }
})

const previewText = computed(() => {
  if (!parsedContent.value?.structure) return ''
  return parsedContent.value.structure
    .slice(0, 20)
    .map(item => `${item.type}: ${item.title || item.content || ''}`)
    .join('\n')
})

const canGenerate = computed(() => {
  return rawContent.value || uploadedFile.value || parsedContent.value
})

// Methods
async function fetchFromDocmost() {
  if (!docmostUrl.value) return
  isFetching.value = true
  docmostError.value = ''

  try {
    const mcpUrl = import.meta.env.VITE_DOCMOST_MCP_URL
    const mcpToken = import.meta.env.VITE_DOCMOST_TOKEN

    const client = new DocmostClient({ mcpUrl, mcpToken })
    const parsed = client.parseUrl(docmostUrl.value)

    if (!parsed) {
      docmostError.value = '无法解析 URL 格式。支持的格式: /s/{space}/p/{pageId}'
      return
    }

    const result = await client.fetchPage(parsed.pageIdentifier, parsed.spaceSlug)

    rawContent.value = result.content
    if (result.title) {
      rawContent.value = `# ${result.title}\n\n${result.content}`
    }
    parseContent()
    docmostError.value = ''
  } catch (error) {
    console.error('Docmost fetch error:', error)
    docmostError.value = `获取文档失败: ${error.message}`
  } finally {
    isFetching.value = false
  }
}

function handleFileUpload(event) {
  const file = event.target.files[0]
  if (file) {
    uploadedFile.value = file
    const reader = new FileReader()
    reader.onload = (e) => {
      rawContent.value = e.target.result
      parseContent()
    }
    reader.readAsText(file)
  }
}

function parseContent() {
  if (!rawContent.value) return

  // 检测是否 HTML：需要包含典型的 HTML 标签（不是自闭合标签如 <br/>）
  const isHTML = /<\/[a-z]+>|<[a-z]+[^>]*>/i.test(rawContent.value) && !rawContent.value.match(/^#{1,6}\s/m)
  parsedContent.value = isHTML
    ? parser.parseHTML(rawContent.value)
    : parser.parseMarkdown(rawContent.value)
}

async function generatePPT() {
  isGenerating.value = true

  try {
    parseContent()

    // 构建AI配置
    let aiConfig = {}
    if (selectedAI.value === 'gateway') {
      aiConfig = {
        baseUrl: gatewayBaseUrl.value,
        apiKey: gatewayApiKey.value,
        model: gatewayModel.value
      }
    } else {
      aiConfig = { apiKey: apiKey.value }
    }

    const aiService = new AIService(selectedAI.value, aiConfig)

    // Generate PPT content
    const pptResult = await aiService.generatePPT(rawContent.value, selectedStyle.value)

    if (pptResult.slides && pptResult.slides.length > 0) {
      // Generate narration for each slide
      for (const slide of pptResult.slides) {
        const narrationResult = await aiService.generateNarration(slide)
        slide.narration = narrationResult.narration || ''
        slide.keywords = narrationResult.keywords || []
        slide.tips = narrationResult.tips || []
      }

      // Save to store
      store.setSlides(pptResult.slides)
      store.setAIProvider(selectedAI.value)
      store.setTemplateStyle(selectedStyle.value)

      // Auto-save to SQLite
      try {
        const id = await createProject({
          slides: pptResult.slides,
          meta: {
            title: '未命名项目',
            templateStyle: selectedStyle.value,
            aiProvider: selectedAI.value,
            rawContent: rawContent.value
          }
        })
        currentProjectId.value = id
        store.currentProjectId = id
        localStorage.setItem('ppt-active-project', id)
        console.log('[Storage] Project auto-saved with id:', id)
      } catch (e) {
        console.warn('Auto-save failed:', e)
      }

      // Navigate to editor
      router.push('/editor')
    } else {
      const detail = pptResult._error || 'AI返回了空内容，请检查Wiki文档内容是否为空'
      alert(`PPT生成失败: ${detail}\n\n请打开浏览器控制台(F12)查看详细日志`)
    }
  } catch (error) {
    console.error('Generate error:', error)
    alert(`生成失败: ${error.message}`)
  } finally {
    isGenerating.value = false
  }
}

// 一键快速测试
function quickTest() {
  rawContent.value = `# 项目汇报

## 项目概述
本项目旨在开发一款全新的PPT演讲工具，帮助用户将Wiki文档快速转换为精美的演示文稿。

## 核心功能
- 多源内容输入：支持Docmost Wiki、文件上传、手动粘贴
- AI智能生成：自动分析内容结构，生成PPT和旁白
- 双屏演示：演示屏播放PPT，旁白屏同步显示演讲稿
- 智能倒计时：每页倒计时提醒

## 技术架构
前端采用Vue 3 + Vite + TailwindCSS，使用Reveal.js作为PPT引擎，BroadcastChannel API实现跨窗口同步。

## 总结
该工具将大幅提升演讲准备效率，让演讲者专注于内容表达而非PPT制作。`

  inputMethod.value = 'paste'
  selectedAI.value = 'mock'
  selectedStyle.value = 'business'
  parseContent()

  console.log('[QuickTest] Content ready, generating PPT...')
  generatePPT()
}

// -------- 历史项目 --------

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function refreshProjectList() {
  try {
    projectList.value = await getProjectList()
  } catch (e) {
    console.warn('Failed to load project list:', e)
  }
}

async function loadProject(id) {
  try {
    const project = await getProject(id)
    if (!project) {
      alert('项目不存在')
      return
    }
    store.setSlides(project.slides)
    store.setTemplateStyle(project.template_style || 'business')
    store.setAIProvider(project.ai_provider || 'gateway')
    store.currentProjectId = project.id
    store.projectTitle = project.title || '未命名项目'
    store.speaker = project.speaker || ''
    localStorage.setItem('ppt-active-project', project.id)
    currentProjectId.value = project.id

    // Restore raw content if available
    if (project.raw_content) {
      rawContent.value = project.raw_content
    }

    router.push('/editor')
  } catch (e) {
    console.error('Load project error:', e)
    alert('加载项目失败: ' + e.message)
  }
}

async function handleDeleteProject(id) {
  if (!confirm('确定要删除这个项目吗？此操作不可撤销。')) return
  try {
    await deleteProject(id)
    if (currentProjectId.value === id) {
      currentProjectId.value = null
      store.currentProjectId = null
    }
    await refreshProjectList()
  } catch (e) {
    console.error('Delete project error:', e)
    alert('删除失败: ' + e.message)
  }
}

onMounted(() => {
  document.title = 'PPT演讲助手'
  refreshProjectList()
})
</script>