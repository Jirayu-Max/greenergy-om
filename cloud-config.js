// ตั้งค่าการเชื่อมต่อคลาวด์ (Supabase) — ดูขั้นตอนในไฟล์ CLOUD_SETUP_TH.md
// ปล่อยว่างไว้ = ใช้งานแบบเดิม (เก็บข้อมูลในเครื่องนี้เท่านั้น)
// anonKey เป็นคีย์สาธารณะ (anon/public) ใส่ได้ — ห้ามใส่ service_role key เด็ดขาด
window.GREENERGY_CLOUD = {
  url: 'https://vgtagmuxwqvqepnrjgau.supabase.co',      // เช่น 'https://abcdxyz.supabase.co'
  anonKey: 'sb_publishable_G0ysUfXSY6T_kbJORFCdiw_r3Vij4WV',    // เช่น 'eyJhbGciOi...'
  allowedDomain: '' // (ไม่บังคับ) เช่น 'greenergy.co.th' — จำกัดอีเมลสมัครใช้งานฝั่งหน้าเว็บ
};
