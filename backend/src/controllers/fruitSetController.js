const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');
const { isBeforeDate } = require('../utils/dateOrder');

const FRUIT_SET_SELECT = `
  SELECT fs.fruit_set_id, fs.fruit_set_code, fs.pollination_id, r.plan_id, p.plan_code, fs.observed_date,
         fs.fruit_count, fs.fruit_set_rate, fs.notes, fs.recorded_by, fs.created_at
  FROM fruit_set_records fs
  JOIN pollination_records r ON r.pollination_id = fs.pollination_id
  JOIN breeding_plans p ON p.plan_id = r.plan_id
`;

function calcRate(fruitCount, flowerCount) {
  if (fruitCount == null || !flowerCount) return null;
  return Number(((fruitCount / flowerCount) * 100).toFixed(2));
}

/** GET /api/fruit-sets — filter ได้ด้วย ?pollinationId= */
async function listFruitSets(req, res) {
  const { pollinationId } = req.query;
  const conditions = [];
  const params = [];

  if (pollinationId) {
    conditions.push('fs.pollination_id = ?');
    params.push(pollinationId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${FRUIT_SET_SELECT} ${whereClause} ORDER BY fs.fruit_set_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[FruitSet] listFruitSets error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/fruit-sets/:id */
async function getFruitSet(req, res) {
  try {
    const [rows] = await pool.query(`${FRUIT_SET_SELECT} WHERE fs.fruit_set_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการติดผลนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[FruitSet] getFruitSet error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/fruit-sets — admin, staff */
async function createFruitSet(req, res) {
  const { pollinationId, observedDate, fruitCount, notes } = req.body;
  let { fruitSetRate } = req.body;

  if (!pollinationId || !observedDate) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (pollinationId, observedDate)' });
  }

  try {
    const [pollination] = await pool.query(
      'SELECT flower_count, pollination_date FROM pollination_records WHERE pollination_id = ?',
      [pollinationId]
    );
    if (!pollination[0]) return res.status(400).json({ message: 'ไม่พบบันทึกการผสมเกสรที่ระบุ (pollinationId)' });

    if (isBeforeDate(observedDate, pollination[0].pollination_date)) {
      return res.status(400).json({ message: 'วันที่สังเกตต้องไม่ก่อนวันที่ผสมเกสร' });
    }

    // ถ้าไม่ได้ส่ง fruitSetRate มา คำนวณให้อัตโนมัติจาก fruit_count / flower_count * 100
    if (fruitSetRate == null) {
      fruitSetRate = calcRate(fruitCount, pollination[0].flower_count);
    }

    const [result] = await pool.query(
      `INSERT INTO fruit_set_records (pollination_id, observed_date, fruit_count, fruit_set_rate, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pollinationId, observedDate, fruitCount || null, fruitSetRate, notes || null, req.user.userId]
    );

    // รหัสการติดผล สร้างอัตโนมัติจาก fruit_set_id ที่เพิ่งได้ (รันต่อเนื่องเสมอ ไม่ชนกัน)
    const fruitSetCode = `FS-${String(result.insertId).padStart(6, '0')}`;
    await pool.query('UPDATE fruit_set_records SET fruit_set_code = ? WHERE fruit_set_id = ?', [fruitSetCode, result.insertId]);

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'fruit_set_records',
      recordId: result.insertId,
      detail: `บันทึกการติดผล ${fruitSetCode} ของ pollinationId=${pollinationId}`,
    });

    return res.status(201).json({ fruitSetId: result.insertId, fruitSetCode, pollinationId, observedDate, fruitSetRate });
  } catch (err) {
    console.error('[FruitSet] createFruitSet error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/fruit-sets/:id — admin, staff */
async function updateFruitSet(req, res) {
  const { id } = req.params;
  const { observedDate, fruitCount, notes } = req.body;
  let { fruitSetRate } = req.body;

  try {
    const [existing] = await pool.query(
      `SELECT fs.pollination_id, fs.fruit_count, r.flower_count, r.pollination_date
       FROM fruit_set_records fs
       JOIN pollination_records r ON r.pollination_id = fs.pollination_id
       WHERE fs.fruit_set_id = ?`,
      [id]
    );
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการติดผลนี้' });

    if (observedDate && isBeforeDate(observedDate, existing[0].pollination_date)) {
      return res.status(400).json({ message: 'วันที่สังเกตต้องไม่ก่อนวันที่ผสมเกสร' });
    }

    // ถ้าไม่ได้ส่ง fruitSetRate มาแต่มีการแก้ fruitCount ให้คำนวณอัตราใหม่อัตโนมัติ
    if (fruitSetRate == null && fruitCount != null) {
      fruitSetRate = calcRate(fruitCount, existing[0].flower_count);
    }

    await pool.query(
      `UPDATE fruit_set_records SET
         observed_date  = COALESCE(?, observed_date),
         fruit_count    = COALESCE(?, fruit_count),
         fruit_set_rate = COALESCE(?, fruit_set_rate),
         notes          = COALESCE(?, notes)
       WHERE fruit_set_id = ?`,
      [observedDate, fruitCount, fruitSetRate, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'fruit_set_records',
      recordId: id,
      detail: JSON.stringify({ observedDate, fruitCount, fruitSetRate, notes }),
    });

    return res.json({ message: 'อัปเดตบันทึกการติดผลสำเร็จ' });
  } catch (err) {
    console.error('[FruitSet] updateFruitSet error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listFruitSets, getFruitSet, createFruitSet, updateFruitSet };
