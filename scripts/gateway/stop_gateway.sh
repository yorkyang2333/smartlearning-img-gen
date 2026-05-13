#!/bin/bash

SCREEN_NAME="smartcanvas-gateway"

echo "🛑 正在停止 AI Gateway (One API)..."
screen -S "$SCREEN_NAME" -X quit >/dev/null 2>&1 || true
echo "✅ AI Gateway 已停止"
