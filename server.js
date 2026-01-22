const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 设置信任代理，以便正确获取通过反向代理（如 Nginx）转发的用户 IP
app.set('trust proxy', 1);

// 中间件
app.use(cors());
app.use(express.json());

// Session配置
app.use(session({
  secret: process.env.SESSION_SECRET || 'mooday-secure-session-secret',
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: true, // 启用 HTTPS 安全 Cookie
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 默认 24 小时
  }
}));

// 静态文件服务 (CSS, JS, Images)
// 注意：现在 HTML 文件不在 public 中，而是在 views 中，由 routes/pages.js 处理
app.use(express.static(path.join(__dirname, 'public')));

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mooday',
  charset: 'utf8mb4',
  dateStrings: true // 强制返回字符串日期，避免时区转换问题
};

// 创建数据库连接池
let pool;
async function initDatabase() {
  try {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    // 测试连接
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();

    // 挂载 API 路由 - 需要数据库连接池
    // 注意：我们将 API 路由挂载在 /api 下
    // routes/api.js 里的路径已经去掉了 /api 前缀，所以这里挂载到 '/api'
    app.use('/api', require('./routes/api')(pool));
    console.log('✅ API 路由已挂载');

  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    process.exit(1);
  }
}

// 挂载页面路由
app.use('/', require('./routes/pages'));

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
async function startServer() {
  await initDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
    console.log(`📝 心情记录应用已启动 (工程化路由版)`);
  });
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  if (pool) {
    await pool.end();
  }
  process.exit(0);
});

startServer().catch(console.error);
