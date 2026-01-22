(function() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 跨标签页/窗口同步主题
  window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
      const newTheme = e.newValue;
      document.documentElement.setAttribute('data-theme', newTheme);
      // 如果 DOM 已加载，尝试更新按钮图标
      const btn = document.getElementById('themeToggle');
      if (btn) btn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    // 更新按钮文字/图标（可选）
    const updateToggleIcon = (theme) => {
      themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    };

    updateToggleIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateToggleIcon(newTheme);
    });
  });
})();
