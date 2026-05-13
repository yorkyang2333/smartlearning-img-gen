#!/bin/bash

# SmartCanvas 一键启动脚本 (macOS & Linux)

echo "================================================="
echo "🚀 正在启动 SmartCanvas (Spring Boot + Vue 3)..."
echo "================================================="

# 判断操作系统类型，给出更贴心的安装提示
OS_NAME=$(uname -s)
INSTALL_HINT="请前往官网下载并安装 Maven。"
if [[ "$OS_NAME" == "Darwin" ]]; then
    INSTALL_HINT="👉 提示: 请在终端执行 brew install maven"
elif [[ "$OS_NAME" == "Linux" ]]; then
    if command -v apt &> /dev/null; then
        INSTALL_HINT="👉 提示: 请在终端执行 sudo apt 啊install maven"
    elif command -v yum &> /dev/null; then
        INSTALL_HINT="👉 提示: 请在终端执行 sudo yum install maven"
    fi
fi

# 检查 Maven 是否安装
if ! command -v mvn &> /dev/null; then
    echo "❌ 错误: 未检测到 Maven (mvn)。"
    echo "$INSTALL_HINT"
    exit 1
fi

# 检查 Node/npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未检测到 npm。"
    echo "👉 请先安装 Node.js"
    exit 1
fi

# Removed uv check

# 捕获 Ctrl+C 信号以同时结束前后端进程
cleanup() {
    echo -e "\n🛑 正在关闭前后端服务..."
    if [ -x "./scripts/gateway/stop_gateway.sh" ]; then
        ./scripts/gateway/stop_gateway.sh >/dev/null 2>&1 || true
    fi
    # 杀掉所有当前脚本启动的后台子进程
    kill $(jobs -p) 2>/dev/null
    echo "✅ 服务已安全关闭。"
    exit
}
trap cleanup SIGINT SIGTERM

# 1. 启动 AI Gateway
echo "⏳ [1/3] 正在启动 AI Gateway (http://localhost:4000)..."
./scripts/gateway/start_gateway.sh

# 2. 启动后端 (Spring Boot)
echo "⏳ [2/3] 正在启动后端 (Spring Boot: http://localhost:8080)..."
cd backend
# 跳过测试，加速启动
mvn spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests &
BACKEND_PID=$!
cd ..

# 3. 启动前端 (Vue 3 / Vite)
echo "⏳ [3/3] 正在检查并启动前端 (Vue 3)..."
cd frontend
# 如果 node_modules 不存在，则自动 install
if [ ! -d "node_modules" ]; then
    echo "   📦 首次运行，正在安装前端依赖..."
    npm install
fi

echo "🚀 前端即将启动 (http://localhost:5173)..."
# 保持前端运行日志在前台显示
npm run dev &
FRONTEND_PID=$!
cd ..

echo "================================================="
echo "✅ 所有服务启动指令已发送！"
echo "🌐 前端访问地址: http://localhost:5173"
echo "🛑 按 Ctrl+C 即可同时关闭所有服务"
echo "================================================="

# 保持脚本运行，监听退出信号
wait
