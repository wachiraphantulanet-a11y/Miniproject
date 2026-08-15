const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const CARE_SELECT = `
  SELECT c.care_id, c.seedling_id, sl.seedling_code, c.care_date, c.activity_type,
         c.height_cm, c.leaf_count, c.growth_note, c.recorded_by, c.created_at
  FROM care_records c
  JOIN seedlings sl ON sl.seedling_id = c.seedling_id
`;

/** GET /api/care-records — filter ได้ด้วย ?seedlingId= */
async function listCareRecords(req, res) {
  const { seedlingId } = req.query;
  const conditions = [];
  const params = [];

  if (seedlingId) {
    conditions.push('c.seedling_id = ?');
    params.push(seedlingId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `${CARE_SELECT} ${whereClause} ORDER BY c.seedling_id, c.care_date DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Care] listCareRecords error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/care-records/:id */
async function getCareRecord(req, res) {
  try {
    const [rows] = await pool.query(`${CARE_SELECT} WHERE c.care_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการดูแลนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Care] getCareRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/care-records — admin, staff */
async function createCareRecord(req, res) {
  const { seedlingId, careDate, activityType, heightCm, leafCount, growthNote } = req.body;

  if (!seedlingId || !careDate) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (seedlingId, careDate)' });
  }

  try {
    const [seedling] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_id = ?', [seedlingId]);
    if (!seedling[0]) return res.status(400).json({ message: 'ไม่พบต้นกล้าที่ระบุ (seedlingId)' });

    const [result] = await pool.query(
      `INSERT INTO care_records (seedling_id, care_date, activity_type, height_cm, leaf_count, growth_note, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [seedlingId, careDate, activityType || null, heightCm || null, leafCount || null, growthNote || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'care_records',
      recordId: result.insertId,
      detail: `บันทึกการดูแลต้นกล้า seedlingId=${seedlingId}`,
    });

    return res.status(201).json({ careId: result.insertId, seedlingId, careDate });
  } catch (err) {
    console.error('[Care] createCareRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/care-records/:id — admin, staff */
async function updateCareRecord(req, res) {
  const { id } = req.params;
  const { careDate, activityType, heightCm, leafCount, growthNote } = req.body;

  try {
    const [existing] = await pool.query('SELECT care_id FROM care_records WHERE care_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบบันทึกการดูแลนี้' });

    await pool.query(
      `UPDATE care_records SET
         care_date     = COALESCE(?, care_date),
         activity_type = COALESCE(?, activity_type),
         height_cm     = COALESCE(?, height_cm),
         leaf_count    = COALESCE(?, leaf_count),
         growth_note   = COALESCE(?, growth_note)
       WHERE care_id = ?`,
      [careDate, activityType, heightCm, leafCount, growthNote, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'care_records',
      recordId: id,
      detail: JSON.stringify({ careDate, activityType, heightCm, leafCount, growthNote }),
    });

    return res.json({ message: 'อัปเดตบันทึกการดูแลสำเร็จ' });
  } catch (err) {
    console.error('[Care] updateCareRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listCareRecords, getCareRecord, createCareRecord, updateCareRecord };
