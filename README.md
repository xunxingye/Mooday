# Mooday

Mooday 是一个轻量级的个人日志/心情记录与日历展示 Web 应用，基于 Node.js + Express，使用 MySQL 存储数据，前端使用原生 JavaScript 和 EasyMDE 富文本编辑器。

## 主要功能（目前）
- 日志（带富文本编辑/预览）
- 心情/日记按天保存与日历展示
- 公告/通知展示（支持多行）
- 修改密码带验证码（防刷）
- 简单的用户认证与 API（JWT + session）

## 技术栈
- 后端：Node.js，Express
- 数据库：MySQL（mariaDB）
- 前端：Vanilla JS，EasyMDE，少量 CSS
- 进程管理：PM2（部署时推荐）

## 环境与依赖
请确保系统已安装：
- Node.js (>=16 推荐)
- npm / yarn
- MySQL

在项目根目录执行：

```bash
npm install
```

## 环境变量（示例）
在项目根目录创建 `.env` 或通过环境变量导出：

- `DB_HOST` - 数据库主机
- `DB_PORT` - 数据库端口（默认 3306）
- `DB_USER` - 数据库用户名
- `DB_PASS` - 数据库密码
- `DB_NAME` - 数据库名
- `SESSION_SECRET` - express-session 的密钥
- `JWT_SECRET` - JWT 签名密钥
- `PORT` - 应用监听端口（默认 3000）

## 初始化数据库
请手动创建数据库并保证用户有相应权限。根据项目需要，创建必要表结构（示例略）。如果你有现成的 SQL 文件，请导入：

```bash
mysql -u root -p your_database < database/init.sql
```


生产环境建议使用 PM2：
## 部署（简要）
1. 将代码部署到服务器，安装依赖并配置环境变量
2. 使用 PM2 启动并设置自启动：

```bash
pm2 start ecosystem.config.js --name mooday
```