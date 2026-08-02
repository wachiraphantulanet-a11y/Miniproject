// ใช้ร่วมกันระหว่างแผนการเพาะพันธุ์ (breeding-plans) และผลประเมินคุณภาพ (quality-evaluations)
// ทั้งสองมี state machine เดียวกัน: (แก้ไขได้) -> pending_approval -> approved/rejected -> วนกลับ

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
            ${listColumns.map((c) => `<td>${escapeHtml(r[c.key])}</td>`).join('')}
            <td><span class="badge badge-${r.status}">${r.status}</span></td>
            <td><a href="#${listPath}/detail?id=${r[idKey]}">ดูรายละเอียด</a></td>
          </tr>
        `).join('') || `<tr><td colspan="${listColumns.length + 2}">ไม่มีข้อมูล</td></tr>`}
      </tbody>
    </table>
  `;

  if (canCreate) {
    const area = container.querySelector('#wf-form-area');
    const formHtml = await renderForm(createFields);
    area.innerHTML = `
      <form id="wf-create-form" class="crud-form">
        <h3>สร้างรายการใหม่</h3>
        ${formHtml}
        <button type="submit">บันทึก</button>
      </form>
    `;
    area.querySelector('#wf-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, createFields);
        await api.post(endpoint, values);
        await renderWorkflowList(container, cfg);
      } catch (err) {
        alert(err.message);
      }
    });
  }
}

async function renderWorkflowDetail(container, cfg, id) {
  const { title, endpoint, editFields, editableStatuses, decideRoles, listPath, detailFields } = cfg;
  const item = await api.get(`${endpoint}/${id}`);
  const canEditNow = auth.hasRole('admin', 'staff') && editableStatuses.includes(item.status);
  const canDecideNow = auth.hasRole(...decideRoles) && item.status === 'pending_approval';
  const canResubmit = auth.hasRole('admin', 'staff') && item.status === 'rejected';

  container.innerHTML = `
    <p><a href="#${listPath}">&larr; กลับไปรายการ</a></p>
    <h2>${title} #${id} <span class="badge badge-${item.status}">${item.status}</span></h2>
    <div class="detail-fields">
      ${detailFields.map((f) => `<div><strong>${f.label}:</strong> ${escapeHtml(item[f.key])}</div>`).join('')}
    </div>

    <h3>ประวัติการอนุมัติ/ปฏิเสธ</h3>
    ${item.approvals.length ? `
      <table class="data-table small">
        <thead><tr><th>การตัดสินใจ</th><th>เหตุผล</th><th>โดย</th><th>เมื่อ</th></tr></thead>
        <tbody>
          ${item.approvals.map((a) => `
            <tr>
              <td><span class="badge badge-${a.decision}">${a.decision}</span></td>
              <td>${escapeHtml(a.reason)}</td>
              <td>${escapeHtml(a.decided_by_name)}</td>
              <td>${escapeHtml(a.decided_at)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="muted">ยังไม่มีประวัติ</p>'}

    <div id="wf-detail-actions"></div>
  `;

  const actionsArea = container.querySelector('#wf-detail-actions');

  if (canEditNow) {
    const formHtml = await renderForm(editFields, item);
    const editSection = document.createElement('div');
    editSection.innerHTML = `
      <h3>แก้ไขข้อมูล</h3>
      <form id="wf-edit-form" class="crud-form">
        ${formHtml}
        <button type="submit">บันทึกการแก้ไข</button>
        ${canResubmit ? '<button type="button" id="wf-resubmit-btn">ส่งเข้ารออนุมัติอีกครั้ง</button>' : ''}
      </form>
    `;
    actionsArea.appendChild(editSection);
    editSection.querySelector('#wf-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, editFields);
        await api.put(`${endpoint}/${id}`, values);
        await renderWorkflowDetail(container, cfg, id);
      } catch (err) {
        alert(err.message);
      }
    });
    const resubmitBtn = editSection.querySelector('#wf-resubmit-btn');
    if (resubmitBtn) {
      resubmitBtn.addEventListener('click', async () => {
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
