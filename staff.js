'use strict';
// ═══ รายชื่อพนักงาน (Staff directory) — ใช้เป็นรายการ Operator ของทุกฟอร์ม ═══════════
const STAFF_KEY = 'greenergy_staff';
let staff = [], staffNextId = 1, stSrch = '', stTeam = '', stEditId = null, stPhoto = '', stAfter = null;
// ข้อมูลรุ่นแรกเก็บ "ชื่อ-นามสกุล" ไว้ช่องเดียว (name) → แยกเป็น first / last
const stT = x => String(x || '').trim();
function staffNorm(s) {
  if (!('first' in s)) { const p = stT(s.name).split(/\s+/); s.first = p.shift() || ''; s.last = p.join(' '); }
  ['first', 'last', 'firstEn', 'lastEn', 'nick'].forEach(k => { s[k] = stT(s[k]); });
  s.name = [s.first, s.last].filter(Boolean).join(' ');            // ชื่อเต็มภาษาไทย (ใช้ค้นหา/เรียง)
  return s;
}
try { const d = JSON.parse(localStorage.getItem(STAFF_KEY) || '[]'); if (Array.isArray(d)) staff = d.map(staffNorm); } catch (e) {}
staffNextId = Math.max(0, ...staff.map(s => s.sid || 0)) + 1;
function staffSave() { try { localStorage.setItem(STAFF_KEY, JSON.stringify(staff)); } catch (e) { alert('บันทึกในเครื่องไม่สำเร็จ (พื้นที่เต็ม?) — ลองใช้รูปที่เล็กลง'); } }

// ชื่อที่ใช้ในช่อง Operator: "ชื่อจริง (ชื่อเล่น)" — ไม่แสดงนามสกุล
const staffLabel = s => { const n = stT(s.first), k = stT(s.nick); return n && k ? `${n} (${k})` : (n || k); };
const staffEn = s => [s.firstEn, s.lastEn].filter(Boolean).join(' ');
const staffLabels = () => staff.map(staffLabel).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
// หา staff จากชื่อเดิมที่บันทึกไว้ (label / ชื่อเล่น / ชื่อจริง / ชื่อ-นามสกุล / "ชื่อ-นามสกุล (ชื่อเล่น)" ของรุ่นก่อน)
function staffFind(v) {
  const t = stT(v).toLowerCase(); if (!t) return null;
  const by = f => staff.find(s => { const x = stT(f(s)); return x && x.toLowerCase() === t; });
  return by(staffLabel) || by(s => s.nick) || by(s => s.first) || by(s => s.name) || by(s => s.nick && s.name ? `${s.name} (${s.nick})` : '') || by(staffEn) || null;
}
const staffResolve = v => { const s = staffFind(v); return s ? staffLabel(s) : v; };

function staffTenure(start) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return '';
  const a = new Date(start + 'T00:00:00'), b = new Date(); if (a > b) return 'ยังไม่เริ่มงาน';
  let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth(); if (b.getDate() < a.getDate()) m--;
  const y = Math.floor(m / 12), mm = m % 12;
  return y || mm ? [y ? `${y} ปี` : '', mm ? `${mm} เดือน` : ''].filter(Boolean).join(' ') : 'ไม่ถึง 1 เดือน';
}
const staffDate = d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return '-'; const [y, m, dd] = d.split('-'); return `${+dd} ${['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'][+m - 1]} ${+y + 543}`; };
const staffInitial = s => (String(s.nick || s.name || '?').trim()[0] || '?').toUpperCase();
const staffTeamColor = t => (typeof cpTeamColor === 'function' ? cpTeamColor(t) : '#35654E');
const staffTeams = () => uniq(staff.map(s => stT(s.team))).sort((a, b) => a.localeCompare(b, 'th'));
const staffJobs = s => { const l = staffLabel(s); return [...records, ...(ppmRecords || [])].filter(r => opsOf(r).includes(l)).length; };

// ── หน้าแสดงผล ───────────────────────────────────────────────
function renderStaff() {
  const tf = $('st-fteam'); if (tf) { if (stTeam && !staffTeams().includes(stTeam)) stTeam = ''; const cur = stTeam; tf.innerHTML = '<option value="">ทุกทีม</option>' + staffTeams().map(t => `<option${t === cur ? ' selected' : ''}>${esc(t)}</option>`).join(''); }
  const q = stSrch.trim().toLowerCase();
  const list = staff.filter(s => (!stTeam || s.team === stTeam) && (!q || [s.name, s.nick, staffEn(s), s.position, s.team, s.phone, s.email].some(x => String(x || '').toLowerCase().includes(q))))
    .sort((a, b) => String(a.team || '').localeCompare(String(b.team || ''), 'th') || String(a.name || '').localeCompare(String(b.name || ''), 'th'));
  $('st-count').textContent = `${list.length} / ${staff.length} คน`;
  $('st-total').textContent = staff.length;
  $('st-teams').textContent = uniq(staff.map(s => s.team)).length;
  $('st-new').textContent = staff.filter(s => { const t = staffTenure(s.start); return /^\d{4}/.test(s.start || '') && (Date.now() - new Date(s.start)) < 365 * 864e5 && t !== 'ยังไม่เริ่มงาน'; }).length;
  const yrs = staff.filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.start || '')).map(s => (Date.now() - new Date(s.start)) / (365.25 * 864e5)).filter(x => x > 0);
  $('st-avg').textContent = yrs.length ? (yrs.reduce((a, b) => a + b, 0) / yrs.length).toFixed(1) + ' ปี' : '-';
  $('st-grid').innerHTML = list.length ? list.map(s => {
    const c = staffTeamColor(s.team), ten = staffTenure(s.start), jobs = staffJobs(s);
    return `<div class="st-card" onclick="openEditStaff(${s.sid})" style="--tc:${c}">
      <div class="st-top"><div class="st-ph">${s.photo ? `<img src="${s.photo}" alt="">` : `<span>${esc(staffInitial(s))}</span>`}</div>
        <div class="st-id"><div class="st-name">${esc(s.name || '-')}</div>${staffEn(s) ? `<div class="st-en">${esc(staffEn(s))}</div>` : ''}${s.nick ? `<div class="st-nick">“${esc(s.nick)}”</div>` : ''}<div class="st-pos">${esc(s.position || 'ไม่ระบุตำแหน่ง')}</div>${s.team ? `<span class="st-team">${esc(s.team)}</span>` : ''}</div></div>
      <div class="st-info">
        <div><i>📞</i>${s.phone ? `<a href="tel:${esc(String(s.phone).replace(/[^\d+]/g, ''))}" onclick="event.stopPropagation()">${esc(s.phone)}</a>` : '<em>-</em>'}</div>
        <div><i>✉️</i>${s.email ? `<a href="mailto:${esc(s.email)}" onclick="event.stopPropagation()">${esc(s.email)}</a>` : '<em>-</em>'}</div>
        <div><i>📅</i>เริ่มงาน ${esc(staffDate(s.start))}</div>
      </div>
      <div class="st-foot"><span class="st-ten">⏳ ${esc(ten || 'ไม่ระบุวันเริ่มงาน')}</span><span class="st-jobs" title="จำนวนงานที่มีชื่อเป็น Operator">🛠️ ${jobs} งาน</span></div>
    </div>`;
  }).join('') : `<div class="st-empty">${staff.length ? 'ไม่พบรายชื่อที่ค้นหา' : 'ยังไม่มีรายชื่อพนักงาน — กด <b>➕ เพิ่มพนักงานใหม่</b> เพื่อเริ่ม<br><small>รายชื่อนี้จะใช้เป็นตัวเลือกในช่อง Operator ของ บันทึกงาน และ Plan PM&amp;AN</small>'}</div>`;
}

// ── ฟอร์มเพิ่ม/แก้ไข ─────────────────────────────────────────
function stFillLists() {
  $('dl-st-team').innerHTML = staffTeams().map(t => `<option value="${esc(t)}">`).join('');
  $('dl-st-pos').innerHTML = uniq(staff.map(s => s.position)).map(t => `<option value="${esc(t)}">`).join('');
}
function stShowPhoto() { $('st-photo-prev').innerHTML = stPhoto ? `<img src="${stPhoto}" alt="">` : '<span>📷</span>'; $('st-photo-del').style.display = stPhoto ? '' : 'none'; }
function stTenurePreview() { const t = staffTenure($('st-start').value); $('st-tenure').textContent = t || '-'; }
function openAddStaff(after) {
  stEditId = null; stPhoto = ''; stAfter = after || null; stFillLists();
  ['st-first', 'st-last', 'st-first-en', 'st-last-en', 'st-nick', 'st-pos', 'st-team', 'st-phone', 'st-email', 'st-start'].forEach(id => { $(id).value = ''; });
  $('st-title').textContent = '➕ เพิ่มพนักงานใหม่'; $('st-del').style.display = 'none'; stShowPhoto(); stTenurePreview();
  $('st-modal').classList.add('open'); setTimeout(() => $('st-first').focus(), 50);
}

function openEditStaff(sid) {
  const s = staff.find(x => x.sid === sid); if (!s) return;
  stEditId = sid; stPhoto = s.photo || ''; stAfter = null; stFillLists();
  $('st-first').value = s.first || ''; $('st-last').value = s.last || ''; $('st-first-en').value = s.firstEn || ''; $('st-last-en').value = s.lastEn || ''; $('st-nick').value = s.nick || ''; $('st-pos').value = s.position || ''; $('st-team').value = s.team || '';
  $('st-phone').value = s.phone || ''; $('st-email').value = s.email || ''; $('st-start').value = s.start || '';
  $('st-title').textContent = '✏️ แก้ไขข้อมูลพนักงาน'; $('st-del').style.display = ''; stShowPhoto(); stTenurePreview();
  $('st-modal').classList.add('open');
}
function closeStaff() { $('st-modal').classList.remove('open'); }
function stPickPhoto(input) {
  const f = input.files && input.files[0]; input.value = ''; if (!f) return;
  if (!/^image\//.test(f.type)) { alert('กรุณาเลือกไฟล์รูปภาพ'); return; }
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => {
    const S = 240, cv = document.createElement('canvas'), sc = Math.max(S / img.width, S / img.height), w = img.width * sc, h = img.height * sc;   // ครอปจัตุรัสกลางรูป ย่อเหลือ 240px
    cv.width = cv.height = S; const cx = cv.getContext('2d'); cx.fillStyle = '#fff'; cx.fillRect(0, 0, S, S); cx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
    stPhoto = cv.toDataURL('image/jpeg', 0.82); stShowPhoto();
  }; img.onerror = () => alert('เปิดรูปนี้ไม่ได้'); img.src = rd.result; };
  rd.readAsDataURL(f);
}
function stDelPhoto() { stPhoto = ''; stShowPhoto(); }

// เปลี่ยนชื่อ Operator ในงานเดิมให้ตรงกับรายชื่อ (ชื่อเล่น/ชื่อจริง/ชื่อเดิม → "ชื่อจริง (ชื่อเล่น)")
function stRelink(oldNames, label) {
  const olds = uniq(oldNames.map(x => String(x || '').trim())).filter(x => x && x !== label); if (!olds.length) return 0;
  const hit = r => opsOf(r).some(o => olds.includes(o));
  const recs = records.filter(hit), pps = (ppmRecords || []).filter(hit), n = recs.length + pps.length; if (!n) return 0;
  if (!confirm(`พบงานเดิม ${n} งานที่ใช้ชื่อ "${olds.join('", "')}"\nเปลี่ยนเป็น "${label}" เพื่อผูกกับรายชื่อนี้หรือไม่?`)) return 0;
  const fix = r => { r.operators = uniq(opsOf(r).map(o => olds.includes(o) ? label : o)); r.operator = r.operators.join(', '); };
  recs.forEach(fix); pps.forEach(fix); if (recs.length) save(); if (pps.length) ppmSaveStore();
  return n;
}
function saveStaff() {
  const v = id => $(id).value.trim(), first = v('st-first'), nick = v('st-nick');
  if (!first) { alert('กรุณาใส่ชื่อจริง'); $('st-first').focus(); return; }
  const email = v('st-email'); if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('รูปแบบอีเมลไม่ถูกต้อง'); $('st-email').focus(); return; }
  const rec = staffNorm({ first, last: v('st-last'), firstEn: v('st-first-en'), lastEn: v('st-last-en'), nick, position: v('st-pos'), team: v('st-team'), phone: v('st-phone'), email, start: v('st-start'), photo: stPhoto });
  const label = staffLabel(rec);
  if (staff.some(s => s.sid !== stEditId && staffLabel(s) === label)) { alert(`มีชื่อ "${label}" อยู่แล้ว`); return; }
  let olds = [nick, first, rec.name, rec.name && nick ? `${rec.name} (${nick})` : ''];
  if (stEditId != null) { const i = staff.findIndex(s => s.sid === stEditId), old = staff[i]; olds.push(staffLabel(old), old.nick, old.first, old.name, old.name && old.nick ? `${old.name} (${old.nick})` : ''); staff[i] = { ...old, ...rec }; }
  else staff.push({ sid: staffNextId++, ...rec });
  staffSave();
  if (email && typeof opDir !== 'undefined' && opDir.emails && !opDir.emails[label]) { opDir.emails[label] = email; opSaveDir(); }
  const n = stRelink(olds, label);
  closeStaff(); renderCur(); if (typeof opsRefreshAll === 'function') opsRefreshAll();
  if (stAfter) { const sel = $(stAfter); if (sel) sel.value = label; stAfter = null; }
  toast(n ? `บันทึกแล้ว • อัปเดตชื่อในงานเดิม ${n} งาน` : 'บันทึกรายชื่อแล้ว');
}
function delStaff() {
  const s = staff.find(x => x.sid === stEditId); if (!s) return;
  if (!confirm(`ลบ "${staffLabel(s)}" ออกจากรายชื่อ?\n(งานเดิมที่มีชื่อนี้จะยังคงอยู่)`)) return;
  staff = staff.filter(x => x.sid !== stEditId); staffSave(); closeStaff(); renderCur(); toast('ลบรายชื่อแล้ว');
}

document.addEventListener('DOMContentLoaded', () => {
  $('st-srch').addEventListener('input', e => { stSrch = e.target.value; renderStaff(); });
  $('st-fteam').addEventListener('change', e => { stTeam = e.target.value; renderStaff(); });
  $('st-start').addEventListener('input', stTenurePreview);
});
