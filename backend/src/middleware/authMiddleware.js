const { verifyToken } = require('../utils/token');

/**
 * ตรวจสอบว่ามี token ที่ถูกต้องแนบมาใน Authorization header หรือไม่
 * รูปแบบที่รับ: "Authorization: Bearer <token>"
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'กรุณาเข้าสู่ระบบก่อนใช้งาน (ไม่พบ token)' });
  }

  try {
    const decoded = verifyToken(token);
    // แนบข้อมูลผู้ใช้ที่ decode ได้ไว้ใน req เพื่อให้ controller ถัดไปใช้งานต่อ
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token ไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่' });
  }
}

/**
 * ตรวจสอบว่า role ของผู้ใช้ที่ login อยู่ อยู่ในรายการ role ที่อนุญาตหรือไม่
 * ใช้งาน: router.get('/', authenticate, authorize('admin'), handler)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `ไม่มีสิทธิ์เข้าถึง (ต้องเป็น: ${allowedRoles.join(', ')})`,
      });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
