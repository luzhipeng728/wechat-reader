# 数据库设置指南

## 方式一: 使用 Docker (推荐)

### 1. 安装 Docker

**macOS:**
```bash
brew install --cask docker
```

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Windows:**
下载并安装 Docker Desktop: https://www.docker.com/products/docker-desktop

### 2. 启动数据库

```bash
# 启动 PostgreSQL 容器
./db-start.sh

# 或者直接使用 docker-compose
docker-compose up -d postgres
```

### 3. 运行数据库迁移

```bash
cd backend
npx prisma migrate deploy
```

### 4. 验证数据库连接

```bash
# 使用 Prisma Studio 查看数据库
npx prisma studio
```

访问 http://localhost:5555 即可看到数据库管理界面

### 数据库管理命令

```bash
# 查看容器状态
docker ps

# 查看数据库日志
docker-compose logs -f postgres

# 停止数据库
./db-stop.sh
# 或
docker-compose down

# 停止并删除所有数据
docker-compose down -v

# 重启数据库
docker-compose restart postgres

# 进入数据库容器
docker exec -it wchat_spider_db psql -U postgres -d wchat_spider
```

### 数据库连接信息

- **Host:** localhost
- **Port:** 5432
- **Database:** wchat_spider
- **Username:** postgres
- **Password:** difyai123456

## 方式二: 本地安装 PostgreSQL

### macOS

```bash
# 使用 Homebrew 安装
brew install postgresql@14

# 启动服务
brew services start postgresql@14

# 创建数据库
createdb wchat_spider

# 修改 backend/.env 中的连接字符串
DATABASE_URL="postgresql://postgres@localhost:5432/wchat_spider?schema=public"
```

### Linux (Ubuntu/Debian)

```bash
# 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库和用户
sudo -u postgres psql
CREATE DATABASE wchat_spider;
CREATE USER wchat_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE wchat_spider TO wchat_user;
\q

# 修改 backend/.env 中的连接字符串
DATABASE_URL="postgresql://wchat_user:your_password@localhost:5432/wchat_spider?schema=public"
```

### Windows

1. 下载并安装 PostgreSQL: https://www.postgresql.org/download/windows/
2. 安装时记住设置的密码
3. 打开 pgAdmin 或命令行创建数据库 `wchat_spider`
4. 修改 `backend/.env` 中的连接字符串

## 数据库迁移

### 初始化数据库

```bash
cd backend
npx prisma migrate deploy
```

### 重置数据库 (清空所有数据)

```bash
cd backend
npx prisma migrate reset
```

### 查看迁移状态

```bash
cd backend
npx prisma migrate status
```

### 创建新迁移

```bash
cd backend
# 修改 prisma/schema.prisma 后
npx prisma migrate dev --name your_migration_name
```

## 常见问题

### 1. 端口 5432 已被占用

```bash
# 查找占用端口的进程
lsof -i :5432

# 杀死进程
kill -9 <PID>

# 或修改 docker-compose.yml 中的端口映射
ports:
  - "5433:5432"  # 宿主机使用 5433 端口
```

### 2. 连接被拒绝

```bash
# 检查容器是否运行
docker ps

# 查看容器日志
docker-compose logs postgres

# 重启容器
docker-compose restart postgres
```

### 3. 迁移失败

```bash
# 检查数据库连接
cd backend
npx prisma db pull

# 强制重置数据库
npx prisma migrate reset --force

# 重新运行迁移
npx prisma migrate deploy
```

### 4. 权限问题

```bash
# Docker 权限问题 (Linux)
sudo usermod -aG docker $USER
newgrp docker

# PostgreSQL 权限问题
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE wchat_spider TO postgres;
\q
```

## 备份与恢复

### 备份数据库

```bash
# Docker 方式
docker exec wchat_spider_db pg_dump -U postgres wchat_spider > backup.sql

# 本地安装方式
pg_dump -U postgres wchat_spider > backup.sql
```

### 恢复数据库

```bash
# Docker 方式
docker exec -i wchat_spider_db psql -U postgres wchat_spider < backup.sql

# 本地安装方式
psql -U postgres wchat_spider < backup.sql
```

## 生产环境建议

1. **修改默认密码**: 在 `docker-compose.yml` 和 `.env` 中使用强密码
2. **配置持久化**: 数据已自动持久化到 Docker volume
3. **定期备份**: 设置定时任务备份数据库
4. **监控**: 使用 pgAdmin 或其他工具监控数据库性能
5. **优化配置**: 根据服务器资源调整 PostgreSQL 配置

## 数据库工具推荐

1. **Prisma Studio** (内置): `npx prisma studio`
2. **pgAdmin**: https://www.pgadmin.org/
3. **DBeaver**: https://dbeaver.io/
4. **TablePlus**: https://tableplus.com/
5. **DataGrip**: https://www.jetbrains.com/datagrip/

## 性能优化

### 索引优化

```sql
-- 查看慢查询
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- 添加索引
CREATE INDEX idx_articles_account_id ON articles(account_id);
CREATE INDEX idx_extraction_results_template_id ON extraction_results(template_id);
```

### 连接池配置

在 `backend/.env` 中配置连接池:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wchat_spider?schema=public&connection_limit=20"
```

