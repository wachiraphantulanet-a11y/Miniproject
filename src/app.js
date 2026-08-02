const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Health check — ใช้เช็คว่า server และ DB พร้อมทำงานหรือไม่
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);

// 404 handler — route ที่ไม่ตรงกับอะไรเลย
app.use((req, res) => {
  res.status(404).json({ message: 'ไม่พบ endpoint นี้' });
});

// Error handler กลาง — ดักข้อผิดพลาดที่ไม่ได้ถูกจัดการใน controller
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err);
  res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
});

module.exports = app;
