<template>
  <div :class="themeClasses.bg" class="fixed inset-0 flex items-center justify-center p-12 transition-colors duration-500"
    @keydown.left.prevent="prevSlide" @keydown.right.prevent="nextSlide"
    @keydown.esc.prevent="endPresentation"
    @contextmenu.prevent="onContextMenu"
    @click="ctxVisible = false"
    tabindex="0" ref="mainEl">

    <!-- Context Menu -->
    <Teleport to="body">
      <div v-if="ctxVisible" :style="{ left: ctxX + 'px', top: ctxY + 'px' }"
        class="fixed z-[9999] min-w-[140px] py-1.5 bg-gray-900/95 backdrop-blur-md border border-gray-700/60 rounded-xl shadow-2xl"
        @click.stop>
        <button @click="ctxFirst" :disabled="currentPage <= 0"
          class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.06] disabled:opacity-25 flex items-center gap-2.5 transition-colors">
          <span>⏮</span> 首页
        </button>
        <button @click="ctxPrev" :disabled="currentPage <= 0"
          class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.06] disabled:opacity-25 flex items-center gap-2.5 transition-colors">
          <span>←</span> 上一页
        </button>
        <button @click="ctxNext" :disabled="currentPage >= slides.length - 1"
          class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.06] disabled:opacity-25 flex items-center gap-2.5 transition-colors">
          <span>→</span> 下一页
        </button>
        <button @click="ctxLast" :disabled="currentPage >= slides.length - 1"
          class="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-white/[0.06] disabled:opacity-25 flex items-center gap-2.5 transition-colors">
          <span>⏭</span> 最后一页
        </button>
        <div class="my-1 border-t border-gray-700/40"></div>
        <button @click="toggleFullscreen"
          class="w-full px-4 py-2 text-left text-sm text-gray-400 hover:bg-white/[0.06] flex items-center gap-2.5 transition-colors">
          <span>⛶</span> {{ isFullscreen ? '退出全屏' : '进入全屏' }}
        </button>
        <button @click="endPresentation"
          class="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-400/8 flex items-center gap-2.5 transition-colors">
          <span>✕</span> 结束放映
        </button>
      </div>
    </Teleport>

    <div class="w-full max-w-5xl text-center">
      <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section' && currentSlide.layout !== 'closing' && currentSlide.layout !== 'toc'" :class="themeClasses.title" class="text-5xl font-bold mb-8">{{ currentSlide.title }}</h2>
      <div :class="themeClasses.body" class="text-2xl leading-relaxed slide-body" v-html="currentSlide.content"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSync } from '../utils/sync'

const sync = useSync()
const router = useRouter()
const mainEl = ref(null)

// --- State ---
const slides = ref([])
const currentPage = ref(0)

const currentSlide = computed(() => slides.value[currentPage.value] || {})

// --- Context Menu ---
const ctxVisible = ref(false)
const ctxX = ref(0)
const ctxY = ref(0)
const isFullscreen = ref(false)

function updateFullscreenState() {
  isFullscreen.value = !!(document.fullscreenElement || (window.electronAPI && window.electronAPI.isFullscreen?.()))
}

function onContextMenu(e) {
  ctxX.value = Math.min(e.clientX, window.innerWidth - 160)
  ctxY.value = Math.min(e.clientY, window.innerHeight - 200)
  ctxVisible.value = true
}

function ctxPrev() { ctxVisible.value = false; prevSlide() }
function ctxNext() { ctxVisible.value = false; nextSlide() }
function ctxFirst() { ctxVisible.value = false; goToSlide(0) }
function ctxLast() { ctxVisible.value = false; goToSlide(slides.value.length - 1) }
function toggleFullscreen() {
  ctxVisible.value = false
  if (window.electronAPI) {
    window.electronAPI.toggleFullscreen()
  } else if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    document.documentElement.requestFullscreen()
  }
}
function endPresentation() {
  ctxVisible.value = false
  sync.broadcastPresentationEnd()
  if (window.electronAPI) {
    window.electronAPI.closeNarratorWindow()
    window.electronAPI.closeSelf()
  } else {
    router.push('/editor')
  }
}

// --- Navigation ---
function goToSlide(index) {
  if (index < 0 || index >= slides.value.length) return
  currentPage.value = index
  sync.broadcastPageChange(index, slides.value[index]?.narration)
}

function prevSlide() { if (currentPage.value > 0) goToSlide(currentPage.value - 1) }
function nextSlide() { if (currentPage.value < slides.value.length - 1) goToSlide(currentPage.value + 1) }

// --- Theme Config ---
const themeConfig = {
  business:  { bg: 'bg-gradient-to-br from-slate-800 to-blue-950',   title: 'text-white',       body: 'text-blue-100' },
  tech:      { bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', title: 'text-cyan-300', body: 'text-slate-300' },
  minimal:   { bg: 'bg-gradient-to-br from-white to-gray-50',        title: 'text-gray-900',    body: 'text-gray-600' },
  education: { bg: 'bg-gradient-to-br from-emerald-50 to-white',     title: 'text-emerald-800', body: 'text-gray-700' }
}
const themeClasses = computed(() => {
  const saved = localStorage.getItem('ppt-theme')
  return themeConfig[saved] || themeConfig.business
})

// --- Lifecycle ---
onMounted(() => {
  document.addEventListener('fullscreenchange', updateFullscreenState)
  const saved = localStorage.getItem('ppt-slides')
  if (saved && slides.value.length === 0) {
    try { slides.value = JSON.parse(saved) } catch (e) { /* ignore */ }
    document.title = slides.value[0]?.title || 'PPT 演讲助手'
  }

  // Notify Narrator of the current slides (handles project switch)
  if (slides.value.length > 0) {
    sync.broadcastPresentationStart(slides.value)
    sync.broadcastPageChange(0, slides.value[0]?.narration)
  }

  sync.on('PAGE_CHANGE', (data) => {
    currentPage.value = data.pageIndex
  })

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides
    currentPage.value = 0
    document.title = data.slides[0]?.title || 'PPT 演讲助手'
  })

  mainEl.value?.focus()
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', updateFullscreenState)
  sync.off('PAGE_CHANGE')
  sync.off('PRESENTATION_START')
})
</script>


<style>
@import '../assets/slides.css';
</style>
