# 项目当前状态

## ✅ 已完成

### 后端 (100%完成)
- ✅ NestJS项目搭建
- ✅ PostgreSQL数据库设计(7张表)
- ✅ 数据库迁移完成
- ✅ 所有API接口开发完成
  - 用户认证 (注册/登录)
  - 公众号管理 (CRUD)
  - 文章管理 (自动爬取)
  - 维度管理 (支持图片识别)
  - 内容提取 (Claude AI集成)
  - 模型管理
- ✅ Swagger API文档
- ✅ Claude API集成
- ✅ Spider爬虫API集成

### 前端 (基础搭建中)
- ✅ Next.js项目配置
- ⏳ 页面开发中...

## 📍 当前端口配置

- **后端**: http://localhost:4001
- **前端**: http://localhost:4000
- **API文档**: http://localhost:4001/api/docs

## 🚀 如何启动

### 1. 启动后端

打开终端,执行:

\`\`\`bash
cd /Users/luzhipeng/projects/wchat_spark/backend
npm run start:dev
\`\`\`

看到以下输出表示成功:
\`\`\`
应用运行在: http://localhost:4001
API文档地址: http://localhost:4001/api/docs
\`\`\`

### 2. 安装前端依赖并启动

打开新终端,执行:

\`\`\`bash
cd /Users/luzhipeng/projects/wchat_spark/frontend
npm install
npm run dev
\`\`\`

前端将运行在: http://localhost:4000

## 📊 项目结构

\`\`\`
wchat_spark/
├── backend/              ✅ 完成
│   ├── src/
│   │   ├── auth/        # 认证模块
│   │   ├── users/       # 用户模块
│   │   ├── accounts/    # 公众号模块
│   │   ├── articles/    # 文章模块
│   │   ├── dimensions/  # 维度模块
│   │   ├── extractions/ # 提取模块
│   │   ├── claude/      # Claude服务
│   │   └── spider/      # 爬虫服务
│   ├── prisma/
│   │   └── schema.prisma
│   └── .env
│
├── frontend/            ⏳ 开发中
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
│
├── DATABASE_DESIGN.md   # 数据库设计
├── QUICK_START.md       # 快速启动指南
├── PROJECT_OVERVIEW.md  # 项目总览
└── README.md
\`\`\`

## 🎯 核心功能流程

### 使用流程
1. 用户注册/登录
2. 创建公众号 (如"银标Daily")
3. 定义提取维度 (手动或图片识别)
   - 银行
   - 项目名称
   - AI
   - 中标厂商
   - 成交价(元)
   - 日期
   - 备注
4. 锁定维度模板
5. 添加文章URL (https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw)
6. 系统自动:
   - 调用Spider API提取文章内容
   - 调用Claude AI提取结构化数据
7. 查看/导出提取结果

## 🔧 测试API

访问 http://localhost:4001/api/docs 使用Swagger测试所有接口

### 测试用例

\`\`\`bash
# 1. 注册用户
POST /auth/register
{
  "email": "test@example.com",
  "password": "password123",
  "name": "测试用户"
}

# 2. 登录获取token
POST /auth/login
{
  "email": "test@example.com",
  "password": "password123"
}

# 3. 创建公众号 (需要Bearer Token)
POST /accounts
{
  "name": "银标Daily",
  "description": "银行招标信息"
}

# 4. 创建维度模板
POST /dimensions
{
  "accountId": "{account_id}",
  "name": "招标项目信息",
  "fields": [
    {
      "name": "bank_name",
      "label": "银行",
      "type": "text",
      "description": "银行名称",
      "required": true
    }
    // ... 更多字段
  ]
}

# 5. 添加文章
POST /articles
{
  "accountId": "{account_id}",
  "url": "https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw"
}

# 6. 提取内容
POST /extractions/articles/{article_id}/extract-all
\`\`\`

## 🔑 环境变量

### 后端 (.env)
\`\`\`
DATABASE_URL="postgresql://postgres:difyai123456@localhost:5432/wchat_spider?schema=public"
JWT_SECRET="wchat-spider-jwt-secret-key-2025"
ANTHROPIC_BASE_URL="http://82.197.94.152:9990/api"
ANTHROPIC_AUTH_TOKEN="cr_7628403c826f9f6f92e7d97fec36fbb92890816e6d603cf1b7ec39ed4bd89897"
SPIDER_API_URL="http://156.233.229.86:3000"
PORT=4001
CORS_ORIGIN="http://localhost:4000"
\`\`\`

### 前端 (.env.local)
\`\`\`
NEXT_PUBLIC_API_URL=http://localhost:4001
\`\`\`

## 📝 后续开发任务

前端页面开发:
- [ ] 登录/注册页面
- [ ] 公众号管理页面
- [ ] 文章列表页面
- [ ] 维度模板管理页面
- [ ] 提取结果展示页面
- [ ] 数据导出功能

## 📞 技术支持

- 数据库: PostgreSQL
- 后端: NestJS + Prisma
- 前端: Next.js 14 + Ant Design + TypeScript
- AI: Claude Haiku/Sonnet
- 爬虫: 第三方Spider API

## ⚠️ 注意事项

1. 确保PostgreSQL数据库正在运行
2. 后端必须先于前端启动
3. Claude API和Spider API需要网络连接
4. 首次使用需要运行数据库迁移: \`npx prisma migrate dev\`
