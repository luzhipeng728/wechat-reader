#!/bin/bash

# 生产环境快速更新脚本

set -e

echo "🔄 更新 WeChat Spark..."

# 拉取最新代码
echo "1. 拉取最新代码..."
git pull

# 安装依赖
echo "2. 更新依赖..."
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..

# 编译
echo "3. 编译后端..."
cd backend && npm run build && cd ..

echo "4. 编译前端..."
cd frontend && npm run build && cd ..

# 数据库迁移
echo "5. 运行数据库迁移..."
cd backend && npx prisma migrate deploy && cd ..

# 重启服务
echo "6. 重启服务..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.production.config.js
elif command -v npx &> /dev/null; then
    npx pm2 restart ecosystem.production.config.js
fi

echo "✅ 更新完成!"
echo ""
echo "查看日志:"
echo "  pm2 logs"
