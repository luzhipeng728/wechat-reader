#!/bin/bash

echo "启动 PostgreSQL 数据库容器..."

# 检查是否安装了 docker-compose
if ! command -v docker-compose &> /dev/null; then
    echo "错误: 未找到 docker-compose"
    echo "请先安装 Docker 和 docker-compose"
    echo ""
    echo "macOS 安装方法:"
    echo "  brew install --cask docker"
    echo ""
    exit 1
fi

# 启动数据库容器
docker-compose up -d postgres

echo ""
echo "等待数据库启动..."
sleep 5

# 检查容器状态
if docker ps | grep -q wchat_spider_db; then
    echo "✅ 数据库容器启动成功!"
    echo ""
    echo "数据库连接信息:"
    echo "  Host: localhost"
    echo "  Port: 5432"
    echo "  Database: wchat_spider"
    echo "  Username: postgres"
    echo "  Password: difyai123456"
    echo ""
    echo "查看日志: docker-compose logs -f postgres"
    echo "停止数据库: docker-compose down"
    echo ""
    echo "下一步: 运行数据库迁移"
    echo "  cd backend && npx prisma migrate deploy"
else
    echo "❌ 数据库容器启动失败"
    echo "查看日志: docker-compose logs postgres"
fi
