# PM2 进程管理器设置

## 方式一: 全局安装 PM2 (推荐)

### 好处
- ✅ 命令简洁: 直接使用 `pm2` 命令
- ✅ 所有项目共用
- ✅ 启动速度更快

### 安装方法

```bash
# 全局安装 PM2
npm install -g pm2

# 验证安装
pm2 --version
```

### 使用

```bash
# 启动服务
./start.sh

# 查看状态
pm2 list

# 查看日志
pm2 logs

# 停止服务
./stop.sh
```

## 方式二: 项目本地安装 PM2

### 好处
- ✅ 不污染全局环境
- ✅ 版本与项目绑定

### 安装方法

```bash
# 在项目根目录安装 PM2
npm install pm2

# 或者添加到 package.json
npm install --save pm2
```

### 使用

启动脚本已自动支持使用 `npx pm2`:

```bash
# 启动服务
./start.sh

# 查看状态
npx pm2 list

# 查看日志
npx pm2 logs

# 停止服务
./stop.sh
```

## 推荐: 全局安装 PM2

在服务器上,建议全局安装 PM2:

```bash
# 安装 PM2
npm install -g pm2

# 设置开机自启
pm2 startup

# 保存当前进程列表
pm2 save
```

## PM2 常用命令

### 进程管理

```bash
# 启动应用
pm2 start ecosystem.config.js

# 停止应用
pm2 stop ecosystem.config.js

# 重启应用
pm2 restart ecosystem.config.js

# 删除应用
pm2 delete ecosystem.config.js

# 查看所有进程
pm2 list

# 查看进程详情
pm2 show wchat-backend
```

### 日志管理

```bash
# 查看所有日志
pm2 logs

# 查看特定应用日志
pm2 logs wchat-backend

# 清空日志
pm2 flush

# 日志轮转
pm2 install pm2-logrotate
```

### 监控

```bash
# 实时监控
pm2 monit

# 查看资源使用
pm2 list --watch
```

### 自动重启

```bash
# 监听文件变化自动重启(开发环境)
pm2 start ecosystem.config.js --watch

# 内存超限自动重启
pm2 start ecosystem.config.js --max-memory-restart 1G
```

## 故障排查

### PM2 命令找不到

**问题**: `pm2: command not found`

**解决方案**:

1. **全局安装**:
   ```bash
   npm install -g pm2
   ```

2. **使用 npx** (如果已本地安装):
   ```bash
   npx pm2 list
   ```

3. **检查 PATH**:
   ```bash
   echo $PATH
   # 确保包含 npm 全局目录
   npm config get prefix
   ```

### 端口被占用

```bash
# 查看端口占用
lsof -i :4000
lsof -i :4001

# 杀死进程
pm2 delete all
# 或
kill -9 <PID>
```

### 进程启动失败

```bash
# 查看错误日志
pm2 logs wchat-backend --err
pm2 logs wchat-frontend --err

# 查看进程详情
pm2 show wchat-backend

# 重启进程
pm2 restart ecosystem.config.js
```

## 生产环境配置

### 开机自启

```bash
# 生成启动脚本
pm2 startup

# 保存当前进程列表
pm2 save

# 现在重启服务器,PM2 会自动启动应用
```

### 日志轮转

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 10M        # 单个日志文件最大 10MB
pm2 set pm2-logrotate:retain 7            # 保留 7 个历史文件
pm2 set pm2-logrotate:compress true       # 压缩旧日志
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # 每天凌晨轮转
```

### 集群模式

对于高负载场景,可以使用集群模式:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'wchat-backend',
      script: 'npm',
      args: 'run start:prod',
      instances: 'max',  // 使用所有 CPU 核心
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    }
  ]
};
```

## 其他进程管理工具

### Systemd (Linux 原生)

如果不想使用 PM2,也可以用 systemd:

```bash
# 创建服务文件
sudo nano /etc/systemd/system/wchat-backend.service

# 内容:
[Unit]
Description=WeChat Spider Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/project/backend
ExecStart=/usr/bin/npm run start:prod
Restart=on-failure

[Install]
WantedBy=multi-user.target

# 启动服务
sudo systemctl enable wchat-backend
sudo systemctl start wchat-backend
```

### Forever

```bash
# 安装
npm install -g forever

# 启动
forever start backend/dist/main.js

# 查看
forever list

# 停止
forever stop backend/dist/main.js
```

## 总结

- **开发环境**: 使用 `./start.sh` 脚本,支持 npx pm2
- **生产环境**: 全局安装 PM2,配置开机自启
- **Docker 部署**: 不需要 PM2,直接运行应用
