const { pool } = require('../config/db');
const { logActivity } = require('../utils/activityLog');

const ISSUE_TYPES = ['disease', 'pest'];
const SEVERITIES = ['low', 'medium', 'high'];
const STATUSES = ['open', 'treated', 'resolved'];

const PEST_SELECT = `
  SELECT p.record_id, p.seedling_id, sl.seedling_code, p.care_id, p.found_date,
         p.issue_type, p.issue_name, p.severity, p.treatment, p.status,
         p.recorded_by, p.created_at
  FROM pest_disease_records p
  JOIN seedlings sl ON sl.seedling_id = p.seedling_id
`;

/** GET /api/pest-disease-records — filter ได้ด้วย ?seedlingId= ?status= ?issueType= */
async function listPestDiseaseRecords(req, res) {
  const { seedlingId, status, issueType } = req.query;
  const conditions = [];
  const params = [];

  if (seedlingId) {
    conditions.push('p.seedling_id = ?');
    params.push(seedlingId);
  }
  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${STATUSES.join(', ')}` });
    }
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (issueType) {
    if (!ISSUE_TYPES.includes(issueType)) {
      return res.status(400).json({ message: `issueType ต้องเป็นหนึ่งใน: ${ISSUE_TYPES.join(', ')}` });
    }
    conditions.push('p.issue_type = ?');
    params.push(issueType);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    const [rows] = await pool.query(
      `${PEST_SELECT} ${whereClause} ORDER BY p.found_date DESC, p.record_id DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    console.error('[PestDisease] listPestDiseaseRecords error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** GET /api/pest-disease-records/:id */
async function getPestDiseaseRecord(req, res) {
  try {
    const [rows] = await pool.query(`${PEST_SELECT} WHERE p.record_id = ?`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ message: 'ไม่พบบันทึกปัญหาโรค/แมลงนี้' });
    return res.json(rows[0]);
  } catch (err) {
    console.error('[PestDisease] getPestDiseaseRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/**
 * POST /api/pest-disease-records — admin, staff
 * แก้ Gap 2: บันทึกปัญหาโรค/แมลงผูกกับต้นกล้าโดยตรง (seedlingId บังคับ)
 * careId ไม่บังคับ — ใส่ได้ถ้าพบระหว่างรอบดูแลปกติ แต่ถ้าใส่ต้องเป็นของต้นกล้าเดียวกัน
 */
async function createPestDiseaseRecord(req, res) {
  const { seedlingId, careId, foundDate, issueType, issueName, severity, treatment } = req.body;

  if (!seedlingId || !foundDate || !issueType) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบ (seedlingId, foundDate, issueType)' });
  }
  if (!ISSUE_TYPES.includes(issueType)) {
    return res.status(400).json({ message: `issueType ต้องเป็นหนึ่งใน: ${ISSUE_TYPES.join(', ')}` });
  }
  if (severity && !SEVERITIES.includes(severity)) {
    return res.status(400).json({ message: `severity ต้องเป็นหนึ่งใน: ${SEVERITIES.join(', ')}` });
  }

  try {
    const [seedling] = await pool.query('SELECT seedling_id FROM seedlings WHERE seedling_id = ?', [seedlingId]);
    if (!seedling[0]) return res.status(400).json({ message: 'ไม่พบต้นกล้าที่ระบุ (seedlingId)' });

    if (careId) {
      const [care] = await pool.query('SELECT seedling_id FROM care_records WHERE care_id = ?', [careId]);
      if (!care[0]) return res.status(400).json({ message: 'ไม่พบบันทึกการดูแลที่ระบุ (careId)' });
      if (String(care[0].seedling_id) !== String(seedlingId)) {
        return res.status(400).json({ message: 'careId ที่ระบุไม่ใช่ของต้นกล้านี้' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO pest_disease_records
         (seedling_id, care_id, found_date, issue_type, issue_name, severity, treatment, status, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
      [seedlingId, careId || null, foundDate, issueType, issueName || null, severity || 'low', treatment || null, req.user.userId]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'CREATE',
      tableName: 'pest_disease_records',
      recordId: result.insertId,
      detail: `พบปัญหา ${issueType} ที่ seedlingId=${seedlingId}`,
    });

    return res.status(201).json({ recordId: result.insertId, seedlingId, issueType, status: 'open' });
  } catch (err) {
    console.error('[PestDisease] createPestDiseaseRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

/** PUT /api/pest-disease-records/:id — admin, staff: อัปเดตการรักษา/สถานะ */
async function updatePestDiseaseRecord(req, res) {
  const { id } = req.params;
  const { issueName, severity, treatment, status } = req.body;

  if (severity && !SEVERITIES.includes(severity)) {
    return res.status(400).json({ message: `severity ต้องเป็นหนึ่งใน: ${SEVERITIES.join(', ')}` });
  }
  if (status && !STATUSES.includes(status)) {
    return res.status(400).json({ message: `status ต้องเป็นหนึ่งใน: ${STATUSES.join(', ')}` });
  }

  try {
    const [existing] = await pool.query('SELECT record_id FROM pest_disease_records WHERE record_id = ?', [id]);
    if (!existing[0]) return res.status(404).json({ message: 'ไม่พบบันทึกปัญหาโรค/แมลงนี้' });

    await pool.query(
      `UPDATE pest_disease_records SET
         issue_name = COALESCE(?, issue_name),
         severity   = COALESCE(?, severity),
         treatment  = COALESCE(?, treatment),
         status     = COALESCE(?, status)
       WHERE record_id = ?`,
      [issueName, severity, treatment, status, id]
    );

    await logActivity({
      userId: req.user.userId,
      action: 'UPDATE',
      tableName: 'pest_disease_records',
      recordId: id,
      detail: JSON.stringify({ issueName, severity, treatment, status }),
    });

    return res.json({ message: 'อัปเดตบันทึกปัญหาโรค/แมลงสำเร็จ' });
  } catch (err) {
    console.error('[PestDisease] updatePestDiseaseRecord error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' });
  }
}

module.exports = { listPestDiseaseRecords, getPestDiseaseRecord, createPestDiseaseRecord, updatePestDiseaseRecord };
