import { Router } from 'express'
import { DocmostClient } from '../services/docmost.js'

export const wikiRouter = Router()

/**
 * POST /api/wiki/fetch
 * 通过 MCP 获取 wiki 页面内容
 * Body: { url, mcpUrl?, mcpToken? }
 */
wikiRouter.post('/fetch', async (req, res) => {
  try {
    const { url, mcpUrl, mcpToken } = req.body

    if (!url) {
      return res.status(400).json({ error: '缺少 URL 参数' })
    }

    const client = new DocmostClient({ mcpUrl, mcpToken })
    const parsed = client.parseUrl(url)

    if (!parsed) {
      return res.status(400).json({
        error: '无法解析 URL 格式。支持的格式: /s/{space}/p/{pageId}'
      })
    }

    const result = await client.fetchPage(parsed.pageIdentifier, parsed.spaceSlug)

    res.json({
      success: true,
      title: result.title,
      content: result.content
    })
  } catch (error) {
    console.error('Wiki fetch error:', error.message)
    res.status(500).json({
      error: error.message || '获取文档失败'
    })
  }
})
