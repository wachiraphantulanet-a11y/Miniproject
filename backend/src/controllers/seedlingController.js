const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const SEEDLING_STATUSES = ['growing', 'ready_for_evaluation', 'passed', 'rejected', 'sold', 'disposed'];

const SEEDLING_SELECT = `
  SELECT sl.seedling_id, sl.seed_id, sl.seedling_code, sl.germination_date,
         sl.current_status, sl.notes, sl.created_at
  FROM seedlings sl
`;

/** GET /api/seedlings — filter ได้ด้วย ?seedId= และ ?status= */
async function listSeedlings(req, res) {
  const { seedId, status } = req.query;
  const conditions = [];
  const params = [];

  if (seedId) {
    conditions.push('sl.seed_id = ?');
    params.push(seedId);
  }
  if (status) {
    if (!SEEDLING_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${SEEDLING_STATUSES.join(', ')}` });
    }
    conditions.push('sl.current_status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${SEEDLING_SELECT} ${whereClause} ORDER BY sl.seedling_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[Seedling] listSeedlings error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/seedlings/:id */
async function getSeedling(req, res) {
  try {
    const [rows] = await pool.query(`${SEEDLING_SELECT} WHERE sl.seedling_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบต้นกล้านี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Seedling] getSeedling error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/seedlings — admin, staff */
async function createSeedling(req, res) {
  const { seedId, seedlingCode, germinationDate, notes } = req.body;

  if (!seedId || !seedlingCode) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (seedId, seedlingCode)' });
  }

  try {
    const [seed] = await pool.query('SELECT seed_id FROM seeds WHERE seed_id = ?', [seedId]);
    if (!seed[0]) return res.status(400).json({ message: 'ไม่พบบันทึกเมล็ดพันธุ์ที่ระบุ (seedId)' });

    const [existingCode] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_code = ?', [seedlingCode]);
    if (existingCode[0]) return res.status(409).json({ message: 'มีรหัสต้นกล้านี้อยู่แล้วในระบบ' });

    const [result] = await pool.query(
      `INSERT INTO seedlings (seed_id, seedling_code, germination_date, current_status, notes)
       VALUES (?, ?, ?, 'growing', ?)`,
      [seedId, seedlingCode, germinationDate || null, notes || null]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'seedlings',
      recordId: result.insertId,
      detail: `สร้างต้นกล้า ${seedlingCode}`,
    });

    return res.status(201).json({ seedlingId: result.insertId, seedlingCode, currentStatus: 'growing' });
  } catch (err) {
    console.error('[Seedling] createSeedling error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/seedlings/:id — admin, staff: แก้ไขข้อมูล / เปลี่ยนสถานะการเจริญเติบโต */
async function updateSeedling(req, res) {
  const { id } = req.params;
  const { seedlingCode, germinationDate, currentStatus, notes } = req.body;

  if (currentStatus && !SEEDLING_STATUSES.includes(currentStatus)) {
    return res.status(400).json({ message: `currentStatus ต้องเป็นหนึ่งใน: ${SEEDLING_STATUSES.join(', ')}` });
  }

  try {
    const [existing] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบต้นกล้านี้' });

    if (seedlingCode) {
      const [dup] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_code = ? AND seedling_id <> ?', [seedlingCode, id]);
      if (dup[0]) return res.status(409).json({ message: 'มีรหัสต้นกล้านี้อยู่แล้วในระบบ' });
    }

    await pool.query(
      `UPDATE seedlings SET
         seedling_code    = COALESCE(?, seedling_code),
         germination_date = COALESCE(?, germination_date),
         current_status   = COALESCE(?, current_status),
         notes            = COALESCE(?, notes)
       WHERE seedling_id = ?`,
      [seedlingCode, germinationDate, currentStatus, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'seedlings',
      recordId: id,
      detail: JSON.stringify({ seedlingCode, germinationDate, currentStatus, notes }),
    });

    return res.json({ message: 'อัปเดตข้อมูลต้นกล้าสำเร็จ' });
  } catch (err) {
    console.error('[Seedling] updateSeedling error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listSeedlings, getSeedling, createSeedling, updateSeedling };
