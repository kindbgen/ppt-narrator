import { defineStore } from 'pinia'

export const usePPTStore = defineStore('ppt', {
  state: () => ({
    // PPT数据
    slides: [],
    currentPage: 0,
    currentProjectId: null,

    // 项目元数据
    projectTitle: '未命名项目',
    speaker: '',
    department: '',
    eventType: '内部技术讲座',
    startTime: '',

    // 演示状态
    isPresenting: false,
    elapsedTime: 0,

    // AI 生成状态
    generatingNarrations: false,
    narrationProgress: null,
    generatingProjectId: null,

    // 配置
    config: {
      aiProvider: 'claude',
      templateStyle: 'business',
      defaultDuration: 120 // 默认每页时长(秒)
    }
  }),

  getters: {
    totalPages: (state) => state.slides.length,
    currentSlide: (state) => state.slides[state.currentPage] || {},
    progressPercentage: (state) => {
      if (state.slides.length === 0) return 0
      return Math.round((state.currentPage / state.slides.length) * 100)
    }
  },

  actions: {
    // 设置幻灯片数据
    setSlides(slides) {
      this.slides = slides.map((slide, index) => ({
        ...slide,
        pageIndex: index,
        duration: slide.duration || this.config.defaultDuration,
        narration: slide.narration || ''
      }))
    },

    // 切换页面
    changePage(index) {
      if (index >= 0 && index < this.slides.length) {
        this.currentPage = index
      }
    },

    // 下一页
    nextPage() {
      if (this.currentPage < this.slides.length - 1) {
        this.currentPage++
      }
    },

    // 上一页
    prevPage() {
      if (this.currentPage > 0) {
        this.currentPage--
      }
    },

    // 更新幻灯片内容
    updateSlide(index, content) {
      if (this.slides[index]) {
        this.slides[index] = { ...this.slides[index], ...content }
      }
    },

    // 更新旁白
    updateNarration(index, narration) {
      if (this.slides[index]) {
        this.slides[index].narration = narration
      }
    },

    // 开始演示
    startPresentation() {
      this.isPresenting = true
      this.elapsedTime = 0
    },

    // 结束演示
    stopPresentation() {
      this.isPresenting = false
    },

    // 更新已用时间
    updateElapsedTime(seconds) {
      this.elapsedTime = seconds
    },

    // 设置AI提供商
    setAIProvider(provider) {
      this.config.aiProvider = provider
    },

    // 设置模板风格
    setTemplateStyle(style) {
      this.config.templateStyle = style
    }
  }
})