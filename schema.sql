-- ============================================================
-- ระบบจัดการการเพาะพันธุ์มะม่วง (Mango Breeding Management System)
-- Database Schema สำหรับ MySQL Workbench 8.0.47
-- ออกแบบตาม DFD D1–D9 + ข้อสรุปจากการวิเคราะห์ (แก้ Gap การอนุมัติ
-- ผลประเมินคุณภาพ และการเชื่อมโยงข้อมูลโรค/แมลงกับการดูแลต้นกล้า)
--
-- ข้อตกลงตามที่ยืนยันแล้ว:
--   1) 1 แผนการเพาะพันธุ์ (breeding_plans) ผูกกับคู่พ่อ-แม่พันธุ์ตายตัว 1 คู่
--   2) การประเมินคุณภาพเก็บเป็นคะแนนรวม + เกรด (A/B/C) ไม่แยกเกณฑ์ย่อย
-- ============================================================

CREATE DATABASE IF NOT EXISTS mango_breeding_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE mango_breeding_db;

-- สำคัญ: บังคับ character set ของ "session" นี้เป็น utf8mb4 อย่างชัดเจน
-- ป้องกันปัญหาข้อความไทยเพี้ยน (mojibake) ที่เกิดจาก client บางตัว
-- (เช่น mysql CLI บน Linux) ที่ default เป็น latin1 โดยไม่บอกกล่าว
-- แม้ตัวไฟล์และฐานข้อมูลจะเป็น utf8mb4 อยู่แล้วก็ตาม
SET NAMES utf8mb4;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1) ROLES / USERS  (รองรับ D1 + RBAC)
-- ------------------------------------------------------------
CREATE TABLE roles (
    role_id     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_name   VARCHAR(50) NOT NULL UNIQUE,   -- 'admin', 'staff', 'owner'
    description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,        -- เก็บ hash เท่านั้น (เช่น bcrypt)
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(150) NULL,
    phone         VARCHAR(20)  NULL,
    role_id       INT UNSIGNED NOT NULL,
    status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                  ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id)
        REFERENCES roles(role_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 2) ข้อมูลพื้นฐาน: พันธุ์มะม่วง (D2) / ต้นพ่อ-แม่พันธุ์ (D3)
-- ------------------------------------------------------------
CREATE TABLE mango_varieties (
    variety_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variety_name       VARCHAR(150) NOT NULL,
    taste              VARCHAR(100) NULL,
    color              VARCHAR(100) NULL,
    avg_size_g         DECIMAL(6,2) NULL,
    harvest_days       INT UNSIGNED NULL,        -- ระยะเวลาให้ผลผลิต (วัน)
    disease_resistance VARCHAR(255) NULL,
    suitable_climate   VARCHAR(255) NULL,
    notes              TEXT NULL,
    created_by         INT UNSIGNED NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_variety_creator FOREIGN KEY (created_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE parent_trees (
    tree_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tree_code    VARCHAR(50) NOT NULL UNIQUE,
    tree_type    ENUM('father','mother') NOT NULL,
    variety_id   INT UNSIGNED NOT NULL,
    planted_date DATE NULL,
    location     VARCHAR(255) NULL,
    status       ENUM('active','inactive','removed') NOT NULL DEFAULT 'active',
    notes        TEXT NULL,
    created_by   INT UNSIGNED NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tree_variety FOREIGN KEY (variety_id)
        REFERENCES mango_varieties(variety_id),
    CONSTRAINT fk_tree_creator FOREIGN KEY (created_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 3) แผนการเพาะพันธุ์ + ประวัติการอนุมัติ (D4)
--    1 แผน = 1 คู่พ่อ-แม่พันธุ์ตายตัว (ตามที่ยืนยัน)
-- ------------------------------------------------------------
CREATE TABLE breeding_plans (
    plan_id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_code          VARCHAR(50) NOT NULL UNIQUE,
    father_tree_id     INT UNSIGNED NOT NULL,
    mother_tree_id     INT UNSIGNED NOT NULL,
    objective          VARCHAR(255) NULL,        -- เป้าหมายของแผน
    planned_start_date DATE NULL,
    planned_end_date   DATE NULL,
    status             ENUM('draft','pending_approval','approved','rejected')
                       NOT NULL DEFAULT 'draft',
    created_by         INT UNSIGNED NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                       ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plan_father FOREIGN KEY (father_tree_id)
        REFERENCES parent_trees(tree_id),
    CONSTRAINT fk_plan_mother FOREIGN KEY (mother_tree_id)
        REFERENCES parent_trees(tree_id),
    CONSTRAINT fk_plan_creator FOREIGN KEY (created_by)
        REFERENCES users(user_id),
    CONSTRAINT chk_plan_parents_diff CHECK (father_tree_id <> mother_tree_id)
) ENGINE=InnoDB;

-- ประวัติการอนุมัติ/ปฏิเสธแผน (เก็บได้หลายรอบ แก้ Gap "ไม่มี loop กลับ")
CREATE TABLE breeding_plan_approvals (
    approval_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT UNSIGNED NOT NULL,
    decision    ENUM('approved','rejected') NOT NULL,
    reason      TEXT NULL,                        -- บังคับกรอกถ้า rejected (เช็คที่ backend)
    decided_by  INT UNSIGNED NOT NULL,
    decided_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_planappr_plan FOREIGN KEY (plan_id)
        REFERENCES breeding_plans(plan_id),
    CONSTRAINT fk_planappr_user FOREIGN KEY (decided_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4) การผสมเกสรและการติดผล (D5) — แยก 2 ตารางเพื่อ normalize
-- ------------------------------------------------------------
CREATE TABLE pollination_records (
    pollination_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_id          INT UNSIGNED NOT NULL,   -- ระดับแอปต้องเช็คว่า plan.status = 'approved'
    pollination_date DATE NOT NULL,
    flower_count     INT UNSIGNED NULL,
    method           VARCHAR(100) NULL,
    notes            TEXT NULL,
    recorded_by      INT UNSIGNED NOT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_poll_plan FOREIGN KEY (plan_id)
        REFERENCES breeding_plans(plan_id),
    CONSTRAINT fk_poll_user FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE fruit_set_records (
    fruit_set_id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    pollination_id  INT UNSIGNED NOT NULL,
    observed_date   DATE NOT NULL,
    fruit_count     INT UNSIGNED NULL,
    fruit_set_rate  DECIMAL(5,2) NULL,   -- % = fruit_count / flower_count * 100
    notes           TEXT NULL,
    recorded_by     INT UNSIGNED NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fruit_poll FOREIGN KEY (pollination_id)
        REFERENCES pollination_records(pollination_id),
    CONSTRAINT fk_fruit_user FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 5) เมล็ดพันธุ์และต้นกล้า (D6)
-- ------------------------------------------------------------
CREATE TABLE seeds (
    seed_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    fruit_set_id  INT UNSIGNED NOT NULL,
    collected_date DATE NULL,
    seed_count    INT UNSIGNED NULL,
    quality_grade VARCHAR(50) NULL,
    notes         TEXT NULL,
    recorded_by   INT UNSIGNED NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seed_fruitset FOREIGN KEY (fruit_set_id)
        REFERENCES fruit_set_records(fruit_set_id),
    CONSTRAINT fk_seed_user FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE seedlings (
    seedling_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seed_id          INT UNSIGNED NOT NULL,
    seedling_code    VARCHAR(50) NOT NULL UNIQUE,
    germination_date DATE NULL,
    current_status   ENUM('growing','ready_for_evaluation','passed','rejected',
                          'sold','disposed') NOT NULL DEFAULT 'growing',
    notes            TEXT NULL,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_seedling_seed FOREIGN KEY (seed_id)
        REFERENCES seeds(seed_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 6) การดูแลและการเจริญเติบโต (D7) + ปัญหาโรคและแมลง (D8)
--    แก้ Gap: pest/disease เชื่อมกับ seedling และ (ถ้ามี) care_record
--    โดยตรง ไม่ใช่ลอยแยกต่างหาก
-- ------------------------------------------------------------
CREATE TABLE care_records (
    care_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seedling_id  INT UNSIGNED NOT NULL,
    care_date    DATE NOT NULL,
    activity_type VARCHAR(100) NULL,   -- เช่น รดน้ำ, ใส่ปุ๋ย, ย้ายกระถาง
    height_cm    DECIMAL(6,2) NULL,
    leaf_count   INT UNSIGNED NULL,
    growth_note  TEXT NULL,
    recorded_by  INT UNSIGNED NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_care_seedling FOREIGN KEY (seedling_id)
        REFERENCES seedlings(seedling_id),
    CONSTRAINT fk_care_user FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE pest_disease_records (
    record_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seedling_id INT UNSIGNED NOT NULL,
    care_id     INT UNSIGNED NULL,     -- NULL ได้ถ้าพบนอกรอบดูแลปกติ
    found_date  DATE NOT NULL,
    issue_type  ENUM('disease','pest') NOT NULL,
    issue_name  VARCHAR(150) NULL,
    severity    ENUM('low','medium','high') NOT NULL DEFAULT 'low',
    treatment   TEXT NULL,
    status      ENUM('open','treated','resolved') NOT NULL DEFAULT 'open',
    recorded_by INT UNSIGNED NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pest_seedling FOREIGN KEY (seedling_id)
        REFERENCES seedlings(seedling_id),
    CONSTRAINT fk_pest_care FOREIGN KEY (care_id)
        REFERENCES care_records(care_id),
    CONSTRAINT fk_pest_user FOREIGN KEY (recorded_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 7) ประเมินคุณภาพต้นกล้า (D9) + ประวัติการอนุมัติผลประเมิน
--    แก้ Gap 1 หลัก: เดิมไม่มีขั้นตอนอนุมัติ/ปฏิเสธผลประเมิน
--    ใช้คะแนนรวม + เกรด ตามที่ยืนยัน
-- ------------------------------------------------------------
CREATE TABLE quality_evaluations (
    evaluation_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    seedling_id     INT UNSIGNED NOT NULL,
    evaluation_date DATE NOT NULL,
    overall_score   DECIMAL(5,2) NULL,       -- คะแนนรวม เช่น 0-100
    overall_grade   ENUM('A','B','C','fail') NOT NULL,
    status          ENUM('pending_approval','approved','rejected')
                    NOT NULL DEFAULT 'pending_approval',
    evaluated_by    INT UNSIGNED NOT NULL,
    notes           TEXT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_eval_seedling FOREIGN KEY (seedling_id)
        REFERENCES seedlings(seedling_id),
    CONSTRAINT fk_eval_user FOREIGN KEY (evaluated_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

CREATE TABLE quality_evaluation_approvals (
    approval_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    evaluation_id INT UNSIGNED NOT NULL,
    decision      ENUM('approved','rejected') NOT NULL,
    reason        TEXT NULL,
    decided_by    INT UNSIGNED NOT NULL,
    decided_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evalappr_eval FOREIGN KEY (evaluation_id)
        REFERENCES quality_evaluations(evaluation_id),
    CONSTRAINT fk_evalappr_user FOREIGN KEY (decided_by)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 8) Audit Trail (คำแนะนำเพิ่มเติม — ตรวจสอบย้อนหลังได้)
-- ------------------------------------------------------------
CREATE TABLE activity_logs (
    log_id     BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id    INT UNSIGNED NULL,
    action     VARCHAR(100) NOT NULL,   -- เช่น 'CREATE','UPDATE','APPROVE','REJECT'
    table_name VARCHAR(100) NOT NULL,
    record_id  INT UNSIGNED NULL,
    detail     TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id)
        REFERENCES users(user_id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------
-- 9) Indexes เพิ่มเติมสำหรับคอลัมน์ที่ค้นหา/รายงานบ่อย
-- ------------------------------------------------------------
CREATE INDEX idx_plans_status        ON breeding_plans(status);
CREATE INDEX idx_evaluations_status  ON quality_evaluations(status);
CREATE INDEX idx_seedlings_status    ON seedlings(current_status);
CREATE INDEX idx_pest_status         ON pest_disease_records(status);
CREATE INDEX idx_care_seedling_date  ON care_records(seedling_id, care_date);
CREATE INDEX idx_logs_table_record   ON activity_logs(table_name, record_id);

-- ------------------------------------------------------------
-- 10) ข้อมูลเริ่มต้น (Seed Data) — บทบาทผู้ใช้งาน 3 กลุ่มตาม DFD
-- ------------------------------------------------------------
INSERT INTO roles (role_name, description) VALUES
    ('admin', 'ผู้ดูแลระบบ'),
    ('staff', 'เจ้าหน้าที่เพาะพันธุ์'),
    ('owner', 'เจ้าของสวน');

-- ตัวอย่างผู้ดูแลระบบเริ่มต้น (ให้เปลี่ยน password_hash จริงตอน deploy)
INSERT INTO users (username, password_hash, full_name, role_id, status) VALUES
    ('admin', '<REPLACE_WITH_BCRYPT_HASH>', 'ผู้ดูแลระบบเริ่มต้น', 1, 'active');
