const request = require('supertest');
const { pool } = require('../src/config/db');
const { app, loginAsAdmin, TEST_ADMIN_PASSWORD } = require('./testUtils');

afterAll(async () => {
  await pool.end();
});

describe('GET /api/health', () => {
  it('ตอบ 200 พร้อมสถานะ ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('POST /api/auth/login', () => {
  it('รหัสผ่านผิด → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'ผิดแน่นอน' });
    expect(res.status).toBe(401);
  });

  it('username ไม่มีอยู่จริง → 401', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'no-such-user', password: 'anything' });
    expect(res.status).toBe(401);
  });

  it('login ถูกต้อง → 200 พร้อม token และข้อมูลผู้ใช้', async () => {
    const res = await request(app).post('/api/auth/login').send({ username: 'admin', password: TEST_ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.role).toBe('admin');
  });
});

describe('RBAC / token', () => {
  it('เข้าถึง endpoint ที่ต้อง login โดยไม่มี token → 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('token ผิดรูปแบบ/ปลอม → 401', async () => {
    const res = await request(app).get('/api/users').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/me คืนข้อมูลผู้ใช้ปัจจุบันเมื่อมี token ถูกต้อง', async () => {
    const token = await loginAsAdmin();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.username).toBe('admin');
    // ยืนยันว่า encoding ภาษาไทยไม่เพี้ยน (mojibake) — Recommendation ใน README
    expect(res.body.full_name).toBe('ผู้ดูแลระบบเริ่มต้น');
  });
});
