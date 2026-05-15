# 晋彩智绘 AI 图像生成平台

专为美术教学场景设计的全栈 AI 图像生成平台。教师管理 AI 模型与学生权限、布置创作作业并批改；学生通过对话式界面进行 AI 图像创作，并可获得 AI 学伴的即时辅导反馈。

## 核心功能

- **角色分离**：教师端（模型管理、学生管理、作业批改、实时监控）与学生端（AI 创作、AI 学伴、班级画廊、作业提交）完全独立
- **AI 图像生成**：支持文生图 (Text-to-Image) 和图生图 (Image-to-Image) 两种工作流
- **AI 学伴**：基于多模态大语言模型的对话式辅导，支持 SSE 流式输出
- **提示词工具**：提示词构建器 + AI 提示词优化，辅助学生表达创意
- **统一网关路由**：通过 New API Gateway 统一管理多家 AI 服务商，后端不直接对接任何上游 API
- **作业系统**：教师创建作业 → 学生创作提交 → 教师评分反馈，完整闭环

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3.5 + TypeScript 6 + Vite 8 + Tailwind CSS 3.4 + Pinia 3 + Vue Router 5 |
| 后端 | Java 17 + Spring Boot 3.2.5 + Spring Security + Spring Data JPA + Lombok |
| 数据库 | MySQL 8（业务数据，schema: `jincai_zhihui`） |
| AI 路由 | New API Gateway (Docker 单容器，内嵌 SQLite) |
| 认证 | JWT (jjwt 0.12.5)，无状态，24 小时过期 |

## 快速开始

### 环境依赖

- Node.js 20+
- Java JDK 17+
- Maven 3.8+
- MySQL 8（localhost:3306，root 用户空密码）
- Docker（运行 AI Gateway 容器）

### 数据库初始化

```bash
mysql -u root -e "CREATE DATABASE IF NOT EXISTS jincai_zhihui CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

### 一键启动

```bash
sh start.sh
```

脚本按顺序启动：
1. AI Gateway (Docker, 端口 4000)
2. Spring Boot 后端 (端口 8080)
3. Vue 前端 (Vite, 端口 5173)

按 `Ctrl+C` 安全关闭所有服务。

### 单独启动各组件

```bash
# AI Gateway
./scripts/gateway/start_gateway.sh
./scripts/gateway/stop_gateway.sh

# 后端
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests

# 前端
cd frontend
npm install
npm run dev
```

### 访问入口

| 服务 | 地址 | 账号 / 密码 |
|------|------|-------------|
| 应用前端 | http://localhost:5173 | teacher / 123456 或 student / 123456 |
| 后端 API | http://localhost:8080 | — |
| AI 网关面板 | http://localhost:4000 | root / 12345678 |

测试账号由 `DataSeeder` 在首次启动（users 表为空时）自动创建。

## 项目结构

```
├── backend/          Spring Boot 后端
│   └── src/main/java/com/smartlearning/backend/
│       ├── config/       DataSeeder, SecurityConfig, GatewayProperties 等
│       ├── controller/   AuthController, TeacherController, StudentController, GenerationController, GalleryController, LiveController
│       ├── entity/       User, Model, Generation, Conversation, Assignment, Submission, Template, TutorConfig, GatewayConfig
│       ├── repository/   Spring Data JPA Repositories
│       ├── security/     JwtUtil, JwtRequestFilter, CustomUserDetailsService
│       ├── service/      GatewayAiClient, NewApiGatewayClient, GatewayConfigService, GatewayModelSyncService, AssignmentService
│       └── util/         ModelConfigUtil, GatewayResponseUtil
├── frontend/         Vue 3 前端
│   └── src/
│       ├── components/   PromptBuilder, PromptOptimizer, PromptOptimizerPopover, PromptHelper, TutorDrawer, TutorReview
│       ├── router/       路由定义与导航守卫
│       ├── stores/       auth.ts, chat.ts, assignments.ts
│       └── views/
│           ├── teacher/  Dashboard, Models, Students, Assignments, Templates, Live, Settings
│           └── student/  Workspace, ClassGallery, StudentAssignments, AssignmentDetail, AssignmentPlay
├── scripts/gateway/  AI Gateway 启停脚本
├── docs/             详细文档
└── start.sh          一键启动脚本
```

## 架构概览

```
Vue 前端 (5173)  ──JWT──▶  Spring Boot (8080)  ──标准兼容格式──▶  New API Gateway (4000)  ──▶  上游服务商
```

后端所有 AI 调用统一走网关的标准兼容接口（`/v1/chat/completions`、`/v1/images/generations`），不直接对接任何服务商。网关负责 API Key 管理、渠道路由和重试。

## 文档索引

- [创作说明（项目文档）](docs/创作说明（项目文档）.md)
- [系统架构与模型说明](docs/系统架构说明.md)
- [用户手册](docs/用户手册.md)
