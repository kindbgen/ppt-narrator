# PPT演讲助手

将Wiki文档转换为HTML格式PPT的工具，自动生成演讲旁白，支持双屏演示模式。

## 功能特点

- ✅ **多源内容输入**：支持Docmost Wiki、文件上传、手动粘贴
- ✅ **AI智能生成**：自动分析内容结构，生成PPT和旁白
- ✅ **多模型支持**：支持Claude、OpenAI、本地Ollama模型
- ✅ **双屏演示**：演示屏播放PPT，旁白屏同步显示演讲稿
- ✅ **智能倒计时**：每页倒计时提醒，帮助控制演讲节奏

## 快速开始

### 安装依赖

```bash
cd frontend
npm install
```

### 配置AI服务

通过环境变量配置（创建 `.env.local`）：

```env
# LLM Gateway（推荐）
VITE_AI_GATEWAY_BASE_URL=https://your-gateway.example.com
VITE_AI_GATEWAY_API_KEY=sk-your-api-key
VITE_AI_GATEWAY_MODEL=deepseek-v4-pro

# 或 Claude
VITE_CLAUDE_API_KEY=sk-ant-your-api-key

# 或 OpenAI
VITE_OPENAI_API_KEY=sk-your-api-key
```

也可以在UI界面中直接输入配置。

### 启动应用

```bash
npm run dev
```

## 使用流程

### 1. 输入内容

选择内容来源：
- **Docmost Wiki**：输入Wiki文档URL
- **上传文件**：上传Markdown或HTML文件
- **手动粘贴**：直接粘贴文档内容

### 2. 选择风格

选择PPT模板风格：
- **商务**：简洁专业，蓝色主色调
- **科技**：现代动感，深色背景
- **简约**：清爽优雅，浅色调
- **教育**：清晰易读，高对比度

### 3. 选择AI模型

选择AI生成服务：
- **Claude**：高质量生成（需API Key）
- **OpenAI**：GPT-4模型（需API Key）
- **本地模型**：Ollama无需API Key

### 4. 生成PPT

点击"生成PPT和旁白"，AI将自动：
- 分析文档结构
- 拆分页面内容
- 生成演讲旁白
- 预估每页时长

### 5. 编辑调整

在编辑器中微调：
- 修改页面内容
- 调整演讲时长
- 编辑旁白文本
- 添加演讲提示

### 6. 开始演示

点击"开始演示"，系统将：
- 打开PPT演示窗口（主屏）
- 打开旁白参考窗口（副屏）
- 自动同步翻页
- 显示倒计时提醒

## 双屏使用技巧

### 控制操作

- **翻页**：在演示窗口点击"上一页/下一页"
- **暂停计时**：点击"暂停"按钮
- **重置计时**：点击"重置"按钮

### 旁白窗口

- 自动滚动到当前页旁白
- 显示剩余时间提醒
- 提供关键词提示
- 显示演讲技巧提示

## 配置文件

### AI服务配置

```yaml
ai:
  provider: claude  # 选择提供商
  claude:
    model: claude-3-5-sonnet-20241022
    api_key: your-api-key
```

### 演示配置

```yaml
presentation:
  default_duration: 120  # 默认每页时长(秒)
  timer_thresholds:
    warning: 30  # 黄色提醒
    critical: 10  # 红色提醒
```

## 技术架构

- **前端**：Vue 3 + Vite + TailwindCSS
- **PPT引擎**：Reveal.js
- **同步机制**：BroadcastChannel API
- **AI集成**：LLM Gateway / Claude / OpenAI / Ollama（纯前端直接调用）
- **Wiki对接**：Docmost MCP（前端直接调用）

## 项目结构

```
ppt-narrator/
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── views/        # 页面组件
│   │   │   ├── Home.vue          # 首页：内容输入、风格选择、AI配置
│   │   │   ├── Editor.vue        # 编辑器：微调PPT和旁白
│   │   │   ├── Presenter.vue     # 演示屏：PPT全屏播放
│   │   │   └── Narrator.vue      # 旁白屏：演讲提示
│   │   ├── components/   # 通用组件
│   │   ├── stores/       # Pinia状态管理
│   │   ├── services/     # AI服务 + Wiki对接
│   │   │   ├── ai-provider.js    # 多模型AI适配器
│   │   │   └── docmost.js        # Docmost MCP客户端
│   │   ├── utils/        # 工具函数
│   │   │   ├── parser.js         # Markdown/HTML解析
│   │   │   └── sync.js           # 双屏同步
│   │   └── router/       # 路由配置
│   └── package.json
├── prompts/               # AI提示词模板
└── README.md
```

## 开发计划

- [ ] Docmost API集成
- [ ] 模板样式优化
- [ ] 导出PDF功能
- [ ] 演讲录制功能
- [ ] 云存储集成

## 许可证

MIT