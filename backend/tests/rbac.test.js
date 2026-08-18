const request = require('supertest');
const { pool } = require('../src/config/db');
const { app, loginAsAdmin, createAndLoginUser } = require('./testUtils');

let adminToken;
let staffToken;
let ownerToken;
const ts = Date.now();

beforeAll(async () => {
  adminToken = await loginAsAdmin();
  staffToken = (
    await createAndLoginUser(adminToken, {
      username: `staff_rbac_${ts}`,
      password: 'StaffRbac@123',
      fullName: 'Staff RBAC Test',
      roleName: 'staff',
    })
  ).token;
  ownerToken = (
    await createAndLoginUser(adminToken, {
      username: `owner_rbac_${ts}`,
      password: 'OwnerRbac@123',
      fullName: 'Owner RBAC Test',
      roleName: 'owner',
    })
  ).token;
});

afterAll(async () => {
  await pool.end();
});

describe('จัดการผู้ใช้งาน — admin เท่านั้น', () => {
  it('staff เข้า GET /api/users → 403', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });

  it('owner เข้า GET /api/users → 403', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(403);
  });

  it('admin เข้า GET /api/users → 200', async () => {
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  it('admin ระงับบัญชีผู้ใช้ (status = inactive) แล้วผู้ใช้นั้น login ไม่ได้อีก', async () => {
    const created = await createAndLoginUser(adminToken, {
      username: `to_suspend_${ts}`,
      password: 'ToSuspend@123',
      fullName: 'To Suspend',
      roleName: 'staff',
    });

    const suspend = await request(app)
      .put(`/api/users/${created.userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'inactive' });
    expect(suspend.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: `to_suspend_${ts}`, password: 'ToSuspend@123' });
    expect(login.status).toBe(403);
  });
});

describe('อนุมัติ/ปฏิเสธ — admin, owner เท่านั้น', () => {
  it('staff เรียก decide แผนเพาะพันธุ์ → 403', async () => {
    const res = await request(app)
      .post('/api/breeding-plans/1/decide')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ decision: 'approved' });
    expect(res.status).toBe(403);
  });

  it('owner เรียก decide แผนเพาะพันธุ์ (ไม่ใช่ 403) — ผ่านชั้น authorize ได้', async () => {
    const res = await request(app)
      .post('/api/breeding-plans/999999/decide')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ decision: 'approved' });
    // ผ่าน RBAC ได้ แต่ plan ไม่มีอยู่จริง จึงควรเป็น 404 ไม่ใช่ 403
    expect(res.status).toBe(404);
  });
});

describe('เขียนข้อมูล — admin, staff เท่านั้น (owner อ่านได้อย่างเดียว)', () => {
  it('owner สร้างพันธุ์มะม่วงไม่ได้ → 403', async () => {
    const res = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ varietyName: 'ไม่ควรสร้างได้' });
    expect(res.status).toBe(403);
  });

  it('owner อ่านรายการพันธุ์มะม่วงได้', async () => {
    const res = await request(app).get('/api/varieties').set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
  });

  it('staff สร้างพันธุ์มะม่วงได้', async () => {
    const res = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ varietyName: `พันธุ์ staff สร้าง ${ts}` });
    expect(res.status).toBe(201);
  });
});
