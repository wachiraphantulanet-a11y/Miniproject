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

ใช้ Jest + Supertest ทดสอบ backend ทั้งหมด **47 เทสต์ ผ่านครบ** ครอบคลุม auth/RBAC, workflow
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

## ยังไม่ได้ทำ
- **ทดสอบ UI ทีละหน้าที่เหลือ** (พันธุ์มะม่วง, ผสมเกสร, ติดผล, เมล็ดพันธุ์, ต้นกล้า, การดูแล,
  โรค/แมลง) ผ่านฟอร์มจริงในเบราว์เซอร์ — ตอนนี้ทดสอบผ่าน backend API โดยตรงเท่านั้น (แต่ใช้
  component CRUD เดียวกับต้นพ่อ-แม่พันธุ์ที่ทดสอบผ่าน UI แล้ว ความเสี่ยงจึงต่ำกว่าจุดอื่น)
- **CI/CD** — ยังไม่ได้ตั้งให้ automated tests รันอัตโนมัติเมื่อ push/PR
- **Unit test ระดับฟังก์ชันย่อย** — ตอนนี้มีแต่ integration test (ยิง HTTP ผ่าน endpoint จริง)
- Notification ยังเป็น in-app อย่างเดียวตามที่ตกลง — ยังไม่มีช่องทางอื่น (email/LINE/push) ถ้าต้องการ
  เพิ่มทีหลังต้องออกแบบเพิ่ม
