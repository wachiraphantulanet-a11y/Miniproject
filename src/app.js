const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const roleRoutes = require('./routes/roleRoutes');
const varietyRoutes = require('./routes/varietyRoutes');
const parentTreeRoutes = require('./routes/parentTreeRoutes');
const breedingPlanRoutes = require('./routes/breedingPlanRoutes');
const pollinationRoutes = require('./routes/pollinationRoutes');
const fruitSetRoutes = require('./routes/fruitSetRoutes');
const seedRoutes = require('./routes/seedRoutes');
const seedlingRoutes = require('./routes/seedlingRoutes');
const careRoutes = require('./routes/careRoutes');
const pestDiseaseRoutes = require('./routes/pestDiseaseRoutes');
const qualityEvaluationRoutes = require('./routes/qualityEvaluationRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// เสิร์ฟไฟล์ frontend (SPA แบบ hash routing — ไม่ต้องมี route แยกฝั่ง server)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check — ใช้เช็คว่า server และ DB พร้อมทำงานหรือไม่
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/varieties', varietyRoutes);
app.use('/api/parent-trees', parentTreeRoutes);
app.use('/api/breeding-plans', breedingPlanRoutes);
app.use('/api/pollinations', pollinationRoutes);
app.use('/api/fruit-sets', fruitSetRoutes);
app.use('/api/seeds', seedRoutes);
app.use('/api/seedlings', seedlingRoutes);
app.use('/api/care-records', careRoutes);
app.use('/api/pest-disease-records', pestDiseaseRoutes);
app.use('/api/quality-evaluations', qualityEvaluationRoutes);
app.use('/api/reports', reportRoutes);

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
