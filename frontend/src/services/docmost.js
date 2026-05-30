/**
 * Docmost MCP 客户端
 * 通过 Docmost MCP HTTP 端点获取 wiki 页面内容
 *
 * MCP 端点通过 VITE_DOCMOST_MCP_URL 环境变量配置
 * 认证方式: Bearer token (JWT)
 */
export class DocmostClient {
  constructor(config = {}) {
    this.mcpUrl = config.mcpUrl || ''
    this.mcpToken = config.mcpToken || ''
  }

  /**
   * 从 URL 解析 space 和 page 标识
   * 支持: /s/{spaceSlug}/p/{pageId-slug}
   */
  parseUrl(url) {
    const path = url.replace(/^https?:\/\/[^/]+/, '').replace(/\/+$/, '')
    const match = path.match(/\/s\/([^/]+)\/p\/([^/?#]+)/)
    if (match) return { spaceSlug: match[1], pageIdentifier: match[2] }
    const pm = path.match(/\/p\/([^/?#]+)/)
    if (pm) return { pageIdentifier: pm[1] }
    return null
  }

  /**
   * 调用 MCP 工具 (浏览器兼容版，使用 fetch 代替 axios)
   */
  async callTool(toolName, args) {
    const body = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      },
      id: Date.now()
    }

    console.log(`[MCP] Calling ${toolName}`, JSON.stringify(args).slice(0, 200))

    const res = await fetch(this.mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.mcpToken}`
      },
      body: JSON.stringify(body)
    })

    const text = await res.text()
    const contentType = res.headers.get('content-type')
    return this.parseMCPResponse(text, contentType)
  }

  /**
   * 解析 MCP 响应（支持 JSON 和 SSE 格式）
   */
  parseMCPResponse(data, contentType) {
    // SSE 格式 (text/event-stream)
    if (typeof data === 'string' && data.includes('data:')) {
      const lines = data.split('\n')
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const json = JSON.parse(line.slice(5).trim())
            return this.extractMCPResult(json)
          } catch (e) { /* continue */ }
        }
      }
    }

    // JSON 字符串
    try {
      const json = JSON.parse(data)
      return this.extractMCPResult(json)
    } catch (e) { /* not JSON */ }

    throw new Error('无法解析 MCP 响应')
  }

  /**
   * 从 MCP 响应中提取实际结果
   * MCP 格式: { result: { content: [{ type: "text", text: "{\"records\":[...]}" }] } }
   * 或直接: { records: [...] }
   */
  extractMCPResult(data) {
    if (data.error) throw new Error(`MCP error: ${JSON.stringify(data.error)}`)

    // MCP 标准格式: result.content[0].text
    let content = data.result?.content || data.content
    if (Array.isArray(content)) {
      const textBlock = content.find(b => b.type === 'text')
      if (textBlock?.text) {
        try {
          return JSON.parse(textBlock.text)
        } catch (e) {
          return textBlock.text
        }
      }
    }

    // 直接有 records 字段
    if (data.records) return data

    // data.result 本身就有 records
    if (data.result?.records) return data.result

    // 兜底：返回原数据
    return data
  }

  /**
   * 获取页面内容
   */
  async fetchPage(identifier, spaceSlug) {
    if (!this.mcpToken) {
      throw new Error('未配置 MCP Token。请在 .env.local 中设置 VITE_DOCMOST_TOKEN')
    }

    const urlPath = spaceSlug
      ? `s/${spaceSlug}/p/${identifier}`
      : `p/${identifier}`

    console.log(`[MCP] Fetching page: ${urlPath}`)

    const result = await this.callTool('search_knowledge', {
      url: [urlPath],
      format: 'markdown'
    })

    // 从 MCP 响应中提取 records
    const records = result?.records || []
    if (records.length > 0) {
      const page = records[0]
      return {
        title: page.title || '',
        content: page.content || ''
      }
    }

    throw new Error(`未找到页面: ${identifier}`)
  }
}
