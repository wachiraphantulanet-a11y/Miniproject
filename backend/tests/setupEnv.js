// รันก่อน test framework ติดตั้งในทุกไฟล์ทดสอบ — สลับไปใช้ฐานข้อมูลทดสอบแยกจาก dev
// เพื่อไม่ให้ automated test ไปยุ่งกับข้อมูลจริงใน mango_breeding_db
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

process.env.DB_NAME = `${process.env.DB_NAME || 'mango_breeding_db'}_test`;
process.env.NODE_ENV = 'test';
