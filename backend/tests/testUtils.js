const request = require('supertest');
const app = require('../src/app');

// ต้องตรงกับรหัสผ่านที่ tests/globalSetup.js ตั้งให้ user 'admin' ในฐานข้อมูลทดสอบ
const TEST_ADMIN_PASSWORD = 'Test@12345';

async function loginAs(username, password) {
  const res = await request(app).post('/api/auth/login').send({ username, password });
  if (res.status !== 200) {
    throw new Error(`login ล้มเหลวสำหรับ ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.token;
}

async function loginAsAdmin() {
  return loginAs('admin', TEST_ADMIN_PASSWORD);
}

/** สร้างผู้ใช้ใหม่ด้วยสิทธิ์ admin แล้ว login คืน token ของผู้ใช้ใหม่นั้น */
async function createAndLoginUser(adminToken, { username, password, fullName, roleName }) {
  const rolesRes = await request(app).get('/api/roles').set('Authorization', `Bearer ${adminToken}`);
  const role = rolesRes.body.find((r) => r.role_name === roleName);
  if (!role) throw new Error(`ไม่พบ role ชื่อ ${roleName}`);

  const createRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ username, password, fullName, roleId: role.role_id });
  if (createRes.status !== 201) {
    throw new Error(`สร้างผู้ใช้ ${username} ล้มเหลว: ${createRes.status} ${JSON.stringify(createRes.body)}`);
  }

  const token = await loginAs(username, password);
  return { token, userId: createRes.body.userId };
}

module.exports = { app, loginAs, loginAsAdmin, createAndLoginUser, TEST_ADMIN_PASSWORD };
