<template>
  <div class="fixed inset-0 flex bg-gray-950 overflow-hidden font-sans"
    @keydown.left.prevent="prevSlide" @keydown.right.prevent="nextSlide" @keydown.space.prevent="togglePause"
    tabindex="0" ref="mainEl">

    <!-- Left: Narration Panel (35%) -->
    <div class="w-[35%] flex flex-col border-r border-gray-800/40 bg-gray-950">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-800/30 shrink-0">
        <div class="flex items-center gap-3">
          <button @click="goBack" class="text-gray-600 hover:text-gray-400 transition-colors" title="返回编辑器">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <span class="text-[10px] font-semibold text-gray-500 uppercase tracking-[0.15em]">演讲旁白</span>
        </div>
        <div class="flex items-center gap-4 text-[11px] text-gray-600 tabular-nums">
          <span>{{ totalDuration }}</span>
          <span class="text-gray-500 font-medium">{{ currentPage + 1 }}/{{ slides.length }}</span>
        </div>
      </div>

      <!-- Timer Card -->
      <div class="px-5 py-3 border-b border-gray-800/20 shrink-0">
        <div class="bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
          <div class="flex items-baseline gap-2 mb-2">
            <span class="text-[10px] font-medium text-gray-600 uppercase tracking-wider">剩余</span>
            <span :class="timerColor" class="text-4xl font-bold tabular-nums leading-none tracking-tight">{{ formatTime(remaining) }}</span>
            <span class="text-[11px] text-gray-600">/ {{ formatTime(currentSlide.duration || 120) }}</span>
          </div>
          <div class="h-1 bg-gray-800 rounded-full overflow-hidden mb-2">
            <div :class="timerBarColor" class="h-full transition-all duration-1000 rounded-full" :style="{ width: timerPercent + '%' }"></div>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-gray-600">已过</span>
            <span :class="elapsedColor" class="text-xs font-bold tabular-nums">{{ formatElapsed }}</span>
          </div>
        </div>
      </div>

      <!-- Page Tabs -->
      <div class="px-3 py-2 border-b border-gray-800/20">
        <div ref="pageListRef" class="flex gap-1 overflow-x-auto scrollbar-none">
          <button v-for="(s, i) in slides" :key="i" @click="goToPage(i)" :data-page="i"
            :class="currentPage === i ? 'bg-white/12 text-white ring-1 ring-white/8' : 'text-gray-600 hover:text-gray-300 hover:bg-white/3'"
            class="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all" :title="s.title">
            <span :class="pageDotColor(s.layout)" class="w-1.5 h-1.5 rounded-full shrink-0"></span>
            {{ i + 1 }}. {{ s.title?.slice(0, 8) }}{{ s.title?.length > 8 ? '…' : '' }}
          </button>
        </div>
      </div>

      <!-- Narration Content — THE MAIN FOCUS -->
      <div class="flex-1 overflow-y-auto">
        <div class="p-5 space-y-5">
          <div>
            <span class="text-[10px] font-medium text-gray-600 uppercase tracking-wider">当前页面</span>
            <h2 class="text-lg font-semibold text-white/90 mt-1.5 leading-snug">{{ currentSlide.title }}</h2>
          </div>

          <div class="bg-white/[0.02] rounded-xl p-4 border border-white/[0.04]">
            <p class="text-gray-200 leading-relaxed text-[15px] whitespace-pre-wrap">{{ currentSlide.narration || '暂无旁白' }}</p>
          </div>

          <div v-if="currentSlide.keywords?.length" class="flex flex-wrap gap-1.5">
            <span v-for="(kw, i) in currentSlide.keywords" :key="i" class="px-2 py-0.5 bg-amber-400/8 text-amber-400/80 rounded-md text-[11px] font-medium">{{ kw }}</span>
          </div>

          <div v-if="currentSlide.tips?.length" class="space-y-1.5 pt-3 border-t border-gray-800/40">
            <div v-for="(tip, i) in currentSlide.tips" :key="i" class="text-[11px] text-blue-400/70 flex gap-2 items-start">
              <span class="shrink-0 mt-px">•</span>
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Controls — subtle, compact, one row -->
      <div class="px-5 py-3 border-t border-gray-800/30 shrink-0 flex items-center gap-1.5">
        <button @click="prevSlide" :disabled="currentPage <= 0"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] disabled:opacity-20 disabled:hover:bg-transparent transition-all">
          ← 上一页
        </button>
        <button @click="togglePause"
          :class="isPaused ? 'bg-amber-400/8 text-amber-400/90' : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'"
          class="px-4 py-1.5 rounded-lg text-xs font-medium transition-all">
          {{ isPaused ? '▶' : '⏸' }}
        </button>
        <button @click="nextSlide" :disabled="currentPage >= slides.length - 1"
          class="flex-1 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-gray-300 hover:bg-white/[0.04] disabled:opacity-20 disabled:hover:bg-transparent transition-all">
          下一页 →
        </button>
        <button @click="resetTimer"
          class="px-3 py-1.5 rounded-lg text-[11px] text-gray-600 hover:text-gray-400 hover:bg-white/[0.04] transition-all" title="重置计时">
          ↺
        </button>
      </div>
    </div>

    <!-- Right: PPT Preview (65%) -->
    <div class="flex-1 flex flex-col bg-gray-950">
      <div :class="themeClasses.bg" class="flex-1 flex items-center justify-center p-8 transition-all duration-700 relative">
        <div class="w-full max-w-4xl text-center">
          <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section' && currentSlide.layout !== 'closing' && currentSlide.layout !== 'toc'"
            :class="themeClasses.title" class="text-4xl font-bold mb-6">{{ currentSlide.title }}</h2>
          <div :key="currentPage" :class="themeClasses.body" class="text-xl leading-relaxed slide-body fade-slide">
            <div v-html="currentSlide.content"></div>
          </div>
        </div>
        <!-- Page indicator overlay -->
        <div class="absolute bottom-6 right-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-sm">
          <span :class="pageDotColor(currentSlide.layout)" class="w-2 h-2 rounded-full shrink-0"></span>
          <span class="text-xs text-white/60 tabular-nums">{{ currentPage + 1 }} / {{ slides.length }}</span>
        </div>
      </div>
      <!-- Progress bar -->
      <div class="h-0.5 bg-gray-800 shrink-0">
        <div class="h-full bg-white/30 transition-all duration-500 ease-out rounded-r-full" :style="{ width: (currentPage + 1) / slides.length * 100 + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSync } from '../utils/sync'

const sync = useSync()
const router = useRouter()
const mainEl = ref(null)
const pageListRef = ref(null)

const slides = ref([])
const currentPage = ref(0)
const remaining = ref(120)
const elapsed = ref(0)
const isPaused = ref(false)
let timerInterval = null

const currentSlide = computed(() => slides.value[currentPage.value] || {})

const totalDuration = computed(() => {
  const totalSec = slides.value.reduce((sum, s) => sum + (s.duration || 120), 0)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return sec > 0 ? `总时长 ${min} 分 ${sec} 秒` : `总时长 ${min} 分钟`
})

const totalSec = computed(() => slides.value.reduce((sum, s) => sum + (s.duration || 120), 0))
const formatElapsed = computed(() => formatTime(elapsed.value))
const elapsedColor = computed(() => elapsed.value > totalSec.value ? 'text-red-400' : 'text-gray-300')

const themeConfig = {
  business:  { bg: 'bg-gradient-to-br from-slate-800 to-blue-950', title: 'text-white', body: 'text-blue-100' },
  tech:      { bg: 'bg-gradient-to-br from-gray-950 via-slate-900 to-indigo-950', title: 'text-cyan-300', body: 'text-slate-300' },
  minimal:   { bg: 'bg-gradient-to-br from-white to-gray-50', title: 'text-gray-900', body: 'text-gray-600' },
  education: { bg: 'bg-gradient-to-br from-emerald-50 to-white', title: 'text-emerald-800', body: 'text-gray-700' }
}
const themeClasses = computed(() => themeConfig[localStorage.getItem('ppt-theme')] || themeConfig.business)

const timerColor = computed(() => remaining.value > 30 ? 'text-green-400' : remaining.value > 10 ? 'text-amber-400' : 'text-red-400')
const timerBarColor = computed(() => remaining.value > 30 ? 'bg-green-500' : remaining.value > 10 ? 'bg-amber-500' : 'bg-red-500')
const timerPercent = computed(() => Math.round(remaining.value / (currentSlide.value.duration || 120) * 100))

function pageDotColor(layout) {
  const map = { cover: 'bg-sky-400', toc: 'bg-violet-400', section: 'bg-amber-400', closing: 'bg-emerald-400' }
  return map[layout] || 'bg-gray-500'
}

function layoutLabel(layout) {
  const map = { cover: '封面', toc: '目录', section: '章节页', content: '内容', data: '数据', twocol: '双栏', table: '表格', timeline: '时间线', callout: '重点', closing: '结尾' }
  return map[layout] || layout || '内容'
}

function formatTime(s) { const m = Math.floor(Math.max(0, s) / 60); return `${m}:${String(Math.max(0, s) % 60).padStart(2, '0')}` }

watch(currentPage, async () => {
  await nextTick()
  const container = pageListRef.value
  if (!container) return
  const btn = container.querySelector(`[data-page="${currentPage.value}"]`)
  if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
})

function startTimer() { stopTimer(); timerInterval = setInterval(() => { elapsed.value++; if (!isPaused.value) { if (remaining.value > 0) remaining.value--; sync.broadcastTimerUpdate(0, remaining.value) } }, 1000) }
function stopTimer() { clearInterval(timerInterval); timerInterval = null }
function resetTimer() { remaining.value = currentSlide.value.duration || 120; isPaused.value = false; startTimer() }
function togglePause() { isPaused.value = !isPaused.value; if (!isPaused.value) startTimer() }
function goToPage(i) { currentPage.value = i; resetTimer(); sync.broadcastPageChange(i, currentSlide.value.narration) }
function nextSlide() { if (currentPage.value < slides.value.length - 1) { currentPage.value++; resetTimer(); sync.broadcastPageChange(currentPage.value, currentSlide.value.narration) } }
function prevSlide() { if (currentPage.value > 0) { currentPage.value--; resetTimer(); sync.broadcastPageChange(currentPage.value, currentSlide.value.narration) } }
function goBack() { stopTimer(); localStorage.removeItem('ppt-presentation-start'); sync.broadcastPresentationEnd(); router.push('/editor') }

onMounted(() => {
  document.title = 'PPT演讲助手'
  localStorage.removeItem('ppt-presentation-start')
  elapsed.value = 0

  const saved = localStorage.getItem('ppt-slides')
  if (saved) try { slides.value = JSON.parse(saved) } catch {}

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides; currentPage.value = 0; elapsed.value = 0
    localStorage.setItem('ppt-presentation-start', Date.now())
    resetTimer()
  })
  sync.on('PAGE_CHANGE', (data) => {
    currentPage.value = data.pageIndex
    resetTimer()
  })
  if (slides.value.length > 0) {
    localStorage.setItem('ppt-presentation-start', Date.now())
    sync.broadcastPresentationStart(slides.value); sync.broadcastPageChange(0, slides.value[0]?.narration); resetTimer()
  }
  mainEl.value?.focus()
})
onUnmounted(() => { stopTimer(); sync.off('PRESENTATION_START'); sync.off('PAGE_CHANGE'); localStorage.removeItem('ppt-presentation-start'); sync.broadcastPresentationEnd() })
</script>

<style>
@import '../assets/slides.css';
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }

/* Fade transition for slide content */
.fade-slide {
  animation: fadeSlideIn 0.4s ease-out;
}
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
