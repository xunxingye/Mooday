const express = require('express');
const router = express.Router();
const path = require('path');

// 强制重定向中间件：如果请求带 .html 后缀，重定向到无后缀 URL
router.use((req, res, next) => {
  if (req.path.endsWith('.html')) {
    const newPath = req.path.slice(0, -5);
    return res.redirect(301, newPath);
  }
  next();
});

// 日历页面 (Calendar) - 包含特定的缓存控制
// 对应原 /calendar 及 /calendar.html
router.get('/calendar', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  res.sendFile(path.join(__dirname, '../views', 'calendar.html'));
});

// 登录页面
// 对应原 /login 及 /login.html
router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'login.html'));
});

// 首页
// 对应原 /, /index, /index.html
router.get(['/', '/index'], (req, res) => {
  res.sendFile(path.join(__dirname, '../views', 'index.html'));
});

// 404 处理 (可选，如果找不到页面返回首页或特定404页)
// router.get('*', (req, res) => {
//   res.status(404).sendFile(path.join(__dirname, '../views', '404.html'));
// });

module.exports = router;
