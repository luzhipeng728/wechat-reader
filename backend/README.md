# 公众号文章爬虫管理平台 - 后端

基于NestJS的公众号文章爬虫管理平台后端API。

## 技术栈

- **框架**: NestJS 10
- **数据库**: PostgreSQL 14+
- **ORM**: Prisma
- **认证**: JWT + Passport
- **API文档**: Swagger
- **AI模型**: Claude (Haiku 4.5 & Sonnet 4.5)

## 功能模块

1. **用户认证**: 注册、登录、JWT认证
2. **公众号管理**: CRUD操作
3. **文章管理**: 自动爬取文章内容
4. **维度管理**: 自定义提取字段,支持图片识别
5. **内容提取**: 使用Claude AI提取结构化数据
6. **模型管理**: 选择Haiku或Sonnet模型

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制`.env.example`到`.env`,并修改配置:

```bash
cp .env.example .env
```

重要配置项:
- `DATABASE_URL`: PostgreSQL数据库连接字符串
- `JWT_SECRET`: JWT密钥
- `ANTHROPIC_BASE_URL`: Claude API地址
- `ANTHROPIC_AUTH_TOKEN`: Claude API密钥

### 3. 初始化数据库

```bash
# 生成Prisma Client
npm run prisma:generate

# 运行数据库迁移
npm run prisma:migrate

# (可选)打开Prisma Studio查看数据
npm run prisma:studio
```

### 4. 启动开发服务器

```bash
npm run start:dev
```

服务将运行在 `http://localhost:3001`

### 5. 查看API文档

访问 `http://localhost:3001/api/docs` 查看Swagger文档

## 数据库设置

### 使用Docker快速启动PostgreSQL

```bash
docker run --name wchat-postgres \
  -e POSTGRES_USER=wchat \
  -e POSTGRES_PASSWORD=wchat123 \
  -e POSTGRES_DB=wchat_spider \
  -p 5432:5432 \
  -d postgres:14
```

然后更新`.env`中的`DATABASE_URL`:

```
DATABASE_URL="postgresql://wchat:wchat123@localhost:5432/wchat_spider?schema=public"
```

## 项目结构

```
src/
├── auth/           # 认证模块
├── users/          # 用户管理
├── accounts/       # 公众号管理
├── articles/       # 文章管理
├── dimensions/     # 维度管理
├── extractions/    # 内容提取
├── models/         # 模型配置
├── claude/         # Claude API封装
├── spider/         # 爬虫API封装
├── prisma/         # Prisma服务
├── app.module.ts   # 主模块
└── main.ts         # 入口文件
```

## API端点

### 认证
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录

### 公众号
- `GET /accounts` - 获取公众号列表
- `POST /accounts` - 创建公众号
- `GET /accounts/:id` - 获取公众号详情
- `PUT /accounts/:id` - 更新公众号
- `DELETE /accounts/:id` - 删除公众号

### 文章
- `POST /articles` - 添加文章URL(自动爬取)
- `POST /articles/batch` - 批量添加文章
- `GET /articles` - 获取文章列表
- `GET /articles/:id` - 获取文章详情
- `DELETE /articles/:id` - 删除文章

### 维度模板
- `POST /dimensions` - 创建维度模板
- `POST /dimensions/from-image` - 从图片创建维度模板
- `GET /dimensions` - 获取维度模板列表
- `POST /dimensions/:id/lock` - 锁定维度模板
- `POST /dimensions/:id/add-fields` - 添加新字段

### 内容提取
- `POST /extractions/articles/:articleId/extract-all` - 提取所有维度
- `POST /extractions/articles/:articleId/templates/:templateId` - 提取单个维度
- `GET /extractions/articles/:articleId` - 获取文章的提取结果
- `GET /extractions/templates/:templateId` - 获取维度的提取结果
- `GET /extractions/templates/:templateId/export` - 导出提取结果

## 核心流程

### 1. 添加文章并提取内容

```
1. 用户添加文章URL
2. 后端调用Spider API获取文章内容
3. 存储文章到数据库(状态: pending)
4. 用户触发提取或自动触发
5. 获取该公众号的所有维度模板
6. 循环调用Claude API提取每个维度
7. 存储提取结果
8. 更新文章状态(completed)
```

### 2. 创建维度模板

**方式1: 手动创建**
```json
{
  "accountId": "xxx",
  "name": "招标项目信息",
  "fields": [
    {
      "name": "bank_name",
      "label": "银行",
      "type": "text",
      "description": "银行名称",
      "required": true
    }
  ]
}
```

**方式2: 图片识别**
```json
{
  "accountId": "xxx",
  "name": "招标项目信息",
  "imageBase64": "base64编码的图片"
}
```

## 开发命令

```bash
# 开发模式
npm run start:dev

# 生产构建
npm run build
npm run start:prod

# 运行测试
npm run test

# 代码格式化
npm run format

# 代码检查
npm run lint

# Prisma相关
npm run prisma:generate  # 生成Client
npm run prisma:migrate   # 运行迁移
npm run prisma:studio    # 打开可视化工具
```

## 注意事项

1. **数据库迁移**: 修改schema后记得运行迁移
2. **API限流**: 生产环境建议添加限流
3. **错误处理**: 已实现基础错误处理,可根据需要扩展
4. **日志**: 生产环境建议集成日志系统
5. **Claude API**: 注意token消耗,Haiku更便宜

## License

MIT
