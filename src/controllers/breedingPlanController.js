const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const PLAN_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected'];
const EDITABLE_STATUSES = ['draft', 'rejected']; // แก้ไขแผนได้เฉพาะตอนยังไม่ส่งอนุมัติ หรือถูกปฏิเสธแล้ว (Gap 3: loop กลับ)

const PLAN_SELECT = `
  SELECT p.plan_id, p.plan_code, p.objective, p.planned_start_date, p.planned_end_date,
         p.status, p.created_by, p.created_at, p.updated_at,
         f.tree_id AS father_tree_id, f.tree_code AS father_tree_code,
         m.tree_id AS mother_tree_id, m.tree_code AS mother_tree_code
  FROM breeding_plans p
  JOIN parent_trees f ON f.tree_id = p.father_tree_id
  JOIN parent_trees m ON m.tree_id = p.mother_tree_id
`;

async function validateParentTrees(fatherTreeId, motherTreeId) {
  if (String(fatherTreeId) === String(motherTreeId)) {
    return 'ต้นพ่อพันธุ์และต้นแม่พันธุ์ต้องไม่ใช่ต้นเดียวกัน';
  }
  const [father] = await pool.query(
    'SELECT tree_id FROM parent_trees WHERE tree_id = ? AND tree_type = ?',
    [fatherTreeId, 'father']
  );
  if (!father[0]) return 'ไม่พบต้นพ่อพันธุ์ที่ระบุ หรือต้นที่ระบุไม่ใช่ต้นพ่อพันธุ์ (fatherTreeId)';

  const [mother] = await pool.query(
    'SELECT tree_id FROM parent_trees WHERE tree_id = ? AND tree_type = ?',
    [motherTreeId, 'mother']
  );
  if (!mother[0]) return 'ไม่พบต้นแม่พันธุ์ที่ระบุ หรือต้นที่ระบุไม่ใช่ต้นแม่พันธุ์ (motherTreeId)';

  return null;
}

/** GET /api/breeding-plans — filter ได้ด้วย ?status= */
async function listBreedingPlans(req, res) {
  const { status } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    if (!PLAN_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${PLAN_STATUSES.join(', ')}` });
    }
    conditions.push('p.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${PLAN_SELECT} ${whereClause} ORDER BY p.plan_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[BreedingPlan] listBreedingPlans error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/breeding-plans/:id — รวมประวัติการอนุมัติ/ปฏิเสธ */
async function getBreedingPlan(req, res) {
  try {
    const [rows] = await pool.query(`${PLAN_SELECT} WHERE p.plan_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบแผนการเพาะพันธุ์นี้' });

    const [approvals] = await pool.query(
      `SELECT a.approval_id, a.decision, a.reason, a.decided_by, u.full_name AS decided_by_name, a.decided_at
       FROM breeding_plan_approvals a
       JOIN users u ON u.user_id = a.decided_by
       WHERE a.plan_id = ?
       ORDER BY a.decided_at DESC`,
      [req.params.id]
    );

    return res.json({ ...rows[0], approvals });
  } catch (err) {
    console.error('[BreedingPlan] getBreedingPlan error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/breeding-plans — admin, staff (สร้างเป็น draft เสมอ) */
async function createBreedingPlan(req, res) {
  const { planCode, fatherTreeId, motherTreeId, objective, plannedStartDate, plannedEndDate } = req.body;

  if (!planCode || !fatherTreeId || !motherTreeId) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (planCode, fatherTreeId, motherTreeId)' });
  }

  try {
    const validationError = await validateParentTrees(fatherTreeId, motherTreeId);
    if (validationError) return res.status(400).json({ message: validationError });

    const [existingCode] = await pool.query('SELECT plan_id FROM breeding_plans WHERE plan_code = ?', [planCode]);
    if (existingCode[0]) return res.status(409).json({ message: 'มีรหัสแผนนี้อยู่แล้วในระบบ' });

    const [result] = await pool.query(
      `INSERT INTO breeding_plans
         (plan_code, father_tree_id, mother_tree_id, objective, planned_start_date, planned_end_date, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'draft', ?)`,
      [planCode, fatherTreeId, motherTreeId, objective || null, plannedStartDate || null, plannedEndDate || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'breeding_plans',
      recordId: result.insertId,
      detail: `สร้างแผนการเพาะพันธุ์ ${planCode}`,
    });

    return res.status(201).json({ planId: result.insertId, planCode, status: 'draft' });
  } catch (err) {
    console.error('[BreedingPlan] createBreedingPlan error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/breeding-plans/:id — admin, staff: แก้ไขได้เฉพาะตอน draft หรือ rejected */
async function updateBreedingPlan(req, res) {
  const { id } = req.params;
  const { planCode, fatherTreeId, motherTreeId, objective, plannedStartDate, plannedEndDate } = req.body;

  try {
    const [existing] = await pool.query('SELECT status FROM breeding_plans WHERE plan_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบแผนการเพาะพันธุ์นี้' });

    if (!EDITABLE_STATUSES.includes(existing[0].status)) {
      return res.status(409).json({
        message: 'แก้ไขแผนนี้ไม่ได้ เนื่องจากอยู่ระหว่างรออนุมัติหรืออนุมัติแล้ว',
      });
    }

    if (fatherTreeId || motherTreeId) {
      const [current] = await pool.query(
        'SELECT father_tree_id, mother_tree_id FROM breeding_plans WHERE plan_id = ?',
        [id]
      );
      const nextFather = fatherTreeId || current[0].father_tree_id;
      const nextMother = motherTreeId || current[0].mother_tree_id;
      const validationError = await validateParentTrees(nextFather, nextMother);
      if (validationError) return res.status(400).json({ message: validationError });
    }

    if (planCode) {
      const [dup] = await pool.query('SELECT plan_id FROM breeding_plans WHERE plan_code = ? AND plan_id <> ?', [planCode, id]);
      if (dup[0]) return res.status(409).json({ message: 'มีรหัสแผนนี้อยู่แล้วในระบบ' });
    }

    await pool.query(
      `UPDATE breeding_plans SET
         plan_code          = COALESCE(?, plan_code),
         father_tree_id      = COALESCE(?, father_tree_id),
         mother_tree_id      = COALESCE(?, mother_tree_id),
         objective           = COALESCE(?, objective),
         planned_start_date  = COALESCE(?, planned_start_date),
         planned_end_date    = COALESCE(?, planned_end_date)
       WHERE plan_id = ?`,
      [planCode, fatherTreeId, motherTreeId, objective, plannedStartDate, plannedEndDate, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'breeding_plans',
      recordId: id,
      detail: JSON.stringify({ planCode, fatherTreeId, motherTreeId, objective, plannedStartDate, plannedEndDate }),
    });

    return res.json({ message: 'อัปเดตแผนการเพาะพันธุ์สำเร็จ' });
  } catch (err) {
    console.error('[BreedingPlan] updateBreedingPlan error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/breeding-plans/:id/submit — admin, staff: ส่งแผนให้เจ้าของสวนอนุมัติ */
async function submitBreedingPlan(req, res) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT status FROM breeding_plans WHERE plan_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบแผนการเพาะพันธุ์นี้' });

    if (!EDITABLE_STATUSES.includes(existing[0].status)) {
      return res.status(409).json({ message: 'ส่งแผนนี้ไม่ได้ เนื่องจากอยู่ระหว่างรออนุมัติหรืออนุมัติแล้ว' });
    }

    await pool.query(`UPDATE breeding_plans SET status = 'pending_approval' WHERE plan_id = ?`, [id]);

    await logActivity({
      userId: req.user.userId,
      action: 'SUBMIT',
      tableName: 'breeding_plans',
      recordId: id,
      detail: 'ส่งแผนการเพาะพันธุ์ให้เจ้าของสวนอนุมัติ',
    });

    return res.json({ message: 'ส่งแผนเพื่อรออนุมัติสำเร็จ' });
  } catch (err) {
    console.error('[BreedingPlan] submitBreedingPlan error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/breeding-plans/:id/decide — admin, owner: อนุมัติ/ปฏิเสธแผน */
async function decideBreedingPlan(req, res) {
  const { id } = req.params;
  const { decision, reason } = req.body;

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ message: "decision ต้องเป็น 'approved' หรือ 'rejected'" });
  }
  if (decision === 'rejected' && !reason) {
    return res.status(400).json({ message: 'กรุณาระบุเหตุผลการปฏิเสธ (reason)' });
  }

  try {
    const [existing] = await pool.query('SELECT status FROM breeding_plans WHERE plan_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบแผนการเพาะพันธุ์นี้' });

    if (existing[0].status !== 'pending_approval') {
      return res.status(409).json({ message: 'อนุมัติ/ปฏิเสธได้เฉพาะแผนที่อยู่ในสถานะรออนุมัติเท่านั้น' });
    }

    await pool.query(
      `INSERT INTO breeding_plan_approvals (plan_id, decision, reason, decided_by)
       VALUES (?, ?, ?, ?)`,
      [id, decision, reason || null, req.user.userId]
    );

    await pool.query('UPDATE breeding_plans SET status = ? WHERE plan_id = ?', [decision, id]);

    await logActivity({
      userId: req.user.userId,
      action: decision === 'approved' ? 'APPROVE' : 'REJECT',
      tableName: 'breeding_plans',
      recordId: id,
      detail: reason || null,
    });

    return res.json({ message: decision === 'approved' ? 'อนุมัติแผนสำเร็จ' : 'ปฏิเสธแผนสำเร็จ' });
  } catch (err) {
    console.error('[BreedingPlan] decideBreedingPlan error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = {
  listBreedingPlans,
  getBreedingPlan,
  createBreedingPlan,
  updateBreedingPlan,
  submitBreedingPlan,
  decideBreedingPlan,
};
