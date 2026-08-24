// แดชบอร์ดสำหรับผู้ดูแลระบบ — ภาพรวมผู้ใช้งาน + audit trail ล่าสุด (admin เท่านั้น)

async function renderAdminDashboard(container) {
  if (!auth.hasRole('admin')) {
    container.innerHTML = '<p class="error">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>';
    return;
  }

  const [users, logs] = await Promise.all([
    api.get('/users'),
    api.get('/activity-logs?limit=20'),
  ]);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const inactiveUsers = totalUsers - activeUsers;
  const roleCounts = users.reduce((acc, u) => {
    acc[u.role_name] = (acc[u.role_name] || 0) + 1;
    return acc;
  }, {});

  container.innerHTML = `
    <h2>แดชบอร์ดผู้ดูแลระบบ</h2>

    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-value">${totalUsers}</span>
        <span class="stat-label">ผู้ใช้งานทั้งหมด</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${activeUsers}</span>
        <span class="stat-label">บัญชี active</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${inactiveUsers}</span>
        <span class="stat-label">บัญชีถูกระงับ</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${roleCounts.admin || 0}</span>
        <span class="stat-label">ผู้ดูแลระบบ</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${roleCounts.staff || 0}</span>
        <span class="stat-label">เจ้าหน้าที่เพาะพันธุ์</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${roleCounts.owner || 0}</span>
        <span class="stat-label">เจ้าของสวน</span>
      </div>
    </div>

    <div class="report-section">
      <h3>ทางลัด</h3>
      <div class="quick-links">
        <a href="#/users">จัดการผู้ใช้งาน</a>
        <a href="#/reports">ดูรายงานทั้งหมด</a>
        <a href="#/breeding-plans">แผนการเพาะพันธุ์ที่รออนุมัติ</a>
        <a href="#/quality-evaluations">ผลประเมินที่รอพิจารณา</a>
      </div>
    </div>

    <div class="report-section">
      <h3>กิจกรรมล่าสุดในระบบ (Audit Trail)</h3>
      ${logs.length ? `
        <table class="data-table small">
          <thead><tr><th>เวลา</th><th>ผู้ทำรายการ</th><th>การกระทำ</th><th>ตาราง</th><th>รายละเอียด</th></tr></thead>
          <tbody>
            ${logs.map((l) => `
              <tr>
                <td>${formatDateCell(l.created_at)}</td>
                <td>${escapeHtml(l.full_name || l.username || '-')}</td>
                <td><span class="badge badge-${l.action === 'REJECT' ? 'rejected' : l.action === 'APPROVE' ? 'approved' : 'draft'}">${escapeHtml(ACTIVITY_ACTION_LABELS[l.action] || l.action)}</span></td>
                <td>${escapeHtml(l.table_name)} #${escapeHtml(l.record_id)}</td>
                <td>${escapeHtml(l.detail)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : '<p class="muted">ยังไม่มีกิจกรรม</p>'}
    </div>
  `;
}
