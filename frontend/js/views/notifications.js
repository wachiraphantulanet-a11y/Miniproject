// การแจ้งเตือนในระบบ (in-app notification) — bell icon ใน topbar, poll ทุก 30 วินาที
// backend: GET/POST /api/notifications (ดู README หัวข้อ Notification)

const notificationState = {
  items: [],
  unreadCount: 0,
  open: false,
  pollTimer: null,
};

function notificationTargetHash(n) {
  if (n.related_table === 'breeding_plans' && n.related_id) return `#/breeding-plans/detail?id=${n.related_id}`;
  if (n.related_table === 'quality_evaluations' && n.related_id) return `#/quality-evaluations/detail?id=${n.related_id}`;
  if (n.related_table === 'pest_disease_records') return '#/pest-disease';
  return null;
}

async function refreshNotifications() {
  try {
    const [items, unread] = await Promise.all([
      api.get('/notifications'),
      api.get('/notifications/unread-count'),
    ]);
    notificationState.items = items;
    notificationState.unreadCount = unread.unreadCount;
    renderNotificationBell();
  } catch (err) {
    console.error('[Notifications] ดึงการแจ้งเตือนไม่สำเร็จ:', err.message);
  }
}

function toggleNotificationDropdown() {
  notificationState.open = !notificationState.open;
  renderNotificationBell();
}

async function handleNotificationClick(n) {
  if (!n.is_read) {
    try {
      await api.post(`/notifications/${n.notification_id}/read`);
      n.is_read = 1;
      notificationState.unreadCount = Math.max(0, notificationState.unreadCount - 1);
    } catch (err) {
      console.error('[Notifications] อัปเดตสถานะอ่านไม่สำเร็จ:', err.message);
    }
  }
  notificationState.open = false;
  const target = notificationTargetHash(n);
  renderNotificationBell();
  if (target) window.location.hash = target;
}

async function handleMarkAllRead() {
  try {
    await api.post('/notifications/read-all');
    notificationState.items.forEach((n) => { n.is_read = 1; });
    notificationState.unreadCount = 0;
    renderNotificationBell();
  } catch (err) {
    console.error('[Notifications] อ่านทั้งหมดไม่สำเร็จ:', err.message);
  }
}

function renderNotificationBell() {
  const mount = document.getElementById('notif-bell');
  if (!mount) return;

  const count = notificationState.unreadCount;
  mount.innerHTML = `
    <button type="button" id="notif-bell-btn" class="btn-notif" aria-label="การแจ้งเตือน">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      ${count > 0 ? `<span class="notif-badge">${count > 99 ? '99+' : count}</span>` : ''}
    </button>
    ${notificationState.open ? `
      <div class="notif-dropdown">
        <div class="notif-dropdown-header">
          <span>การแจ้งเตือน</span>
          ${count > 0 ? '<button type="button" id="notif-mark-all">อ่านทั้งหมด</button>' : ''}
        </div>
        <div class="notif-list">
          ${notificationState.items.length ? notificationState.items.map((n) => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.notification_id}">
              <p class="notif-message">${escapeHtml(n.message)}</p>
              <span class="notif-time">${formatDateCell(n.created_at)}</span>
            </div>
          `).join('') : '<p class="notif-empty">ไม่มีการแจ้งเตือน</p>'}
        </div>
      </div>
    ` : ''}
  `;

  mount.querySelector('#notif-bell-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleNotificationDropdown();
  });

  const markAllBtn = mount.querySelector('#notif-mark-all');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleMarkAllRead();
    });
  }

  mount.querySelectorAll('.notif-item').forEach((el) => {
    el.addEventListener('click', () => {
      const n = notificationState.items.find((x) => String(x.notification_id) === el.dataset.id);
      if (n) handleNotificationClick(n);
    });
  });
}

// ปิด dropdown เมื่อคลิกนอกกล่อง
document.addEventListener('click', () => {
  if (notificationState.open) {
    notificationState.open = false;
    renderNotificationBell();
  }
});

function startNotificationPolling() {
  if (notificationState.pollTimer) return;
  refreshNotifications();
  notificationState.pollTimer = setInterval(refreshNotifications, 30000);
}

function stopNotificationPolling() {
  if (notificationState.pollTimer) {
    clearInterval(notificationState.pollTimer);
    notificationState.pollTimer = null;
  }
  notificationState.items = [];
  notificationState.unreadCount = 0;
  notificationState.open = false;
}
