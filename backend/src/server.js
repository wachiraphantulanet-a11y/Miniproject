require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');

const PORT = process.env.PORT || 3000;

(async () => {
  try {
    await testConnection(); // เช็คว่าเชื่อมต่อ DB ได้ก่อน ค่อย start server
    app.listen(PORT, () => {
      console.log(`[Server] กำลังทำงานที่พอร์ต ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error('[Server] ไม่สามารถ start server ได้ เนื่องจากเชื่อมต่อฐานข้อมูลไม่สำเร็จ');
    process.exit(1);
  }
})();
