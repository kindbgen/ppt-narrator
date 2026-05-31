/**
 * 多模型AI服务适配器
 */
class AIProvider {
  constructor(config) {
    this.config = config
  }
  async generate(prompt, options = {}) {
    throw new Error('Method must be implemented')
  }
}

/**
 * Claude AI Provider
 */
class ClaudeProvider extends AIProvider {
  async generate(prompt, options = {}) {
    const apiKey = this.config.apiKey
    if (!apiKey) throw new Error('Claude API Key is required')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    return data.content[0].text
  }
}

/**
 * OpenAI Provider
 */
class OpenAIProvider extends AIProvider {
  async generate(prompt, options = {}) {
    const apiKey = this.config.apiKey
    if (!apiKey) throw new Error('OpenAI API Key is required')
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4',
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    const data = await response.json()
    return data.choices[0].message.content
  }
}

/**
 * Ollama 本地模型 Provider
 */
class OllamaProvider extends AIProvider {
  async generate(prompt, options = {}) {
    const endpoint = this.config.endpoint || 'http://localhost:11434'
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.config.model || 'llama2', prompt, stream: false })
    })
    const data = await response.json()
    return data.response
  }
}

/**
 * LLM Gateway Provider - 支持自定义LLM中转站
 */
class GatewayProvider extends AIProvider {
  async generate(prompt, options = {}) {
    const baseUrl = this.config.baseUrl
    if (!baseUrl) throw new Error('Gateway Base URL is required')
    const apiKey = this.config.apiKey
    const model = this.config.model || 'deepseek-v4-pro'

    if (!apiKey) throw new Error('Gateway API Key is required')

    // 先尝试 Anthropic 兼容格式
    try {
      const url = `${baseUrl}/v1/messages`
      console.log('[Gateway] POST', url)
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model,
          max_tokens: options.maxTokens || 4096,
          messages: [{ role: 'user', content: prompt }]
        })
      })
      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`)
      }
      const data = await response.json()
      console.log('[Gateway] Response keys:', Object.keys(data))
      return this._extractText(data)
    } catch (error) {
      console.log('[Gateway] Anthropic failed:', error.message)
      return this._tryOpenAI(baseUrl, apiKey, model, prompt, options)
    }
  }

  _extractText(data) {
    // 1. content 是字符串
    if (typeof data.content === 'string') {
      console.log('[Gateway] content is string')
      return data.content
    }
    // 2. content 是数组 — 找到 type=text 的元素
    if (Array.isArray(data.content)) {
      const textBlock = data.content.find(b => b.type === 'text')
      if (textBlock?.text) {
        console.log('[Gateway] content array, found text block')
        return textBlock.text
      }
      // 兼容: 直接有 text 字段的元素
      const direct = data.content.find(b => b.text)
      if (direct?.text) {
        console.log('[Gateway] content array, found .text element')
        return direct.text
      }
    }
    // 3. OpenAI 格式
    if (data.choices?.[0]?.message?.content) {
      console.log('[Gateway] OpenAI format')
      return data.choices[0].message.content
    }
    // 4. 直接字段
    if (typeof data.text === 'string') return data.text
    if (typeof data.response === 'string') return data.response

    console.error('[Gateway] Cannot extract. Keys:', Object.keys(data))
    // 打印 content 数组结构帮助调试
    if (Array.isArray(data.content)) {
      console.error('[Gateway] content types:', data.content.map(b => b.type))
    }
    throw new Error('Cannot extract text from response')
  }

  async _tryOpenAI(baseUrl, apiKey, model, prompt, options) {
    const url = `${baseUrl}/v1/chat/completions`
    console.log('[Gateway] POST', url)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens || 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Gateway API error (HTTP ${response.status}): ${errText.slice(0, 200)}`)
    }
    const data = await response.json()
    return this._extractText(data)
  }
}

/**
 * Mock Provider - 测试用
 */
class MockProvider extends AIProvider {
  async generate(prompt) {
    console.log('[Mock] prompt length:', prompt.length)
    if (prompt.includes('PAGE###')) {
      return [
        '###PAGE###',
        'LAYOUT: cover',
        'TITLE: Wiki to PPT 演讲助手',
        'SUBTITLE: 将技术文档转化为精美演示文稿',
        'AUTHOR: 内部技术分享',
        'DURATION: 15',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 01',
        'TITLE: 项目背景',
        'SUBTITLE: 从痛点到解决方案',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: data',
        'TITLE: 痛点数据',
        'DURATION: 60',
        'POINTS:',
        '- 70%: 工程师每周花3小时+做PPT',
        '- 85%: 演讲者需要手动准备旁白',
        '- 3x: AI辅助后效率提升倍数',
        '',
        '###PAGE###',
        'LAYOUT: content',
        'TITLE: 核心功能',
        'DURATION: 90',
        'POINTS:',
        '- 多源输入：支持Docmost Wiki、文件上传、粘贴',
        '- AI生成：自动拆分页面、生成演讲旁白',
        '- 双屏演示：演示屏+旁白屏实时同步',
        '- 倒计时：每页独立计时提醒',
        '',
        '###PAGE###',
        'LAYOUT: twocol',
        'TITLE: 传统方式 vs PPT助手',
        'DURATION: 60',
        'LEFT:',
        '- 手动排版，耗时数小时',
        '- 旁白靠临场发挥',
        '- 演示时频繁看稿',
        'RIGHT:',
        '- AI自动生成，几分钟完成',
        '- 智能旁白，轻松脱稿',
        '- 双屏同步，流畅自信',
        '',
        '###PAGE###',
        'LAYOUT: table',
        'TITLE: 技术栈选型',
        'DURATION: 60',
        'HEADER: 模块 | 技术 | 说明',
        'ROW: 前端 | Vue 3 + Vite | 轻量快速',
        'ROW: 样式 | TailwindCSS | 原子化CSS',
        'ROW: 同步 | BroadcastChannel | 跨窗口通信',
        'ROW: AI | LLM Gateway | 多模型支持',
        '',
        '###PAGE###',
        'LAYOUT: timeline',
        'TITLE: 开发路线图',
        'DURATION: 60',
        'STEP: Phase 1: 基础框架搭建，前后端项目初始化',
        'STEP: Phase 2: 内容输入，多源Wiki对接',
        'STEP: Phase 3: AI生成，PPT和旁白自动生成',
        'STEP: Phase 4: 演示功能，双屏+倒计时',
        '',
        '###PAGE###',
        'LAYOUT: callout',
        'TITLE: 核心洞察',
        'DURATION: 45',
        'QUOTE: 演讲的本质不是PPT，而是思想的高效传递。PPT助手让演讲者专注于内容表达，而非排版。',
        'POINTS:',
        '- 降低演讲准备门槛',
        '- 提升信息传递效率'
      ].join('\n')
    }
    return JSON.stringify({
      narration: '大家好，欢迎来到今天的演讲。',
      keywords: ['关键词'],
      tips: ['放慢语速']
    })
  }
}

/**
 * AI Service
 */
export class AIService {
  constructor(providerType = 'gateway', config = {}) {
    this.providerType = providerType
    this.config = config
    this.provider = this._createProvider(providerType, config)
  }

  _createProvider(type, config) {
    const map = {
      claude: ClaudeProvider,
      openai: OpenAIProvider,
      ollama: OllamaProvider,
      gateway: GatewayProvider,
      mock: MockProvider
    }
    const Provider = map[type]
    if (!Provider) throw new Error(`Unknown provider: ${type}`)
    return new Provider(config)
  }

  switchProvider(type, config) {
    this.providerType = type
    this.config = config
    this.provider = this._createProvider(type, config)
  }

  async generatePPT(wikiContent, style) {
    const styleGuide = {
      business: '商务专业风：深蓝主色(#1e3a5f)，白色背景，简洁排版。数据驱动。',
      tech: '科技现代风：深色背景(#0f172a)，青色/紫色高亮(#06b6d4)。适合技术演讲。',
      minimal: '极简优雅风：纯白背景，灰黑文字(#1a1a2e)，大量留白。',
      education: '教育清晰风：浅绿/白背景，深绿标题(#065f46)。结构清晰。'
    }

    const prompt = `你是PPT设计专家。根据文档生成PPT，用 ###PAGE### 分隔。要求排版丰富，不单调。

风格：${styleGuide[style] || styleGuide.business}

文档内容：
${wikiContent}

每页使用以下一种布局，标注 LAYOUT 类型：

1. cover — 封面（只能用一次）
###PAGE###
LAYOUT: cover
TITLE: 演讲主题
SUBTITLE: 副标题
AUTHOR: 演讲人
DURATION: 15

2. section — 章节分隔页
###PAGE###
LAYOUT: section
NUMBER: 01
TITLE: 章节名称
SUBTITLE: 一句话概括
DURATION: 10

3. content — 正文（默认，最常用）
###PAGE###
LAYOUT: content
TITLE: 页面标题
DURATION: 90
POINTS:
- 要点：解释说明
- 要点：解释说明

4. data — 数据突出（有数字时用）
###PAGE###
LAYOUT: data
TITLE: 核心数据
DURATION: 60
POINTS:
- 88%: Agent 项目未能进入生产
- 10,000+: 月增安全漏洞

5. twocol — 左右对比
###PAGE###
LAYOUT: twocol
TITLE: 对比标题
DURATION: 90
LEFT:
- 方案A优势1
- 方案A优势2
RIGHT:
- 方案B优势1
- 方案B优势2

6. table — 表格（有多行对比数据时）
###PAGE###
LAYOUT: table
TITLE: 表格标题
DURATION: 90
HEADER: 列1 | 列2 | 列3
ROW: 数据1 | 数据2 | 数据3
ROW: 数据1 | 数据2 | 数据3

7. timeline — 时间线/步骤
###PAGE###
LAYOUT: timeline
TITLE: 演进历程
DURATION: 60
STEP: 2022: Prompt Engineering：通过提示词让AI交付结果
STEP: 2025: Context Engineering：RAG和动态上下文
STEP: 2026: Harness Engineering：约束反馈控制

8. callout — 重点强调
###PAGE###
LAYOUT: callout
TITLE: 核心洞察
DURATION: 45
QUOTE: 这不是天才的灵光一现，而是行业痛点积累的必然信号
POINTS:
- 补充说明1
- 补充说明2

规则：
- 封面(cover)只用一次，放在第一页
- 每个章节用 section 作为分隔
- 有数字对比时优先用 data 或 table 布局
- 对比分析用 twocol
- 流程/演进用 timeline
- 正文默认用 content
- 每页2-4个要点
- 只输出上述格式，不要其他文字`

    const result = await this.provider.generate(prompt, { maxTokens: 16000 })
    return this._parseSlides(result)
  }

  _parseSlides(result) {
    console.log('[AI] Response length:', result?.length)
    console.log('[AI] First 400 chars:', result?.slice(0, 400))

    const pages = (result || '').split(/###PAGE###\s*/).filter(p => p.trim())
    const slides = []

    for (const page of pages) {
      const layout = this._extract(page, /LAYOUT:\s*(.+)/) || 'content'
      const title = this._extract(page, /TITLE:\s*(.+)/) || ''
      const dur = parseInt(this._extract(page, /DURATION:\s*(\d+)/)) || 90

      const slide = {
        title,
        layout,
        duration: Math.min(180, Math.max(10, dur)),
        keyPoints: []
      }

      switch (layout) {
        case 'cover':
          slide.subtitle = this._extract(page, /SUBTITLE:\s*(.+)/) || ''
          slide.author = this._extract(page, /AUTHOR:\s*(.+)/) || ''
          slide.content = this._renderCover(slide)
          break

        case 'section':
          slide.number = this._extract(page, /NUMBER:\s*(.+)/) || ''
          slide.subtitle = this._extract(page, /SUBTITLE:\s*(.+)/) || ''
          slide.content = this._renderSection(slide)
          break

        case 'data':
          slide.points = this._extractList(page, 'POINTS:')
          slide.keyPoints = slide.points
          slide.content = this._renderData(slide)
          break

        case 'twocol':
          slide.leftItems = this._extractList(page, 'LEFT:')
          slide.rightItems = this._extractList(page, 'RIGHT:')
          slide.keyPoints = [...slide.leftItems, ...slide.rightItems]
          slide.content = this._renderTwoCol(slide)
          break

        case 'table':
          slide.header = (this._extract(page, /HEADER:\s*(.+)/) || '').split('|').map(s => s.trim()).filter(Boolean)
          slide.rows = this._extractAll(page, /ROW:\s*(.+)/g).map(r => r.split('|').map(s => s.trim()).filter(Boolean))
          slide.keyPoints = slide.header
          slide.content = this._renderTable(slide)
          break

        case 'timeline':
          slide.steps = this._extractAll(page, /STEP:\s*(.+)/g)
          slide.keyPoints = slide.steps
          slide.content = this._renderTimeline(slide)
          break

        case 'callout':
          slide.quote = this._extract(page, /QUOTE:\s*(.+)/) || ''
          slide.points = this._extractList(page, 'POINTS:')
          slide.keyPoints = [slide.quote, ...slide.points]
          slide.content = this._renderCallout(slide)
          break

        default: // content
          slide.points = this._extractList(page, 'POINTS:')
          slide.keyPoints = slide.points
          slide.content = this._renderContent(slide)
      }

      if (slide.title || slide.content) {
        slides.push(slide)
      }
    }

    if (slides.length > 0) {
      console.log('[AI] Parsed', slides.length, 'slides with layouts:', slides.map(s => s.layout))
      return { slides }
    }

    console.log('[AI] All parse methods failed')
    return { slides: [], _error: '无法解析AI返回内容，请重试' }
  }

  _extract(text, regex) {
    const m = text.match(regex)
    return m ? m[1].trim() : null
  }

  _extractAll(text, regex) {
    return [...text.matchAll(regex)].map(m => m[1].trim())
  }

  _extractList(text, marker) {
    const idx = text.indexOf(marker)
    if (idx < 0) return []
    const lines = text.slice(idx + marker.length).split('\n')
    const items = []
    for (const line of lines) {
      const m = line.match(/^[-*•]\s*(.+)/)
      if (m) items.push(m[1].trim())
      else if (!line.trim()) continue
      else break
    }
    return items
  }

  // ------------------- HTML Renderers -------------------

  _renderCover(s) {
    const meta = [s.author, s.department, s.eventType, s.startTime].filter(Boolean)
    return `<div class="ppt-cover">
      <div class="ppt-cover-badge">PRESENTATION</div>
      <h1>${s.title}</h1>
      ${s.subtitle ? `<p class="ppt-cover-sub">${s.subtitle}</p>` : ''}
      ${meta.length ? `<div class="ppt-cover-meta">${meta.join(' &nbsp;|&nbsp; ')}</div>` : ''}
    </div>`
  }

  _renderClosing(s) {
    const meta = [s.author, s.department, s.startTime].filter(Boolean)
    return `<div class="ppt-closing">
      <h1>Thank you !</h1>
      ${meta.length ? `<div class="ppt-closing-meta">${meta.join(' &nbsp;|&nbsp; ')}</div>` : ''}
    </div>`
  }

  _renderSection(s) {
    return `<div class="ppt-section">
      <div class="ppt-section-num">${s.number}</div>
      <h2>${s.title}</h2>
      ${s.subtitle ? `<p class="ppt-section-sub">${s.subtitle}</p>` : ''}
    </div>`
  }

  _renderContent(s) {
    const items = (s.points || []).map(p => {
      const colon = p.indexOf('：') > 0 ? p.indexOf('：') : p.indexOf(':')
      if (colon > 0) {
        return `<li><strong>${p.slice(0, colon)}</strong>：${p.slice(colon + 1)}</li>`
      }
      return `<li>${p}</li>`
    }).join('')
    return `<ul class="ppt-list">${items}</ul>`
  }

  _renderData(s) {
    const items = (s.points || []).map(p => {
      const m = p.match(/^(.+?)[：:](.+)/)
      if (m) {
        return `<div class="ppt-data-card">
          <div class="ppt-data-num">${m[1].trim()}</div>
          <div class="ppt-data-label">${m[2].trim()}</div>
        </div>`
      }
      return `<li>${p}</li>`
    }).join('')
    return `<div class="ppt-data-grid">${items}</div>`
  }

  _renderTwoCol(s) {
    const left = (s.leftItems || []).map(p => `<li>${p}</li>`).join('')
    const right = (s.rightItems || []).map(p => `<li>${p}</li>`).join('')
    return `<div class="ppt-twocol">
      <div class="ppt-twocol-box ppt-twocol-left"><h4>${s.title.includes('vs') ? s.title.split(/vs|VS|对比/)[0]?.trim() || '方案 A' : '方案 A'}</h4><ul>${left}</ul></div>
      <div class="ppt-twocol-divider">VS</div>
      <div class="ppt-twocol-box ppt-twocol-right"><h4>${s.title.includes('vs') ? s.title.split(/vs|VS|对比/)[1]?.trim() || '方案 B' : '方案 B'}</h4><ul>${right}</ul></div>
    </div>`
  }

  _renderTable(s) {
    const thead = s.header?.length
      ? `<thead><tr>${s.header.map(h => `<th>${h}</th>`).join('')}</tr></thead>`
      : ''
    const tbody = s.rows?.length
      ? `<tbody>${s.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
      : ''
    return `<table class="ppt-table">${thead}${tbody}</table>`
  }

  _renderTimeline(s) {
    const steps = (s.steps || []).map((step, i) => {
      const m = step.match(/^(.+?)[：:](.+)/)
      if (m) {
        return `<div class="ppt-timeline-item">
          <div class="ppt-timeline-dot">${i + 1}</div>
          <div class="ppt-timeline-content">
            <strong>${m[1].trim()}</strong>
            <p>${m[2].trim()}</p>
          </div>
        </div>`
      }
      return `<div class="ppt-timeline-item"><div class="ppt-timeline-dot">${i + 1}</div><div class="ppt-timeline-content"><p>${step}</p></div></div>`
    }).join('')
    return `<div class="ppt-timeline">${steps}</div>`
  }

  _renderCallout(s) {
    return `<div class="ppt-callout">
      <blockquote>${s.quote}</blockquote>
      ${s.points?.length ? `<ul class="ppt-list">${s.points.map(p => `<li>${p}</li>`).join('')}</ul>` : ''}
    </div>`
  }

  async generateNarration(slide) {
    const prompt = `为以下PPT页面生成演讲旁白草稿（口语化、自然流畅）。

标题：${slide.title}
内容：${slide.content}
时长：${slide.duration}秒

只输出JSON：{"narration":"旁白...","keywords":["词1"],"tips":["提示1"]}`

    const result = await this.provider.generate(prompt, { maxTokens: 2000 })
    try {
      const m = result.match(/\{[\s\S]*\}/)
      if (m) return JSON.parse(m[0])
    } catch (e) {
      console.warn('[AI] Narration parse failed')
    }
    return { narration: '旁白生成失败，请手动编辑', keywords: [], tips: [] }
  }
}

export const aiService = new AIService('gateway')
