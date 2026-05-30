import { marked } from 'marked'
import * as cheerio from 'cheerio'

/**
 * 内容解析器
 */
export class ContentParser {
  /**
   * 解析 Markdown 内容
   */
  parseMarkdown(content) {
    const html = marked(content)
    const structure = this.extractStructure(content)
    return {
      html,
      structure,
      rawContent: content
    }
  }

  /**
   * 解析 HTML 内容
   */
  parseHTML(content) {
    const $ = cheerio.load(content)
    const structure = this.extractHTMLStructure($)
    return {
      html: content,
      structure,
      rawContent: content
    }
  }

  /**
   * 提取 Markdown 结构
   */
  extractStructure(markdown) {
    const lines = markdown.split('\n')
    const structure = []

    lines.forEach((line, index) => {
      // 标题
      if (line.startsWith('#')) {
        const level = line.match(/^#+/)[0].length
        const title = line.replace(/^#+\s*/, '')
        structure.push({
          type: 'heading',
          level,
          title,
          lineIndex: index
        })
      }
      // 列表项
      else if (line.match(/^\s*[-*+]\s/)) {
        structure.push({
          type: 'listItem',
          content: line.replace(/^\s*[-*+]\s/, ''),
          lineIndex: index
        })
      }
      // 代码块
      else if (line.match(/^```/)) {
        structure.push({
          type: 'codeBlock',
          lineIndex: index
        })
      }
      // 图片
      else if (line.match(/!\[.*?\]\(.*?\)/)) {
        const match = line.match(/!\[(.*?)\]\((.*?)\)/)
        structure.push({
          type: 'image',
          alt: match[1],
          url: match[2],
          lineIndex: index
        })
      }
    })

    return structure
  }

  /**
   * 提取 HTML 结构
   */
  extractHTMLStructure($) {
    const structure = []

    $('h1, h2, h3, h4, h5, h6').each((index, element) => {
      const $el = $(element)
      structure.push({
        type: 'heading',
        level: parseInt(element.tagName.replace('h', '')),
        title: $el.text(),
        index
      })
    })

    $('ul > li, ol > li').each((index, element) => {
      structure.push({
        type: 'listItem',
        content: $(element).text(),
        index
      })
    })

    $('img').each((index, element) => {
      const $el = $(element)
      structure.push({
        type: 'image',
        alt: $el.attr('alt') || '',
        url: $el.attr('src'),
        index
      })
    })

    return structure
  }

  /**
   * 将结构拆分为 PPT 页面
   */
  splitIntoSlides(structure, options = {}) {
    const slides = []
    let currentSlide = null

    structure.forEach((item) => {
      // 主标题作为新页面开始
      if (item.type === 'heading' && item.level <= 2) {
        if (currentSlide) {
          slides.push(currentSlide)
        }
        currentSlide = {
          title: item.title,
          level: item.level,
          items: []
        }
      }
      // 子标题作为内容项
      else if (item.type === 'heading' && item.level > 2) {
        if (currentSlide) {
          currentSlide.items.push({
            type: 'subheading',
            content: item.title
          })
        }
      }
      // 其他内容项
      else if (currentSlide) {
        currentSlide.items.push(item)
      }
    })

    // 添加最后一个页面
    if (currentSlide) {
      slides.push(currentSlide)
    }

    return slides
  }
}

// 单例实例
export const parser = new ContentParser()