// เปรียบเทียบวันที่แบบ string 'YYYY-MM-DD' — ใช้ lexicographic compare ได้ตรงๆ
// เพราะ mysql2 ตั้ง dateStrings: true (backend/src/config/db.js) จึงคืนค่า DATE เป็น
// string รูปแบบนี้เสมอ ไม่ต้องแปลงเป็น Date object ก่อนเทียบ
function isBeforeDate(dateA, dateB) {
  return String(dateA) < String(dateB);
}

module.exports = { isBeforeDate };
