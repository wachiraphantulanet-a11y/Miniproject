// จัดการผู้ใช้งาน — admin เท่านั้น (ทั้ง route ระดับ frontend และ backend บังคับ)

const userCreateFields = [
  { key: 'username', label: 'ชื่อผู้ใช้', type: 'text', required: true },
  { key: 'password', label: 'รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)', type: 'password', required: true },
  { key: 'fullName', label: 'ชื่อ-นามสกุล', type: 'text', required: true },
  { key: 'email', label: 'อีเมล', type: 'text' },
  { key: 'phone', label: 'เบอร์โทร', type: 'text' },
  {
    key: 'roleId', label: 'บทบาท', type: 'select', required: true,
    options: () => loadOptions('/roles', 'role_id', (r) => r.role_name),
  },
];

const userEditFields = [
  { key: 'fullName', label: 'ชื่อ-นามสกุล', type: 'text' },
  { key: 'email', label: 'อีเมล', type: 'text' },
  { key: 'phone', label: 'เบอร์โทร', type: 'text' },
  {
    key: 'roleId', label: 'บทบาท', type: 'select',
    options: () => loadOptions('/roles', 'role_id', (r) => r.role_name),
  },
  {
    key: 'status', label: 'สถานะ', type: 'select',
    options: [{ value: 'active', label: 'active' }, { value: 'inactive', label: 'inactive (ระงับบัญชี)' }],
  },
];

async function renderUsers(container) {
  if (!auth.hasRole('admin')) {
    container.innerHTML = '<p class="error">หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>';
    return;
  }

  async function load() {
    const rows = await api.get('/users');
    container.innerHTML = `
      <h2>จัดการผู้ใช้งาน</h2>
      <div id="user-form-area"></div>
      <table class="data-table">
        <thead><tr><th>ID</th><th>ชื่อผู้ใช้</th><th>ชื่อ-นามสกุล</th><th>บทบาท</th><th>สถานะ</th><th>จัดการ</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr data-id="${r.user_id}">
              <td>${r.user_id}</td>
              <td>${escapeHtml(r.username)}</td>
              <td>${escapeHtml(r.full_name)}</td>
              <td>${escapeHtml(r.role_name)}</td>
              <td><span class="badge badge-${r.status}">${r.status}</span></td>
              <td class="row-actions">
                <button type="button" class="btn-edit">แก้ไข</button>
                <button type="button" class="btn-reset-pw">ตั้งรหัสผ่านใหม่</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const formArea = container.querySelector('#user-form-area');
    const createFormHtml = await renderForm(userCreateFields);
    formArea.innerHTML = `
      <form id="user-create-form" class="crud-form">
        <h3>เพิ่มผู้ใช้งานใหม่</h3>
        ${createFormHtml}
        <button type="submit">บันทึก</button>
      </form>
    `;
    formArea.querySelector('#user-create-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const values = readFormValues(e.target, userCreateFields);
        await api.post('/users', values);
        await load();
      } catch (err) {
        alert(err.message);
      }
    });

    container.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const row = rows.find((r) => String(r.user_id) === id);
        const formHtml = await renderForm(userEditFields, { ...row, roleId: row.role_id });
        formArea.innerHTML = `
          <form id="user-edit-form" class="crud-form">
            <h3>แก้ไขผู้ใช้งาน #${id}</h3>
            ${formHtml}
            <button type="submit">บันทึกการแก้ไข</button>
            <button type="button" id="user-cancel-edit">ยกเลิก</button>
          </form>
        `;
        formArea.querySelector('#user-edit-form').addEventListener('submit', async (e) => {
          e.preventDefault();
          try {
            const values = readFormValues(e.target, userEditFields);
            await api.put(`/users/${id}`, values);
            await load();
          } catch (err) {
            alert(err.message);
          }
        });
        formArea.querySelector('#user-cancel-edit').addEventListener('click', load);
      });
    });

    container.querySelectorAll('.btn-reset-pw').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.closest('tr').dataset.id;
        const newPassword = prompt('กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร):');
        if (!newPassword) return;
        try {
          await api.put(`/users/${id}/password`, { newPassword });
          alert('ตั้งรหัสผ่านใหม่สำเร็จ');
        } catch (err) {
          alert(err.message);
        }
      });
    });
  }

  await load();
}
