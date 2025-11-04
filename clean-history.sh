#!/bin/bash

echo "⚠️  警告: 此操作将完全重写 Git 历史!"
echo "这将删除所有包含敏感信息的历史提交记录"
echo ""
echo "按 Ctrl+C 取消,或按回车继续..."
read

echo "1. 备份当前分支..."
git branch backup-before-clean

echo "2. 创建临时分支..."
git checkout --orphan temp-clean-branch

echo "3. 添加所有当前文件..."
git add -A

echo "4. 创建新的初始提交..."
git commit -m "Initial commit - 公众号文章提取系统

完整功能的微信公众号文章爬取和AI内容提取系统

## 主要功能
- 用户认证系统 (JWT)
- 公众号管理
- 文章爬取和内容提取
- 维度模板管理
- AI 内容提取 (Claude API)
- 数据导出 (CSV)
- 模糊搜索功能
- PM2 进程管理

## 技术栈
- 后端: NestJS + Prisma + PostgreSQL
- 前端: Next.js 14 + Ant Design
- 部署: Docker + PM2

⚠️ 此提交已清理所有敏感信息
所有配置请参考 .env.example 文件

🤖 Generated with Claude Code
"

echo "5. 删除旧的 master 分支..."
git branch -D master

echo "6. 重命名当前分支为 master..."
git branch -m master

echo "7. 强制推送到远程仓库..."
echo "即将执行: git push -f origin master"
echo "这将完全覆盖远程仓库的历史!"
echo "按回车继续..."
read

git push -f origin master

echo ""
echo "✅ Git 历史已清理完成!"
echo ""
echo "旧的历史已保存在 backup-before-clean 分支"
echo "如需恢复,运行: git checkout backup-before-clean"
echo ""
echo "建议: 立即修改所有暴露的密码和API密钥!"
