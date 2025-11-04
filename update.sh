#!/bin/bash

# 生产环境快速更新脚本

set -e

# 解析命令行参数
SKIP_DEPS=false
SKIP_MIGRATE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --skip-migrate)
      SKIP_MIGRATE=true
      shift
      ;;
    --help)
      echo "用法: ./update.sh [选项]"
      echo ""
      echo "选项:"
      echo "  --skip-deps      跳过依赖安装(适用于依赖已安装的情况)"
      echo "  --skip-migrate   跳过数据库迁移(适用于数据库架构无变更的情况)"
      echo "  --help           显示此帮助信息"
      echo ""
      echo "示例:"
      echo "  ./update.sh                    # 完整更新"
      echo "  ./update.sh --skip-deps        # 跳过依赖安装"
      echo "  ./update.sh --skip-deps --skip-migrate  # 只拉代码、编译和重启"
      exit 0
      ;;
    *)
      echo "❌ 未知选项: $1"
      echo "运行 ./update.sh --help 查看帮助"
      exit 1
      ;;
  esac
done

echo "🔄 更新 WeChat Spark..."

# 拉取最新代码
echo "1. 拉取最新代码..."
git pull

# 安装依赖
if [ "$SKIP_DEPS" = true ]; then
    echo "2. ⏭️  跳过依赖更新"
else
    echo "2. 更新依赖..."
    cd backend && npm ci && cd ..
    cd frontend && npm ci && cd ..
fi

# 编译
echo "3. 编译后端..."
cd backend && npm run build && cd ..

echo "4. 编译前端..."
cd frontend && npm run build && cd ..

# 数据库迁移
if [ "$SKIP_MIGRATE" = true ]; then
    echo "5. ⏭️  跳过数据库迁移"
else
    echo "5. 运行数据库迁移..."
    cd backend && npx prisma migrate deploy && cd ..
fi

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
