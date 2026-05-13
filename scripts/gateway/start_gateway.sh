#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATEWAY_PORT="${PORT:-4000}"

# Check if Docker is available
if ! command -v docker &> /dev/null; then
  echo "❌ 错误: 未检测到 Docker。New API 需要 Docker 运行。"
  echo "👉 请安装 Docker Desktop 或 Colima"
  exit 1
fi

# Check if AI Gateway is already running
if curl --silent --max-time 2 "http://localhost:${GATEWAY_PORT}/api/status" >/dev/null 2>&1; then
  echo "✅ AI Gateway (New API) 已在运行 (端口 $GATEWAY_PORT)"
  exit 0
fi

echo "🚀 正在启动 AI Gateway (New API via Docker)..."

# Create data directory
mkdir -p "$ROOT_DIR/.gateway/data"

# Start Docker Compose
cd "$ROOT_DIR"
docker compose -f docker-compose.gateway.yml up -d 2>&1

# Wait for health check
echo "⏳ 等待 New API 启动..."
for i in {1..30}; do
  if curl --silent --max-time 2 "http://localhost:${GATEWAY_PORT}/api/status" >/dev/null 2>&1; then
    echo "✅ AI Gateway (New API) 已启动: http://localhost:${GATEWAY_PORT}"
    echo "🔑 管理面板: http://localhost:${GATEWAY_PORT}"
    echo "   账号: root"
    echo "   密码: 12345678"
    exit 0
  fi
  sleep 2
done

echo "❌ AI Gateway (New API) 启动超时，请检查 Docker 日志:"
echo "   docker compose -f docker-compose.gateway.yml logs new-api"
exit 1
