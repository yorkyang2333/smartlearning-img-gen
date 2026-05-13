#!/bin/bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo "🛑 正在停止 AI Gateway (Sub2API)..."
cd "$ROOT_DIR"
docker compose -f docker-compose.gateway.yml down 2>/dev/null || true
echo "✅ AI Gateway 已停止"
