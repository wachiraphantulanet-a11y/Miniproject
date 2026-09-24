// หน้ารายงาน — การ์ดเดียวแบ่งสองฝั่ง: ซ้าย = ภาพรวมทั้งระบบ (แสดงตลอด), ขวา = รายงานตามเงื่อนไข
// (1.เงื่อนไขรายงาน 2.ช่วงวันที่ 3.หมวดหมู่ — ความหมายแล้วแต่ประเภทรายงาน (สถานะ/วิธีการผสม/เกรด/ผลการพิจารณา)
// 4.บทบาท 5.ผู้ใช้งาน) เลือกได้ทุก process (D2–D9) + ประวัติการอนุมัติ พิมพ์รายงานได้

const ROLE_LABELS = { admin: 'ผู้ดูแลระบบ', staff: 'เจ้าหน้าที่เพาะพันธุ์', owner: 'เจ้าของสวน' };

// ป้ายกำกับค่าตัวกรองที่ 3 เป็นภาษาไทยต่อ process (ใช้กับตัวกรองที่ 3, ตารางผลลัพธ์ และกราฟสรุป)
// ประเภทที่ไม่มีในนี้ (เช่น pollinations/seeds) ค่าที่ backend คืนมาเป็นภาษาไทย/ไม่ต้องแปลอยู่แล้ว
const REPORT_STATUS_LABELS = {
  parentTrees: TREE_STATUS_LABELS,
  breedingPlans: WORKFLOW_STATUS_LABELS,
  seedlings: SEEDLING_STATUS_LABELS,
  pestDisease: PEST_STATUS_LABELS,
  qualityEvaluations: WORKFLOW_STATUS_LABELS,
  planApprovals: DECISION_LABELS,
  evaluationApprovals: DECISION_LABELS,
};

// คอลัมน์ตารางผลลัพธ์ต่อ process — key ต้องตรงกับ alias ที่ backend คืนมา (getProcessReport)
const REPORT_COLUMNS = {
  varieties: [
    { key: 'id', label: 'ID' },
    { key: 'variety_name', label: 'ชื่อพันธุ์' },
    { key: 'taste', label: 'รสชาติ' },
    { key: 'color', label: 'สี' },
    { key: 'created_at', label: 'วันที่บันทึก' },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  parentTrees: [
    { key: 'id', label: 'ID' },
    { key: 'tree_code', label: 'รหัสต้น' },
    { key: 'tree_type', label: 'ประเภท', labels: TREE_TYPE_LABELS },
    { key: 'variety_name', label: 'พันธุ์' },
    { key: 'planted_date', label: 'วันที่ปลูก' },
    { key: 'location', label: 'ตำแหน่ง' },
    { key: 'status', label: 'สถานะ', labels: TREE_STATUS_LABELS },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  breedingPlans: [
    { key: 'id', label: 'ID' },
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'father_tree_code', label: 'พ่อพันธุ์' },
    { key: 'mother_tree_code', label: 'แม่พันธุ์' },
    { key: 'planned_start_date', label: 'วันเริ่ม' },
    { key: 'planned_end_date', label: 'วันสิ้นสุด' },
    { key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS },
    { key: 'user_name', label: 'ผู้สร้าง' },
  ],
  pollinations: [
    { key: 'id', label: 'ID' },
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'pollination_date', label: 'วันที่ผสมเกสร' },
    { key: 'flower_count', label: 'จำนวนดอก' },
    { key: 'method', label: 'วิธีการ' },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  fruitSets: [
    { key: 'id', label: 'ID' },
    { key: 'fruit_set_code', label: 'รหัสการติดผล' },
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'observed_date', label: 'วันที่สังเกต' },
    { key: 'fruit_count', label: 'จำนวนผล' },
    { key: 'fruit_set_rate', label: 'อัตราติดผล (%)' },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  seeds: [
    { key: 'id', label: 'ID' },
    { key: 'fruit_set_code', label: 'รหัสการติดผล' },
    { key: 'collected_date', label: 'วันที่เก็บ' },
    { key: 'seed_count', label: 'จำนวนเมล็ด' },
    { key: 'quality_grade', label: 'เกรด' },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  seedlings: [
    { key: 'id', label: 'ID' },
    { key: 'seedling_code', label: 'รหัสต้นกล้า' },
    { key: 'seed_code', label: 'รหัสเมล็ดพันธุ์' },
    { key: 'germination_date', label: 'วันที่งอก' },
    { key: 'status', label: 'สถานะ', labels: SEEDLING_STATUS_LABELS },
    { key: 'user_name', label: 'ผู้บันทึกเมล็ด' },
  ],
  careRecords: [
    { key: 'id', label: 'ID' },
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'care_date', label: 'วันที่ดูแล' },
    { key: 'activity_type', label: 'กิจกรรม' },
    { key: 'height_cm', label: 'สูง (ซม.)' },
    { key: 'leaf_count', label: 'ใบ' },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  pestDisease: [
    { key: 'id', label: 'ID' },
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'found_date', label: 'วันที่พบ' },
    { key: 'issue_type', label: 'ประเภท', labels: ISSUE_TYPE_LABELS },
    { key: 'issue_name', label: 'ชื่อปัญหา' },
    { key: 'severity', label: 'ความรุนแรง', labels: SEVERITY_LABELS },
    { key: 'status', label: 'สถานะ', labels: PEST_STATUS_LABELS },
    { key: 'user_name', label: 'ผู้บันทึก' },
  ],
  qualityEvaluations: [
    { key: 'id', label: 'ID' },
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'evaluation_date', label: 'วันที่ประเมิน' },
    { key: 'overall_score', label: 'คะแนน' },
    { key: 'overall_grade', label: 'เกรด' },
    { key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS },
    { key: 'user_name', label: 'ผู้ประเมิน' },
  ],
  planApprovals: [
    { key: 'id', label: 'ID' },
    { key: 'plan_code', label: 'รหัสแผน' },
    { key: 'decision', label: 'ผลการพิจารณา', labels: DECISION_LABELS },
    { key: 'reason', label: 'เหตุผล' },
    { key: 'decided_at', label: 'วันที่ตัดสินใจ' },
    { key: 'user_name', label: 'ผู้อนุมัติ' },
  ],
  evaluationApprovals: [
    { key: 'id', label: 'ID' },
    { key: 'seedling_code', label: 'ต้นกล้า' },
    { key: 'decision', label: 'ผลการพิจารณา', labels: DECISION_LABELS },
    { key: 'reason', label: 'เหตุผล' },
    { key: 'decided_at', label: 'วันที่ตัดสินใจ' },
    { key: 'user_name', label: 'ผู้อนุมัติ' },
  ],
};

function summaryColumns(filterLabel) {
  return [
    { key: 'value', label: filterLabel || 'สถานะ' },
    { key: 'total', label: 'จำนวน' },
    { key: 'percent', label: 'สัดส่วน' },
  ];
}

function reportTable(rows, columns, renderExtra) {
  if (!rows.length) return '<p class="muted">ไม่มีข้อมูล</p>';
  return `
    <table class="data-table small">
      <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join('')}${renderExtra ? '<th></th>' : ''}</tr></thead>
      <tbody>
        ${rows.map((r) => `<tr>${columns.map((c) => `<td>${formatCellValue(c, r)}</td>`).join('')}${renderExtra ? `<td>${renderExtra(r)}</td>` : ''}</tr>`).join('')}
      </tbody>
    </table>
  `;
}

function groupTotal(rows) {
  return rows.reduce((sum, r) => sum + Number(r.total), 0);
}

// ตารางสรุปพร้อมคอลัมน์สัดส่วน % (คิดจากผลรวมของกลุ่มที่ส่งมา)
function breakdownTable(rows, columns) {
  if (!rows.length) return '<p class="muted">ไม่มีข้อมูล</p>';
  return reportTable(withPercentColumn(rows), [...columns, { key: 'percent', label: 'สัดส่วน' }]);
}

// ฝั่งซ้ายของการ์ด — ภาพรวมทั้งระบบ แสดงตลอดเวลา (เดิมคือเมนู "ภาพรวม" ที่ถูกยกเลิกไป)
async function renderOverview(panelEl) {
  panelEl.innerHTML = '<p class="loading">กำลังโหลด...</p>';
  const summary = await api.get('/reports/summary');

  panelEl.innerHTML = `
    <div class="stat-cards">
      <div class="stat-card"><span class="stat-value">${summary.varieties.total}</span><span class="stat-label">พันธุ์มะม่วง</span></div>
      <div class="stat-card"><span class="stat-value">${groupTotal(summary.parentTrees)}</span><span class="stat-label">ต้นพ่อ-แม่พันธุ์</span></div>
      <div class="stat-card"><span class="stat-value">${groupTotal(summary.breedingPlans)}</span><span class="stat-label">แผนการเพาะพันธุ์</span></div>
      <div class="stat-card"><span class="stat-value">${summary.pollination.totalRecords}</span><span class="stat-label">บันทึกการผสมเกสร</span></div>
      <div class="stat-card"><span class="stat-value">${summary.pollination.avgFruitSetRatePercent ?? '-'}%</span><span class="stat-label">อัตราติดผลเฉลี่ย</span></div>
      <div class="stat-card"><span class="stat-value">${summary.seeds.total_seeds}</span><span class="stat-label">เมล็ดพันธุ์ (รวม)</span></div>
      <div class="stat-card"><span class="stat-value">${groupTotal(summary.seedlings)}</span><span class="stat-label">ต้นกล้า</span></div>
      <div class="stat-card"><span class="stat-value">${groupTotal(summary.pestDisease)}</span><span class="stat-label">ปัญหาโรค/แมลง</span></div>
    </div>

    <div class="dashboard-grid">
      <section>
        <h3>แผนการเพาะพันธุ์ตามสถานะ</h3>
        <div class="chart-box"><canvas id="chart-ov-plans"></canvas></div>
        ${breakdownTable(summary.breedingPlans, [{ key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS }])}
      </section>
      <section>
        <h3>ต้นกล้าตามสถานะ</h3>
        <div class="chart-box"><canvas id="chart-ov-seedlings"></canvas></div>
        ${breakdownTable(summary.seedlings, [{ key: 'current_status', label: 'สถานะ', labels: SEEDLING_STATUS_LABELS }])}
      </section>
      <section>
        <h3>ผลประเมินคุณภาพตามเกรด/สถานะ</h3>
        <div class="chart-box"><canvas id="chart-ov-evaluations"></canvas></div>
        ${breakdownTable(summary.qualityEvaluations, [{ key: 'overall_grade', label: 'เกรด' }, { key: 'status', label: 'สถานะ', labels: WORKFLOW_STATUS_LABELS }])}
      </section>
      <section>
        <h3>โรค/แมลงตามความรุนแรง</h3>
        <div class="chart-box"><canvas id="chart-ov-pest"></canvas></div>
        ${breakdownTable(summary.pestDisease, [{ key: 'issue_type', label: 'ประเภท', labels: ISSUE_TYPE_LABELS }, { key: 'severity', label: 'ความรุนแรง', labels: SEVERITY_LABELS }, { key: 'status', label: 'สถานะ', labels: PEST_STATUS_LABELS }])}
      </section>
    </div>
  `;

  const plans = aggregateBy(summary.breedingPlans, 'status', WORKFLOW_STATUS_LABELS);
  renderChart('chart-ov-plans', 'doughnut', withPercentLabels(plans.labels, plans.data), plans.data);
  const seedlings = aggregateBy(summary.seedlings, 'current_status', SEEDLING_STATUS_LABELS);
  renderChart('chart-ov-seedlings', 'doughnut', withPercentLabels(seedlings.labels, seedlings.data), seedlings.data);
  const evaluations = aggregateBy(summary.qualityEvaluations, 'overall_grade');
  renderChart('chart-ov-evaluations', 'bar', withPercentLabels(evaluations.labels, evaluations.data), evaluations.data, { label: 'จำนวน' });
  const pest = aggregateBy(summary.pestDisease, 'severity', SEVERITY_LABELS);
  renderChart('chart-ov-pest', 'bar', withPercentLabels(pest.labels, pest.data), pest.data, { label: 'จำนวน' });
}

async function openTraceModal(id) {
  const modalBox = openModal(`
    <div class="modal-header">
      <h3>สายพันธุกรรมต้นกล้า #${id}</h3>
      <button type="button" class="modal-close" id="trace-modal-close" aria-label="ปิด">&times;</button>
    </div>
    <div id="trace-modal-body"><p class="loading">กำลังโหลด...</p></div>
  `);
  modalBox.querySelector('#trace-modal-close').addEventListener('click', closeModal);

  try {
    const data = await api.get(`/reports/seedling-traceability/${id}`);
    modalBox.querySelector('#trace-modal-body').innerHTML = `
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
    modalBox.querySelector('#trace-modal-body').innerHTML = `<p class="error">${err.message}</p>`;
  }
}

function renderProcessResult(resultEl, cfg, data) {
  const columns = REPORT_COLUMNS[cfg.key];
  const labelMap = REPORT_STATUS_LABELS[cfg.key] || {}; // ประเภทที่ไม่มี map (pollinations/seeds) ใช้ค่าดิบตรง ๆ
  const renderExtra = cfg.key === 'seedlings'
    ? (r) => `<button type="button" class="btn-trace" data-trace-id="${r.id}">สายพันธุกรรม</button>`
    : null;

  const summaryRows = cfg.hasFilter
    ? data.summary.map((s) => ({ ...s, value: labelMap[s.value] || s.value }))
    : [];

  resultEl.innerHTML = `
    <h4 class="no-print">${escapeHtml(data.label)}</h4>
    ${cfg.hasFilter ? `
      <div class="chart-box small no-print"><canvas id="chart-process-report"></canvas></div>
      <div class="no-print">${reportTable(withPercentColumn(summaryRows), summaryColumns(cfg.filterLabel))}</div>
    ` : ''}
    ${reportTable(data.rows, columns, renderExtra)}
    <p class="report-total">รวมรายการทั้งหมด ${data.total} รายการ</p>
  `;

  if (cfg.hasFilter) {
    const chart = aggregateBy(data.summary, 'value', labelMap);
    renderChart('chart-process-report', 'bar', withPercentLabels(chart.labels, chart.data), chart.data, { label: 'จำนวน' });
  }

  if (renderExtra) {
    resultEl.querySelectorAll('[data-trace-id]').forEach((btn) => {
      btn.addEventListener('click', () => openTraceModal(btn.dataset.traceId));
    });
  }
}

function fillPrintHeader(container, types, users) {
  const formEl = container.querySelector('#report-filter-form');
  const fd = new FormData(formEl);
  const typeKey = fd.get('type');
  const typeCfg = types.find((t) => t.key === typeKey);
  const fromDate = fd.get('fromDate');
  const toDate = fd.get('toDate');
  const category = fd.get('category');
  const userId = fd.get('userId');

  container.querySelector('#ph-type').textContent = typeCfg ? typeCfg.label : 'ยังไม่ได้เลือก';

  container.querySelector('#ph-daterange').textContent = (fromDate || toDate)
    ? `ระหว่างวันที่ ${fromDate ? formatDateValue(fromDate) : '(ไม่ระบุ)'} ถึงวันที่ ${toDate ? formatDateValue(toDate) : '(ไม่ระบุ)'}`
    : 'ทั้งหมด';

  container.querySelector('#ph-status-label').textContent = (typeCfg && typeCfg.filterLabel) || 'สถานะ';
  const categoryLabelMap = typeCfg ? REPORT_STATUS_LABELS[typeCfg.key] : null;
  container.querySelector('#ph-status').textContent = category ? ((categoryLabelMap && categoryLabelMap[category]) || category) : 'ทั้งหมด';

  const role = fd.get('role');
  container.querySelector('#ph-role').textContent = role ? (ROLE_LABELS[role] || role) : 'ทั้งหมด';

  const userRow = users.find((u) => String(u.user_id) === userId);
  container.querySelector('#ph-user').textContent = userRow
    ? `${userRow.full_name} (${ROLE_LABELS[userRow.role_name] || userRow.role_name})`
    : 'ทั้งหมด';

  const me = auth.getUser();
  container.querySelector('#ph-author').textContent = me ? me.fullName : '-';
  container.querySelector('#ph-printdate').textContent = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
}

async function renderReports(container) {
  const [types, users] = await Promise.all([
    api.get('/reports/process-types'),
    api.get('/reports/filter-users'),
  ]);

  container.innerHTML = `
    <div class="report-header no-print">
      <h2>รายงาน</h2>
    </div>

    <div class="report-tabs no-print">
      <button type="button" class="report-tab active" data-tab="overview">ภาพรวมระบบ</button>
      <button type="button" class="report-tab" data-tab="conditions">รายงานตามเงื่อนไข</button>
    </div>

    <div class="print-header print-only">
      <div class="print-system-name">ระบบจัดการการเพาะพันธุ์มะม่วง (Mango Breeding Management System)</div>
      <div class="print-meta">
        <div><strong>เงื่อนไขรายงาน:</strong> <span id="ph-type">ยังไม่ได้เลือก</span></div>
        <div><strong>ช่วงวันที่:</strong> <span id="ph-daterange">ทั้งหมด</span></div>
        <div><strong><span id="ph-status-label">สถานะ</span>:</strong> <span id="ph-status">ทั้งหมด</span></div>
        <div><strong>บทบาท:</strong> <span id="ph-role">ทั้งหมด</span></div>
        <div><strong>ผู้ใช้งาน:</strong> <span id="ph-user">ทั้งหมด</span></div>
        <div><strong>ผู้จัดทำรายงาน:</strong> <span id="ph-author"></span></div>
        <div><strong>วันที่พิมพ์รายงาน:</strong> <span id="ph-printdate"></span></div>
      </div>
    </div>

    <div id="tab-overview" class="report-tab-panel active no-print">
      <div id="overview-panel"><p class="loading">กำลังโหลด...</p></div>
    </div>

    <div id="tab-conditions" class="report-tab-panel">
      <section class="report-section no-print">
        <div class="report-header">
          <h3 style="margin:0">ตัวกรองรายงาน</h3>
          <button type="button" id="btn-print-reports">🖨️ พิมพ์รายงาน</button>
        </div>
        <form id="report-filter-form" class="filter-form">
          <label class="filter-field">
            <span>1. เงื่อนไขรายงาน</span>
            <select name="type" id="f-type">
              <option value="">-- เลือกประเภทรายงาน --</option>
              ${types.map((t) => `<option value="${t.key}">${escapeHtml(t.label)}</option>`).join('')}
            </select>
          </label>
          <label class="filter-field">
            <span>2. ช่วงวันที่ (จาก)</span>
            <input type="date" name="fromDate" />
          </label>
          <label class="filter-field">
            <span>ถึงวันที่</span>
            <input type="date" name="toDate" />
          </label>
          <label class="filter-field">
            <span id="f-category-label">3. สถานะ</span>
            <select name="category" id="f-category" disabled>
              <option value="">-- ไม่มีตัวกรองนี้สำหรับรายงานนี้ --</option>
            </select>
          </label>
          <label class="filter-field">
            <span>4. บทบาท</span>
            <select name="role" id="f-role">
              <option value="">-- ทุกบทบาท --</option>
              ${Object.entries(ROLE_LABELS).map(([value, label]) => `<option value="${value}">${escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
          <label class="filter-field">
            <span>5. ผู้ใช้งาน</span>
            <select name="userId" id="f-user">
              <option value="">-- ทุกคน --</option>
              ${users.map((u) => `<option value="${u.user_id}">${escapeHtml(u.full_name)} (${escapeHtml(ROLE_LABELS[u.role_name] || u.role_name)})</option>`).join('')}
            </select>
          </label>
          <button type="submit">แสดงรายงาน</button>
        </form>
      </section>
      <div id="report-result"><p class="muted">เลือกเงื่อนไขรายงานด้านบนแล้วกด "แสดงรายงาน"</p></div>
    </div>
  `;

  container.querySelectorAll('.report-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.report-tab').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      container.querySelectorAll('.report-tab-panel').forEach((p) => p.classList.remove('active'));
      container.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });

  renderOverview(container.querySelector('#overview-panel'));

  const typeSelect = container.querySelector('#f-type');
  const categorySelect = container.querySelector('#f-category');
  const categoryLabelEl = container.querySelector('#f-category-label');
  const roleSelect = container.querySelector('#f-role');
  const userSelect = container.querySelector('#f-user');

  // ตัวกรองที่ 3 เปลี่ยนความหมาย/ตัวเลือกตามประเภทรายงานที่เลือก (สถานะ/วิธีการผสม/เกรด/ผลการพิจารณา)
  function refreshCategoryOptions() {
    const cfg = types.find((t) => t.key === typeSelect.value);
    if (!cfg || !cfg.hasFilter) {
      categoryLabelEl.textContent = '3. สถานะ';
      categorySelect.innerHTML = '<option value="">-- ไม่มีตัวกรองนี้สำหรับรายงานนี้ --</option>';
      categorySelect.disabled = true;
      return;
    }
    const labelMap = REPORT_STATUS_LABELS[cfg.key] || {};
    categoryLabelEl.textContent = `3. ${cfg.filterLabel}`;
    categorySelect.disabled = false;
    categorySelect.innerHTML = `
      <option value="">-- ทุก${escapeHtml(cfg.filterLabel)} --</option>
      ${cfg.filterValues.map((v) => `<option value="${v}">${escapeHtml(labelMap[v] || v)}</option>`).join('')}
    `;
  }
  typeSelect.addEventListener('change', refreshCategoryOptions);
  refreshCategoryOptions();

  // บทบาท (ตัวกรองที่ 4) แคบรายชื่อในตัวกรองที่ 5 ให้เหลือเฉพาะคนในบทบาทนั้น
  function refreshUserOptions() {
    const role = roleSelect.value;
    const filtered = role ? users.filter((u) => u.role_name === role) : users;
    userSelect.innerHTML = `
      <option value="">-- ทุกคน --</option>
      ${filtered.map((u) => `<option value="${u.user_id}">${escapeHtml(u.full_name)} (${escapeHtml(ROLE_LABELS[u.role_name] || u.role_name)})</option>`).join('')}
    `;
  }
  roleSelect.addEventListener('change', refreshUserOptions);
  refreshUserOptions();

  container.querySelector('#report-filter-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const resultEl = container.querySelector('#report-result');
    const cfg = types.find((t) => t.key === typeSelect.value);
    if (!cfg) {
      resultEl.innerHTML = '<p class="muted">กรุณาเลือกเงื่อนไขรายงาน (ตัวกรองที่ 1) ก่อน</p>';
      return;
    }
    const formEl = container.querySelector('#report-filter-form');
    const params = new URLSearchParams([...new FormData(formEl).entries()].filter(([, v]) => v));
    resultEl.innerHTML = '<p class="loading">กำลังโหลด...</p>';
    try {
      const data = await api.get(`/reports/process?${params}`);
      renderProcessResult(resultEl, cfg, data);
    } catch (err) {
      resultEl.innerHTML = `<p class="error">${err.message}</p>`;
    }
  });

  container.querySelector('#btn-print-reports').addEventListener('click', () => {
    fillPrintHeader(container, types, users);
    window.print();
  });
}
