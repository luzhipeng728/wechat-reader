#!/bin/bash

echo "停止 PostgreSQL 数据库容器..."

docker-compose down

echo "✅ 数据库容器已停止"
echo ""
echo "注意: 数据已保存在 Docker volume 中,下次启动会保留数据"
echo "如需完全删除数据,运行: docker-compose down -v"
