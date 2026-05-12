@echo off
chcp 65001 >nul
echo =================================================
echo 🚀 正在启动 SmartCanvas (Spring Boot + Vue 3)...
echo =================================================

:: 检查 Maven 是否安装
where mvn >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 Maven (mvn) 环境变量。
    echo 👉 请先下载并安装 Maven，并将其配置到系统 PATH 中。
    pause
    exit /b 1
)

:: 检查 Node/npm 是否安装
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到 npm。
    echo 👉 请先下载并安装 Node.js。
    pause
    exit /b 1
)

:: 1. 启动后端 (Spring Boot)
echo ⏳ [1/2] 正在新窗口中启动后端 (Spring Boot: http://localhost:8080)...
cd backend
start "SmartCanvas Backend" cmd /k "mvn spring-boot:run -Dspring-boot.run.profiles=dev -DskipTests"
cd ..

:: 2. 启动前端 (Vue 3 / Vite)
echo ⏳ [2/2] 正在检查并启动前端 (Vue 3)...
cd frontend
if not exist "node_modules\" (
    echo    📦 首次运行，正在安装前端依赖...
    call npm install
)

echo 🚀 前端即将启动 (http://localhost:5173)...
start "SmartCanvas Frontend" cmd /k "npm run dev"
cd ..

echo =================================================
echo ✅ 所有服务已在新窗口中启动！
echo 🌐 前端访问地址: http://localhost:5173
echo 🛑 若要停止服务，请直接关闭弹出的两个终端窗口。
echo =================================================
pause
