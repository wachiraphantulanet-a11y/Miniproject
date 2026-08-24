// ใช้ร่วมกันระหว่างแผนการเพาะพันธุ์ (breeding-plans) และผลประเมินคุณภาพ (quality-evaluations)
// ทั้งสองมี state machine เดียวกัน: (แก้ไขได้ก่อนยื่น) -> pending_approval -> approved/rejected
// rejected เป็นสถานะจบ (terminal) แก้ไข/ยื่นซ้ำรายการเดิมไม่ได้ — ถ้าต้องแก้ไขจริงต้องสร้างรายการใหม่
// (ดู revisedFromKey ใน cfg สำหรับฟิลด์ที่ใช้สืบสายย้อนกลับไปรายการที่ถูกปฏิเสธ)

const WF_PREFILL_KEY = 'wf-prefill';

function readWfPrefill(endpoint) {
  try {
    const raw = sessionStorage.getItem(WF_PREFILL_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.endpoint !== endpoint) return null;
    return data.values;
  } catch {
    return null;
  }
}

async function renderWorkflowList(container, cfg) {
  const { title, endpoint, idKey, codeKey, listColumns, createFields, canCreate, listPath } = cfg;
  const rows = await api.get(endpoint);

  container.innerHTML = `
    <h2>${title}</h2>
    <div id="wf-form-area"></div>
    <table class="data-table">
      <thead><tr>${listColumns.map((c) => `<th>${c.label}</th>`).join('')}<th>สถานะ</th><th></th></tr></thead>
      <tbody>
        ${rows.map((r) => `
          <tr>
            ${listColumns.map((c) => `<td>${formatCellValue(c, r)}</td>`).join('')}
            <td><span class="badge badge-${r.status}">${escapeHtml(WORKFLOW_STATUS_LABELS[r.status] || r.status)}</span></td>
            <td><a href="#${listPath}/detail?id=${r[idKey]}">ดูรายละเอียด</a></td>
          </tr>
        `).join('') || `<tr><td colspan="${listColumns.length + 2}">ไม่มีข้อมูล</td></tr>`}
      </tbody>
    </table>
  `;

  if (canCreate) {
    const area = container.querySelector('#wf-form-area');
    const prefill = readWfPrefill(endpoint);
    const formHtml = await renderForm(createFields, prefill || {});
    area.innerHTML = `
      <form id="wf-create-form" class="crud-form">
        <h3>สร้างรายการใหม่</h3>
        ${prefill ? '<p class="muted">กรอกข้อมูลไว้ล่วงหน้าจากรายการที่ถูกปฏิเสธ ตรวจสอบ/แก้ไขก่อนบันทึก</p>' : ''}
        ${formHtml}
        <button type="submit">บันทึก</button>
      </form>
    `;
    wireDynamicFields(area.querySelector('#wf-create-form'), createFields);
    sessionStorage.removeItem(WF_PREFILL_KEY);
    area.querySelector('#wf-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, createFields);
        if (prefill && cfg.revisedFromKey && prefill[cfg.revisedFromKey]) {
          values[cfg.revisedFromKey] = prefill[cfg.revisedFromKey];
        }
        await api.post(endpoint, values);
        await renderWorkflowList(container, cfg);
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

async function renderWorkflowDetail(container, cfg, id) {
  const { title, endpoint, idKey, createFields, editFields, editableStatuses, decideRoles, listPath, detailFields } = cfg;
  const item = await api.get(`${endpoint}/${id}`);
  const canEditNow = auth.hasRole('admin', 'staff') && editableStatuses.includes(item.status);
  const canDecideNow = auth.hasRole(...decideRoles) && item.status === 'pending_approval';
  const canSubmit = auth.hasRole('admin', 'staff') && item.status === 'draft';
  const canCreateNew = auth.hasRole('admin', 'staff') && item.status === 'rejected';

  container.innerHTML = `
    <p><a href="#${listPath}">&larr; กลับไปรายการ</a></p>
    <h2>${title} #${id} <span class="badge badge-${item.status}">${escapeHtml(WORKFLOW_STATUS_LABELS[item.status] || item.status)}</span></h2>
    <div class="detail-fields">
      ${detailFields.map((f) => `<div><strong>${f.label}:</strong> ${formatDateCell(item[f.key])}</div>`).join('')}
    </div>

    <h3>ประวัติการอนุมัติ/ปฏิเสธ</h3>
    ${item.approvals.length ? `
      <table class="data-table small">
        <thead><tr><th>การตัดสินใจ</th><th>เหตุผล</th><th>โดย</th><th>เมื่อ</th></tr></thead>
        <tbody>
          ${item.approvals.map((a) => `
            <tr>
              <td><span class="badge badge-${a.decision}">${escapeHtml(DECISION_LABELS[a.decision] || a.decision)}</span></td>
              <td>${escapeHtml(a.reason)}</td>
              <td>${escapeHtml(a.decided_by_name)}</td>
              <td>${formatDateCell(a.decided_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="muted">ยังไม่มีประวัติ</p>'}

    <div id="wf-detail-actions"></div>
  `;

  const actionsArea = container.querySelector('#wf-detail-actions');

  if (canCreateNew) {
    const rejectedSection = document.createElement('div');
    rejectedSection.innerHTML = `
      <p class="muted">รายการนี้ถูกปฏิเสธแล้ว (สถานะจบ) แก้ไข/ยื่นซ้ำรายการนี้ไม่ได้อีก
      หากต้องการแก้ไขจริง กรุณาสร้างรายการใหม่แทน</p>
      <button type="button" id="wf-create-new-btn">สร้างรายการใหม่โดยอ้างอิงรายการนี้</button>
    `;
    actionsArea.appendChild(rejectedSection);

    rejectedSection.querySelector('#wf-create-new-btn').addEventListener('click', () => {
      const values = {};
      for (const f of createFields) {
        const raw = item[f.key] ?? item[camelToSnake(f.key)];
        if (raw != null) values[f.key] = raw;
      }
      if (cfg.revisedFromKey) values[cfg.revisedFromKey] = item[idKey];
      sessionStorage.setItem(WF_PREFILL_KEY, JSON.stringify({ endpoint, values }));
      window.location.hash = `#${listPath}`;
    });
  }

  if (canEditNow) {
    const editSection = document.createElement('div');
    editSection.innerHTML = `
      <button type="button" id="wf-open-edit-btn">แก้ไขข้อมูล</button>
      ${canSubmit ? '<button type="button" id="wf-submit-btn">ส่งขออนุมัติ</button>' : ''}
    `;
    actionsArea.appendChild(editSection);

    editSection.querySelector('#wf-open-edit-btn').addEventListener('click', async () => {
      const formHtml = await renderForm(editFields, item);
      const modalBox = openModal(`
        <div class="modal-header">
          <h3>แก้ไขข้อมูล — ${title} #${id}</h3>
          <button type="button" class="modal-close" id="wf-modal-close" aria-label="ปิด">&times;</button>
        </div>
        <form id="wf-edit-form" class="crud-form">
          ${formHtml}
          <div class="modal-actions">
            <button type="submit">บันทึกการแก้ไข</button>
            <button type="button" id="wf-cancel-edit">ยกเลิก</button>
          </div>
        </form>
      `);
      wireDynamicFields(modalBox.querySelector('#wf-edit-form'), editFields);
      modalBox.querySelector('#wf-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const values = readFormValues(e.target, editFields);
          await api.put(`${endpoint}/${id}`, values);
          closeModal();
          await renderWorkflowDetail(container, cfg, id);
        } catch (err) {
          alert(err.message);
        }
      });
      modalBox.querySelector('#wf-cancel-edit').addEventListener('click', closeModal);
      modalBox.querySelector('#wf-modal-close').addEventListener('click', closeModal);
    });

    const submitBtn = editSection.querySelector('#wf-submit-btn');
    if (submitBtn) {
      submitBtn.addEventListener('click', async () => {
        try {
          await api.post(`${endpoint}/${id}/submit`, {});
          await renderWorkflowDetail(container, cfg, id);
        } catch (err) {
          alert(err.message);
        }
      });
    }
  }

  if (canDecideNow) {
    const decideSection = document.createElement('div');
    decideSection.innerHTML = `
      <h3>พิจารณาอนุมัติ</h3>
      <form id="wf-decide-form" class="crud-form">
        <label class="form-field">
          <span>การตัดสินใจ</span>
          <select name="decision" required>
            <option value="">-- เลือก --</option>
            <option value="approved">อนุมัติ</option>
            <option value="rejected">ปฏิเสธ</option>
          </select>
        </label>
        <label class="form-field">
          <span>เหตุผล (บังคับถ้าปฏิเสธ)</span>
          <textarea name="reason"></textarea>
        </label>
        <button type="submit">ยืนยันการพิจารณา</button>
      </form>
    `;
    actionsArea.appendChild(decideSection);
    decideSection.querySelector('#wf-decide-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      try {
        await api.post(`${endpoint}/${id}/decide`, {
          decision: formData.get('decision'),
          reason: formData.get('reason') || undefined,
        });
        await renderWorkflowDetail(container, cfg, id);
      } catch (err) {
        alert(err.message);
      }
    });
  }
}
