document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const showRegisterBtn = document.getElementById('showRegister');
  const showLoginBtn = document.getElementById('showLogin');
  const toast = document.getElementById('toast');
  const toastIcon = document.querySelector('.toast-icon');
  const toastMessage = document.querySelector('.toast-message');
  const forgotPasswordLink = document.getElementById('forgotPassword');
  
  const loginCaptchaImg = document.getElementById('loginCaptchaImg');
  const regCaptchaImg = document.getElementById('regCaptchaImg');

  // 刷新验证码
  function refreshCaptcha(imgElement) {
    if (!imgElement) return;
    
    // 防止重复点击
    if (imgElement.classList.contains('loading')) return;

    imgElement.classList.add('loading');
    
    // 加载完成后移除状态
    imgElement.onload = () => {
      imgElement.classList.remove('loading');
    };
    
    imgElement.onerror = () => {
      imgElement.classList.remove('loading');
      showToast('验证码加载失败', '⚠️');
    };

    imgElement.src = '/api/captcha?t=' + Date.now();
    // 清空输入框
    const input = imgElement.previousElementSibling;
    if (input) input.value = '';
  }

  // 初始加载
  refreshCaptcha(loginCaptchaImg);
  if(regCaptchaImg) regCaptchaImg.src = ''; // 避免抢占 Session

  // 点击图片刷新
  if(loginCaptchaImg) loginCaptchaImg.addEventListener('click', () => refreshCaptcha(loginCaptchaImg));
  if(regCaptchaImg) regCaptchaImg.addEventListener('click', () => refreshCaptcha(regCaptchaImg));

  // 密码显示/隐藏逻辑
  document.querySelectorAll('.toggle-password').forEach(button => {
    button.addEventListener('click', function() {
      const input = this.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        this.textContent = '🙈';
      } else {
        input.type = 'password';
        this.textContent = '👁️';
      }
    });
  });

  // 忘记密码点击
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('请联系管理员重置密码', 'ℹ️');
    });
  }

  // 切换表单
  showRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
    // document.querySelector('.title').textContent = '✨ 创建账号';
    refreshCaptcha(regCaptchaImg);
  });

  showLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
    // document.querySelector('.title').textContent = '🔐 欢迎回来';
    refreshCaptcha(loginCaptchaImg);
  });

  // 登录逻辑
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    const captcha = document.getElementById('loginCaptcha').value;
    const rememberMe = document.getElementById('loginRemember').checked;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha, rememberMe })
      });

      const data = await response.json();

      if (response.ok) {
        // 如果勾选了记住我，存入 localStorage (持久)
        // 否则存入 sessionStorage (浏览器关闭即失效)
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem('token', data.token);
        localStorage.setItem('username', data.username); // 用户名可以保持持久以方便下次输入

        showToast('登录成功！即将跳转...', '✅');
        setTimeout(() => {
          window.location.href = '/index'; 
        }, 1000);
      } else {
        showToast(data.message || '登录失败', '❌');
        refreshCaptcha(loginCaptchaImg); // 失败刷新
      }
    } catch (error) {
      showToast('网络错误，请稍后重试', '⚠️');
      refreshCaptcha(loginCaptchaImg);
    }
  });

  // 注册逻辑
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    const captcha = document.getElementById('regCaptcha').value;

    // 前端校验：用户名只能包含字母、数字、下划线，2-16位
    const usernameRegex = /^[a-zA-Z0-9_]{2,16}$/;
    if (!usernameRegex.test(username)) {
      showToast('用户名需2-16位字母、数字或下划线', '⚠️');
      return;
    }

    // 前端校验：密码6-24位字母或数字
    const passwordRegex = /^[a-zA-Z0-9]{6,24}$/;
    if (!passwordRegex.test(password)) {
      showToast('密码需6-24位字母或数字', '⚠️');
      return;
    }

    if (password !== confirmPassword) {
      showToast('两次输入的密码不一致', '⚠️');
      return;
    }

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captcha })
      });

      const data = await response.json();

      if (response.ok) {
        showToast('注册成功！请登录', '✅');
        setTimeout(() => {
          showLoginBtn.click();
        }, 1000);
      } else {
        showToast(data.message || '注册失败', '❌');
        refreshCaptcha(regCaptchaImg); // 失败刷新
      }
    } catch (error) {
      showToast('网络错误，请稍后重试', '⚠️');
      refreshCaptcha(regCaptchaImg);
    }
  });

  function showToast(message, icon = "💬") {
    if (toastIcon && toastMessage) {
      toastIcon.textContent = icon;
      toastMessage.textContent = message;
    } else {
      toast.textContent = `${icon} ${message}`;
    }
    
    toast.setAttribute('aria-hidden', 'false');

    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      toast.setAttribute('aria-hidden', 'true');
    }, 3000);
  }
});
