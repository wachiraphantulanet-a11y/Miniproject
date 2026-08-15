const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const TREE_TYPES = ['father', 'mother'];
const TREE_STATUSES = ['active', 'inactive', 'removed'];

/**
 * GET /api/parent-trees — ผู้ใช้ที่ login แล้วทุกคนดูได้
 * query params (ไม่บังคับ): treeType=father|mother, varietyId, status
 */
async function listParentTrees(req, res) {
  const { treeType, varietyId, status } = req.query;
  const conditions = [];
  const params = [];

  if (treeType) {
    if (!TREE_TYPES.includes(treeType)) {
      return res.status(400).json({ message: `treeType ต้องเป็นหนึ่งใน: ${TREE_TYPES.join(', ')}` });
    }
    conditions.push('t.tree_type = ?');
    params.push(treeType);
  }
  if (varietyId) {
    conditions.push('t.variety_id = ?');
    params.push(varietyId);
  }
  if (status) {
    if (!TREE_STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${TREE_STATUSES.join(', ')}` });
    }
    conditions.push('t.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `SELECT t.tree_id, t.tree_code, t.tree_type, t.variety_id, v.variety_name,
              t.planted_date, t.location, t.status, t.notes, t.created_by, t.created_at
       FROM parent_trees t
       JOIN mango_varieties v ON v.variety_id = t.variety_id
       ${whereClause}
       ORDER BY t.tree_id`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[ParentTree] listParentTrees error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/parent-trees/:id */
async function getParentTree(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT t.tree_id, t.tree_code, t.tree_type, t.variety_id, v.variety_name,
              t.planted_date, t.location, t.status, t.notes, t.created_by, t.created_at
       FROM parent_trees t
       JOIN mango_varieties v ON v.variety_id = t.variety_id
       WHERE t.tree_id = ?`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบต้นพ่อ-แม่พันธุ์นี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[ParentTree] getParentTree error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** POST /api/parent-trees — admin, staff */
async function createParentTree(req, res) {
  const { treeCode, treeType, varietyId, plantedDate, location, notes } = req.body;

  if (!treeCode || !treeType || !varietyId) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (treeCode, treeType, varietyId)' });
  }
  if (!TREE_TYPES.includes(treeType)) {
    return res.status(400).json({ message: `treeType ต้องเป็นหนึ่งใน: ${TREE_TYPES.join(', ')}` });
  }

  try {
    const [variety] = await pool.query('SELECT variety_id FROM mango_varieties WHERE variety_id = ?', [varietyId]);
    if (!variety[0]) return res.status(400).json({ message: 'ไม่พบพันธุ์มะม่วงที่ระบุ (varietyId)' });

    const [existingCode] = await pool.query('SELECT tree_id FROM parent_trees WHERE tree_code = ?', [treeCode]);
    if (existingCode[0]) return res.status(409).json({ message: 'มีรหัสต้นไม้นี้อยู่แล้วในระบบ' });

    const [result] = await pool.query(
      `INSERT INTO parent_trees (tree_code, tree_type, variety_id, planted_date, location, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [treeCode, treeType, varietyId, plantedDate || null, location || null, notes || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'parent_trees',
      recordId: result.insertId,
      detail: `สร้างต้น${treeType === 'father' ? 'พ่อ' : 'แม่'}พันธุ์ ${treeCode}`,
    });

    return res.status(201).json({ treeId: result.insertId, treeCode, treeType, varietyId, status: 'active' });
  } catch (err) {
    console.error('[ParentTree] createParentTree error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/parent-trees/:id — admin, staff: แก้ไขข้อมูล / เปลี่ยนสถานะ (active/inactive/removed) */
async function updateParentTree(req, res) {
  const { id } = req.params;
  const { treeCode, plantedDate, location, status, notes } = req.body;

  if (status && !TREE_STATUSES.includes(status)) {
    return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${TREE_STATUSES.join(', ')}` });
  }

  try {
    const [existing] = await pool.query('SELECT tree_id FROM parent_trees WHERE tree_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบต้นพ่อ-แม่พันธุ์นี้' });

    if (treeCode) {
      const [dup] = await pool.query('SELECT tree_id FROM parent_trees WHERE tree_code = ? AND tree_id <> ?', [treeCode, id]);
      if (dup[0]) return res.status(409).json({ message: 'มีรหัสต้นไม้นี้อยู่แล้วในระบบ' });
    }

    await pool.query(
      `UPDATE parent_trees SET
         tree_code    = COALESCE(?, tree_code),
         planted_date = COALESCE(?, planted_date),
         location     = COALESCE(?, location),
         status       = COALESCE(?, status),
         notes        = COALESCE(?, notes)
       WHERE tree_id = ?`,
      [treeCode, plantedDate, location, status, notes, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'parent_trees',
      recordId: id,
      detail: JSON.stringify({ treeCode, plantedDate, location, status, notes }),
    });

    return res.json({ message: 'อัปเดตข้อมูลต้นพ่อ-แม่พันธุ์สำเร็จ' });
  } catch (err) {
    console.error('[ParentTree] updateParentTree error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listParentTrees, getParentTree, createParentTree, updateParentTree };
