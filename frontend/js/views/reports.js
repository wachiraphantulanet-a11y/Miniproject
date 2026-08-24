function reportTable(rows, columns) {
  if (!rows.length) return '<p class="muted">ไม่มีข้อมูล</p>';
  return `
    <table class="data-table small">
      <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${columns.map((c) => `<td>${formatCellValue(c, r)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

async function renderReports(container) {
  container.innerHTML = `
    <h2>รายงาน</h2>

    <section class="report-section">
      <h3>ตรวจสอบย้อนกลับแหล่งที่มาต้นกล้า (Traceability)</h3>
      <form id="trace-form" class="inline-form">
        <input type="number" name="seedlingId" placeholder="รหัสต้นกล้า (Seedling ID)" required />
        <button type="submit">ค้นหา</button>
      </form>
      <div id="trace-result"></div>
    </section>

    <section class="report-section">
      <h3>รายงานแผนการเพาะพันธุ์</h3>
      <form id="plan-report-form" class="inline-form">
        <select name="status">
          <option value="">-- ทุกสถานะ --</option>
          <option value="draft">${WORKFLOW_STATUS_LABELS.draft}</option>
          <option value="pending_approval">${WORKFLOW_STATUS_LABELS.pending_approval}</option>
          <option value="approved">${WORKFLOW_STATUS_LABELS.approved}</option>
          <option value="rejected">${WORKFLOW_STATUS_LABELS.rejected}</option>
        </select>
        <input type="date" name="fromDate" />
        <input type="date" name="toDate" />
        <button type="submit">กรอง</button>
      </form>
      <div id="plan-report-result"></div>
    </section>

    <section class="report-section">
      <h3>รายงานโรคและแมลง</h3>
      <form id="pest-report-form" class="inline-form">
        <select name="issueType">
          <option value="">-- ทุกประเภท --</option>
          <option value="disease">${ISSUE_TYPE_LABELS.disease}</option>
          <option value="pest">${ISSUE_TYPE_LABELS.pest}</option>
        </select>
        <select name="severity">
          <option value="">-- ทุกความรุนแรง --</option>
          <option value="low">${SEVERITY_LABELS.low}</option>
          <option value="medium">${SEVERITY_LABELS.medium}</option>
          <option value="high">${SEVERITY_LABELS.high}</option>
        </select>
        <select name="status">
          <option value="">-- ทุกสถานะ --</option>
          <option value="open">${PEST_STATUS_LABELS.open}</option>
          <option value="treated">${PEST_STATUS_LABELS.treated}</option>
          <option value="resolved">${PEST_STATUS_LABELS.resolved}</option>
        </select>
        <button type="submit">กรอง</button>
      </form>
      <div id="pest-report-result"></div>
    </section>
  `;

  container.querySelector('#trace-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = new FormData(e.target).get('seedlingId');
    const resultEl = container.querySelector('#trace-result');
    resultEl.innerHTML = '<p class="loading">กำลังค้นหา...</p>';
    try {
      const data = await api.get(`/reports/seedling-traceability/${id}`);
      resultEl.innerHTML = `
        <div class="detail-fields">
          <div><strong>ต้นกล้า:</strong> ${escapeHtml(data.seedling_code)} (${escapeHtml(SEEDLING_STATUS_LABELS[data.current_status] || data.current_status)})</div>
          <div><strong>แผนการเพาะพันธุ์:</strong> ${escapeHtml(data.plan_code)} — ${escapeHtml(data.plan_objective)}</div>
          <div><strong>ต้นพ่อพันธุ์:</strong> ${escapeHtml(data.father_tree_code)} (${escapeHtml(data.father_variety)})</div>
          <div><strong>ต้นแม่พันธุ์:</strong> ${escapeHtml(data.mother_tree_code)} (${escapeHtml(data.mother_variety)})</div>
          <div><strong>วันที่ผสมเกสร:</strong> ${formatDateCell(data.pollination_date)} (${escapeHtml(data.pollination_method)})</div>
          <div><strong>อัตราติดผล:</strong> ${escapeHtml(data.fruit_set_rate)}%</div>
          <div><strong>เกรดเมล็ด:</strong> ${escapeHtml(data.seed_quality_grade)}</div>
        </div>
        <h4>ประวัติการดูแล</h4>
        ${reportTable(data.careRecords, [{ key: 'care_date', label: 'วันที่' }, { key: 'activity_type', label: 'กิจกรรม' }, { key: 'height_cm', label: 'สูง (ซม.)' }, { key: 'leaf_count', label: 'ใบ' }])}
        <h4>ประวัติโรค/แมลง</h4>
        ${reportTable(data.pestDiseaseRecords, [{ key: 'found_date', label: 'วันที่พบ' }, { key: 'issue_type', label: 'ประเภท', labels: ISSUE_TYPE_LABELS }, { key: 'issue_name', label: 'ชื่อ' }, { key: 'severity', label: 'ความรุนแรง', labels: SEVERITY_LABELS }, { key: 'status', label: 'สถานะ', labels: PEST_STATUS_LABELS }])}
        <h4>ประวัติการประเมินคุณภาพ</h4>
        ${reportTable(data.evaluations, [{ key: 'evaluation_date', label: 'วันที่ประเมิน' }, { key: 'overall_grade', label: 'เกรด' }, { key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS }])}
      `;
    } catch (err) {
      resultEl.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  container.querySelector('#plan-report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const params = new URLSearchParams([...new FormData(e.target).entries()].filter(([, v]) => v));
    const resultEl = container.querySelector('#plan-report-result');
    resultEl.innerHTML = '<p class="loading">กำลังโหลด...</p>';
    try {
      const data = await api.get(`/reports/breeding-plans?${params}`);
      resultEl.innerHTML = `
        <h4>สรุปตามสถานะ</h4>
        ${reportTable(data.summary, [{ key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS }, { key: 'total', label: 'จำนวน' }])}
        <h4>รายการแผน</h4>
        ${reportTable(data.plans, [{ key: 'plan_code', label: 'รหัสแผน' }, { key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS }, { key: 'father_tree_code', label: 'พ่อพันธุ์' }, { key: 'mother_tree_code', label: 'แม่พันธุ์' }, { key: 'pollination_count', label: 'จำนวนครั้งผสมเกสร' }])}
      `;
    } catch (err) {
      resultEl.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  container.querySelector('#pest-report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const params = new URLSearchParams([...new FormData(e.target).entries()].filter(([, v]) => v));
    const resultEl = container.querySelector('#pest-report-result');
    resultEl.innerHTML = '<p class="loading">กำลังโหลด...</p>';
    try {
      const data = await api.get(`/reports/pest-disease?${params}`);
      resultEl.innerHTML = `
        <h4>สรุป</h4>
        ${reportTable(data.summary, [{ key: 'issue_type', label: 'ประเภท', labels: ISSUE_TYPE_LABELS }, { key: 'severity', label: 'ความรุนแรง', labels: SEVERITY_LABELS }, { key: 'status', label: 'สถานะ', labels: PEST_STATUS_LABELS }, { key: 'total', label: 'จำนวน' }])}
        <h4>รายการ</h4>
        ${reportTable(data.records, [{ key: 'seedling_code', label: 'ต้นกล้า' }, { key: 'found_date', label: 'วันที่พบ' }, { key: 'issue_name', label: 'ชื่อปัญหา' }, { key: 'severity', label: 'ความรุนแรง', labels: SEVERITY_LABELS }, { key: 'status', label: 'สถานะ', labels: PEST_STATUS_LABELS }])}
      `;
    } catch (err) {
      resultEl.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });
}
