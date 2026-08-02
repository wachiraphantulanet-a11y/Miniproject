const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const EVAL_STATUSES = ['pending_approval', 'approved', 'rejected'];
const GRADES = ['A', 'B', 'C', 'fail'];

const EVAL_SELECT = `
  SELECT e.evaluation_id, e.seedling_id, sl.seedling_code, e.evaluation_date,
         e.overall_score, e.overall_grade, e.status, e.evaluated_by, e.notes, e.created_at
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
 */
async function createEvaluation(req, res) {
  const { seedlingId, evaluationDate, overallScore, overallGrade, notes } = req.body;

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

    const [result] = await pool.query(
      `INSERT INTO quality_evaluations (seedling_id, evaluation_date, overall_score, overall_grade, status, evaluated_by, notes)
       VALUES (?, ?, ?, ?, 'pending_approval', ?, ?)`,
      [seedlingId, evaluationDate, overallScore || null, overallGrade, req.user.userId, notes || null]
    );

    await pool.query(`UPDATE seedlings SET current_status = 'ready_for_evaluation' WHERE seedling_id = ?`, [seedlingId]);

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'quality_evaluations',
      recordId: result.insertId,
      detail: `ประเมินคุณภาพต้นกล้า seedlingId=${seedlingId} เกรด ${overallGrade}`,
    });

    return res.status(201).json({ evaluationId: result.insertId, seedlingId, status: 'pending_approval' });
  } catch (err) {
    console.error('[QualityEvaluation] createEvaluation error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/quality-evaluations/:id — admin, staff: แก้ไขได้เฉพาะตอนถูกปฏิเสธแล้ว (loop กลับ) */
async function updateEvaluation(req, res) {
  const { id } = req.params;
  const { evaluationDate, overallScore, overallGrade, notes } = req.body;

  if (overallGrade && !GRADES.includes(overallGrade)) {
    return res.status(400).json({ message: `overallGrade ต้องเป็นหนึ่งใน: ${GRADES.join(', ')}` });
  }

  try {
    const [existing] = await pool.query('SELECT status FROM quality_evaluations WHERE evaluation_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบผลการประเมินคุณภาพนี้' });

    if (existing[0].status !== 'rejected') {
      return res.status(409).json({ message: 'แก้ไขผลประเมินนี้ไม่ได้ เนื่องจากอยู่ระหว่างรออนุมัติหรืออนุมัติแล้ว' });
    }

    await pool.query(
      `UPDATE quality_evaluations SET
         evaluation_date = COALESCE(?, evaluation_date),
         overall_score   = COALESCE(?, overall_score),
         overall_grade   = COALESCE(?, overall_grade),
         notes           = COALESCE(?, notes)
       WHERE evaluation_id = ?`,
      [evaluationDate, overallScore, overallGrade, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'quality_evaluations',
      recordId: id,
      detail: JSON.stringify({ evaluationDate, overallScore, overallGrade, notes }),
    });

    return res.json({ message: 'อัปเดตผลการประเมินคุณภาพสำเร็จ' });
  } catch (err) {
    console.error('[QualityEvaluation] updateEvaluation error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/quality-evaluations/:id/submit — admin, staff: ส่งผลประเมิน (ที่ถูกปฏิเสธ) กลับเข้ารออนุมัติใหม่ */
async function submitEvaluation(req, res) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT status FROM quality_evaluations WHERE evaluation_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบผลการประเมินคุณภาพนี้' });

    if (existing[0].status !== 'rejected') {
      return res.status(409).json({ message: 'ส่งผลประเมินนี้ไม่ได้ เนื่องจากไม่ได้อยู่ในสถานะถูกปฏิเสธ' });
    }

    await pool.query(`UPDATE quality_evaluations SET status = 'pending_approval' WHERE evaluation_id = ?`, [id]);

    await logActivity({
      userId: req.user.userId,
      action: 'SUBMIT',
      tableName: 'quality_evaluations',
      recordId: id,
      detail: 'ส่งผลการประเมินคุณภาพให้เจ้าของสวนพิจารณาอีกครั้ง',
    });

    return res.json({ message: 'ส่งผลประเมินเพื่อรอพิจารณาสำเร็จ' });
  } catch (err) {
    console.error('[QualityEvaluation] submitEvaluation error:', err);
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
      'SELECT status, seedling_id, overall_grade FROM quality_evaluations WHERE evaluation_id = ?',
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
      const nextSeedlingStatus = existing[0].overall_grade === 'fail' ? 'rejected' : 'passed';
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
  updateEvaluation,
  submitEvaluation,
  decideEvaluation,
};
