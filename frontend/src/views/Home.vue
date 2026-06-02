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
        <p class="text-gray-400">输入文档内容，AI 自动分析结构、生成精美 PPT 和演讲旁白</p>
      </div>

      <!-- Main Textarea -->
      <div class="w-full max-w-3xl mb-4">
        <textarea
          v-model="rawContent"
          v-if="method !== 'upload'"
          rows="9"
          :placeholder="method === 'docmost' ? '点击下方「获取文档」导入 Wiki 内容...' : '输入文档内容，例如项目汇报、技术分享、产品介绍...'"
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
  rawContent.value = '# 项目汇报\n\n## 项目概述\n本项目旨在开发PPT演讲工具。\n\n## 核心功能\n- 多源内容输入：支持Docmost Wiki、文件上传、手动粘贴\n- AI智能生成：自动分析内容结构，生成PPT和旁白\n- 双屏演示：演示屏播放PPT，旁白屏同步显示演讲稿\n- 智能倒计时：每页倒计时提醒\n\n## 技术架构\n前端采用Vue 3 + Vite + TailwindCSS。\n\n## 总结\n该工具将大幅提升演讲准备效率。'
  method.value = 'paste'; selStyle.value = 'business'
  doGenerate('mock', {})
}

async function doGenerate(provider, settings) {
  if (!rawContent.value) return

  // Create placeholder project immediately so sidebar shows it
  const placeholderSlides = [{ layout: 'cover', title: '正在生成PPT...', duration: 15, content: '<div class="ppt-cover"><h1>正在生成PPT...</h1></div>', narration: '', keywords: [], tips: [] }]
  const tempId = await createProject({ slides: placeholderSlides, meta: { title: '正在生成PPT...', templateStyle: selStyle.value, aiProvider: provider, rawContent: rawContent.value } })
  store.currentProjectId = tempId; localStorage.setItem('ppt-active-project', tempId)
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
