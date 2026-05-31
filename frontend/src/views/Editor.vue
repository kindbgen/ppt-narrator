<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <div class="flex items-center space-x-4">
          <button @click="goBack" class="text-gray-600 hover:text-gray-900 shrink-0">
            ← 返回
          </button>
          <input
            v-model="projectTitle"
            @input="autoSave"
            class="text-lg font-semibold bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-48"
            placeholder="未命名项目"
          />
          <input
            v-model="speaker"
            @input="autoSave"
            class="text-sm text-gray-500 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-400 focus:outline-none px-1 w-32"
            placeholder="演讲者"
          />
        </div>
        <div class="flex items-center space-x-4">
          <span class="text-xs" :class="saveStatus.class">{{ saveStatus.text }}</span>
          <span class="text-sm text-gray-600">
            {{ store.currentPage + 1 }} / {{ store.totalPages }}
          </span>
          <button @click="startPresentation" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            开始演示
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex h-[calc(100vh-60px)]">
      <!-- Left: Slide Preview -->
      <div class="w-1/3 bg-white border-r overflow-y-auto">
        <div class="p-4">
          <h2 class="text-sm font-medium text-gray-600 mb-3">页面预览</h2>
          <div class="space-y-2">
            <div
              v-for="(slide, index) in store.slides"
              :key="index"
              @click="store.changePage(index)"
              :class="store.currentPage === index ? 'bg-blue-50 border-blue-500' : 'bg-gray-100 border-gray-300 hover:bg-gray-200'"
              class="p-3 border-2 rounded cursor-pointer transition-all"
            >
              <div class="font-medium text-sm">{{ slide.title || `页面 ${index + 1}` }}</div>
              <div class="text-xs text-gray-500 mt-1">
                预计时长: {{ slide.duration }}秒
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Center: Current Slide Editor -->
      <div class="w-2/3 p-6 overflow-y-auto">
        <!-- Slide Content -->
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-lg font-semibold mb-4">页面内容</h3>

          <!-- Title -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">标题</label>
            <input
              v-model="currentSlide.title"
              @input="autoSave"
              type="text"
              class="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Duration -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">演讲时长 (秒)</label>
            <input
              v-model.number="currentSlide.duration"
              @input="autoSave"
              type="number"
              min="30"
              max="600"
              class="w-32 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Content Preview -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">内容预览</label>
            <div class="p-4 bg-gray-50 border rounded overflow-auto max-h-64">
              <div v-html="currentSlide.content" class="prose prose-sm"></div>
            </div>
          </div>

          <!-- Key Points -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">核心要点</label>
            <div class="space-y-2">
              <div v-for="(point, index) in currentSlide.keyPoints" :key="index" class="flex items-center space-x-2">
                <span class="text-blue-500">•</span>
                <span class="text-sm">{{ point }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Narration Editor -->
        <div class="bg-white rounded-lg shadow p-6 mt-6">
          <h3 class="text-lg font-semibold mb-4">演讲旁白</h3>

          <!-- Narration Text -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">旁白内容</label>
            <textarea
              v-model="currentSlide.narration"
              @input="autoSave"
              rows="8"
              class="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <!-- Keywords -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">关键词提示</label>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(keyword, index) in currentSlide.keywords"
                :key="index"
                class="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {{ keyword }}
              </span>
            </div>
          </div>

          <!-- Tips -->
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">演讲提示</label>
            <div class="space-y-2">
              <div v-for="(tip, index) in currentSlide.tips" :key="index" class="flex items-start space-x-2">
                <span class="text-yellow-500">💡</span>
                <span class="text-sm text-gray-600">{{ tip }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePPTStore } from '../stores/ppt'
import { updateProjectMeta, updateSlide, updateProjectSlides, createProject, getProject } from '../services/storage'

const router = useRouter()
const store = usePPTStore()

const currentSlide = computed(() => {
  const slide = store.currentSlide
  return {
    title: slide.title || '',
    content: slide.content || '<p>暂无内容</p>',
    duration: slide.duration || 120,
    narration: slide.narration || '',
    keyPoints: slide.keyPoints || [],
    keywords: slide.keywords || [],
    tips: slide.tips || []
  }
})

const projectTitle = ref(store.projectTitle)
const speaker = ref(store.speaker)

const saveStatus = reactive({ text: '', class: 'text-gray-400' })

let saveTimer = null

// ---- Ensure project exists (create lazily) ----
async function ensureProject() {
  if (store.currentProjectId) return store.currentProjectId

  const id = await createProject({
    slides: store.slides,
    meta: {
      title: projectTitle.value,
      speaker: speaker.value,
      templateStyle: store.config.templateStyle,
      aiProvider: store.config.aiProvider
    }
  })
  store.currentProjectId = id
  store.projectTitle = projectTitle.value
  store.speaker = speaker.value
  localStorage.setItem('ppt-active-project', id)
  return id
}

// ---- Auto-save ----
async function doSave() {
  const pid = await ensureProject()
  store.projectTitle = projectTitle.value
  store.speaker = speaker.value

  // Save meta
  await updateProjectMeta(pid, {
    title: projectTitle.value,
    speaker: speaker.value
  })

  // Save current slide fields
  store.updateSlide(store.currentPage, {
    title: currentSlide.value.title,
    duration: currentSlide.value.duration,
    narration: currentSlide.value.narration
  })

  await updateSlide(pid, store.currentPage, {
    title: currentSlide.value.title,
    narration: currentSlide.value.narration,
    content: store.currentSlide.content,
    duration: currentSlide.value.duration,
    keywords: store.currentSlide.keywords,
    tips: store.currentSlide.tips,
    keyPoints: store.currentSlide.keyPoints
  })

  saveStatus.text = '已自动保存'
  saveStatus.class = 'text-green-500'
  setTimeout(() => { if (saveStatus.text === '已自动保存') { saveStatus.text = '' } }, 2000)
}

function autoSave() {
  clearTimeout(saveTimer)
  saveStatus.text = '保存中...'
  saveStatus.class = 'text-gray-400'
  saveTimer = setTimeout(() => {
    doSave().catch(e => {
      console.warn('Auto-save failed:', e)
      saveStatus.text = '保存失败'
      saveStatus.class = 'text-red-500'
    })
  }, 600)
}

function goBack() {
  router.push('/')
}

function startPresentation() {
  // 先保存再演示
  clearTimeout(saveTimer)
  doSave().finally(() => {
    localStorage.setItem('ppt-slides', JSON.stringify(store.slides))
    const w = 1200
    const h = 780
    const left = Math.round((screen.width - w) / 2)
    const top = Math.round((screen.height - h) / 2)
    window.open('/narrator', 'narrator', `width=${w},height=${h},left=${left},top=${top}`)
    router.push('/presenter')
  })
}

// Refresh recovery: restore project from SQLite if store is empty
onMounted(async () => {
  if (store.slides.length === 0) {
    const id = store.currentProjectId || Number(localStorage.getItem('ppt-active-project'))
    if (id) {
      try {
        const project = await getProject(id)
        if (project) {
          store.setSlides(project.slides)
          store.currentProjectId = project.id
          store.projectTitle = project.title || '未命名项目'
          store.speaker = project.speaker || ''
          store.setTemplateStyle(project.template_style || 'business')
          store.setAIProvider(project.ai_provider || 'gateway')
          projectTitle.value = store.projectTitle
          speaker.value = store.speaker
        } else {
          router.replace('/')
        }
      } catch (e) {
        console.warn('Failed to restore project on refresh:', e)
        router.replace('/')
      }
    } else {
      router.replace('/')
    }
  }
})
</script>
