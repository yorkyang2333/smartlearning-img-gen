#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
GATEWAY_DIR="$ROOT_DIR/.gateway"
GATEWAY_BIN="$GATEWAY_DIR/one-api"
GATEWAY_PORT="${PORT:-4000}"
SCREEN_NAME="smartcanvas-gateway"

mkdir -p "$GATEWAY_DIR"

# Check if AI Gateway is already running
if lsof -nP -iTCP:"$GATEWAY_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✅ AI Gateway (One API) 已在运行 (端口 $GATEWAY_PORT)"
  exit 0
fi

# Download AI Gateway if not present
if [[ ! -f "$GATEWAY_BIN" ]]; then
  echo "📥 正在下载 AI Gateway (One API)..."
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"
  
  if [[ "$OS" == "darwin" ]]; then
    DOWNLOAD_URL="https://github.com/songquanpeng/one-api/releases/latest/download/one-api-macos"
  else
    DOWNLOAD_URL="https://github.com/songquanpeng/one-api/releases/latest/download/one-api-$ARCH"
  fi
  
  if ! curl -L "$DOWNLOAD_URL" -o "$GATEWAY_BIN"; then
    echo "❌ 下载 AI Gateway 失败，请检查网络或配置代理。"
    exit 1
  fi
  chmod +x "$GATEWAY_BIN"
fi

echo "🚀 正在启动 AI Gateway (One API)..."
cd "$GATEWAY_DIR"

# Run in screen
screen -S "$SCREEN_NAME" -X quit >/dev/null 2>&1 || true
export PORT="$GATEWAY_PORT"
screen -dmS "$SCREEN_NAME" bash -lc "exec '$GATEWAY_BIN' >> gateway.log 2>&1"

for _ in {1..20}; do
  if curl --silent --max-time 2 "http://localhost:${GATEWAY_PORT}/api/status" >/dev/null 2>&1; then
    echo "✅ AI Gateway (One API) 已启动: http://localhost:${GATEWAY_PORT}"
    echo "🔑 默认账号: root | 默认密码: 123456"
    echo "📄 日志: $GATEWAY_DIR/gateway.log"
    exit 0
  fi
  sleep 1
done

echo "❌ AI Gateway (One API) 启动失败，请查看日志: $GATEWAY_DIR/gateway.log"
exit 1
