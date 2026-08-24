const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');
const { notifyUser } = require('../utils/notify');

const EVAL_STATUSES = ['pending_approval', 'approved', 'rejected'];
// ต้องตรงกับ QUALITY_GRADES ใน backend/src/controllers/seedController.js (เกรดเมล็ดพันธุ์)
const GRADES = ['A', 'B', 'C', 'D'];

const EVAL_SELECT = `
  SELECT e.evaluation_id, e.seedling_id, sl.seedling_code, e.evaluation_date,
         e.overall_score, e.overall_grade, e.status, e.evaluated_by, e.notes,
         e.revised_from_evaluation_id, e.created_at
  FROM quality_evaluations e
  JOIN seedlings sl ON sl.seedling_id = e.seedling_id
`;

/** GET /api/quality-evaluations — filter ได้ด้วย ?seedlingId= ?status= */
async function listEvaluations(req, res) {
  const { seedlingId, status } = req.query;
  const conditions = [];
  const params = [];

  if (seedlingId) {
    conditions.push('e.seedling_id = ?');
    params.push(seedlingId);
  }
  if (status) {
    if (!EVAL_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${EVAL_STATUSES.join(', ')}` });
    }
    conditions.push('e.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${EVAL_SELECT} ${whereClause} ORDER BY e.evaluation_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[QualityEvaluation] listEvaluations error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/quality-evaluations/:id — รวมประวัติการอนุมัติ/ปฏิเสธ */
async function getEvaluation(req, res) {
  try {
    const [rows] = await pool.query(`${EVAL_SELECT} WHERE e.evaluation_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบผลการประเมินคุณภาพนี้' });

    const [approvals] = await pool.query(
      `SELECT a.approval_id, a.decision, a.reason, a.decided_by, u.full_name AS decided_by_name, a.decided_at
       FROM quality_evaluation_approvals a
       JOIN users u ON u.user_id = a.decided_by
       WHERE a.evaluation_id = ?
       ORDER BY a.decided_at DESC`,
      [req.params.id]
    );

    return res.json({ ...rows[0], approvals });
  } catch (err) {
    console.error('[QualityEvaluation] getEvaluation error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * POST /api/quality-evaluations — admin, staff
 * ไม่มีสถานะ draft ในสคีมา สร้างแล้วเข้าสถานะ pending_approval ทันที (รอเจ้าของสวนพิจารณา)
 * ตาม Recommendation 5: ห้ามประเมินคุณภาพถ้ายังไม่มีข้อมูลการดูแล (D7) ของต้นกล้านั้น
 *
 * ผลประเมินเป็น record ที่ไม่แก้ไขซ้ำหลัง submit (ไม่มี PUT/submit endpoint) — ถ้าผลถูกปฏิเสธ
 * (สถานะจบ) แล้วต้องการประเมินใหม่ ให้เรียก endpoint นี้อีกครั้งพร้อมส่ง revisedFromEvaluationId
 * เพื่อสืบสายย้อนกลับไปผลเดิมที่ถูกปฏิเสธ
 */
async function createEvaluation(req, res) {
  const { seedlingId, evaluationDate, overallScore, overallGrade, notes, revisedFromEvaluationId } = req.body;

  if (!seedlingId || !evaluationDate || !overallGrade) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (seedlingId, evaluationDate, overallGrade)' });
  }
  if (!GRADES.includes(overallGrade)) {
    return res.status(400).json({ message: `overallGrade ต้องเป็นหนึ่งใน: ${GRADES.join(', ')}` });
  }

  try {
    const [seedling] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_id = ?', [seedlingId]);
    if (!seedling[0]) return res.status(400).json({ message: 'ไม่พบต้นกล้าที่ระบุ (seedlingId)' });

    const [care] = await pool.query('SELECT care_id FROM care_records WHERE seedling_id = ? LIMIT 1', [seedlingId]);
    if (!care[0]) {
      return res.status(409).json({ message: 'ประเมินคุณภาพไม่ได้ เนื่องจากยังไม่มีข้อมูลการดูแลต้นกล้านี้' });
    }

    if (revisedFromEvaluationId) {
      const [prev] = await pool.query('SELECT status FROM quality_evaluations WHERE evaluation_id = ?', [revisedFromEvaluationId]);
      if (!prev[0]) return res.status(400).json({ message: 'ไม่พบผลประเมินเดิมที่อ้างอิง (revisedFromEvaluationId)' });
      if (prev[0].status !== 'rejected') {
        return res.status(409).json({ message: 'อ้างอิงผลประเมินเดิมได้เฉพาะผลที่ถูกปฏิเสธเท่านั้น' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO quality_evaluations
         (seedling_id, evaluation_date, overall_score, overall_grade, status, evaluated_by, notes, revised_from_evaluation_id)
       VALUES (?, ?, ?, ?, 'pending_approval', ?, ?, ?)`,
      [seedlingId, evaluationDate, overallScore || null, overallGrade, req.user.userId, notes || null, revisedFromEvaluationId || null]
    );

    await pool.query(`UPDATE seedlings SET current_status = 'ready_for_evaluation' WHERE seedling_id = ?`, [seedlingId]);

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'quality_evaluations',
      recordId: result.insertId,
      detail: revisedFromEvaluationId
        ? `ประเมินคุณภาพต้นกล้า seedlingId=${seedlingId} เกรด ${overallGrade} แทนผลที่ถูกปฏิเสธ (evaluation_id=${revisedFromEvaluationId})`
        : `ประเมินคุณภาพต้นกล้า seedlingId=${seedlingId} เกรด ${overallGrade}`,
    });

    return res.status(201).json({ evaluationId: result.insertId, seedlingId, status: 'pending_approval' });
  } catch (err) {
    console.error('[QualityEvaluation] createEvaluation error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * POST /api/quality-evaluations/:id/decide — admin, owner: อนุมัติ/ปฏิเสธผลประเมิน
 * เมื่ออนุมัติ จะอัปเดตสถานะต้นกล้าตามเกรด (fail -> rejected, อื่นๆ -> passed)
 */
async function decideEvaluation(req, res) {
  const { id } = req.params;
  const { decision, reason } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: "decision ต้องเป็น 'approved' หรือ 'rejected'" });
  }
  if (decision === 'rejected' && !reason) {
    return res.status(400).json({ message: 'กรุณาระบุเหตุผลการปฏิเสธ (reason)' });
  }

  try {
    const [existing] = await pool.query(
      `SELECT e.status, e.seedling_id, e.overall_grade, e.evaluated_by, sl.seedling_code
       FROM quality_evaluations e
       JOIN seedlings sl ON sl.seedling_id = e.seedling_id
       WHERE e.evaluation_id = ?`,
      [id]
    );
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบผลการประเมินคุณภาพนี้' });

    if (existing[0].status !== 'pending_approval') {
      return res.status(409).json({ message: 'อนุมัติ/ปฏิเสธได้เฉพาะผลประเมินที่อยู่ในสถานะรอพิจารณาเท่านั้น' });
    }

    await pool.query(
      `INSERT INTO quality_evaluation_approvals (evaluation_id, decision, reason, decided_by)
       VALUES (?, ?, ?, ?)`,
      [id, decision, reason || null, req.user.userId]
    );

    await pool.query('UPDATE quality_evaluations SET status = ? WHERE evaluation_id = ?', [decision, id]);

    if (decision === 'approved') {
      const nextSeedlingStatus = existing[0].overall_grade === 'D' ? 'rejected' : 'passed';
      await pool.query('UPDATE seedlings SET current_status = ? WHERE seedling_id = ?', [
        nextSeedlingStatus,
        existing[0].seedling_id,
      ]);
    }

    await logActivity({
      userId: req.user.userId,
      action: decision === 'approved' ? 'APPROVE' : 'REJECT',
      tableName: 'quality_evaluations',
      recordId: id,
      detail: reason || null,
    });

    if (decision === 'rejected') {
      await notifyUser({
        userId: existing[0].evaluated_by,
        type: 'evaluation_rejected',
        message: `ผลประเมินคุณภาพต้นกล้า ${existing[0].seedling_code} ถูกปฏิเสธ: ${reason}`,
        relatedTable: 'quality_evaluations',
        relatedId: id,
      });
    }

    return res.json({ message: decision === 'approved' ? 'อนุมัติผลประเมินสำเร็จ' : 'ปฏิเสธผลประเมินสำเร็จ' });
  } catch (err) {
    console.error('[QualityEvaluation] decideEvaluation error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = {
  listEvaluations,
  getEvaluation,
  createEvaluation,
  decideEvaluation,
};
