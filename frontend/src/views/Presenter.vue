<template>
  <div :class="themeClasses.bg" class="fixed inset-0 flex items-center justify-center p-12 transition-colors duration-500">
    <div class="w-full max-w-5xl text-center">
      <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section' && currentSlide.layout !== 'closing'" :class="themeClasses.title" class="text-5xl font-bold mb-8">{{ currentSlide.title }}</h2>
      <div :class="themeClasses.body" class="text-2xl leading-relaxed slide-body" v-html="currentSlide.content"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSync } from '../utils/sync'

const sync = useSync()

// --- State ---
const slides = ref([])
const currentPage = ref(0)

const currentSlide = computed(() => slides.value[currentPage.value] || {})

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
  // Fallback: read from localStorage in case we missed the PRESENTATION_START event
  const saved = localStorage.getItem('ppt-slides')
  if (saved && slides.value.length === 0) {
    try { slides.value = JSON.parse(saved) } catch (e) { /* ignore */ }
    document.title = slides.value[0]?.title || 'PPT 演讲助手'
  }

  sync.on('PAGE_CHANGE', (data) => {
    currentPage.value = data.pageIndex
    document.title = slides.value[data.pageIndex]?.title || 'PPT 演讲助手'
  })

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides
    currentPage.value = 0
    document.title = data.slides[0]?.title || 'PPT 演讲助手'
  })
})

onUnmounted(() => {
  sync.off('PAGE_CHANGE')
  sync.off('PRESENTATION_START')
})
</script>


<style>
@import '../assets/slides.css';
</style>
