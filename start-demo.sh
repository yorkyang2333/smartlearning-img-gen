#!/bin/bash

# 晋彩智绘 演示一键启动脚本
# 用法:
#   sh start-demo.sh           # 正常启动（DemoSeeder 在数据未铺过时自动注入）
#   sh start-demo.sh --reset   # 先清库再启动（每次都重新注入演示数据）

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_NAME="${JINCAI_ZHIHUI_DB:-jincai_zhihui}"
DB_USER="${JINCAI_ZHIHUI_DB_USER:-root}"
DB_PASSWORD="${JINCAI_ZHIHUI_DB_PASSWORD:-}"
DB_HOST="${JINCAI_ZHIHUI_DB_HOST:-127.0.0.1}"
DB_PORT="${JINCAI_ZHIHUI_DB_PORT:-3306}"

RESET_DB=false
for arg in "$@"; do
    case "$arg" in
        --reset|-r) RESET_DB=true ;;
        --help|-h)
            echo "用法: sh start-demo.sh [--reset]"
            echo "  --reset, -r   清空 ${DB_NAME} 数据库后再启动（演示数据会重新注入）"
            exit 0 ;;
    esac
done

echo "================================================="
echo "🎬 晋彩智绘 演示模式启动"
echo "================================================="

# ---------- 依赖检查 ----------
need_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo "❌ 未检测到 $1，请先安装。"
        exit 1
    fi
}
need_cmd mvn
need_cmd npm
need_cmd docker

# ---------- 可选：清库 ----------
if [ "$RESET_DB" = true ]; then
    if ! command -v mysql &> /dev/null; then
        echo "⚠️  --reset 需要 mysql 客户端，但未在 PATH 中找到。"
        echo "    可以手动执行:"
        echo "      mysql -u${DB_USER} -e \"DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME};\""
        exit 1
    fi
    echo "⏳ 正在重置数据库 ${DB_NAME}（${DB_HOST}:${DB_PORT}）..."
    MYSQL_PWD_OPT=()
    if [ -n "$DB_PASSWORD" ]; then
        MYSQL_PWD_OPT=(-p"$DB_PASSWORD")
    fi
    if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "${MYSQL_PWD_OPT[@]}" \
        -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/tmp/jincai-zhihui-mysql.err; then
        echo "❌ 重置数据库失败，详情见 /tmp/jincai-zhihui-mysql.err"
        cat /tmp/jincai-zhihui-mysql.err
        exit 1
    fi
    echo "✅ 数据库已重置，启动后将自动重铺演示数据。"
fi

# ---------- 进程清理 ----------
cleanup() {
    echo -e "\n🛑 正在关闭演示进程..."
    if [ -x "$ROOT_DIR/scripts/gateway/stop_gateway.sh" ]; then
        "$ROOT_DIR/scripts/gateway/stop_gateway.sh" >/dev/null 2>&1 || true
    fi
    kill $(jobs -p) 2>/dev/null
    echo "✅ 演示已关闭。"
    exit 0
}
trap cleanup SIGINT SIGTERM

# ---------- 1) AI Gateway ----------
echo "⏳ [1/3] 启动 AI Gateway (http://localhost:4000)..."
"$ROOT_DIR/scripts/gateway/start_gateway.sh"

# ---------- 2) Backend (dev + demo profile) ----------
echo "⏳ [2/3] 启动后端 Spring Boot (profiles=dev,demo, http://localhost:8080)..."
cd "$ROOT_DIR/backend"
mvn spring-boot:run -Dspring-boot.run.profiles=dev,demo -DskipTests &
cd "$ROOT_DIR"

# ---------- 3) Frontend ----------
echo "⏳ [3/3] 启动前端 Vue 3 (http://localhost:5173)..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "   📦 首次运行，安装前端依赖..."
    npm install
fi
npm run dev &
cd "$ROOT_DIR"

echo "================================================="
echo "✅ 所有服务已启动"
echo "🌐 前端:        http://localhost:5173"
echo "🔧 后端 API:    http://localhost:8080"
echo "🛰  AI Gateway: http://localhost:4000  (root / 12345678)"
echo ""
echo "👤 演示账号（密码均为 123456）"
echo "   教师: teacher"
echo "   学生: student / linyutong / zhangzixuan / wangzihan / chensiyuan"
echo "         liuxinyi / zhouhaoran / wuyutong / zhengmingxuan / zhaowanqing / sunruotong"
echo ""
echo "🛑 按 Ctrl+C 关闭全部服务"
echo "================================================="

wait
