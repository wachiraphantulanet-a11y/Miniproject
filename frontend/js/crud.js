// Generic list + create/edit form component ใช้ซ้ำกับ resource ที่มีรูปแบบ CRUD คล้ายกัน
// (พันธุ์มะม่วง, ต้นพ่อ-แม่พันธุ์, ผสมเกสร, ติดผล, เมล็ดพันธุ์, ต้นกล้า, การดูแล, โรค/แมลง)

function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// แปลงค่าวันที่จาก backend (YYYY-MM-DD หรือ YYYY-MM-DD HH:MM:SS จาก mysql2 dateStrings)
// ให้แสดงเป็น วัน/เดือน/ปี (พร้อมเวลาถ้ามี) — ใช้เฉพาะตอนแสดงผล ห้ามใช้กับ value ของ input
function formatDateValue(value) {
  if (typeof value !== 'string') return value;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}):\d{2})?/);
  if (!m) return value;
  const [, y, mo, d, time] = m;
  return `${d}/${mo}/${y}${time ? ' ' + time : ''}`;
}

function formatDateCell(value) {
  return escapeHtml(formatDateValue(value));
}

// ป้ายกำกับภาษาไทยของค่า enum ที่ใช้ร่วมกันหลายหน้า (สถานะแผน/ผลประเมิน, การอนุมัติ/ปฏิเสธ,
// สถานะบัญชีผู้ใช้, ประเภทกิจกรรมใน audit log) — ใช้กับทั้ง badge และ col.labels ของตาราง
const WORKFLOW_STATUS_LABELS = {
  draft: 'ฉบับร่าง',
  pending_approval: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ถูกปฏิเสธ',
};
const DECISION_LABELS = { approved: 'อนุมัติ', rejected: 'ปฏิเสธ' };
const ACCOUNT_STATUS_LABELS = { active: 'ใช้งาน', inactive: 'ระงับบัญชี' };
const ACTIVITY_ACTION_LABELS = {
  CREATE: 'สร้าง',
  UPDATE: 'แก้ไข',
  SUBMIT: 'ส่งอนุมัติ',
  APPROVE: 'อนุมัติ',
  REJECT: 'ปฏิเสธ',
  DELETE: 'ลบ',
  LOGIN: 'เข้าสู่ระบบ',
  RESET_PASSWORD: 'ตั้งรหัสผ่านใหม่',
};

// สำหรับ listColumns ที่เก็บค่าเป็นโค้ดภาษาอังกฤษ (enum) แต่อยากแสดงเป็นภาษาไทยในตาราง
// ให้ตรงกับ label ที่ใช้ในฟอร์มเพิ่ม/แก้ไข — ใส่ col.labels = { value: 'ป้ายกำกับ' }
function formatCellValue(col, row) {
  const raw = row[col.key];
  if (col.labels && raw != null && col.labels[raw] != null) {
    return escapeHtml(col.labels[raw]);
  }
  return formatDateCell(raw);
}

// ค่าพิเศษของ select ที่แปลว่า "ผู้ใช้เลือกกรอกเอง" — ใช้กับ field type 'select-with-other'
const OTHER_OPTION_VALUE = '__other__';

async function resolveOptions(field) {
  if (!field.options) return [];
  if (typeof field.options === 'function') return field.options();
  return field.options;
}

function fieldInputHtml(field, value = '') {
  const id = `f_${field.key}`;
  const req = field.required ? 'required' : '';
  if (field.type === 'textarea') {
    return `<textarea id="${id}" name="${field.key}" ${req}>${escapeHtml(value)}</textarea>`;
  }
  if (field.type === 'select') {
    const opts = field.resolvedOptions
      .map((o) => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`)
      .join('');
    return `<select id="${id}" name="${field.key}" ${req}><option value="">-- เลือก --</option>${opts}</select>`;
  }
  if (field.type === 'select-with-other') {
    const known = field.resolvedOptions.map((o) => String(o.value));
    const isCustom = value !== '' && !known.includes(String(value));
    const selectValue = isCustom ? OTHER_OPTION_VALUE : value;
    const opts = field.resolvedOptions
      .map((o) => `<option value="${escapeHtml(o.value)}" ${String(o.value) === String(selectValue) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`)
      .join('');
    return `
      <select id="${id}" name="${field.key}" data-select-with-other ${req}>
        <option value="">-- เลือก --</option>
        ${opts}
        <option value="${OTHER_OPTION_VALUE}" ${selectValue === OTHER_OPTION_VALUE ? 'selected' : ''}>อื่นๆ (ระบุเอง)</option>
      </select>
      <input type="text" id="${id}_other" name="${field.key}_other" class="other-input"
        placeholder="ระบุ${escapeHtml(field.label)}" value="${escapeHtml(isCustom ? value : '')}"
        ${selectValue === OTHER_OPTION_VALUE ? '' : 'style="display:none"'} />
    `;
  }
  return `<input type="${field.type || 'text'}" id="${id}" name="${field.key}" value="${escapeHtml(value)}" ${req} />`;
}

// field.key เป็น camelCase (ใช้ส่งขึ้น API) แต่แถวข้อมูลที่ API คืนมาเป็น snake_case
// (เช่น field.key = 'qualityGrade' แต่ row มี row.quality_grade) — ต้องแปลงเพื่อดึงค่าปัจจุบันมา prefill ได้
function camelToSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

async function renderForm(fields, initialValues = {}) {
  for (const f of fields) {
    f.resolvedOptions = await resolveOptions(f);
  }
  return fields
    .map((f) => {
      const value = initialValues[f.key] ?? initialValues[camelToSnake(f.key)] ?? '';
      return `
      <label class="form-field">
        <span>${f.label}${f.required ? ' *' : ''}</span>
        ${fieldInputHtml(f, value)}
      </label>
    `;
    })
    .join('');
}

// เรียกหลัง insert form HTML ลง DOM แล้ว — ผูก event ให้ select-with-other โชว์/ซ่อนช่องกรอกเอง
function wireDynamicFields(formEl, fields) {
  fields
    .filter((f) => f.type === 'select-with-other')
    .forEach((f) => {
      const select = formEl.querySelector(`[name="${f.key}"]`);
      const otherInput = formEl.querySelector(`[name="${f.key}_other"]`);
      if (!select || !otherInput) return;
      select.addEventListener('change', () => {
        const isOther = select.value === OTHER_OPTION_VALUE;
        otherInput.style.display = isOther ? '' : 'none';
        if (isOther) otherInput.focus();
        else otherInput.value = '';
      });
    });
}

// Modal popup ใช้ร่วมกันสำหรับฟอร์ม "แก้ไข" ของทุกหน้า (mount ที่ #modal-root ใน index.html)
function openModal(innerHtml) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-box" role="dialog" aria-modal="true">${innerHtml}</div>
    </div>
  `;
  root.querySelector('#modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  document.addEventListener('keydown', modalEscHandler);
  return root.querySelector('.modal-box');
}

function closeModal() {
  document.getElementById('modal-root').innerHTML = '';
  document.removeEventListener('keydown', modalEscHandler);
}

function modalEscHandler(e) {
  if (e.key === 'Escape') closeModal();
}

function readFormValues(formEl, fields) {
  const values = {};
  for (const f of fields) {
    const el = formEl.querySelector(`[name="${f.key}"]`);
    let raw;
    if (f.type === 'select-with-other' && el.value === OTHER_OPTION_VALUE) {
      raw = formEl.querySelector(`[name="${f.key}_other"]`).value.trim();
    } else {
      raw = el.value.trim();
    }
    if (raw === '') {
      values[f.key] = null;
    } else if (f.type === 'number') {
      values[f.key] = Number(raw);
    } else {
      values[f.key] = raw;
    }
  }
  return values;
}

async function renderCrudView(container, config) {
  const {
    title, endpoint, idKey, listColumns,
    createFields = [], editFields = [],
    canCreate, canEdit, canDelete,
  } = config;

  let editingId = null;

  async function load() {
    const rows = await api.get(endpoint);
    container.innerHTML = `
      <h2>${title}</h2>
      <div id="crud-form-area"></div>
      <table class="data-table">
        <thead><tr>${listColumns.map((c) => `<th>${c.label}</th>`).join('')}${(canEdit || canDelete) ? '<th>จัดการ</th>' : ''}</tr></thead>
        <tbody>
          ${rows.map((row) => `
            <tr data-id="${row[idKey]}">
              ${listColumns.map((c) => `<td>${formatCellValue(c, row)}</td>`).join('')}
              ${(canEdit || canDelete) ? `
                <td class="row-actions">
                  ${canEdit ? '<button type="button" class="btn-edit">แก้ไข</button>' : ''}
                  ${canDelete ? '<button type="button" class="btn-delete">ลบ</button>' : ''}
                </td>` : ''}
            </tr>
          `).join('') || `<tr><td colspan="${listColumns.length + 1}">ไม่มีข้อมูล</td></tr>`}
        </tbody>
      </table>
    `;

    if (canCreate) await showCreateForm();

    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.closest('tr').dataset.id;
        const row = rows.find((r) => String(r[idKey]) === id);
        showEditForm(row);
      });
    });
    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        if (!confirm('ยืนยันการลบรายการนี้?')) return;
        try {
          await api.delete(`${endpoint}/${id}`);
          await load();
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  async function showCreateForm() {
    const area = container.querySelector('#crud-form-area');
    const formHtml = await renderForm(createFields);
    area.innerHTML = `
      <form id="crud-create-form" class="crud-form">
        <h3>เพิ่มรายการใหม่</h3>
        ${formHtml}
        <button type="submit">บันทึก</button>
      </form>
    `;
    wireDynamicFields(area.querySelector('#crud-create-form'), createFields);
    area.querySelector('#crud-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, createFields);
        await api.post(endpoint, values);
        await load();
      } catch (err) {
        alert(err.message);
      }
    });
  }

  async function showEditForm(row) {
    editingId = row[idKey];
    const formHtml = await renderForm(editFields, row);
    const modalBox = openModal(`
      <div class="modal-header">
        <h3>แก้ไขรายการ #${editingId}</h3>
        <button type="button" class="modal-close" id="crud-modal-close" aria-label="ปิด">&times;</button>
      </div>
      <form id="crud-edit-form" class="crud-form">
        ${formHtml}
        <div class="modal-actions">
          <button type="submit">บันทึกการแก้ไข</button>
          <button type="button" id="crud-cancel-edit">ยกเลิก</button>
        </div>
      </form>
    `);
    wireDynamicFields(modalBox.querySelector('#crud-edit-form'), editFields);
    modalBox.querySelector('#crud-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, editFields);
        await api.put(`${endpoint}/${editingId}`, values);
        closeModal();
        await load();
      } catch (err) {
        alert(err.message);
      }
    });
    modalBox.querySelector('#crud-cancel-edit').addEventListener('click', closeModal);
    modalBox.querySelector('#crud-modal-close').addEventListener('click', closeModal);
  }

  await load();
}
