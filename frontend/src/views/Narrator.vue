<template>
  <div class="fixed inset-0 flex bg-gray-950 overflow-hidden font-sans"
    @keydown.left.prevent="prevSlide" @keydown.right.prevent="nextSlide" @keydown.space.prevent="togglePause"
    tabindex="0" ref="mainEl">

    <!-- Left: Narration (35%) -->
    <div class="w-[35%] flex flex-col border-r border-gray-800/50">
      <div class="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/30 shrink-0">
        <span class="text-xs font-medium text-gray-400 uppercase tracking-wider">演讲旁白</span>
        <div class="flex items-center gap-3">
          <span class="text-xs text-gray-600">{{ totalDuration }}</span>
          <span class="text-xs text-gray-500 tabular-nums">{{ currentPage + 1 }}/{{ slides.length }}</span>
        </div>
      </div>

      <!-- Timer -->
      <div class="px-4 py-3 border-b border-gray-800/30 shrink-0">
        <div class="flex items-baseline gap-2">
          <span class="text-xs text-gray-500">剩余</span>
          <span :class="timerColor" class="text-4xl font-bold tabular-nums leading-none">{{ formatTime(remaining) }}</span>
          <span class="text-xs text-gray-600">/ {{ formatTime(currentSlide.duration || 120) }}</span>
        </div>
        <div class="mt-2 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div :class="timerBarColor" class="h-full transition-all duration-1000 rounded-full" :style="{ width: timerPercent + '%' }"></div>
        </div>
        <div class="mt-2 flex items-center gap-2">
          <span class="text-xs text-gray-500">⏱ 已过</span>
          <span :class="elapsedColor" class="text-sm font-bold tabular-nums">{{ formatElapsed }}</span>
          <span class="text-xs text-gray-600">/ {{ totalDuration }}</span>
        </div>
      </div>

      <!-- Page List + Narration -->
      <div class="flex-1 overflow-y-auto">
        <div class="px-3 py-2 border-b border-gray-800/20">
          <div ref="pageListRef" class="flex gap-1 overflow-x-auto scrollbar-none">
            <button v-for="(s, i) in slides" :key="i" @click="goToPage(i)" :data-page="i"
              :class="currentPage === i ? 'bg-white/15 text-white ring-1 ring-white/10' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'"
              class="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all" :title="s.title">
              {{ i + 1 }}. {{ s.title?.slice(0, 8) }}{{ s.title?.length > 8 ? '…' : '' }}
            </button>
          </div>
        </div>

        <div class="p-4 space-y-4">
          <div>
            <span class="text-xs text-gray-500 uppercase tracking-wider">当前页面</span>
            <h2 class="text-base font-semibold text-white mt-1">{{ currentSlide.title }}</h2>
            <span class="text-xs text-gray-600">{{ currentSlide.layout }} · {{ currentSlide.duration }}秒</span>
          </div>
          <div>
            <span class="text-xs text-gray-500 uppercase tracking-wider">旁白内容</span>
            <p class="text-gray-300 leading-relaxed mt-1.5 text-sm whitespace-pre-wrap">{{ currentSlide.narration || '暂无旁白' }}</p>
          </div>
          <div v-if="currentSlide.keywords?.length" class="flex flex-wrap gap-1.5">
            <span v-for="(kw, i) in currentSlide.keywords" :key="i" class="px-2.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-xs">{{ kw }}</span>
          </div>
          <div v-if="currentSlide.tips?.length" class="space-y-1.5 pt-2 border-t border-gray-800/50">
            <div v-for="(tip, i) in currentSlide.tips" :key="i" class="text-xs text-blue-400/80 flex gap-1.5"><span>💡</span>{{ tip }}</div>
          </div>
        </div>
      </div>

      <!-- Controls -->
      <div class="flex items-center justify-center gap-3 px-4 py-3 border-t border-gray-800/30 shrink-0">
        <button @click="prevSlide" :disabled="currentPage <= 0" class="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-20 transition-all">← 上一页</button>
        <button @click="togglePause" class="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-all">{{ isPaused ? '▶ 继续' : '⏸ 暂停' }}</button>
        <button @click="resetTimer" class="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 transition-all">↺ 重置</button>
        <button @click="nextSlide" :disabled="currentPage >= slides.length - 1" class="px-4 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-gray-300 hover:bg-white/10 disabled:opacity-20 transition-all">下一页 →</button>
      </div>
    </div>

    <!-- Right: PPT Preview (65%) -->
    <div class="flex-1 flex flex-col">
      <div :class="themeClasses.bg" class="flex-1 flex items-center justify-center p-8 transition-colors duration-500">
        <div class="w-full max-w-4xl text-center">
          <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section' && currentSlide.layout !== 'closing' && currentSlide.layout !== 'toc'" :class="themeClasses.title" class="text-4xl font-bold mb-6">{{ currentSlide.title }}</h2>
          <div :class="themeClasses.body" class="text-xl leading-relaxed slide-body" v-html="currentSlide.content"></div>
        </div>
      </div>
      <div class="h-0.5 bg-gray-800 shrink-0">
        <div class="h-full bg-white/20 transition-all duration-300" :style="{ width: (currentPage + 1) / slides.length * 100 + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSync } from '../utils/sync'

const sync = useSync()
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

onMounted(() => {
  document.title = 'PPT演讲助手'
  const saved = localStorage.getItem('ppt-slides')
  if (saved) try { slides.value = JSON.parse(saved) } catch {}

  // Resume elapsed from persisted start time (survives page refresh)
  const startTs = localStorage.getItem('ppt-presentation-start')
  if (startTs) elapsed.value = Math.floor((Date.now() - Number(startTs)) / 1000)

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides; currentPage.value = 0; elapsed.value = 0
    localStorage.setItem('ppt-presentation-start', Date.now())
    resetTimer()
  })
  if (slides.value.length > 0) {
    if (!startTs) localStorage.setItem('ppt-presentation-start', Date.now())
    sync.broadcastPresentationStart(slides.value); sync.broadcastPageChange(0, slides.value[0]?.narration); resetTimer()
  }
  mainEl.value?.focus()
})
onUnmounted(() => { stopTimer(); sync.off('PRESENTATION_START'); localStorage.removeItem('ppt-presentation-start'); sync.broadcastPresentationEnd() })
</script>

<style>
@import '../assets/slides.css';
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>
