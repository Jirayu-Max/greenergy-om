'use strict';
// ═══ สวัสดิการพนักงาน — งบรายเดือนต่อคน (ค่าเริ่มต้น 500 บาท) อ้างอิงรายชื่อพนักงาน ═══════════
// welfare    = [{ wid, sid, date, amount, category, item, note, by, at }]   รายการที่ใช้
// welfareCfg = { amount, rollover, exclude:[sid] }                          ตั้งค่า (rollover = ยอดเหลือสะสมข้ามเดือนภายในปีเดียวกัน)
const WEL_KEY = 'greenergy_welfare', WEL_CFG_KEY = 'greenergy_welfare_cfg';
const WEL_DEF = { amount: 500, rollover: true, exclude: [], ver: 2, since: '2026-11' };   // since = เดือนแรกที่เริ่มให้สวัสดิการ
// ver 2: ค่าเริ่มต้นเปลี่ยนเป็นสะสมภายในปี — ตั้งค่าที่สร้างก่อนหน้านี้ (ยังไม่มีใครเลือกเอง) ปรับตามไปด้วย
const welCfgFix = c => { const old = !c || c.ver !== 2; c = Object.assign({}, WEL_DEF, c || {}); if (old) { c.rollover = true; c.ver = 2; } return c; };
const WEL_CATS = ['อาหาร / เครื่องดื่ม', 'กิจกรรมทีม', 'ค่ารักษาพยาบาล', 'อุปกรณ์ / ของใช้', 'ค่าเดินทาง', 'อื่น ๆ'];
let welfare = [], welNextId = 1, welCfg = Object.assign({}, WEL_DEF), welMonth = today().slice(0, 7), welEditId = null;
try { const d = JSON.parse(localStorage.getItem(WEL_KEY) || '[]'); if (Array.isArray(d)) welfare = d; } catch (e) {}
try { const c = JSON.parse(localStorage.getItem(WEL_CFG_KEY) || 'null'); if (c && typeof c === 'object') welCfg = welCfgFix(c); } catch (e) {}
welNextId = Math.max(0, ...welfare.map(w => w.wid || 0)) + 1;
function welSave() { try { localStorage.setItem(WEL_KEY, JSON.stringify(welfare)); } catch (e) {} }
function welCfgSave() { try { localStorage.setItem(WEL_CFG_KEY, JSON.stringify(welCfg)); } catch (e) {} }

const welBaht = n => (Math.round((+n || 0) * 100) / 100).toLocaleString('th-TH', { maximumFractionDigits: 2 });
const welMonLbl = ym => { const [y, m] = ym.split('-'); return `${MONTHS[+m]} ${y}`; };
const welMonEnd = ym => { const [y, m] = ym.split('-').map(Number); return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`; };
// มีสิทธิ์ในเดือนนั้น: อยู่ในรายชื่อ ไม่ถูกตัดสิทธิ์ และเริ่มงานแล้ว (ก่อนสิ้นเดือน)
const welEligible = (s, ym) => !(welCfg.since && ym < welCfg.since) && !(welCfg.exclude || []).includes(s.sid) && !(s.start && s.start > welMonEnd(ym));
const welUsed = (sid, from, to) => welfare.filter(w => w.sid === sid && w.date >= from && w.date <= to).reduce((a, w) => a + (+w.amount || 0), 0);
// สิทธิ์ของเดือน: ไม่สะสม = งบเดือนนี้ • สะสม = งบตั้งแต่ ม.ค. (หรือเดือนที่เริ่มงาน) ถึงเดือนนี้ หักที่ใช้ไปก่อนหน้าในปีเดียวกัน
function welBalance(s, ym) {
  const amt = +welCfg.amount || 0, used = welUsed(s.sid, ym + '-01', welMonEnd(ym));
  if (!welCfg.rollover) return { budget: amt, used, left: amt - used };
  const y = ym.slice(0, 4); let months = 0, prevUsed = 0;
  for (let m = 1; m <= +ym.slice(5, 7); m++) { const k = `${y}-${String(m).padStart(2, '0')}`; if (welEligible(s, k)) months++; if (k < ym) prevUsed += welUsed(s.sid, k + '-01', welMonEnd(k)); }
  const budget = amt * months - prevUsed;
  return { budget, used, left: budget - used };
}
const welPeople = ym => staff.filter(s => welEligible(s, ym)).sort((a, b) => String(a.team || '').localeCompare(String(b.team || ''), 'th') || staffLabel(a).localeCompare(staffLabel(b), 'th'));
const welWho = sid => { const s = staff.find(x => x.sid === sid); return s ? staffLabel(s) : '(ลบออกจากรายชื่อแล้ว)'; };

function welNav(d) {
  if (d === 0) welMonth = today().slice(0, 7);
  else { const [y, m] = welMonth.split('-').map(Number), t = new Date(y, m - 1 + d, 1); welMonth = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; }
  renderWelfare();
}
function renderWelfare() {
  const ym = welMonth, ppl = welPeople(ym), ed = cpCanEdit(), y = ym.slice(0, 4);
  $('wel-title').textContent = welMonLbl(ym);
  const bal = ppl.map(s => ({ s, ...welBalance(s, ym), yearUsed: welUsed(s.sid, y + '-01-01', y + '-12-31') }));
  const tBudget = bal.reduce((a, b) => a + b.budget, 0), tUsed = bal.reduce((a, b) => a + b.used, 0);
  $('wel-k-people').textContent = ppl.length;
  $('wel-k-budget').textContent = '฿' + welBaht(tBudget);
  $('wel-k-used').textContent = '฿' + welBaht(tUsed);
  $('wel-k-left').textContent = '฿' + welBaht(tBudget - tUsed);
  $('wel-k-sub').textContent = welCfg.rollover ? `฿${welBaht(welCfg.amount)}/คน/เดือน • ยอดเหลือสะสมได้ภายในปี${welCfg.since ? ' • เริ่ม ' + welMonLbl(welCfg.since) : ''}` : `฿${welBaht(welCfg.amount)}/คน/เดือน • ไม่สะสมข้ามเดือน`;
  $('wel-people').innerHTML = bal.length ? bal.map(({ s, budget, used, left, yearUsed }) => {
    const pct = budget > 0 ? Math.min(100, Math.round(used / budget * 100)) : (used ? 100 : 0), cls = left < 0 ? 'over' : pct >= 80 ? 'warn' : '';
    return `<div class="wel-card ${cls}${welSel.has(s.sid) ? ' sel' : ''}" style="--tc:${staffTeamColor(s.team)}" onclick="if(!event.target.closest('button,input,label'))welToggle(${s.sid}, !welSel.has(${s.sid}))">
      <label class="wel-chk" title="เลือกเพื่อดูยอดรวม"><input type="checkbox"${welSel.has(s.sid) ? ' checked' : ''} onchange="welToggle(${s.sid}, this.checked)"></label>
      <div class="wel-ph">${s.photo ? `<img src="${s.photo}" alt="">` : `<span>${esc(staffInitial(s))}</span>`}</div>
      <div class="wel-main"><div class="wel-name">${esc(staffLabel(s))}</div><div class="wel-team">${esc(s.team || '-')}</div>
        <div class="wel-bar"><i style="width:${pct}%"></i></div>
        <div class="wel-nums"><span>ใช้ ฿${welBaht(used)} / ฿${welBaht(budget)}</span><b>${left < 0 ? 'เกิน' : 'เหลือ'} ฿${welBaht(Math.abs(left))}</b></div>
        <div class="wel-year">ทั้งปี ${y} ใช้ไป ฿${welBaht(yearUsed)}</div></div>
      ${ed ? `<button type="button" class="btn-secondary wel-add" onclick="welOpenAdd(${s.sid})">＋ ใช้</button>` : ''}</div>`;
  }).join('') : `<div class="st-empty">${staff.length ? 'ไม่มีผู้มีสิทธิ์ในเดือนนี้ — ตรวจที่ ⚙️ ตั้งค่า' : 'ยังไม่มีรายชื่อพนักงาน — เพิ่มที่แท็บ 👥 รายชื่อพนักงานก่อน'}</div>`;
  welSelBar(bal);
  const list = welfare.filter(w => w.date && w.date.startsWith(ym)).sort((a, b) => b.date.localeCompare(a.date) || b.wid - a.wid);
  $('wel-count').textContent = `${list.length} รายการ`;
  $('wel-tbody').innerHTML = list.length ? list.map(w => `<tr${ed ? ` class="row-click" onclick="if(!event.target.closest('button'))welOpenEdit(${w.wid})"` : ''}>
      <td style="white-space:nowrap">${esc(w.date)}</td><td class="wl-strong">${esc(welWho(w.sid))}</td><td>${esc(w.category || '-')}</td>
      <td>${esc(w.item || '-')}${w.note ? `<div class="wel-note">${esc(w.note)}</div>` : ''}</td><td class="wel-amt">฿${welBaht(w.amount)}</td>
      <td style="font-size:11.5px;color:#8a7a5c">${esc(w.by || '')}</td>
      <td>${ed ? `<button class="btn-del" onclick="welDel(${w.wid})">🗑️</button>` : ''}</td></tr>`).join('')
    : `<tr><td colspan="7" class="empty">ยังไม่มีรายการใช้สวัสดิการใน ${welMonLbl(ym)}</td></tr>`;
}

// ── เลือกหลายคนเพื่อดูยอดรวม ──────────────────────────────────
const welSel = new Set();
function welToggle(sid, on) { if (on) welSel.add(sid); else welSel.delete(sid); renderWelfare(); }
function welSelAll(on) { welSel.clear(); if (on) welPeople(welMonth).forEach(s => welSel.add(s.sid)); renderWelfare(); }
function welSelBar(bal) {
  const box = $('wel-selbar'); if (!box) return;
  const sel = bal.filter(b => welSel.has(b.s.sid)), ed = cpCanEdit();
  if (!sel.length) { box.innerHTML = `<span class="wel-selhint">ติ๊กที่การ์ดเพื่อเลือกหลายคนแล้วดูยอดรวม</span><button type="button" class="btn-secondary" onclick="welSelAll(true)">เลือกทั้งหมด</button>`; return; }
  const sum = k => sel.reduce((a, b) => a + b[k], 0), left = sum('left');
  box.innerHTML = `<span class="wel-selsum"><b>เลือก ${sel.length} คน</b> • สิทธิ์รวม ฿${welBaht(sum('budget'))} • ใช้ไป ฿${welBaht(sum('used'))} • <b class="${left < 0 ? 'neg' : ''}">คงเหลือรวม ฿${welBaht(left)}</b></span>
    <span class="wel-selnames">${sel.map(b => esc(staffLabel(b.s))).join(', ')}</span>
    ${ed ? `<button type="button" class="btn-primary" onclick="welOpenAdd([...welSel])">➕ บันทึกการใช้ให้ ${sel.length} คนนี้</button>` : ''}
    <button type="button" class="btn-secondary" onclick="welSelAll(false)">ล้างที่เลือก</button>`;
}

// ── บันทึกการใช้ (เลือกได้หลายคน → แยก 1 รายการต่อคน) ──────────────────
let welPicked = new Set();
function welPickRender() {
  const d = $('wel-f-date').value, ym = /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : welMonth, q = ($('wel-f-q').value || '').trim().toLowerCase();
  const editW = welEditId ? welfare.find(w => w.wid === welEditId) : null;
  const ppl = staff.filter(s => welEligible(s, ym) || welPicked.has(s.sid)).sort((a, b) => staffLabel(a).localeCompare(staffLabel(b), 'th'));
  $('wel-f-people').innerHTML = ppl.filter(s => !q || [staffLabel(s), s.name, staffEn(s), s.team].some(x => String(x || '').toLowerCase().includes(q))).map(s => {
    let left = welBalance(s, ym).left; if (editW && editW.sid === s.sid && editW.date.startsWith(ym)) left += +editW.amount || 0;
    return `<label class="wel-pk${welPicked.has(s.sid) ? ' on' : ''}"><input type="checkbox" value="${s.sid}"${welPicked.has(s.sid) ? ' checked' : ''} onchange="welPick(${s.sid}, this.checked)"><span class="wel-pkn">${esc(staffLabel(s))}<small>${esc(s.team || '')}</small></span><b class="${left < 0 ? 'neg' : ''}">฿${welBaht(left)}</b></label>`;
  }).join('') || '<div class="hint" style="padding:8px">ไม่พบพนักงาน</div>';
  welShowLeft();
}
function welPick(sid, on) {
  if (welEditId && on) welPicked.clear();                 // แก้ไขรายการเดิม = ทีละคน
  if (on) welPicked.add(sid); else welPicked.delete(sid);
  welPickRender();
}
function welPickAll(on) { const d = $('wel-f-date').value, ym = d ? d.slice(0, 7) : welMonth; welPicked = new Set(on && !welEditId ? staff.filter(s => welEligible(s, ym)).map(s => s.sid) : []); welPickRender(); }
// จำนวนเงินของแต่ละคน ตามโหมด (ต่อคน / ยอดรวมหารเท่ากัน)
function welPerHead() { const a = +$('wel-f-amount').value || 0, n = welPicked.size || 1; return $('wel-f-mode').value === 'split' ? Math.round(a / n * 100) / 100 : a; }
function welShowLeft() {
  const d = $('wel-f-date').value, box = $('wel-f-left'), n = welPicked.size;
  if (!n || !/^\d{4}-\d{2}/.test(d)) { box.innerHTML = n ? '' : '<span class="neg">ยังไม่ได้เลือกพนักงาน</span>'; box.dataset.over = ''; return; }
  const ym = d.slice(0, 7), per = welPerHead(), editW = welEditId ? welfare.find(w => w.wid === welEditId) : null;
  const over = [...welPicked].map(sid => staff.find(s => s.sid === sid)).filter(Boolean).filter(s => {
    let left = welBalance(s, ym).left; if (editW && editW.sid === s.sid && editW.date.startsWith(ym)) left += +editW.amount || 0;
    return per > left;
  }).map(staffLabel);
  box.innerHTML = `เลือก <b>${n}</b> คน • คนละ <b>฿${welBaht(per)}</b> • รวม <b>฿${welBaht(per * n)}</b>${over.length ? `<div class="neg">⚠️ เกินสิทธิ์คงเหลือ: ${esc(over.join(', '))}</div>` : ''}`;
  box.dataset.over = over.join(', ');
}
function welOpenAdd(sids) {
  welEditId = null; welPicked = new Set(Array.isArray(sids) ? sids : sids ? [sids] : []);
  const t = today(); $('wel-f-date').value = t.startsWith(welMonth) ? t : welMonth + '-01';
  ['wel-f-amount', 'wel-f-item', 'wel-f-note', 'wel-f-q'].forEach(id => { $(id).value = ''; }); $('wel-f-cat').value = WEL_CATS[0]; $('wel-f-mode').value = 'each';
  $('wel-title-m').textContent = '➕ บันทึกการใช้สวัสดิการ'; $('wel-f-del').style.display = 'none'; $('wel-f-modebox').style.display = ''; $('wel-f-allbtn').style.display = '';
  $('wel-modal').classList.add('open'); welPickRender(); setTimeout(() => $(welPicked.size ? 'wel-f-amount' : 'wel-f-q').focus(), 50);
}
function welOpenEdit(wid) {
  const w = welfare.find(x => x.wid === wid); if (!w) return;
  welEditId = wid; welPicked = new Set([w.sid]);
  $('wel-f-date').value = w.date; $('wel-f-amount').value = w.amount; $('wel-f-cat').value = w.category || ''; $('wel-f-item').value = w.item || ''; $('wel-f-note').value = w.note || ''; $('wel-f-q').value = ''; $('wel-f-mode').value = 'each';
  $('wel-title-m').textContent = '✏️ แก้ไขรายการสวัสดิการ'; $('wel-f-del').style.display = ''; $('wel-f-modebox').style.display = 'none'; $('wel-f-allbtn').style.display = 'none';
  $('wel-modal').classList.add('open'); welPickRender();
}
function welClose() { $('wel-modal').classList.remove('open'); }
function welSaveEntry() {
  const date = $('wel-f-date').value, total = +$('wel-f-amount').value, item = $('wel-f-item').value.trim(), sids = [...welPicked];
  if (!sids.length) { alert('กรุณาเลือกพนักงานอย่างน้อย 1 คน'); return; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { alert('กรุณาระบุวันที่'); return; }
  if (!(total > 0)) { alert('กรุณาระบุจำนวนเงิน'); $('wel-f-amount').focus(); return; }
  if (!item) { alert('กรุณาระบุว่านำไปใช้อะไร'); $('wel-f-item').focus(); return; }
  welShowLeft();
  const over = $('wel-f-left').dataset.over;
  if (over && !confirm(`ยอดนี้เกินสิทธิ์คงเหลือของ: ${over}\nบันทึกต่อหรือไม่?`)) return;
  const per = welPerHead(), base = { date, amount: per, category: $('wel-f-cat').value.trim(), item, note: $('wel-f-note').value.trim(), by: curUserName(), at: new Date().toISOString() };
  if (welEditId) { const i = welfare.findIndex(w => w.wid === welEditId); welfare[i] = { ...welfare[i], ...base, sid: sids[0] }; }
  else sids.forEach(sid => welfare.push({ wid: welNextId++, sid, ...base }));
  welSave(); welClose(); welMonth = date.slice(0, 7); renderWelfare();
  toast(welEditId ? 'บันทึกการแก้ไขแล้ว' : `บันทึกการใช้สวัสดิการ ${sids.length} คน (คนละ ฿${welBaht(per)}) แล้ว`);
}
function welDel(wid) {
  const id = wid || welEditId, w = welfare.find(x => x.wid === id); if (!w) return;
  if (!confirm(`ลบรายการ "${w.item}" ฿${welBaht(w.amount)} ของ ${welWho(w.sid)}?`)) return;
  welfare = welfare.filter(x => x.wid !== id); welSave(); welClose(); renderWelfare(); toast('ลบรายการแล้ว');
}

// ── ตั้งค่า ─────────────────────────────────────────────────
function welCfgOpen() {
  $('wel-c-amount').value = welCfg.amount; $('wel-c-since').value = welCfg.since || ''; $('wel-c-roll').checked = !!welCfg.rollover;
  $('wel-c-list').innerHTML = staff.slice().sort((a, b) => staffLabel(a).localeCompare(staffLabel(b), 'th'))
    .map(s => `<label class="u-tab"><input type="checkbox" value="${s.sid}"${(welCfg.exclude || []).includes(s.sid) ? '' : ' checked'}><span>${esc(staffLabel(s))}</span></label>`).join('') || '<em>ยังไม่มีรายชื่อพนักงาน</em>';
  $('wel-cfg').classList.add('open');
}
function welCfgSaveForm() {
  const amount = +$('wel-c-amount').value; if (!(amount >= 0)) { alert('กรุณาระบุงบต่อคนต่อเดือน'); return; }
  const exclude = [...document.querySelectorAll('#wel-c-list input')].filter(i => !i.checked).map(i => +i.value);
  welCfg = { amount, rollover: $('wel-c-roll').checked, exclude, ver: 2, since: $('wel-c-since').value || '' }; welCfgSave();
  $('wel-cfg').classList.remove('open'); renderWelfare(); toast('บันทึกการตั้งค่าสวัสดิการแล้ว');
}

// ── Export Excel: สรุปรายคน + รายการใช้ของเดือน ─────────────────────
async function welExport() {
  let X; try { X = await loadExcelJS(); } catch (e) { alert(e.message); return; }
  const ym = welMonth, y = ym.slice(0, 4), wb = new X.Workbook(), F = 'Tahoma', head = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A5444' } };
  const sheet = (name, cols, rows) => {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = cols.map(([h, w]) => ({ header: h, width: w })); rows.forEach(r => ws.addRow(r));
    ws.getRow(1).eachCell(c => { c.font = { name: F, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = head; c.alignment = { vertical: 'middle', horizontal: 'center' }; });
    ws.eachRow((r, i) => { if (i > 1) r.eachCell(c => { c.font = { name: F, size: 11 }; if (typeof c.value === 'number') c.numFmt = '#,##0.00'; }); });
  };
  sheet(`สรุป ${ym}`, [['พนักงาน', 30], ['ทีม', 30], ['สิทธิ์เดือนนี้ (บาท)', 18], ['ใช้ไป (บาท)', 14], ['คงเหลือ (บาท)', 14], [`ใช้ทั้งปี ${y} (บาท)`, 18]],
    welPeople(ym).map(s => { const b = welBalance(s, ym); return [staffLabel(s), s.team || '', b.budget, b.used, b.left, welUsed(s.sid, y + '-01-01', y + '-12-31')]; }));
  sheet(`รายการ ${ym}`, [['วันที่', 12], ['พนักงาน', 30], ['ประเภท', 20], ['นำไปใช้', 36], ['จำนวนเงิน (บาท)', 16], ['หมายเหตุ', 28], ['บันทึกโดย', 20]],
    welfare.filter(w => w.date && w.date.startsWith(ym)).sort((a, b) => a.date.localeCompare(b.date)).map(w => [w.date, welWho(w.sid), w.category || '', w.item || '', +w.amount || 0, w.note || '', w.by || '']));
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = `สวัสดิการพนักงาน_${ym}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast(`Export สวัสดิการ ${welMonLbl(ym)} แล้ว`);
}

document.addEventListener('DOMContentLoaded', () => {
  $('wel-f-cats').innerHTML = WEL_CATS.map(c => `<option value="${esc(c)}">`).join('');
  $('wel-f-date').addEventListener('change', welPickRender);
  $('wel-f-q').addEventListener('input', welPickRender);
  ['wel-f-amount', 'wel-f-mode'].forEach(id => $(id).addEventListener('input', welShowLeft));
  $('wel-f-mode').addEventListener('change', welShowLeft);
});
