'use strict';
// ── Smart O&M Calendar + Resource Planning + Team mail ───────────
const OP_KEY = 'greenergy_operator_dir_v1';
const DAYMS = 864e5;
let calMonth = (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })();
// สมุดรายชื่อ Operator: อีเมลของแต่ละคน (หลายอีเมลต่อคนได้) + อีเมลผู้ส่ง (Organizer)
let opDir = { emails: {}, organizer: '', flowUrl: '', autoSend: false, sent: {} };
try { const d = JSON.parse(localStorage.getItem(OP_KEY) || 'null'); if (d && typeof d === 'object') opDir = Object.assign(opDir, { emails: d.emails || {}, organizer: d.organizer || '', flowUrl: d.flowUrl || '', autoSend: !!d.autoSend, sent: d.sent || {} }); } catch (e) {}
function opSaveDir() { try { localStorage.setItem(OP_KEY, JSON.stringify(opDir)); } catch (e) {} }

const dparse = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? Date.UTC(+m[1], +m[2]-1, +m[3]) : null; };
const dfmt = t => { const d = new Date(t); return d.getUTCFullYear() + '-' + String(d.getUTCMonth()+1).padStart(2,'0') + '-' + String(d.getUTCDate()).padStart(2,'0'); };

// รวมงานจาก Plan PM&AN (AN / PPM) + งานทั่วไปจากบันทึกงาน (ไม่รวมรายการที่เคยซิงก์จาก PM&AN กันซ้ำ)
function calItems() {
  const out = [];
  (ppmRecords || []).forEach(r => {
    const s = dparse(r.start); if (s == null) return;
    let e = dparse(r.end); if (e == null || e < s) e = s + Math.max(0, (+r.days || 1) - 1) * DAYMS;
    out.push({ src:'ppm', id:r.pid, start:s, end:e, project:r.plant||'', activity:r.activity||'', team:r.team||'', ops:opsOf(r), op:opsOf(r).join(', '), kind:r.type==='AN'?'an':'ppm', label:r.type||'PPM', wo:r.workOrder||'', done:ppmStatusOf(r)==='เสร็จแล้ว' });
  });
  (records || []).forEach(r => {
    if (r.ppmPid != null) return;
    const s = dparse(r.date); if (s == null) return;          // วันเริ่มในปฏิทิน = Start Plan
    let e = dparse(r.finish); if (e == null || e < s) e = s;
    out.push({ src:'job', id:r.id, start:s, end:e, project:r.project||'', activity:(r.jobDescriptions&&r.jobDescriptions[0])||r.typeOfWork||'', team:'', ops:opsOf(r), op:opsOf(r).join(', '), kind:'gen', label:r.typeOfWork||'งานทั่วไป', wo:r.workOrder||'', done:r.status==='เสร็จแล้ว' });
  });
  return out;
}
function calTeamSel() { return ($('cal-team') || {}).value || ''; }
function calOpSel() { return ($('cal-op') || {}).value || ''; }
function calFilteredItems() { const t = calTeamSel(), o = calOpSel(); return calItems().filter(i => (!t || i.team === t) && (!o || i.ops.includes(o))); }
function calFillTeams() {
  const all = calItems(), ct = calTeamSel(), co = calOpSel();
  const teams = uniq(all.map(i => i.team)).sort(), ops = uniq(all.flatMap(i => i.ops)).sort();
  $('cal-team').innerHTML = '<option value="">ทุก Subcontractor</option>' + teams.map(t => `<option${t===ct?' selected':''}>${esc(t)}</option>`).join('');
  $('cal-op').innerHTML = '<option value="">ทุก Operator</option>' + ops.map(t => `<option${t===co?' selected':''}>${esc(t)}</option>`).join('');
}
function calNav(d) {
  calMonth = d === 0 ? (() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); })() : new Date(calMonth.getFullYear(), calMonth.getMonth() + d, 1);
  renderCalendar();
}
function renderCalendar() {
  if (!$('cal-grid')) return;
  calFillTeams();
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), first = Date.UTC(y, m, 1);
  const dim = new Date(y, m + 1, 0).getDate(), dow = new Date(y, m, 1).getDay(), weeks = Math.ceil((dow + dim) / 7);
  const gs = first - dow * DAYMS, items = calFilteredItems(), todayT = dparse(today());
  $('cal-title').textContent = `${MONTHS[m+1]} ${y}`;
  let h = '';
  for (let i = 0; i < weeks * 7; i++) {
    const t = gs + i * DAYMS, d = new Date(t), inM = d.getUTCMonth() === m, wk = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const day = items.filter(it => it.start <= t && t <= it.end);
    h += `<div class="cal-cell${inM?'':' out'}${wk?' wkend':''}${t===todayT?' today':''}" data-day="${t}">
      <div class="cal-dn">${d.getUTCDate()}${day.length?`<span class="cal-cnt">${day.length}</span>`:''}</div>
      <div class="cal-items">${day.map(it => `<div class="cal-chip k-${it.kind}" draggable="true" data-src="${it.src}" data-id="${it.id}" data-day="${t}"
        title="${esc(it.label+' • '+it.project+' • '+it.activity+' • Operator: '+(it.op||'-')+' • Subcontractor: '+(it.team||'-')+' • '+dfmt(it.start)+' → '+dfmt(it.end))}">
        <b>${t>it.start?'◂ ':''}${esc(it.project)}</b><span>${esc(it.activity)}</span><em>${it.op?'👤 '+esc(it.op):'⚠ ไม่ระบุ Operator'}</em></div>`).join('')}</div></div>`;
  }
  $('cal-grid').innerHTML = h;
  renderCalPlan(items, y, m, dim);
  renderResource(items, y, m, dim);
}

// ── มุมมองตาราง: แผนปฏิบัติงานประจำเดือน (แถวละ 1 งานต่อวัน) ────────────
const CAL_VIEW_KEY = 'greenergy_cal_view';
let calView = 'grid';
try { calView = localStorage.getItem(CAL_VIEW_KEY) === 'table' ? 'table' : 'grid'; } catch (e) {}
function calSetView(v) { calView = v; try { localStorage.setItem(CAL_VIEW_KEY, v); } catch (e) {} renderCalendar(); }
const CP_DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
const CP_OPS = 4;                                          // จำนวนช่องผู้ปฏิบัติ (เกินจากนี้รวมไว้ช่องสุดท้าย)
const CP_TEAM_COLORS = ['#2f5fc4', '#d9772b', '#2e8b57', '#b0417a', '#6b4fc0', '#b8860b', '#c0392b', '#1f8a9e'];
const cpTeamColor = t => { let h = 0; for (const ch of String(t)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return CP_TEAM_COLORS[h % CP_TEAM_COLORS.length]; };
const cpCanEdit = () => !(typeof CLOUD !== 'undefined' && CLOUD.on && CLOUD.user && typeof cloudEdit === 'function' && !cloudEdit());
function cpRec(src, id) { return src === 'ppm' ? (ppmRecords || []).find(x => String(x.pid) === String(id)) : (records || []).find(x => String(x.id) === String(id)); }
const cpStr = v => v == null ? '' : String(v);
const CP_KIND = { ppm: 'k-ppm', an: 'k-an', gen: 'k-gen' };
const CP_MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
// ข้อมูลตารางรายวัน (ใช้ร่วมกันทั้งหน้าเว็บและไฟล์ Excel)
function cpDays(items, y, m, dim) {
  const cmp = (a, b) => cpStr(a).localeCompare(cpStr(b), 'th'), ord = { ppm: 0, an: 1, gen: 2 }, out = [];
  for (let d = 1; d <= dim; d++) {
    const t = Date.UTC(y, m, d), day = dfmt(t), w = new Date(y, m, d).getDay();
    const on = items.filter(i => i.start <= t && t <= i.end)
      .sort((a, b) => cmp(a.team, b.team) || cmp(a.project, b.project) || (ord[a.kind] || 0) - (ord[b.kind] || 0));
    if (on.length) out.push({ d, day, w, rows: on.map(it => ({ it, ops: it.ops.map(cpStr), wp: ((cpRec(it.src, it.id) || {}).wp || {})[day] || {} })) });
  }
  return out;
}
function renderCalPlan(items, y, m, dim) {
  const box = $('cal-tableview'); if (!box) return;
  document.querySelectorAll('.cal-viewsw button').forEach(b => b.classList.toggle('on', b.dataset.v === calView));
  $('tab-calendar').classList.toggle('cal-is-table', calView === 'table');
  if (calView !== 'table') { box.innerHTML = ''; return; }
  try { box.innerHTML = cpTableHtml(cpDays(items, y, m, dim), y, m); }
  catch (err) { box.innerHTML = `<div class="empty" style="color:#c00000">แสดงตารางไม่สำเร็จ: ${esc(err && err.message || err)}</div>`; console.error(err); }
}
function cpTableHtml(days, y, m) {
  const dis = cpCanEdit() ? '' : ' disabled', cols = 6 + CP_OPS;
  const opList = (() => { try { return opPickList().map(cpStr); } catch (e) { return []; } })();
  const opSel = (a, i, cur, extra) => {
    cur = cur ? staffResolve(cur) : cur;
    const l = cur && !opList.includes(cur) ? [cur, ...opList] : opList;
    // ชื่อแสดงเป็นข้อความเต็ม (ตัดบรรทัดได้) มี select โปร่งใสทับไว้ให้กดเลือก
    return `<label class="cp-opbox${cur ? ' has' : ''}"><span class="cp-opname">${cur ? esc(cur) : '–'}</span><select class="cp-opsel" ${a} data-i="${i}"${dis} onchange="calOpSet(this)"${extra.length ? ` title="รวม: ${esc(extra.join(', '))}"` : ''}><option value="">–</option>${l.map(n => `<option${n === cur ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select></label>${extra.length ? `<small class="cp-more">+${extra.length}</small>` : ''}`;
  };
  let body = '', nJobs = 0, nDone = 0, nWp = 0;
  days.forEach(({ d, day, w, rows }) => rows.forEach(({ it, ops, wp }, k) => {
    nJobs++; if (it.done) nDone++; if (wp.ok) nWp++;
    const a = `data-src="${it.src}" data-id="${esc(it.id)}" data-day="${day}"`;
    body += `<tr class="${k === 0 ? 'cp-first' : ''}${it.done ? ' cp-done' : ''}${w === 0 || w === 6 ? ' cp-wk' : ''}">` +
      (k === 0 ? `<td class="cp-day" rowspan="${rows.length}"><span class="cp-dow">${CP_DOW[w]}</span><span class="cp-dnum">${d}</span><span class="cp-dmy">${CP_MON[m]} ${y}</span></td>` : '') +
      `<td class="cp-act cp-open" ${a} title="คลิกเพื่อดูรายละเอียด / แก้ไข"><span class="cp-kind ${CP_KIND[it.kind] || ''}">${esc(it.label)}</span>${esc(it.activity || '-')}` +
        `${it.done ? '<span class="cp-donetag">✓ เสร็จเรียบร้อย</span>' : ''}${it.wo ? `<small class="cp-wo">${esc(it.wo)}</small>` : ''}</td>` +
      `<td class="cp-prj cp-open" ${a}><span class="cp-plbl">Project</span>${esc(it.project || '-')}</td>` +
      Array.from({ length: CP_OPS }, (_, i) => `<td class="cp-op">${opSel(a, i, ops[i] || '', i === CP_OPS - 1 ? ops.slice(CP_OPS) : [])}</td>`).join('') +
      `<td class="cp-team">${it.team ? `<span class="cp-pill" style="--c:${cpTeamColor(it.team)}">${esc(it.team)}</span>` : ''}</td>` +
      `<td class="cp-chk"><label class="cp-cb"><input type="checkbox" ${a}${wp.ok ? ' checked' : ''}${dis} onchange="calWpSet(this,'ok',this.checked)"><i></i></label></td>` +
      `<td class="cp-by"><input type="text" list="cp-ops-list" placeholder="—" ${a} value="${esc(wp.by || '')}"${dis} onchange="calWpSet(this,'by',this.value.trim())"></td></tr>`;
  }));
  const pct = nJobs ? Math.round(nDone / nJobs * 100) : 0;
  return `<div class="cp-sum"><span><b>${nJobs}</b> งาน-วัน</span><span class="ok"><b>${nDone}</b> เสร็จเรียบร้อย (${pct}%)</span><span><b>${nWp}</b> เปิด Work แล้ว</span>
      <span class="cp-leg"><i class="lg-done"></i>เสร็จเรียบร้อย <i class="lg-wk"></i>เสาร์–อาทิตย์</span></div>
    <table class="cp-tbl"><thead>
    <tr><th class="cp-title" colspan="${cols}"><span class="cp-t1">แผนปฏิบัติงานประจำเดือน ${String(m+1).padStart(2,'0')}-${y}</span><span class="cp-t2">Maintenance · ${MONTHS[m+1]} ${y}</span></th></tr>
    <tr class="cp-head"><th>วัน/วันที่</th><th colspan="2">รายละเอียดงานที่ต้องปฏิบัติ / ไซต์งาน</th><th colspan="${CP_OPS}">ผู้ปฏิบัติ</th><th>ผรม</th><th>เปิด Work<br>เรียบร้อย</th><th>ผู้รับผิดชอบเปิด Work</th></tr></thead>
    <tbody>${body || `<tr><td colspan="${cols}" class="empty">ไม่มีงานในเดือน ${MONTHS[m+1]} ${y} — กด “เดือนถัดไป ▶” หรือตรวจตัวกรอง Operator / Subcontractor</td></tr>`}</tbody></table>
    <datalist id="cp-ops-list">${opList.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
}
// เปลี่ยนผู้ปฏิบัติจาก Drop-down ในตาราง → แก้ที่ตัวงาน (มีผลทุกวันของงานนั้น)
function calOpSet(el) {
  const { src, id } = el.dataset, r = cpRec(src, id); if (!r) return;
  const sels = [...el.closest('tr').querySelectorAll('.cp-opsel')].map(s => s.value);
  const ops = uniq([...sels, ...opsOf(r).slice(CP_OPS)]);
  r.operators = ops; r.operator = ops.join(', ');
  if (src === 'ppm') ppmSaveStore(); else save();
  renderCalendar();
}

// ── Export Excel (.xlsx) ─────────────────────────────────────────
let _xlsLib = null;
function loadExcelJS() {
  if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
  return _xlsLib = _xlsLib || new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.4.0/exceljs.min.js';
    s.onload = () => ok(window.ExcelJS); s.onerror = () => { _xlsLib = null; fail(new Error('โหลดตัวสร้างไฟล์ Excel ไม่ได้ (ตรวจอินเทอร์เน็ต)')); };
    document.head.appendChild(s);
  });
}
async function calExportExcel() {
  let X; try { X = await loadExcelJS(); } catch (e) { alert(e.message); return; }
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), dim = new Date(y, m + 1, 0).getDate();
  const days = cpDays(calFilteredItems(), y, m, dim), mm = `${String(m+1).padStart(2,'0')}-${y}`;
  if (!days.length) { alert(`ไม่มีงานในเดือน ${MONTHS[m+1]} ${y}`); return; }
  const wb = new X.Workbook(); wb.creator = 'Greenergy O&M';
  const ws = wb.addWorksheet(`แผนงาน ${mm}`, { views: [{ state: 'frozen', ySplit: 3 }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: .3, right: .3, top: .4, bottom: .4, header: .2, footer: .2 }, printTitlesRow: '1:3' } });
  const NC = 12, F = 'Tahoma', GREEN = 'FF1F4A39', GOLD = 'FFC9A96E', HEAD = 'FF2A5444', DONE = 'FFE3F2E6', WK = 'FFFBF6EC', DAY = 'FFF4F2EC';
  ws.columns = [16, 44, 20, 15, 11, 11, 11, 11, 10, 13, 22, 16].map(w => ({ width: w }));
  const thin = { style: 'thin', color: { argb: 'FFD5D2C8' } }, thick = { style: 'medium', color: { argb: 'FF3B3B3B' } };
  ws.mergeCells(1, 1, 1, NC); ws.mergeCells(2, 1, 2, NC);
  ws.getCell('A1').value = `แผนปฏิบัติงานประจำเดือน  ${mm}`;
  ws.getCell('A2').value = `Maintenance · ${MONTHS[m+1]} ${y}`;
  [[1, 18, 30], [2, 12, 22]].forEach(([r, sz, h]) => {
    const c = ws.getCell(r, 1); ws.getRow(r).height = h;
    c.font = { name: F, size: sz, bold: true, color: { argb: r === 1 ? 'FFFFFFFF' : GOLD } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } }; c.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  const hd = ['วัน/วันที่', 'รายละเอียดงานที่ต้องปฏิบัติ', 'ไซต์งาน (Project)', 'Work Order', 'ผู้ปฏิบัติ 1', 'ผู้ปฏิบัติ 2', 'ผู้ปฏิบัติ 3', 'ผู้ปฏิบัติ 4', 'ผรม', 'เปิด Work\nเรียบร้อย', 'ผู้รับผิดชอบเปิด Work', 'สถานะงาน'];
  const hr = ws.getRow(3); hr.values = hd; hr.height = 34;
  hr.eachCell(c => { c.font = { name: F, size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; c.border = { top: thin, left: thin, right: thin, bottom: { style: 'medium', color: { argb: GOLD } } }; });
  let r = 4;
  days.forEach(({ d, w, rows }) => {
    const r0 = r;
    rows.forEach(({ it, ops, wp }, k) => {
      const ex = ops.slice(CP_OPS - 1), row = ws.getRow(r);
      row.values = [k === 0 ? `${CP_DOW[w]}\n${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${y}` : '', `${it.label} : ${it.activity || '-'}`, it.project || '-', it.wo || '',
        ops[0] || '', ops[1] || '', ops[2] || '', ex.join(', '), it.team || '', wp.ok ? '☑' : '☐', wp.by || '', it.done ? 'เสร็จเรียบร้อย' : ''];
      row.height = 22;
      for (let col = 1; col <= NC; col++) {
        const c = row.getCell(col), left = [2, 3, 11].includes(col);
        c.font = { name: F, size: 11, bold: col === 1 || col === 9 || col === 12,
          color: { argb: col === 9 && it.team ? 'FF' + cpTeamColor(it.team).slice(1).toUpperCase() : col === 12 ? 'FF1E7B45' : 'FF2C2C2C' } };
        if (col === 10) c.font = { name: 'Segoe UI Symbol', size: 14, color: { argb: wp.ok ? 'FFC00000' : 'FF9A9A9A' } };
        c.alignment = { vertical: 'middle', horizontal: left ? 'left' : 'center', wrapText: col === 1, indent: left ? 1 : 0 };
        const bg = col === 1 ? DAY : it.done ? DONE : (w === 0 || w === 6) ? WK : null;
        if (bg) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        c.border = { left: [1, 2, 5, 9].includes(col) ? thick : thin, right: col === NC ? thick : thin, bottom: thin, top: k === 0 ? thick : thin };
      }
      r++;
    });
    if (rows.length > 1) ws.mergeCells(r0, 1, r - 1, 1);
  });
  for (let c = 1; c <= NC; c++) { const cell = ws.getCell(r - 1, c); cell.border = Object.assign({}, cell.border, { bottom: thick }); }
  const buf = await wb.xlsx.writeBuffer(), a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  a.download = `แผนปฏิบัติงาน_${mm}.xlsx`; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  toast(`Export แผนปฏิบัติงาน ${mm} แล้ว`);
}
// บันทึกสถานะเปิด Work แยกรายวัน ไว้ในงานนั้น (r.wp[YYYY-MM-DD]) → ซิงก์ขึ้นคลาวด์พร้อมข้อมูลงาน
function calWpSet(el, field, val) {
  const { src, id, day } = el.dataset, r = cpRec(src, id); if (!r) return;
  const wp = r.wp && typeof r.wp === 'object' ? r.wp : {}, cur = Object.assign({}, wp[day]);
  if (val) cur[field] = val; else delete cur[field];
  if (Object.keys(cur).length) wp[day] = cur; else delete wp[day];
  r.wp = wp;
  if (src === 'ppm') ppmSaveStore(); else save();
}
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.cp-open'); if (c) calShowItem(c.dataset.src, c.dataset.id);
});
function renderResource(items, y, m, dim) {
  const first = Date.UTC(y, m, 1), last = first + (dim - 1) * DAYMS;
  const mi = items.filter(i => i.end >= first && i.start <= last);
  const by = ($('cal-res-by') || {}).value || 'team', keys = i => by === 'op' ? (i.ops.length ? i.ops : ['(ไม่ระบุ Operator)']) : [i.team || '(ไม่ระบุทีม)'];
  const teams = uniq(mi.flatMap(keys)).sort();
  if (!teams.length) { $('cal-res').innerHTML = '<div class="empty">ไม่มีงานในเดือนนี้</div>'; return; }
  let head = `<tr><th class="rs-team">${by === 'op' ? 'Operator' : 'Subcontractor'}</th>`;
  for (let d = 1; d <= dim; d++) { const w = new Date(y, m, d).getDay(); head += `<th class="${w===0||w===6?'wk':''}">${d}</th>`; }
  head += '<th>งาน</th><th>วันที่มีงาน</th><th>Utilization</th></tr>';
  const rows = teams.map(tm => {
    const its = mi.filter(i => keys(i).includes(tm)); let busy = 0, cells = '';
    for (let d = 1; d <= dim; d++) {
      const t = Date.UTC(y, m, d), on = its.filter(i => i.start <= t && t <= i.end), w = new Date(y, m, d).getDay();
      if (on.length) busy++;
      cells += `<td class="rs-c${on.length>2?' h3':on.length===2?' h2':on.length?' h1':''}${w===0||w===6?' wk':''}"${on.length?` title="${esc(on.map(i=>i.project+' · '+i.activity).join('\n'))}"`:''}>${on.length||''}</td>`;
    }
    return `<tr><td class="rs-team">${esc(tm)}</td>${cells}<td class="rs-s">${its.length}</td><td class="rs-s">${busy}/${dim}</td><td class="rs-s">${Math.round(busy/dim*100)}%</td></tr>`;
  }).join('');
  $('cal-res').innerHTML = `<table class="rs-tbl"><thead>${head}</thead><tbody>${rows}</tbody></table>`;
}

// ── Drag & drop: ย้ายทั้งช่วงงาน คงจำนวนวันเดิม ───────────────────
function calMove(src, id, deltaDays) {
  if (!deltaDays) return;
  const sh = s => dfmt(dparse(s) + deltaDays * DAYMS);
  if (src === 'ppm') {
    const r = ppmRecords.find(x => String(x.pid) === String(id)); if (!r) return;
    const s = dparse(r.start); let e = dparse(r.end); if (e == null || e < s) e = s + Math.max(0, (+r.days || 1) - 1) * DAYMS;
    r.start = dfmt(s + deltaDays * DAYMS); r.end = dfmt(e + deltaDays * DAYMS);
    r.year = +r.start.slice(0, 4); r.month = +r.start.slice(5, 7);
    ppmSaveStore();
  } else {
    const r = records.find(x => String(x.id) === String(id)); if (!r) return;
    r.date = sh(r.date); if (r.plan) r.plan = sh(r.plan); if (r.finish) r.finish = sh(r.finish);
    save();
  }
  toast(`ย้ายงาน ${deltaDays > 0 ? '+' : ''}${deltaDays} วัน (จำนวนวันเดิมคงเดิม)`);
  renderCalendar();
}
document.addEventListener('dragstart', e => {
  const c = e.target.closest && e.target.closest('.cal-chip'); if (!c) return;
  e.dataTransfer.setData('text/plain', JSON.stringify({ src: c.dataset.src, id: c.dataset.id, day: +c.dataset.day }));
  e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging');
});
document.addEventListener('dragend', () => { document.querySelectorAll('.dragging,.dragover').forEach(x => x.classList.remove('dragging', 'dragover')); });
document.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('.cal-cell'); if (!c) return; e.preventDefault(); document.querySelectorAll('.dragover').forEach(x => x !== c && x.classList.remove('dragover')); c.classList.add('dragover'); });
document.addEventListener('drop', e => {
  const c = e.target.closest && e.target.closest('.cal-cell'); if (!c) return; e.preventDefault();
  try { const d = JSON.parse(e.dataTransfer.getData('text/plain')); calMove(d.src, d.id, Math.round((+c.dataset.day - d.day) / DAYMS)); } catch (err) {}
});

// ── คลิกงานในปฏิทิน: ดูรายละเอียด / แก้ไข / ลบ ─────────────────────
let calSel = null;
document.addEventListener('click', e => {
  const c = e.target.closest && e.target.closest('.cal-chip'); if (c) calShowItem(c.dataset.src, c.dataset.id);
});
function calShowItem(src, id) {
  const row = (k, v) => `<div class="cd-k">${k}</div><div class="cd-v">${v ? esc(v) : '<span style="color:#ccc">–</span>'}</div>`;
  let h = '';
  if (src === 'ppm') {
    const r = ppmRecords.find(x => String(x.pid) === String(id)); if (!r) return;
    calSel = { src, id: r.pid, ops: opsOf(r) };
    $('cd-title').textContent = `🔧 ${r.type || 'PM&AN'} — ${r.plant}`;
    h = row('Work Order', r.workOrder) + row('Project', r.plant) + row('Owner', r.owner) + row('Project Type', r.ptype) + row('Activity', r.activity) + row('Round', r.round) +
      row('Start → END', `${r.start || '-'} → ${r.end || '-'}  (${r.days || 0} วัน)`) + row('สถานะ', ppmStatusOf(r)) + row('Progress', Math.round((r.progress||0)*100) + '%') +
      row('BOQ / Actual (฿)', `${Math.round(r.budget||0).toLocaleString()} / ${Math.round(r.actual||0).toLocaleString()}`) + row('Subcontractor', r.team) + row('Operator', opsOf(r).join(', ')) + row('Remark', r.remark);
  } else {
    const r = records.find(x => String(x.id) === String(id)); if (!r) return;
    calSel = { src, id: r.id, ops: opsOf(r) };
    $('cd-title').textContent = `📋 ${r.typeOfWork || 'งานทั่วไป'} — ${r.project}`;
    h = row('Work Order', r.workOrder) + row('Project', r.project) + row('Owner', r.owner) + row('Type of work', r.typeOfWork) + row('Job Description', (r.jobDescriptions||[]).join(', ')) +
      row('Detail', detailsText(r).join('\n')) + row('Received Date', r.received) + row('Start Plan → Finish', `${r.date || '-'} → ${r.finish || '-'}`) + row('Operator', opsOf(r).join(', ')) +
      row('Priority / สถานะ', `${r.priority} / ${r.status}`) + row('SLA', slaEffective(r)) + row('Report#', r.report);
  }
  $('cd-body').innerHTML = h; $('cal-detail').classList.add('open');
}
function closeCalDetail() { $('cal-detail').classList.remove('open'); }
function calDetailEdit() { const s = calSel; closeCalDetail(); if (!s) return; if (s.src === 'ppm') openEditPpm(s.id); else openEdit(s.id); }
function calDetailDel() {
  const s = calSel; if (!s) return;
  if (s.src === 'ppm') { if (!confirm('ต้องการลบงานนี้?')) return; ppmRecords = ppmRecords.filter(p => p.pid !== s.id); ppmSaveStore(); planpmInit(); }
  else { if (!confirm('ต้องการลบรายการนี้?')) return; records = records.filter(r => r.id !== s.id); save(); }
  closeCalDetail(); renderCalendar();
}

// ═══ ช่อง Operator หลายคน (ใช้ทั้งฟอร์มบันทึกงานและ PM&AN) ═══════════
// มีรายชื่อพนักงานแล้ว → ใช้ "ชื่อจริง (ชื่อเล่น)" จากแท็บรายชื่อ, ยังไม่มี → ใช้รายการเดิม
function opPickList() { if (staff.length) return staffLabels(); return uniq([...(options.operator || []), ...(options.ppmOperator || [])]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th')); }
function opsRegister(names) { (names || []).forEach(n => { if (!n) return; ['operator', 'ppmOperator'].forEach(k => { if (!Array.isArray(options[k])) options[k] = []; if (!options[k].includes(n)) options[k].push(n); }); }); saveOpts(); }
let opsSeq = 0;
function opsFill(sel, cur) { const l = opPickList(); cur = cur ? staffResolve(cur) : cur; if (cur && !l.includes(cur)) l.unshift(cur); sel.innerHTML = '<option value="">— เลือก Operator —</option>' + l.map(v => `<option value="${esc(v)}"${v === cur ? ' selected' : ''}>${esc(v)}</option>`).join(''); }
function opsInit(cid, names) {
  const box = $(cid); if (!box) return;
  box.innerHTML = `<div class="ops-rows"></div><div class="ops-actions"><button type="button" class="btn-add-jd" onclick="opsAdd('${cid}')">＋ เพิ่มช่อง Operator</button></div>`;
  (names && names.length ? names : ['']).forEach(n => opsAdd(cid, n));
}
function opsAdd(cid, name) {
  const id = 'ops-' + (++opsSeq), d = document.createElement('div'); d.className = 'opt-row ops-row';
  d.innerHTML = `<select class="ops-sel" id="${id}"></select><button type="button" class="btn-add-opt" title="➕ เพิ่มพนักงานใหม่ในรายชื่อ" onclick="opsNewName('${id}')">＋</button><button type="button" class="ops-rm" title="ลบช่องนี้" onclick="opsRm(this)">➖</button>`;
  $(cid).querySelector('.ops-rows').appendChild(d); opsFill($(id), name || '');
}
function opsRm(btn) { const row = btn.closest('.ops-row'); if (row.parentNode.children.length > 1) row.remove(); }
function opsGet(cid) { const b = $(cid); return b ? uniq([...b.querySelectorAll('.ops-sel')].map(x => x.value).filter(Boolean)) : []; }
function opsRefreshAll(originId, originVal) { document.querySelectorAll('.ops-sel').forEach(x => opsFill(x, x.id === originId ? originVal : x.value)); }
function opsNewName(id) { openAddStaff(id); }   // เพิ่มชื่อใหม่ = เพิ่มพนักงานในแท็บรายชื่อ แล้วเลือกให้ในช่องนี้
function opsDelName(id) {
  const v = $(id).value; if (!v) return;
  if (!confirm(`ลบ "${v}" ออกจากรายการ Operator?\n(งานเดิมที่ใช้ชื่อนี้จะยังคงอยู่)`)) return;
  ['operator', 'ppmOperator'].forEach(k => { options[k] = (options[k] || []).filter(x => x !== v); }); saveOpts(); opsRefreshAll(id, '');
}

// ═══ ส่งงานเข้า Outlook / Teams ของ Operator ═══════════════════════
const parseEmails = txt => { const seen = new Set(), ok = [], bad = []; String(txt || '').split(/[\s,;]+/).map(x => x.trim()).filter(Boolean).forEach(x => { const k = x.toLowerCase(); if (seen.has(k)) return; seen.add(k); (/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(x) ? ok : bad).push(x); }); return { ok, bad }; };
const opEmails = name => { const ok = parseEmails((opDir.emails || {})[name]).ok, s = staffFind(name); return ok.length || !s || !s.email ? ok : parseEmails(s.email).ok; };
const opsEmails = names => uniq((names || []).flatMap(opEmails));
const tzOff = () => { const m = -new Date().getTimezoneOffset(), a = Math.abs(m); return (m >= 0 ? '+' : '-') + String(Math.floor(a / 60)).padStart(2, '0') + ':' + String(a % 60).padStart(2, '0'); };
const tzIso = (d, hhmm) => `${d}T${hhmm}:00${tzOff()}`;
function calEventOf(src, id) {
  const it = calItems().find(i => i.src === src && String(i.id) === String(id)); if (!it) return null;
  const desc = [`Operator: ${it.ops.join(', ') || '-'}`, `ประเภท: ${it.label}`, `ช่วงงาน: ${dfmt(it.start)} – ${dfmt(it.end)}`];
  if (src === 'ppm') { const r = ppmRecords.find(x => String(x.pid) === String(id)) || {}; desc.push(`Subcontractor: ${r.team || '-'}`, `Round: ${r.round || '-'}`, `สถานะ: ${ppmStatusOf(r)} (${Math.round((r.progress||0)*100)}%)`); if (r.remark) desc.push(`หมายเหตุ: ${r.remark}`); }
  else { const r = records.find(x => String(x.id) === String(id)) || {}; desc.push(`Owner: ${r.owner || '-'}`, `Priority: ${r.priority || '-'}`, ...(r.details && r.details.length ? ['รายละเอียด: ' + detailsText(r).join(' / ')] : [])); }
  return { it, title: `[${it.label}] ${it.project}${it.activity ? ' — ' + it.activity : ''}`, desc: desc.join('\n'), loc: it.project, uid: `${src}-${id}@greenergy-om` };
}
const ymd = t => dfmt(t).replace(/-/g, '');
function calSendBlock() {
  const ops = (calSel && calSel.ops) || [];
  if (!ops.length) return '<div class="cd-send warn">⚠️ งานนี้ยังไม่ระบุ Operator — กด “แก้ไข” เพื่อเลือก Operator ก่อน จึงจะส่งเข้า Calendar ได้</div>';
  const info = ops.map(n => ({ n, em: opEmails(n) })), have = info.filter(x => x.em.length), miss = info.filter(x => !x.em.length);
  const ev = calEventOf(calSel.src, calSel.id), sent = ev && opDir.sent && opDir.sent[ev.uid];
  let h = `<div class="cd-send"><div class="cd-send-h">📅 มอบหมายงานเข้า Outlook / Teams Calendar ของ: ${info.map(x => `<b>${esc(x.n)}</b>${x.em.length ? ` <small>(${esc(x.em.join(', '))})</small>` : ' <small style="color:#b00">ไม่มีอีเมล</small>'}`).join(' • ')}</div>`;
  if (miss.length) h += `<button class="btn-secondary" onclick="opOpen(${esc(JSON.stringify(miss[0].n)).replace(/"/g, '&quot;')})">＋ เพิ่มอีเมลของ ${esc(miss.map(x => x.n).join(', '))}</button>`;
  if (have.length) h += `<button class="btn-primary" onclick="calSendTo('flow')" title="${opDir.flowUrl ? 'ส่งผ่าน Power Automate ไปสร้างนัดหมายใน Outlook/Teams' : 'ยังไม่ได้ตั้งค่า Flow URL'}">⚡ ส่งเข้า Outlook/Teams ทันที</button>
    <button class="btn-secondary" onclick="calSendTo('outlook')">Outlook (เว็บ)</button><button class="btn-secondary" onclick="calSendTo('teams')">Teams</button><button class="btn-secondary" onclick="calSendTo('google')">Google</button><button class="btn-secondary" onclick="calSendTo('ics')">⬇️ .ics</button>`;
  if (!opDir.flowUrl && have.length) h += `<div class="cd-sub">ส่งทันทีได้เมื่อตั้งค่า Power Automate (กด “เพิ่มอีเมล…” หรือเปิดจากฟอร์ม → ✉️ อีเมล / เชื่อม Outlook-Teams)</div>`;
  if (sent) h += `<div class="cd-sub ok">✓ ส่งคำสั่งเข้า Outlook/Teams แล้วเมื่อ ${esc(new Date(sent).toLocaleString('th-TH'))}</div>`;
  return h + '</div>';
}
async function flowSend(ev, quiet) {
  const url = opDir.flowUrl; if (!url) { if (!quiet) { alert('ยังไม่ได้ตั้งค่า Flow URL (Power Automate)'); opOpen(); } return false; }
  const ops = ev.it.ops, em = opsEmails(ops); if (!em.length) { if (!quiet) alert('ยังไม่มีอีเมลของ Operator'); return false; }
  if (!quiet && opDir.sent && opDir.sent[ev.uid] && !confirm('งานนี้เคยส่งเข้า Calendar แล้ว ส่งซ้ำจะเกิดนัดหมายซ้ำ ต้องการส่งอีกครั้งหรือไม่?')) return false;
  const s = dfmt(ev.it.start), e = dfmt(ev.it.end);
  const payload = { action: 'create', uid: ev.uid, title: ev.title, description: ev.desc, location: ev.loc, project: ev.it.project, activity: ev.it.activity, kind: ev.it.label, operators: ops, attendees: em, attendeesText: em.join(';'), organizer: opDir.organizer,
    allDay: true, start: s, end: e, endExclusive: dfmt(ev.it.end + DAYMS), startDateTime: tzIso(s, '08:00'), endDateTime: tzIso(e, '17:00'), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone };
  try {
    await fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify(payload) });
    opDir.sent = opDir.sent || {}; opDir.sent[ev.uid] = new Date().toISOString(); opSaveDir();
    toast(`ส่งงานให้ ${ops.join(', ')} เข้า Outlook/Teams แล้ว (ตรวจสอบใน Calendar / ประวัติการรัน Flow)`); return true;
  } catch (err) { alert('ส่งไม่สำเร็จ: ' + err.message); return false; }
}
function opAfterSave(src, id) {        // มอบหมายงานใหม่ → ส่งอัตโนมัติ (ถ้าเปิดใช้)
  if (!(opDir.autoSend && opDir.flowUrl)) return;
  setTimeout(() => {
    const ev = calEventOf(src, id); if (!ev || !ev.it.ops.length) return;
    if (!opsEmails(ev.it.ops).length) { toast('มอบหมายแล้ว แต่ Operator ยังไม่มีอีเมล — ยังไม่ส่งเข้า Calendar'); return; }
    flowSend(ev, true);
  }, 60);
}
function calSendTo(kind) {
  const ev = calSel && calEventOf(calSel.src, calSel.id); if (!ev) return;
  const em = opsEmails(ev.it.ops), q = encodeURIComponent, s = dfmt(ev.it.start), e = dfmt(ev.it.end), endEx = dfmt(ev.it.end + DAYMS);
  if (!em.length) { alert('ยังไม่มีอีเมลของ Operator'); return; }
  if (kind === 'flow') flowSend(ev, false).then(() => { if (calSel) { const b = document.querySelector('#cd-body .cd-send'); if (b) b.outerHTML = calSendBlock(); } });
  else if (kind === 'google') window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${q(ev.title)}&dates=${ymd(ev.it.start)}/${ymd(ev.it.end + DAYMS)}&details=${q(ev.desc)}&location=${q(ev.loc)}&add=${q(em.join(','))}`, '_blank');
  else if (kind === 'outlook') window.open(`https://outlook.office.com/calendar/0/deeplink/compose?path=%2Fcalendar%2Faction%2Fcompose&rru=addevent&allday=true&subject=${q(ev.title)}&startdt=${s}&enddt=${endEx}&body=${q(ev.desc)}&location=${q(ev.loc)}&to=${q(em.join(','))}`, '_blank');
  else if (kind === 'teams') window.open(`https://teams.microsoft.com/l/meeting/new?subject=${q(ev.title)}&attendees=${q(em.join(','))}&startTime=${q(tzIso(s, '08:00'))}&endTime=${q(tzIso(e, '17:00'))}&content=${q(ev.desc)}`, '_blank');
  else calDownloadICS([ev], ev.it.ops, `${ev.it.ops.join('+')}_${s}`);
}
function icsEsc(t) { return String(t).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function icsFold(line) {
  const enc = new TextEncoder(); let out = '', cur = '', bytes = 0;
  for (const ch of line) { const b = enc.encode(ch).length; if (bytes + b > 73) { out += cur + '\r\n '; cur = ''; bytes = 1; } cur += ch; bytes += b; }
  return out + cur;
}
function calDownloadICS(events, opNames, fname) {
  const org = parseEmails(opDir.organizer).ok[0] || '', now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Greenergy O&M//TH', 'CALSCALE:GREGORIAN', org ? 'METHOD:REQUEST' : 'METHOD:PUBLISH'];
  events.forEach(ev => {
    L.push('BEGIN:VEVENT', `UID:${ev.uid}`, `DTSTAMP:${now}`, `DTSTART;VALUE=DATE:${ymd(ev.it.start)}`, `DTEND;VALUE=DATE:${ymd(ev.it.end + DAYMS)}`,
      `SUMMARY:${icsEsc(ev.title)}`, `DESCRIPTION:${icsEsc(ev.desc)}`, `LOCATION:${icsEsc(ev.loc)}`, 'STATUS:CONFIRMED', 'TRANSP:TRANSPARENT');
    if (org) { L.push(`ORGANIZER:mailto:${org}`); ev.it.ops.forEach(n => opEmails(n).forEach(e => L.push(`ATTENDEE;CN=${icsEsc(n)};ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${e}`))); }
    L.push('BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(ev.title)}`, 'END:VALARM', 'END:VEVENT');
  });
  L.push('END:VCALENDAR');
  const blob = new Blob([L.map(icsFold).join('\r\n') + '\r\n'], { type: 'text/calendar;charset=utf-8' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = fname.replace(/[\\/:*?"<>|\s]+/g, '_') + '.ics'; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function opMonthEvents(name) {
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), f = Date.UTC(y, m, 1), l = Date.UTC(y, m + 1, 0);
  return calItems().filter(i => i.ops.includes(name) && i.end >= f && i.start <= l).map(i => calEventOf(i.src, i.id));
}

// ── จัดการรายชื่อ Operator & อีเมล & การเชื่อมต่อ ────────────────────
function opNames() {
  return uniq([...(options.operator || []), ...(options.ppmOperator || []), ...records.flatMap(opsOf), ...(ppmRecords || []).flatMap(opsOf), ...Object.keys(opDir.emails || {})]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'th'));
}
function opRender() {
  const mm = `${MONTHS[calMonth.getMonth()+1]} ${calMonth.getFullYear()}`;
  $('op-org').value = opDir.organizer || ''; $('op-flow').value = opDir.flowUrl || ''; $('op-auto').checked = !!opDir.autoSend;
  $('op-list').innerHTML = `<table class="mini op-tbl"><thead><tr><th>Operator</th><th>อีเมล (หลายอีเมลคั่นด้วย , )</th><th>งาน ${esc(mm)}</th><th></th></tr></thead><tbody>` +
    opNames().map(n => { const c = opMonthEvents(n).length; return `<tr data-n="${esc(n)}"><td><b>${esc(n)}</b></td><td><input type="text" class="op-em" value="${esc((opDir.emails||{})[n] || '')}" placeholder="name@company.com"></td><td class="n">${c}</td><td><button class="btn-secondary" ${c ? '' : 'disabled'} onclick="opSendMonth(this)">📅 ส่งงานเดือนนี้ (.ics)</button></td></tr>`; }).join('') + '</tbody></table>';
}
function opOpen(focusName) { closeCalDetail(); opRender(); $('op-modal').classList.add('open'); if (focusName) { const r = [...document.querySelectorAll('#op-list tr[data-n]')].find(x => x.dataset.n === focusName); if (r) r.querySelector('input').focus(); } }
function closeOp() { $('op-modal').classList.remove('open'); }
function opSave(quiet) {
  const bad = [], emails = {};
  document.querySelectorAll('#op-list tr[data-n]').forEach(tr => { const r = parseEmails(tr.querySelector('input').value); if (r.bad.length) bad.push(`${tr.dataset.n}: ${r.bad.join(', ')}`); if (r.ok.length) emails[tr.dataset.n] = r.ok.join(', '); });
  const org = parseEmails($('op-org').value), flow = $('op-flow').value.trim();
  if (bad.length || org.bad.length) { alert('อีเมลรูปแบบไม่ถูกต้อง:\n' + [...bad, ...org.bad].join('\n')); return false; }
  if (flow && !/^https:\/\//i.test(flow)) { alert('Flow URL ต้องขึ้นต้นด้วย https://'); return false; }
  opDir = { emails, organizer: org.ok[0] || '', flowUrl: flow, autoSend: $('op-auto').checked && !!flow, sent: opDir.sent || {} }; opSaveDir();
  if (!quiet) { toast('บันทึกการตั้งค่า Operator แล้ว'); closeOp(); renderCalendar(); }
  return true;
}
function opAddPerson() {
  const n = $('op-new-name').value.trim(), e = parseEmails($('op-new-email').value);
  if (!n) { alert('กรุณาใส่ชื่อ Operator'); return; }
  if (e.bad.length) { alert('อีเมลไม่ถูกต้อง: ' + e.bad.join(', ')); return; }
  opSave(true); opsRegister([n]);
  if (e.ok.length) { opDir.emails[n] = e.ok.join(', '); opSaveDir(); }
  $('op-new-name').value = ''; $('op-new-email').value = ''; opRender();
}
function opSendMonth(btn) {
  const n = btn.closest('tr').dataset.n; if (!opSave(true)) return;
  if (!opEmails(n).length) { alert(`กรุณาใส่อีเมลของ ${n} ก่อน`); return; }
  const evs = opMonthEvents(n); if (!evs.length) return;
  calDownloadICS(evs, [n], `${n}_${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,'0')}`);
  toast(`สร้างไฟล์ .ics ${evs.length} งานของ ${n}`);
}
async function opTestFlow() {
  if (!opSave(true)) return; if (!opDir.flowUrl) { alert('กรุณาใส่ Flow URL ก่อน'); return; }
  const to = parseEmails($('op-org').value).ok.length ? parseEmails($('op-org').value).ok : uniq(Object.values(opDir.emails).flatMap(x => parseEmails(x).ok)).slice(0, 1);
  if (!to.length) { alert('ใส่อีเมลผู้ส่ง (Organizer) หรืออีเมล Operator อย่างน้อย 1 รายการเพื่อใช้ทดสอบ'); return; }
  const d = today(), now = Date.UTC(+d.slice(0,4), +d.slice(5,7)-1, +d.slice(8,10));
  const ev = { it: { ops: ['ทดสอบ'], project: 'ทดสอบระบบ', activity: 'ทดสอบส่งเข้า Calendar', label: 'TEST', start: now, end: now }, title: '[TEST] ทดสอบส่งเข้า Calendar จาก Greenergy O&M', desc: 'ข้อความทดสอบ — ลบนัดหมายนี้ได้', loc: '', uid: 'test-' + Date.now() };
  const keep = opDir.emails['ทดสอบ']; opDir.emails['ทดสอบ'] = to.join(', ');
  const ok = await flowSend(ev, true); if (keep === undefined) delete opDir.emails['ทดสอบ']; else opDir.emails['ทดสอบ'] = keep; delete (opDir.sent || {})[ev.uid]; opSaveDir();
  if (ok) alert('ส่งคำสั่งทดสอบแล้ว — ตรวจสอบ Calendar ของ ' + to.join(', ') + ' (หรือประวัติการรันใน Power Automate) ภายใน 1–2 นาที');
}
