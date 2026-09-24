const { pool } = require('../config/db');

const SEEDLING_STATUSES = ['growing', 'ready_for_evaluation', 'passed', 'rejected', 'sold', 'disposed'];

/**
 * GET /api/reports/summary — ภาพรวมทั้งระบบ (D1–D9) สำหรับ dashboard
 */
async function getSummary(req, res) {
  try {
    const [[varietyCount]] = await pool.query('SELECT COUNT(*) AS total FROM mango_varieties');

    const [treesByType] = await pool.query(
      `SELECT tree_type, status, COUNT(*) AS total FROM parent_trees GROUP BY tree_type, status`
    );

    const [plansByStatus] = await pool.query(
      `SELECT status, COUNT(*) AS total FROM breeding_plans GROUP BY status`
    );

    const [[pollinationCount]] = await pool.query('SELECT COUNT(*) AS total FROM pollination_records');
    const [[avgFruitSetRate]] = await pool.query(
      'SELECT ROUND(AVG(fruit_set_rate), 2) AS avg_rate FROM fruit_set_records WHERE fruit_set_rate IS NOT NULL'
    );

    const [[seedCount]] = await pool.query(
      'SELECT COALESCE(SUM(seed_count), 0) AS total_seeds, COUNT(*) AS total_records FROM seeds'
    );

    const [seedlingsByStatus] = await pool.query(
      `SELECT current_status, COUNT(*) AS total FROM seedlings GROUP BY current_status`
    );

    const [pestByStatus] = await pool.query(
      `SELECT issue_type, severity, status, COUNT(*) AS total
       FROM pest_disease_records GROUP BY issue_type, severity, status`
    );

    const [evaluationsByStatusGrade] = await pool.query(
      `SELECT status, overall_grade, COUNT(*) AS total FROM quality_evaluations GROUP BY status, overall_grade`
    );

    return res.json({
      varieties: { total: varietyCount.total },
      parentTrees: treesByType,
      breedingPlans: plansByStatus,
      pollination: { totalRecords: pollinationCount.total, avgFruitSetRatePercent: avgFruitSetRate.avg_rate },
      seeds: seedCount,
      seedlings: seedlingsByStatus,
      pestDisease: pestByStatus,
      qualityEvaluations: evaluationsByStatusGrade,
    });
  } catch (err) {
    console.error('[Report] getSummary error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

// ------------------------------------------------------------------
// รายงานตามเงื่อนไขแบบรวมศูนย์ — ครอบคลุมทุก process (D2–D9) + ประวัติการอนุมัติ
// filter ร่วม 5 แบบ: ประเภทรายงาน(type) / ช่วงวันที่(fromDate,toDate) / หมวดหมู่(category — สถานะ/วิธีการ/เกรด/ผลการพิจารณา
// แล้วแต่ประเภทรายงาน ดู filterColumn/filterLabel ของแต่ละ entry) / บทบาท(role) / ผู้ใช้งาน(userId)
//
// หมายเหตุ: เฉพาะ planApprovals/evaluationApprovals เท่านั้นที่ userColumn ชี้ไปที่ "ผู้อนุมัติ" (decided_by
// เป็น admin/owner) ส่วน 10 ประเภทที่เหลือ userColumn ชี้ไปที่ "ผู้บันทึกข้อมูล" (created_by/recorded_by/
// evaluated_by เป็น admin/staff เท่านั้น เพราะ owner ไม่มีสิทธิ์บันทึกข้อมูลปฏิบัติงาน) — ใช้ดูภาระงานผู้บันทึก
// ไม่ใช่ผู้อนุมัติ
// ------------------------------------------------------------------
const REPORT_TYPES = {
  varieties: {
    label: 'พันธุ์มะม่วง',
    from: 'mango_varieties v JOIN users u ON u.user_id = v.created_by JOIN roles ro ON ro.role_id = u.role_id',
    select: `v.variety_id AS id, v.variety_name, v.taste, v.color, v.avg_size_g, v.harvest_days,
              v.created_at, u.full_name AS user_name`,
    dateColumn: 'v.created_at',
    userColumn: 'v.created_by',
    filterColumn: null,
    filterValues: [],
    filterLabel: null,
    orderBy: 'v.variety_id DESC',
  },
  parentTrees: {
    label: 'ต้นพ่อ-แม่พันธุ์',
    from: `parent_trees t
           JOIN mango_varieties v ON v.variety_id = t.variety_id
           JOIN users u ON u.user_id = t.created_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `t.tree_id AS id, t.tree_code, t.tree_type, v.variety_name, t.planted_date,
              t.location, t.status, t.created_at, u.full_name AS user_name`,
    dateColumn: 't.created_at',
    userColumn: 't.created_by',
    filterColumn: 't.status',
    filterValues: ['active', 'inactive', 'removed'],
    filterLabel: 'สถานะ',
    orderBy: 't.tree_id DESC',
  },
  breedingPlans: {
    label: 'แผนการเพาะพันธุ์',
    from: `breeding_plans p
           JOIN parent_trees f ON f.tree_id = p.father_tree_id
           JOIN parent_trees m ON m.tree_id = p.mother_tree_id
           JOIN users u ON u.user_id = p.created_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `p.plan_id AS id, p.plan_code, p.objective, p.planned_start_date, p.planned_end_date,
              p.status, f.tree_code AS father_tree_code, m.tree_code AS mother_tree_code,
              p.created_at, u.full_name AS user_name`,
    dateColumn: 'p.created_at',
    userColumn: 'p.created_by',
    filterColumn: 'p.status',
    filterValues: ['draft', 'pending_approval', 'approved', 'rejected'],
    filterLabel: 'สถานะ',
    orderBy: 'p.plan_id DESC',
  },
  pollinations: {
    label: 'การผสมเกสร',
    from: `pollination_records r
           JOIN breeding_plans p ON p.plan_id = r.plan_id
           JOIN users u ON u.user_id = r.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `r.pollination_id AS id, p.plan_code, r.pollination_date, r.flower_count,
              r.method, r.created_at, u.full_name AS user_name`,
    dateColumn: 'r.pollination_date',
    userColumn: 'r.recorded_by',
    filterColumn: 'r.method',
    filterValues: ['มือ', 'ทางธรรมชาติ/ลม', 'แมลง/ผึ้ง'],
    filterLabel: 'วิธีการผสม',
    orderBy: 'r.pollination_id DESC',
  },
  fruitSets: {
    label: 'การติดผล',
    from: `fruit_set_records fs
           JOIN pollination_records r ON r.pollination_id = fs.pollination_id
           JOIN breeding_plans p ON p.plan_id = r.plan_id
           JOIN users u ON u.user_id = fs.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `fs.fruit_set_id AS id, fs.fruit_set_code, p.plan_code, fs.observed_date, fs.fruit_count,
              fs.fruit_set_rate, fs.created_at, u.full_name AS user_name`,
    dateColumn: 'fs.observed_date',
    userColumn: 'fs.recorded_by',
    filterColumn: null,
    filterValues: [],
    filterLabel: null,
    orderBy: 'fs.fruit_set_id DESC',
  },
  seeds: {
    label: 'เมล็ดพันธุ์',
    from: `seeds s
           JOIN fruit_set_records fs ON fs.fruit_set_id = s.fruit_set_id
           JOIN users u ON u.user_id = s.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `s.seed_id AS id, fs.fruit_set_code, s.collected_date, s.seed_count,
              s.quality_grade, s.created_at, u.full_name AS user_name`,
    dateColumn: 's.collected_date',
    userColumn: 's.recorded_by',
    filterColumn: 's.quality_grade',
    filterValues: ['A', 'B', 'C', 'D'],
    filterLabel: 'เกรด',
    orderBy: 's.seed_id DESC',
  },
  seedlings: {
    label: 'ต้นกล้า',
    from: `seedlings sl
           JOIN seeds s ON s.seed_id = sl.seed_id
           JOIN users u ON u.user_id = s.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `sl.seedling_id AS id, sl.seedling_code, s.seed_code, sl.germination_date,
              sl.current_status AS status, sl.created_at, u.full_name AS user_name`,
    dateColumn: 'sl.created_at',
    userColumn: 's.recorded_by',
    filterColumn: 'sl.current_status',
    filterValues: SEEDLING_STATUSES,
    filterLabel: 'สถานะ',
    orderBy: 'sl.seedling_id DESC',
  },
  careRecords: {
    label: 'การดูแล/เจริญเติบโต',
    from: `care_records c
           JOIN seedlings sl ON sl.seedling_id = c.seedling_id
           JOIN users u ON u.user_id = c.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `c.care_id AS id, sl.seedling_code, c.care_date, c.activity_type,
              c.height_cm, c.leaf_count, c.created_at, u.full_name AS user_name`,
    dateColumn: 'c.care_date',
    userColumn: 'c.recorded_by',
    filterColumn: null,
    filterValues: [],
    filterLabel: null,
    orderBy: 'c.care_id DESC',
  },
  pestDisease: {
    label: 'โรคและแมลง',
    from: `pest_disease_records pd
           JOIN seedlings sl ON sl.seedling_id = pd.seedling_id
           JOIN users u ON u.user_id = pd.recorded_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `pd.record_id AS id, sl.seedling_code, pd.found_date, pd.issue_type, pd.issue_name,
              pd.severity, pd.status, pd.created_at, u.full_name AS user_name`,
    dateColumn: 'pd.found_date',
    userColumn: 'pd.recorded_by',
    filterColumn: 'pd.status',
    filterValues: ['open', 'treated', 'resolved'],
    filterLabel: 'สถานะ',
    orderBy: 'pd.record_id DESC',
  },
  qualityEvaluations: {
    label: 'ประเมินคุณภาพ',
    from: `quality_evaluations e
           JOIN seedlings sl ON sl.seedling_id = e.seedling_id
           JOIN users u ON u.user_id = e.evaluated_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `e.evaluation_id AS id, sl.seedling_code, e.evaluation_date, e.overall_score,
              e.overall_grade, e.status, e.created_at, u.full_name AS user_name`,
    dateColumn: 'e.evaluation_date',
    userColumn: 'e.evaluated_by',
    filterColumn: 'e.status',
    filterValues: ['pending_approval', 'approved', 'rejected'],
    filterLabel: 'สถานะ',
    orderBy: 'e.evaluation_id DESC',
  },
  planApprovals: {
    label: 'การอนุมัติแผนการเพาะพันธุ์',
    from: `breeding_plan_approvals a
           JOIN breeding_plans p ON p.plan_id = a.plan_id
           JOIN users u ON u.user_id = a.decided_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `a.approval_id AS id, p.plan_code, a.decision, a.reason, a.decided_at, u.full_name AS user_name`,
    dateColumn: 'a.decided_at',
    userColumn: 'a.decided_by',
    filterColumn: 'a.decision',
    filterValues: ['approved', 'rejected'],
    filterLabel: 'ผลการพิจารณา',
    orderBy: 'a.approval_id DESC',
  },
  evaluationApprovals: {
    label: 'การอนุมัติผลประเมิน',
    from: `quality_evaluation_approvals a
           JOIN quality_evaluations e ON e.evaluation_id = a.evaluation_id
           JOIN seedlings sl ON sl.seedling_id = e.seedling_id
           JOIN users u ON u.user_id = a.decided_by
           JOIN roles ro ON ro.role_id = u.role_id`,
    select: `a.approval_id AS id, sl.seedling_code, a.decision, a.reason, a.decided_at, u.full_name AS user_name`,
    dateColumn: 'a.decided_at',
    userColumn: 'a.decided_by',
    filterColumn: 'a.decision',
    filterValues: ['approved', 'rejected'],
    filterLabel: 'ผลการพิจารณา',
    orderBy: 'a.approval_id DESC',
  },
};

/** GET /api/reports/process-types — รายการประเภทรายงานที่เลือกได้ในตัวกรองที่ 1 */
function listProcessTypes(req, res) {
  const types = Object.entries(REPORT_TYPES).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    hasFilter: !!cfg.filterColumn,
    filterLabel: cfg.filterLabel,
    filterValues: cfg.filterValues,
  }));
  return res.json(types);
}

/** GET /api/reports/filter-users — รายชื่อผู้ใช้งานทั้งหมด สำหรับตัวกรองที่ 4 */
async function listReportUsers(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT u.user_id, u.full_name, u.username, r.role_name
       FROM users u JOIN roles r ON r.role_id = u.role_id
       ORDER BY u.full_name`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Report] listReportUsers error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

const VALID_ROLES = ['admin', 'staff', 'owner'];

/**
 * GET /api/reports/process — รายงานตามเงื่อนไข ครอบคลุมทุก process (D2–D9) + ประวัติการอนุมัติ
 * query: type (บังคับ), fromDate, toDate, category, role, userId
 * (category = ค่าตัวกรองที่ 3 ซึ่งความหมายแล้วแต่ประเภทรายงาน ดู REPORT_TYPES[type].filterColumn/filterLabel)
 */
async function getProcessReport(req, res) {
  const { type, fromDate, toDate, category, role, userId } = req.query;
  const cfg = REPORT_TYPES[type];
  if (!cfg) {
    return res.status(400).json({ message: `type ต้องเป็นหนึ่งใน: ${Object.keys(REPORT_TYPES).join(', ')}` });
  }

  const conditions = [];
  const params = [];

  if (fromDate) {
    conditions.push(`${cfg.dateColumn} >= ?`);
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push(`${cfg.dateColumn} <= ?`);
    params.push(toDate);
  }
  if (category) {
    if (!cfg.filterColumn || !cfg.filterValues.includes(category)) {
      return res.status(400).json({ message: 'ค่าตัวกรองไม่ถูกต้องสำหรับรายงานประเภทนี้' });
    }
    conditions.push(`${cfg.filterColumn} = ?`);
    params.push(category);
  }
  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: `role ต้องเป็นหนึ่งใน: ${VALID_ROLES.join(', ')}` });
    }
    conditions.push('ro.role_name = ?');
    params.push(role);
  }
  if (userId) {
    conditions.push(`${cfg.userColumn} = ?`);
    params.push(userId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT ${cfg.select} FROM ${cfg.from} ${whereClause} ORDER BY ${cfg.orderBy}`,
      params
    );

    let summary = [];
    if (cfg.filterColumn) {
      const [summaryRows] = await pool.query(
        `SELECT ${cfg.filterColumn} AS value, COUNT(*) AS total FROM ${cfg.from} ${whereClause} GROUP BY ${cfg.filterColumn}`,
        params
      );
      summary = summaryRows;
    }

    return res.json({ type, label: cfg.label, total: rows.length, summary, rows });
  } catch (err) {
    console.error('[Report] getProcessReport error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * GET /api/reports/seedling-traceability — ตรวจสอบย้อนกลับแหล่งที่มาของต้นกล้า
 * query: status (ไม่บังคับ) — ดึงรายการต้นกล้าพร้อมสายพันธุกรรมเต็มสาย
 */
async function listSeedlingTraceability(req, res) {
  const { status } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    if (!SEEDLING_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${SEEDLING_STATUSES.join(', ')}` });
    }
    conditions.push('sl.current_status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT sl.seedling_id, sl.seedling_code, sl.current_status, sl.germination_date,
              bp.plan_id, bp.plan_code,
              ft.tree_code AS father_tree_code, fv.variety_name AS father_variety,
              mt.tree_code AS mother_tree_code, mv.variety_name AS mother_variety
       FROM seedlings sl
       JOIN seeds s ON s.seed_id = sl.seed_id
       JOIN fruit_set_records fs ON fs.fruit_set_id = s.fruit_set_id
       JOIN pollination_records pr ON pr.pollination_id = fs.pollination_id
       JOIN breeding_plans bp ON bp.plan_id = pr.plan_id
       JOIN parent_trees ft ON ft.tree_id = bp.father_tree_id
       JOIN parent_trees mt ON mt.tree_id = bp.mother_tree_id
       JOIN mango_varieties fv ON fv.variety_id = ft.variety_id
       JOIN mango_varieties mv ON mv.variety_id = mt.variety_id
       ${whereClause}
       ORDER BY sl.seedling_id DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Report] listSeedlingTraceability error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/reports/seedling-traceability/:id — สายพันธุกรรมเต็มสายของต้นกล้าเดียว พร้อมการดูแลและผลประเมิน */
async function getSeedlingTraceability(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(
      `SELECT sl.seedling_id, sl.seedling_code, sl.current_status, sl.germination_date,
              s.seed_id, s.quality_grade AS seed_quality_grade, s.collected_date AS seed_collected_date,
              fs.fruit_set_id, fs.fruit_set_rate, fs.observed_date AS fruit_set_observed_date,
              pr.pollination_id, pr.pollination_date, pr.method AS pollination_method,
              bp.plan_id, bp.plan_code, bp.objective AS plan_objective,
              ft.tree_id AS father_tree_id, ft.tree_code AS father_tree_code, fv.variety_name AS father_variety,
              mt.tree_id AS mother_tree_id, mt.tree_code AS mother_tree_code, mv.variety_name AS mother_variety
       FROM seedlings sl
       JOIN seeds s ON s.seed_id = sl.seed_id
       JOIN fruit_set_records fs ON fs.fruit_set_id = s.fruit_set_id
       JOIN pollination_records pr ON pr.pollination_id = fs.pollination_id
       JOIN breeding_plans bp ON bp.plan_id = pr.plan_id
       JOIN parent_trees ft ON ft.tree_id = bp.father_tree_id
       JOIN parent_trees mt ON mt.tree_id = bp.mother_tree_id
       JOIN mango_varieties fv ON fv.variety_id = ft.variety_id
       JOIN mango_varieties mv ON mv.variety_id = mt.variety_id
       WHERE sl.seedling_id = ?`,
      [id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบต้นกล้านี้ หรือข้อมูลสายพันธุกรรมไม่ครบ' });

    const [careRecords] = await pool.query(
      `SELECT care_id, care_date, activity_type, height_cm, leaf_count, growth_note
       FROM care_records WHERE seedling_id = ? ORDER BY care_date DESC`,
      [id]
    );

    const [pestDiseaseRecords] = await pool.query(
      `SELECT record_id, found_date, issue_type, issue_name, severity, status
       FROM pest_disease_records WHERE seedling_id = ? ORDER BY found_date DESC`,
      [id]
    );

    const [evaluations] = await pool.query(
      `SELECT evaluation_id, evaluation_date, overall_score, overall_grade, status
       FROM quality_evaluations WHERE seedling_id = ? ORDER BY evaluation_date DESC`,
      [id]
    );

    return res.json({ ...rows[0], careRecords, pestDiseaseRecords, evaluations });
  } catch (err) {
    console.error('[Report] getSeedlingTraceability error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = {
  getSummary,
  listProcessTypes,
  listReportUsers,
  getProcessReport,
  listSeedlingTraceability,
  getSeedlingTraceability,
};
