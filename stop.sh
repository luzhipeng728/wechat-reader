#!/bin/bash

# WeChat Spark 停止脚本

echo "正在停止 WeChat Spark..."

# 检查 PM2 是否可用
if command -v pm2 &> /dev/null; then
    PM2_CMD="pm2"
elif command -v npx &> /dev/null; then
    PM2_CMD="npx pm2"
else
    echo "错误: 未找到 PM2"
    exit 1
fi

$PM2_CMD stop ecosystem.config.js 2>/dev/null
$PM2_CMD delete ecosystem.config.js 2>/dev/null

echo "服务已停止"
echo ""
echo "重新启动: ./start.sh"
echo "查看所有 PM2 进程: $PM2_CMD list"
