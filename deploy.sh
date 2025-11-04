#!/bin/bash

# 生产环境部署脚本

set -e  # 遇到错误立即退出

echo "========================================="
echo "  WeChat Spark 生产环境部署脚本"
echo "========================================="
echo ""

# 检查是否在项目根目录
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 检查环境变量
if [ ! -f "backend/.env" ]; then
    echo "❌ 错误: backend/.env 文件不存在"
    echo "请先创建并配置环境变量:"
    echo "  cp backend/.env.example backend/.env"
    echo "  然后编辑 backend/.env 填入生产环境配置"
    exit 1
fi

echo "📦 1. 安装依赖..."
echo "-----------------------------------"

# 后端依赖
echo "安装后端依赖..."
cd backend
npm ci  # 使用 ci 而不是 install,更快且确定性更强
cd ..

# 前端依赖
echo "安装前端依赖..."
cd frontend
npm ci
cd ..

echo "✅ 依赖安装完成"
echo ""

echo "🔧 2. 编译后端..."
echo "-----------------------------------"
cd backend
npm run build
cd ..
echo "✅ 后端编译完成"
echo ""

echo "🔧 3. 编译前端..."
echo "-----------------------------------"
cd frontend
npm run build
cd ..
echo "✅ 前端编译完成"
echo ""

echo "🗄️  4. 运行数据库迁移..."
echo "-----------------------------------"
cd backend
npx prisma migrate deploy
cd ..
echo "✅ 数据库迁移完成"
echo ""

echo "🚀 5. 启动服务..."
echo "-----------------------------------"

# 创建日志目录
mkdir -p logs

# 检查 PM2
if command -v pm2 &> /dev/null; then
    PM2_CMD="pm2"
elif command -v npx &> /dev/null; then
    PM2_CMD="npx pm2"
else
    echo "❌ 错误: 未找到 PM2"
    echo "请运行: npm install -g pm2"
    exit 1
fi

# 停止旧服务
echo "停止旧服务..."
$PM2_CMD stop ecosystem.production.config.js 2>/dev/null || true
$PM2_CMD delete ecosystem.production.config.js 2>/dev/null || true

# 启动新服务
echo "启动生产服务..."
$PM2_CMD start ecosystem.production.config.js

# 保存 PM2 配置
$PM2_CMD save

echo ""
echo "========================================="
echo "  ✅ 部署成功!"
echo "========================================="
echo ""
echo "服务信息:"
echo "  前端: http://localhost:4000"
echo "  后端: http://localhost:4001 (内部)"
echo ""
echo "管理命令:"
echo "  查看状态: $PM2_CMD list"
echo "  查看日志: $PM2_CMD logs"
echo "  重启服务: $PM2_CMD restart ecosystem.production.config.js"
echo "  停止服务: $PM2_CMD stop ecosystem.production.config.js"
echo ""
echo "⚠️  重要提示:"
echo "  1. 确保防火墙只开放 4000 端口"
echo "  2. 建议配置 Nginx 反向代理"
echo "  3. 定期备份数据库"
echo "  4. 监控服务运行状态"
echo ""
