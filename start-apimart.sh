#!/bin/bash

# 晋彩智绘 — APIMart 直连启动脚本
# 跳过本地 New API 网关，后端直接走 https://api.apimart.ai

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env.apimart"

echo "================================================="
echo "🚀 晋彩智绘 (APIMart 直连模式)"
echo "================================================="

if [ -f "$ENV_FILE" ]; then
    echo "📄 加载本地配置: .env.apimart"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
fi

if [ -z "${APIMART_API_KEY:-}" ]; then
    echo "❌ 缺少 APIMART_API_KEY"
    echo "👉 在项目根目录创建 .env.apimart，写入："
    echo "   APIMART_API_KEY=sk-xxxxxxxx"
    echo "   （文件已被 .gitignore 忽略，不会进版本库）"
    exit 1
fi

if ! command -v mvn >/dev/null 2>&1; then
    echo "❌ 未检测到 Maven (mvn)。macOS: brew install maven"
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo "❌ 未检测到 npm，请先安装 Node.js"
    exit 1
fi

export NEWAPI_BASE_URL="${APIMART_BASE_URL:-https://api.apimart.ai}"
export NEWAPI_API_KEY="$APIMART_API_KEY"
export NEWAPI_OVERRIDE=true

echo "🔧 网关地址: $NEWAPI_BASE_URL"
echo "🔧 网关 Key: ${NEWAPI_API_KEY:0:10}***（已隐藏）"
echo "🔧 强制覆盖 DB: NEWAPI_OVERRIDE=true"
echo

cleanup() {
    echo
    echo "🛑 正在关闭服务..."
    kill $(jobs -p) 2>/dev/null || true
    echo "✅ 已退出。"
    exit
}
trap cleanup SIGINT SIGTERM

echo "⏳ [1/2] 启动后端 (http://localhost:8080)..."
cd "$ROOT_DIR/backend"
mvn spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests &
cd "$ROOT_DIR"

echo "⏳ [2/2] 启动前端 (http://localhost:5173)..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   📦 首次运行，安装前端依赖..."
    npm install
fi
npm run dev &
cd "$ROOT_DIR"

echo "================================================="
echo "✅ 已启动。前端: http://localhost:5173"
echo "🛑 Ctrl+C 同时关闭"
echo "================================================="

wait
