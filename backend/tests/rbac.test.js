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

describe('พันธุ์มะม่วง + ต้นพ่อ-แม่พันธุ์ — เขียนได้เฉพาะ admin เท่านั้น', () => {
  it('owner สร้างพันธุ์มะม่วงไม่ได้ → 403', async () => {
    const res = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ varietyName: 'ไม่ควรสร้างได้' });
    expect(res.status).toBe(403);
  });

  it('staff สร้างพันธุ์มะม่วงไม่ได้ → 403', async () => {
    const res = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ varietyName: 'ไม่ควรสร้างได้เช่นกัน' });
    expect(res.status).toBe(403);
  });

  it('staff แก้ไข/ลบ พันธุ์มะม่วงไม่ได้ → 403', async () => {
    const put = await request(app)
      .put('/api/varieties/1')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ varietyName: 'แก้ไม่ได้' });
    expect(put.status).toBe(403);

    const del = await request(app).delete('/api/varieties/1').set('Authorization', `Bearer ${staffToken}`);
    expect(del.status).toBe(403);
  });

  it('staff สร้าง/แก้ไข ต้นพ่อ-แม่พันธุ์ไม่ได้ → 403', async () => {
    const create = await request(app)
      .post('/api/parent-trees')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ treeCode: `NOPE-${ts}`, treeType: 'father', varietyId: 1 });
    expect(create.status).toBe(403);

    const update = await request(app)
      .put('/api/parent-trees/1')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ location: 'แก้ไม่ได้' });
    expect(update.status).toBe(403);
  });

  it('owner และ staff อ่านรายการพันธุ์มะม่วง/ต้นพ่อ-แม่พันธุ์ได้ปกติ', async () => {
    const varietiesRes = await request(app).get('/api/varieties').set('Authorization', `Bearer ${ownerToken}`);
    expect(varietiesRes.status).toBe(200);

    const treesRes = await request(app).get('/api/parent-trees').set('Authorization', `Bearer ${staffToken}`);
    expect(treesRes.status).toBe(200);
  });

  it('admin สร้างพันธุ์มะม่วงได้', async () => {
    const res = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ varietyName: `พันธุ์ admin สร้าง ${ts}` });
    expect(res.status).toBe(201);
  });
});

describe('resource อื่นๆ — staff ยังเขียนได้ตามปกติ (ตรวจว่าไม่ได้ล็อกเกินขอบเขต)', () => {
  it('staff สร้างแผนการเพาะพันธุ์ได้ (D4 ไม่ได้ถูกจำกัดเพิ่ม)', async () => {
    // สิทธิ์เขียนพันธุ์มะม่วง/ต้นพ่อ-แม่พันธุ์ถูกจำกัดเหลือ admin แล้ว จึงต้องให้ admin เตรียมข้อมูลตั้งต้นก่อน
    const variety = await request(app)
      .post('/api/varieties')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ varietyName: `พันธุ์เตรียมทดสอบ RBAC ${ts}` });
    const father = await request(app)
      .post('/api/parent-trees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ treeCode: `RBAC-F-${ts}`, treeType: 'father', varietyId: variety.body.varietyId });
    const mother = await request(app)
      .post('/api/parent-trees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ treeCode: `RBAC-M-${ts}`, treeType: 'mother', varietyId: variety.body.varietyId });

    const res = await request(app)
      .post('/api/breeding-plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ planCode: `RBAC-PLAN-${ts}`, fatherTreeId: father.body.treeId, motherTreeId: mother.body.treeId });
    expect(res.status).toBe(201);
  });
});
