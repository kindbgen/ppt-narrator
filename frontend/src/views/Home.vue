<template>
  <AppShell ref="shell" :activeId="currentProjectId" @newProject="newProject" @projectDeleted="onDeleted">
    <div class="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-12 px-8">
      <!-- Warning Banner -->
      <div v-if="!aiReady" class="w-full max-w-3xl mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700 text-center">
        ⚠️ 请先在左下角「⚙️ 设置」中配置 AI 服务
      </div>

      <!-- Hero -->
      <div class="text-center mb-10">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">AI 智能生成 PPT 和旁白</h1>
        <p class="text-gray-400">输入你想创作的PPT主题，AI 自动分析结构、生成精美 PPT 和演讲旁白</p>
      </div>

      <!-- Main Textarea -->
      <div class="w-full max-w-3xl mb-4">
        <textarea
          v-model="rawContent"
          v-if="method !== 'upload'"
          rows="9"
          :placeholder="method === 'docmost' ? '点击下方「获取文档」导入 Wiki 内容...' : '输入你想创作的PPT主题，例如项目汇报、技术分享、产品介绍...'"
          class="w-full px-6 py-5 text-base border border-gray-200 rounded-2xl focus:ring-2 focus:ring-gray-300 focus:outline-none resize-none shadow-sm"
        ></textarea>

        <!-- Wiki Input -->
        <div v-if="method === 'docmost'" class="flex gap-2 mt-3">
          <input v-model="docmostUrl" placeholder="https://your-wiki.com/s/space/p/page-id" class="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
          <button @click="fetchDocmost" :disabled="!docmostUrl || fetching" class="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors shrink-0">{{ fetching ? '获取中...' : '获取文档' }}</button>
        </div>
        <p v-if="docmostError" class="text-red-500 text-xs mt-2">{{ docmostError }}</p>

        <!-- File Upload -->
        <div v-if="method === 'upload'" class="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-gray-300 transition-colors">
          <input type="file" accept=".md,.html,.htm" @change="handleUpload" class="text-sm" />
          <p class="text-xs text-gray-400 mt-2">支持 Markdown 和 HTML 文件</p>
        </div>
      </div>

      <!-- Footer bar: char count + source method pills -->
      <div class="w-full max-w-3xl flex items-center justify-between mb-8">
        <span v-if="rawContent" class="text-xs text-gray-400">{{ rawContent.length.toLocaleString() }} 字符</span>
        <span v-else class="text-xs text-gray-400"></span>
        <div class="flex gap-1.5 bg-gray-100 rounded-full p-1">
          <button v-for="m in methods" :key="m.key" @click="method = m.key"
            :class="method === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            class="px-4 py-1.5 rounded-full text-xs font-medium transition-all"
          >{{ m.label }}</button>
        </div>
      </div>

      <!-- Style Selection -->
      <div class="w-full max-w-3xl mb-8">
        <h3 class="text-sm font-medium text-gray-500 mb-3 text-center">PPT 风格</h3>
        <div class="flex justify-center gap-3">
          <button v-for="s in styles" :key="s.key" @click="selStyle = s.key"
            :class="selStyle === s.key ? 'ring-2 ring-gray-900 ring-offset-2' : 'border border-gray-200 hover:border-gray-300'"
            class="flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all bg-white"
          >
            <div :class="s.bg" class="w-16 h-10 rounded-lg flex items-center justify-center shadow-sm">
              <span :class="s.titleColor" class="text-[9px] font-bold">PPT</span>
            </div>
            <span class="text-[11px] font-medium text-gray-700">{{ s.label }}</span>
          </button>
        </div>
      </div>

      <!-- Page Count Control -->
      <div class="w-full max-w-3xl mb-8">
        <div class="flex items-center justify-center gap-4 text-sm">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" v-model="pageMode" value="auto" class="accent-gray-900" />
            <span class="text-gray-700">自动页数</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" v-model="pageMode" value="custom" class="accent-gray-900" />
            <span class="text-gray-700">指定页数</span>
          </label>
          <template v-if="pageMode === 'custom'">
            <input v-model.number="pageMin" type="number" min="3" max="50" class="w-14 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            <span class="text-gray-300">—</span>
            <input v-model.number="pageMax" type="number" min="3" max="50" class="w-14 px-2 py-1 border border-gray-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            <span class="text-xs text-gray-400">页</span>
          </template>
        </div>
      </div>

      <!-- Generate Button -->
      <button
        @click="!canGen ? null : generate()"
        :disabled="!canGen || generating"
        class="w-full max-w-md py-3.5 bg-gray-900 text-white rounded-xl text-base font-medium disabled:opacity-30 hover:bg-gray-800 transition-colors"
      >
        {{ generating ? 'AI 正在生成...' : '🤖 AI 智能生成 PPT 和旁白' }}
      </button>
      <p v-if="!rawContent" class="text-xs text-gray-400 mt-2">请先在上方输入文档内容</p>

      <!-- Quick Test -->
      <button @click="quickTest" class="mt-4 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors">
        ⚡ 一键快速测试（内置模版，无需配置AI）
      </button>

      <!-- Generating Overlay -->
      <div v-if="generating" class="fixed inset-0 z-50 bg-white/80 flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p class="text-sm text-gray-600">AI 正在生成 PPT...</p>
        </div>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { DocmostClient } from '../services/docmost'
import { createProject } from '../services/storage'
import { startGeneration } from '../services/generation'
import AppShell from '../components/layout/AppShell.vue'

const router = useRouter()
const store = usePPTStore()
const shell = ref(null)

const method = ref('paste')
const docmostUrl = ref(''); const docmostError = ref(''); const fetching = ref(false)
const rawContent = ref(''); const selStyle = ref('business'); const generating = ref(false)
const currentProjectId = ref(null)
const pageMode = ref('auto'); const pageMin = ref(8); const pageMax = ref(12)

const methods = [{ key: 'paste', label: '手动输入' }, { key: 'docmost', label: 'Wiki 导入' }, { key: 'upload', label: '上传文件' }]
const styles = [
  { key: 'business', label: '商务', desc: '简洁专业 · 蓝色主调',
    bg: 'bg-gradient-to-br from-slate-800 to-blue-950', titleColor: 'text-white', subColor: 'text-blue-200',
    cardBg: 'bg-slate-800', cardText: 'text-blue-200', cardSub: 'text-blue-400/40', statBg: 'bg-white/5' },
  { key: 'tech', label: '科技', desc: '现代动感 · 深色背景',
    bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', titleColor: 'text-cyan-300', subColor: 'text-cyan-400/50',
    cardBg: 'bg-gray-900', cardText: 'text-cyan-300', cardSub: 'text-cyan-500/30', statBg: 'bg-white/5' },
  { key: 'minimal', label: '简约', desc: '清爽优雅 · 浅色调',
    bg: 'bg-gradient-to-br from-gray-100 to-white', titleColor: 'text-gray-800', subColor: 'text-gray-400',
    cardBg: 'bg-white', cardText: 'text-gray-700', cardSub: 'text-gray-300', statBg: 'bg-gray-50' },
  { key: 'education', label: '教育', desc: '清晰易读 · 高对比度',
    bg: 'bg-gradient-to-br from-emerald-100 to-white', titleColor: 'text-emerald-800', subColor: 'text-emerald-500/50',
    cardBg: 'bg-white', cardText: 'text-emerald-700', cardSub: 'text-emerald-300', statBg: 'bg-emerald-50' }
]

const canGen = computed(() => rawContent.value)
const aiReady = computed(() => shell.value?.hasAI ?? true)

async function fetchDocmost() {
  fetching.value = true; docmostError.value = ''
  try {
    const client = new DocmostClient({ mcpUrl: shell.value?.cfg?.mcpUrl || import.meta.env.VITE_DOCMOST_MCP_URL, mcpToken: shell.value?.cfg?.mcpToken || import.meta.env.VITE_DOCMOST_TOKEN })
    const p = client.parseUrl(docmostUrl.value)
    if (!p) { docmostError.value = '无法解析 URL'; return }
    const r = await client.fetchPage(p.pageIdentifier, p.spaceSlug)
    rawContent.value = r.title ? `# ${r.title}\n\n${r.content}` : r.content
  } catch (e) { docmostError.value = e.message } finally { fetching.value = false }
}

function handleUpload(e) { const f = e.target.files[0]; if (f) { const r = new FileReader(); r.onload = () => rawContent.value = r.result; r.readAsText(f) } }

async function generate() {
  if (!rawContent.value) return
  const s = shell.value?.cfg || {}
  const provider = s.aiProvider || 'gateway'
  // Map provider-specific fields to flat settings for generation service
  const settings = { ...s }
  if (provider === 'claude') {
    settings.apiKey = s.claudeApiKey || ''
    settings.model = s.claudeModel || ''
  } else if (provider === 'openai') {
    settings.apiKey = s.openaiApiKey || ''
    settings.model = s.openaiModel || ''
  }
  doGenerate(provider, settings)
}

function quickTest() {
  rawContent.value = '# PPT 演讲助手 — AI 驱动的演示文稿生成与双屏演讲工具\n\n## 产品概述\nPPT 演讲助手是一款全栈 AI 演讲工具，支持 Web 浏览器和 Windows / macOS / Linux 桌面应用。输入文档或 Wiki URL，AI 自动分析结构、拆分页面、生成 PPT 和旁白，实现演示屏 + 旁白屏双屏同步演讲。支持 LLM Gateway / Claude / OpenAI / Ollama 多种模型，本地 SQLite 持久化存储，离线可用。\n\n## 核心功能\n- **多源输入**：粘贴 Markdown/HTML、Docmost Wiki 导入、本地上传文件\n- **多模型 AI**：LLM Gateway / Claude / OpenAI / Ollama 灵活切换\n- **智能拆分**：AI 分析文档结构，生成封面、目录、内容、数据、结语等布局\n- **演讲旁白**：每页生成演讲稿 + 关键词提示 + 演讲技巧\n- **富文本编辑**：拖拽排序页面，可视化调整标题、内容、时长、旁白\n- **双屏演示**：演示屏全屏播放 PPT，旁白屏同步显示演讲稿 + 倒计时 + 关键词 + 技巧提示\n- **智能计时**：每页独立倒计时，绿黄红三色预警，支持暂停/重置\n- **右键菜单**：演示屏右键支持首页/上一页/下一页/末页/全屏切换/结束放映\n- **ESC 快捷**：演示屏按 ESC 一键结束放映\n- **数据持久化**：SQLite 本地存储 + IndexedDB，所有项目离线可用\n- **安全加密**：API Key 等敏感信息使用 Electron safeStorage 加密（macOS Keychain / Windows DPAPI / Linux libsecret）\n- **跨平台**：Electron 42 打包为 Windows .exe / macOS .dmg / Linux .AppImage\n- **导出**：支持导出 HTML 和 PDF 格式\n\n## 使用流程\n1. 输入内容 — 粘贴文档、上传文件、或输入 Wiki URL\n2. 选择风格 — 商务 / 科技 / 简约 / 教育四种 PPT 模板\n3. 选择模型 — LLM Gateway / Claude / OpenAI / Ollama\n4. 一键生成 — AI 自动分析、拆分、生成 PPT 和旁白\n5. 编辑微调 — 修改标题、内容、时长、旁白文本\n6. 开始放映 — 演示屏 + 旁白屏自动同步翻页和计时\n7. 右键操作 — 右键菜单快速翻页、全屏切换、结束放映\n\n## 双屏操作\n- 翻页：键盘 ← → 或点击按钮，演示屏和旁白屏自动同步\n- 暂停/继续：Space 键或点击暂停按钮\n- 重置计时：点击旁白屏 ↺ 按钮重置当前页倒计时\n- 页面跳转：旁白屏上方页签点击任意页快速跳转\n- 返回编辑：旁白屏左上角 ← 按钮关闭旁白窗口\n- 右键菜单：演示屏右键支持首页/末页/全屏切换/结束放映\n- 项目切换：侧边栏切换项目后，演示屏和旁白屏自动同步更新\n\n## 桌面应用\n支持一键打包三平台原生应用，获得原生多窗口体验：编辑器、演示屏、旁白屏各自独立窗口。BroadcastChannel 实现跨窗口双向同步。安全架构：contextIsolation + sandbox + CSP。设置通过 safeStorage 加密持久化。\n\n## 技术架构\nVue 3 + Vite 8 + Pinia 状态管理 + Tailwind CSS 4 + Reveal.js 6 + SQLite (sql.js) + BroadcastChannel 同步 + Electron 42 + electron-builder 打包\n\n## 总结\nPPT 演讲助手将 AI 内容生成、PPT 设计、双屏演讲、跨平台桌面应用、安全加密融为一体，大幅提升演讲准备效率，让每一位演讲者专注于内容表达。'
  method.value = 'paste'; selStyle.value = 'business'
  doGenerate('mock', {})
}

async function doGenerate(provider, settings) {
  if (!rawContent.value) return

  // Create placeholder project immediately so sidebar shows it
  const placeholderSlides = [{ layout: 'cover', title: '正在生成PPT...', duration: 15, content: '<div class="ppt-cover"><h1>正在生成PPT...</h1></div>', narration: '', keywords: [], tips: [] }]
  const tempId = await createProject({ slides: placeholderSlides, meta: { title: '正在生成PPT...', templateStyle: selStyle.value, aiProvider: provider, rawContent: rawContent.value } })
  store.currentProjectId = tempId; localStorage.setItem('ppt-active-project', tempId)
  store.projectTitle = '正在生成PPT...'
  store.setSlides(placeholderSlides)
  store.setAIProvider(provider); store.setTemplateStyle(selStyle.value)
  shell.value?.load()

  // Navigate to editor immediately
  router.push('/editor')

  // Delegate to shared generation service (supports concurrent independent sessions)
  startGeneration({
    projectId: tempId,
    rawContent: rawContent.value,
    style: selStyle.value,
    provider,
    settings,
    pageMode: pageMode.value,
    pageMin: pageMin.value,
    pageMax: pageMax.value,
    store
  })
}

function newProject() { method.value = 'paste'; rawContent.value = ''; selStyle.value = 'business'; pageMode.value = 'auto'; currentProjectId.value = null }
function onDeleted(id) { if (currentProjectId.value === id) currentProjectId.value = null }
onMounted(() => { currentProjectId.value = store.currentProjectId })
</script>
