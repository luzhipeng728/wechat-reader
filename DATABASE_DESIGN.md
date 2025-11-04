# 数据库设计文档

## 技术选型
- 数据库: PostgreSQL 14+
- ORM: Prisma

## 表结构设计

### 1. 用户表 (users)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

### 2. 公众号表 (official_accounts)
```sql
CREATE TABLE official_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  avatar_url TEXT,
  wechat_id VARCHAR(100), -- 预留: 公众号微信号
  biz VARCHAR(100),        -- 预留: 公众号biz参数
  reserved_fields JSONB,   -- 预留: 其他爬虫需要的字段
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_user_id ON official_accounts(user_id);
CREATE INDEX idx_accounts_name ON official_accounts(name);
```

### 3. 文章表 (articles)
```sql
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES official_accounts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  news_id VARCHAR(100) NOT NULL,
  title TEXT NOT NULL,
  author_name VARCHAR(255),
  publish_time TIMESTAMP,
  raw_content JSONB NOT NULL,      -- 存储爬虫API返回的完整JSON
  markdown_content TEXT,           -- Markdown格式的文章内容
  status VARCHAR(20) DEFAULT 'pending', -- pending/extracting/completed/error
  error_message TEXT,
  extraction_count INTEGER DEFAULT 0, -- 已执行的提取次数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_articles_account_id ON articles(account_id);
CREATE INDEX idx_articles_news_id ON articles(news_id);
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_publish_time ON articles(publish_time DESC);
CREATE UNIQUE INDEX idx_articles_url ON articles(url);
```

### 4. 维度模板表 (dimension_templates)
```sql
CREATE TABLE dimension_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES official_accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,           -- 字段定义数组: [{name, type, description, required, example}]
  prompt_template TEXT,            -- 自定义提示词模板
  is_locked BOOLEAN DEFAULT false, -- 确认后锁定,不可修改
  model_preference VARCHAR(50) DEFAULT 'haiku', -- haiku/sonnet
  sort_order INTEGER DEFAULT 0,    -- 排序
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_account_id ON dimension_templates(account_id);
CREATE INDEX idx_templates_locked ON dimension_templates(is_locked);
```

**fields字段JSON结构示例:**
```json
[
  {
    "name": "bank_name",
    "label": "银行",
    "type": "text",
    "description": "银行名称",
    "required": true,
    "example": "兴业银行"
  },
  {
    "name": "project_name",
    "label": "项目名称",
    "type": "text",
    "description": "项目完整名称",
    "required": true,
    "example": "数据中心运行维护类现场技术服务项目"
  },
  {
    "name": "amount",
    "label": "成交价(元)",
    "type": "number",
    "description": "项目金额,单位元",
    "required": false,
    "example": "36330000"
  },
  {
    "name": "date",
    "label": "日期",
    "type": "date",
    "description": "项目日期",
    "required": false,
    "example": "2025-10"
  }
]
```

### 5. 提取结果表 (extraction_results)
```sql
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES dimension_templates(id) ON DELETE CASCADE,
  extracted_data JSONB NOT NULL,   -- 提取的字段值,与template的fields对应
  model_used VARCHAR(50) NOT NULL, -- 使用的模型名称
  tokens_used INTEGER,             -- 消耗的token数
  extraction_time INTEGER,         -- 提取耗时(毫秒)
  status VARCHAR(20) DEFAULT 'success', -- success/error
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_results_article_id ON extraction_results(article_id);
CREATE INDEX idx_results_template_id ON extraction_results(template_id);
CREATE INDEX idx_results_created_at ON extraction_results(created_at DESC);
CREATE UNIQUE INDEX idx_results_article_template ON extraction_results(article_id, template_id);
```

**extracted_data字段JSON结构示例:**
```json
{
  "bank_name": "兴业银行",
  "project_name": "2025-2028年度(三年期)数据中心运行维护类现场技术服务项目",
  "amount": 36330000,
  "date": "2025-10"
}
```

### 6. 模型配置表 (model_configs)
```sql
CREATE TABLE model_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,      -- 显示名称
  model_id VARCHAR(100) NOT NULL,  -- claude-haiku-4-5-20251001
  description TEXT,
  base_url TEXT,                   -- API Base URL
  api_key TEXT NOT NULL,           -- 加密存储
  max_tokens INTEGER DEFAULT 4096,
  temperature DECIMAL(3,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_models_active ON model_configs(is_active);
```

### 7. 提取任务队列表 (extraction_jobs) - 可选
```sql
CREATE TABLE extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES dimension_templates(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending', -- pending/processing/completed/failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_jobs_status ON extraction_jobs(status);
CREATE INDEX idx_jobs_created_at ON extraction_jobs(created_at DESC);
```

## 关系说明

1. **用户 1:N 公众号**: 一个用户可以管理多个公众号
2. **公众号 1:N 文章**: 一个公众号有多篇文章
3. **公众号 1:N 维度模板**: 一个公众号可以定义多个维度模板
4. **文章 1:N 提取结果**: 一篇文章可以有多个维度的提取结果
5. **维度模板 1:N 提取结果**: 一个维度模板对应多条提取结果

## 数据流程

1. 用户创建公众号
2. 用户为公众号定义维度模板(可多个)
3. 用户添加文章URL
4. 系统调用爬虫API获取文章内容
5. 系统获取该公众号所有已激活的维度模板
6. 循环调用Claude API,根据每个维度模板提取内容
7. 存储提取结果到extraction_results表

## 索引策略

- 主键使用UUID
- 外键关系建立索引
- 常用查询字段建立索引(email, status, publish_time等)
- 使用JSONB的GIN索引支持JSON字段查询

## 扩展性考虑

1. **JSONB字段**: 支持灵活的动态字段存储
2. **软删除**: is_active字段支持软删除
3. **时间戳**: created_at/updated_at便于追踪
4. **预留字段**: reserved_fields预留未来扩展
