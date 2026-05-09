# 智学 AI 图像生成平台 (SmartLearning AI Image Generation Platform)

专为教育环境打造的综合性全栈 AI 图像生成平台。本平台提供了一套精致的“暖色编辑 (Warm Editorial)”风格界面，让学生们能够在一个充满艺术感的环境中探索 AI 创意；同时为教师提供了一个强大的控制台，用于管理 AI 模型、学生权限并监控生成历史。

## ✨ 核心功能

- **基于角色的权限控制**：为教师（教学管理）和学生（创意生成）提供独立且专属的界面与功能。
- **强大的 AI 生成能力**：通过集成标准大模型 API 接口，全面支持文生图 (T2I) 和 图生图 (I2I) 工作流。
- **对话式智能交互界面**：提供直观的对话式 UI，让提示词输入和视觉探索无缝衔接，带来自然流畅的交互体验。
- **模型管理**：教师可以轻松配置并控制不同 AI 模型的访问权限，定义 API 参数，以及管理支持的生成尺寸。
- **画廊与历史记录**：所有生成的作品都会被永久保存，支持历史记录追踪，方便课堂管理与学生回顾。
- **暖色编辑设计语言**：使用精心挑选的色板和排版，打造一个高端、极具视觉吸引力的界面。

## 🛠️ 技术栈

- **前端**：Next.js 14+ (App Router), React 19, 自定义 CSS Modules
- **后端**：Next.js API Routes (`/api/*`)
- **数据库**：Prisma ORM 搭配 SQLite（轻量级，非常适合本地开发与快速部署）
- **身份认证**：NextAuth.js (账号密码凭证模式)
- **数据请求**：SWR（用于实时的客户端数据请求与变更）

## 🚀 快速开始

请按照以下说明在本地设置并运行该项目。

### 1. 环境依赖
- Node.js (v18 或更高版本)
- npm, yarn, 或 pnpm

### 2. 安装
克隆仓库并安装依赖项：
```bash
npm install
# 或者
yarn install
```

### 3. 环境配置
在根目录下创建一个 `.env.local` 文件，并配置必要的环境变量：

```env
# NextAuth 配置
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-string-here"

# AI 图像生成 API Key (请配置您选择的 AI 服务商凭证)
AI_API_KEY="your-api-key"
```

### 4. 数据库设置
初始化 SQLite 数据库，并注入初始的管理员/学生账号数据：

```bash
# 将 Prisma schema 推送到数据库
npx prisma db push

# 注入初始测试数据 (包含初始用户和模型配置)
npx prisma db seed
```

*注意：数据注入脚本 (`prisma/seed.ts`) 会自动创建默认的测试用户。您可以查看该文件获取默认的登录凭证（例如：`admin / password`）。*

### 5. 运行应用
启动本地开发服务器：

```bash
npm run dev
# 或者
yarn dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000) 即可访问应用。你将被自动重定向到登录页面。

## 📁 项目结构概览

核心的应用逻辑存放在 `src/app` 目录下：

- `api/` - 后端 API 接口，处理身份认证、模型管理以及 AI 生成请求。
- `login/` - 登录页面及相关逻辑。
- `teacher/` - 教师控制台（管理模型、学生，以及查看所有人的生成历史）。
- `student/` - 学生专属区（包含 AI 图像生成的聊天界面和个人专属画廊）。
- `globals.css` - 全局样式表、CSS 变量以及核心设计系统的基础参数。

## 🤝 参与贡献

欢迎提出建议、提交问题或功能请求！请随时访问 Issues 页面。
