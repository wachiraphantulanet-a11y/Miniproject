# Backend — ระบบจัดการการเพาะพันธุ์มะม่วง (Phase 1: Foundation)

Node.js + Express + MySQL (mysql2) — ครอบคลุม **DFD Process 1 (เข้าสู่ระบบ/ตรวจสอบสิทธิ์)**
และส่วนจัดการ**ข้อมูลผู้ใช้งาน (D1)** ใน Process 2 ตามแผนที่วางไว้ (Phase 1)

## โครงสร้างโปรเจกต์
```
backend/
├── src/
│   ├── config/db.js              # MySQL connection pool
│   ├── middleware/authMiddleware.js  # ตรวจ JWT + RBAC (authenticate, authorize)
│   ├── controllers/
│   │   ├── authController.js     # login, me
│   │   ├── userController.js     # CRUD ผู้ใช้งาน (admin เท่านั้น)
│   │   └── roleController.js     # ดึงรายการ role
│   ├── routes/                   # ผูก route กับ controller
│   ├── utils/
│   │   ├── token.js               # sign/verify JWT
│   │   └── activityLog.js         # เขียน audit trail ลง activity_logs
│   ├── scripts/seedAdmin.js       # ตั้งรหัสผ่านจริงให้ user 'admin' ครั้งแรก
│   ├── app.js                     # ตั้งค่า Express app + route ทั้งหมด
│   └── server.js                  # จุดเริ่มรัน server
├── .env.example
└── package.json
```

## วิธีติดตั้งและรัน

1. ติดตั้ง dependency
   ```
   npm install
   ```

2. คัดลอกไฟล์ env แล้วแก้ค่าตามเครื่องของคุณ
   ```
   cp .env.example .env
   ```
   แก้ `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` ให้ตรงกับฐานข้อมูลที่ import
   `schema.sql` ไปแล้ว **(แนะนำ: อย่าใช้ user `root` ตรงๆ ให้สร้าง user แยกสำหรับแอปเช่น**
   `CREATE USER 'mango_app'@'%' IDENTIFIED BY 'รหัสผ่านของคุณ'; GRANT ALL ON mango_breeding_db.* TO 'mango_app'@'%';`)

3. ตั้งรหัสผ่านจริงให้ user `admin` (ใน schema.sql ตั้งไว้เป็น placeholder เท่านั้น)
   ```
   npm run seed:admin -- Admin@12345
   ```

4. รัน server
   ```
   npm run dev     # โหมด dev (auto reload ด้วย nodemon)
   npm start        # โหมด production
   ```
   ถ้าเชื่อมต่อฐานข้อมูลสำเร็จจะเห็น: `[Server] กำลังทำงานที่พอร์ต 3000`

## ⚠️ สำคัญ: แก้บั๊ก encoding ภาษาไทยใน schema.sql แล้ว
ระหว่างพัฒนาพบว่าถ้า import `schema.sql` ด้วยคำสั่ง `mysql -u root < schema.sql` ผ่าน command line
(ไม่ใช่ MySQL Workbench GUI) ข้อความภาษาไทยในข้อมูลเริ่มต้น (roles, admin) จะเพี้ยน (mojibake)
เพราะ mysql client บางตัว default เป็น `latin1` โดยไม่บอก แม้ไฟล์และฐานข้อมูลจะเป็น utf8mb4 อยู่แล้ว

**ได้แก้ไขแล้ว** โดยเพิ่ม `SET NAMES utf8mb4;` ไว้ต้นไฟล์ `schema.sql`
**ถ้าคุณ import schema ไปแล้วก่อนหน้านี้ ให้ตรวจสอบข้อมูลของคุณ:**
```sql
SELECT HEX(full_name) FROM users WHERE user_id = 1;
```
ถ้าค่าที่ได้เมื่อแปลงกลับเป็น UTF-8 แล้วไม่ตรงกับ "ผู้ดูแลระบบเริ่มต้น" ให้ **ลบฐานข้อมูลแล้ว
import schema.sql ตัวใหม่ (ที่มี `SET NAMES utf8mb4;` แล้ว) ใหม่อีกครั้ง** จะปลอดภัยที่สุด

## API ที่มีอยู่ตอนนี้ (Phase 1)

| Method | Path | สิทธิ์ | คำอธิบาย |
|---|---|---|---|
| GET | `/api/health` | ไม่ต้อง login | เช็คว่า server/DB พร้อมทำงาน |
| POST | `/api/auth/login` | ไม่ต้อง login | เข้าสู่ระบบ → คืน JWT token |
| GET | `/api/auth/me` | ต้อง login | ดูข้อมูลของผู้ใช้ปัจจุบัน |
| GET | `/api/roles` | ต้อง login | รายการ role (ใช้ทำ dropdown) |
| GET | `/api/users` | admin เท่านั้น | รายชื่อผู้ใช้งานทั้งหมด |
| GET | `/api/users/:id` | admin เท่านั้น | ข้อมูลผู้ใช้งานรายคน |
| POST | `/api/users` | admin เท่านั้น | สร้างผู้ใช้งานใหม่ |
| PUT | `/api/users/:id` | admin เท่านั้น | แก้ไขข้อมูล/เปลี่ยน role/ระงับบัญชี |
| PUT | `/api/users/:id/password` | admin เท่านั้น | ตั้งรหัสผ่านใหม่ให้ผู้ใช้ |

### ตัวอย่างการเรียกใช้ (curl)
```bash
# login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@12345"}'

# เอา token จาก response ด้านบนมาใช้เรียก endpoint ที่ต้อง login
curl http://localhost:3000/api/users \
  -H "Authorization: Bearer <token>"
```

## สิ่งที่ทดสอบแล้วว่าทำงานถูกต้อง (ทดสอบจริงระหว่างพัฒนา)
- login รหัสผ่านผิด → 401
- login ถูกต้อง → 200 + JWT token
- เข้าถึง endpoint ที่ต้อง login โดยไม่มี token → 401
- เข้าถึง endpoint เฉพาะ admin ด้วย role อื่น (เช่น owner/staff) → 403 (RBAC ทำงานถูกต้อง)
- admin สร้างผู้ใช้ใหม่ → บันทึกลง `activity_logs` อัตโนมัติ
- admin ระงับบัญชี (status = inactive) → บัญชีนั้น login ไม่ได้อีก (403)
- รหัสผ่านเก็บเป็น bcrypt hash เท่านั้น ไม่เก็บ plaintext

## ยังไม่ได้ทำ (รอ Phase ถัดไปตามแผน)
- Process 2 ส่วนพันธุ์มะม่วง/ต้นพ่อ-แม่พันธุ์ (D2, D3)
- Process 3–7 (แผนการเพาะพันธุ์, ผสมเกสร, เมล็ดพันธุ์, การดูแล, ประเมินคุณภาพ)
- Process 8 (รายงาน)
- Frontend (HTML/CSS/JS ตามที่ระบุในเอกสาร)
