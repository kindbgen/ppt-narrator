<template>
  <AppShell ref="shellRef" :activeId="store.currentProjectId">
    <div class="flex flex-col h-full">
      <!-- ===== Minimal Header ===== -->
      <header class="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white shrink-0">
        <div class="flex items-center gap-4">
          <button @click="goBack" class="text-gray-400 hover:text-gray-600 text-sm">← 返回</button>
          <div class="flex items-center gap-3">
            <input
              v-model="projectTitle"
              @input="onTitleEdit"
              @blur="if (!projectTitle.trim()) { projectTitle = '未命名项目'; onTitleEdit() }"
              class="text-lg font-semibold bg-transparent border-none focus:outline-none text-gray-900 w-56 placeholder-gray-300"
              placeholder="未命名项目"
            />
            <button @click="showMeta = !showMeta" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {{ showMeta ? '收起信息 ▲' : '展开信息 ▼' }}
            </button>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-xs" :class="saveStatus.class">{{ saveStatus.text }}</span>
          <span v-if="!!store.activeGenerations[store.currentProjectId]" class="text-xs text-blue-500">
            {{ store.activeGenerations[store.currentProjectId]?.phase === 'ppt'
              ? '🤖 AI 正在分析内容生成 PPT 页面...'
              : `🤖 正在生成旁白 ${store.activeGenerations[store.currentProjectId]?.current || 0}/${store.activeGenerations[store.currentProjectId]?.total || 0}...` }}
          </span>
          <button @click="startPresentation" class="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors" :disabled="!!store.activeGenerations[store.currentProjectId]">开始演示</button>
          <div class="relative">
            <button @click="showExport = !showExport" class="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">导出 ▼</button>
            <div v-if="showExport" class="absolute right-0 top-full mt-1 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 w-44">
              <div class="px-3 py-1 text-xs text-gray-400">导出 PPT</div>
              <button @click="exportPPT('pdf')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">📄 PDF</button>
              <button @click="exportPPT('markdown')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">📝 Markdown</button>
              <button @click="exportPPT('html')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">🌐 HTML</button>
              <div class="border-t border-gray-100 mt-1 pt-1 px-3 py-1 text-xs text-gray-400">导出旁白</div>
              <button @click="exportNarration('pdf')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">📄 PDF</button>
              <button @click="exportNarration('md')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">📝 Markdown</button>
              <button @click="exportNarration('html')" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">🌐 HTML</button>
            </div>
          </div>
        </div>
      </header>

      <!-- ===== Metadata Panel (collapsible) ===== -->
      <div v-if="showMeta" class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm shrink-0">
        <input v-model="speaker" @input="autoSaveAndPreview" placeholder="演讲者姓名" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-28 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
        <input v-model="department" @input="autoSaveAndPreview" placeholder="部门/公司" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-32 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
        <select v-model="eventType" @change="autoSaveAndPreview" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none">
          <option value="内部技术讲座">内部技术讲座</option><option value="内部培训">内部培训</option><option value="技术分享">技术分享</option><option value="项目汇报">项目汇报</option>
        </select>
        <input v-model="startTime" @input="autoSaveAndPreview" type="date" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
        <span class="text-gray-300">|</span>
        <select v-model="currentTheme" @change="autoSave" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none">
          <option v-for="t in themes" :key="t.value" :value="t">{{ t.label }}</option>
        </select>
      </div>

      <!-- ===== Main Content ===== -->
      <div class="flex flex-1 overflow-hidden">
        <!-- Left: Slide List -->
        <aside class="w-56 border-r border-gray-100 bg-gray-50/50 overflow-y-auto shrink-0">
          <div class="px-4 py-3 flex items-center justify-between">
            <span class="text-xs font-medium text-gray-400 uppercase">页面 ({{ store.totalPages }})</span>
          </div>
          <div class="px-4 pb-2 text-[11px]" :class="!!store.activeGenerations[store.currentProjectId] ? 'text-amber-500' : 'text-gray-300'">{{ !!store.activeGenerations[store.currentProjectId] ? '⏳ 正在生成PPT和旁白中...' : '💡 拖拽页面可调整排序' }}</div>
          <div class="px-2 space-y-0.5">
            <div
              v-for="(slide, index) in store.slides"
              :key="index"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent="onDragOver($event, index)"
              @drop="onDrop($event, index)"
              @dragend="dragIdx = null"
              @click="store.changePage(index)"
              :class="[store.currentPage === index ? 'bg-white shadow-sm ring-1 ring-gray-200' : 'hover:bg-gray-100', dragIdx === index ? 'opacity-30' : '']"
              class="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all group"
            >
              <span class="text-xs text-gray-300 font-mono w-5 shrink-0">{{ index + 1 }}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm truncate" :class="store.currentPage === index ? 'font-medium text-gray-900' : 'text-gray-600'">{{ slide.title || '无标题' }}</div>
              </div>
              <button
                @click.stop="deleteSlide(index)"
                :disabled="store.slides.length <= 1 || slide.layout === 'cover' || slide.layout === 'closing' || slide.layout === 'toc'"
                class="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all shrink-0 text-xs disabled:hidden"
              >✕</button>
            </div>
          </div>
        </aside>

        <!-- Right: Editor -->
        <div class="flex-1 overflow-y-auto p-6">
          <!-- Slide Content -->
          <section class="max-w-2xl mx-auto space-y-6">
            <!-- Title & Layout Info -->
            <div class="flex items-center gap-4 mb-4">
              <input v-model="currentSlide.title" @input="autoSave" class="text-xl font-bold bg-transparent border-none focus:outline-none text-gray-900 flex-1 placeholder-gray-300" placeholder="页面标题" />
              <span class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{{ currentSlide.layout || 'content' }}</span>
              <div class="flex items-center gap-2">
                <input v-model.number="currentSlide.duration" @input="autoSave" type="number" min="10" max="600" class="w-16 text-right bg-transparent border-none focus:outline-none text-sm text-gray-500" />
                <span class="text-xs text-gray-400">秒</span>
              </div>
            </div>

            <!-- Content HTML Editor -->
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="flex items-center px-4 py-2 bg-gray-50 border-b border-gray-100">
                <div class="flex gap-1">
                  <button @click="editMode = 'html'" :class="editMode === 'html' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'" class="px-3 py-1 text-xs rounded-md transition-colors">HTML</button>
                  <button @click="editMode = 'visual'" :class="editMode === 'visual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'" class="px-3 py-1 text-xs rounded-md transition-colors">预览</button>
                </div>
                <div class="flex-1" />
                <button @click="resetContent" :disabled="!isContentModified" class="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 mr-3">↺ 重置</button>
                <button @click="previewFull = true" class="text-xs text-gray-400 hover:text-gray-600">⛶ 全屏预览</button>
              </div>
              <div v-show="editMode === 'html'" class="p-4">
                <textarea
                  v-model="editableContent"
                  @input="onContentEdit"
                  rows="14"
                  class="w-full font-mono text-sm bg-transparent border-none focus:outline-none resize-none leading-relaxed"
                  spellcheck="false"
                ></textarea>
              </div>
              <div v-show="editMode === 'visual'" class="p-4 min-h-[200px]" :class="[currentTheme.bg, currentTheme.body]">
                <div v-if="editableContent" v-html="editableContent" class="slide-body text-sm"></div>
                <p v-else class="text-gray-400 text-sm">暂无内容</p>
              </div>
            </div>

            <!-- Narration -->
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div class="px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span class="text-xs font-medium text-gray-500">演讲旁白</span>
              </div>
              <div class="p-4">
                <textarea v-model="currentSlide.narration" @input="autoSave" rows="5" class="w-full text-sm bg-transparent border-none focus:outline-none resize-none leading-relaxed text-gray-700 placeholder-gray-300" placeholder="输入演讲旁白..."></textarea>
                <div v-if="currentSlide.keywords.length" class="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-100">
                  <span v-for="(kw, i) in currentSlide.keywords" :key="i" class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{{ kw }}</span>
                </div>
                <div v-if="currentSlide.tips.length" class="mt-2 space-y-1">
                  <div v-for="(tip, i) in currentSlide.tips" :key="i" class="text-xs text-gray-400 flex gap-1.5"><span>💡</span>{{ tip }}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
    <!-- Fullscreen Preview -->
    <Teleport to="body">
      <div v-if="previewFull" :class="[currentTheme.bg, currentTheme.body]" class="fixed inset-0 z-50 flex items-center justify-center p-8" @click.self="previewFull = false">
        <button @click="previewFull = false" class="absolute top-4 right-4 text-2xl hover:opacity-70" :class="currentTheme.body">✕</button>
        <div class="w-full max-w-5xl max-h-full overflow-auto"><div v-html="editableContent" class="slide-body text-2xl"></div></div>
      </div>
    </Teleport>
  </AppShell>
</template>

<script setup>
import { computed, ref, reactive, onMounted, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { updateProjectMeta, updateProjectSlides, createProject, getProject } from '../services/storage'
import { AIService } from '../services/ai-provider'
import AppShell from '../components/layout/AppShell.vue'
import { resumeGeneration } from '../services/generation'

const router = useRouter()
const store = usePPTStore()
const shellRef = ref(null)

// ---- Theme ----
const themes = [
  { value: 'business', label: '商务', bg: 'bg-gradient-to-br from-slate-800 to-blue-950', body: 'text-blue-100' },
  { value: 'tech', label: '科技', bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', body: 'text-slate-300' },
  { value: 'minimal', label: '简约', bg: 'bg-gradient-to-br from-white to-gray-50', body: 'text-gray-600' },
  { value: 'education', label: '教育', bg: 'bg-gradient-to-br from-emerald-50 to-white', body: 'text-gray-700' },
]
const currentTheme = ref(themes[0])
const showMeta = ref(true)
const showExport = ref(false)

// ---- Current slide computed ----
const currentSlide = computed(() => {
  const s = store.currentSlide
  return { title: s.title || '', content: s.content || '', duration: s.duration || 120, narration: s.narration || '', keyPoints: s.keyPoints || [], keywords: s.keywords || [], tips: s.tips || [], layout: s.layout || 'content' }
})

// ---- Editable content ----
const editableContent = ref('')
const originalContent = ref('')
const editMode = ref('visual')
const previewFull = ref(false)
let contentSaveTimer = null
const isContentModified = computed(() => editableContent.value !== originalContent.value)

function formatHTML(html) {
  if (!html) return ''
  let indent = 0
  return html.replace(/></g, '>\n<').split('\n').map(line => {
    const t = line.trim(); if (!t) return ''
    if (t.match(/^<\/\w/)) indent = Math.max(0, indent - 1)
    const out = '  '.repeat(indent) + t
    if (t.match(/^<\w[^>]*[^/]>$/) && !t.match(/^<(br|hr|img|input|link|meta)[^>]*>/i) && !t.match(/^<\/|^<.*<\/.*>/)) indent++
    return out
  }).filter(Boolean).join('\n')
}

function syncContent() { const c = store.currentSlide.content || ''; editableContent.value = formatHTML(c); originalContent.value = formatHTML(c) }
watch(() => store.currentPage, syncContent)
function onContentEdit() { store.updateSlide(store.currentPage, { content: editableContent.value }); clearTimeout(contentSaveTimer); contentSaveTimer = setTimeout(autoSave, 400) }
function resetContent() { editableContent.value = originalContent.value; store.updateSlide(store.currentPage, { content: originalContent.value }); autoSave() }

// ---- Drag / Delete ----
const dragIdx = ref(null)
function onDragStart(e, idx) { dragIdx.value = idx; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e, idx) { if (dragIdx.value != null && dragIdx.value !== idx) e.dataTransfer.dropEffect = 'move' }
function onDrop(e, targetIdx) {
  if (dragIdx.value == null || dragIdx.value === targetIdx) return
  const slides = [...store.slides]; const [m] = slides.splice(dragIdx.value, 1); slides.splice(targetIdx, 0, m)
  store.slides = slides; store.currentPage = targetIdx; dragIdx.value = null; syncContent(); autoSave()
}
function deleteSlide(idx) {
  if (store.slides.length <= 1) return
  const s = store.slides[idx]
  if (s.layout === 'cover' || s.layout === 'closing') return
  if (!confirm(`删除「${s.title || '无标题'}」？`)) return
  store.slides = store.slides.filter((_, i) => i !== idx)
  if (store.currentPage >= store.slides.length) store.currentPage = store.slides.length - 1
  syncContent(); autoSave()
}

// ---- Meta ----
const projectTitle = ref(store.projectTitle)
const speaker = ref(store.speaker)
const department = ref(store.department)
const eventType = ref(store.eventType)
const startTime = ref(store.startTime)
const saveStatus = reactive({ text: '', class: 'text-gray-400' })
let saveTimer = null
let saving = false

// Keep title in sync when generation updates store.projectTitle
watch(() => store.projectTitle, (val) => { if (val) projectTitle.value = val })

function onTitleEdit() { store.projectTitle = projectTitle.value; autoSave() }

// Real-time update: regenerate cover/closing content when metadata changes
function updateSlidePreviews() {
  const cover = store.slides[0]
  if (cover?.layout === 'cover') {
    cover.author = speaker.value; cover.department = department.value
    cover.eventType = eventType.value; cover.startTime = startTime.value || ''
    cover.content = new AIService('mock', {})._renderCover(cover)
  }
  const last = store.slides[store.slides.length - 1]
  if (last?.layout === 'closing') {
    last.author = speaker.value; last.department = department.value
    last.startTime = startTime.value || ''
    last.content = new AIService('mock', {})._renderClosing(last)
    last.title = '感谢观看'
  }
  // Sync the editable content if currently viewing cover or closing
  if (store.currentPage === 0 || store.currentPage === store.slides.length - 1) {
    syncContent()
  }
}

async function ensureProject() {
  if (store.currentProjectId) return store.currentProjectId
  const id = await createProject({ slides: store.slides, meta: { title: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value, templateStyle: currentTheme.value.value, aiProvider: store.config.aiProvider } })
  store.currentProjectId = id; localStorage.setItem('ppt-active-project', id); return id
}

async function doSave() {
  if (saving) return
  saving = true
  try {
    const pid = await ensureProject()
  Object.assign(store, { projectTitle: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value })
  store.config.templateStyle = currentTheme.value.value
  localStorage.setItem('ppt-theme', currentTheme.value.value)

  const cover = store.slides[0]
  if (cover?.layout === 'cover') {
    cover.author = speaker.value; cover.department = department.value; cover.eventType = eventType.value
    cover.startTime = startTime.value ? startTime.value : ''
    cover.content = new AIService('mock', {})._renderCover(cover)
  }
  const last = store.slides[store.slides.length - 1]
  if (last?.layout === 'closing') {
    last.author = speaker.value; last.department = department.value
    last.startTime = startTime.value ? startTime.value : ''
    last.content = new AIService('mock', {})._renderClosing(last)
  }

  await updateProjectMeta(pid, { title: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value || '', templateStyle: currentTheme.value.value })
  store.updateSlide(store.currentPage, { title: currentSlide.value.title, duration: currentSlide.value.duration, narration: currentSlide.value.narration })
  await updateProjectSlides(pid, store.slides)

  // Sync sidebar
  shellRef.value?.load()
  saveStatus.text = '已保存'; saveStatus.class = 'text-green-500'
  document.title = (projectTitle.value || 'PPT 演讲助手编辑器') + ' — 编辑器'
  setTimeout(() => { if (saveStatus.text === '已保存') saveStatus.text = '' }, 2000)
  } finally { saving = false }
}

function autoSave() {
  clearTimeout(saveTimer)
  saveStatus.text = '保存中...'; saveStatus.class = 'text-gray-400'
  saveTimer = setTimeout(() => doSave().catch(e => { console.warn('Save failed:', e); saveStatus.text = '失败'; saveStatus.class = 'text-red-500' }), 600)
}

function autoSaveAndPreview() {
  updateSlidePreviews()
  autoSave()
}

function goBack() { router.push('/') }

// ---- Export ----
function downloadBlob(content, filename, type = 'text/plain') {
  const blob = new Blob([content], { type })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
}

function buildSlideHTML() {
  return store.slides.map((s, i) => {
    const title = s.layout !== 'cover' && s.layout !== 'section' && s.layout !== 'closing'
      ? `<h2 class="slide-title">${s.title}</h2>` : ''
    return `<div class="slide">${title}<div class="slide-content">${s.content}</div></div>`
  }).join('\n')
}

function getThemeCSS() {
  const theme = store.config.templateStyle || 'business'
  // Mirror the presentation theme
  const bg = theme === 'business' ? 'background: linear-gradient(135deg, #1e293b, #172554);' :
    theme === 'tech' ? 'background: linear-gradient(135deg, #030712, #1e1b4b);' :
    theme === 'minimal' ? 'background: #fff;' :
    'background: linear-gradient(135deg, #ecfdf5, #fff);'
  const textColor = theme === 'minimal' || theme === 'education' ? '#333' : '#e2e8f0'
  const titleColor = theme === 'minimal' || theme === 'education' ? '#111' : '#fff'
  return { bg, textColor, titleColor }
}

function exportPPT(format) {
  showExport.value = false
  const title = projectTitle.value || 'PPT演示文稿'
  const { bg, textColor, titleColor } = getThemeCSS()

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;${bg}color:${textColor}}
  .slide{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 40px;${format==='pdf'?'page-break-after:always;':''}}
  .slide:last-child{page-break-after:auto}
  .slide-title{font-size:36px;font-weight:700;margin-bottom:24px;color:${titleColor}}
  .slide-content{max-width:800px;width:100%}
  /* PPT styles */
  .ppt-cover{text-align:center;padding:60px 20px}
  .ppt-cover-badge{display:inline-block;padding:6px 24px;border:2px solid currentColor;border-radius:999px;font-size:14px;letter-spacing:4px;text-transform:uppercase;margin-bottom:40px;opacity:.7}
  .ppt-cover h1{font-size:48px;font-weight:700;line-height:1.2;margin-bottom:20px;color:${titleColor}}
  .ppt-cover-sub{font-size:20px;opacity:.7;margin-bottom:16px}
  .ppt-cover-meta{text-align:center;margin-top:30px;font-size:15px;opacity:.55;border-top:1px solid rgba(255,255,255,.15);padding-top:24px}
  .ppt-section{text-align:center;padding:60px 20px}
  .ppt-section-num{font-size:100px;font-weight:900;line-height:1;opacity:.12;margin-bottom:-30px}
  .ppt-section h2{font-size:40px;font-weight:700;margin-bottom:12px;color:${titleColor}}
  .ppt-list{list-style:none;padding:0;text-align:left;max-width:650px;margin:0 auto}
  .ppt-list li{padding:12px 18px;margin-bottom:8px;border-left:4px solid rgba(255,255,255,.3);border-radius:0 8px 8px 0;font-size:20px;line-height:1.5}
  .ppt-list li strong{display:inline-block;min-width:80px;margin-right:8px}
  .ppt-data-grid{display:flex;justify-content:center;gap:20px;flex-wrap:wrap;max-width:750px;margin:0 auto}
  .ppt-data-card{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);border-radius:14px;padding:28px 24px;min-width:140px;text-align:center}
  .ppt-data-num{font-size:42px;font-weight:900;line-height:1.1;margin-bottom:6px}
  .ppt-twocol{display:flex;align-items:stretch;gap:16px;max-width:750px;margin:0 auto}
  .ppt-twocol-box{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:24px 20px;text-align:left}
  .ppt-twocol-box h4{font-size:17px;font-weight:700;margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid rgba(255,255,255,.15)}
  .ppt-twocol-box ul{list-style:none;padding:0}
  .ppt-twocol-box li{padding:6px 0;font-size:15px;border-bottom:1px solid rgba(255,255,255,.06)}
  .ppt-twocol-box li::before{content:'▸ ';opacity:.4}
  .ppt-twocol-divider{display:flex;align-items:center;font-size:14px;font-weight:900;opacity:.4;padding:0 4px}
  .ppt-table{width:100%;max-width:700px;margin:0 auto;border-collapse:separate;border-spacing:0;font-size:16px}
  .ppt-table thead th{background:rgba(255,255,255,.15);padding:12px 16px;text-align:left;font-weight:700;font-size:14px;border-radius:8px 0 0 0}
  .ppt-table thead th:last-child{border-radius:0 8px 0 0}
  .ppt-table tbody td{padding:10px 16px;border-bottom:1px solid rgba(255,255,255,.08)}
  .ppt-timeline{max-width:650px;margin:0 auto;text-align:left;padding-left:30px}
  .ppt-timeline-item{display:flex;gap:18px;padding-bottom:24px;position:relative}
  .ppt-timeline-item:not(:last-child)::after{content:'';position:absolute;left:17px;top:40px;bottom:0;width:2px;background:rgba(255,255,255,.15)}
  .ppt-timeline-dot{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0}
  .ppt-timeline-content strong{display:block;font-size:18px;margin-bottom:4px}
  .ppt-callout{max-width:600px;margin:0 auto;text-align:left}
  .ppt-callout blockquote{margin:0 0 16px 0;padding:28px 32px;background:rgba(255,255,255,.08);border-left:5px solid rgba(255,255,255,.3);border-radius:0 10px 10px 0;font-size:22px;font-style:italic;line-height:1.5;position:relative}
  .ppt-callout blockquote::before{content:'"';position:absolute;top:-10px;left:12px;font-size:50px;opacity:.15;line-height:1}
  .ppt-toc{max-width:650px;margin:0 auto;text-align:left;padding:40px 20px}
  .ppt-toc-heading{font-size:32px;font-weight:700;margin-bottom:32px;text-align:center;color:${titleColor}}
  .ppt-toc-list{display:flex;flex-direction:column;gap:10px}
  .ppt-toc-item{display:flex;align-items:center;gap:16px;padding:14px 20px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px}
  .ppt-toc-num{font-size:18px;font-weight:700;opacity:.5;min-width:28px}
  .ppt-toc-title{font-size:18px;font-weight:500;flex:1}
  .ppt-closing{text-align:center;padding:80px 20px}
  .ppt-closing h1{font-size:48px;font-weight:300;letter-spacing:8px;margin-bottom:40px;color:${titleColor}}
  .ppt-closing-meta{display:flex;justify-content:center;gap:32px;font-size:17px;opacity:.6;border-top:1px solid rgba(255,255,255,.12);padding-top:28px;flex-wrap:wrap}
  @media print{body{margin:0;padding:0}.slide{min-height:100vh;page-break-after:always}}
</style></head><body>${buildSlideHTML()}</body></html>`

  if (format === 'pdf') {
    const w = window.open('', '_blank', 'width=1000,height=800')
    w.document.write(html); w.document.close()
    setTimeout(() => w.print(), 400)
  } else if (format === 'html') {
    downloadBlob(html, `${title}.html`, 'text/html')
  } else if (format === 'markdown') {
    const md = store.slides.map((s, i) => `# ${i + 1}. ${s.title}\n\n${s.content.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')}\n`).join('\n\n---\n\n')
    downloadBlob(md, `${title}.md`, 'text/markdown')
  }
}

function exportNarration(format) {
  showExport.value = false
  const fileName = (projectTitle.value || 'PPT演示文稿') + '_旁白'
  const { bg, textColor, titleColor } = getThemeCSS()
  const meta = [speaker.value, department.value, eventType.value, startTime.value].filter(Boolean)

  if (format === 'md') {
    const pages = store.slides.map((s, i) => `### ${i + 1}. ${s.title}\n\n${s.narration || '无旁白内容'}\n`).join('\n')
    downloadBlob(`# ${fileName}\n${meta.length ? `${meta.join(' | ')}\n` : ''}\n${pages}`, `${fileName}.md`, 'text/markdown')
    return
  }

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fileName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;${bg}color:${textColor};min-height:100vh}
  .wrap{max-width:800px;margin:0 auto;padding:60px 40px}
  h1{font-size:32px;font-weight:700;color:${titleColor};margin-bottom:8px}
  .meta{font-size:15px;opacity:.6;margin-bottom:40px;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,.15)}
  .page{margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.1);${format==='pdf'?'page-break-after:always;':''}}
  .page:last-child{border-bottom:none;page-break-after:auto}
  .page h3{font-size:18px;font-weight:600;color:${titleColor};margin-bottom:8px}
  .page p{font-size:16px;line-height:1.8;opacity:.85;white-space:pre-wrap}
  @media print{body{margin:0}.wrap{padding:30px}}
</style></head><body><div class="wrap">
<h1>${fileName}</h1>
${meta.length ? `<div class="meta">${meta.join(' &nbsp;|&nbsp; ')}</div>` : ''}
${store.slides.map((s, i) => `<div class="page"><h3>${i + 1}. ${s.title}</h3><p>${s.narration || '无旁白内容'}</p></div>`).join('\n')}
</div></body></html>`

  if (format === 'pdf') {
    const w = window.open('', '_blank', 'width=1000,height=800')
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400) }
  } else {
    downloadBlob(html, `${fileName}.html`, 'text/html')
  }
}

function startPresentation() {
  clearTimeout(saveTimer)
  doSave().finally(() => {
    localStorage.setItem('ppt-slides', JSON.stringify(store.slides))
    const w = 1200; const h = 780
    window.open('/narrator', 'narrator', `width=${w},height=${h},left=${Math.round((screen.width - w) / 2)},top=${Math.round((screen.height - h) / 2)}`)
    router.push('/presenter')
  })
}

// ---- Restore ----
async function restoreFromDB() {
  const id = store.currentProjectId || Number(localStorage.getItem('ppt-active-project'))
  if (!id) { if (!store.slides.length) router.replace('/'); return }
  try {
    const p = await getProject(id)
    if (p) {
      store.setSlides(p.slides); store.currentProjectId = p.id
      store.projectTitle = p.title || ''; store.speaker = p.speaker || ''; store.department = p.department || ''; store.eventType = p.event_type || '内部技术讲座'; store.startTime = p.start_time || ''
      store.setTemplateStyle(p.template_style || 'business'); store.setAIProvider(p.ai_provider || 'gateway')
      localStorage.setItem('ppt-theme', p.template_style || 'business')
      projectTitle.value = store.projectTitle; speaker.value = store.speaker; department.value = store.department
      eventType.value = store.eventType; startTime.value = store.startTime
      document.title = (store.projectTitle || '编辑器') + ' — 编辑器'
      currentTheme.value = themes.find(t => t.value === store.config.templateStyle) || themes[0]
      nextTick(syncContent)
    } else if (!store.slides.length) { router.replace('/') }
  } catch (e) { console.warn('Restore failed:', e); if (!store.slides.length) router.replace('/') }
}

onMounted(() => { syncContent(); if (!store.slides.length) restoreFromDB().then(() => resumeGeneration(store)) })
watch(() => store.currentProjectId, (n, o) => { if (n && n !== o) restoreFromDB() })
</script>

<style>
@import '../assets/slides.css';
</style>
