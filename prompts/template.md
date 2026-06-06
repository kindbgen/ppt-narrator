# AI 提示词模板

本文档记录了 PPT 演讲助手中 AI 生成使用的提示词模板，供未来调优参考。

> 当前提示词直接嵌入在 `frontend/src/services/ai-provider.js` 的 `_buildPPTGenerationPrompt()` 和 `generateNarration()` 方法中。

---

## PPT 生成提示词

### 核心任务
根据用户输入的内容（Markdown、HTML、Wiki 文档）生成结构化的 PPT 幻灯片数据。

### 系统提示
```
你是PPT设计专家。根据文档生成PPT，用 ###PAGE### 分隔。要求排版丰富，不单调。
```

### 布局类型

| 布局 | 用途 | 限制 |
|------|------|------|
| `cover` | 封面页 — 主题、副标题、演讲人 | 仅第一页 |
| `toc` | 目录页 — 列出所有章节 | 封面之后，仅一次 |
| `section` | 章节分隔页 — 带序号 | 每章开头 |
| `content` | 正文内容页 — 要点列表 | 默认布局 |
| `data` | 数据展示 — 指标卡片 | 有数字对比时 |
| `twocol` | 左右对比 — 两种方案 | 对比分析 |
| `table` | 表格 — 多行对比 | 表格数据 |
| `timeline` | 时间线 — 演进/步骤 | 流程展示 |
| `callout` | 重点强调 — 引用+补充 | 核心洞察 |
| `closing` | 结尾页 — 感谢观看 | 最后一页 |

### 输出格式
```
###PAGE###
LAYOUT: cover
TITLE: 演讲主题
SUBTITLE: 副标题
AUTHOR: 演讲人
DURATION: 15

###PAGE###
LAYOUT: toc
TITLE: 目录
DURATION: 20
ITEM: 01. 章节名称
ITEM: 02. 章节名称

###PAGE###
LAYOUT: section
TITLE: 章节标题
NUMBER: 01
DURATION: 15

###PAGE###
LAYOUT: content
TITLE: 页面标题
DURATION: 90
POINTS:
- 要点1
- 要点2
- 要点3

###PAGE###
LAYOUT: data
TITLE: 数据标题
DURATION: 60
POINTS:
- 88%: 描述1
- 10,000+: 描述2

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

###PAGE###
LAYOUT: table
TITLE: 表格标题
DURATION: 90
HEADER: 列1 | 列2 | 列3
ROW: 数据1 | 数据2 | 数据3

###PAGE###
LAYOUT: timeline
TITLE: 演进历程
DURATION: 60
STEP: 2022: 描述
STEP: 2025: 描述

###PAGE###
LAYOUT: callout
TITLE: 核心洞察
DURATION: 45
QUOTE: 引用语
POINTS:
- 补充说明1

###PAGE###
LAYOUT: closing
TITLE: 感谢观看
DURATION: 10
```

### 生成规则
- 封面只出现一次，紧跟其后放目录页
- 目录中的每个条目对应一个 section 分隔页
- section 的序号必须与目录一致
- 每页 2-4 个要点
- 只输出上述格式，不输出其他文字
- 支持风格参数：business（商务蓝）、tech（科技深色）、minimal（简约浅色）、education（教育绿）

### 风格映射

| 风格 | 主色调 | 适用场景 |
|------|--------|---------|
| business | 深蓝渐变色 | 项目汇报、商务演示 |
| tech | 灰黑+青色 | 技术分享、产品发布 |
| minimal | 白+灰 | 简洁报告、学术展示 |
| education | 翠绿+白 | 培训课程、教学演示 |

---

## 旁白生成提示词

### 核心任务
为每页 PPT 生成口语化的演讲旁白草稿。

### 提示词模板
```
为以下PPT页面生成演讲旁白草稿（口语化、自然流畅）。

标题：{slide.title}
内容：{slide.content}
时长：{slide.duration}秒

只输出JSON：{"narration":"旁白...","keywords":["词1"],"tips":["提示1"]}
```

### 输出格式
```json
{
  "narration": "完整的旁白文本，口语化、自然流畅",
  "keywords": ["核心关键词1", "关键词2", "关键词3"],
  "tips": ["演讲技巧提示1", "演讲技巧提示2"]
}
```

### 旁白要求
- **语言风格**：自然流畅的口语，避免书面化
- **时长控制**：根据页面时长调整，约每分钟 150-200 字
- **演讲技巧**：包含语速、停顿、手势、互动等提示

### 演讲提示示例
- "此处放慢语速，强调重点"
- "可以结合手势指向屏幕上的数据"
- "适当停顿，让听众消化信息"
- "语气自信，建立专业感"
- "与听众互动，询问是否有疑问"

---

## 模型配置

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxTokens` | 4096 | 通用最大 Token |
| `PPT_MAX_TOKENS` | 16000 | PPT 生成，需要更大上下文 |
| `NARRATION_MAX_TOKENS` | 2000 | 旁白生成，单页内容 |
