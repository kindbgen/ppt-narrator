<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b sticky top-0 z-10">
      <div class="flex items-center justify-between px-4 py-3">
        <h1 class="text-lg font-semibold">演讲旁白参考</h1>
        <div class="text-sm">
          已用时间: <span class="font-bold text-blue-600">{{ formatTime(elapsedTime) }}</span>
        </div>
      </div>
    </header>

    <!-- Progress Bar -->
    <div class="bg-gray-200 h-2">
      <div
        class="bg-blue-500 h-2 transition-all duration-300"
        :style="{ width: `${progress}%` }"
      ></div>
    </div>

    <!-- Narrations List -->
    <main class="p-6 overflow-y-auto" ref="mainContainer">
      <div class="space-y-4">
        <div
          v-for="(slide, index) in slides"
          :key="index"
          :ref="el => { if (el) narrationRefs[index] = el }"
          :class="currentPage === index ? 'bg-white shadow-lg border-blue-500' : 'bg-gray-50 border-gray-300'"
          class="border-2 rounded-lg p-4 transition-all"
        >
          <!-- Page Header -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center space-x-2">
              <span
                :class="currentPage === index ? 'bg-blue-500 text-white' : 'bg-gray-300'"
                class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              >
                {{ index + 1 }}
              </span>
              <h3 class="font-semibold">{{ slide.title }}</h3>
            </div>
            <div class="text-sm text-gray-500">
              {{ slide.duration }}秒
            </div>
          </div>

          <!-- Timer Badge (current page only) -->
          <div v-if="currentPage === index" class="mb-3">
            <div :class="timerColor" class="text-lg font-bold">
              剩余时间: {{ formatTime(remainingTime) }}
            </div>
          </div>

          <!-- Narration Text -->
          <div class="text-gray-800 leading-relaxed">
            {{ slide.narration }}
          </div>

          <!-- Keywords -->
          <div v-if="slide.keywords && slide.keywords.length > 0" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="(keyword, kIndex) in slide.keywords"
              :key="kIndex"
              class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs"
            >
              {{ keyword }}
            </span>
          </div>

          <!-- Tips -->
          <div v-if="slide.tips && slide.tips.length > 0" class="mt-3 space-y-1">
            <div v-for="(tip, tIndex) in slide.tips" :key="tIndex" class="text-sm text-gray-600">
              💡 {{ tip }}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSync } from '../utils/sync'

const sync = useSync()

// State
const slides = ref([])
const currentPage = ref(0)
const elapsedTime = ref(0)
const remainingTime = ref(120)

const narrationRefs = ref([])
const mainContainer = ref(null)

const progress = computed(() => {
  if (slides.value.length === 0) return 0
  return Math.round((currentPage.value / slides.value.length) * 100)
})

const timerColor = computed(() => {
  if (remainingTime.value > 30) return 'text-green-600'
  if (remainingTime.value > 10) return 'text-yellow-600'
  return 'text-red-600'
})

// Format time
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Scroll to current narration
function scrollToNarration(index) {
  const element = narrationRefs.value[index]
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Listen to sync events
onMounted(() => {
  // 先从 localStorage 加载数据
  const saved = localStorage.getItem('ppt-slides')
  if (saved) {
    try { slides.value = JSON.parse(saved) } catch (e) {}
  }

  sync.on('PAGE_CHANGE', (data) => {
    currentPage.value = data.pageIndex
    scrollToNarration(data.pageIndex)
  })

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides
  })

  sync.on('TIMER_UPDATE', (data) => {
    elapsedTime.value = data.elapsedTime
    remainingTime.value = data.remainingTime
  })

  sync.on('PRESENTATION_END', () => {
    // Clean up
  })
})

onUnmounted(() => {
  sync.off('PAGE_CHANGE')
  sync.off('PRESENTATION_START')
  sync.off('TIMER_UPDATE')
  sync.off('PRESENTATION_END')
})
</script>