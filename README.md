# ระบบจัดการการเพาะพันธุ์มะม่วง (Mango Breeding Management System)

Node.js + Express + MySQL (mysql2) เป็น backend และ HTML5/CSS3/JavaScript (vanilla, SPA) เป็น
frontend — ครอบคลุมครบทั้ง 8 process ตาม DFD Level 1 (D1–D9)

## โครงสร้างโปรเจกต์
```
Miniproject/
├── src/                                # Backend
│   ├── config/db.js                    # MySQL connection pool
│   ├── middleware/authMiddleware.js    # ตรวจ JWT + RBAC (authenticate, authorize)
│   ├── controllers/
│   │   ├── authController.js           # login, me                         (Process 1, D1)
│   │   ├── userController.js           # CRUD ผู้ใช้งาน (admin เท่านั้น)      (Process 1, D1)
│   │   ├── roleController.js           # ดึงรายการ role
│   │   ├── varietyController.js        # CRUD พันธุ์มะม่วง                   (Process 2, D2)
│   │   ├── parentTreeController.js     # CRUD ต้นพ่อ-แม่พันธุ์                (Process 2, D3)
│   │   ├── breedingPlanController.js   # แผนการเพาะพันธุ์ + อนุมัติ/ปฏิเสธ    (Process 3, D4)
│   │   ├── pollinationController.js    # บันทึกการผสมเกสร                    (Process 4, D5)
│   │   ├── fruitSetController.js       # บันทึกการติดผล                      (Process 4, D5)
│   │   ├── seedController.js           # บันทึกเมล็ดพันธุ์                    (Process 5, D6)
│   │   ├── seedlingController.js       # บันทึกต้นกล้า                       (Process 5, D6)
│   │   ├── careController.js           # บันทึกการดูแล/เจริญเติบโต            (Process 6, D7)
│   │   ├── pestDiseaseController.js    # บันทึกปัญหาโรค/แมลง                 (Process 6, D8)
│   │   ├── qualityEvaluationController.js # ประเมินคุณภาพ + อนุมัติ/ปฏิเสธ    (Process 7, D9)
│   │   └── reportController.js         # รายงาน/สรุปข้อมูล                   (Process 8)
│   ├── routes/                         # ผูก route กับ controller (ไฟล์ละ 1 resource)
│   ├── utils/
│   │   ├── token.js                    # sign/verify JWT
│   │   └── activityLog.js              # เขียน audit trail ลง activity_logs
│   ├── scripts/seedAdmin.js            # ตั้งรหัสผ่านจริงให้ user 'admin' ครั้งแรก
│   ├── app.js                          # ตั้งค่า Express app + route ทั้งหมด + serve frontend
│   └── server.js                       # จุดเริ่มรัน server
├── public/                             # Frontend (static, SPA ด้วย hash routing)
│   ├── index.html                      # app shell เดียว ทุกหน้าโหลดผ่านนี้
│   ├── css/style.css
│   └── js/
│       ├── api.js                      # fetch wrapper แนบ JWT + จัดการ error กลาง
│       ├── auth.js                     # login/logout, เก็บ token ใน localStorage
│       ├── router.js                   # hash-based router
│       ├── crud.js                     # generic list+form component ใช้ซ้ำกับหลาย resource
│       ├── app.js                      # จุดเริ่มของ frontend: nav + ผูก route ทั้งหมด
│       └── views/                      # ฟังก์ชัน render ของแต่ละหน้า
├── schema.sql                          # โครงสร้างฐานข้อมูล MySQL (D1–D9 + audit log)
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

4. รัน server (ให้บริการทั้ง REST API และไฟล์ frontend ใน `public/` จาก server เดียวกัน)
   ```
   npm run dev     # โหมด dev (auto reload ด้วย nodemon)
   npm start        # โหมด production
   ```
   ถ้าเชื่อมต่อฐานข้อมูลสำเร็จจะเห็น: `[Server] กำลังทำงานที่พอร์ต 3000`
   เปิดเบราว์เซอร์ไปที่ `http://localhost:3000` เพื่อใช้งานหน้าเว็บ

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

## API ที่มีอยู่ตอนนี้ (ครบทั้ง 8 Process)

สิทธิ์: **login** = ต้อง login (role ใดก็ได้) · **admin/staff** = เฉพาะ 2 role นี้เขียนได้ ·
**admin/owner** = เฉพาะ 2 role นี้อนุมัติ/ปฏิเสธได้

| Process | Method | Path | สิทธิ์ | คำอธิบาย |
|---|---|---|---|---|
| — | GET | `/api/health` | ไม่ต้อง login | เช็คว่า server/DB พร้อมทำงาน |
| 1 | POST | `/api/auth/login` | ไม่ต้อง login | เข้าสู่ระบบ → คืน JWT token |
| 1 | GET | `/api/auth/me` | login | ดูข้อมูลของผู้ใช้ปัจจุบัน |
| 1 | GET | `/api/roles` | login | รายการ role (ใช้ทำ dropdown) |
| 2 (D1) | GET/POST/PUT | `/api/users`, `/api/users/:id`, `/api/users/:id/password` | admin | จัดการผู้ใช้งาน |
| 2 (D2) | GET/POST/PUT/DELETE | `/api/varieties`, `/api/varieties/:id` | login / admin,staff | พันธุ์มะม่วง |
| 2 (D3) | GET/POST/PUT | `/api/parent-trees`, `/api/parent-trees/:id` | login / admin,staff | ต้นพ่อ-แม่พันธุ์ (ลบไม่ได้ ใช้เปลี่ยน status แทน) |
| 3 (D4) | GET/POST/PUT | `/api/breeding-plans`, `/:id` | login / admin,staff | สร้าง/แก้ไขแผน (แก้ได้เฉพาะ draft/rejected) |
| 3 (D4) | POST | `/api/breeding-plans/:id/submit` | admin,staff | ส่งแผนรออนุมัติ |
| 3 (D4) | POST | `/api/breeding-plans/:id/decide` | admin,owner | อนุมัติ/ปฏิเสธแผน (บันทึกประวัติทุกรอบ) |
| 4 (D5) | GET/POST/PUT | `/api/pollinations`, `/api/fruit-sets` | login / admin,staff | บันทึกผสมเกสร (เฉพาะแผนที่ approved) และติดผล |
| 5 (D6) | GET/POST/PUT | `/api/seeds`, `/api/seedlings` | login / admin,staff | บันทึกเมล็ดพันธุ์และต้นกล้า |
| 6 (D7) | GET/POST/PUT | `/api/care-records` | login / admin,staff | บันทึกการดูแล/เจริญเติบโต |
| 6 (D8) | GET/POST/PUT | `/api/pest-disease-records` | login / admin,staff | บันทึกโรค/แมลง (ผูกกับต้นกล้า + care record ได้) |
| 7 (D9) | GET/POST/PUT | `/api/quality-evaluations`, `/:id` | login / admin,staff | ประเมินคุณภาพ (แก้ได้เฉพาะตอน rejected) |
| 7 (D9) | POST | `/api/quality-evaluations/:id/submit` | admin,staff | ส่งผลประเมินกลับเข้ารออนุมัติ |
| 7 (D9) | POST | `/api/quality-evaluations/:id/decide` | admin,owner | อนุมัติ/ปฏิเสธผลประเมิน |
| 8 | GET | `/api/reports/summary` | login | ภาพรวม dashboard ทั้งระบบ |
| 8 | GET | `/api/reports/breeding-plans` | login | รายงานแผน (filter status/ช่วงวันที่) |
| 8 | GET | `/api/reports/pest-disease` | login | รายงานโรค/แมลง (filter) |
| 8 | GET | `/api/reports/seedling-traceability`, `/:id` | login | ตรวจสอบย้อนกลับแหล่งที่มาต้นกล้าเต็มสาย |

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

## สิ่งที่ทดสอบแล้วว่าทำงานถูกต้อง (ทดสอบจริงระหว่างพัฒนา — Phase 1)
- login รหัสผ่านผิด → 401
- login ถูกต้อง → 200 + JWT token
- เข้าถึง endpoint ที่ต้อง login โดยไม่มี token → 401
- เข้าถึง endpoint เฉพาะ admin ด้วย role อื่น (เช่น owner/staff) → 403 (RBAC ทำงานถูกต้อง)
- admin สร้างผู้ใช้ใหม่ → บันทึกลง `activity_logs` อัตโนมัติ
- admin ระงับบัญชี (status = inactive) → บัญชีนั้น login ไม่ได้อีก (403)
- รหัสผ่านเก็บเป็น bcrypt hash เท่านั้น ไม่เก็บ plaintext

> Phase 2–8 ผ่านการตรวจสอบว่า require ทุกไฟล์และ route โหลดได้ไม่ error เท่านั้น
> **ยังไม่ได้ทดสอบยิง request จริงกับฐานข้อมูล** — ดูหัวข้อ "ยังไม่ได้ทำ" ด้านล่าง

## ยังไม่ได้ทำ
- **ทดสอบระบบแบบ end-to-end กับฐานข้อมูลจริง** (Phase 9 — ต้อง import schema.sql + ตั้งค่า .env ก่อน)
- Frontend: ทำโครงหลักแล้ว (login, dashboard, จัดการข้อมูลพื้นฐาน, workflow อนุมัติแผน/ผลประเมิน,
  รายงาน) แต่ยังไม่ได้ผ่านการทดสอบใช้งานจริงในเบราว์เซอร์กับ backend
- Automated tests (unit/integration) — ยังไม่มี ทดสอบด้วยมือทั้งหมด
- Notification (แจ้งเตือนเมื่อแผน/ผลประเมินถูกปฏิเสธ หรือพบโรค/แมลง) ตาม Recommendation 6 ในเอกสารวิเคราะห์
