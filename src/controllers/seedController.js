const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const SEED_SELECT = `
  SELECT s.seed_id, s.fruit_set_id, s.collected_date, s.seed_count, s.quality_grade,
         s.notes, s.recorded_by, s.created_at
  FROM seeds s
`;

/** GET /api/seeds — filter ได้ด้วย ?fruitSetId= */
async function listSeeds(req, res) {
  const { fruitSetId } = req.query;
  const conditions = [];
  const params = [];

  if (fruitSetId) {
    conditions.push('s.fruit_set_id = ?');
    params.push(fruitSetId);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(`${SEED_SELECT} ${whereClause} ORDER BY s.seed_id DESC`, params);
    return res.json(rows);
  } catch (err) {
    console.error('[Seed] listSeeds error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/seeds/:id */
async function getSeed(req, res) {
  try {
    const [rows] = await pool.query(`${SEED_SELECT} WHERE s.seed_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบบันทึกเมล็ดพันธุ์นี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Seed] getSeed error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/seeds — admin, staff */
async function createSeed(req, res) {
  const { fruitSetId, collectedDate, seedCount, qualityGrade, notes } = req.body;

  if (!fruitSetId) {
    return res.status(400).json({ message: 'กรุณาระบุ fruitSetId' });
  }

  try {
    const [fruitSet] = await pool.query('SELECT fruit_set_id FROM fruit_set_records WHERE fruit_set_id = ?', [fruitSetId]);
    if (!fruitSet[0]) return res.status(400).json({ message: 'ไม่พบบันทึกการติดผลที่ระบุ (fruitSetId)' });

    const [result] = await pool.query(
      `INSERT INTO seeds (fruit_set_id, collected_date, seed_count, quality_grade, notes, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fruitSetId, collectedDate || null, seedCount || null, qualityGrade || null, notes || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'seeds',
      recordId: result.insertId,
      detail: `บันทึกเมล็ดพันธุ์ของ fruitSetId=${fruitSetId}`,
    });

    return res.status(201).json({ seedId: result.insertId, fruitSetId });
  } catch (err) {
    console.error('[Seed] createSeed error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/seeds/:id — admin, staff */
async function updateSeed(req, res) {
  const { id } = req.params;
  const { collectedDate, seedCount, qualityGrade, notes } = req.body;

  try {
    const [existing] = await pool.query('SELECT seed_id FROM seeds WHERE seed_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบบันทึกเมล็ดพันธุ์นี้' });

    await pool.query(
      `UPDATE seeds SET
         collected_date = COALESCE(?, collected_date),
         seed_count     = COALESCE(?, seed_count),
         quality_grade  = COALESCE(?, quality_grade),
         notes          = COALESCE(?, notes)
       WHERE seed_id = ?`,
      [collectedDate, seedCount, qualityGrade, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'seeds',
      recordId: id,
      detail: JSON.stringify({ collectedDate, seedCount, qualityGrade, notes }),
    });

    return res.json({ message: 'อัปเดตบันทึกเมล็ดพันธุ์สำเร็จ' });
  } catch (err) {
    console.error('[Seed] updateSeed error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listSeeds, getSeed, createSeed, updateSeed };
