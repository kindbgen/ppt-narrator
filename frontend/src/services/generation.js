/**
 * Shared PPT generation logic with per-project localStorage persistence.
 * Supports multiple concurrent, independent generation sessions.
 */
import { AIService } from './ai-provider'
import { updateProjectSlides, updateProjectMeta, updateSlide, getProject } from './storage'

const STORAGE_KEY_PREFIX = 'ppt-generation-state-'

function storageKey(projectId) {
  return STORAGE_KEY_PREFIX + projectId
}

// ---- Session Registry ----
const sessions = new Map() // projectId -> GenerationSession

export function getGenerationState(projectId) {
  try {
    const raw = localStorage.getItem(storageKey(projectId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearGenerationState(projectId) {
  localStorage.removeItem(storageKey(projectId))
}

/**
 * GenerationSession encapsulates all state for one PPT generation.
 * Each session is fully isolated — multiple sessions can run concurrently.
 */
class GenerationSession {
  constructor({ projectId, rawContent, style, provider, settings, pageMode, pageMin, pageMax, store }) {
    this.projectId = projectId
    this.rawContent = rawContent
    this.style = style
    this.provider = provider
    this.settings = settings
    this.pageMode = pageMode
    this.pageMin = pageMin
    this.pageMax = pageMax
    this.store = store
    this.aborted = false
  }

  abort() {
    this.aborted = true
  }

  async run() {
    const { projectId, rawContent, style, provider, settings, pageMode, pageMin, pageMax, store } = this

    const aiConfig = provider === 'gateway'
      ? { baseUrl: settings.baseUrl || '', apiKey: settings.apiKey || '', model: settings.model || '' }
      : provider === 'claude' ? { apiKey: settings.apiKey || '', model: settings.model || '' }
      : provider === 'openai' ? { apiKey: settings.apiKey || '', model: settings.model || '' }
      : {}
    const ai = new AIService(provider, aiConfig)

    this._saveState({ projectId, rawContent, style, provider, settings, pageMode, pageMin, pageMax, phase: 'ppt' })

    store.setGenerationProgress(projectId, { phase: 'ppt', current: 0, total: 0 })

    // Phase 1: PPT structure
    let r
    try {
      r = await ai.generatePPT(rawContent, style, {
        pageCount: pageMode === 'custom' ? { min: pageMin, max: pageMax } : null,
        includeToc: true
      })
    } catch (e) {
      store.clearGenerationProgress(projectId)
      clearGenerationState(projectId)
      store.setSlidesIfCurrent(projectId, [{ layout: 'cover', title: '生成失败', duration: 15, content: '<div class="ppt-cover"><h1>PPT 生成失败</h1></div>', narration: '', keywords: [], tips: [] }])
      return
    }
    if (this.aborted) { this._cleanup(); return }
    if (!r.slides?.length) { store.clearGenerationProgress(projectId); clearGenerationState(projectId); return }

    const closing = { layout: 'closing', title: '感谢观看', duration: 10, content: '<div class="ppt-closing"><h1>感谢观看</h1></div>', keyPoints: [], narration: '', keywords: [], tips: [] }
    const allSlides = [...r.slides, closing]
    const projectName = r.slides[0]?.title || '未命名项目'

    store.setSlidesIfCurrent(projectId, allSlides.map(s => ({ ...s, narration: '生成中...', keywords: [], tips: [] })))
    store.projectTitle = store.currentProjectId === projectId ? projectName : store.projectTitle
    await updateProjectSlides(projectId, allSlides)
    await updateProjectMeta(projectId, { title: projectName })
    window.dispatchEvent(new CustomEvent('sidebar-refresh'))

    if (this.aborted) { this._cleanup(); return }

    // Phase 2: Narrations (including closing slide)
    this._saveState({ phase: 'narration', narrationIndex: 0, totalSlides: allSlides.length })
    store.setGenerationProgress(projectId, { phase: 'narration', current: 0, total: allSlides.length })

    for (let i = 0; i < allSlides.length; i++) {
      if (this.aborted) { this._cleanup(); return }
      try {
        const nr = await ai.generateNarration(allSlides[i])
        store.updateSlideIfCurrent(projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [] })
        store.setGenerationProgress(projectId, { phase: 'narration', current: i + 1, total: allSlides.length })
        await updateSlide(projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [], content: allSlides[i].content })
        this._saveState({ narrationIndex: i + 1 })
      } catch (e) { console.warn('Narration failed for slide', i, e) }
    }

    if (!this.aborted) {
      store.clearGenerationProgress(projectId)
      window.dispatchEvent(new CustomEvent('ppt-toast', { detail: { message: '✨ PPT 和旁白生成完成', type: 'success' } }))
    }
    clearGenerationState(projectId)
  }

  _cleanup() {
    clearGenerationState(this.projectId)
    this.store.clearGenerationProgress(this.projectId)
  }

  _saveState(state) {
    // Strip secrets before persisting to localStorage
    const existing = getGenerationState(this.projectId) || {}
    const sanitized = { ...existing, ...state, updatedAt: Date.now() }
    if (sanitized.settings) {
      sanitized.settings = { baseUrl: sanitized.settings.baseUrl || '', model: sanitized.settings.model || '' }
    }
    localStorage.setItem(storageKey(this.projectId), JSON.stringify(sanitized))
  }

  /**
   * Resume narration phase from a saved state using a pre-created session.
   * The session should already be registered in the sessions map before calling this,
   * so that abortGeneration() can find it during the long-running loop.
   * Returns the session on completion (or null if nothing to resume).
   */
  static async resumeFromState(state, store, session) {
    const project = await getProject(state.projectId)
    if (!project) { clearGenerationState(state.projectId); return null }

    // Read secrets from env vars (not stored in localStorage for security)
    const aiConfig = state.provider === 'gateway'
      ? { baseUrl: import.meta.env.VITE_AI_GATEWAY_BASE_URL || '', apiKey: import.meta.env.VITE_AI_GATEWAY_API_KEY || '', model: import.meta.env.VITE_AI_GATEWAY_MODEL || '' }
      : state.provider === 'claude' ? { apiKey: import.meta.env.VITE_CLAUDE_API_KEY || '', model: import.meta.env.VITE_CLAUDE_API_MODEL || '' }
      : state.provider === 'openai' ? { apiKey: import.meta.env.VITE_OPENAI_API_KEY || '', model: import.meta.env.VITE_OPENAI_API_MODEL || '' }
      : {}

    const ai = new AIService(state.provider, aiConfig)
    const slides = project.slides
    const startIdx = state.narrationIndex || 0

    store.setGenerationProgress(state.projectId, { phase: 'narration', current: startIdx, total: slides.length })

    for (let i = startIdx; i < slides.length; i++) {
      if (session.aborted) { session._cleanup(); return session }
      try {
        const nr = await ai.generateNarration(slides[i])
        store.updateSlideIfCurrent(state.projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [] })
        store.setGenerationProgress(state.projectId, { phase: 'narration', current: i + 1, total: slides.length })
        await updateSlide(state.projectId, i, { narration: nr.narration || '', keywords: nr.keywords || [], tips: nr.tips || [], content: slides[i].content })
        session._saveState({ narrationIndex: i + 1 })
      } catch (e) { console.warn('Resume narration failed for slide', i, e) }
    }

    if (!session.aborted) {
      store.clearGenerationProgress(state.projectId)
      window.dispatchEvent(new CustomEvent('ppt-toast', { detail: { message: '✨ PPT 和旁白生成完成', type: 'success' } }))
    }
    clearGenerationState(state.projectId)
    return session
  }
}

// ---- Public API ----

/**
 * Start a new PPT generation session.
 * If a session for the same projectId already exists, it is aborted first.
 * Different projectIds can run concurrently without interference.
 */
export function startGeneration(config) {
  // Abort existing session for same projectId only (different projects run independently)
  const existing = sessions.get(config.projectId)
  if (existing) existing.abort()

  const session = new GenerationSession(config)
  sessions.set(config.projectId, session)

  session.run().finally(() => {
    // Only delete if this session is still the active one (not replaced by a newer generation)
    if (sessions.get(config.projectId) === session) {
      sessions.delete(config.projectId)
    }
  })

  return session
}

/**
 * Abort a generation session for a specific project.
 */
export function abortGeneration(projectId) {
  const session = sessions.get(projectId)
  if (session) {
    session.abort()
    sessions.delete(projectId)
  }
}

/**
 * Check if a project has an active generation session.
 */
export function isGenerating(projectId) {
  return sessions.has(projectId)
}

/**
 * Backward-compatible wrapper for the old generatePPTAndNarrations API.
 * Used by resumeGeneration when the PPT phase needs a full restart.
 */
export function generatePPTAndNarrations(config) {
  return startGeneration(config)
}

/**
 * Resume all pending generations from localStorage.
 * Called on page load — each pending project gets its own independent session.
 */
export async function resumeGeneration(store) {
  // Migrate legacy single-key format to per-project keys (one-time)
  try {
    const legacy = localStorage.getItem('ppt-generation-state')
    if (legacy) {
      const state = JSON.parse(legacy)
      if (state && state.projectId) {
        localStorage.setItem(storageKey(state.projectId), legacy)
      }
      localStorage.removeItem('ppt-generation-state')
    }
  } catch { /* skip corrupt legacy entry */ }

  // Collect all per-project generation states from localStorage
  const pendingSessions = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const state = JSON.parse(localStorage.getItem(key))
        if (state && state.projectId) {
          pendingSessions.push(state)
        }
      } catch { /* skip corrupt entries */ }
    }
  }

  if (!pendingSessions.length) return false

  let resumed = false

  for (const state of pendingSessions) {
    // Skip if already generating for this project
    if (sessions.has(state.projectId)) continue

    if (state.phase === 'narration') {
      // Create and register session before the long-running loop so it's abortable
      const session = new GenerationSession({
        projectId: state.projectId,
        rawContent: state.rawContent || '',
        style: state.style || 'business',
        provider: state.provider,
        settings: {
          baseUrl: state.settings?.baseUrl || import.meta.env.VITE_AI_GATEWAY_BASE_URL || '',
          apiKey: import.meta.env.VITE_AI_GATEWAY_API_KEY || import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '',
          model: state.settings?.model || import.meta.env.VITE_AI_GATEWAY_MODEL || ''
        },
        pageMode: state.pageMode || 'auto',
        pageMin: state.pageMin || 8,
        pageMax: state.pageMax || 12,
        store
      })
      sessions.set(state.projectId, session)

      // Resume narration phase (session is already registered, so it's abortable)
      const result = await GenerationSession.resumeFromState(state, store, session)
      // Clean up from registry when done
      if (sessions.get(state.projectId) === session) {
        sessions.delete(state.projectId)
      }
      if (result) resumed = true
    } else {
      // PPT phase — restart from scratch via startGeneration
      startGeneration({
        projectId: state.projectId,
        rawContent: state.rawContent,
        style: state.style,
        provider: state.provider,
        settings: {
          baseUrl: state.settings?.baseUrl || import.meta.env.VITE_AI_GATEWAY_BASE_URL || '',
          apiKey: import.meta.env.VITE_AI_GATEWAY_API_KEY || import.meta.env.VITE_CLAUDE_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '',
          model: state.settings?.model || import.meta.env.VITE_AI_GATEWAY_MODEL || ''
        },
        pageMode: state.pageMode,
        pageMin: state.pageMin,
        pageMax: state.pageMax,
        store
      })
      resumed = true
    }
  }

  return resumed
}
