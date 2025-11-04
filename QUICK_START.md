# 快速启动指南

## 方式1: 本地开发(推荐用于开发)

### 第一步: 启动数据库

```bash
# 使用Docker启动PostgreSQL
docker run --name wchat-postgres \
  -e POSTGRES_USER=wchat \
  -e POSTGRES_PASSWORD=wchat123 \
  -e POSTGRES_DB=wchat_spider \
  -p 5432:5432 \
  -d postgres:14

# 验证数据库是否运行
docker ps | grep wchat-postgres
```

### 第二步: 启动后端

打开新终端:

```bash
cd backend

# 1. 安装依赖
npm install

# 2. 配置环境变量(已预配置,可直接使用)
# .env文件已存在,包含Claude API配置

# 3. 初始化数据库
npm run prisma:generate
npm run prisma:migrate

# 4. 启动后端服务
npm run start:dev
```

等待看到:
```
应用运行在: http://localhost:3001
API文档地址: http://localhost:3001/api/docs
```

### 第三步: 测试API

打开浏览器访问: `http://localhost:3001/api/docs`

你会看到完整的Swagger API文档。

### 第四步: 创建测试数据

使用API文档或curl测试:

```bash
# 1. 注册用户
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "测试用户"
  }'

# 2. 登录获取token
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# 复制返回的access_token,后续请求需要使用
```

## 方式2: 使用Prisma Studio管理数据

```bash
cd backend
npm run prisma:studio
```

访问 `http://localhost:5555` 可视化管理数据库。

## 完整使用流程示例

### 1. 注册并登录
使用上面的curl命令,获取access_token

### 2. 创建公众号

```bash
curl -X POST http://localhost:3001/accounts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "银标Daily",
    "description": "银行招标信息公众号"
  }'
```

复制返回的account_id

### 3. 创建维度模板

```bash
curl -X POST http://localhost:3001/dimensions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "name": "招标项目信息",
    "description": "提取招标项目的基本信息",
    "modelPreference": "haiku",
    "fields": [
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
        "description": "项目发布日期",
        "required": false,
        "example": "2025-10"
      }
    ]
  }'
```

### 4. 锁定维度模板

```bash
curl -X POST http://localhost:3001/dimensions/YOUR_TEMPLATE_ID/lock \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 5. 添加文章

```bash
curl -X POST http://localhost:3001/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "accountId": "YOUR_ACCOUNT_ID",
    "url": "https://mp.weixin.qq.com/s/HTe3dyXkypQKW5uhlyn_kw"
  }'
```

系统会自动调用爬虫API提取文章内容。复制返回的article_id。

### 6. 提取内容

```bash
curl -X POST http://localhost:3001/extractions/articles/YOUR_ARTICLE_ID/extract-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

系统会自动使用所有维度模板提取内容。

### 7. 查看提取结果

```bash
curl -X GET http://localhost:3001/extractions/articles/YOUR_ARTICLE_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 8. 导出数据

```bash
curl -X GET http://localhost:3001/extractions/templates/YOUR_TEMPLATE_ID/export \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 常用命令

### 后端

```bash
cd backend

# 开发模式
npm run start:dev

# 生产构建
npm run build
npm run start:prod

# 数据库相关
npm run prisma:generate  # 生成Prisma Client
npm run prisma:migrate   # 运行迁移
npm run prisma:studio    # 打开可视化工具

# 代码质量
npm run lint
npm run format
npm run test
```

### Docker命令

```bash
# 启动数据库
docker start wchat-postgres

# 停止数据库
docker stop wchat-postgres

# 查看日志
docker logs wchat-postgres

# 进入数据库
docker exec -it wchat-postgres psql -U wchat -d wchat_spider
```

## 故障排查

### 数据库连接失败
```bash
# 检查PostgreSQL是否运行
docker ps | grep wchat-postgres

# 检查端口是否被占用
lsof -i :5432

# 重启数据库
docker restart wchat-postgres
```

### Prisma迁移失败
```bash
# 重置数据库(警告:会删除所有数据)
npm run prisma migrate reset

# 手动执行迁移
npm run prisma migrate dev
```

### Claude API调用失败
检查`.env`文件中的配置:
- `ANTHROPIC_BASE_URL=http://82.197.94.152:9990/api`
- `ANTHROPIC_AUTH_TOKEN=cr_7628403c826f9f6f92e7d97fec36fbb92890816e6d603cf1b7ec39ed4bd89897`

### Spider API调用失败
检查`.env`文件中的配置:
- `SPIDER_API_URL=http://156.233.229.86:3000`

确保网络可访问该地址。

## 下一步

1. ✅ 后端已完成
2. ⏳ 前端开发(待实现)
3. ⏳ 部署配置(待配置)

当前可以通过Swagger API文档测试所有功能: `http://localhost:3001/api/docs`
