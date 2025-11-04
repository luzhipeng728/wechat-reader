# 项目总览

## 项目名称
公众号文章爬虫管理平台

## 项目简介
一个智能化的公众号文章内容提取和管理系统,支持用户自定义提取维度,使用Claude AI自动提取结构化数据。特别适合需要从大量公众号文章中提取特定信息的场景(如招标信息、新闻摘要等)。

## 核心价值

1. **自动化内容提取**: 无需手动复制粘贴,AI自动识别并提取所需信息
2. **灵活的维度定义**: 用户自定义提取字段,适应不同业务场景
3. **图片识别**: 上传Excel截图即可生成提取模板
4. **批量处理**: 支持批量添加文章和批量提取
5. **数据导出**: 提取结果可导出为JSON格式

## 已完成功能 ✅

### 后端API (100%完成)

#### 1. 用户认证模块
- [x] 用户注册
- [x] 用户登录
- [x] JWT认证
- [x] 用户信息管理

#### 2. 公众号管理模块
- [x] 创建公众号
- [x] 查询公众号列表
- [x] 查询公众号详情
- [x] 更新公众号信息
- [x] 删除公众号(软删除)

#### 3. 文章管理模块
- [x] 添加文章URL
- [x] 自动调用爬虫API提取内容
- [x] 批量添加文章
- [x] 查询文章列表(支持分页)
- [x] 查询文章详情
- [x] 删除文章

#### 4. 维度管理模块
- [x] 创建维度模板
- [x] 从图片识别创建维度
- [x] 查询维度列表
- [x] 查询维度详情
- [x] 更新维度模板
- [x] 锁定维度模板
- [x] 向已锁定模板添加字段
- [x] 删除维度模板(软删除)
- [x] 调整维度排序

#### 5. 内容提取模块
- [x] 为文章执行单个维度提取
- [x] 为文章执行所有维度提取
- [x] 查询文章的提取结果
- [x] 查询维度的提取结果(支持分页)
- [x] 导出提取结果
- [x] 删除提取结果

#### 6. 模型管理模块
- [x] 获取可用模型列表
- [x] 获取默认模型
- [x] 支持Haiku和Sonnet模型

#### 7. 核心服务
- [x] Claude AI服务封装
  - [x] 结构化数据提取
  - [x] 图片识别
  - [x] 自定义提示词
- [x] Spider爬虫服务封装
  - [x] 文章内容提取
  - [x] Markdown格式化

#### 8. 数据库
- [x] Prisma Schema设计
- [x] 7张核心数据表
- [x] 完整的关系定义
- [x] 索引优化

#### 9. 文档
- [x] API文档(Swagger)
- [x] 数据库设计文档
- [x] 快速启动指南
- [x] README文档

## 待实现功能 ⏳

### 前端应用 (0%完成)

#### 1. 基础框架
- [ ] Next.js项目搭建
- [ ] 路由配置
- [ ] 全局状态管理(Zustand)
- [ ] API请求封装

#### 2. 认证页面
- [ ] 登录页面
- [ ] 注册页面
- [ ] 忘记密码

#### 3. 公众号管理页面
- [ ] 公众号列表
- [ ] 创建公众号表单
- [ ] 编辑公众号
- [ ] 公众号详情

#### 4. 文章管理页面
- [ ] 文章列表(表格形式)
- [ ] 添加文章表单
- [ ] 批量导入
- [ ] 文章详情展示
- [ ] 提取状态显示

#### 5. 维度管理页面
- [ ] 维度列表
- [ ] 创建维度表单
- [ ] 字段编辑器
- [ ] 图片上传识别
- [ ] 锁定/解锁操作
- [ ] 拖拽排序

#### 6. 提取结果页面
- [ ] 结果列表展示
- [ ] 表格视图
- [ ] 数据筛选
- [ ] 导出功能
- [ ] 数据统计

#### 7. 设置页面
- [ ] 模型选择
- [ ] 用户信息编辑
- [ ] API密钥配置

## 技术架构

### 后端技术栈
```
NestJS 10
├── @nestjs/common           # 核心框架
├── @nestjs/jwt              # JWT认证
├── @nestjs/passport         # 认证策略
├── @nestjs/swagger          # API文档
├── @prisma/client           # 数据库ORM
├── @anthropic-ai/sdk        # Claude AI SDK
├── bcrypt                   # 密码加密
└── axios                    # HTTP请求
```

### 数据库设计
```
PostgreSQL 14+
├── users                    # 用户表
├── official_accounts        # 公众号表
├── articles                 # 文章表
├── dimension_templates      # 维度模板表
├── extraction_results       # 提取结果表
└── model_configs            # 模型配置表
```

### 前端技术栈(待实现)
```
Next.js 14
├── React 18
├── TypeScript
├── Ant Design / shadcn/ui
├── Zustand
├── Axios
└── React Hook Form + Zod
```

## API端点一览

### 认证 (/auth)
- `POST /auth/register` - 注册
- `POST /auth/login` - 登录

### 用户 (/users)
- `GET /users/profile` - 获取个人信息
- `PUT /users/profile` - 更新个人信息

### 公众号 (/accounts)
- `POST /accounts` - 创建
- `GET /accounts` - 列表
- `GET /accounts/:id` - 详情
- `PUT /accounts/:id` - 更新
- `DELETE /accounts/:id` - 删除

### 文章 (/articles)
- `POST /articles` - 添加
- `POST /articles/batch` - 批量添加
- `GET /articles` - 列表
- `GET /articles/:id` - 详情
- `DELETE /articles/:id` - 删除

### 维度 (/dimensions)
- `POST /dimensions` - 创建
- `POST /dimensions/from-image` - 图片识别创建
- `GET /dimensions` - 列表
- `GET /dimensions/:id` - 详情
- `PUT /dimensions/:id` - 更新
- `POST /dimensions/:id/lock` - 锁定
- `POST /dimensions/:id/add-fields` - 添加字段
- `POST /dimensions/reorder` - 排序
- `DELETE /dimensions/:id` - 删除

### 提取 (/extractions)
- `POST /extractions/articles/:articleId/extract-all` - 提取所有维度
- `POST /extractions/articles/:articleId/templates/:templateId` - 提取单个维度
- `GET /extractions/articles/:articleId` - 文章的提取结果
- `GET /extractions/templates/:templateId` - 维度的提取结果
- `GET /extractions/templates/:templateId/export` - 导出
- `DELETE /extractions/:id` - 删除

### 模型 (/models)
- `GET /models` - 模型列表
- `GET /models/default` - 默认模型

## 数据流程

### 核心业务流程
```
1. 用户注册/登录
   ↓
2. 创建公众号
   ↓
3. 定义提取维度
   ├── 手动创建字段
   └── 图片识别生成
   ↓
4. 锁定维度模板
   ↓
5. 添加文章URL
   ↓ (自动)
6. Spider API提取文章内容
   ↓
7. 触发内容提取
   ↓ (循环)
8. Claude AI提取每个维度
   ↓
9. 存储提取结果
   ↓
10. 查看/导出数据
```

### 技术流程
```
前端请求
   ↓
NestJS Controller
   ↓
Service层业务逻辑
   ↓
├── Prisma ORM → PostgreSQL
├── Spider Service → 爬虫API
└── Claude Service → Claude API
   ↓
返回结果给前端
```

## 项目特色

### 1. 维度锁定机制
- 创建时可自由编辑
- 确认后自动锁定
- 锁定后只能新增字段,不能修改
- 保证历史数据的一致性

### 2. 图片识别创建维度
- 上传Excel表格截图
- Claude Vision自动识别表头
- 生成字段定义
- 用户可编辑确认

### 3. 双模型支持
- Haiku: 快速、便宜,适合大批量
- Sonnet: 精准、强大,适合复杂提取

### 4. 灵活的字段定义
```json
{
  "name": "字段名(英文)",
  "label": "显示名(中文)",
  "type": "数据类型(text/number/date)",
  "description": "字段描述(帮助AI理解)",
  "required": true/false,
  "example": "示例值"
}
```

### 5. 完整的错误处理
- API调用失败记录
- 提取失败保存错误信息
- 支持重试机制

## 环境配置

### 必需的环境变量
```env
# 数据库
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key

# Claude API
ANTHROPIC_BASE_URL=http://82.197.94.152:9990/api
ANTHROPIC_AUTH_TOKEN=cr_7628403c826f9f6f92e7d97fec36fbb92890816e6d603cf1b7ec39ed4bd89897

# Spider API
SPIDER_API_URL=http://156.233.229.86:3000
```

## 开发进度

- [x] 需求分析
- [x] 技术选型
- [x] 数据库设计
- [x] 后端API开发
- [x] API文档
- [ ] 前端开发
- [ ] 集成测试
- [ ] 部署配置
- [ ] 用户文档

## 下一步计划

### 阶段1: 前端基础 (预计3-5天)
1. 搭建Next.js项目
2. 实现登录注册
3. 实现公众号管理
4. 实现文章列表

### 阶段2: 核心功能 (预计5-7天)
1. 实现维度管理
2. 实现字段编辑器
3. 实现图片上传
4. 实现提取功能

### 阶段3: 优化完善 (预计3-5天)
1. 数据展示优化
2. 导出功能
3. 错误处理
4. 性能优化

### 阶段4: 部署上线 (预计2-3天)
1. 生产环境配置
2. 数据库迁移
3. 域名配置
4. 监控告警

## 文件结构

```
wchat_spark/
├── backend/                         # 后端 ✅
│   ├── src/
│   │   ├── auth/                   # 认证模块 ✅
│   │   ├── users/                  # 用户模块 ✅
│   │   ├── accounts/               # 公众号模块 ✅
│   │   ├── articles/               # 文章模块 ✅
│   │   ├── dimensions/             # 维度模块 ✅
│   │   ├── extractions/            # 提取模块 ✅
│   │   ├── models/                 # 模型模块 ✅
│   │   ├── claude/                 # Claude服务 ✅
│   │   ├── spider/                 # Spider服务 ✅
│   │   ├── prisma/                 # Prisma服务 ✅
│   │   ├── app.module.ts           # 主模块 ✅
│   │   └── main.ts                 # 入口文件 ✅
│   ├── prisma/
│   │   └── schema.prisma           # 数据库Schema ✅
│   ├── .env                        # 环境变量 ✅
│   ├── package.json                # 依赖配置 ✅
│   └── README.md                   # 后端文档 ✅
│
├── frontend/                        # 前端 ⏳
│   └── (待创建)
│
├── DATABASE_DESIGN.md              # 数据库设计 ✅
├── QUICK_START.md                  # 快速启动 ✅
├── PROJECT_OVERVIEW.md             # 项目总览 ✅
└── README.md                       # 项目说明 ✅
```

## 联系与支持

- 问题反馈: 提交GitHub Issue
- 功能建议: 提交GitHub Discussion
- 紧急问题: 联系开发者

---

**当前版本**: v1.0.0 (后端完成)
**最后更新**: 2025-11-04
**开发者**: Your Name
