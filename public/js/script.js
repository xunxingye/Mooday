// 核心业务逻辑 - script.js

// --- 1. 立即定义并暴露全局函数 ---
window.showToast = function(message, icon = "💬") {
    const t = document.getElementById("toast");
    const ti = document.querySelector(".toast-icon");
    const tm = document.querySelector(".toast-message");
    if (!t) return;
    if (ti && tm) {
        ti.textContent = icon;
        tm.textContent = message;
    } else {
        t.textContent = `${icon} ${message}`;
    }
    t.setAttribute('aria-hidden', 'false');
    if (t.timer) clearTimeout(t.timer);
    t.timer = setTimeout(() => t.setAttribute('aria-hidden', 'true'), 3000);
};

window.checkAuth = function() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const username = localStorage.getItem('username');
    const gc = document.getElementById('guestControls');
    const uc = document.getElementById('userControls');
    const ud = document.getElementById('usernameDisplay');
    if (token && username) {
        if (gc) gc.style.display = 'none';
        if (uc) uc.style.display = 'block';
        if (ud) ud.textContent = username;
        return true;
    } else {
        if (gc) gc.style.display = 'block';
        if (uc) uc.style.display = 'none';
        return false;
    }
};

window.getAuthHeaders = function() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

window.loadNotices = async function() {
    const nl = document.getElementById("noticeList");
    if (!nl) return;
    nl.innerHTML = '<div class="notice-loading">正在获取最新消息...</div>';
    try {
        const response = await fetch('/notice.json?t=' + Date.now());
        if (!response.ok) throw new Error();
        const notices = await response.json();
        const sorted = notices.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
        if (sorted.length === 0) {
            nl.innerHTML = '<div class="notice-loading">暂无公告</div>';
            return;
        }
        nl.innerHTML = sorted.map((n, idx) => `
            <div class="notice-item" style="animation-delay: ${idx * 0.1}s">
                <div class="notice-date">${n.date}</div>
                <div class="notice-content">${(n.content || '').replace(/\n/g, '<br>')}</div>
            </div>
        `).join('') + '<div class="notice-loading">最多显示20条内容</div>';
    } catch (err) {
        nl.innerHTML = '<div class="notice-loading">公告加载失败</div>';
    }
};

// --- 2. 页面加载后的逻辑 ---
document.addEventListener("DOMContentLoaded", () => {
    // DOM 元素引用
    const elements = {
        diary: document.getElementById("diary"),
        noticeBtn: document.getElementById("noticeBtn"),
        noticeModal: document.getElementById("noticeModal"),
        closeNoticeModal: document.getElementById("closeNoticeModal"),
        logoutBtn: document.getElementById('logoutBtn'),
        changePwdBtn: document.getElementById('changePwdBtn'),
        pwdModal: document.getElementById('pwdModal'),
        closePwdModal: document.getElementById('closePwdModal'),
        changePwdForm: document.getElementById('changePwdForm'),
        pwdCaptcha: document.getElementById('pwdCaptcha'),
        pwdCaptchaImg: document.getElementById('pwdCaptchaImg'),
        userControls: document.getElementById('userControls'),
        charCount: document.getElementById("charCount"),
        saveBtn: document.getElementById("saveBtn"),
        calendarBtn: document.getElementById("calendarBtn"),
        statusToggleBtn: document.getElementById("statusToggleBtn"),
        statusPicker: document.getElementById("statusPicker")
    };

    let easyMDE = null;

    // 初始化 EasyMDE (仅主页)
    if (elements.diary) {
        easyMDE = new EasyMDE({
            element: elements.diary,
            spellChecker: false,
            autosave: { enabled: false },
            status: false,
            placeholder: "今天的心情如何？",
            toolbar: ["bold", "italic", "heading", "|", "quote", "code", "unordered-list", "ordered-list", "|", "preview"],
            minHeight: "180px",
        });

        easyMDE.codemirror.on("change", () => {
            if (elements.charCount) {
                const count = easyMDE.value().length;
                elements.charCount.textContent = count;
                elements.charCount.style.color = count > 750 ? '#ef4444' : (count > 600 ? '#fbbf24' : '');
            }
        });

        // 预览模式背景处理
        const toolbar = easyMDE.gui.toolbar;
        if (toolbar) {
            const previewBtn = toolbar.querySelector(".fa-eye")?.closest("button");
            if (previewBtn) {
                previewBtn.addEventListener("click", () => {
                    setTimeout(() => {
                        const wrapper = elements.diary.closest(".diary-wrapper");
                        if (wrapper) {
                            if (easyMDE.isPreviewActive()) wrapper.classList.add("preview-mode");
                            else wrapper.classList.remove("preview-mode");
                        }
                    }, 50);
                });
            }
        }
    }

    // --- 公共交互事件绑定 ---

    // 公告弹窗
    if (elements.noticeBtn && elements.noticeModal) {
        elements.noticeBtn.addEventListener("click", (e) => {
            e.preventDefault();
            elements.noticeModal.setAttribute('aria-hidden', 'false');
            window.loadNotices();
        });
        if (elements.closeNoticeModal) {
            elements.closeNoticeModal.addEventListener("click", () => {
                elements.noticeModal.setAttribute('aria-hidden', 'true');
            });
        }
        elements.noticeModal.addEventListener("click", (e) => {
            if (e.target === elements.noticeModal) elements.noticeModal.setAttribute('aria-hidden', 'true');
        });
    }

    // 修改密码弹窗
    if (elements.changePwdBtn && elements.pwdModal) {
        const refreshPwdCaptcha = () => {
            if (elements.pwdCaptchaImg) {
                elements.pwdCaptchaImg.src = '/api/captcha?t=' + Date.now();
            }
        };

        elements.changePwdBtn.addEventListener('click', (e) => {
            e.preventDefault();
            elements.pwdModal.setAttribute('aria-hidden', 'false');
            refreshPwdCaptcha();
        });
        if (elements.closePwdModal) {
            elements.closePwdModal.addEventListener('click', () => {
                elements.pwdModal.setAttribute('aria-hidden', 'true');
            });
        }
        elements.pwdModal.addEventListener('click', (e) => {
            if (e.target === elements.pwdModal) elements.pwdModal.setAttribute('aria-hidden', 'true');
        });
        if (elements.pwdCaptchaImg) {
            elements.pwdCaptchaImg.addEventListener('click', refreshPwdCaptcha);
        }
        if (elements.changePwdForm) {
            elements.changePwdForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const oldPassword = document.getElementById('oldPassword').value;
                const newPassword = document.getElementById('newPassword').value;
                const confirmNewPassword = document.getElementById('confirmNewPassword').value;
                const captcha = elements.pwdCaptcha ? elements.pwdCaptcha.value.trim() : '';
                if (newPassword !== confirmNewPassword) {
                    window.showToast('两次密码输入不一致', '⚠️');
                    return;
                }
                if (!captcha) {
                    window.showToast('请输入验证码', '⚠️');
                    return;
                }
                try {
                    const response = await fetch('/api/user/password', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
                        body: JSON.stringify({ oldPassword, newPassword, captcha })
                    });
                    const data = await response.json();
                    if (response.ok) {
                        window.showToast('密码修改成功，请重新登录', '✅');
                        elements.pwdModal.setAttribute('aria-hidden', 'true');
                        elements.changePwdForm.reset();
                        setTimeout(() => { if (elements.logoutBtn) elements.logoutBtn.click(); }, 1500);
                    } else {
                        window.showToast(data.message || '修改失败', '❌');
                    }
                } catch (error) { window.showToast('网络连接失败', '⚠️'); }
                finally { refreshPwdCaptcha(); }
            });
        }
    }

    // 用户下拉菜单
    if (elements.userControls) {
        const userTrigger = elements.userControls.querySelector('.user-trigger');
        if (userTrigger) {
            userTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.userControls.classList.toggle('active');
            });
        }
        document.addEventListener('click', (e) => {
            if (elements.userControls.classList.contains('active') && !elements.userControls.contains(e.target)) {
                elements.userControls.classList.remove('active');
            }
        });
    }

    // 登出按钮
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            sessionStorage.removeItem('token');
            localStorage.removeItem('username');
            window.location.reload();
        });
    }

    // 跳转日历
    if (elements.calendarBtn) {
        elements.calendarBtn.addEventListener("click", () => {
            window.showToast("正在前往历史见证...", "📅");
            setTimeout(() => { window.location.href = "/calendar"; }, 500);
        });
    }

    // --- 主页专属逻辑 ---
    if (elements.diary) {
        let selectedMood = null;
        let allStatuses = [];

        if (elements.statusToggleBtn && elements.statusPicker) {
            elements.statusToggleBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                const isVisible = elements.statusPicker.classList.contains("active");
                if (isVisible) {
                    elements.statusPicker.classList.remove("active");
                    setTimeout(() => { if (!elements.statusPicker.classList.contains("active")) elements.statusPicker.style.display = "none"; }, 400);
                } else {
                    elements.statusPicker.style.display = "flex";
                    setTimeout(() => elements.statusPicker.classList.add("active"), 10);
                }
                const arrow = elements.statusToggleBtn.querySelector(".toggle-arrow");
                if (arrow) arrow.textContent = isVisible ? "展开" : "收起";
            });

            document.addEventListener("click", (e) => {
                if (elements.statusPicker.classList.contains("active") && !elements.statusPicker.contains(e.target) && e.target !== elements.statusToggleBtn) {
                    elements.statusPicker.classList.remove("active");
                    setTimeout(() => { if (!elements.statusPicker.classList.contains("active")) elements.statusPicker.style.display = "none"; }, 400);
                    const arrow = elements.statusToggleBtn.querySelector(".toggle-arrow");
                    if (arrow) arrow.textContent = "展开";
                }
            });
        }

        async function loadEmojis() {
            try {
                const response = await fetch('/emoji.json');
                const data = await response.json();
                allStatuses = [...data.moods, ...data.activities];
                renderPickerItems(data.moods, document.getElementById("moodPickerGrid"));
                renderPickerItems(data.activities, document.getElementById("activityPickerGrid"));
            } catch (error) { console.error('Emoji failed:', error); }
        }

        function renderPickerItems(items, container) {
            if (!container) return;
            container.innerHTML = '';
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'picker-item';
                div.innerHTML = `<span class="picker-emoji">${item.emoji}</span><span class="picker-label">${item.name}</span>`;
                div.addEventListener('click', () => {
                    selectedMood = item.name;
                    const icon = document.querySelector(".status-icon");
                    const ph = document.querySelector(".status-placeholder");
                    const label = document.querySelector(".status-selected-label");
                    if (icon) icon.textContent = item.emoji;
                    if (ph) ph.style.display = 'none';
                    if (label) { label.style.display = 'block'; label.textContent = item.name; }
                    elements.statusPicker.classList.remove('active');
                    setTimeout(() => { if (!elements.statusPicker.classList.contains("active")) elements.statusPicker.style.display = "none"; }, 400);
                    const arrow = elements.statusToggleBtn.querySelector(".toggle-arrow");
                    if (arrow) arrow.textContent = "展开";
                    window.showToast(`${item.emoji} 已选择：${item.name}`, "✨");
                });
                container.appendChild(div);
            });
        }

        async function loadDynamicTexts() {
            try {
                const response = await fetch('/text.json?t=' + Date.now());
                const data = await response.json();
                const phs = data.plackholder || data.placeholder;
                if (phs && phs.length > 0 && easyMDE) {
                    const rand = phs[Math.floor(Math.random() * phs.length)];
                    easyMDE.codemirror.setOption("placeholder", rand.text);
                }
                const subs = data.subtitle;
                if (subs && subs.length > 0) {
                    const subEl = document.querySelector('.subtitle');
                    if (subEl) {
                        const randSub = subs[Math.floor(Math.random() * subs.length)];
                        subEl.innerHTML = randSub.text.replace(/{{high}}/g, '<span>').replace(/{{\/high}}/g, '</span>');
                    }
                }
            } catch (error) {}
        }

        async function loadTodayMood() {
            const todayDate = new Date().getFullYear() + '-' +
                String(new Date().getMonth() + 1).padStart(2, '0') + '-' +
                String(new Date().getDate()).padStart(2, '0');
            try {
                const response = await fetch(`/api/mood/${todayDate}?t=${Date.now()}`, {
                    headers: window.getAuthHeaders()
                });
                if (response.ok) {
                    const moodData = await response.json();
                    if (moodData.mood) {
                        const statusItems = document.querySelectorAll('.picker-item');
                        statusItems.forEach(el => {
                            if (el.querySelector('.picker-label').textContent === moodData.mood) {
                                el.click();
                            }
                        });
                    }
                }
            } catch (error) {}
        }

        if (elements.saveBtn) {
            elements.saveBtn.addEventListener("click", async () => {
                const text = easyMDE.value().trim();
                if (!text) { window.showToast("这一刻，想写点什么吗？", "📝"); return; }
                if (!selectedMood) { window.showToast("给今天选个心情吧", "😊"); return; }
                if (!localStorage.getItem('token')) {
                    window.showToast("请先登录", "🔒");
                    setTimeout(() => window.location.href = '/login', 1000);
                    return;
                }
                elements.saveBtn.disabled = true;
                const oldText = elements.saveBtn.innerHTML;
                elements.saveBtn.innerHTML = '<span>保存中...</span>';
                try {
                    const response = await fetch('/api/mood', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...window.getAuthHeaders() },
                        body: JSON.stringify({ content: text, mood: selectedMood })
                    });
                    if (response.ok) {
                        window.showToast("记录成功！✨", "✅");
                    } else throw new Error();
                } catch (error) { window.showToast("保存失败", "❌"); }
                finally { elements.saveBtn.disabled = false; elements.saveBtn.innerHTML = oldText; }
            });
        }

        loadEmojis();
        loadDynamicTexts();
        if (window.checkAuth()) loadTodayMood();
    }

    // 权限初始化
    window.checkAuth();
});

