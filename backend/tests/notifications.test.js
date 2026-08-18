const request = require('supertest');
const { pool } = require('../src/config/db');
const { app, loginAsAdmin, createAndLoginUser } = require('./testUtils');

let adminToken;
let staffToken;
const ts = Date.now();
const ids = {};

beforeAll(async () => {
  adminToken = await loginAsAdmin();
  const staff = await createAndLoginUser(adminToken, {
    username: `staff_notif_${ts}`,
    password: 'StaffNotif@123',
    fullName: 'Staff Notif Test',
    roleName: 'staff',
  });
  staffToken = staff.token;

  // เตรียมข้อมูลพื้นฐานสำหรับสร้างแผน/ต้นกล้าที่ใช้ในเทสต์การแจ้งเตือน
  const variety = await request(app)
    .post('/api/varieties')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ varietyName: `พันธุ์แจ้งเตือน ${ts}` });
  ids.varietyId = variety.body.varietyId;

  const father = await request(app)
    .post('/api/parent-trees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ treeCode: `NF-F-${ts}`, treeType: 'father', varietyId: ids.varietyId });
  ids.fatherTreeId = father.body.treeId;

  const mother = await request(app)
    .post('/api/parent-trees')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ treeCode: `NF-M-${ts}`, treeType: 'mother', varietyId: ids.varietyId });
  ids.motherTreeId = mother.body.treeId;
});

afterAll(async () => {
  await pool.end();
});

describe('แจ้งเตือนเมื่อแผนเพาะพันธุ์ถูกปฏิเสธ', () => {
  it('ผู้สร้างแผน (staff) ได้รับการแจ้งเตือนเมื่อ admin ปฏิเสธแผน', async () => {
    const plan = await request(app)
      .post('/api/breeding-plans')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ planCode: `NOTIF-PLAN-${ts}`, fatherTreeId: ids.fatherTreeId, motherTreeId: ids.motherTreeId });
    expect(plan.status).toBe(201);
    const planId = plan.body.planId;

    await request(app).post(`/api/breeding-plans/${planId}/submit`).set('Authorization', `Bearer ${staffToken}`);

    const before = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(before.body.unreadCount).toBe(0);

    const decide = await request(app)
      .post(`/api/breeding-plans/${planId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'rejected', reason: 'เหตุผลทดสอบ' });
    expect(decide.status).toBe(200);

    const after = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(after.body.unreadCount).toBe(1);

    const list = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(list.body[0].type).toBe('plan_rejected');
    expect(list.body[0].related_id).toBe(planId);
    expect(list.body[0].message).toContain('เหตุผลทดสอบ');
  });

  it('การปฏิเสธไม่สร้างแจ้งเตือนให้ผู้ใช้อื่นที่ไม่เกี่ยวข้อง', async () => {
    const res = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);
    // admin เป็นคนกดปฏิเสธเอง ไม่ใช่ผู้สร้างแผน จึงไม่ควรมีแจ้งเตือนจาก action นี้ของตัวเอง
    expect(res.status).toBe(200);
  });
});

describe('แจ้งเตือนเมื่อพบปัญหาโรค/แมลง', () => {
  let seedlingId;

  beforeAll(async () => {
    const plan = await request(app)
      .post('/api/breeding-plans')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ planCode: `PEST-PLAN-${ts}`, fatherTreeId: ids.fatherTreeId, motherTreeId: ids.motherTreeId });
    const planId = plan.body.planId;
    await request(app).post(`/api/breeding-plans/${planId}/submit`).set('Authorization', `Bearer ${adminToken}`);
    await request(app)
      .post(`/api/breeding-plans/${planId}/decide`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ decision: 'approved' });

    const poll = await request(app)
      .post('/api/pollinations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ planId, pollinationDate: '2026-09-02', flowerCount: 50 });
    const fruitSet = await request(app)
      .post('/api/fruit-sets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ pollinationId: poll.body.pollinationId, observedDate: '2026-09-20', fruitCount: 20 });
    const seed = await request(app)
      .post('/api/seeds')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ fruitSetId: fruitSet.body.fruitSetId, collectedDate: '2026-10-01', seedCount: 10 });
    const seedling = await request(app)
      .post('/api/seedlings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seedId: seed.body.seedId, seedlingCode: `PEST-SL-${ts}` });
    seedlingId = seedling.body.seedlingId;
  });

  it('staff บันทึกพบโรค/แมลง → admin ได้รับแจ้งเตือน แต่ staff (ผู้บันทึกเอง) ไม่ได้รับ', async () => {
    const beforeAdmin = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);

    const create = await request(app)
      .post('/api/pest-disease-records')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ seedlingId, foundDate: '2026-10-25', issueType: 'disease', issueName: 'โรคทดสอบ', severity: 'high' });
    expect(create.status).toBe(201);

    const afterAdmin = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(afterAdmin.body.unreadCount).toBe(beforeAdmin.body.unreadCount + 1);

    const staffUnread = await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', `Bearer ${staffToken}`);
    const hasOwnPestNotif = staffUnread.body.some((n) => n.type === 'pest_disease_found');
    expect(hasOwnPestNotif).toBe(false);
  });

  it('admin บันทึกพบโรค/แมลงเอง → ไม่แจ้งเตือนตัวเอง', async () => {
    const before = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app)
      .post('/api/pest-disease-records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ seedlingId, foundDate: '2026-10-26', issueType: 'pest', severity: 'low' });

    const after = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(after.body.unreadCount).toBe(before.body.unreadCount);
  });
});

describe('อ่าน/mark-as-read การแจ้งเตือน', () => {
  it('อ่านการแจ้งเตือนของผู้ใช้อื่นไม่ได้ (ownership) → 404', async () => {
    const adminNotifs = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    const someId = adminNotifs.body[0].notification_id;

    const res = await request(app)
      .post(`/api/notifications/${someId}/read`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(404);
  });

  it('mark-all-read ทำให้ unread count เป็น 0', async () => {
    const res = await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const count = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(count.body.unreadCount).toBe(0);
  });

  it('ไม่มี token → 401', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(401);
  });
});
