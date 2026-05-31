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
          <button @click="startPresentation" class="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">开始演示</button>
        </div>
      </header>

      <!-- ===== Metadata Panel (collapsible) ===== -->
      <div v-if="showMeta" class="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-4 text-sm shrink-0">
        <input v-model="speaker" @input="autoSave" placeholder="演讲者姓名" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-28 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
        <input v-model="department" @input="autoSave" placeholder="部门/公司" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 w-32 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
        <select v-model="eventType" @change="autoSave" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none">
          <option value="内部技术讲座">内部技术讲座</option><option value="内部培训">内部培训</option><option value="技术分享">技术分享</option><option value="项目汇报">项目汇报</option>
        </select>
        <input v-model="startTime" @input="autoSave" type="date" class="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none" />
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
                :disabled="store.slides.length <= 1 || slide.layout === 'cover' || slide.layout === 'closing'"
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
import { updateProjectMeta, updateSlide, createProject, getProject } from '../services/storage'
import { AIService } from '../services/ai-provider'
import AppShell from '../components/layout/AppShell.vue'

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

// ---- Current slide computed ----
const currentSlide = computed(() => {
  const s = store.currentSlide
  return { title: s.title || '', content: s.content || '', duration: s.duration || 120, narration: s.narration || '', keyPoints: s.keyPoints || [], keywords: s.keywords || [], tips: s.tips || [], layout: s.layout || 'content' }
})

// ---- Editable content ----
const editableContent = ref('')
const originalContent = ref('')
const editMode = ref('html')
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

function onTitleEdit() { store.projectTitle = projectTitle.value; autoSave() }

async function ensureProject() {
  if (store.currentProjectId) return store.currentProjectId
  const id = await createProject({ slides: store.slides, meta: { title: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value, templateStyle: currentTheme.value.value, aiProvider: store.config.aiProvider } })
  store.currentProjectId = id; localStorage.setItem('ppt-active-project', id); return id
}

async function doSave() {
  const pid = await ensureProject()
  Object.assign(store, { projectTitle: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value })
  store.config.templateStyle = currentTheme.value.value
  localStorage.setItem('ppt-theme', currentTheme.value.value)

  const cover = store.slides[0]
  if (cover?.layout === 'cover') {
    cover.author = speaker.value; cover.department = department.value; cover.eventType = eventType.value
    cover.startTime = startTime.value ? new Date(startTime.value).toLocaleDateString('zh-CN') : ''
    cover.content = new AIService('mock', {})._renderCover(cover)
  }
  const last = store.slides[store.slides.length - 1]
  if (last?.layout === 'closing') {
    last.author = speaker.value; last.department = department.value
    last.startTime = startTime.value ? new Date(startTime.value).toLocaleDateString('zh-CN') : ''
    last.content = new AIService('mock', {})._renderClosing(last)
  }

  await updateProjectMeta(pid, { title: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value || '', templateStyle: currentTheme.value.value })
  store.updateSlide(store.currentPage, { title: currentSlide.value.title, duration: currentSlide.value.duration, narration: currentSlide.value.narration })
  await updateSlide(pid, store.currentPage, { title: currentSlide.value.title, narration: currentSlide.value.narration, content: store.currentSlide.content, duration: currentSlide.value.duration, keywords: store.currentSlide.keywords, tips: store.currentSlide.tips, keyPoints: store.currentSlide.keyPoints })

  // Sync sidebar
  shellRef.value?.load()
  saveStatus.text = '已保存'; saveStatus.class = 'text-green-500'
  document.title = (projectTitle.value || 'PPT 演讲助手编辑器') + ' — 编辑器'
  setTimeout(() => { if (saveStatus.text === '已保存') saveStatus.text = '' }, 2000)
}

function autoSave() {
  clearTimeout(saveTimer)
  saveStatus.text = '保存中...'; saveStatus.class = 'text-gray-400'
  saveTimer = setTimeout(() => doSave().catch(e => { console.warn('Save failed:', e); saveStatus.text = '失败'; saveStatus.class = 'text-red-500' }), 600)
}

function goBack() { router.push('/') }

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

onMounted(() => { syncContent(); if (!store.slides.length) restoreFromDB() })
watch(() => store.currentProjectId, (n, o) => { if (n && n !== o) restoreFromDB() })
</script>

<style>
@import '../assets/slides.css';
</style>
