#!/bin/bash

# WeChat Spark 启动脚本

echo "正在启动 WeChat Spark..."

# 检查是否在项目根目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查 .env 文件
if [ ! -f "backend/.env" ]; then
    echo "警告: backend/.env 文件不存在"
    echo "请先配置环境变量"
fi

# 创建日志目录
mkdir -p logs

# 检查 PM2 是否可用
if command -v pm2 &> /dev/null; then
    PM2_CMD="pm2"
elif command -v npx &> /dev/null; then
    echo "使用 npx pm2..."
    PM2_CMD="npx pm2"
else
    echo "错误: 未找到 PM2"
    echo "请运行: npm install -g pm2"
    echo "或者: npm install pm2"
    exit 1
fi

# 使用 PM2 配置文件启动所有服务
echo "使用 PM2 启动前后端服务..."
$PM2_CMD start ecosystem.config.js

echo ""
echo "服务启动完成!"
echo ""
echo "前端地址: http://localhost:4000"
echo "后端地址: http://localhost:4001"
echo ""
echo "查看服务状态: $PM2_CMD list"
echo "查看日志: $PM2_CMD logs"
echo "查看特定服务日志: $PM2_CMD logs wchat-backend 或 $PM2_CMD logs wchat-frontend"
echo "停止服务: ./stop.sh 或 $PM2_CMD stop all"
echo "重启服务: $PM2_CMD restart ecosystem.config.js"
echo ""
