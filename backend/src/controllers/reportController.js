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

/**
 * GET /api/reports/breeding-plans — สรุปแผนการเพาะพันธุ์ตามเงื่อนไข
 * query: status, fromDate, toDate (เทียบกับ planned_start_date)
 */
async function getBreedingPlanReport(req, res) {
  const { status, fromDate, toDate } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (fromDate) {
    conditions.push('p.planned_start_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.planned_start_date <= ?');
    params.push(toDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT p.plan_id, p.plan_code, p.status, p.planned_start_date, p.planned_end_date,
              f.tree_code AS father_tree_code, m.tree_code AS mother_tree_code,
              (SELECT COUNT(*) FROM pollination_records r WHERE r.plan_id = p.plan_id) AS pollination_count
       FROM breeding_plans p
       JOIN parent_trees f ON f.tree_id = p.father_tree_id
       JOIN parent_trees m ON m.tree_id = p.mother_tree_id
       ${whereClause}
       ORDER BY p.planned_start_date DESC, p.plan_id DESC`,
      params
    );

    const [summary] = await pool.query(
      `SELECT p.status, COUNT(*) AS total
       FROM breeding_plans p
       ${whereClause}
       GROUP BY p.status`,
      params
    );

    return res.json({ summary, plans: rows });
  } catch (err) {
    console.error('[Report] getBreedingPlanReport error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * GET /api/reports/pest-disease — สรุปปัญหาโรค/แมลงตามเงื่อนไข
 * query: issueType, severity, status, fromDate, toDate
 */
async function getPestDiseaseReport(req, res) {
  const { issueType, severity, status, fromDate, toDate } = req.query;
  const conditions = [];
  const params = [];

  if (issueType) {
    conditions.push('p.issue_type = ?');
    params.push(issueType);
  }
  if (severity) {
    conditions.push('p.severity = ?');
    params.push(severity);
  }
  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (fromDate) {
    conditions.push('p.found_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.found_date <= ?');
    params.push(toDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT p.record_id, p.seedling_id, sl.seedling_code, p.found_date, p.issue_type,
              p.issue_name, p.severity, p.status, p.treatment
       FROM pest_disease_records p
       JOIN seedlings sl ON sl.seedling_id = p.seedling_id
       ${whereClause}
       ORDER BY p.found_date DESC`,
      params
    );

    const [summary] = await pool.query(
      `SELECT p.issue_type, p.severity, p.status, COUNT(*) AS total
       FROM pest_disease_records p
       ${whereClause}
       GROUP BY p.issue_type, p.severity, p.status`,
      params
    );

    return res.json({ summary, records: rows });
  } catch (err) {
    console.error('[Report] getPestDiseaseReport error:', err);
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
  getBreedingPlanReport,
  getPestDiseaseReport,
  listSeedlingTraceability,
  getSeedlingTraceability,
};
