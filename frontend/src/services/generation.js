/**
 * Shared PPT generation logic with localStorage persistence.
 * Supports resume after page refresh.
 */
import { AIService } from './ai-provider'
import { updateProjectSlides, updateProjectMeta, updateSlide, getProject } from './storage'

const STORAGE_KEY = 'ppt-generation-state'

export function getGenerationState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...getGenerationState(),
    ...state,
    updatedAt: Date.now()
  }))
}

export function clearGenerationState() {
  localStorage.removeItem(STORAGE_KEY)
}

export async function generatePPTAndNarrations({
  projectId, rawContent, style, provider, settings,
  pageMode, pageMin, pageMax, store, onProgress, onComplete
}) {
  const aiConfig = provider === 'gateway'
    ? { baseUrl: settings.baseUrl || '', apiKey: settings.apiKey || '', model: settings.model || '' }
    : provider === 'claude' ? { apiKey: settings.apiKey || '' }
    : provider === 'openai' ? { apiKey: settings.apiKey || '' }
    : {}
  const ai = new AIService(provider, aiConfig)

  saveState({ projectId, rawContent, style, provider, settings, pageMode, pageMin, pageMax, phase: 'ppt' })

  store.generatingNarrations = true
  store.narrationProgress = { current: 0, total: 0, phase: 'ppt' }
  store.generatingProjectId = projectId

  // Phase 1: PPT structure
  let r
  try {
    r = await ai.generatePPT(rawContent, style, {
      pageCount: pageMode === 'custom' ? { min: pageMin, max: pageMax } : null,
      includeToc: true
    })
  } catch (e) {
    store.generatingNarrations = false
    store.narrationProgress = null
    clearGenerationState()
    store.slides = [{ layout: 'cover', title: '生成失败', duration: 15, content: '<div class="ppt-cover"><h1>PPT 生成失败</h1></div>', narration: '', keywords: [], tips: [] }]
    return
  }
  if (!r.slides?.length) { store.generatingNarrations = false; store.narrationProgress = null; clearGenerationState(); return }

  const closing = { layout: 'closing', title: '感谢观看', duration: 10, content: '<div class="ppt-closing"><h1>感谢观看</h1></div>', keyPoints: [], narration: '', keywords: [], tips: [] }
  const allSlides = [...r.slides, closing]
  const projectName = r.slides[0]?.title || '未命名项目'

  store.setSlides(allSlides.map(s => ({ ...s, narration: '生成中...', keywords: [], tips: [] })))
  store.projectTitle = projectName
  await updateProjectSlides(projectId, allSlides)
  await updateProjectMeta(projectId, { title: projectName })
  window.dispatchEvent(new CustomEvent('sidebar-refresh'))
  onProgress?.({ slides: allSlides, projectName })

  // Phase 2: Narrations (including closing slide)
  saveState({ phase: 'narration', narrationIndex: 0, totalSlides: allSlides.length })
  store.narrationProgress = { current: 0, total: allSlides.length, phase: 'narration' }

  for (let i = 0; i < allSlides.length; i++) {
    if (store.generatingProjectId !== projectId) { clearGenerationState(); return }
    try {
      const nr = await ai.generateNarration(allSlides[i])
      if (store.generatingProjectId === projectId) {
        store.slides[i] = { ...store.slides[i], narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [] }
      }
      store.narrationProgress = { current: i + 1, total: allSlides.length, phase: 'narration' }
      await updateSlide(projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [], content: allSlides[i].content })
      saveState({ narrationIndex: i + 1 })
    } catch (e) { console.warn('Narration failed for slide', i, e) }
  }

  if (store.generatingProjectId === projectId) { store.generatingNarrations = false; store.narrationProgress = null }
  clearGenerationState()
  window.dispatchEvent(new CustomEvent('ppt-toast', { detail: { message: '✨ PPT 和旁白生成完成', type: 'success' } }))
  onComplete?.()
}

/**
 * Resume generation from localStorage state.
 * Called on page load if a pending generation is detected.
 */
export async function resumeGeneration(store) {
  const state = getGenerationState()
  if (!state) return false

  const project = await getProject(state.projectId)
  if (!project) { clearGenerationState(); return false }

  store.currentProjectId = state.projectId
  store.setSlides(project.slides)
  store.projectTitle = project.title || ''
  store.generatingProjectId = state.projectId
  store.generatingNarrations = true
  store.narrationProgress = state.phase === 'narration'
    ? { current: state.narrationIndex || 0, total: state.totalSlides || project.slides.length, phase: 'narration' }
    : { current: 0, total: 0, phase: 'ppt' }

  if (state.phase === 'narration') {
    const aiConfig = state.provider === 'gateway'
      ? { baseUrl: state.settings?.baseUrl || '', apiKey: state.settings?.apiKey || '', model: state.settings?.model || '' }
      : state.provider === 'claude' ? { apiKey: state.settings?.apiKey || '' }
      : state.provider === 'openai' ? { apiKey: state.settings?.apiKey || '' }
      : {}
    const ai = new AIService(state.provider, aiConfig)
    const slides = project.slides
    const startIdx = state.narrationIndex || 0

    for (let i = startIdx; i < slides.length; i++) {
      if (store.generatingProjectId !== state.projectId) { clearGenerationState(); return true }
      try {
        const nr = await ai.generateNarration(slides[i])
        if (store.generatingProjectId === state.projectId) {
          store.slides[i] = { ...store.slides[i], narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [] }
        }
        store.narrationProgress = { current: i + 1, total: slides.length, phase: 'narration' }
        await updateSlide(state.projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [], content: slides[i].content })
        saveState({ narrationIndex: i + 1 })
      } catch (e) { console.warn('Resume narration failed for slide', i, e) }
    }
  } else {
    await generatePPTAndNarrations({
      projectId: state.projectId, rawContent: state.rawContent, style: state.style,
      provider: state.provider, settings: state.settings,
      pageMode: state.pageMode, pageMin: state.pageMin, pageMax: state.pageMax,
      store, onProgress: () => {}, onComplete: () => {}
    })
    return true
  }

  if (store.generatingProjectId === state.projectId) { store.generatingNarrations = false; store.narrationProgress = null }
  clearGenerationState()
  window.dispatchEvent(new CustomEvent('ppt-toast', { detail: { message: '✨ PPT 和旁白生成完成', type: 'success' } }))
  return true
}
