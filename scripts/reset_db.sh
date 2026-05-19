#!/bin/bash

# 重置数据库 — 清空后由 Spring Boot 启动时自动重建表和种子数据

DB_NAME="jincai_zhihui"

read -p "确认清空数据库 ${DB_NAME}？所有数据将丢失。(y/N): " CONFIRM
if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "已取消。"
    exit 0
fi

echo "🗑️  正在重置数据库 ${DB_NAME} ..."
mysql -u root -e "DROP DATABASE IF EXISTS ${DB_NAME}; CREATE DATABASE ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "✅ 数据库已重置。下次启动后端时将自动重建表和默认数据。"
