# ระบบจัดการการเพาะพันธุ์มะม่วง (Mango Breeding Management System)

Node.js + Express + MySQL (mysql2) เป็น backend และ HTML5/CSS3/JavaScript (vanilla, SPA) เป็น
frontend — ครอบคลุมครบทั้ง 8 process ตาม DFD Level 1 (D1–D9)

## โครงสร้างโปรเจกต์
```
Miniproject/
├── backend/                            # REST API (มี package.json ของตัวเอง)
│   ├── src/
│   │   ├── config/db.js                # MySQL connection pool
│   │   ├── middleware/authMiddleware.js # ตรวจ JWT + RBAC (authenticate, authorize)
│   │   ├── controllers/
│   │   │   ├── authController.js           # login, me                         (Process 1, D1)
│   │   │   ├── userController.js           # CRUD ผู้ใช้งาน (admin เท่านั้น)      (Process 1, D1)
│   │   │   ├── roleController.js           # ดึงรายการ role
│   │   │   ├── varietyController.js        # CRUD พันธุ์มะม่วง                   (Process 2, D2)
│   │   │   ├── parentTreeController.js     # CRUD ต้นพ่อ-แม่พันธุ์                (Process 2, D3)
│   │   │   ├── breedingPlanController.js   # แผนการเพาะพันธุ์ + อนุมัติ/ปฏิเสธ    (Process 3, D4)
│   │   │   ├── pollinationController.js    # บันทึกการผสมเกสร                    (Process 4, D5)
│   │   │   ├── fruitSetController.js       # บันทึกการติดผล                      (Process 4, D5)
│   │   │   ├── seedController.js           # บันทึกเมล็ดพันธุ์                    (Process 5, D6)
│   │   │   ├── seedlingController.js       # บันทึกต้นกล้า                       (Process 5, D6)
│   │   │   ├── careController.js           # บันทึกการดูแล/เจริญเติบโต            (Process 6, D7)
│   │   │   ├── pestDiseaseController.js    # บันทึกปัญหาโรค/แมลง                 (Process 6, D8)
│   │   │   ├── qualityEvaluationController.js # ประเมินคุณภาพ + อนุมัติ/ปฏิเสธ    (Process 7, D9)
│   │   │   ├── reportController.js         # รายงาน/สรุปข้อมูล                   (Process 8)
│   │   │   ├── activityLogController.js    # ดู audit trail
│   │   │   └── notificationController.js   # แจ้งเตือน in-app (list/unread-count/read)
│   │   ├── routes/                     # ผูก route กับ controller (ไฟล์ละ 1 resource)
│   │   ├── utils/
│   │   │   ├── token.js                # sign/verify JWT
│   │   │   ├── activityLog.js          # เขียน audit trail ลง activity_logs
│   │   │   └── notify.js               # สร้างแจ้งเตือน (notifyUser / notifyRoles)
│   │   ├── scripts/seedAdmin.js        # ตั้งรหัสผ่านจริงให้ user 'admin' ครั้งแรก
│   │   ├── app.js                      # ตั้งค่า Express app + route ทั้งหมด (ไม่ serve frontend)
│   │   └── server.js                   # จุดเริ่มรัน server
│   ├── tests/                          # automated tests (Jest + Supertest, ดูหัวข้อ Automated Tests)
│   ├── schema.sql                      # โครงสร้างฐานข้อมูล MySQL (D1–D9 + audit log + notifications)
│   ├── .env.example
│   └── package.json                    # npm run dev / npm start / npm test อยู่ที่นี่
├── frontend/                           # Static SPA แยกจาก backend (ไม่มี build tool/package.json)
│   ├── index.html                      # app shell เดียว ทุกหน้าโหลดผ่านนี้
│   ├── css/style.css
│   └── js/
│       ├── config.js                   # กำหนด API_BASE_URL ให้ชี้ไปที่ backend
│       ├── api.js                      # fetch wrapper แนบ JWT + จัดการ error กลาง
│       ├── auth.js                     # login/logout, เก็บ token ใน localStorage
│       ├── router.js                   # hash-based router
│       ├── crud.js                     # generic list+form component ใช้ซ้ำกับหลาย resource
│       ├── app.js                      # จุดเริ่มของ frontend: nav + ผูก route ทั้งหมด
│       └── views/                      # ฟังก์ชัน render ของแต่ละหน้า (รวม notifications.js — bell icon)
└── README.md
```

## วิธีติดตั้งและรัน

โปรเจกต์แยกเป็น 2 ส่วนอิสระ **backend มี `npm run dev` ของตัวเอง ส่วน frontend เป็นไฟล์ static ล้วนๆ
ไม่มี `package.json`/`npm run dev`** — ถ้ารัน `npm install` หรือ `npm run dev` ที่ root ของ repo หรือใน
`frontend/` จะ error `ENOENT: ... package.json` เพราะไม่มีไฟล์นั้นอยู่

### 1) Backend (REST API)

1. ติดตั้ง dependency (ต้องอยู่ในโฟลเดอร์ `backend/`)
   ```
   cd backend
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

4. รัน server (serve เฉพาะ REST API เท่านั้น — ไม่ serve ไฟล์ frontend แล้ว)
   ```
   npm run dev     # โหมด dev (auto reload ด้วย nodemon)
   npm start        # โหมด production
   ```
   ถ้าเชื่อมต่อฐานข้อมูลสำเร็จจะเห็น: `[Server] กำลังทำงานที่พอร์ต 3000`

### 2) Frontend (static SPA)

ไม่ต้อง `npm install`/`npm run dev` — เปิด `frontend/index.html` ตรงๆ ในเบราว์เซอร์ หรือรันเซิร์ฟเวอร์
static เช่น
```
npx serve frontend
```
frontend จะเรียก API ที่ `http://localhost:3000/api` ตามค่าใน `frontend/js/config.js` (แก้ `API_BASE_URL`
ในไฟล์นั้นถ้า backend รันอยู่คนละพอร์ต/เครื่อง) — ต้องรัน backend (ข้อ 1) ควบคู่กันเสมอ

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
| 2 (D2) | GET/POST/PUT/DELETE | `/api/varieties`, `/api/varieties/:id` | login / **admin เท่านั้น** | พันธุ์มะม่วง (เพิ่ม/แก้ไข/ลบจำกัดเฉพาะ admin) |
| 2 (D3) | GET/POST/PUT | `/api/parent-trees`, `/api/parent-trees/:id` | login / **admin เท่านั้น** | ต้นพ่อ-แม่พันธุ์ (เพิ่ม/แก้ไขจำกัดเฉพาะ admin, ลบไม่ได้ ใช้เปลี่ยน status แทน) |
| 3 (D4) | GET/POST/PUT | `/api/breeding-plans`, `/:id` | login / admin,staff | สร้าง/แก้ไขแผน (แก้ไข/ยื่นซ้ำได้เฉพาะตอน `draft` เท่านั้น — `rejected` เป็นสถานะจบ ดู "แผนถูกปฏิเสธ = สถานะจบ" ด้านล่าง) |
| 3 (D4) | POST | `/api/breeding-plans/:id/submit` | admin,staff | ส่งแผนรออนุมัติ (ใช้ได้เฉพาะตอน `draft`) |
| 3 (D4) | POST | `/api/breeding-plans/:id/decide` | admin,owner | อนุมัติ/ปฏิเสธแผน (บันทึกประวัติทุกรอบ) |
| 4 (D5) | GET/POST/PUT | `/api/pollinations`, `/api/fruit-sets` | login / admin,staff | บันทึกผสมเกสร (เฉพาะแผนที่ approved) และติดผล |
| 5 (D6) | GET/POST/PUT | `/api/seeds`, `/api/seedlings` | login / admin,staff | บันทึกเมล็ดพันธุ์ (เกรด A/B/C/D) และต้นกล้า |
| 6 (D7) | GET/POST/PUT | `/api/care-records` | login / admin,staff | บันทึกการดูแล/เจริญเติบโต |
| 6 (D8) | GET/POST/PUT | `/api/pest-disease-records` | login / admin,staff | บันทึกโรค/แมลง (ผูกกับต้นกล้า + care record ได้) |
| 7 (D9) | GET/POST | `/api/quality-evaluations`, `/:id` | login / admin,staff | ประเมินคุณภาพ (เกรด A/B/C/D) — record ไม่แก้ไขหลังสร้าง (ไม่มี PUT/submit) ถ้าถูกปฏิเสธต้องสร้างรายการใหม่แทน |
| 7 (D9) | POST | `/api/quality-evaluations/:id/decide` | admin,owner | อนุมัติ/ปฏิเสธผลประเมิน |
| 8 | GET | `/api/reports/summary` | login | ภาพรวมทั้งระบบ (หน้าเริ่มต้นของเมนูรายงาน) |
| 8 | GET | `/api/reports/process-types` | login | รายชื่อประเภทรายงานที่กรองได้ (ครอบคลุมทุก process D2–D9 + ประวัติการอนุมัติแผน/ผลประเมิน) |
| 8 | GET | `/api/reports/filter-users` | login | รายชื่อผู้ใช้งานทั้งหมด (ใช้เป็นตัวกรองที่ 4) |
| 8 | GET | `/api/reports/process` | login | รายงานตามเงื่อนไข — query: `type` (บังคับ), `fromDate`, `toDate`, `category` (สถานะ/วิธีการผสม/เกรด/ผลการพิจารณา แล้วแต่ `type`), `role`, `userId` |
| 8 | GET | `/api/reports/seedling-traceability`, `/:id` | login | ตรวจสอบย้อนกลับแหล่งที่มาต้นกล้าเต็มสาย |
| — | GET | `/api/notifications` | login | รายการแจ้งเตือนของตัวเอง (ล่าสุด 100 รายการ) รองรับ `?unreadOnly=true` |
| — | GET | `/api/notifications/unread-count` | login | จำนวนแจ้งเตือนที่ยังไม่อ่าน (ใช้ทำ badge) |
| — | POST | `/api/notifications/:id/read` | login | อ่านแจ้งเตือน 1 รายการ (เฉพาะของตัวเอง) |
| — | POST | `/api/notifications/read-all` | login | อ่านแจ้งเตือนทั้งหมดของตัวเอง |

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

## สิ่งที่ทดสอบแล้วว่าทำงานถูกต้อง

### Phase 1 (auth/RBAC พื้นฐาน)
- login รหัสผ่านผิด → 401
- login ถูกต้อง → 200 + JWT token
- เข้าถึง endpoint ที่ต้อง login โดยไม่มี token → 401
- เข้าถึง endpoint เฉพาะ admin ด้วย role อื่น (เช่น owner/staff) → 403 (RBAC ทำงานถูกต้อง)
- admin สร้างผู้ใช้ใหม่ → บันทึกลง `activity_logs` อัตโนมัติ
- admin ระงับบัญชี (status = inactive) → บัญชีนั้น login ไม่ได้อีก (403)
- รหัสผ่านเก็บเป็น bcrypt hash เท่านั้น ไม่เก็บ plaintext

### Phase 9 (end-to-end กับฐานข้อมูลจริง — ทดสอบแล้ว 2026-08-18)
ทดสอบยิง request จริงผ่านทุก endpoint หลักด้วยสคริปต์อัตโนมัติ (24/24 ผ่าน) กับ MySQL จริง:
login → CRUD พันธุ์/ต้นพ่อแม่พันธุ์ (D2, D3) → สร้าง/submit/อนุมัติแผนเพาะพันธุ์ (D4) →
บันทึกผสมเกสร/ติดผล (D5) → เมล็ด/ต้นกล้า (D6) → การดูแล/โรคแมลง (D7, D8) →
สร้าง/อนุมัติผลประเมินคุณภาพ (D9) → รายงานสรุป/แผน/โรคแมลง/ตรวจสอบย้อนกลับ (Process 8) →
RBAC (401 เมื่อไม่มี token) → activity log
**หมายเหตุ:** การทดสอบนี้เขียนข้อมูลตัวอย่างจริงลงฐานข้อมูล (พันธุ์/ต้นไม้/แผน/ผู้ใช้ทดสอบที่มีคำว่า
"E2E"/"e2e" ในชื่อ) ยังไม่ได้ลบออก — ลบเองได้หรือแจ้งให้ช่วยลบ

### Frontend ในเบราว์เซอร์จริงกับ backend (ทดสอบแล้ว 2026-08-18)
เปิดผ่าน `npx serve frontend` เชื่อมกับ backend จริง ทดสอบ: login/logout, dashboard,
CRUD ต้นพ่อ-แม่พันธุ์ (บันทึกจากฟอร์มจริงสำเร็จ), workflow แผนเพาะพันธุ์ (submit → อนุมัติ ครบรอบ),
หน้าประเมินคุณภาพ, หน้ารายงาน + ตรวจสอบย้อนกลับต้นกล้า, หน้าจัดการผู้ใช้งาน, RBAC ด้วย role staff
(เมนู/หน้าที่จำกัดสิทธิ์ถูกซ่อน/บล็อกถูกต้องทั้ง frontend และ backend)

**พบและแก้บั๊กระหว่างทดสอบ:** หน้ารายละเอียดแผนเพาะพันธุ์ (`frontend/js/views/workflow.js`)
ไม่มีปุ่ม "ส่งขออนุมัติ" สำหรับแผนสถานะ `draft` เลย (มีแต่ปุ่ม "ส่งเข้ารออนุมัติอีกครั้ง" ตอน
`rejected` เท่านั้น) ทำให้สร้างแผนใหม่แล้วไม่มีทางส่งขออนุมัติผ่านหน้าเว็บได้ — แก้แล้วโดยเพิ่มปุ่ม
"ส่งขออนุมัติ" เมื่อสถานะเป็น `draft` และยืนยันว่าใช้งานได้จริงจนครบ flow (draft → pending_approval
→ approved)

**ยังไม่ได้ทดสอบในเบราว์เซอร์:** พันธุ์มะม่วง (D2), ผสมเกสร/ติดผล (D5), เมล็ด/ต้นกล้า (D6),
การดูแล/โรคแมลง (D7, D8) แบบละเอียด — ทดสอบผ่าน backend API โดยตรงแล้วเท่านั้น (ดูผลทดสอบ Phase 9)
ยังไม่ได้คลิกทดสอบผ่านฟอร์มจริงทีละหน้า

## การแจ้งเตือนในระบบ (In-app Notification — Recommendation 6, เพิ่มแล้ว 2026-08-18)

แจ้งเตือนแบบ in-app เท่านั้น (ไม่มี email/LINE/push) เก็บในตาราง `notifications` ผู้ใช้แต่ละคนเห็น
เฉพาะของตัวเอง มี bell icon + badge จำนวนที่ยังไม่อ่านที่มุมขวาบนของทุกหน้า (poll ทุก 30 วินาที)
คลิกรายการเพื่ออ่าน + เด้งไปหน้ารายละเอียดที่เกี่ยวข้องอัตโนมัติ (แผน/ผลประเมิน) หรือหน้ารายการ
(โรค/แมลง)

จุดที่ยิงแจ้งเตือนอัตโนมัติ (`backend/src/utils/notify.js`):
- **แผนเพาะพันธุ์ถูกปฏิเสธ** (`breedingPlanController.decideBreedingPlan`) → แจ้งผู้สร้างแผนคนนั้น
- **ผลประเมินคุณภาพถูกปฏิเสธ** (`qualityEvaluationController.decideEvaluation`) → แจ้งผู้ประเมินคนนั้น
- **พบปัญหาโรค/แมลง** (`pestDiseaseController.createPestDiseaseRecord`) → แจ้งผู้ใช้ role
  `admin` และ `owner` ทุกคน (ยกเว้นคนที่บันทึกเอง)

ทดสอบแล้วทั้ง backend (automated tests ใน `tests/notifications.test.js`: ตรงเป้าหมาย, ไม่รั่วไปยัง
ผู้ใช้อื่น, ไม่แจ้งเตือนตัวเอง, mark-as-read ป้องกันข้ามบัญชี) และ UI จริงในเบราว์เซอร์ (คลิกกระดิ่ง →
เห็นรายการ → คลิกแล้วเด้งหน้าที่ถูกต้อง + badge หายไป)

## Automated Tests (เพิ่มแล้ว 2026-08-18)

ใช้ Jest + Supertest ทดสอบ backend ทั้งหมด **52 เทสต์ ผ่านครบ** ครอบคลุม auth/RBAC, workflow
เต็มสาย D2–D9 + รายงาน, และการแจ้งเตือน (`backend/tests/*.test.js`)

รันด้วย:
```
cd backend
npm test
```

**สำคัญ:** เทสต์จะ **ลบและสร้างฐานข้อมูลใหม่ชื่อ `<DB_NAME>_test`** (เช่น `mango_breeding_db_test`)
จาก `schema.sql` ทุกครั้งที่รัน (ดู `backend/tests/globalSetup.js`) — ไม่แตะฐานข้อมูล dev
(`DB_NAME` ปกติใน `.env`) เลย ใช้ credential เดียวกับ `.env` (host/user/password) แค่สลับชื่อ database
เท่านั้น จึงต้องมีสิทธิ์ `CREATE DATABASE`/`DROP DATABASE` ด้วย (บัญชีที่ import schema.sql ได้ก็ทำได้)

โครงสร้างไฟล์เทสต์:
- `tests/setupEnv.js` — สลับ `DB_NAME` เป็นฐานทดสอบก่อนแต่ละไฟล์เทสต์เริ่ม
- `tests/globalSetup.js` — DROP + import schema.sql ใหม่ทั้งหมด แล้วตั้งรหัสผ่าน admin เป็น `Test@12345`
- `tests/testUtils.js` — helper login/สร้างผู้ใช้ทดสอบ ใช้ร่วมกันทุกไฟล์
- `tests/auth.test.js` — login, `/auth/me`, token ผิด/ไม่มี token
- `tests/breedingWorkflow.test.js` — D2–D9 เต็ม flow + validation error cases + รายงาน/ตรวจสอบย้อนกลับ
- `tests/rbac.test.js` — สิทธิ์ตาม role (admin/staff/owner), ระงับบัญชีแล้ว login ไม่ได้
- `tests/notifications.test.js` — ครอบคลุมเงื่อนไขแจ้งเตือนทั้ง 3 จุดด้านบน

**ข้อจำกัดที่รู้อยู่:** เป็น integration test ยิงผ่าน HTTP จริง (supertest ต่อกับ `app.js` โดยตรง
ไม่ต้องรัน server แยก) ยังไม่มี unit test แยกฟังก์ชัน/pure logic ระดับเล็ก และยังไม่ได้ตั้ง CI
(GitHub Actions ฯลฯ) ให้รันอัตโนมัติทุกครั้งที่ push

## อัปเดต UI: popup แก้ไขข้อมูล, จำกัดสิทธิ์พันธุ์มะม่วง/ต้นพ่อ-แม่พันธุ์, login animation (2026-08-19)

- **ฟอร์ม "แก้ไข" ทุกหน้าเปลี่ยนเป็น modal popup** แยกจากหน้าเดิม (เดิมแทรกอยู่ในหน้าเดียวกับตาราง/
  ฟอร์มสร้างใหม่) ครอบคลุมทั้ง CRUD ทั่วไป (`frontend/js/crud.js`), หน้าจัดการผู้ใช้ (`users.js`),
  และหน้ารายละเอียดแผน/ผลประเมิน (`workflow.js` — เปลี่ยนจากฟอร์มแก้ไขที่แสดงตลอดเป็นปุ่ม
  "แก้ไขข้อมูล" ที่เปิด popup) ปิดได้ด้วยปุ่ม ×, ปุ่มยกเลิก, คลิกนอกกล่อง, หรือกด Esc
- **พันธุ์มะม่วง (D2) และต้นพ่อ-แม่พันธุ์ (D3): เพิ่ม/แก้ไข/ลบ ได้เฉพาะ admin เท่านั้น** (เดิม
  admin+staff) บังคับทั้ง backend (`varietyRoutes.js`, `parentTreeRoutes.js` — `authorize('admin')`)
  และ UI (ซ่อนฟอร์ม/ปุ่มแก้ไข-ลบให้ role อื่น) resource อื่นที่เหลือ (ผสมเกสร, ติดผล, เมล็ดพันธุ์,
  ต้นกล้า, การดูแล, โรค/แมลง) ยัง admin+staff เขียนได้เหมือนเดิม ไม่ได้ถูกจำกัดเพิ่ม
- **หน้า login มี animation เล็กๆ น้อยๆ**: ไอคอนมะม่วงลอยเบาๆ, กล่อง login fade+slide เข้าตอนโหลด,
  พื้นหลังมี glow สีเขียวเลื่อนไหวช้าๆ, กล่องสั่น (shake) เมื่อ login ผิด

**พบและแก้บั๊กระหว่างทำ:**
1. ฟอร์ม "แก้ไข" ของ**ทุกเมนู**เดิมเปิดมาแล้วฟิลด์ว่างเปล่าหมด ไม่โชว์ค่าปัจจุบัน เพราะ
   `editFields` ใช้ key แบบ camelCase (เช่น `qualityGrade`) แต่ข้อมูลจาก API เป็น snake_case
   (`quality_grade`) ไม่ตรงกัน — แก้ที่ `renderForm()` ให้ fallback ไปหา key แบบ snake_case ด้วย
2. เมื่อกรอกรหัสผ่านผิดตอน login หน้าเว็บจะขึ้นข้อความ "กรุณาเข้าสู่ระบบใหม่ (session หมดอายุ)"
   ซึ่งเป็นข้อความหลอกที่ผิด (ทั้งที่ยังไม่เคย login สำเร็จเลย ไม่มี session ให้หมดอายุ) เพราะ
   `api.js` ตีความ HTTP 401 ทุกกรณีว่าคือ session หมดอายุ — แก้ให้แยกกรณี: 401 ตอนที่ "มี token
   แนบไปด้วย" เท่านั้นที่ถือว่า session หมดอายุจริง ส่วน 401 ตอน login (ไม่มี token) จะโชว์ข้อความ
   จริงจาก backend เช่น "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"

ทดสอบแล้วในเบราว์เซอร์จริง: popup เปิด/ปิด/บันทึกได้ถูกต้อง (ทดสอบทั้ง `varieties`,
`breeding-plans` detail), staff ล็อกอินแล้วเห็นเฉพาะตารางอ่านอย่างเดียวสำหรับพันธุ์มะม่วง/
ต้นพ่อ-แม่พันธุ์ (ไม่มีฟอร์มสร้าง/ปุ่มแก้ไข-ลบ) แต่ยังเขียนหน้าอื่นได้ปกติ, login error message
ถูกต้อง, animation แสดงผลตามที่ตั้งใจ automated tests อัปเดตตามด้วย (RBAC test ปรับให้ตรงกับ
กติกาใหม่ + เพิ่มเทสต์ยืนยันว่า resource อื่นไม่ได้ถูกจำกัดเกินขอบเขต) รวมเป็น 52/52 ผ่าน

## แผน/ผลประเมินที่ถูกปฏิเสธเป็นสถานะจบ, รวมเกรดต้นกล้าเป็น A/B/C/D, แก้ภาษาไทย/อังกฤษปนกันทั้งระบบ (2026-08-24)

**1. แผนการเพาะพันธุ์ (D4) และผลประเมินคุณภาพ (D9) ที่ถูกปฏิเสธ (`rejected`) เป็นสถานะจบ (terminal)**
เดิมแก้ไขแล้วยื่นซ้ำรายการเดิมได้ (loop กลับ) ทำให้ข้อมูล ณ ตอนที่ถูกปฏิเสธถูกเขียนทับ ตรวจสอบ
ย้อนหลังไม่ได้ว่าผู้อนุมัติเห็นข้อมูลอะไรตอนตัดสินใจ — เปลี่ยนเป็น: ถ้าต้องการแก้ไขจริงต้อง **สร้าง
รายการใหม่** แทน โดยส่ง `revisedFromPlanId` (แผน) หรือ `revisedFromEvaluationId` (ผลประเมิน) เพื่อสืบ
สายย้อนกลับไปรายการเดิมที่ถูกปฏิเสธ (คอลัมน์ `revised_from_plan_id` / `revised_from_evaluation_id`
ใน `schema.sql`, ตรวจสอบว่ารายการที่อ้างอิงต้องเป็น `rejected` เท่านั้น)
- `breeding_plans`: แก้ไข/ส่งอนุมัติได้เฉพาะตอน `draft` เท่านั้น (`EDITABLE_STATUSES = ['draft']`)
- `quality_evaluations`: ไม่มีสถานะ `draft` (สร้างแล้วเข้า `pending_approval` ทันที) — เอา endpoint
  `PUT` และ `POST /:id/submit` ออกทั้งหมด เพราะมีไว้สำหรับ loop กลับหลังถูกปฏิเสธเท่านั้น ตอนนี้ record
  ไม่แก้ไขหลังสร้างอีกต่อไป
- ฝั่ง UI (`workflow.js`): ตัดปุ่ม "ส่งเข้ารออนุมัติอีกครั้ง" ออก แทนที่ด้วยข้อความแจ้งสถานะจบ +
  ปุ่ม "สร้างรายการใหม่โดยอ้างอิงรายการนี้" (prefill ฟอร์มสร้างใหม่จากข้อมูลเดิมให้อัตโนมัติ)

**2. เกรดผลประเมินคุณภาพต้นกล้า (D9) เปลี่ยนจาก `A/B/C/fail` เป็น `A/B/C/D`**
ให้ตรงกับเกรดเมล็ดพันธุ์ (D6, `seeds.quality_grade`) ที่เป็น A/B/C/D อยู่แล้ว ลดความสับสนเรื่องเกรด
สองชุดไม่ตรงกัน — จุดที่ใช้เช็คเกรดตกในโค้ด (`overall_grade === 'fail'` → ต้นกล้าเป็น `rejected`)
เปลี่ยนเป็นเช็ค `=== 'D'` แทน อัปเดตทั้ง `schema.sql` (enum), backend controller, และ dropdown
ฝั่ง frontend พร้อมปรับฐานข้อมูล dev จริงด้วย `ALTER TABLE` แล้ว

**3. แก้ภาษาไทย/อังกฤษแสดงผลไม่ตรงกันทั้งระบบ**
ก่อนหน้านี้บางหน้าฟอร์มเพิ่ม/แก้ไขใช้ตัวเลือกภาษาไทย (เช่น อนุมัติ/ปฏิเสธ, ต่ำ/ปานกลาง/สูง) แต่ตาราง/
badge ที่แสดงผลกลับโชว์ค่า enum ภาษาอังกฤษดิบๆ (เช่น `rejected`, `low`, `father`) — เพิ่มกลไกกลาง
`formatCellValue()` ใน `frontend/js/crud.js` พร้อมชุดคำแปล (`WORKFLOW_STATUS_LABELS`,
`DECISION_LABELS`, `ACCOUNT_STATUS_LABELS`, `ACTIVITY_ACTION_LABELS` และใน `resources.js`:
`TREE_TYPE_LABELS`, `ISSUE_TYPE_LABELS`, `SEVERITY_LABELS`, `PEST_STATUS_LABELS`,
`TREE_STATUS_LABELS`, `SEEDLING_STATUS_LABELS`) ใช้ร่วมกันทุกหน้าที่แสดงค่าพวกนี้ — ตาราง/badge/
dropdown กรองในหน้า workflow (แผน/ผลประเมิน), แดชบอร์ด, รายงานทุกประเภท, จัดการผู้ใช้งาน,
audit trail, ต้นพ่อ-แม่พันธุ์, ต้นกล้า, โรค/แมลง ตอนนี้แสดงเป็นภาษาไทยตรงกับฟอร์มทั้งหมด

ทดสอบแล้ว: `node --check` ผ่านทุกไฟล์ frontend ที่แก้ และ backend automated tests (52/52 ผ่าน)
ไม่มีเทสต์ใดอิงกับ endpoint ที่ถูกลบ (`PUT`/`submit` ของ quality-evaluations) หรือค่าเกรด `fail`

## ยังไม่ได้ทำ
- **ทดสอบ UI ทีละหน้าที่เหลือ** (ผสมเกสร, ติดผล, เมล็ดพันธุ์, ต้นกล้า, การดูแล, โรค/แมลง)
  แบบละเอียดผ่านฟอร์มจริงในเบราว์เซอร์ — ตอนนี้ทดสอบผ่าน backend API โดยตรงเป็นหลัก
  (แต่ใช้ component เดียวกับพันธุ์มะม่วง/ต้นพ่อ-แม่พันธุ์ที่ทดสอบผ่าน UI แล้วรวมถึง popup ใหม่)
- **CI/CD** — ยังไม่ได้ตั้งให้ automated tests รันอัตโนมัติเมื่อ push/PR
- **Unit test ระดับฟังก์ชันย่อย** — ตอนนี้มีแต่ integration test (ยิง HTTP ผ่าน endpoint จริง)
- Notification ยังเป็น in-app อย่างเดียวตามที่ตกลง — ยังไม่มีช่องทางอื่น (email/LINE/push) ถ้าต้องการ
  เพิ่มทีหลังต้องออกแบบเพิ่ม
