/**
 * 多模型AI服务适配器
 */

const DEFAULT_MAX_TOKENS = parseInt(import.meta.env.VITE_AI_MAX_TOKENS) || 4096
const PPT_MAX_TOKENS = parseInt(import.meta.env.VITE_AI_PPT_MAX_TOKENS) || 16000
const NARRATION_MAX_TOKENS = parseInt(import.meta.env.VITE_AI_NARRATION_MAX_TOKENS) || 2000

class AIProvider {
  constructor(config) {
    this.config = config
  }
  async generate(prompt, options = {}) {
    throw new Error('Method must be implemented')
  }
  _extractText(data) {
    if (typeof data.content === 'string') return data.content
    if (Array.isArray(data.content)) {
      const textBlock = data.content.find(b => b.type === 'text')
      if (textBlock?.text) return textBlock.text
    }
    throw new Error('Cannot extract text from Claude response')
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
        'anthropic-version': '2024-02-15'
      },
      body: JSON.stringify({
        model: this.config.model || 'claude-opus-4-8',
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Claude API error (HTTP ${response.status}): ${errText.slice(0, 200)}`)
    }
    const data = await response.json()
    return this._extractText(data)
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
        model: this.config.model || 'gpt-5.5',
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`OpenAI API error (HTTP ${response.status}): ${errText.slice(0, 200)}`)
    }
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
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Ollama API error (HTTP ${response.status}): ${errText.slice(0, 200)}`)
    }
    const data = await response.json()
    if (data.error) throw new Error(`Ollama error: ${data.error}`)
    return data.response || ''
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
          max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
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
        max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
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
        'TITLE: PPT 演讲助手',
        'SUBTITLE: AI 驱动的演示文稿生成与双屏演讲工具',
        'AUTHOR: 支持 Web · Windows · macOS · Linux',
        'DURATION: 15',
        '',
        '###PAGE###',
        'LAYOUT: toc',
        'TITLE: 目录',
        'DURATION: 20',
        'ITEM: 01. 产品概述与核心功能',
        'ITEM: 02. 多模型 AI 生成能力',
        'ITEM: 03. 双屏演示与智能计时',
        'ITEM: 04. 编辑工作流',
        'ITEM: 05. 技术架构',
        'ITEM: 06. 跨平台桌面应用',
        'ITEM: 07. 总结与展望',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 01',
        'TITLE: 产品概述与核心功能',
        'SUBTITLE: 一站式 AI 演讲解决方案',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: content',
        'TITLE: 产品概述',
        'DURATION: 60',
        'POINTS:',
        '- 全栈 AI 演讲工具，浏览器和桌面端通用',
        '- 输入文档内容或 Wiki URL，AI 自动生成 PPT + 旁白',
        '- 支持手动粘贴 Markdown/HTML、Docmost Wiki 导入、本地上传',
        '- SQLite 本地数据库持久化，离线可用',
        '',
        '###PAGE###',
        'LAYOUT: content',
        'TITLE: 十大核心功能',
        'DURATION: 90',
        'POINTS:',
        '- 多源内容输入：粘贴 · Wiki · 上传',
        '- AI 智能拆分：封面 · 目录 · 内容 · 数据 · 结语',
        '- 演讲旁白生成：演讲稿 + 关键词 + 技巧提示',
        '- 富文本编辑器：拖拽排序，可视化调整',
        '- 双屏演示：演示屏 + 旁白屏自动同步',
        '- 智能计时：剩余时间 · 进度条 · 已过时长',
        '- 四种风格模板：商务 · 科技 · 简约 · 教育',
        '- 导出 HTML / PDF',
        '- 本地 SQLite 存储，离线可用',
        '- 跨平台原生桌面应用',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 02',
        'TITLE: 多模型 AI 生成能力',
        'SUBTITLE: 灵活切换，按需选择',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: table',
        'TITLE: AI 模型对比',
        'DURATION: 60',
        'HEADER: 模型 | 类型 | 特点',
        'ROW: LLM Gateway | 统一网关 | 推荐方式，支持多模型路由',
        'ROW: Claude | 云端 API | Anthropic 旗舰模型，高质量生成',
        'ROW: OpenAI | 云端 API | GPT 系列，通用能力强',
        'ROW: Ollama | 本地部署 | 完全离线，数据不出本地',
        '',
        '###PAGE###',
        'LAYOUT: data',
        'TITLE: AI 生成效率',
        'DURATION: 50',
        'POINTS:',
        '- 10x: AI 辅助下 PPT 制作效率提升',
        '- 3min: 平均生成一份完整 PPT 耗时',
        '- 80%: 演讲者对旁白质量满意度',
        '- 100%: 离线可用（Ollama 本地模型）',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 03',
        'TITLE: 双屏演示与智能计时',
        'SUBTITLE: 演讲者的第二大脑',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: twocol',
        'TITLE: 双屏同步机制',
        'DURATION: 60',
        'LEFT:',
        '- 演示屏：全屏播放 PPT',
        '- 键盘 ← → 翻页',
        '- Space 暂停/继续',
        '- 自动同步到旁白屏',
        'RIGHT:',
        '- 旁白屏：演讲稿 + 倒计时',
        '- 关键词高亮提示',
        '- 演讲技巧建议',
        '- 页签快速跳转',
        '',
        '###PAGE###',
        'LAYOUT: content',
        'TITLE: 智能计时系统',
        'DURATION: 50',
        'POINTS:',
        '- 每页独立倒计时，到达阈值变色提醒（绿 → 黄 → 红）',
        '- 演讲已过总时长实时显示',
        '- 进度条可视化剩余时间',
        '- 一键暂停 / 重置当前页计时',
        '- 翻页自动重置计时器',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 04',
        'TITLE: 编辑工作流',
        'SUBTITLE: 从输入到演示的完整闭环',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: timeline',
        'TITLE: 六步工作流',
        'DURATION: 60',
        'STEP: Step 1: 输入内容 · 粘贴文档、上传文件或导入 Wiki',
        'STEP: Step 2: 选择风格 · 商务 / 科技 / 简约 / 教育',
        'STEP: Step 3: 选择模型 · Gateway / Claude / OpenAI / Ollama',
        'STEP: Step 4: 一键生成 · AI 自动分析、拆分、生成',
        'STEP: Step 5: 编辑微调 · 修改标题、内容、时长、旁白',
        'STEP: Step 6: 开始演示 · 双屏同步，自信表达',
        '',
        '###PAGE###',
        'LAYOUT: table',
        'TITLE: 四种风格模板',
        'DURATION: 50',
        'HEADER: 风格 | 主色调 | 适用场景',
        'ROW: 商务 | 深蓝渐变 | 企业汇报 · 客户提案',
        'ROW: 科技 | 暗黑+青色 | 技术分享 · 产品发布',
        'ROW: 简约 | 白色+浅灰 | 学术报告 · 培训课程',
        'ROW: 教育 | 白色+翠绿 | 教学课件 · 知识分享',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 05',
        'TITLE: 技术架构',
        'SUBTITLE: 现代 Web 技术栈 + 原生桌面体验',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: table',
        'TITLE: 技术选型一览',
        'DURATION: 60',
        'HEADER: 层级 | 技术 | 说明',
        'ROW: 前端框架 | Vue 3 + Vite 8 | Composition API + HMR',
        'ROW: 状态管理 | Pinia 3 | 响应式全局状态',
        'ROW: 样式方案 | Tailwind CSS 4 | 原子化 CSS',
        'ROW: PPT 引擎 | Reveal.js 6 | HTML 幻灯片',
        'ROW: 本地数据库 | SQLite (sql.js) | WebAssembly 浏览器端运行',
        'ROW: AI 集成 | Gateway / Claude / OpenAI / Ollama | 多模型适配',
        'ROW: 同步机制 | BroadcastChannel | 浏览器 + Electron 通用',
        'ROW: 桌面打包 | Electron 42 + electron-builder | 跨平台原生应用',
        '',
        '###PAGE###',
        'LAYOUT: content',
        'TITLE: 项目结构亮点',
        'DURATION: 60',
        'POINTS:',
        '- 纯前端架构，无后端依赖，AI API 直接从前端调用',
        '- Vite 按需加载 Electron 插件，开发/打包模式自动切换',
        '- 同步层自动检测环境：统一使用 BroadcastChannel',
        '- SQLite 数据库通过 IndexedDB 持久化 blob，跨会话保留',
        '- 安全架构：contextIsolation + sandbox + CSP 策略',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 06',
        'TITLE: 跨平台桌面应用',
        'SUBTITLE: 一次打包，三端运行',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: twocol',
        'TITLE: 桌面 vs 浏览器',
        'DURATION: 60',
        'LEFT:',
        '- 浏览器模式：单标签页 + 弹出窗口',
        '- 双屏通过 BroadcastChannel 同步',
        '- npm run dev 启动',
        '- 适合快速开发和调试',
        'RIGHT:',
        '- 桌面模式：三个独立原生窗口',
        '- 编辑器 + 演示屏 + 旁白屏',
        '- 一键打包 .exe / .dmg / .AppImage',
        '- 适合正式演讲场景',
        '',
        '###PAGE###',
        'LAYOUT: data',
        'TITLE: 桌面应用数据',
        'DURATION: 50',
        'POINTS:',
        '- 109MB: Windows 安装包体积',
        '- 139MB: macOS DMG 体积 (arm64)',
        '- 136MB: Linux AppImage 体积',
        '- 3: 支持独立原生窗口数',
        '',
        '###PAGE###',
        'LAYOUT: section',
        'NUMBER: 07',
        'TITLE: 总结与展望',
        'SUBTITLE: 让演讲回归内容本身',
        'DURATION: 10',
        '',
        '###PAGE###',
        'LAYOUT: callout',
        'TITLE: 核心洞察',
        'DURATION: 45',
        'QUOTE: 演讲的本质不是 PPT 排版，而是思想的高效传递。PPT 演讲助手让演讲者专注于内容表达，而非工具操作。',
        'POINTS:',
        '- AI 消除制作摩擦',
        '- 双屏提升演讲自信',
        '- 跨平台覆盖全场景'
      ].join('\n')
    }
    // Narration generation — return per-slide mock based on slide content
    if (prompt.includes('标题：') || prompt.includes('旁白')) {
      const titleMatch = prompt.match(/标题：(.+)/)
      const durationMatch = prompt.match(/时长：(\d+)/)
      const title = titleMatch ? titleMatch[1].trim() : ''
      const duration = durationMatch ? parseInt(durationMatch[1]) : 60
      return this._mockNarration(title, duration)
    }
    return JSON.stringify({ narration: '', keywords: [], tips: [] })
  }

  _mockNarration(title, duration) {
    const narrations = {
      'PPT 演讲助手': '大家好！欢迎来到 PPT 演讲助手的演示现场。这是一款 AI 驱动的演示文稿生成与双屏演讲工具，支持 Web 浏览器和 Windows、macOS、Linux 三大桌面平台。',
      '目录': '下面让我带大家快速浏览今天的内容。我们将从产品概述开始，逐步展开核心功能、技术架构、以及跨平台桌面应用体验。',
      '产品概述': '先来看产品全貌。PPT 演讲助手定位为一站式 AI 演讲解决方案，你只需要输入文档内容或 Wiki 链接，AI 就能自动分析结构、拆分页面、生成 PPT 和配套旁白。更棒的是，它还支持离线使用——所有数据通过 SQLite 本地数据库持久化存储。',
      '十大核心功能': '来看看它的十大核心能力：多源内容输入、AI 智能拆分、演讲旁白生成、富文本编辑器、双屏演示、智能计时、四种风格模板、HTML PDF 导出、本地存储、以及跨平台桌面应用。每一项都是为演讲者量身打造。',
      'AI 模型对比': '在 AI 模型选择上，我们支持四种方式：LLM Gateway 统一网关推荐使用，Claude 和 OpenAI 提供云端高质量生成，Ollama 支持完全离线的本地部署。你可以根据场景灵活切换。',
      'AI 生成效率': '数据说话：AI 辅助下 PPT 制作效率提升 10 倍，平均 3 分钟生成一份完整 PPT，80% 的演讲者对旁白质量表示满意。使用 Ollama 本地模型时，100% 离线可用，数据不出本地。',
      '双屏同步机制': '双屏是 PPT 演讲助手的核心竞争力。演示屏全屏播放 PPT，支持键盘左右翻页、空格暂停；旁白屏同步显示演讲稿、倒计时、关键词和演讲技巧。两块屏幕通过 BroadcastChannel 实时同步，在浏览器和 Electron 桌面端通用。',
      '智能计时系统': '智能计时让演讲节奏更可控。每页独立倒计时，剩余时间以绿、黄、红三色提醒。总演讲时长实时追踪，进度条可视化。支持一键暂停或重置当前页计时，翻页自动刷新。',
      '六步工作流': '从输入到演示，六步完成：输入内容、选择风格、选择模型、一键生成、编辑微调、开始演示。整个过程流畅自然，AI 在背后默默干活。',
      '四种风格模板': '四种 PPT 风格模板覆盖不同场景。商务风适合企业汇报和客户提案，科技风适合技术分享和产品发布，简约风适合学术报告和培训课程，教育风适合教学课件。你喜欢哪一种？',
      '技术选型一览': '技术栈一览：前端 Vue 3 + Vite 8，状态管理 Pinia 3，样式 Tailwind CSS 4，PPT 引擎 Reveal.js 6，本地数据库 SQLite via WebAssembly，AI 集成支持四大模型，同步机制是 BroadcastChannel，桌面打包基于 Electron 42。',
      '项目结构亮点': '架构上有几个亮点值得关注：纯前端架构零后端依赖，Vite 按需加载 Electron 插件实现开发打包自动切换，同步层统一使用 BroadcastChannel 简化代码，SQLite 通过 IndexedDB 持久化 blob 实现跨会话数据保留。安全方面采用 contextIsolation、sandbox 和 CSP 策略。',
      '桌面 vs 浏览器': '浏览器模式用单标签页加弹出窗口运行，适合快速开发和调试；桌面模式则提供三个独立原生窗口——编辑器、演示屏、旁白屏，适合正式演讲场景。一键打包，支持三大平台。',
      '桌面应用数据': '桌面应用的包体积：Windows 安装包 109MB，macOS arm64 版 139MB，Linux AppImage 136MB。三个独立原生窗口协同工作，带来沉浸式演讲体验。',
      '核心洞察': '最后分享一个核心洞察：演讲的本质不是 PPT 排版，而是思想的高效传递。PPT 演讲助手通过 AI 消除制作摩擦，双屏提升演讲自信，跨平台覆盖全场景，让演讲者回归内容本身。'
    }
    const key = Object.keys(narrations).find(k => title.includes(k))
    const narration = key ? narrations[key] : `关于「${title}」这页内容，让我为大家详细讲解。这页的核心要点已经在屏幕上呈现，我来展开说明每一个关键点，帮助大家深入理解。`

    // Generate relevant keywords and tips based on title
    const kwMap = {
      'PPT 演讲助手': ['AI驱动', '双屏演讲', '跨平台'],
      '产品概述': ['全栈工具', 'AI生成', '离线可用'],
      '十大核心功能': ['多源输入', '双屏演示', '智能计时', '跨平台'],
      'AI 模型对比': ['LLM Gateway', 'Claude', 'OpenAI', 'Ollama'],
      'AI 生成效率': ['10倍提升', '3分钟', '离线可用'],
      '技术选型': ['Vue 3', 'Electron', 'SQLite', 'BroadcastChannel'],
      '项目结构': ['纯前端', '零后端', '安全架构'],
      '桌面 vs 浏览器': ['多窗口', '原生体验', '跨平台'],
      '桌面应用数据': ['109MB', '139MB', '136MB'],
      '核心洞察': ['回归内容', '消除摩擦', '跨平台'],
    }
    const tipMap = {
      'PPT 演讲助手': ['开场语调积极，目光接触观众', '可以配合手势强调"AI驱动"'],
      '产品概述': ['语速适中，给听众消化信息的时间', '强调"离线可用"这个差异化卖点'],
      '十大核心功能': ['逐条过，每条停顿1秒让听众消化', '最后一条"跨平台"加重语气'],
      'AI 模型对比': ['对比时左右手势配合', '强调 Ollama 离线特性'],
      'AI 生成效率': ['每个数据点停顿，让数字有冲击力', '对 100% 这个数据可以重复一次'],
      '技术选型': ['技术名词清晰发音', '对 Electron 和 BroadcastChannel 稍作解释'],
      '项目结构': ['强调"纯前端"架构优势', '安全特性可以稍微展开'],
      '桌面 vs 浏览器': ['对比语气明显', '可以问听众偏好哪种模式'],
      '桌面应用数据': ['数据列举时用手势辅助', '强调三窗口协同的价值'],
      '核心洞察': ['放慢语速，这句是总结', '结束前环视全场'],
    }

    let keywords = []
    let tips = []
    for (const [k, v] of Object.entries(kwMap)) {
      if (title.includes(k)) { keywords = v; break }
    }
    for (const [k, v] of Object.entries(tipMap)) {
      if (title.includes(k)) { tips = v; break }
    }

    return JSON.stringify({ narration, keywords, tips })
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

  async generatePPT(wikiContent, style, options = {}) {
    const styleGuide = {
      business: '商务专业风：深蓝主色(#1e3a5f)，白色背景，简洁排版。数据驱动。',
      tech: '科技现代风：深色背景(#0f172a)，青色/紫色高亮(#06b6d4)。适合技术演讲。',
      minimal: '极简优雅风：纯白背景，灰黑文字(#1a1a2e)，大量留白。',
      education: '教育清晰风：浅绿/白背景，深绿标题(#065f46)。结构清晰。'
    }

    const pageCountDirective = options.pageCount
      ? `\n页数要求：请生成大约 ${options.pageCount.min} 到 ${options.pageCount.max} 页正文内容（不包含封面和目录页）。\n`
      : ''
    const tocDirective = options.includeToc
      ? `\n必须在封面(cover)之后紧接着生成一页目录(toc)，列出后续所有章节标题和对应页码。\n`
      : ''

    const prompt = `你是PPT设计专家。根据文档生成PPT，用 ###PAGE### 分隔。要求排版丰富，不单调。${pageCountDirective}${tocDirective}

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

2. toc — 目录页（封面之后，只能用一次）
###PAGE###
LAYOUT: toc
TITLE: 目录
DURATION: 20
ITEM: 01. 章节名称
ITEM: 02. 章节名称

3. section — 章节分隔页
###PAGE###
LAYOUT: section
NUMBER: 01
TITLE: 章节名称
SUBTITLE: 一句话概括
DURATION: 10

4. content — 正文（默认，最常用）
###PAGE###
LAYOUT: content
TITLE: 页面标题
DURATION: 90
POINTS:
- 要点：解释说明
- 要点：解释说明

5. data — 数据突出（有数字时用）
###PAGE###
LAYOUT: data
TITLE: 核心数据
DURATION: 60
POINTS:
- 88%: Agent 项目未能进入生产
- 10,000+: 月增安全漏洞

6. twocol — 左右对比
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

7. table — 表格（有多行对比数据时）
###PAGE###
LAYOUT: table
TITLE: 表格标题
DURATION: 90
HEADER: 列1 | 列2 | 列3
ROW: 数据1 | 数据2 | 数据3
ROW: 数据1 | 数据2 | 数据3

8. timeline — 时间线/步骤
###PAGE###
LAYOUT: timeline
TITLE: 演进历程
DURATION: 60
STEP: 2022: Prompt Engineering：通过提示词让AI交付结果
STEP: 2025: Context Engineering：RAG和动态上下文
STEP: 2026: Harness Engineering：约束反馈控制

9. callout — 重点强调
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
- 封面(cover)后紧接着放一页目录(toc)，列出后续所有章节标题（每个ITEM对应一个章节）
- 严格按照目录(toc)的顺序组织内容：每个目录条目对应一个 section 分隔页（带序号），后面是该章节的正文内容
- section 的 NUMBER 必须与目录中对应的 ITEM 序号一致
- 目录有几条，后面就要有多少个 section（每个 section 后可以有1-2页正文）
- 有数字对比时优先用 data 或 table 布局
- 对比分析用 twocol
- 流程/演进用 timeline
- 正文默认用 content
- 每页2-4个要点
- 只输出上述格式，不要其他文字`

    const result = await this.provider.generate(prompt, { maxTokens: PPT_MAX_TOKENS })
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

        case 'toc':
          slide.items = this._extractAll(page, /ITEM:\s*(.+)/g)
          slide.keyPoints = slide.items
          slide.content = this._renderToc(slide)
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
      <h1>感谢观看</h1>
      ${meta.length ? `<div class="ppt-closing-meta">${meta.join(' &nbsp;|&nbsp; ')}</div>` : ''}
    </div>`
  }

  _renderToc(s) {
    const items = (s.items || []).map((item, i) => {
      const m = item.match(/^(\d+)[.\s、]+(.+)/)
      if (m) {
        return `<div class="ppt-toc-item">
          <span class="ppt-toc-num">${m[1]}</span>
          <span class="ppt-toc-title">${m[2]}</span>
        </div>`
      }
      return `<div class="ppt-toc-item">
        <span class="ppt-toc-num">${String(i + 1).padStart(2, '0')}</span>
        <span class="ppt-toc-title">${item}</span>
      </div>`
    }).join('')
    return `<div class="ppt-toc">
      <h2 class="ppt-toc-heading">目录</h2>
      <div class="ppt-toc-list">${items}</div>
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

    const result = await this.provider.generate(prompt, { maxTokens: NARRATION_MAX_TOKENS })
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
