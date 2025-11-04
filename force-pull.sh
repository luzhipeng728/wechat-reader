#!/bin/bash

# 强制拉取最新代码(用于 Git 历史被重写的情况)

echo "⚠️  警告: 此操作将丢弃所有本地修改!"
echo "这会强制更新到远程仓库的最新版本"
echo ""
echo "按 Ctrl+C 取消,或按回车继续..."
read

echo "1. 备份当前本地分支..."
git branch backup-local-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true

echo "2. 获取远程仓库最新信息..."
git fetch origin

echo "3. 重置到远程 master 分支..."
git reset --hard origin/master

echo "4. 清理未跟踪的文件..."
git clean -fd

echo ""
echo "✅ 已更新到最新版本!"
echo ""
echo "如需恢复本地修改,查看备份分支:"
echo "  git branch | grep backup-local"
