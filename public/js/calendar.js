console.log('Calendar.js loading...');

(function() {
  console.log('IIFE started');
  
  // 获取当前北京时间并设置为默认显示月份
  const beijingTime = new Date(new Date().getTime() + (8 * 60 * 60 * 1000));
  let currentDate = new Date(beijingTime.getFullYear(), beijingTime.getMonth(), beijingTime.getDate());
  console.log('🗓️ 北京时间初始化完成:');
  console.log('   年份:', currentDate.getFullYear());
  console.log('   月份:', currentDate.getMonth() + 1, '月');
  console.log('   日期:', currentDate.getDate());
  console.log('   完整日期:', currentDate.toString());
  
  let entries = {};
  let allStatuses = [];

  // DOM 元素变量声明
  let calendarEl, monthYearEl, prevBtn, nextBtn, modal, noticeBtn;
  let guestControls, userControls, usernameDisplay, logoutBtn;
  let changePwdBtn, pwdModal, closePwdModal, changePwdForm;
  let toast, toastIcon, toastMessage;
  let modalTimer = null; // 用于处理模态框内容清空的时序控制

  // 默认emoji池
  const defaultEmojis = ['📝', '📄', '📋', '📖', '📑', '🗓️'];

  // 中文月份
  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];

  // 中文星期
  const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

  // 初始化
  async function init() {
    // 初始化 DOM 元素
    calendarEl = document.getElementById('calendar');
    monthYearEl = document.getElementById('monthYear');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    modal = document.getElementById('detailModal');
    noticeBtn = document.getElementById('noticeBtn');

    // 其他 UI 元素初始化交由 script.js 处理

    // 检查登录状态 (使用全局函数)
    if (!window.checkAuth()) {
      // 如果未登录，跳转到登录页
      window.location.href = '/login';
      return;
    }

    console.log('🚀 初始化历史页面...');
    
    // 加载表情数据 (共享 allStatuses 变量)
    try {
      const resp = await fetch('/emoji.json');
      const data = await resp.json();
      allStatuses = [...data.moods, ...data.activities];
    } catch(err) { console.error(err); }

    createWeekdaysHeader();
    createLegend();
    await loadAndRenderCalendar();
    bindEvents();
  }

  // 创建星期标题
  function createWeekdaysHeader() {
    const weekdaysEl = document.querySelector('.weekdays');
    if (!weekdaysEl) return;

    weekdaysEl.innerHTML = weekdays.map(day => 
      `<div class="weekday">${day}</div>`
    ).join('');
  }

  // 创建图例
  function createLegend() {
    const legendEl = document.querySelector('.legend');
    if (!legendEl) return;
    legendEl.innerHTML = ''; // 清空旧图例
  }

  // 加载并渲染日历
  async function loadAndRenderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    
    console.log(`🔍 正在加载 ${year}年${month}月 的心情数据...`);
    
    try {
      // 添加时间戳防止 CDN/浏览器缓存导致的数据不更新
      const apiUrl = `/api/moods/${year}/${month}?t=${Date.now()}`;
      console.log(`� 请求URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: window.getAuthHeaders()
      });
      console.log(`� 响应状态: ${response.status}`);
      
      if (response.ok) {
        const rawData = await response.json();
        console.log('🎯 API返回数据:', rawData);
        
        // 处理数据
        entries = {};
        for (const key in rawData) {
          const data = rawData[key];
          // 宽松匹配：只要能转成数字就行
          const dayNum = parseInt(key);
          if (!isNaN(dayNum)) {
            entries[dayNum] = data;
          }
        }
      } else {
        console.log(`⚠️ API请求失败: ${response.status}`);
        if (response.status === 401 || response.status === 403) {
           window.showToast('登录已过期，请重新登录', '🔒');
           setTimeout(() => { window.location.href = '/login'; }, 1500);
           return;
        }
        entries = {};
      }
      
      renderCalendar();
    } catch (error) {
      console.error('❌ 加载心情数据失败:', error);
      entries = {};
      renderCalendar();
    }
  }

  // 渲染日历
  function renderCalendar() {
    if (!calendarEl || !monthYearEl) return;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    console.log(`🔄 开始渲染日历: ${year}年${month + 1}月`);
    console.log(`📊 当前entries对象:`, entries);
    
    // 更新月份年份显示
    monthYearEl.textContent = `${year}年${monthNames[month]}`;

    // 计算日历信息
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 转换为周一开始
    const daysInMonth = lastDay.getDate();
    
    console.log(`📅 月份信息: 第一天星期${firstDayOfWeek}, 本月共${daysInMonth}天`);

    // 清空日历
    calendarEl.innerHTML = '';

    let dayCount = 0;

    // 添加前置空白格子
    for (let i = 0; i < firstDayOfWeek; i++) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      calendarEl.appendChild(emptyDay);
      dayCount++;
    }

    // 添加本月日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dayEl = document.createElement('div');
      dayEl.className = 'day';
      
      // 构建日期字符串
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      // 查找心情记录
      const entry = entries[d];
      console.log(`🔍 第${d}天的数据:`, entry);
      
      // 日期数字
      const dayNumber = document.createElement('div');
      dayNumber.className = 'day-number';
      dayNumber.textContent = d;
      dayEl.appendChild(dayNumber);

      // emoji
      const emojiEl = document.createElement('div');
      emojiEl.className = 'day-emoji';
      
      if (entry) {
        console.log(`✨ 第${d}天有心情记录:`, entry);
        
        const statusItem = allStatuses.find(s => s.name === entry.mood);
        
        if (statusItem) {
          emojiEl.textContent = statusItem.emoji;
          dayEl.classList.add('has-entry');
          
          // 设置数据属性
          dayEl.setAttribute('data-date', dateStr);
          dayEl.setAttribute('data-mood', entry.mood);
          dayEl.setAttribute('data-content', entry.content || '');
          dayEl.setAttribute('data-created-at', entry.created_at || '');
          dayEl.style.cursor = 'pointer';
          
          console.log(`🎭 第${d}天显示: ${statusItem.emoji} (${entry.mood})`);
        } else {
          console.log(`❓ 第${d}天心情格式未识别: ${entry.mood}`);
          emojiEl.textContent = '❓';
        }
      } else {
        // 无心情记录
        const defaultEmoji = defaultEmojis[d % defaultEmojis.length];
        emojiEl.textContent = defaultEmoji;
        dayEl.classList.add('no-entry');
        console.log(`📝 第${d}天无记录，显示默认: ${defaultEmoji}`);
      }
      
      dayEl.appendChild(emojiEl);
      calendarEl.appendChild(dayEl);
      dayCount++;
    }

    // 填充剩余格子以补齐最后一行
    while (dayCount % 7 !== 0) {
      const emptyDay = document.createElement('div');
      emptyDay.className = 'day empty';
      calendarEl.appendChild(emptyDay);
      dayCount++;
    }

    console.log(`✅ 日历渲染完成，共${dayCount}个格子`);
  }

  // 绑定事件
  function bindEvents() {
    // 基础导航与公告逻辑已由 script.js 处理
    
    // 上一月
    if (prevBtn) {
      prevBtn.addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        await loadAndRenderCalendar();
      });
    }

    // 下一月
    if (nextBtn) {
      nextBtn.addEventListener('click', async () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        await loadAndRenderCalendar();
      });
    }

    // 日期点击事件
    if (calendarEl) {
      calendarEl.addEventListener('click', (e) => {
        console.log('🖱️ 日历被点击, 目标:', e.target);
        
        const dayEl = e.target.closest('.day');
        console.log('📅 找到日期元素:', dayEl);
        
        if (!dayEl) {
          console.log('❌ 未找到.day元素');
          return;
        }
        
        if (dayEl.dataset && dayEl.dataset.date && dayEl.dataset.mood) {
          console.log('✅ 找到心情数据:', {
            date: dayEl.dataset.date,
            mood: dayEl.dataset.mood,
            content: dayEl.dataset.content
          });
          
          const dateStr = dayEl.dataset.date;
          const entry = {
            mood: dayEl.dataset.mood,
            content: dayEl.dataset.content || '',
            created_at: dayEl.dataset.createdAt || dayEl.dataset.created_at || ''
          };
          
          showDetail(dateStr, entry);
        } else {
          console.log('⚠️ 这一天没有心情数据');
        }
      });
    }

    // 模态框关闭事件
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal();
        }
      });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  }

  // 显示详情模态框
  function showDetail(dateStr, entry) {
    if (!modal) {
      console.error('❌ 模态框元素未找到');
      return;
    }

    console.log('🚀 显示详情:', { dateStr, entry });
    
    let statusItem = allStatuses.find(s => s.name === entry.mood);
    if (!statusItem) {
      const oldMap = { 
        'low': 'emo', 'medium': '平静', 'high': '开心',
        1: 'emo', 2: '平静', 3: '开心'
      };
      const newName = oldMap[entry.mood] || entry.mood;
      statusItem = allStatuses.find(s => s.name === newName);
    }
    
    if (!statusItem) {
      statusItem = { name: entry.mood, emoji: '❓' };
    }
    
    // 解析日期
    const dateParts = dateStr.split('-');
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]);
    const day = parseInt(dateParts[2]);
    const dateDisplay = `${year}年${month}月${day}日`;

    // 格式化创建时间 (精确到分钟)
    let timeDisplay = "";
    if (entry.created_at) {
      try {
        const createDate = new Date(entry.created_at);
        const hours = String(createDate.getHours()).padStart(2, '0');
        const minutes = String(createDate.getMinutes()).padStart(2, '0');
        timeDisplay = `<div class="creation-time">记录时间 ${hours}:${minutes}</div>`;
      } catch (e) {
        console.error("时间解析失败:", e);
      }
    }
    
    const modalInner = modal.querySelector('.modal-inner');
    if (!modalInner) {
      console.error('❌ 模态框内容元素未找到');
      return;
    }
    
    // 如果有正在进行的关闭定时器，立即清除
    if (modalTimer) {
      clearTimeout(modalTimer);
      modalTimer = null;
    }

    // 处理 Markdown 渲染
    let renderedContent = '（这一天没有写下什么...）';
    if (entry.content) {
      try {
        // 使用 marked 解析 Markdown，再用 DOMPurify 清洗
        const rawHtml = marked.parse(entry.content);
        renderedContent = DOMPurify.sanitize(rawHtml);
      } catch (e) {
        console.error("Markdown 解析失败:", e);
        renderedContent = entry.content.replace(/\n/g, '<br>');
      }
    }
    
    modalInner.innerHTML = `
      <button class="modal-close" onclick="closeModal()">×</button>
      <div class="modal-header">
        <div class="date-subtitle">${dateDisplay}</div>
        <div class="modal-mood-badge">
          <span>${statusItem.emoji}</span> <span>${statusItem.name}</span>
        </div>
        ${timeDisplay}
      </div>
      <div class="modal-body">
        <div class="modal-content-box markdown-body">${renderedContent}</div>
      </div>
    `;
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    console.log('✅ 模态框已显示');
  }

  // 关闭模态框
  function closeModal() {
    if (!modal) return;
    
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    
    // 清除之前的定时器（防止连击）
    if (modalTimer) clearTimeout(modalTimer);
    
    modalTimer = setTimeout(() => {
      const modalInner = modal.querySelector('.modal-inner');
      if (modalInner) {
        modalInner.innerHTML = '';
      }
      modalTimer = null;
    }, 400); // 匹配 CSS 过渡时间
  }

  // 全局函数供HTML调用
  window.closeModal = closeModal;

  // 页面加载完成后初始化
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM加载完成，开始初始化...');
    init();
  });

})();

console.log('✅ History.js 加载完成');