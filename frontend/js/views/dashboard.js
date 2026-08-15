function groupTotal(rows, key) {
  return rows.reduce((sum, r) => sum + Number(r.total), 0);
}

function breakdownTable(rows, columns) {
  if (!rows.length) return '<p class="muted">ไม่มีข้อมูล</p>';
  return `
    <table class="data-table small">
      <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${columns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderDashboard(container) {
  const summary = await api.get('/reports/summary');

  container.innerHTML = `
    <h2>ภาพรวมระบบ</h2>
    <div class="stat-cards">
      <div class="stat-card">
        <span class="stat-value">${summary.varieties.total}</span>
        <span class="stat-label">พันธุ์มะม่วง</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${groupTotal(summary.parentTrees)}</span>
        <span class="stat-label">ต้นพ่อ-แม่พันธุ์</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${groupTotal(summary.breedingPlans)}</span>
        <span class="stat-label">แผนการเพาะพันธุ์</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${summary.pollination.totalRecords}</span>
        <span class="stat-label">บันทึกการผสมเกสร</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${summary.pollination.avgFruitSetRatePercent ?? '-'}%</span>
        <span class="stat-label">อัตราติดผลเฉลี่ย</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${summary.seeds.total_seeds}</span>
        <span class="stat-label">เมล็ดพันธุ์ (รวม)</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${groupTotal(summary.seedlings)}</span>
        <span class="stat-label">ต้นกล้า</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${groupTotal(summary.pestDisease)}</span>
        <span class="stat-label">ปัญหาโรค/แมลง</span>
      </div>
    </div>

    <div class="dashboard-grid">
      <section>
        <h3>แผนการเพาะพันธุ์ตามสถานะ</h3>
        ${breakdownTable(summary.breedingPlans, [{ key: 'status', label: 'สถานะ' }, { key: 'total', label: 'จำนวน' }])}
      </section>
      <section>
        <h3>ต้นกล้าตามสถานะ</h3>
        ${breakdownTable(summary.seedlings, [{ key: 'current_status', label: 'สถานะ' }, { key: 'total', label: 'จำนวน' }])}
      </section>
      <section>
        <h3>ผลประเมินคุณภาพตามเกรด/สถานะ</h3>
        ${breakdownTable(summary.qualityEvaluations, [{ key: 'overall_grade', label: 'เกรด' }, { key: 'status', label: 'สถานะ' }, { key: 'total', label: 'จำนวน' }])}
      </section>
      <section>
        <h3>โรค/แมลงตามความรุนแรง</h3>
        ${breakdownTable(summary.pestDisease, [{ key: 'issue_type', label: 'ประเภท' }, { key: 'severity', label: 'ความรุนแรง' }, { key: 'status', label: 'สถานะ' }, { key: 'total', label: 'จำนวน' }])}
      </section>
    </div>
  `;
}
