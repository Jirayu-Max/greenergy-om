'use strict';
// ═══ Cloud sync (Supabase) — ข้อมูลกลางของทีม + สิทธิ์ แก้ไข/ดูอย่างเดียว ═══════════════
// หลักการ: local-first (ยังเก็บใน localStorage ตามเดิม) แล้วซิงก์ขึ้นตาราง app_data
//  • แต่ละชุดข้อมูล (records/ppm/projects/options/opdir/flow) = 1 แถว มี version
//  • บันทึกแบบ compare-and-swap; ถ้าชนกับคนอื่น → รวมข้อมูลแบบ 3-way (ตาม id ของแต่ละงาน) แล้วบันทึกซ้ำ
//  • ตารางไม่อนุญาตให้ลบ และมี app_data_history เก็บเวอร์ชันก่อนหน้าทุกครั้ง
const CFG = window.GREENERGY_CLOUD || {};
const CLOUD = { on: !!(CFG.url && CFG.anonKey && window.supabase), sb: null, user: null, role: null, base: {}, ver: {}, timers: {}, busy: {}, last: null, state: 'idle', needRefresh: false };
const cloudEdit = () => CLOUD.role === 'admin' || CLOUD.role === 'editor';
const ROLE_TH = { admin: 'ผู้ดูแลระบบ', editor: 'แก้ไขได้', viewer: 'ดูอย่างเดียว' };
const J = v => JSON.stringify(v === undefined ? null : v);
const eqv = (a, b) => J(a) === J(b);

// ── ชุดข้อมูลที่ซิงก์ ─────────────────────────────────────────────
const COL = {
  records:  { idKey: 'id',  get: () => records,   set: v => { records = v.map(migrate); nextId = Math.max(0, ...records.map(r => r.id)) + 1; _orig.save(); }, empty: v => !v.length },
  ppm:      { idKey: 'pid', get: () => ppmRecords, set: v => { ppmRecords = v; ppmNextId = Math.max(0, ...ppmRecords.map(p => p.pid || 0)) + 1; _orig.ppmSaveStore(); }, empty: v => !v.length },
  projects: { idKey: 'pid', get: () => pjRecords, set: v => { pjRecords = v.map(pjMigrate); nextPid = Math.max(0, ...pjRecords.map(p => p.pid || 0)) + 1; _orig.pjSave(); }, empty: v => !v.length },
  options:  { get: () => options, set: v => { options = v; ['typeOfWork','project','owner','operator','jobDescriptions','priority','status','report'].forEach(k => { if (!Array.isArray(options[k])) options[k] = []; }); _orig.saveOpts(); } },
  opdir:    { get: () => ({ emails: opDir.emails || {}, organizer: opDir.organizer || '', sent: opDir.sent || {} }), set: v => { opDir.emails = v.emails || {}; opDir.organizer = v.organizer || ''; opDir.sent = v.sent || {}; _orig.opSaveDir(); } },
  flow:     { get: () => ({ flowUrl: opDir.flowUrl || '', autoSend: !!opDir.autoSend }), set: v => { opDir.flowUrl = v.flowUrl || ''; opDir.autoSend = !!v.autoSend; _orig.opSaveDir(); }, secret: true },   // อ่านได้เฉพาะผู้แก้ไข (RLS)
};
const KEYMAP = { save: ['records'], ppmSaveStore: ['ppm'], pjSave: ['projects'], saveOpts: ['options'], opSaveDir: ['opdir', 'flow'] };
const _orig = {};

// ── รวมข้อมูล 3 ทาง (base = ตอนซิงก์ล่าสุด, local = ที่แก้ในเครื่อง, remote = ล่าสุดในคลาวด์) ──
const isObj = x => x && typeof x === 'object' && !Array.isArray(x);
const isPrimArr = a => Array.isArray(a) && a.every(x => x === null || typeof x !== 'object');
function mergeById(base, local, remote, idKey) {
  const m = a => new Map((a || []).map(x => [x[idKey], x])), bm = m(base), lm = m(local), out = m(remote);
  let mx = Math.max(0, ...[...bm.keys(), ...lm.keys(), ...out.keys()].filter(Number.isFinite));
  for (const [id, l] of lm) {
    const b = bm.get(id);
    if (b && eqv(b, l)) continue;                                  // ไม่ได้แก้ในเครื่อง → ใช้ของคลาวด์
    if (!b && out.has(id) && !eqv(out.get(id), l)) { mx++; out.set(mx, { ...l, [idKey]: mx }); }   // งานใหม่ที่ id ซ้ำกับของคนอื่น → ให้ id ใหม่
    else out.set(id, l);                                           // งานใหม่/แก้ไขในเครื่อง → ชนะ
  }
  for (const id of bm.keys()) if (!lm.has(id)) out.delete(id);     // ลบในเครื่อง
  return [...out.values()];
}
function mergeVal(b, l, r) {
  if (eqv(l, b)) return r === undefined ? l : r;
  if (eqv(r, b)) return l;
  if (isObj(l) && isObj(r)) {
    const out = {}, keys = new Set([...Object.keys(l), ...Object.keys(r)]);
    keys.forEach(k => {
      const bk = isObj(b) ? b[k] : undefined;
      if (!(k in l)) { if (!eqv(r[k], bk)) out[k] = r[k]; }
      else if (!(k in r)) { if (!eqv(l[k], bk)) out[k] = l[k]; }
      else out[k] = mergeVal(bk, l[k], r[k]);
    });
    return out;
  }
  if (isPrimArr(l) && isPrimArr(r)) {                              // รายการตัวเลือก: รวมที่เพิ่ม ตัดที่ลบ
    const bb = isPrimArr(b) ? b : [], added = l.filter(x => !bb.includes(x)), removed = bb.filter(x => !l.includes(x));
    return [...new Set([...r, ...added])].filter(x => !removed.includes(x));
  }
  return l;
}
const mergeCol = (key, base, local, remote) => COL[key].idKey ? mergeById(base, local, remote, COL[key].idKey) : mergeVal(base, local, remote);

// ── สถานะ/UI ────────────────────────────────────────────────────
function cloudChip() {
  const el = $('cloud-chip'); if (!el) return;
  if (!CLOUD.on) { el.style.display = 'none'; return; }
  const st = { ok: '☁️ ซิงก์แล้ว', saving: '☁️ กำลังบันทึก…', error: '⚠️ ยังไม่ได้บันทึก (ออฟไลน์?)', idle: '☁️ คลาวด์' }[CLOUD.state] || '☁️';
  el.style.display = ''; el.className = 'cloud-chip ' + CLOUD.state;
  el.innerHTML = `${st}${CLOUD.user ? ` • <b>${esc(ROLE_TH[CLOUD.role] || '')}</b>` : ''}`;
  document.body.dataset.role = CLOUD.user ? (cloudEdit() ? 'editor' : 'viewer') : '';
}
function cloudState(s) { CLOUD.state = s; if (s === 'ok') CLOUD.last = new Date(); cloudChip(); }
const modalOpen = () => !!document.querySelector('.modal-overlay.open');
function cloudRefreshUI() {
  if (modalOpen()) { CLOUD.needRefresh = true; return; }
  CLOUD.needRefresh = false;
  try { planpmInit(); if (typeof projInit === 'function') projInit(); msInitAll(); if (typeof calFillTeams === 'function') calFillTeams(); renderCur(); } catch (e) { console.warn('refresh', e); }
}

// ── ดึง/บันทึก ───────────────────────────────────────────────────
async function cloudFetchAll() {
  const { data, error } = await CLOUD.sb.from('app_data').select('key,value,version');
  if (error) throw error; return Object.fromEntries((data || []).map(r => [r.key, r]));
}
function applyRemote(key, row) { COL[key].set(row.value); CLOUD.base[key] = J(COL[key].get()); CLOUD.ver[key] = row.version; }
async function cloudPull(rows) {
  rows = rows || await cloudFetchAll(); let changed = false;
  for (const key of Object.keys(COL)) {
    const row = rows[key]; if (!row || row.version === CLOUD.ver[key]) continue;
    const local = COL[key].get(), dirty = CLOUD.base[key] !== undefined && J(local) !== CLOUD.base[key];
    if (dirty && cloudEdit()) {
      const merged = mergeCol(key, JSON.parse(CLOUD.base[key]), local, row.value);
      COL[key].set(merged); CLOUD.base[key] = J(row.value); CLOUD.ver[key] = row.version; cloudQueue(key);   // base = ของคลาวด์ → merged ต่างจาก base จึงถูกส่งต่อ
    } else applyRemote(key, row);
    changed = true;
  }
  if (changed) cloudRefreshUI();
}
function cloudQueue(key) {
  if (!CLOUD.on || !CLOUD.user || !cloudEdit()) return;
  if (CLOUD.base[key] !== undefined && J(COL[key].get()) === CLOUD.base[key]) return;
  cloudState('saving'); clearTimeout(CLOUD.timers[key]); CLOUD.timers[key] = setTimeout(() => cloudPush(key), 700);
}
async function cloudPush(key, tries = 0) {
  if (CLOUD.busy[key]) { CLOUD.timers[key] = setTimeout(() => cloudPush(key, tries), 400); return; }
  const val = COL[key].get(), s = J(val); if (CLOUD.base[key] === s) { cloudDone(); return; }
  CLOUD.busy[key] = true;
  try {
    const email = CLOUD.user.email, v = CLOUD.ver[key];
    let ok = false;
    if (v === undefined) { const { error } = await CLOUD.sb.from('app_data').insert({ key, value: val, version: 1, updated_by: email }); if (!error) { CLOUD.ver[key] = 1; ok = true; } else if (error.code !== '23505') throw error; }
    else { const { data, error } = await CLOUD.sb.from('app_data').update({ value: val, version: v + 1, updated_by: email, updated_at: new Date().toISOString() }).eq('key', key).eq('version', v).select('version'); if (error) throw error; if (data && data.length) { CLOUD.ver[key] = v + 1; ok = true; } }
    if (ok) { CLOUD.base[key] = s; cloudDone(); }
    else {                                                        // ชนกับคนอื่น → ดึงล่าสุดมารวม (cloudPull จะคิวบันทึกซ้ำให้เอง)
      CLOUD.busy[key] = false; await cloudPull(await cloudFetchAll()); return;
    }
  } catch (e) { console.warn('push', key, e); cloudState('error'); CLOUD.timers[key] = setTimeout(() => cloudPush(key, 0), 8000); }
  finally { CLOUD.busy[key] = false; }
}
function cloudDone() { const pending = Object.keys(COL).some(k => CLOUD.base[k] !== undefined && J(COL[k].get()) !== CLOUD.base[k]); cloudState(pending ? 'saving' : 'ok'); }

// ── เข้าสู่ระบบ ─────────────────────────────────────────────────
function loginMsg(t, bad) { const m = $('login-msg'); m.textContent = t || ''; m.className = 'login-msg' + (bad ? ' bad' : ''); }
function showLogin(show) { $('login-ov').style.display = show ? 'flex' : 'none'; }
async function cloudLogin(signup) {
  const email = $('login-email').value.trim(), pw = $('login-pw').value;
  if (!email || !pw) { loginMsg('กรุณากรอกอีเมลและรหัสผ่าน', true); return; }
  if (signup && CFG.allowedDomain && !email.toLowerCase().endsWith('@' + CFG.allowedDomain.toLowerCase())) { loginMsg('สมัครได้เฉพาะอีเมล @' + CFG.allowedDomain, true); return; }
  loginMsg('กำลังดำเนินการ…');
  const r = signup ? await CLOUD.sb.auth.signUp({ email, password: pw }) : await CLOUD.sb.auth.signInWithPassword({ email, password: pw });
  if (r.error) { loginMsg(/invalid login/i.test(r.error.message) ? 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' : /not confirmed/i.test(r.error.message) ? 'ยังไม่ได้ยืนยันอีเมล — เช็คกล่องจดหมายก่อน' : r.error.message, true); return; }
  if (signup && !r.data.session) { loginMsg('สมัครแล้ว — กรุณายืนยันอีเมล แล้วกลับมาเข้าสู่ระบบ (สิทธิ์เริ่มต้น: ดูอย่างเดียว จนกว่าผู้ดูแลจะอนุมัติ)'); return; }
  if (signup) loginMsg('สมัครสำเร็จ (สิทธิ์เริ่มต้น: ดูอย่างเดียว)');
  if (r.data.session) cloudAfterLogin(r.data.session.user);
}
async function cloudLogout() { await CLOUD.sb.auth.signOut(); location.reload(); }
async function cloudAfterLogin(user) {
  CLOUD.user = user;
  const { data } = await CLOUD.sb.from('profiles').select('role,email').eq('id', user.id).maybeSingle();
  CLOUD.role = (data && data.role) || 'viewer'; showLogin(false); cloudState('saving');
  try { await cloudInitialSync(); } catch (e) { console.warn(e); cloudState('error'); alert('เชื่อมต่อคลาวด์ไม่สำเร็จ: ' + (e.message || e)); return; }
  cloudStartWatch(); cloudState('ok'); cloudChip();
}
async function cloudInitialSync() {
  const rows = await cloudFetchAll();
  if (!rows.records) {                                            // คลาวด์ยังว่าง
    if (cloudEdit() && confirm('คลาวด์ยังไม่มีข้อมูล\nอัปโหลดข้อมูลในเครื่องนี้ขึ้นเป็นข้อมูลกลางของทีมหรือไม่?\n\n⚠️ ถ้าเครื่องนี้ยังไม่มีข้อมูลจริง (เห็นแต่ข้อมูลตัวอย่าง) ให้กด “ยกเลิก” แล้วใช้ Backup/Restore → Restore ไฟล์สำรองของคุณ')) { for (const k of Object.keys(COL)) { if (CLOUD.role !== 'admin' && k === 'flow') continue; await cloudPush(k); } toast('อัปโหลดข้อมูลขึ้นคลาวด์แล้ว'); }
    else if (!cloudEdit()) alert('คลาวด์ยังไม่มีข้อมูล — ให้ผู้ดูแลอัปโหลดข้อมูลก่อน');
    return;
  }
  try { const snap = {}; Object.keys(COL).forEach(k => { snap[k] = COL[k].get(); }); localStorage.setItem('greenergy_local_before_cloud', J({ at: new Date().toISOString(), data: snap })); } catch (e) {}
  Object.keys(COL).forEach(k => { if (rows[k]) applyRemote(k, rows[k]); });
  for (const k of Object.keys(COL)) { if (!rows[k] && cloudEdit() && !(k === 'flow' && CLOUD.role === 'viewer')) await cloudPush(k); }   // ชุดข้อมูลที่ยังไม่มีในคลาวด์
  cloudRefreshUI();
}
function cloudStartWatch() {
  try { CLOUD.sb.channel('app_data_watch').on('postgres_changes', { event: '*', schema: 'public', table: 'app_data' }, () => { clearTimeout(CLOUD._rt); CLOUD._rt = setTimeout(() => cloudPull().catch(() => {}), 400); }).subscribe(); } catch (e) {}
  setInterval(() => { if (!document.hidden) cloudPull().then(() => { if (CLOUD.needRefresh && !modalOpen()) cloudRefreshUI(); if (CLOUD.state === 'idle') cloudState('ok'); }).catch(() => cloudState('error')); }, 20000);
}

// ── เมนูคลาวด์ / จัดการผู้ใช้ ──────────────────────────────────────
function openCloud() {
  if (!CLOUD.user) { showLogin(true); return; }
  $('cloud-info').innerHTML = `<div class="ci-row"><span>บัญชี</span><b>${esc(CLOUD.user.email)}</b></div><div class="ci-row"><span>สิทธิ์</span><b>${esc(ROLE_TH[CLOUD.role])}</b></div><div class="ci-row"><span>ซิงก์ล่าสุด</span><b>${CLOUD.last ? CLOUD.last.toLocaleTimeString('th-TH') : '-'}</b></div>
    ${cloudEdit() ? '' : '<div class="op-warn">คุณมีสิทธิ์ดูอย่างเดียว — ปุ่มเพิ่ม/แก้ไข/ลบถูกปิดไว้ ขอสิทธิ์แก้ไขได้จากผู้ดูแลระบบ</div>'}`;
  $('cloud-admin').style.display = CLOUD.role === 'admin' ? '' : 'none'; $('cloud-modal').classList.add('open');
}
function closeCloud() { $('cloud-modal').classList.remove('open'); }
async function cloudSyncNow() { try { cloudState('saving'); await cloudPull(); for (const k of Object.keys(COL)) await cloudPush(k); cloudState('ok'); toast('ซิงก์แล้ว'); closeCloud(); } catch (e) { cloudState('error'); alert('ซิงก์ไม่สำเร็จ: ' + e.message); } }
async function cloudForceUpload() {
  if (CLOUD.role !== 'admin') return;
  if (!confirm('อัปโหลดข้อมูลของเครื่องนี้ทับข้อมูลกลางในคลาวด์?\n(เวอร์ชันเดิมยังเก็บอยู่ในประวัติ app_data_history)')) return;
  const rows = await cloudFetchAll(); Object.keys(COL).forEach(k => { if (rows[k]) CLOUD.ver[k] = rows[k].version; else delete CLOUD.ver[k]; });
  Object.keys(COL).forEach(k => { CLOUD.base[k] = '__force__'; }); for (const k of Object.keys(COL)) await cloudPush(k); toast('อัปโหลดทับแล้ว'); closeCloud();
}
async function openUsers() {
  closeCloud(); const { data, error } = await CLOUD.sb.from('profiles').select('id,email,role,created_at').order('created_at');
  if (error) { alert(error.message); return; }
  $('users-list').innerHTML = `<table class="mini op-tbl"><thead><tr><th>อีเมล</th><th>สิทธิ์</th></tr></thead><tbody>${(data || []).map(u => `<tr data-id="${esc(u.id)}"><td>${esc(u.email)}${u.id === CLOUD.user.id ? ' <small>(คุณ)</small>' : ''}</td><td><select class="filter-sel">${['viewer', 'editor', 'admin'].map(r => `<option value="${r}"${u.role === r ? ' selected' : ''}>${ROLE_TH[r]}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>`;
  $('users-modal').classList.add('open');
}
async function saveUsers() {
  for (const tr of document.querySelectorAll('#users-list tr[data-id]')) { const { error } = await CLOUD.sb.from('profiles').update({ role: tr.querySelector('select').value }).eq('id', tr.dataset.id); if (error) { alert(error.message); return; } }
  toast('บันทึกสิทธิ์แล้ว'); $('users-modal').classList.remove('open');
}

// ── เริ่มต้น ─────────────────────────────────────────────────────
if (CLOUD.on) {
  Object.entries(KEYMAP).forEach(([fn, keys]) => { if (typeof window[fn] !== 'function') return; _orig[fn] = window[fn]; window[fn] = function (...a) { _orig[fn].apply(this, a); keys.forEach(cloudQueue); }; });
  ['openAdd', 'openEdit', 'del', 'clearPpmSynced', 'addOpt', 'delOpt', 'importJSON', 'openAddProj', 'openEditProj', 'delProj', 'openAddPpm', 'openEditPpm', 'delPpm', 'calMove', 'calWpSet', 'calOpSet', 'woBackfill', 'opSave', 'opAddPerson', 'opsNewName', 'opsDelName', 'calSendTo'].forEach(n => {
    if (typeof window[n] !== 'function') return; const f = window[n];
    window[n] = function (...a) { if (!cloudEdit()) { toast('สิทธิ์ดูอย่างเดียว — ไม่สามารถแก้ไขได้'); return; } return f.apply(this, a); };
  });
  window.addEventListener('beforeunload', e => { if (Object.keys(COL).some(k => CLOUD.base[k] !== undefined && J(COL[k].get()) !== CLOUD.base[k]) && cloudEdit()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('DOMContentLoaded', async () => {
    CLOUD.sb = window.supabase.createClient(CFG.url, CFG.anonKey); cloudChip(); showLogin(true);
    $('login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') cloudLogin(false); });
    const { data } = await CLOUD.sb.auth.getSession(); if (data && data.session) cloudAfterLogin(data.session.user);
  });
} else { _orig.save = save; _orig.ppmSaveStore = ppmSaveStore; _orig.pjSave = pjSave; _orig.saveOpts = saveOpts; _orig.opSaveDir = opSaveDir; document.addEventListener('DOMContentLoaded', cloudChip); }
