# WeChat Spark 更新日志

## 2025-11-04 功能更新

### 1. API 代理转发配置 ✅
- **功能**: 前端所有 API 请求通过 Next.js 代理转发到后端,对外只暴露一个端口(4000)
- **修改文件**:
  - `frontend/next.config.js`: 配置 rewrites 规则,将 `/api/*` 转发到后端
  - `frontend/lib/api.ts`: API 基础 URL 改为相对路径 `/api`
- **好处**:
  - 生产环境只需开放前端端口
  - 避免跨域问题
  - 更安全的网络架构

### 2. PM2 进程管理配置 ✅
- **功能**: 使用 PM2 统一管理前后端服务
- **新增文件**:
  - `ecosystem.config.js`: PM2 配置文件,定义前后端服务
  - `start.sh`: 一键启动脚本
  - `stop.sh`: 一键停止脚本
- **使用方法**:
  ```bash
  # 启动服务
  ./start.sh

  # 停止服务
  ./stop.sh

  # 查看状态
  pm2 list

  # 查看日志
  pm2 logs

  # 重启服务
  pm2 restart ecosystem.config.js
  ```

### 3. 维度数据模糊搜索功能 ✅
- **功能**: 在维度数据页面添加实时搜索功能,输入关键词即可搜索所有提取的数据
- **修改文件**:
  - `frontend/app/dimensions/[id]/data/page.tsx`:
    - 添加搜索输入框
    - 实现输入防抖(500ms)自动触发搜索
    - 显示搜索结果数量
  - `backend/src/extractions/extractions.service.ts`:
    - `findByTemplate` 方法支持 keyword 参数
    - 在 extractedData JSON 字段中模糊匹配关键词
  - `backend/src/extractions/extractions.controller.ts`:
    - API 增加 keyword 查询参数
- **特性**:
  - 输入时自动触发搜索(500ms 防抖)
  - 支持搜索所有字段内容
  - 大小写不敏感
  - 显示匹配结果数量

### 4. 表格数据 Tooltip 提示优化 ✅
- **功能**: 鼠标悬停在被省略的数据上时,显示完整内容的提示框
- **修改文件**:
  - `frontend/app/dimensions/[id]/data/page.tsx`:
    - 使用 Ant Design Tooltip 组件包裹表格单元格
    - 添加 `cursor: help` 样式提示用户可悬停查看
- **效果**:
  - 当内容超过3行被省略时,鼠标悬停显示完整文本
  - 更好的用户体验

### 5. 部署文档 ✅
- **新增文件**: `DEPLOYMENT.md`
- **内容包括**:
  - 服务器环境要求
  - 数据库配置
  - 环境变量配置
  - Nginx 反向代理配置
  - SSL 证书配置
  - 常用运维命令
  - 备份和监控策略

## 技术架构

### 前端
- Next.js 14 (App Router)
- Ant Design
- Axios + API 代理

### 后端
- NestJS
- Prisma ORM
- PostgreSQL
- JWT 认证

### 部署
- PM2 进程管理
- Nginx 反向代理
- 前端端口: 4000
- 后端端口: 4001 (内部)

## 下一步计划

1. **性能优化**
   - 搜索功能使用数据库全文检索(PostgreSQL)
   - 添加搜索结果缓存
   - 优化大数据量加载

2. **功能增强**
   - 支持高级搜索(字段筛选)
   - 数据导出支持更多格式(Excel, PDF)
   - 添加数据可视化图表

3. **运维工具**
   - 添加健康检查接口
   - 集成监控告警
   - 自动化备份脚本

## 已知问题

暂无

## 测试说明

### 测试 API 代理
```bash
# 通过前端代理访问后端 API
curl http://localhost:4000/api/auth/test

# 应该返回后端的响应
```

### 测试搜索功能
1. 访问任意维度的数据页面
2. 在搜索框输入关键词
3. 查看搜索结果是否正确过滤

### 测试 PM2 服务
```bash
# 启动服务
./start.sh

# 查看状态(应该显示2个服务都是 online)
pm2 list

# 停止服务
./stop.sh
```

## 联系方式

如有问题,请提交 Issue 或联系开发团队。
