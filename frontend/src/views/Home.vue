<template>
  <AppShell ref="shell" :activeId="currentProjectId" @newProject="newProject" @projectDeleted="onDeleted">
    <div class="max-w-2xl mx-auto py-12 px-8">
      <h2 class="text-2xl font-bold mb-2">AI 智能生成 PPT 和旁白</h2>
      <p class="text-sm text-gray-400 mb-8">输入文档内容，AI 自动分析结构、生成精美 PPT 和演讲旁白</p>

      <div v-if="!aiReady" class="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-700">
        ⚠️ 请先在左下角「⚙️ 设置」中配置 AI 服务
      </div>

      <!-- Step 1: Content Source -->
      <section class="mb-10">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">内容来源</h3>
        <div class="flex gap-2 mb-4">
          <button v-for="m in methods" :key="m.key" @click="method = m.key" :class="method === m.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'" class="px-4 py-2 rounded-lg text-sm font-medium transition-colors">{{ m.label }}</button>
        </div>

        <div v-if="method === 'docmost'" class="space-y-3">
          <input v-model="docmostUrl" placeholder="https://your-wiki.com/s/space/p/page-id" class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
          <button @click="fetchDocmost" :disabled="!docmostUrl || fetching" class="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-800 transition-colors">{{ fetching ? '获取中...' : '获取文档' }}</button>
          <p v-if="docmostError" class="text-red-500 text-xs">{{ docmostError }}</p>
        </div>
        <div v-if="method === 'upload'">
          <input type="file" accept=".md,.html,.htm" @change="handleUpload" class="text-sm" />
          <p class="text-xs text-gray-400 mt-2">支持 Markdown 和 HTML</p>
        </div>
        <div v-if="method === 'paste'">
          <textarea v-model="rawContent" rows="8" placeholder="在此粘贴 Markdown 或 HTML 内容..." class="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none resize-none"></textarea>
        </div>
        <div v-if="rawContent" class="mt-3 text-xs text-gray-400">{{ rawContent.length.toLocaleString() }} 字符</div>
      </section>

      <!-- Step 2: Style -->
      <section class="mb-10">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4">PPT 风格</h3>
        <div class="grid grid-cols-2 gap-3">
          <button v-for="s in styles" :key="s.key" @click="selStyle = s.key"
            :class="selStyle === s.key ? 'ring-2 ring-gray-900 ring-offset-1' : 'border border-gray-200 hover:border-gray-300'"
            class="rounded-xl overflow-hidden transition-all text-left bg-white">

            <!-- Preview: Title slide -->
            <div :class="s.bg" class="h-20 flex items-center justify-center relative">
              <div class="text-center">
                <div :class="s.subColor" class="text-[7px] uppercase tracking-widest opacity-50 mb-1">PRESENTATION</div>
                <div :class="s.titleColor" class="text-xs font-bold">标题示例</div>
              </div>
            </div>

            <!-- Preview: Content pages (3 mini slides) -->
            <div class="flex gap-px bg-gray-200">
              <div :class="s.cardBg" class="flex-1 h-10 p-1.5 flex items-center">
                <div class="w-full">
                  <div :class="s.cardText" class="text-[6px] font-medium truncate">● 要点一</div>
                  <div :class="s.cardSub" class="text-[5px] mt-0.5 truncate">要点二</div>
                </div>
              </div>
              <div :class="s.cardBg" class="flex-1 h-10 p-1.5 flex items-center">
                <div class="w-full">
                  <div class="flex gap-1">
                    <div :class="s.statBg" class="flex-1 text-center py-0.5 rounded">
                      <div :class="s.titleColor" class="text-[7px] font-bold">70%</div>
                      <div :class="s.cardSub" class="text-[4px]">转化率</div>
                    </div>
                    <div :class="s.statBg" class="flex-1 text-center py-0.5 rounded">
                      <div :class="s.titleColor" class="text-[7px] font-bold">3x</div>
                      <div :class="s.cardSub" class="text-[4px]">效率</div>
                    </div>
                  </div>
                </div>
              </div>
              <div :class="s.cardBg" class="flex-1 h-10 p-1.5 flex items-center">
                <div class="w-full text-center">
                  <div :class="s.titleColor" class="text-[6px] font-medium mt-1">谢谢大家</div>
                </div>
              </div>
            </div>

            <div class="px-3 py-2">
              <div class="text-sm font-medium text-gray-900">{{ s.label }}</div>
              <div class="text-xs text-gray-400">{{ s.desc }}</div>
            </div>
          </button>
        </div>
      </section>

      <button @click="generate" :disabled="!canGen || generating" class="w-full py-3.5 bg-gray-900 text-white rounded-xl text-base font-medium disabled:opacity-30 hover:bg-gray-800 transition-colors">{{ generating ? 'AI 正在生成...' : '🤖 AI 智能生成 PPT 和旁白' }}</button>
      <button @click="quickTest" class="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">⚡ 一键快速测试（内置模版，无需配置AI）</button>

      <div v-if="generating" class="fixed inset-0 z-50 bg-white/80 flex items-center justify-center">
        <div class="text-center"><div class="animate-spin w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full mx-auto mb-3"></div><p class="text-sm text-gray-600">AI 正在生成 PPT...</p></div>
      </div>
    </div>
  </AppShell>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { AIService } from '../services/ai-provider'
import { DocmostClient } from '../services/docmost'
import { createProject } from '../services/storage'
import AppShell from '../components/layout/AppShell.vue'

const router = useRouter()
const store = usePPTStore()
const shell = ref(null)

const method = ref('paste')
const docmostUrl = ref(''); const docmostError = ref(''); const fetching = ref(false)
const rawContent = ref(''); const selStyle = ref('business'); const generating = ref(false)
const currentProjectId = ref(null)

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
  doGenerate(s.aiProvider || 'gateway', s)
}

function quickTest() {
  rawContent.value = '# 项目汇报\n\n## 项目概述\n本项目旨在开发PPT演讲工具。\n\n## 核心功能\n- 多源内容输入：支持Docmost Wiki、文件上传、手动粘贴\n- AI智能生成：自动分析内容结构，生成PPT和旁白\n- 双屏演示：演示屏播放PPT，旁白屏同步显示演讲稿\n- 智能倒计时：每页倒计时提醒\n\n## 技术架构\n前端采用Vue 3 + Vite + TailwindCSS。\n\n## 总结\n该工具将大幅提升演讲准备效率。'
  method.value = 'paste'; selStyle.value = 'business'
  doGenerate('mock', {})
}

async function doGenerate(provider, settings) {
  if (!rawContent.value) return
  generating.value = true
  try {
    const aiConfig = provider === 'gateway' ? { baseUrl: settings.baseUrl || '', apiKey: settings.apiKey || '', model: settings.model || '' }
      : provider === 'claude' ? { apiKey: settings.apiKey || '' }
      : provider === 'openai' ? { apiKey: settings.apiKey || '' }
      : {}
    const ai = new AIService(provider, aiConfig)
    const r = await ai.generatePPT(rawContent.value, selStyle.value)
    if (r.slides?.length) {
      for (const slide of r.slides) { const nr = await ai.generateNarration(slide); slide.narration = nr.narration || ''; slide.keywords = nr.keywords || []; slide.tips = nr.tips || [] }
      const closing = { layout: 'closing', title: '谢谢大家', duration: 10, content: '<div class="ppt-closing"><h1>Thank you !</h1></div>', keyPoints: [], narration: '谢谢大家！', keywords: [], tips: [] }
      const all = [...r.slides, closing]
      store.setSlides(all); store.setAIProvider(provider); store.setTemplateStyle(selStyle.value)
      const id = await createProject({ slides: all, meta: { title: '未命名项目', templateStyle: selStyle.value, aiProvider: provider, rawContent: rawContent.value } })
      store.currentProjectId = id; localStorage.setItem('ppt-active-project', id)
      shell.value?.load(); router.push('/editor')
    } else { alert('AI 返回空内容') }
  } catch (e) { alert('生成失败: ' + e.message) } finally { generating.value = false }
}

function newProject() { method.value = 'paste'; rawContent.value = ''; selStyle.value = 'business'; currentProjectId.value = null }
function onDeleted(id) { if (currentProjectId.value === id) currentProjectId.value = null }
onMounted(() => { currentProjectId.value = store.currentProjectId })
</script>
