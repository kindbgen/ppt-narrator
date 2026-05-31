<template>
  <div :class="themeClasses.bg" class="fixed inset-0 flex items-center justify-center p-12 transition-colors duration-500">
    <div class="w-full max-w-5xl text-center">
      <h2 v-if="currentSlide.layout !== 'cover' && currentSlide.layout !== 'section'" :class="themeClasses.title" class="text-5xl font-bold mb-8">{{ currentSlide.title }}</h2>
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
const themeClasses = computed(() => themeConfig.business)

// --- Lifecycle ---
onMounted(() => {
  // Fallback: read from localStorage in case we missed the PRESENTATION_START event
  const saved = localStorage.getItem('ppt-slides')
  if (saved && slides.value.length === 0) {
    try { slides.value = JSON.parse(saved) } catch (e) { /* ignore */ }
  }

  sync.on('PAGE_CHANGE', (data) => {
    currentPage.value = data.pageIndex
  })

  sync.on('PRESENTATION_START', (data) => {
    slides.value = data.slides
    currentPage.value = 0
  })
})

onUnmounted(() => {
  sync.off('PAGE_CHANGE')
  sync.off('PRESENTATION_START')
})
</script>

<style>
/* ===== Cover Page ===== */
.ppt-cover {
  text-align: center;
  padding: 60px 20px;
}
.ppt-cover-badge {
  display: inline-block;
  padding: 6px 24px;
  border: 2px solid currentColor;
  border-radius: 999px;
  font-size: 14px;
  letter-spacing: 4px;
  text-transform: uppercase;
  margin-bottom: 40px;
  opacity: 0.7;
}
.ppt-cover h1 {
  font-size: 56px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 24px;
  letter-spacing: -1px;
}
.ppt-cover-sub {
  font-size: 22px;
  opacity: 0.7;
  margin-bottom: 16px;
}
.ppt-cover-author {
  font-size: 16px;
  opacity: 0.5;
  margin-top: 40px;
}

/* ===== Section Divider ===== */
.ppt-section {
  text-align: center;
  padding: 60px 20px;
}
.ppt-section-num {
  font-size: 120px;
  font-weight: 900;
  line-height: 1;
  opacity: 0.12;
  margin-bottom: -30px;
}
.ppt-section h2 {
  font-size: 44px;
  font-weight: 700;
  margin-bottom: 16px;
}
.ppt-section-sub {
  font-size: 20px;
  opacity: 0.6;
}

/* ===== Content List ===== */
.ppt-list {
  list-style: none;
  padding: 0;
  text-align: left;
  max-width: 700px;
  margin: 0 auto;
}
.ppt-list li {
  padding: 14px 20px;
  margin-bottom: 10px;
  border-left: 4px solid rgba(255,255,255,0.3);
  border-radius: 0 8px 8px 0;
  font-size: 22px;
  line-height: 1.5;
}
.ppt-list li strong {
  display: inline-block;
  min-width: 80px;
  margin-right: 8px;
}

/* ===== Data Cards ===== */
.ppt-data-grid {
  display: flex;
  justify-content: center;
  gap: 24px;
  flex-wrap: wrap;
  max-width: 800px;
  margin: 0 auto;
}
.ppt-data-card {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 16px;
  padding: 32px 28px;
  min-width: 160px;
  text-align: center;
}
.ppt-data-num {
  font-size: 48px;
  font-weight: 900;
  line-height: 1.1;
  margin-bottom: 8px;
}
.ppt-data-label {
  font-size: 15px;
  opacity: 0.7;
  line-height: 1.4;
}

/* ===== Two Column ===== */
.ppt-twocol {
  display: flex;
  align-items: stretch;
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
}
.ppt-twocol-box {
  flex: 1;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 16px;
  padding: 28px 24px;
  text-align: left;
}
.ppt-twocol-box h4 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid rgba(255,255,255,0.15);
}
.ppt-twocol-box ul {
  list-style: none;
  padding: 0;
}
.ppt-twocol-box li {
  padding: 8px 0;
  font-size: 16px;
  line-height: 1.5;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.ppt-twocol-box li::before {
  content: '▸ ';
  opacity: 0.4;
}
.ppt-twocol-divider {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 900;
  opacity: 0.4;
  padding: 0 4px;
}

/* ===== Table ===== */
.ppt-table {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 17px;
}
.ppt-table thead th {
  background: rgba(255,255,255,0.15);
  padding: 14px 18px;
  text-align: left;
  font-weight: 700;
  font-size: 15px;
  letter-spacing: 0.5px;
}
.ppt-table thead th:first-child { border-radius: 10px 0 0 0; }
.ppt-table thead th:last-child { border-radius: 0 10px 0 0; }
.ppt-table tbody td {
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  line-height: 1.4;
}
.ppt-table tbody tr:last-child td:first-child { border-radius: 0 0 0 10px; }
.ppt-table tbody tr:last-child td:last-child { border-radius: 0 0 10px 0; }
.ppt-table tbody tr:nth-child(even) td {
  background: rgba(255,255,255,0.03);
}

/* ===== Timeline ===== */
.ppt-timeline {
  max-width: 700px;
  margin: 0 auto;
  text-align: left;
  padding-left: 30px;
}
.ppt-timeline-item {
  display: flex;
  gap: 20px;
  padding-bottom: 28px;
  position: relative;
}
.ppt-timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 19px;
  top: 44px;
  bottom: 0;
  width: 2px;
  background: rgba(255,255,255,0.15);
}
.ppt-timeline-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255,255,255,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 16px;
  flex-shrink: 0;
}
.ppt-timeline-content strong {
  display: block;
  font-size: 20px;
  margin-bottom: 4px;
}
.ppt-timeline-content p {
  font-size: 16px;
  opacity: 0.7;
  margin: 0;
  line-height: 1.5;
}

/* ===== Callout Quote ===== */
.ppt-callout {
  max-width: 650px;
  margin: 0 auto;
  text-align: left;
}
.ppt-callout blockquote {
  margin: 0 0 20px 0;
  padding: 32px 36px;
  background: rgba(255,255,255,0.08);
  border-left: 6px solid rgba(255,255,255,0.3);
  border-radius: 0 12px 12px 0;
  font-size: 26px;
  font-style: italic;
  line-height: 1.5;
  position: relative;
}
.ppt-callout blockquote::before {
  content: '"';
  position: absolute;
  top: -10px;
  left: 12px;
  font-size: 60px;
  opacity: 0.15;
  line-height: 1;
}

/* ===== Slide Body Global ===== */
.slide-body {
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}
</style>
