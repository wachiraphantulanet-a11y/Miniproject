const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const POLLINATION_SELECT = `
  SELECT r.pollination_id, r.plan_id, p.plan_code, r.pollination_date, r.flower_count,
         r.method, r.notes, r.recorded_by, r.created_at
  FROM pollination_records r
  JOIN breeding_plans p ON p.plan_id = r.plan_id
`;

/** GET /api/pollinations — filter ได้ด้วย ?planId= */
async function listPollinations(req, res) {
  const { planId } = req.query;
  const conditions = [];
  const params = [];

  if (planId) {
    conditions.push('r.plan_id = ?');
    params.push(planId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${POLLINATION_SELECT} ${whereClause} ORDER BY r.pollination_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[Pollination] listPollinations error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/pollinations/:id */
async function getPollination(req, res) {
  try {
    const [rows] = await pool.query(`${POLLINATION_SELECT} WHERE r.pollination_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการผสมเกสรนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Pollination] getPollination error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/pollinations — admin, staff: บันทึกได้เฉพาะแผนที่อนุมัติแล้วเท่านั้น */
async function createPollination(req, res) {
  const { planId, pollinationDate, flowerCount, method, notes } = req.body;

  if (!planId || !pollinationDate) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (planId, pollinationDate)' });
  }

  try {
    const [plan] = await pool.query('SELECT status FROM breeding_plans WHERE plan_id = ?', [planId]);
    if (!plan[0]) return res.status(400).json({ message: 'ไม่พบแผนการเพาะพันธุ์ที่ระบุ (planId)' });
    if (plan[0].status !== 'approved') {
      return res.status(409).json({ message: 'บันทึกการผสมเกสรได้เฉพาะแผนที่ได้รับการอนุมัติแล้วเท่านั้น' });
    }

    const [result] = await pool.query(
      `INSERT INTO pollination_records (plan_id, pollination_date, flower_count, method, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [planId, pollinationDate, flowerCount || null, method || null, notes || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'pollination_records',
      recordId: result.insertId,
      detail: `บันทึกการผสมเกสรของแผน planId=${planId}`,
    });

    return res.status(201).json({ pollinationId: result.insertId, planId, pollinationDate });
  } catch (err) {
    console.error('[Pollination] createPollination error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/pollinations/:id — admin, staff */
async function updatePollination(req, res) {
  const { id } = req.params;
  const { pollinationDate, flowerCount, method, notes } = req.body;

  try {
    const [existing] = await pool.query('SELECT pollination_id FROM pollination_records WHERE pollination_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการผสมเกสรนี้' });

    await pool.query(
      `UPDATE pollination_records SET
         pollination_date = COALESCE(?, pollination_date),
         flower_count     = COALESCE(?, flower_count),
         method            = COALESCE(?, method),
         notes             = COALESCE(?, notes)
       WHERE pollination_id = ?`,
      [pollinationDate, flowerCount, method, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'pollination_records',
      recordId: id,
      detail: JSON.stringify({ pollinationDate, flowerCount, method, notes }),
    });

    return res.json({ message: 'อัปเดตบันทึกการผสมเกสรสำเร็จ' });
  } catch (err) {
    console.error('[Pollination] updatePollination error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listPollinations, getPollination, createPollination, updatePollination };
