# Changelog

All notable changes to PPT 演讲助手 are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-06-06

### Added
- AI 驱动的 PPT 内容生成，支持主题输入和文档上传
- 10 种幻灯片布局：封面、目录、章节、正文、数据、双栏、表格、时间线、重点强调、结尾
- 双屏演讲模式：演讲者旁白屏 + 观众演示屏，通过 BroadcastChannel / Electron IPC 实时同步
- 单窗口录制模式（📺/🎬 切换），旁白 + PPT 预览同屏显示，方便录屏教学
- 基于 Reveal.js 的演示文稿渲染引擎
- LLM 网关统一接入 (Claude / OpenAI / Ollama)
- Wiki MCP (Docmost) 知识库集成，支持从 Wiki 导入内容
- SQL.js 本地数据库持久化存储 + IndexedDB 备份
- Markdown / HTML 转 PPT 幻灯片解析
- PDF、HTML、Markdown 格式导出
- AI 连接测试功能
- 智能计时器：每页剩余时间 + 演讲已过时长，暂停/重置控制
- 页面拖拽排序
- 项目元数据编辑：演讲者、部门、类型、日期
- 跨平台桌面应用：Electron 42 + electron-builder 打包
  - Windows (NSIS 安装程序)
  - macOS (DMG，x64 + arm64)
  - Linux (AppImage + deb)
- API Key 加密存储：Electron `safeStorage` 系统级加密 (Keychain / DPAPI / libsecret)
- GitHub Actions 三平台自动构建
- 版本发布脚本 (`release:patch` / `release:minor` / `release:major`)
- Vue 3 + Vite 8 + Pinia + Vue Router 前端架构
- Tailwind CSS 4 样式框架
- 内置一键快速测试模板（无需配置 AI）
- 4 种 PPT 风格：商务、科技、简约、教育
- 输入方式：手动输入、Wiki 导入、上传文件

### Changed
- Presenter Electron 窗口使用 `titleBarStyle: 'hidden'` + 方正边角
- Presenter 全屏切换使用 `maximize`/`unmaximize` 替代原生 `setFullScreen`，避免 macOS Space 导致屏幕共享暂停
- Narrator 页面标题格式化为「项目名称-演示旁白」
- Electron 双屏模式下 Presenter 自动定位到扩展屏、Narrator 定位到主屏
- 录制/双屏模式偏好持久化到 localStorage
- 版本号从 package.json 动态读取
- 设置面板增加连接测试，验证 AI 服务可达性

### Fixed
- Electron ARM64 启动崩溃：关闭 hardened runtime 适配 ad-hoc 签名
- Presenter 右键菜单全屏状态显示不正确
- macOS 屏幕共享时切换窗口导致暂停
- Vue 3 模板中 `window.electronAPI` 引用导致白屏
- Electron 连接测试使用直接 fetch 替代代理

[1.0.0]: https://github.com/kindbgen/ppt-narrator/releases/tag/v1.0.0
