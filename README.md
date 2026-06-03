# PPT 演讲助手

AI 驱动的 PPT 生成与双屏演讲工具，支持 **Web 浏览器** 和 **Windows/macOS/Linux 桌面应用**。

## 功能特点

- ✅ **多源内容输入**：支持 Docmost Wiki、文件上传、手动粘贴
- ✅ **AI 智能生成**：自动分析内容结构，生成 PPT 和旁白
- ✅ **多模型支持**：LLM Gateway / Claude / OpenAI / Ollama
- ✅ **双屏演示**：演示屏全屏播放 PPT，旁白屏同步显示演讲稿 + 倒计时
- ✅ **智能计时**：每页剩余时间 + 演讲已过时长，暂停/重置控制
- ✅ **本地存储**：SQLite（sql.js）持久化项目数据
- ✅ **导出功能**：支持导出 HTML 和 PDF 格式
- ✅ **跨平台桌面应用**：Electron 打包，原生多窗口 + IPC 同步

## 快速开始

### Web 浏览器

```bash
cd frontend
npm install
npm run dev
```

打开 http://localhost:5173 即可使用。

### 桌面应用

```bash
cd frontend
npm install

# 打包（三平台）
npm run electron:build:mac     # macOS (.dmg)
npm run electron:build:win     # Windows (.exe)
npm run electron:build:linux   # Linux (.AppImage)
```

> macOS 首次打开时若提示"无法验证开发者"，右键 → 打开 → 确认即可。

## 配置 AI 服务

在 UI 设置面板中直接输入，或复制 `.env.example` 为 `.env.local` 填写：

```env
# AI 提供商: gateway | claude | openai | ollama
VITE_AI_PROVIDER=gateway

# AI 通用配置
VITE_AI_MAX_TOKENS=4096
VITE_AI_PPT_MAX_TOKENS=16000
VITE_AI_NARRATION_MAX_TOKENS=2000

# LLM Gateway（推荐）
VITE_AI_GATEWAY_BASE_URL=https://your-gateway.example.com
VITE_AI_GATEWAY_API_KEY=sk-your-api-key
VITE_AI_GATEWAY_MODEL=deepseek-v4-pro

# Claude 官方 API
VITE_CLAUDE_API_KEY=sk-ant-your-api-key
VITE_CLAUDE_API_MODEL=claude-opus-4-8

# OpenAI 官方 API
VITE_OPENAI_API_KEY=sk-your-api-key
VITE_OPENAI_API_MODEL=gpt-5.5

# Ollama 本地
VITE_OLLAMA_ENDPOINT=http://localhost:11434
VITE_OLLAMA_MODEL=qwen3

# Docmost Wiki MCP（可选）
VITE_DOCMOST_MCP_URL=https://your-wiki.example.com/api/mcp/streamable
VITE_DOCMOST_TOKEN=your-wiki-token
```

## 使用流程

1. **输入内容** — 粘贴 Markdown/HTML、上传文件、或输入 Wiki URL
2. **选择风格** — 商务 / 科技 / 简约 / 教育
3. **选择模型** — LLM Gateway / Claude / OpenAI / Ollama
4. **生成 PPT** — AI 自动分析结构、拆分页面、生成旁白
5. **编辑调整** — 修改标题/内容/时长/旁白，拖拽排序页面
6. **开始演示** — 演示屏 + 旁白屏自动同步翻页和计时

## 双屏操作

| 操作 | 快捷键 |
|------|--------|
| 上一页 / 下一页 | ← → |
| 暂停 / 继续 | Space |
| 重置计时 | 点击「重置本页」 |

旁白窗口实时显示：当前页标题、旁白内容、关键词、演讲技巧提示。

## 技术架构

| 层级 | 技术 |
|------|------|
| 前端框架 | Vue 3 + Vite 8 + Pinia |
| 样式 | Tailwind CSS 4 |
| PPT 引擎 | Reveal.js 6 |
| 数据库 | SQLite (sql.js + IndexedDB) |
| AI 集成 | LLM Gateway / Claude API / OpenAI API / Ollama |
| 同步机制 | BroadcastChannel（浏览器）/ Electron IPC（桌面） |
| 桌面打包 | Electron 42 + electron-builder |
| Markdown | marked |

## 项目结构

```
ppt-narrator/
├── frontend/
│   ├── electron/                    # Electron 主进程
│   │   ├── main.cjs                 #   窗口管理 + IPC 消息代理 + CSP
│   │   └── preload.cjs              #   contextBridge 安全桥接层
│   ├── build/                       # 打包资源（图标）
│   ├── electron-builder.yml         # 三平台打包配置
│   ├── package.json
│   ├── vite.config.mjs              # Vite 配置（按需加载 Electron 插件）
│   ├── public/
│   │   └── sql-wasm.wasm            # SQLite WebAssembly
│   └── src/
│       ├── views/
│       │   ├── Home.vue             # 首页：内容输入 + 风格选择 + 项目列表
│       │   ├── Editor.vue           # 编辑器：调整 PPT 和旁白
│       │   ├── Presenter.vue        # 演示屏：全屏播放 PPT
│       │   └── Narrator.vue         # 旁白屏：演讲提示 + 倒计时
│       ├── components/layout/
│       │   └── AppShell.vue         # 侧边栏 + 设置面板
│       ├── stores/
│       │   └── ppt.js               # Pinia 状态管理
│       ├── services/
│       │   ├── ai-provider.js       # 多模型 AI 适配器
│       │   ├── generation.js        # PPT 生成引擎
│       │   ├── storage.js           # SQLite 本地存储
│       │   └── docmost.js           # Docmost MCP 客户端
│       ├── utils/
│       │   ├── sync.js              # 双屏同步（自动检测 BroadcastChannel / IPC）
│       │   ├── sync-electron.js     # Electron IPC 同步适配器
│       │   └── parser.js            # Markdown/HTML 解析
│       └── router/index.js          # Vue Router (hash 模式)
└── README.md
```

## 许可证

MIT
