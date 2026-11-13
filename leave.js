'use strict';
// ═══ ตารางลา — ลาป่วย / ลากิจ / ลาพักร้อน อ้างอิงรายชื่อพนักงาน ═══════════════════
// leaves = [{ lid, sid, type, from, to, half, reason, by, at }]   half = '' | 'am' | 'pm' (ใช้ได้เมื่อลาวันเดียว)
// นับวันลาเฉพาะวันทำงาน: ไม่นับเสาร์–อาทิตย์ และวันหยุดที่กำหนดในปฏิทิน
const LV_KEY = 'greenergy_leaves';
const LV_TYPES = { sick: { th: 'ลาป่วย', s: 'ป', c: '#d9542c' }, personal: { th: 'ลากิจ', s: 'ก', c: '#2e6db4' }, vacation: { th: 'ลาพักร้อน', s: 'พ', c: '#2e9b5b' } };
const LV_HALF = { '': 'เต็มวัน', am: 'ครึ่งวันเช้า', pm: 'ครึ่งวันบ่าย' };
let leaves = [], lvNextId = 1, lvMonth = today().slice(0, 7), lvTeam = '', lvEditId = null;
try { const d = JSON.parse(localStorage.getItem(LV_KEY) || '[]'); if (Array.isArray(d)) leaves = d; } catch (e) {}
lvNextId = Math.max(0, ...leaves.map(l => l.lid || 0)) + 1;
function lvSave() { try { localStorage.setItem(LV_KEY, JSON.stringify(leaves)); } catch (e) {} }

const lvAddDay = (d, n) => dfmt(dparse(d) + n * DAYMS);
const lvWorkday = d => { const w = new Date(d + 'T00:00:00').getDay(); return w !== 0 && w !== 6 && !calHol(d); };
const lvCovers = (l, d) => l.from <= d && d <= (l.to || l.from);
// จำนวนวันลา (วันทำงาน) ของรายการ ภายในช่วง [a, b] ถ้าระบุ
function lvDays(l, a, b) {
  const s = a && a > l.from ? a : l.from, e = b && b < (l.to || l.from) ? b : (l.to || l.from); let n = 0;
  for (let d = s; d <= e; d = lvAddDay(d, 1)) if (lvWorkday(d)) n += l.half && l.from === (l.to || l.from) ? 0.5 : 1;
  return n;
}
const lvFmt = n => (Math.round(n * 10) / 10).toLocaleString('th-TH');
const lvDate = d => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return '-'; const [y, m, dd] = d.split('-'); return `${+dd} ${CP_MON[+m - 1]} ${y}`; };

function lvNav(n) {
  if (n === 0) lvMonth = today().slice(0, 7);
  else { const [y, m] = lvMonth.split('-').map(Number), t = new Date(y, m - 1 + n, 1); lvMonth = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; }
  renderLeave();
}
function renderLeave() {
  const ym = lvMonth, [y, m] = ym.split('-').map(Number), dim = new Date(y, m, 0).getDate(), first = ym + '-01', last = `${ym}-${String(dim).padStart(2, '0')}`, ed = cpCanEdit();
  $('lv-title').textContent = `${MONTHS[m]} ${y}`;
  const teams = uniq(staff.map(s => stT(s.team))).sort((a, b) => a.localeCompare(b, 'th'));
  if (lvTeam && !teams.includes(lvTeam)) lvTeam = '';
  $('lv-fteam').innerHTML = '<option value="">ทุกทีม</option>' + teams.map(t => `<option${t === lvTeam ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const ppl = staff.filter(s => !lvTeam || s.team === lvTeam).sort((a, b) => String(a.team || '').localeCompare(String(b.team || ''), 'th') || staffLabel(a).localeCompare(staffLabel(b), 'th'));
  const sids = new Set(ppl.map(s => s.sid)), inMonth = leaves.filter(l => sids.has(l.sid) && l.from <= last && (l.to || l.from) >= first);
  const byType = t => inMonth.filter(l => l.type === t).reduce((a, l) => a + lvDays(l, first, last), 0);
  $('lv-k-count').textContent = inMonth.length;
  $('lv-k-days').textContent = lvFmt(inMonth.reduce((a, l) => a + lvDays(l, first, last), 0));
  Object.keys(LV_TYPES).forEach(t => { $('lv-k-' + t).textContent = lvFmt(byType(t)); });
  // ตารางรายวัน
  const days = Array.from({ length: dim }, (_, i) => { const d = `${ym}-${String(i + 1).padStart(2, '0')}`, w = new Date(y, m - 1, i + 1).getDay(); return { d, n: i + 1, w, hol: calHol(d), off: w === 0 || w === 6 }; });
  const yr = String(y), yFirst = yr + '-01-01', yLast = yr + '-12-31';
  let head = `<tr><th class="lv-name">พนักงาน</th>${days.map(x => `<th class="${x.off ? 'wk' : ''}${x.hol ? ' hol' : ''}" title="${esc(x.hol || CP_DOW[x.w])}">${x.n}<small>${CP_DOW[x.w].slice(0, 2)}</small></th>`).join('')}`;
  head += Object.values(LV_TYPES).map(t => `<th class="lv-sum" title="${t.th} ทั้งปี ${yr} (วัน)" style="color:${t.c}">${t.s}</th>`).join('') + '</tr>';
  const body = ppl.map(s => {
    const mine = leaves.filter(l => l.sid === s.sid);
    const cells = days.map(x => {
      const l = mine.find(z => lvCovers(z, x.d)), cls = `${x.off ? 'wk' : ''}${x.hol ? ' hol' : ''}`;
      if (l && !x.off && !x.hol) { const t = LV_TYPES[l.type] || LV_TYPES.personal; return `<td class="lv-on ${cls}" style="--c:${t.c}" title="${esc(t.th + (l.half ? ' ' + LV_HALF[l.half] : '') + (l.reason ? ' • ' + l.reason : ''))}"${ed ? ` onclick="lvOpenEdit(${l.lid})"` : ''}>${l.half && l.from === (l.to || l.from) ? '½' : t.s}</td>`; }
      return `<td class="${cls}"${ed && !x.off && !x.hol ? ` onclick="lvOpenAdd(${s.sid},'${x.d}')" title="คลิกเพื่อลงวันลา"` : ''}></td>`;
    }).join('');
    const sums = Object.keys(LV_TYPES).map(t => { const n = mine.filter(l => l.type === t).reduce((a, l) => a + lvDays(l, yFirst, yLast), 0); return `<td class="lv-sum">${n ? lvFmt(n) : ''}</td>`; }).join('');
    return `<tr><td class="lv-name"><b>${esc(staffLabel(s))}</b><small>${esc(s.team || '')}</small></td>${cells}${sums}</tr>`;
  }).join('');
  $('lv-grid').innerHTML = ppl.length ? `<table class="lv-tbl"><thead>${head}</thead><tbody>${body}</tbody></table>` : `<div class="st-empty">${staff.length ? 'ไม่มีพนักงานในทีมที่เลือก' : 'ยังไม่มีรายชื่อพนักงาน — เพิ่มที่แท็บ 👥 รายชื่อพนักงานก่อน'}</div>`;
  // รายการลาของเดือน
  const list = inMonth.slice().sort((a, b) => a.from.localeCompare(b.from) || a.lid - b.lid);
  $('lv-count').textContent = `${list.length} รายการ`;
  $('lv-tbody').innerHTML = list.length ? list.map(l => { const t = LV_TYPES[l.type] || LV_TYPES.personal, s = staff.find(x => x.sid === l.sid);
    return `<tr${ed ? ` class="row-click" onclick="if(!event.target.closest('button'))lvOpenEdit(${l.lid})"` : ''}>
      <td class="wl-strong">${esc(s ? staffLabel(s) : '(ลบออกจากรายชื่อแล้ว)')}</td><td><span class="lv-type" style="--c:${t.c}">${t.th}</span></td>
      <td style="white-space:nowrap">${lvDate(l.from)}${(l.to || l.from) !== l.from ? ' – ' + lvDate(l.to) : ''}${l.half ? ` <small>(${LV_HALF[l.half]})</small>` : ''}</td>
      <td style="text-align:center"><b>${lvFmt(lvDays(l))}</b></td><td>${esc(l.reason || '-')}</td><td style="font-size:11.5px;color:#8a7a5c">${esc(l.by || '')}</td>
      <td>${ed ? `<button class="btn-del" onclick="lvDel(${l.lid})">🗑️</button>` : ''}</td></tr>`; }).join('')
    : `<tr><td colspan="7" class="empty">ไม่มีการลาในเดือน ${MONTHS[m]} ${y}</td></tr>`;
}

// ── ฟอร์มลงวันลา ───────────────────────────────────────────────
function lvFillStaff(sel) { $('lv-f-sid').innerHTML = '<option value="">— เลือกพนักงาน —</option>' + staff.slice().sort((a, b) => staffLabel(a).localeCompare(staffLabel(b), 'th')).map(s => `<option value="${s.sid}"${s.sid === sel ? ' selected' : ''}>${esc(staffLabel(s))}${s.team ? ' · ' + esc(s.team) : ''}</option>`).join(''); }
function lvCalc() {
  const from = $('lv-f-from').value, to = $('lv-f-to').value || from, one = from && from === to;
  $('lv-f-half').disabled = !one; if (!one) $('lv-f-half').value = '';
  const box = $('lv-f-info'); box.dataset.overlap = '';
  if (!from) { box.textContent = ''; return; }
  if (to < from) { box.innerHTML = '<span class="neg">วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม</span>'; return; }
  const n = lvDays({ from, to, half: $('lv-f-half').value }), sid = +$('lv-f-sid').value;
  const ov = leaves.filter(l => l.sid === sid && l.lid !== lvEditId && l.from <= to && (l.to || l.from) >= from);
  box.innerHTML = `รวม <b>${lvFmt(n)}</b> วันทำการ <small>(ไม่นับเสาร์–อาทิตย์และวันหยุด)</small>${ov.length ? `<div class="neg">⚠️ ซ้อนกับการลาเดิม: ${ov.map(l => `${(LV_TYPES[l.type] || {}).th} ${lvDate(l.from)}`).join(', ')}</div>` : ''}`;
  box.dataset.overlap = ov.length ? '1' : '';
}
function lvOpenAdd(sid, d) {
  lvEditId = null; lvFillStaff(sid || null);
  const day = d || (today().startsWith(lvMonth) ? today() : lvMonth + '-01');
  $('lv-f-type').value = 'sick'; $('lv-f-from').value = day; $('lv-f-to').value = day; $('lv-f-half').value = ''; $('lv-f-reason').value = '';
  $('lv-title-m').textContent = '📅 ลงวันลา'; $('lv-f-del').style.display = 'none';
  $('lv-modal').classList.add('open'); lvCalc();
}
function lvOpenEdit(lid) {
  const l = leaves.find(x => x.lid === lid); if (!l) return;
  lvEditId = lid; lvFillStaff(l.sid);
  $('lv-f-type').value = l.type; $('lv-f-from').value = l.from; $('lv-f-to').value = l.to || l.from; $('lv-f-half').value = l.half || ''; $('lv-f-reason').value = l.reason || '';
  $('lv-title-m').textContent = '✏️ แก้ไขวันลา'; $('lv-f-del').style.display = '';
  $('lv-modal').classList.add('open'); lvCalc();
}
function lvClose() { $('lv-modal').classList.remove('open'); }
function lvSaveEntry() {
  const sid = +$('lv-f-sid').value, from = $('lv-f-from').value, to = $('lv-f-to').value || from;
  if (!sid) { alert('กรุณาเลือกพนักงาน'); return; }
  if (!from) { alert('กรุณาระบุวันที่เริ่มลา'); return; }
  if (to < from) { alert('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม'); return; }
  lvCalc();
  if ($('lv-f-info').dataset.overlap && !confirm('ช่วงนี้ซ้อนกับการลาเดิมของพนักงานคนนี้ บันทึกต่อหรือไม่?')) return;
  const rec = { sid, type: $('lv-f-type').value, from, to, half: from === to ? $('lv-f-half').value : '', reason: $('lv-f-reason').value.trim(), by: curUserName(), at: new Date().toISOString() };
  if (!lvDays(rec) && !confirm('ช่วงที่เลือกไม่มีวันทำงานเลย (เสาร์–อาทิตย์/วันหยุด) บันทึกต่อหรือไม่?')) return;
  if (lvEditId) { const i = leaves.findIndex(l => l.lid === lvEditId); leaves[i] = { ...leaves[i], ...rec }; }
  else leaves.push({ lid: lvNextId++, ...rec });
  lvSave(); lvClose(); lvMonth = from.slice(0, 7); renderLeave(); toast('บันทึกวันลาแล้ว');
}
function lvDel(lid) {
  const id = lid || lvEditId, l = leaves.find(x => x.lid === id); if (!l) return;
  const s = staff.find(x => x.sid === l.sid);
  if (!confirm(`ลบ${(LV_TYPES[l.type] || {}).th || 'การลา'} ${lvDate(l.from)} ของ ${s ? staffLabel(s) : ''}?`)) return;
  leaves = leaves.filter(x => x.lid !== id); lvSave(); lvClose(); renderLeave(); toast('ลบวันลาแล้ว');
}

// ── Export Excel: ตารางลาของเดือน + สรุปทั้งปี ────────────────────────
async function lvExport() {
  let X; try { X = await loadExcelJS(); } catch (e) { alert(e.message); return; }
  const ym = lvMonth, [y, m] = ym.split('-').map(Number), dim = new Date(y, m, 0).getDate(), F = 'Tahoma', wb = new X.Workbook();
  const ppl = staff.filter(s => !lvTeam || s.team === lvTeam).sort((a, b) => String(a.team || '').localeCompare(String(b.team || ''), 'th') || staffLabel(a).localeCompare(staffLabel(b), 'th'));
  const ws = wb.addWorksheet(`ตารางลา ${ym}`, { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }], pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const keys = Object.keys(LV_TYPES);
  ws.columns = [{ width: 26 }, { width: 22 }, ...Array.from({ length: dim }, () => ({ width: 4 })), ...keys.map(() => ({ width: 8 }))];
  ws.addRow(['พนักงาน', 'ทีม', ...Array.from({ length: dim }, (_, i) => i + 1), ...keys.map(k => `${LV_TYPES[k].th} (ปี)`)]);
  ppl.forEach(s => {
    const mine = leaves.filter(l => l.sid === s.sid), row = [staffLabel(s), s.team || ''];
    for (let i = 1; i <= dim; i++) { const d = `${ym}-${String(i).padStart(2, '0')}`, l = mine.find(z => lvCovers(z, d)); row.push(l && lvWorkday(d) ? (l.half && l.from === (l.to || l.from) ? '½' : (LV_TYPES[l.type] || LV_TYPES.personal).s) : ''); }
    keys.forEach(k => row.push(mine.filter(l => l.type === k).reduce((a, l) => a + lvDays(l, `${y}-01-01`, `${y}-12-31`), 0) || ''));
    ws.addRow(row);
  });
  ws.eachRow((r, i) => r.eachCell((c, col) => {
    c.font = { name: F, size: 10, bold: i === 1 }; c.alignment = { horizontal: col <= 2 ? 'left' : 'center', vertical: 'middle' };
    c.border = { top: { style: 'thin', color: { argb: 'FFD5D2C8' } }, bottom: { style: 'thin', color: { argb: 'FFD5D2C8' } }, left: { style: 'thin', color: { argb: 'FFD5D2C8' } }, right: { style: 'thin', color: { argb: 'FFD5D2C8' } } };
    if (i === 1) { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5444' } }; c.font = { name: F, size: 10, bold: true, color: { argb: 'FFFFFFFF' } }; return; }
    if (col > 2 && col <= dim + 2) {
      const d = `${ym}-${String(col - 2).padStart(2, '0')}`, t = keys.map(k => LV_TYPES[k]).find(t => t.s === c.value);
      if (!lvWorkday(d)) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1EEE6' } };
      if (t || c.value === '½') c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + (t ? t.c.slice(1) : 'C9A96A').toUpperCase() } }, c.font = { name: F, size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    }
  }));
  const ls = wb.addWorksheet(`รายการ ${ym}`, { views: [{ state: 'frozen', ySplit: 1 }] });
  ls.columns = [['พนักงาน', 26], ['ประเภท', 12], ['ตั้งแต่', 12], ['ถึง', 12], ['แบบ', 14], ['วันทำการ', 10], ['เหตุผล', 34], ['บันทึกโดย', 18]].map(([h, w]) => ({ header: h, width: w }));
  const first = ym + '-01', last = `${ym}-${String(dim).padStart(2, '0')}`;
  leaves.filter(l => l.from <= last && (l.to || l.from) >= first && ppl.some(s => s.sid === l.sid)).sort((a, b) => a.from.localeCompare(b.from))
    .forEach(l => { const s = staff.find(x => x.sid === l.sid); ls.addRow([s ? staffLabel(s) : '', (LV_TYPES[l.type] || {}).th || '', l.from, l.to || l.from, LV_HALF[l.half || ''], lvDays(l), l.reason || '', l.by || '']); });
  ls.getRow(1).eachCell(c => { c.font = { name: F, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5444' } }; });
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = `ตารางลา_${ym}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast(`Export ตารางลา ${MONTHS[m]} ${y} แล้ว`);
}

document.addEventListener('DOMContentLoaded', () => {
  $('lv-fteam').addEventListener('change', e => { lvTeam = e.target.value; renderLeave(); });
  ['lv-f-from', 'lv-f-to', 'lv-f-half', 'lv-f-sid'].forEach(id => $(id).addEventListener('change', lvCalc));
  $('lv-f-from').addEventListener('change', () => { if (!$('lv-f-to').value || $('lv-f-to').value < $('lv-f-from').value) { $('lv-f-to').value = $('lv-f-from').value; lvCalc(); } });
});
