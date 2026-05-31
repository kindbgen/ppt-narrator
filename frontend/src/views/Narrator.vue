<template>
  <div
    class="fixed inset-0 flex bg-gray-900 text-white overflow-hidden"
    @keydown.left.prevent="prevSlide"
    @keydown.right.prevent="nextSlide"
    @keydown.space.prevent="togglePause"
    tabindex="0"
    ref="mainEl"
  >
    <!-- ============ 左侧：旁白笔记 (40%) ============ -->
    <div class="w-[40%] flex flex-col border-r border-gray-700 bg-gray-950">
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <h1 class="text-sm font-semibold text-gray-300">演讲旁白参考</h1>
        <span class="text-xs text-gray-500">{{ currentPage + 1 }} / {{ slides.length }}</span>
      </div>

      <!-- Narration Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Slide Title -->
        <div class="mb-3">
          <span class="text-xs text-gray-500 uppercase tracking-wide">当前页面</span>
          <h2 class="text-lg font-bold text-white mt-0.5">{{ currentSlide.title }}</h2>
          <span class="text-xs text-gray-500">{{ currentSlide.layout }} · {{ currentSlide.duration }}秒</span>
        </div>

        <!-- Timer -->
        <div class="mb-4 p-3 rounded-lg bg-gray-800">
          <div class="flex items-center justify-between">
            <span class="text-xs text-gray-400">剩余时间</span>
            <span :class="timerColor" class="text-3xl font-bold font-mono">{{ formatTime(remaining) }}</span>
            <span class="text-xs text-gray-500">/ {{ formatTime(currentSlide.duration || 120) }}</span>
          </div>
          <div class="mt-2 bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              :class="timerBarColor"
              class="h-full transition-all duration-1000"
              :style="{ width: timerPercent + '%' }"
            ></div>
          </div>
        </div>

        <!-- Narration Text -->
        <div class="mb-4">
          <span class="text-xs text-gray-500 uppercase tracking-wide">旁白内容</span>
          <p class="text-gray-300 leading-relaxed mt-1 text-sm whitespace-pre-wrap">{{ currentSlide.narration || '暂无旁白' }}</p>
        </div>

        <!-- Keywords -->
        <div v-if="currentSlide.keywords && currentSlide.keywords.length > 0" class="mb-4">
          <span class="text-xs text-gray-500 uppercase tracking-wide">关键词</span>
          <div class="flex flex-wrap gap-1.5 mt-1">
            <span
              v-for="(kw, i) in currentSlide.keywords"
              :key="i"
              class="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs"
            >{{ kw }}</span>
          </div>
        </div>

        <!-- Tips -->
        <div v-if="currentSlide.tips && currentSlide.tips.length > 0">
          <span class="text-xs text-gray-500 uppercase tracking-wide">演讲提示</span>
          <div class="mt-1 space-y-1">
            <div v-for="(tip, i) in currentSlide.tips" :key="i" class="text-xs text-blue-400 flex gap-1.5">
              <span>💡</span>
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Page Thumbnails -->
      <div class="shrink-0 border-t border-gray-800 px-3 py-2 flex gap-1.5 overflow-x-auto">
        <button
          v-for="(slide, i) in slides"
          :key="i"
          @click="goToPage(i)"
          :class="currentPage === i
            ? 'bg-blue-500/30 border-blue-400 text-white'
            : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'"
          class="shrink-0 w-10 h-7 border rounded text-xs flex items-center justify-center transition-colors"
        >{{ i + 1 }}</button>
      </div>
    </div>

    <!-- ============ 右侧：PPT 预览 + 控制 (60%) ============ -->
    <div class="flex-1 flex flex-col bg-gray-800">
      <!-- PPT Preview Area -->
      <div :class="themeClasses.bg" class="flex-1 flex items-center justify-center p-6 transition-colors duration-500">
        <div class="w-full max-w-3xl text-center">
          <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section' && currentSlide.layout !== 'closing'" :class="themeClasses.title" class="text-3xl font-bold mb-4">{{ currentSlide.title }}</h2>
          <div :class="themeClasses.body" class="text-lg leading-relaxed slide-body" v-html="currentSlide.content"></div>
        </div>
      </div>

      <!-- Controls Bar -->
      <div class="flex items-center justify-between bg-gray-900 px-6 py-3 shrink-0">
        <!-- Navigation -->
        <div class="flex items-center gap-2">
          <button
            @click="prevSlide"
            :disabled="currentPage <= 0"
            class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >← 上一页</button>
          <button
            @click="nextSlide"
            :disabled="currentPage >= slides.length - 1"
            class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded text-sm transition-colors"
          >下一页 →</button>
        </div>

        <!-- Page Indicator -->
        <div class="flex items-center gap-3">
          <div class="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div class="h-full bg-blue-500 transition-all duration-300" :style="{ width: (currentPage + 1) / slides.length * 100 + '%' }"></div>
          </div>
          <span class="text-xs text-gray-400 font-mono">{{ currentPage + 1 }} / {{ slides.length }}</span>
        </div>

        <!-- Timer Controls -->
        <div class="flex items-center gap-2">
          <button @click="togglePause" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
            {{ isPaused ? '▶ 继续' : '⏸ 暂停' }}
          </button>
          <button @click="resetTimer" class="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
            ↺ 重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSync } from '../utils/sync'

const sync = useSync()
const mainEl = ref(null)

// --- State ---
const slides = ref([])
const currentPage = ref(0)
const remaining = ref(120)
const isPaused = ref(false)
let timerInterval = null

// --- Current Slide ---
const currentSlide = computed(() => slides.value[currentPage.value] || {})

// --- Theme Config ---
const themeConfig = {
  business:  { bg: 'bg-gradient-to-br from-slate-800 to-blue-950',   title: 'text-white',       body: 'text-blue-100' },
  tech:      { bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', title: 'text-cyan-300', body: 'text-slate-300' },
  minimal:   { bg: 'bg-gradient-to-br from-white to-gray-50',        title: 'text-gray-900',    body: 'text-gray-600' },
  education: { bg: 'bg-gradient-to-br from-emerald-50 to-white',     title: 'text-emerald-800', body: 'text-gray-700' }
}
const themeClasses = computed(() => themeConfig.business)

// --- Timer ---
const timerColor = computed(() => {
  if (remaining.value > 30) return 'text-green-400'
  if (remaining.value > 10) return 'text-yellow-400'
  return 'text-red-400'
})

const timerBarColor = computed(() => {
  if (remaining.value > 30) return 'bg-green-500'
  if (remaining.value > 10) return 'bg-yellow-500'
  return 'bg-red-500'
})

const timerPercent = computed(() => {
  const dur = currentSlide.value.duration || 120
  return Math.round(remaining.value / dur * 100)
})

function formatTime(seconds) {
  if (seconds < 0) seconds = 0
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    if (!isPaused.value && remaining.value > 0) {
      remaining.value--
      sync.broadcastTimerUpdate(0, remaining.value)
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function resetTimer() {
  remaining.value = currentSlide.value.duration || 120
  isPaused.value = false
  startTimer()
}

function togglePause() {
  isPaused.value = !isPaused.value
  if (!isPaused.value) startTimer()
}

// --- Navigation ---
function goToPage(index) {
  currentPage.value = index
  resetTimer()
  sync.broadcastPageChange(index, currentSlide.value.narration)
}

function nextSlide() {
  if (currentPage.value < slides.value.length - 1) {
    currentPage.value++
    resetTimer()
    sync.broadcastPageChange(currentPage.value, currentSlide.value.narration)
  }
}

function prevSlide() {
  if (currentPage.value > 0) {
    currentPage.value--
    resetTimer()
    sync.broadcastPageChange(currentPage.value, currentSlide.value.narration)
  }
}

// --- Lifecycle ---
onMounted(() => {
  document.title = 'PPT演讲助手'
  // Restore data from localStorage
  const saved = localStorage.getItem('ppt-slides')
  if (saved) {
    try { slides.value = JSON.parse(saved) } catch (e) { /* ignore */ }
  }

  // Listen for presentation start (from editor/home)
  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides
    currentPage.value = 0
    resetTimer()
  })

  // Broadcast initial state so Presenter can sync (handles window-open race)
  if (slides.value.length > 0) {
    sync.broadcastPresentationStart(slides.value)
    sync.broadcastPageChange(0, slides.value[0]?.narration)
    resetTimer()
  }

  // Auto-focus for keyboard shortcuts
  mainEl.value?.focus()
})

onUnmounted(() => {
  stopTimer()
  sync.off('PRESENTATION_START')
  sync.broadcastPresentationEnd()
})
</script>


<style>
@import '../assets/slides.css';
</style>
