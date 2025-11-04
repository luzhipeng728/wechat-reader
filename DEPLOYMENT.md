# WeChat Spark 部署指南

## 1. 服务器环境要求

- Node.js 18+
- PostgreSQL 14+
- PM2 (进程管理器)
- Nginx (反向代理)

## 2. 安装依赖

### 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 安装 PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### 安装 PM2
```bash
sudo npm install -g pm2
```

### 安装 Nginx
```bash
sudo apt install nginx
```

## 3. 数据库配置

### 创建数据库和用户
```bash
sudo -u postgres psql

# 在 PostgreSQL 命令行中:
CREATE DATABASE wchat_spark;
CREATE USER wchat_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wchat_spark TO wchat_user;
\q
```

## 4. 后端部署

### 环境变量配置
在 `backend` 目录创建 `.env.production` 文件:

```env
# 数据库配置
DATABASE_URL="postgresql://wchat_user:your_secure_password@localhost:5432/wchat_spark?schema=public"

# JWT 配置
JWT_SECRET="your_jwt_secret_key_change_this_in_production"

# Claude API 配置
ANTHROPIC_API_KEY="your_anthropic_api_key"

# 环境
NODE_ENV=production

# 端口
PORT=3001
```

### 安装依赖和构建
```bash
cd /path/to/wchat_spark/backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 使用 PM2 启动后端
```bash
pm2 start dist/main.js --name wchat-backend
pm2 save
pm2 startup
```

## 5. 前端部署

### 环境变量配置
在 `frontend` 目录创建 `.env.production` 文件:

```env
NEXT_PUBLIC_API_URL=http://your-domain.com/api
```

### 安装依赖和构建
```bash
cd /path/to/wchat_spark/frontend
npm install
npm run build
```

### 使用 PM2 启动前端
```bash
pm2 start npm --name wchat-frontend -- start
pm2 save
```

## 6. Nginx 配置

创建 Nginx 配置文件 `/etc/nginx/sites-available/wchat-spark`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 后端 API
    location /api {
        rewrite ^/api/(.*) /$1 break;
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 增加超时时间,用于长时间运行的提取任务
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

### 启用配置并重启 Nginx
```bash
sudo ln -s /etc/nginx/sites-available/wchat-spark /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. SSL 证书配置 (可选但推荐)

使用 Let's Encrypt 免费 SSL 证书:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 8. 便捷启动脚本

在项目根目录创建启动脚本 (见 `start.sh` 和 `stop.sh`)

## 9. 常用 PM2 命令

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs wchat-backend
pm2 logs wchat-frontend

# 重启服务
pm2 restart wchat-backend
pm2 restart wchat-frontend

# 停止服务
pm2 stop wchat-backend
pm2 stop wchat-frontend

# 删除进程
pm2 delete wchat-backend
pm2 delete wchat-frontend

# 监控
pm2 monit
```

## 10. 注意事项

### 安全配置
1. **修改默认密码**: 务必修改 `.env.production` 中的数据库密码和 JWT_SECRET
2. **防火墙配置**: 只开放 80 和 443 端口,关闭 3000 和 3001 端口的外部访问
3. **定期更新**: 定期更新系统和依赖包

### 性能优化
1. **PostgreSQL 优化**: 根据服务器内存调整 PostgreSQL 配置
2. **PM2 集群模式**: 对于高负载场景,可以使用 PM2 的集群模式
3. **数据库索引**: 确保 Prisma 迁移包含了必要的索引

### 备份策略
1. **数据库备份**: 设置定期备份 PostgreSQL 数据库
```bash
# 创建备份脚本
sudo crontab -e
# 添加每天凌晨 2 点备份
0 2 * * * pg_dump wchat_spark > /backup/wchat_spark_$(date +\%Y\%m\%d).sql
```

2. **应用备份**: 定期备份 `.env` 文件和上传的文件

### 监控和日志
1. **日志轮转**: 配置 PM2 日志轮转
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

2. **监控告警**: 配置 PM2 Plus 或其他监控工具

### 故障恢复
1. **自动重启**: PM2 会自动重启崩溃的进程
2. **任务恢复**: 后端已实现自动恢复机制,重启后会自动继续未完成的任务

## 11. 首次部署检查清单

- [ ] 服务器环境安装完成 (Node.js, PostgreSQL, PM2, Nginx)
- [ ] 数据库创建并配置完成
- [ ] 后端 `.env.production` 配置正确
- [ ] 前端 `.env.production` 配置正确
- [ ] 后端依赖安装和构建完成
- [ ] 前端依赖安装和构建完成
- [ ] Prisma 迁移执行完成
- [ ] PM2 启动后端和前端
- [ ] Nginx 配置并重启
- [ ] SSL 证书配置 (如需要)
- [ ] 防火墙规则配置
- [ ] 访问测试通过
- [ ] 备份策略配置

## 12. 更新部署流程

当需要更新代码时:

```bash
# 1. 拉取最新代码
cd /path/to/wchat_spark
git pull

# 2. 更新后端
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart wchat-backend

# 3. 更新前端
cd ../frontend
npm install
npm run build
pm2 restart wchat-frontend

# 4. 查看日志确认启动成功
pm2 logs
```
