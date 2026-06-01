<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const toast = ref(null)

function show(msg) {
  toast.value = msg
  setTimeout(() => { toast.value = null }, 3500)
}

function onToast(e) { show(e.detail.message) }

onMounted(() => window.addEventListener('ppt-toast', onToast))
onUnmounted(() => window.removeEventListener('ppt-toast', onToast))
</script>

<template>
  <router-view />
  <Teleport to="body">
    <Transition name="toast">
      <div v-if="toast" class="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 bg-gray-900 text-white rounded-2xl shadow-xl text-sm font-medium flex items-center gap-2">
        {{ toast }}
      </div>
    </Transition>
  </Teleport>
</template>

<style>
.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.25s ease-in; }
.toast-enter-from { opacity: 0; transform: translate(-50%, -12px); }
.toast-leave-to { opacity: 0; transform: translate(-50%, -8px); }
</style>
