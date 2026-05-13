# AI Gateway 接入说明

## 目标
- 用 AI Gateway 统一管理上游 provider、API Key、路由策略
- SmartCanvas 应用只维护模型目录，不再在教师端手工配置渠道和密钥
- 后端统一通过 OpenAI-compatible 接口调用网关

## 环境变量
在启动后端前设置：

```bash
export NEWAPI_BASE_URL=http://localhost:4000
export NEWAPI_API_KEY=your-gateway-api-key
```

推荐使用 `newapi` skill 安全管理 API Key：
- `newapi create-token <name>` — 创建新令牌
- `newapi apply-token <id> <file>` — 安全注入到配置文件
- `newapi copy-token <id>` — 复制到剪贴板

如果你的 AI Gateway 没有开启鉴权，`NEWAPI_API_KEY` 可以留空。

说明：
- 这两个环境变量现在是平台后台的默认兜底值
- 你也可以在教师端“模型目录”页面的 `AI Gateway 网关管理` 区直接修改网关地址和 API Key
- 后台保存的配置优先级高于环境变量

## 后端调用约定
- 聊天与多模态分析：`POST {GATEWAY_BASE_URL}/v1/chat/completions`
- 文生图：`POST {GATEWAY_BASE_URL}/v1/images/generations`
- 模型同步优先读取：`GET {GATEWAY_BASE_URL}/model/info`
- 如果网关未开启 `model/info`，回退到：`GET {GATEWAY_BASE_URL}/v1/models`

## 教师端使用方式
1. 打开“模型目录”页面
2. 点击“同步 AI Gateway 模型”
3. 系统会把网关里的模型同步到应用目录
4. 老师只需要管理：
   - 模型是否开放
   - 模型排序
   - 展示名称与教学说明
   - AI 学伴使用哪一个文本/多模态模型

## 正式部署（本机）
仓库已自带 AI Gateway (New API) Docker 自动化部署。

**前置条件**：需要 Docker 运行时（推荐 Colima 或 Docker Desktop）。

常用命令：

```bash
./scripts/gateway/start_gateway.sh
./scripts/gateway/stop_gateway.sh
```

一键启动整个项目时：

```bash
./start.sh
```

它会按顺序启动：
- AI Gateway 网关：`http://localhost:4000`（New API 单容器，内嵌 SQLite）
- Spring Boot 后端：`http://localhost:8080`
- Vue 前端：`http://localhost:5173`

脚本执行后，会在根目录自动生成 `.gateway/` 工作区，包含这些文件：
- `data/`：New API 数据目录（SQLite 数据库、配置文件等）

**网关管理面板**：`http://localhost:4000`
- 账号：`root`
- 密码：`12345678`

## AI Gateway 部署建议
- 在 New API 中添加上游渠道（支持 OpenAI、Anthropic、Google、DeepSeek 等各类 API Key）
- 给应用暴露一个统一的网关地址
- New API 支持渠道权重、自动重试、模型自动同步等高级特性
- 建议配置的模型别名：
  - `gpt-4o`
  - `gpt-image-1`
  - `claude-3-5-sonnet-latest`
  - `gemini/gemini-2.5-flash`

这样应用层只需要保存稳定的模型 ID，不需要再理解各 provider 的原生差异。

