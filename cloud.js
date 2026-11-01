'use strict';
// ═══ Cloud sync (Supabase) — ข้อมูลกลางของทีม + สิทธิ์ แก้ไข/ดูอย่างเดียว ═══════════════
// หลักการ: local-first (ยังเก็บใน localStorage ตามเดิม) แล้วซิงก์ขึ้นตาราง app_data
//  • แต่ละชุดข้อมูล (records/ppm/projects/options/opdir/flow/staff) = 1 แถว มี version
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
  staff:    { idKey: 'sid', get: () => staff, set: v => { staff = v.map(staffNorm); staffNextId = Math.max(0, ...staff.map(s => s.sid || 0)) + 1; _orig.staffSave(); }, empty: v => !v.length },
  holidays: { get: () => hdRecords, set: v => { hdRecords = Array.isArray(v) ? v : []; _orig.hdSave(); }, empty: v => !v.length },
  flow:     { get: () => ({ flowUrl: opDir.flowUrl || '', autoSend: !!opDir.autoSend }), set: v => { opDir.flowUrl = v.flowUrl || ''; opDir.autoSend = !!v.autoSend; _orig.opSaveDir(); }, secret: true },   // อ่านได้เฉพาะผู้แก้ไข (RLS)
};
const KEYMAP = { save: ['records'], ppmSaveStore: ['ppm'], pjSave: ['projects'], saveOpts: ['options'], opSaveDir: ['opdir', 'flow'], staffSave: ['staff'], hdSave: ['holidays'] };
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
  let { data, error } = await CLOUD.sb.from('profiles').select('role,email,tabs,must_change_pw,display_name').eq('id', user.id).maybeSingle();
  if (error) ({ data } = await CLOUD.sb.from('profiles').select('role,email').eq('id', user.id).maybeSingle());   // ยังไม่ได้รัน cloud-users.sql
  CLOUD.role = (data && data.role) || 'viewer'; CLOUD.name = (data && data.display_name) || ''; showLogin(false);
  if (data && data.must_change_pw) { openPwChange(true); return; }   // เข้าระบบครั้งแรกด้วยรหัสชั่วคราว → ต้องตั้งรหัสใหม่ก่อน
  cloudApplyTabs(data && data.tabs); cloudState('saving');
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
// แท็บที่กำหนดสิทธิ์เข้าถึงได้ (null/ว่าง = ทุกแท็บ; admin เห็นทุกแท็บเสมอ)
const ACCESS_TABS = [['dashboard', '📊 Dashboard'], ['worklog', '📋 บันทึกงานบำรุงรักษา'], ['planpm', '📋 Plan PM & AN'], ['calendar', '🗓️ Calendar'], ['projects', '📑 Project list'], ['staff', '👥 รายชื่อพนักงาน']];
const needSql = e => /admin_create_user|admin_set_password|admin_delete_user|password_changed|must_change_pw|display_name|tabs|schema cache|does not exist/i.test(e && e.message || '');
const sqlHint = 'ยังไม่ได้ติดตั้งส่วนจัดการผู้ใช้ในฐานข้อมูล — ให้ผู้ดูแลรันไฟล์ cloud-users.sql ใน Supabase → SQL Editor ก่อน';
function cloudApplyTabs(tabs) {
  const allow = CLOUD.role === 'admin' || !Array.isArray(tabs) || !tabs.length ? null : tabs;
  document.querySelectorAll('.tab').forEach(t => { t.style.display = !allow || allow.includes(t.dataset.tab) ? '' : 'none'; });
  if (allow && !allow.includes(curTab)) switchTab(allow[0]);
  CLOUD.tabs = allow;
}
const genPw = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', a = new Uint32Array(10); crypto.getRandomValues(a); return [...a].map(x => c[x % c.length]).join(''); };
const tabChips = (sel, dis) => `<div class="u-tabs">${ACCESS_TABS.map(([k, n]) => `<label class="u-tab"><input type="checkbox" value="${k}"${!sel || !sel.length || sel.includes(k) ? ' checked' : ''}${dis ? ' disabled' : ''}><span>${n}</span></label>`).join('')}</div>`;
const readTabs = box => { const all = [...box.querySelectorAll('.u-tab input')], on = all.filter(i => i.checked).map(i => i.value); return on.length === all.length ? null : on; };

async function openUsers() {
  closeCloud();
  let r = await CLOUD.sb.from('profiles').select('id,email,role,created_at,display_name,tabs,must_change_pw').order('created_at'), legacy = false;
  if (r.error && needSql(r.error)) { legacy = true; r = await CLOUD.sb.from('profiles').select('id,email,role,created_at').order('created_at'); }
  if (r.error) { alert(r.error.message); return; }
  $('u-new').style.display = legacy ? 'none' : ''; $('u-sqlwarn').style.display = legacy ? '' : 'none';
  $('u-pw').value = genPw(); $('u-newtabs').innerHTML = tabChips(null, false);
  $('users-list').innerHTML = `<table class="mini op-tbl u-tbl"><thead><tr><th>ผู้ใช้</th><th>สิทธิ์</th>${legacy ? '' : '<th>แท็บที่เข้าถึงได้</th><th></th>'}</tr></thead><tbody>${(r.data || []).map(u => {
    const me = u.id === CLOUD.user.id;
    return `<tr data-id="${esc(u.id)}" data-email="${esc(u.email)}"><td><b>${esc(u.display_name || u.email)}</b>${u.display_name ? `<br><small>${esc(u.email)}</small>` : ''}${me ? ' <small>(คุณ)</small>' : ''}${u.must_change_pw ? '<br><small class="u-pending">⏳ ยังไม่ได้เปลี่ยนรหัสผ่านครั้งแรก</small>' : ''}</td>
      <td><select class="filter-sel u-role" onchange="usersRoleChange(this)"${me ? ' disabled title="เปลี่ยนสิทธิ์ของตัวเองไม่ได้"' : ''}>${['viewer', 'editor', 'admin'].map(x => `<option value="${x}"${u.role === x ? ' selected' : ''}>${ROLE_TH[x]}</option>`).join('')}</select></td>
      ${legacy ? '' : `<td>${tabChips(u.tabs, u.role === 'admin')}</td><td class="u-act"><button class="btn-secondary" onclick="usersResetPw(this)" title="ตั้งรหัสผ่านชั่วคราวใหม่">🔑 รีเซ็ตรหัส</button>${me ? '' : `<button class="btn-del" onclick="usersDelete(this)" title="ลบผู้ใช้">🗑</button>`}</td>`}</tr>`;
  }).join('')}</tbody></table>`;
  $('users-modal').classList.add('open');
}
function usersRoleChange(sel) { const box = sel.closest('tr, .u-newbox').querySelector('.u-tabs'); if (box) box.querySelectorAll('input').forEach(i => { i.disabled = sel.value === 'admin'; if (sel.value === 'admin') i.checked = true; }); }
async function saveUsers() {
  for (const tr of document.querySelectorAll('#users-list tr[data-id]')) {
    const role = tr.querySelector('.u-role').value, box = tr.querySelector('.u-tabs'), upd = { role };
    if (box) { const t = readTabs(box); if (t && !t.length) { alert(`${tr.dataset.email}: ต้องเลือกอย่างน้อย 1 แท็บ`); return; } upd.tabs = role === 'admin' ? null : t; }
    if (tr.dataset.id === CLOUD.user.id) delete upd.role;
    const { error } = await CLOUD.sb.from('profiles').update(upd).eq('id', tr.dataset.id); if (error) { alert(error.message); return; }
  }
  toast('บันทึกสิทธิ์แล้ว'); $('users-modal').classList.remove('open');
}
async function usersCreate() {
  const email = $('u-email').value.trim(), pw = $('u-pw').value, role = $('u-role').value, name = $('u-name').value.trim(), tabs = readTabs($('u-newtabs'));
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('รูปแบบอีเมลไม่ถูกต้อง'); $('u-email').focus(); return; }
  if (pw.length < 8) { alert('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร'); return; }
  if (tabs && !tabs.length) { alert('ต้องเลือกอย่างน้อย 1 แท็บ'); return; }
  const { error } = await CLOUD.sb.rpc('admin_create_user', { p_email: email, p_password: pw, p_role: role, p_tabs: role === 'admin' ? null : tabs, p_name: name || null });
  if (error) { alert(needSql(error) ? sqlHint : 'สร้างผู้ใช้ไม่สำเร็จ: ' + error.message); return; }
  $('u-email').value = ''; $('u-name').value = ''; await openUsers();
  usersShowCred(email, pw, 'สร้างผู้ใช้แล้ว');
}
async function usersResetPw(btn) {
  const tr = btn.closest('tr'), pw = genPw();
  if (!confirm(`ตั้งรหัสผ่านชั่วคราวใหม่ให้ ${tr.dataset.email}?\n(รหัสเดิมจะใช้ไม่ได้ทันที และผู้ใช้ต้องเปลี่ยนรหัสเองตอนเข้าระบบ)`)) return;
  const { error } = await CLOUD.sb.rpc('admin_set_password', { p_id: tr.dataset.id, p_password: pw });
  if (error) { alert(needSql(error) ? sqlHint : error.message); return; }
  await openUsers(); usersShowCred(tr.dataset.email, pw, 'ตั้งรหัสผ่านใหม่แล้ว');
}
async function usersDelete(btn) {
  const tr = btn.closest('tr');
  if (!confirm(`ลบผู้ใช้ ${tr.dataset.email}?\nผู้ใช้นี้จะเข้าระบบไม่ได้อีก (ข้อมูลงานของทีมไม่ถูกลบ)`)) return;
  const { error } = await CLOUD.sb.rpc('admin_delete_user', { p_id: tr.dataset.id });
  if (error) { alert(needSql(error) ? sqlHint : error.message); return; }
  toast('ลบผู้ใช้แล้ว'); openUsers();
}
function usersShowCred(email, pw, title) {
  $('cred-t').textContent = '✅ ' + title;
  $('cred-text').value = `เว็บ: ${location.origin + location.pathname}\nอีเมล: ${email}\nรหัสผ่านชั่วคราว: ${pw}\n(เข้าระบบครั้งแรกแล้วระบบจะให้ตั้งรหัสผ่านใหม่เอง)`;
  $('cred-modal').classList.add('open');
}
function credCopy() { const t = $('cred-text'); t.select(); (navigator.clipboard ? navigator.clipboard.writeText(t.value) : Promise.reject()).then(() => toast('คัดลอกแล้ว'), () => { document.execCommand('copy'); toast('คัดลอกแล้ว'); }); }

// ── เปลี่ยนรหัสผ่านเอง (บังคับครั้งแรก หรือกดจากเมนูบัญชี) ──
function openPwChange(force) {
  closeCloud(); CLOUD.pwForce = !!force;
  $('pw-new').value = ''; $('pw-new2').value = ''; $('pw-msg').textContent = '';
  $('pw-title').textContent = force ? '🔑 ตั้งรหัสผ่านใหม่ (เข้าระบบครั้งแรก)' : '🔑 เปลี่ยนรหัสผ่าน';
  $('pw-help').style.display = force ? '' : 'none'; $('pw-cancel').style.display = force ? 'none' : '';
  $('pw-modal').classList.add('open'); setTimeout(() => $('pw-new').focus(), 50);
}
async function savePwChange() {
  const a = $('pw-new').value, b = $('pw-new2').value, msg = t => { $('pw-msg').textContent = t; };
  if (a.length < 8) return msg('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  if (a !== b) return msg('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
  msg('กำลังบันทึก…');
  const { error } = await CLOUD.sb.auth.updateUser({ password: a });
  if (error) return msg(/different from the old/i.test(error.message) ? 'รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม' : /weak|short/i.test(error.message) ? 'รหัสผ่านง่ายเกินไป ลองใช้ตัวอักษรผสมตัวเลข' : error.message);
  await CLOUD.sb.rpc('password_changed');
  $('pw-modal').classList.remove('open'); toast('เปลี่ยนรหัสผ่านแล้ว');
  if (CLOUD.pwForce) { CLOUD.pwForce = false; cloudAfterLogin(CLOUD.user); }
}

// ── เริ่มต้น ─────────────────────────────────────────────────────
if (CLOUD.on) {
  Object.entries(KEYMAP).forEach(([fn, keys]) => { if (typeof window[fn] !== 'function') return; _orig[fn] = window[fn]; window[fn] = function (...a) { _orig[fn].apply(this, a); keys.forEach(cloudQueue); }; });
  ['openAdd', 'openEdit', 'del', 'clearPpmSynced', 'addOpt', 'delOpt', 'importJSON', 'openAddProj', 'openEditProj', 'delProj', 'openAddPpm', 'openEditPpm', 'delPpm', 'calMove', 'calWpSet', 'calOpSet', 'woBackfill', 'opSave', 'opAddPerson', 'opsNewName', 'opsDelName', 'calSendTo', 'openAddStaff', 'openEditStaff', 'saveStaff', 'delStaff', 'stImportFile', 'calHolEdit', 'calHdAdd', 'calHdDel'].forEach(n => {
    if (typeof window[n] !== 'function') return; const f = window[n];
    window[n] = function (...a) { if (!cloudEdit()) { toast('สิทธิ์ดูอย่างเดียว — ไม่สามารถแก้ไขได้'); return; } return f.apply(this, a); };
  });
  window.addEventListener('beforeunload', e => { if (Object.keys(COL).some(k => CLOUD.base[k] !== undefined && J(COL[k].get()) !== CLOUD.base[k]) && cloudEdit()) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('DOMContentLoaded', async () => {
    CLOUD.sb = window.supabase.createClient(CFG.url, CFG.anonKey); cloudChip(); showLogin(true);
    $('login-pw').addEventListener('keydown', e => { if (e.key === 'Enter') cloudLogin(false); });
    const { data } = await CLOUD.sb.auth.getSession(); if (data && data.session) cloudAfterLogin(data.session.user);
  });
} else { _orig.save = save; _orig.ppmSaveStore = ppmSaveStore; _orig.pjSave = pjSave; _orig.saveOpts = saveOpts; _orig.opSaveDir = opSaveDir; _orig.staffSave = staffSave; _orig.hdSave = hdSave; document.addEventListener('DOMContentLoaded', cloudChip); }
