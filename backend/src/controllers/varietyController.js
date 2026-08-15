const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

/** GET /api/varieties — ผู้ใช้ที่ login แล้วทุกคนดูได้ */
async function listVarieties(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT variety_id, variety_name, taste, color, avg_size_g, harvest_days,
              disease_resistance, suitable_climate, notes, created_by, created_at, updated_at
       FROM mango_varieties
       ORDER BY variety_id`
    );
    return res.json(rows);
  } catch (err) {
    console.error('[Variety] listVarieties error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/varieties/:id */
async function getVariety(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT variety_id, variety_name, taste, color, avg_size_g, harvest_days,
              disease_resistance, suitable_climate, notes, created_by, created_at, updated_at
       FROM mango_varieties WHERE variety_id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบพันธุ์มะม่วงนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[Variety] getVariety error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/varieties — admin, staff */
async function createVariety(req, res) {
  const {
    varietyName, taste, color, avgSizeG, harvestDays,
    diseaseResistance, suitableClimate, notes,
  } = req.body;

  if (!varietyName) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อพันธุ์มะม่วง' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO mango_varieties
         (variety_name, taste, color, avg_size_g, harvest_days,
          disease_resistance, suitable_climate, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        varietyName, taste || null, color || null, avgSizeG || null, harvestDays || null,
        diseaseResistance || null, suitableClimate || null, notes || null, req.user.userId,
      ]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'mango_varieties',
      recordId: result.insertId,
      detail: `สร้างพันธุ์มะม่วง ${varietyName}`,
    });

    return res.status(201).json({ varietyId: result.insertId, varietyName });
  } catch (err) {
    console.error('[Variety] createVariety error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/varieties/:id — admin, staff */
async function updateVariety(req, res) {
  const { id } = req.params;
  const {
    varietyName, taste, color, avgSizeG, harvestDays,
    diseaseResistance, suitableClimate, notes,
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT variety_id FROM mango_varieties WHERE variety_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบพันธุ์มะม่วงนี้' });

    await pool.query(
      `UPDATE mango_varieties SET
         variety_name       = COALESCE(?, variety_name),
         taste              = COALESCE(?, taste),
         color              = COALESCE(?, color),
         avg_size_g         = COALESCE(?, avg_size_g),
         harvest_days       = COALESCE(?, harvest_days),
         disease_resistance = COALESCE(?, disease_resistance),
         suitable_climate   = COALESCE(?, suitable_climate),
         notes              = COALESCE(?, notes)
       WHERE variety_id = ?`,
      [varietyName, taste, color, avgSizeG, harvestDays, diseaseResistance, suitableClimate, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'mango_varieties',
      recordId: id,
      detail: JSON.stringify({ varietyName, taste, color, avgSizeG, harvestDays, diseaseResistance, suitableClimate, notes }),
    });

    return res.json({ message: 'อัปเดตข้อมูลพันธุ์มะม่วงสำเร็จ' });
  } catch (err) {
    console.error('[Variety] updateVariety error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** DELETE /api/varieties/:id — admin, staff */
async function deleteVariety(req, res) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT variety_id FROM mango_varieties WHERE variety_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบพันธุ์มะม่วงนี้' });

    await pool.query('DELETE FROM mango_varieties WHERE variety_id = ?', [id]);

    await logActivity({
      userId: req.user.userId,
      action: 'DELETE',
      tableName: 'mango_varieties',
      recordId: id,
    });

    return res.json({ message: 'ลบพันธุ์มะม่วงสำเร็จ' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({ message: 'ไม่สามารถลบได้ เนื่องจากมีต้นพ่อ-แม่พันธุ์อ้างอิงพันธุ์นี้อยู่' });
    }
    console.error('[Variety] deleteVariety error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listVarieties, getVariety, createVariety, updateVariety, deleteVariety };
