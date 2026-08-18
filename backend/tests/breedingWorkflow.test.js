const request = require('supertest');
const { pool } = require('../src/config/db');
const { app, loginAsAdmin } = require('./testUtils');

let token;
const ts = Date.now();

// เก็บ id ที่สร้างระหว่างเทสต์ไว้ใช้ข้ามขั้นตอน (แต่ละ test ใน describe นี้พึ่งพากันตามลำดับ
// เพราะจำลอง flow จริงของระบบ D2 -> D9 เหมือนกับที่ทดสอบ end-to-end ด้วยมือไปแล้ว)
const ids = {};

beforeAll(async () => {
  token = await loginAsAdmin();
});

afterAll(async () => {
  await pool.end();
});

function auth(req) {
  return req.set('Authorization', `Bearer ${token}`);
}

describe('D2-D3: พันธุ์มะม่วง และต้นพ่อ-แม่พันธุ์', () => {
  it('สร้างพันธุ์มะม่วงใหม่ได้', async () => {
    const res = await auth(request(app).post('/api/varieties')).send({
      varietyName: `พันธุ์ทดสอบ ${ts}`,
      taste: 'หวาน',
    });
    expect(res.status).toBe(201);
    ids.varietyId = res.body.varietyId;
  });

  it('varietyName ว่าง → 400', async () => {
    const res = await auth(request(app).post('/api/varieties')).send({});
    expect(res.status).toBe(400);
  });

  it('สร้างต้นพ่อพันธุ์และต้นแม่พันธุ์ได้', async () => {
    const father = await auth(request(app).post('/api/parent-trees')).send({
      treeCode: `F-${ts}`,
      treeType: 'father',
      varietyId: ids.varietyId,
    });
    expect(father.status).toBe(201);
    ids.fatherTreeId = father.body.treeId;

    const mother = await auth(request(app).post('/api/parent-trees')).send({
      treeCode: `M-${ts}`,
      treeType: 'mother',
      varietyId: ids.varietyId,
    });
    expect(mother.status).toBe(201);
    ids.motherTreeId = mother.body.treeId;
  });

  it('treeType ไม่ถูกต้อง → 400', async () => {
    const res = await auth(request(app).post('/api/parent-trees')).send({
      treeCode: `BAD-${ts}`,
      treeType: 'invalid',
      varietyId: ids.varietyId,
    });
    expect(res.status).toBe(400);
  });
});

describe('D4: แผนการเพาะพันธุ์ + workflow อนุมัติ', () => {
  it('สร้างแผนเป็น draft', async () => {
    const res = await auth(request(app).post('/api/breeding-plans')).send({
      planCode: `PLAN-${ts}`,
      fatherTreeId: ids.fatherTreeId,
      motherTreeId: ids.motherTreeId,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    ids.planId = res.body.planId;
  });

  it('พ่อ-แม่พันธุ์เป็นต้นเดียวกัน → 400', async () => {
    const res = await auth(request(app).post('/api/breeding-plans')).send({
      planCode: `BAD-PLAN-${ts}`,
      fatherTreeId: ids.fatherTreeId,
      motherTreeId: ids.fatherTreeId,
    });
    expect(res.status).toBe(400);
  });

  it('บันทึกผสมเกสรไม่ได้ถ้าแผนยังไม่อนุมัติ → 409', async () => {
    const res = await auth(request(app).post('/api/pollinations')).send({
      planId: ids.planId,
      pollinationDate: '2026-09-02',
    });
    expect(res.status).toBe(409);
  });

  it('submit แผนเข้าสถานะ pending_approval', async () => {
    const res = await auth(request(app).post(`/api/breeding-plans/${ids.planId}/submit`));
    expect(res.status).toBe(200);
  });

  it('decide ด้วย decision ไม่ถูกต้อง → 400', async () => {
    const res = await auth(request(app).post(`/api/breeding-plans/${ids.planId}/decide`)).send({
      decision: 'maybe',
    });
    expect(res.status).toBe(400);
  });

  it('อนุมัติแผนสำเร็จ', async () => {
    const res = await auth(request(app).post(`/api/breeding-plans/${ids.planId}/decide`)).send({
      decision: 'approved',
    });
    expect(res.status).toBe(200);
  });

  it('อนุมัติซ้ำแผนที่ไม่ได้อยู่ในสถานะ pending_approval → 409', async () => {
    const res = await auth(request(app).post(`/api/breeding-plans/${ids.planId}/decide`)).send({
      decision: 'approved',
    });
    expect(res.status).toBe(409);
  });
});

describe('D5: ผสมเกสร และการติดผล', () => {
  it('บันทึกผสมเกสรได้เมื่อแผนอนุมัติแล้ว', async () => {
    const res = await auth(request(app).post('/api/pollinations')).send({
      planId: ids.planId,
      pollinationDate: '2026-09-02',
      flowerCount: 100,
    });
    expect(res.status).toBe(201);
    ids.pollinationId = res.body.pollinationId;
  });

  it('บันทึกการติดผลและคำนวณ fruitSetRate อัตโนมัติ', async () => {
    const res = await auth(request(app).post('/api/fruit-sets')).send({
      pollinationId: ids.pollinationId,
      observedDate: '2026-09-20',
      fruitCount: 40,
    });
    expect(res.status).toBe(201);
    expect(Number(res.body.fruitSetRate)).toBeCloseTo(40, 1);
    ids.fruitSetId = res.body.fruitSetId;
  });
});

describe('D6: เมล็ดพันธุ์และต้นกล้า', () => {
  it('บันทึกเมล็ดพันธุ์ได้', async () => {
    const res = await auth(request(app).post('/api/seeds')).send({
      fruitSetId: ids.fruitSetId,
      collectedDate: '2026-10-01',
      seedCount: 20,
    });
    expect(res.status).toBe(201);
    ids.seedId = res.body.seedId;
  });

  it('qualityGrade นอกเหนือ A-D → 400', async () => {
    const res = await auth(request(app).post('/api/seeds')).send({
      fruitSetId: ids.fruitSetId,
      qualityGrade: 'E',
    });
    expect(res.status).toBe(400);
  });

  it('สร้างต้นกล้าได้ (สถานะเริ่มต้น growing)', async () => {
    const res = await auth(request(app).post('/api/seedlings')).send({
      seedId: ids.seedId,
      seedlingCode: `SL-${ts}`,
      germinationDate: '2026-10-15',
    });
    expect(res.status).toBe(201);
    expect(res.body.currentStatus).toBe('growing');
    ids.seedlingId = res.body.seedlingId;
  });
});

describe('D7-D8: การดูแล และปัญหาโรค/แมลง', () => {
  it('ประเมินคุณภาพไม่ได้ถ้ายังไม่มีข้อมูลการดูแล → 409', async () => {
    const res = await auth(request(app).post('/api/quality-evaluations')).send({
      seedlingId: ids.seedlingId,
      evaluationDate: '2026-11-01',
      overallGrade: 'A',
    });
    expect(res.status).toBe(409);
  });

  it('บันทึกการดูแลได้', async () => {
    const res = await auth(request(app).post('/api/care-records')).send({
      seedlingId: ids.seedlingId,
      careDate: '2026-10-20',
      activityType: 'รดน้ำ',
      heightCm: 15,
    });
    expect(res.status).toBe(201);
  });

  it('บันทึกปัญหาโรค/แมลงได้', async () => {
    const res = await auth(request(app).post('/api/pest-disease-records')).send({
      seedlingId: ids.seedlingId,
      foundDate: '2026-10-25',
      issueType: 'pest',
      severity: 'low',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('open');
  });

  it('issueType ไม่ถูกต้อง → 400', async () => {
    const res = await auth(request(app).post('/api/pest-disease-records')).send({
      seedlingId: ids.seedlingId,
      foundDate: '2026-10-25',
      issueType: 'ผี',
    });
    expect(res.status).toBe(400);
  });
});

describe('D9: ประเมินคุณภาพต้นกล้า', () => {
  it('สร้างผลประเมิน (เข้าสถานะ pending_approval ทันที)', async () => {
    const res = await auth(request(app).post('/api/quality-evaluations')).send({
      seedlingId: ids.seedlingId,
      evaluationDate: '2026-11-01',
      overallGrade: 'A',
      overallScore: 90,
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_approval');
    ids.evaluationId = res.body.evaluationId;
  });

  it('อนุมัติผลประเมิน → ต้นกล้าเปลี่ยนสถานะเป็น passed', async () => {
    const decideRes = await auth(request(app).post(`/api/quality-evaluations/${ids.evaluationId}/decide`)).send({
      decision: 'approved',
    });
    expect(decideRes.status).toBe(200);

    const seedlingRes = await auth(request(app).get(`/api/seedlings/${ids.seedlingId}`));
    expect(seedlingRes.body.current_status).toBe('passed');
  });
});

describe('Process 8: รายงาน', () => {
  it('GET /api/reports/summary คืนข้อมูลภาพรวม', async () => {
    const res = await auth(request(app).get('/api/reports/summary'));
    expect(res.status).toBe(200);
    expect(res.body.varieties.total).toBeGreaterThan(0);
  });

  it('GET /api/reports/seedling-traceability/:id ตรวจสอบย้อนกลับได้ครบสาย', async () => {
    const res = await auth(request(app).get(`/api/reports/seedling-traceability/${ids.seedlingId}`));
    expect(res.status).toBe(200);
    expect(res.body.plan_id).toBe(ids.planId);
    expect(res.body.father_tree_id).toBe(ids.fatherTreeId);
    expect(res.body.mother_tree_id).toBe(ids.motherTreeId);
  });

  it('GET /api/activity-logs (admin) มี log จากขั้นตอนที่ผ่านมา', async () => {
    const res = await auth(request(app).get('/api/activity-logs'));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
