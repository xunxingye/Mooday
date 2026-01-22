const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const svgCaptcha = require('svg-captcha');

// 验证码请求频率限制
const captchaRateLimit = new Map();
// 简单的清理机制: 每5分钟清理一次过期IP
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of captchaRateLimit.entries()) {
    if (now > data.expiry) {
      captchaRateLimit.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

  if (!token) return res.status(401).json({ message: '未登录' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token无效或已过期' });
    req.user = user;
    next();
  });
};

module.exports = (pool) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

  // 获取验证码
  router.get('/captcha', (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();
    
    // 频率限制逻辑
    let limitData = captchaRateLimit.get(ip);
    if (!limitData || now > limitData.expiry) {
      // 初始化或重置: 1分钟有效期
      limitData = { count: 0, expiry: now + 60 * 1000 };
    }
    
    // 放宽限制：每分钟允许 30 次请求
    if (limitData.count >= 30) {
      return res.status(429).json({ message: '请求过于频繁，请稍后再试' });
    }
    
    limitData.count++;
    captchaRateLimit.set(ip, limitData);

    // 生成验证码
    const captcha = svgCaptcha.create({
      size: 4,
      ignoreChars: '0o1i', // 排除易混淆字符
      noise: 1, // 减少噪声，提高加载和渲染速度
      color: true,
      background: '#f0f0f0', // 更明亮的背景，降低渲染负担
      width: 120,
      height: 48
    });
    
    // 存入 Session (忽略大小写)
    req.session.captcha = captcha.text.toLowerCase();
    
    res.type('svg');
    res.status(200).send(captcha.data);
  });

  // 注册
  router.post('/register', async (req, res) => {
    try {
      const { username, password, captcha } = req.body;
      
      // 验证码校验
      if (!captcha) return res.status(400).json({ message: '请输入验证码' });
      if (!req.session.captcha) return res.status(400).json({ message: '验证码已过期，请刷新' });
      
      if (captcha.toLowerCase() !== req.session.captcha) {
        req.session.captcha = null; // 验证失败也销毁，防止暴力破解
        return res.status(400).json({ message: '验证码错误' });
      }
      // 验证成功，立即销毁
      req.session.captcha = null;

      if (!username || !password) return res.status(400).json({ message: '用户名和密码不能为空' });

      // 用户名校验：只能包含字母、数字、下划线，限制长度2-16个字符
      const usernameRegex = /^[a-zA-Z0-9_]{2,16}$/;
      if (!usernameRegex.test(username)) {
        return res.status(400).json({ message: '用户名只能包含字母、数字、下划线，长度2-16位' });
      }

      // 密码校验：必须是6-24位的字母或数字
      const passwordRegex = /^[a-zA-Z0-9]{6,24}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ message: '密码只能包含字母或数字，长度6-24位' });
      }

      // 不允许存在名字相同但大小写不同的用户 (不区分大小写检查)
      const [existing] = await pool.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
      if (existing.length > 0) return res.status(400).json({ message: '用户名已存在' });

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword]);

      res.status(201).json({ message: '注册成功' });
    } catch (error) {
      console.error('注册失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  });

  // 登录
  router.post('/login', async (req, res) => {
    try {
      const { username, password, captcha, rememberMe } = req.body;
      
      // 验证码校验
      if (!captcha) return res.status(400).json({ message: '请输入验证码' });
      if (!req.session.captcha) return res.status(400).json({ message: '验证码已过期，请刷新' });
      
      if (captcha.toLowerCase() !== req.session.captcha) {
        req.session.captcha = null; 
        return res.status(400).json({ message: '验证码错误' });
      }
      req.session.captcha = null;

      const [users] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
      const user = users[0];

      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ message: '用户名或密码错误' });
      }

      // 设置登录有效期：记住我则7天，否则24小时
      const expiresIn = rememberMe ? '7d' : '24h';
      
      // 同步更新 session cookie 的有效期（如果需要 session 维持状态）
      if (rememberMe) {
        req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
      } else {
        // 设置为浏览器关闭即失效 (Session Cookie)
        req.session.cookie.expires = false;
      }

      const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn });
      res.json({ token, username: user.username });
    } catch (error) {
      console.error('登录失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  });

  // 修改密码
  router.put('/user/password', authenticateToken, async (req, res) => {
    try {
      const { oldPassword, newPassword, captcha } = req.body;
      const userId = req.user.id;

      if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: '请提供旧密码和新密码' });
      }

      // 验证码校验
      if (!captcha) return res.status(400).json({ message: '请输入验证码' });
      if (!req.session.captcha) return res.status(400).json({ message: '验证码已过期，请刷新' });
      if (captcha.toLowerCase() !== req.session.captcha) {
        req.session.captcha = null;
        return res.status(400).json({ message: '验证码错误' });
      }
      req.session.captcha = null;

      const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]);
      const user = users[0];

      if (!user) return res.status(404).json({ message: '用户不存在' });

      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ message: '旧密码错误' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

      res.json({ message: '密码修改成功' });
    } catch (error) {
      console.error('修改密码失败:', error);
      res.status(500).json({ message: '服务器错误' });
    }
  });

  // 获取指定日期的心情记录
  router.get('/mood/:date', authenticateToken, async (req, res) => {
    try {
      const { date } = req.params;
      const userId = req.user.id;
      
      const [rows] = await pool.execute(
        'SELECT * FROM data WHERE date = ? AND user_id = ?',
        [date, userId]
      );
      
      if (rows.length > 0) {
        res.json(rows[0]);
      } else {
        res.status(404).json({ message: '未找到该日期的记录' });
      }
    } catch (error) {
      console.error('获取心情记录失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 保存或更新心情记录
  router.post('/mood', authenticateToken, async (req, res) => {
    try {
      const { content, mood } = req.body;
      const userId = req.user.id;
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const date = `${year}-${month}-${day}`;
      
      console.log('服务器获取的北京日期:', date);
      console.log('收到保存请求:', { date, content, mood });
      
      if (!content || !mood) {
        return res.status(400).json({ error: '缺少必要参数' });
      }

      const moodValue = mood;
      
      const [existing] = await pool.execute(
        'SELECT id FROM data WHERE date = ? AND user_id = ?',
        [date, userId]
      );
      
      if (existing.length > 0) {
        console.log('更新现有记录:', date);
        await pool.execute(
          'UPDATE data SET content = ?, mood = ?, updated_at = NOW() WHERE date = ? AND user_id = ?',
          [content, moodValue, date, userId]
        );
      } else {
        console.log('创建新记录:', date);
        await pool.execute(
          'INSERT INTO data (user_id, date, content, mood, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
          [userId, date, content, moodValue]
        );
      }
      
      console.log('保存成功');
      res.json({ success: true, message: '心情记录保存成功' });
    } catch (error) {
      console.error('保存心情记录失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 获取指定年月的所有心情记录
  router.get('/moods/:year/:month', authenticateToken, async (req, res) => {
    try {
      const { year, month } = req.params;
      const userId = req.user.id;
      
      console.log(`获取心情记录: ${year}-${month}`);
      
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const daysInMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month.padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      
      console.log(`日期范围: ${startDate} 到 ${endDate}`);
      
      const [rows] = await pool.execute(
        'SELECT * FROM data WHERE date >= ? AND date <= ? AND user_id = ? ORDER BY date',
        [startDate, endDate, userId]
      );
      
      console.log(`找到 ${rows.length} 条记录`);
      
      const moodData = {};
      rows.forEach(record => {
        let dateStr;
        if (typeof record.date === 'string') {
          dateStr = record.date.substring(0, 10);
        } else {
          const d = new Date(record.date);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
        
        const day = parseInt(dateStr.split('-')[2]);
        moodData[day] = {
          content: record.content,
          mood: record.mood,
          date: dateStr,
          created_at: record.created_at
        };
      });
      
      console.log('返回数据:', moodData);
      res.json(moodData);
    } catch (error) {
      console.error('获取月度心情记录失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  // 删除心情记录
  router.delete('/mood/:date', authenticateToken, async (req, res) => {
    try {
      const { date } = req.params;
      const userId = req.user.id;
      
      const [result] = await pool.execute(
        'DELETE FROM data WHERE date = ? AND user_id = ?',
        [date, userId]
      );
      
      if (result.affectedRows > 0) {
        res.json({ success: true, message: '记录删除成功' });
      } else {
        res.status(404).json({ error: '未找到该记录' });
      }
    } catch (error) {
      console.error('删除心情记录失败:', error);
      res.status(500).json({ error: '服务器错误' });
    }
  });

  return router;
};
