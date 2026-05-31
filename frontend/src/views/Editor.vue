<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="text-gray-600 hover:text-gray-900 shrink-0">← 返回</button>
          <input v-model="projectTitle" @input="autoSave" class="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-48" placeholder="未命名项目" />
          <span class="text-gray-300">|</span>
          <input v-model="speaker" @input="autoSave" class="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-20" placeholder="演讲者" />
          <input v-model="department" @input="autoSave" class="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-24" placeholder="部门/公司" />
          <select v-model="eventType" @change="autoSave" class="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1">
            <option value="内部技术讲座">内部技术讲座</option>
            <option value="内部培训">内部培训</option>
            <option value="技术分享">技术分享</option>
            <option value="项目汇报">项目汇报</option>
          </select>
          <input v-model="startTime" @input="autoSave" type="date" class="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-36" />
          <span class="text-gray-300">|</span>
          <select v-model="currentTheme" @change="autoSave" class="text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1">
            <option v-for="t in themes" :key="t.value" :value="t">{{ t.label }}</option>
          </select>
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-xs" :class="saveStatus.class">{{ saveStatus.text }}</span>
          <span class="text-sm text-gray-600">{{ store.currentPage + 1 }} / {{ store.totalPages }}</span>
          <button @click="startPresentation" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">开始演示</button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex h-[calc(100vh-60px)]">
      <!-- Left: Slide List -->
      <div class="w-1/3 bg-white border-r overflow-y-auto">
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-sm font-medium text-gray-600">页面预览</h2>
            <span class="text-xs text-gray-400">拖拽排序</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="(slide, index) in store.slides"
              :key="index"
              draggable="true"
              @dragstart="onDragStart($event, index)"
              @dragover.prevent="onDragOver($event, index)"
              @drop="onDrop($event, index)"
              @dragend="dragIdx = null"
              @click="store.changePage(index)"
              :class="[store.currentPage === index ? 'bg-blue-50 border-blue-500' : 'bg-gray-100 border-gray-300 hover:bg-gray-200', dragIdx === index ? 'opacity-40' : '']"
              class="p-2 border-2 rounded cursor-pointer transition-all group flex items-center gap-2"
            >
              <span class="text-gray-300 text-xs cursor-grab shrink-0">⠿</span>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">{{ slide.title || `页面 ${index + 1}` }}</div>
                <div class="text-gray-400 mt-0.5" style="font-size: 11px">{{ slide.layout }} · {{ slide.duration }}秒</div>
              </div>
              <button @click.stop="deleteSlide(index)" :disabled="store.slides.length <= 1" class="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-xs disabled:hidden">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Slide Editor -->
      <div class="w-2/3 p-6 overflow-y-auto">
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4">页面内容</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
            <input v-model="currentSlide.title" @input="autoSave" type="text" class="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">演讲时长 (秒)</label>
            <input v-model.number="currentSlide.duration" @input="autoSave" type="number" min="10" max="600" class="w-32 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500" />
          </div>

          <!-- Editable Content -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">页面内容 HTML</label>
              <button @click="resetContent" :disabled="!isContentModified" class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed">↺ 重置</button>
            </div>
            <textarea
              v-model="editableContent"
              @input="onContentEdit"
              rows="12"
              class="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            ></textarea>
          </div>

          <!-- Live Preview -->
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-gray-700">实时预览</label>
              <button @click="previewFull = true" class="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded">⛶ 全屏</button>
            </div>
            <div :class="[currentTheme.bg, currentTheme.body]" class="p-4 border rounded overflow-auto max-h-48">
              <div v-html="editableContent" class="prose prose-sm"></div>
            </div>
          </div>

          <!-- Fullscreen Preview Overlay -->
          <div v-if="previewFull" :class="[currentTheme.bg, currentTheme.body]" class="fixed inset-0 z-50 flex items-center justify-center p-8" @click.self="previewFull = false">
            <button @click="previewFull = false" class="absolute top-4 right-4 text-2xl hover:text-gray-300" :class="currentTheme.body">✕</button>
            <div class="w-full max-w-5xl max-h-full overflow-auto">
              <div v-html="editableContent" class="slide-body"></div>
            </div>
          </div>

          <!-- Key Points -->
          <div v-if="currentSlide.keyPoints.length" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">核心要点</label>
            <div class="space-y-2">
              <div v-for="(point, i) in currentSlide.keyPoints" :key="i" class="flex items-center space-x-2"><span class="text-blue-500">•</span><span class="text-sm">{{ point }}</span></div>
            </div>
          </div>
        </div>

        <!-- Narration Editor -->
        <div class="bg-white rounded-lg shadow p-6 mt-6">
          <h3 class="text-lg font-semibold mb-4">演讲旁白</h3>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">旁白内容</label>
            <textarea v-model="currentSlide.narration" @input="autoSave" rows="8" class="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
          <div v-if="currentSlide.keywords.length" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">关键词提示</label>
            <div class="flex flex-wrap gap-2">
              <span v-for="(kw, i) in currentSlide.keywords" :key="i" class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{{ kw }}</span>
            </div>
          </div>
          <div v-if="currentSlide.tips.length" class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">演讲提示</label>
            <div class="space-y-2">
              <div v-for="(tip, i) in currentSlide.tips" :key="i" class="flex items-start space-x-2"><span class="text-yellow-500">💡</span><span class="text-sm text-gray-600">{{ tip }}</span></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { updateProjectMeta, updateSlide, updateProjectSlides, createProject, getProject } from '../services/storage'
import { AIService } from '../services/ai-provider'

const router = useRouter()
const store = usePPTStore()

// ---- Theme ----
const themes = [
  { value: 'business',  label: '商务', bg: 'bg-gradient-to-br from-slate-800 to-blue-950',         body: 'text-blue-100' },
  { value: 'tech',      label: '科技', bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', body: 'text-slate-300' },
  { value: 'minimal',   label: '简约', bg: 'bg-gradient-to-br from-white to-gray-50',              body: 'text-gray-600' },
  { value: 'education', label: '教育', bg: 'bg-gradient-to-br from-emerald-50 to-white',           body: 'text-gray-700' },
]
const currentTheme = ref(themes.find(t => t.value === store.config.templateStyle) || themes[0])

watch(currentTheme, (t) => {
  store.setTemplateStyle(t.value)
  autoSave()
})

const currentSlide = computed(() => {
  const s = store.currentSlide
  return { title: s.title || '', content: s.content || '<p>暂无内容</p>', duration: s.duration || 120, narration: s.narration || '', keyPoints: s.keyPoints || [], keywords: s.keywords || [], tips: s.tips || [] }
})

// ---- Editable content with reset ----
const editableContent = ref('')
const originalContent = ref('')
const previewFull = ref(false)
let contentSaveTimer = null

const isContentModified = computed(() => editableContent.value !== originalContent.value)

function formatHTML(html) {
  if (!html) return ''
  // Indent HTML for readability
  let indent = 0
  const lines = html
    .replace(/></g, '>\n<')
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      // Decrease indent for closing tags
      if (trimmed.match(/^<\/\w/)) indent = Math.max(0, indent - 1)
      const out = '  '.repeat(indent) + trimmed
      // Increase indent for opening tags (not self-closing)
      if (trimmed.match(/^<\w[^>]*[^/]>$/) && !trimmed.match(/^<(br|hr|img|input|link|meta)[^>]*>/i) && !trimmed.match(/^<\/|^<.*<\/.*>/)) indent++
      return out
    })
  return lines.filter(l => l !== '').join('\n')
}

function syncContent() {
  const c = store.currentSlide.content || '<p>暂无内容</p>'
  editableContent.value = formatHTML(c)
  originalContent.value = formatHTML(c)
}

watch(() => store.currentPage, syncContent)

function onContentEdit() {
  store.updateSlide(store.currentPage, { content: editableContent.value })
  clearTimeout(contentSaveTimer)
  contentSaveTimer = setTimeout(autoSave, 400)
}

function resetContent() {
  editableContent.value = originalContent.value
  store.updateSlide(store.currentPage, { content: originalContent.value })
  autoSave()
}

// ---- Drag-to-reorder ----
const dragIdx = ref(null)

function onDragStart(e, idx) { dragIdx.value = idx; e.dataTransfer.effectAllowed = 'move' }
function onDragOver(e, idx) { if (dragIdx.value != null && dragIdx.value !== idx) e.dataTransfer.dropEffect = 'move' }
function onDrop(e, targetIdx) {
  if (dragIdx.value == null || dragIdx.value === targetIdx) return
  const slides = [...store.slides]
  const [moved] = slides.splice(dragIdx.value, 1)
  slides.splice(targetIdx, 0, moved)
  store.slides = slides
  store.currentPage = targetIdx
  dragIdx.value = null
  syncContent()
  autoSave()
}

function deleteSlide(idx) {
  if (store.slides.length <= 1) return
  if (!confirm(`确定删除第 ${idx + 1} 页「${store.slides[idx].title || '无标题'}」吗？`)) return
  if (store.slides[idx].layout === 'closing') { alert('不能删除尾页'); return }
  if (store.slides[idx].layout === 'cover') { alert('不能删除封面'); return }
  store.slides = store.slides.filter((_, i) => i !== idx)
  if (store.currentPage >= store.slides.length) store.currentPage = store.slides.length - 1
  syncContent()
  autoSave()
}

// ---- Meta ----
const projectTitle = ref(store.projectTitle)
const speaker = ref(store.speaker)
const department = ref(store.department)
const eventType = ref(store.eventType)
const startTime = ref(store.startTime)
const saveStatus = reactive({ text: '', class: 'text-gray-400' })
let saveTimer = null

async function ensureProject() {
  if (store.currentProjectId) return store.currentProjectId
  const id = await createProject({ slides: store.slides, meta: { title: projectTitle.value, speaker: speaker.value, department: department.value, eventType: eventType.value, startTime: startTime.value, templateStyle: currentTheme.value.value, aiProvider: store.config.aiProvider } })
  store.currentProjectId = id; store.projectTitle = projectTitle.value; store.speaker = speaker.value
  localStorage.setItem('ppt-active-project', id)
  return id
}

async function doSave() {
  const pid = await ensureProject()
  store.projectTitle = projectTitle.value; store.speaker = speaker.value
  store.department = department.value; store.eventType = eventType.value
  store.startTime = startTime.value
  store.config.templateStyle = currentTheme.value.value
  localStorage.setItem('ppt-theme', currentTheme.value.value)

  const cover = store.slides[0]
  if (cover?.layout === 'cover') {
    cover.author = speaker.value; cover.department = department.value
    cover.eventType = eventType.value
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

  saveStatus.text = '已自动保存'; saveStatus.class = 'text-green-500'
  document.title = (projectTitle.value || 'PPT 演讲助手编辑器') + ' — 编辑器'
  setTimeout(() => { if (saveStatus.text === '已自动保存') saveStatus.text = '' }, 2000)
}

function autoSave() {
  clearTimeout(saveTimer)
  saveStatus.text = '保存中...'; saveStatus.class = 'text-gray-400'
  saveTimer = setTimeout(() => doSave().catch(e => { console.warn('Auto-save failed:', e); saveStatus.text = '保存失败'; saveStatus.class = 'text-red-500' }), 600)
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

onMounted(async () => {
  syncContent()
  if (store.slides.length === 0) {
    const id = store.currentProjectId || Number(localStorage.getItem('ppt-active-project'))
    if (id) {
      try {
        const project = await getProject(id)
        if (project) {
          store.setSlides(project.slides); store.currentProjectId = project.id
          store.projectTitle = project.title || '未命名项目'; store.speaker = project.speaker || ''
          store.department = project.department || ''; store.eventType = project.event_type || '内部技术讲座'
          store.startTime = project.start_time || ''
          store.setTemplateStyle(project.template_style || 'business'); store.setAIProvider(project.ai_provider || 'gateway')
          localStorage.setItem('ppt-theme', project.template_style || 'business')
          projectTitle.value = store.projectTitle; speaker.value = store.speaker
          department.value = store.department; eventType.value = store.eventType; startTime.value = store.startTime
          syncContent()
          document.title = (store.projectTitle || 'PPT 演讲助手编辑器') + ' — 编辑器'
          currentTheme.value = themes.find(t => t.value === store.config.templateStyle) || themes[0]
        } else { router.replace('/') }
      } catch (e) { console.warn('Restore failed:', e); router.replace('/') }
    } else { router.replace('/') }
  }
})
</script>
<style>
@import '../assets/slides.css';
</style>
