<template>
  <div class="flex flex-col h-screen bg-white text-gray-900">
    <div class="flex items-center gap-4 px-6 py-4 border-b border-gray-100 shrink-0">
      <router-link to="/" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
      </router-link>
      <h1 class="text-lg font-bold">所有项目</h1>
      <span class="text-sm text-gray-400">{{ filtered.length }} / {{ projects.length }} 个项目</span>
      <div class="flex-1" />
      <div class="relative">
        <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input v-model="search" placeholder="搜索项目..." class="w-48 pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-300 focus:outline-none" />
      </div>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-3">
      <p v-if="!projects.length" class="text-sm text-gray-400 text-center py-20">暂无项目</p>
      <p v-else-if="!filtered.length" class="text-sm text-gray-400 text-center py-20">无匹配项目</p>
      <div v-for="p in filtered" :key="p.id" class="relative group border-b border-gray-50 last:border-0">
        <div class="flex items-center gap-4 px-3 py-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-all"
          @click="openProject(p.id)">
          <div class="flex-1 min-w-0">
            <input v-if="renaming === p.id" v-model="renameText" ref="renameInput"
              @blur="doRename(p)" @keydown.enter="doRename(p)" @keydown.escape="renaming = null" @click.stop
              class="w-full text-sm bg-white border border-gray-200 rounded px-2 py-1 focus:ring-2 focus:ring-gray-300 focus:outline-none" />
            <template v-else>
              <div class="text-sm font-medium truncate flex items-center gap-2">
                <span v-if="p.pinned" class="text-xs">📌</span> {{ p.title }}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ fmtDate(p.updated_at) }}
                <span class="mx-1.5">·</span>
                {{ styleLabel(p.template_style) }}
                <span class="mx-1.5">·</span>
                {{ p.slide_count || 0 }} 页
              </div>
            </template>
          </div>
          <button @click.stop="menuId = menuId === p.id ? null : p.id"
            class="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-all text-sm px-2">⋯</button>
        </div>
        <div v-if="menuId === p.id" class="absolute right-8 top-12 bg-white border border-gray-200 rounded-lg shadow-md py-1 z-50 min-w-[120px]">
          <button @click="rename(p)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">✏️ 重命名</button>
          <button @click="togglePin(p)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50">{{ p.pinned ? '📌 取消置顶' : '📌 置顶' }}</button>
          <button @click="del(p.id)" class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 text-red-500">🗑️ 删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getProjectList, updateProjectMeta, deleteProject, getProject } from '../services/storage'
import { clearGenerationState } from '../services/generation'
import { usePPTStore } from '../stores/ppt'

const router = useRouter()
const store = usePPTStore()
const projects = ref([]); const menuId = ref(null)
const renaming = ref(null); const renameText = ref(''); const renameInput = ref(null)
const search = ref('')

const sortedAll = computed(() => [...projects.value].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)))
const filtered = computed(() => {
  if (!search.value.trim()) return sortedAll.value
  const q = search.value.trim().toLowerCase()
  return sortedAll.value.filter(p => p.title.toLowerCase().includes(q))
})

function fmtDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` }
function styleLabel(s) { const m = { business: '商务', tech: '科技', minimal: '简约', education: '教育' }; return m[s] || s || '' }

async function load() { try { projects.value = await getProjectList() } catch {} }
async function togglePin(p) { await updateProjectMeta(p.id, { pinned: p.pinned ? 0 : 1 }); await load() }
async function rename(p) { menuId.value = null; renaming.value = p.id; renameText.value = p.title; await nextTick(); const el = Array.isArray(renameInput.value) ? renameInput.value[renameInput.value.length-1] : renameInput.value; if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) } }
async function doRename(p) { if (renameText.value && renameText.value !== p.title) { await updateProjectMeta(p.id, { title: renameText.value }); await load() } renaming.value = null }
async function del(id) { if (!confirm('确定删除？')) return; await deleteProject(id); clearGenerationState(id); await load(); menuId.value = null }

async function openProject(id) {
  menuId.value = null
  try {
    const p = await getProject(id)
    if (!p) return alert('项目不存在')
    store.setSlides(p.slides); store.currentProjectId = p.id; store.projectTitle = p.title || ''
    store.speaker = p.speaker || ''; store.department = p.department || ''
    store.eventType = p.event_type || '内部技术讲座'; store.startTime = p.start_time || ''
    store.setTemplateStyle(p.template_style || 'business'); store.setAIProvider(p.ai_provider || 'gateway')
    localStorage.setItem('ppt-active-project', p.id); localStorage.setItem('ppt-theme', p.template_style || 'business')
    router.push('/editor')
  } catch (e) { alert('加载失败: ' + e.message) }
}

onMounted(load)
</script>
