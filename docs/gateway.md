# AI Gateway 接入说明

## 概述

晋彩智绘通过 New API Gateway（Docker 单容器）统一管理所有上游 AI 服务商。后端不直接调用任何服务商 API，所有请求经网关的标准兼容接口转发。

## 配置优先级

网关连接信息的解析顺序：

1. **数据库 `GatewayConfig` 表**（教师在"模型目录 → AI Gateway 网关管理"中保存的配置）
2. **环境变量** `NEWAPI_BASE_URL` / `NEWAPI_API_KEY`
3. **application.yml 默认值**（`http://localhost:4000` / 内置开发 Key）

即：数据库配置 > 环境变量 > 默认值。

## 环境变量

如需通过环境变量覆盖默认网关地址：

```bash
export NEWAPI_BASE_URL=http://localhost:4000
export NEWAPI_API_KEY=your-gateway-api-key
```

如果网关未开启鉴权，`NEWAPI_API_KEY` 可留空。

## 后端调用接口

| 用途 | 接口 |
|------|------|
| 聊天 / 多模态分析 / AI 学伴 | `POST {GATEWAY}/v1/chat/completions` |
| 文生图 / 图生图 | `POST {GATEWAY}/v1/images/generations` |
| 模型同步（优先） | `GET {GATEWAY}/model/info` |
| 模型同步（回退） | `GET {GATEWAY}/v1/models` |

所有请求通过 `GatewayAiClient` 或 `NewApiGatewayClient` 发出，网关地址由 `GatewayConfigService` 按上述优先级解析。

## 部署方式

仓库自带 Docker 自动化脚本：

```bash
# 单独启停网关
./scripts/gateway/start_gateway.sh
./scripts/gateway/stop_gateway.sh

# 一键启动整个项目（含网关）
sh start.sh
```

启动后在根目录生成 `.gateway/data/` 工作区，存放 New API 的 SQLite 数据库和配置。

## 网关管理面板

- 地址：http://localhost:4000
- 账号：`root` / 密码：`12345678`

## 教师端使用

1. 登录教师账号 → 进入"模型目录"页面
2. 点击"同步 AI Gateway 模型"，网关中的模型自动同步到应用目录
3. 教师可管理：
   - 模型是否对学生开放
   - 展示名称与教学说明
   - 支持的生成尺寸
   - AI 学伴使用哪个文本/多模态模型

## 网关渠道配置建议

在 New API 管理面板中添加上游渠道（支持国内外各类大模型服务商），推荐配置以下模型：

| 模型 ID | 用途 |
|---------|------|
| `deepseek-v4-flash` | AI 学伴对话（高速） |
| 文生图模型 | 文生图 / 图生图 |
| 多模态文本模型 | AI 学伴对话 / 多模态分析 |

以上为示例，实际模型 ID 以网关中配置的渠道和模型别名为准。DataSeeder 首次启动时会写入默认模型目录，教师可通过"同步 AI Gateway 模型"更新。
