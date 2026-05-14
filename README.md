# 智绘 AI 图像生成平台 (SmartCanvas AI Image Generation Platform)

专为教育环境打造的综合性全栈 AI 图像生成平台。本平台提供了一套精致的“暖色编辑 (Warm Editorial)”风格界面，让学生们能够在一个充满艺术感的环境中探索 AI 创意；同时为教师提供了一个强大的控制台，用于管理 AI 模型、学生权限并监控生成历史。

## ✨ 核心功能

- **基于角色的权限控制**：为教师（教学管理）和学生（创意生成）提供独立且专属的界面与功能。
- **强大的 AI 生成能力**：通过集成标准大模型 API 接口，全面支持文生图 (T2I) 和 图生图 (I2I) 工作流。
- **对话式智能交互界面**：提供直观的对话式 UI，让提示词输入和视觉探索无缝衔接，带来自然流畅的交互体验。
- **网关统一路由 (AI Gateway)**：借助 New API 网关统一管理多模型渠道，实现文本模型自动路由与图片兜底，彻底解耦应用层与渠道逻辑。
- **模型管理**：教师可以轻松配置并控制不同 AI 模型的访问权限，定义 API 参数，以及管理支持的生成尺寸。
- **画廊与历史记录**：所有生成的作品都会被永久保存，支持历史记录追踪，方便课堂管理与学生回顾。
- **暖色编辑设计语言**：使用精心挑选的色板和排版，打造一个高端、极具视觉吸引力的界面。

## 🛠️ 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Tailwind CSS + Pinia
- **后端**：Java 17 + Spring Boot 3 + Spring Security + JPA
- **数据库**：MySQL 8（后端业务数据）；AI Gateway 内嵌 SQLite
- **AI 路由层**：AI Gateway (基于 New API Docker 服务)

## 🚀 快速开始

本项目经过重构，移除了过去复杂的运行环境依赖。您只需安装 Node、Java 和 MySQL 环境即可一键启动。

### 1. 环境依赖
- **Node.js** (推荐 v20 或更高版本)
- **Java JDK** (v17 或更高版本，例如 Eclipse Temurin 17)
- **Maven** (部分系统可能需要，项目自带 `mvnw` wrapper 可选)
- **MySQL 8** (默认连接 localhost:3306，schema 名 `smartcanvas`，root 用户空密码)
- **Docker** (需要 Docker 运行 New API 网关，推荐安装 Colima 或 Docker Desktop)

### 2. 一键启动
在项目根目录下直接运行：

```bash
sh start.sh
```

该脚本将自动执行以下操作：
1. **启动 AI Gateway**：通过 Docker 启动 New API 单容器 (端口 4000)。
2. **启动 Spring Boot 后端**：编译并在端口 8080 启动。
3. **启动 Vue 前端**：在端口 5173 启动，并打开浏览器。

关闭时，只需按下 `Ctrl + C`，脚本会自动安全停止前后端进程和网关守护进程。

### 3. 访问入口
- **应用前端**：[http://localhost:5173](http://localhost:5173)
  - 教师账号：`teacher` / 密码：`123456`
  - 学生账号：`student` / 密码：`123456`
- **后端接口**：[http://localhost:8080](http://localhost:8080)
- **AI 网关面板**：[http://localhost:4000](http://localhost:4000) (默认账号：`root` / 密码：`12345678`)

## 📁 项目结构概览

- `backend/` - Spring Boot 后端项目源码，处理核心业务逻辑、数据库读写。
- `frontend/` - Vue 前端项目源码，包含 Teacher 和 Student 端专属视图。
- `scripts/` - 运维部署与网关脚本，包含 AI Gateway 的下载、启停控制等。
- `docs/` - 进阶开发与环境配置说明文档。
- `start.sh` - 一键启动脚本，聚合了完整的生命周期管理。

## 🤝 参与贡献

欢迎提出建议、提交问题或功能请求！请随时访问 Issues 页面。
