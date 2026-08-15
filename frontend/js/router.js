// hash-based router แบบง่าย — ไม่ต้องพึ่ง server สำหรับ sub-route ของ frontend
const router = {
  routes: {}, // '/dashboard' -> { render: fn, public: bool }

  register(path, render, { publicRoute = false } = {}) {
    router.routes[path] = { render, publicRoute };
  },

  async resolve() {
    const hash = window.location.hash.replace(/^#/, '') || '/dashboard';
    const path = hash.split('?')[0];
    const route = router.routes[path] || router.routes['/not-found'];
    const container = document.getElementById('app');

    if (!route.publicRoute && !auth.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }
    if (path === '/login' && auth.isLoggedIn()) {
      window.location.hash = '#/dashboard';
      return;
    }

    renderNav();
    container.innerHTML = '<p class="loading">กำลังโหลด...</p>';
    try {
      await route.render(container, hash);
    } catch (err) {
      container.innerHTML = `<p class="error">${err.message}</p>`;
    }
  },

  start() {
    window.addEventListener('hashchange', router.resolve);
    router.resolve();
  },

  param(key) {
    const [, query] = window.location.hash.split('?');
    return new URLSearchParams(query || '').get(key);
  },
};
