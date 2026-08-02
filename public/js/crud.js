// Generic list + create/edit form component ใช้ซ้ำกับ resource ที่มีรูปแบบ CRUD คล้ายกัน
// (พันธุ์มะม่วง, ต้นพ่อ-แม่พันธุ์, ผสมเกสร, ติดผล, เมล็ดพันธุ์, ต้นกล้า, การดูแล, โรค/แมลง)

function escapeHtml(value) {
  if (value == null) return '';
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
  return `<input type="${field.type || 'text'}" id="${id}" name="${field.key}" value="${escapeHtml(value)}" ${req} />`;
}

async function renderForm(fields, initialValues = {}) {
  for (const f of fields) {
    f.resolvedOptions = await resolveOptions(f);
  }
  return fields
    .map((f) => `
      <label class="form-field">
        <span>${f.label}${f.required ? ' *' : ''}</span>
        ${fieldInputHtml(f, initialValues[f.key] ?? '')}
      </label>
    `)
    .join('');
}

function readFormValues(formEl, fields) {
  const values = {};
  for (const f of fields) {
    const el = formEl.querySelector(`[name="${f.key}"]`);
    let val = el.value.trim();
    if (val === '') {
      values[f.key] = null;
    } else if (f.type === 'number') {
      values[f.key] = Number(val);
    } else {
      values[f.key] = val;
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
              ${listColumns.map((c) => `<td>${escapeHtml(row[c.key])}</td>`).join('')}
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
    const area = container.querySelector('#crud-form-area');
    const formHtml = await renderForm(editFields, row);
    area.innerHTML = `
      <form id="crud-edit-form" class="crud-form">
        <h3>แก้ไขรายการ #${editingId}</h3>
        ${formHtml}
        <button type="submit">บันทึกการแก้ไข</button>
        <button type="button" id="crud-cancel-edit">ยกเลิก</button>
      </form>
    `;
    area.querySelector('#crud-edit-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, editFields);
        await api.put(`${endpoint}/${editingId}`, values);
        await load();
      } catch (err) {
        alert(err.message);
      }
    });
    area.querySelector('#crud-cancel-edit').addEventListener('click', () => load());
  }

  await load();
}
