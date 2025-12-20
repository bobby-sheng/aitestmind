# Changelog

All notable changes to AI TestMind will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Ollama 完整配置文档（docs/user-guide/08_OLLAMA_SETUP.md）
- 国际化提示优化，增加 Ollama 配置说明

### Changed
- Improvements in progress

### Fixed
- 🔧 **修复 Ollama 本地模型适配器无法连接的问题**
  - Ollama 现在使用 OpenAI 兼容客户端（支持 OpenAI API 格式）
  - 自动设置默认 baseURL 为 `http://localhost:11434/v1`
  - Ollama 不需要真实 API Key，使用占位符即可
  - 改进错误提示，更清晰地显示连接失败原因（ECONNREFUSED）

## [1.0.0] - 2025-11-29

### 🎉 Initial Release

#### ✨ Core Features
- **AI Test Generation**: Generate complete test flows from natural language descriptions
- **Visual Flow Builder**: Drag-and-drop interface for creating test orchestrations
- **Smart API Capture**: 3 capture modes (Playwright, HAR, mitmproxy)
- **Real-time Execution**: Live monitoring with SSE streaming
- **Multi-language Support**: Built-in English and Chinese support

#### 🎨 UI/UX
- Beautiful dark/light theme with customizable color schemes
- Responsive design for all screen sizes
- Intuitive navigation and workflow

#### 🔧 Technical Stack
- **Frontend**: Next.js 16, React 19, TypeScript, TailwindCSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Executor**: Python FastAPI with asyncio
- **Database**: SQLite (production-ready with Prisma)
- **AI**: OpenAI GPT-4, DeepSeek integration

#### 📚 Documentation
- Comprehensive README with quick start guide
- Deployment guides for Docker, Linux, macOS, Windows
- User guides for all major features
- API documentation

#### 🐳 Deployment
- Docker Compose support
- All-in-one Docker image
- Production-ready configuration
- Easy one-command deployment

### Known Issues
- None reported yet

---

## Version History

### How to Read This Changelog

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for backwards-compatible functionality additions
- **PATCH** version for backwards-compatible bug fixes

---

**Note**: This changelog is automatically maintained. For detailed commit history, see the [GitHub repository](https://github.com/bobby-sheng/aitestmind).

