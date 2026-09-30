// hash-based router แบบง่าย — ไม่ต้องพึ่ง server สำหรับ sub-route ของ frontend
const router = {
  routes: {}, // '/reports' -> { render: fn, publicRoute: bool, roles: string[] | null }

  register(path, render, { publicRoute = false, roles = null } = {}) {
    router.routes[path] = { render, publicRoute, roles };
  },

  // หน้าแรกหลัง login — รายงานเปิดให้เฉพาะ admin, role อื่นเริ่มที่หน้าพันธุ์มะม่วง
  homePath() {
    return auth.hasRole('admin') ? '/reports' : '/varieties';
  },

  async resolve() {
    const hash = window.location.hash.replace(/^#/, '') || router.homePath();
    const path = hash.split('?')[0];
    const route = router.routes[path] || router.routes['/not-found'];
    const container = document.getElementById('app');

    if (!route.publicRoute && !auth.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }
    if (path === '/login' && auth.isLoggedIn()) {
      window.location.hash = `#${router.homePath()}`;
      return;
    }
    if (route.roles && !auth.hasRole(...route.roles)) {
      window.location.hash = `#${router.homePath()}`;
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
