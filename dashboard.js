'use strict';
// ═══ Executive Dashboard ═══════════════════════════════════════════
// นิยาม (ใช้เหมือนกันทั้งหน้า):
//  งานซ่อม/บำรุงรักษา (บันทึกงาน):  เข้ามา = Start อยู่ในช่วง • แก้ไขแล้ว = สถานะ “เสร็จแล้ว” และ Finish อยู่ในช่วง
//                                   ค้าง = ยังไม่เสร็จ ณ วันสิ้นสุดช่วง (รวมที่ค้างมาจากก่อนช่วงนี้)
//  PM & AN (Plan PM&AN):            แผน(เข้ามา) = Start อยู่ในช่วง • เสร็จ / เลื่อน ตามสถานะ • ค้าง = ยังไม่เสร็จ/ไม่เลื่อน ที่ถึงกำหนดแล้ว
let dashPeriod = 'year';
const dashCharts = {};
const DASH_PERIODS = [['7','7 วัน'],['30','30 วัน'],['90','90 วัน'],['month','เดือนนี้'],['year','ปีนี้'],['all','ทั้งหมด'],['custom','กำหนดเอง']];
const TH_MON = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const fmtD = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? `${+m[3]} ${TH_MON[+m[2]-1]} ${m[1]}` : '-'; };
const addDays = (iso, n) => dfmt(dparse(iso) + n * DAYMS);
const daysBetween = (a, b) => Math.round((dparse(b) - dparse(a)) / DAYMS);

function dashRange() {
  const t = today();
  let from = t, to = t;
  if (['7','30','90'].includes(dashPeriod)) from = addDays(t, -(+dashPeriod - 1));
  else if (dashPeriod === 'month') from = t.slice(0, 8) + '01';
  else if (dashPeriod === 'year') from = t.slice(0, 4) + '-01-01';
  else if (dashPeriod === 'all') {
    const ds = [...records.map(r => r.date), ...(ppmRecords||[]).map(r => r.start)].filter(Boolean).sort();
    from = ds[0] || t;
  } else { from = $('db-start').value || t.slice(0, 4) + '-01-01'; to = $('db-end').value || t; }
  if (from > to) [from, to] = [to, from];
  const len = daysBetween(from, to) + 1;
  const prev = dashPeriod === 'all' ? null : { from: addDays(from, -len), to: addDays(from, -1) };
  return { from, to, len, prev };
}
function dashSetPeriod(p, silent) {
  dashPeriod = p;
  if (p !== 'custom') { const r = dashRange(); $('db-start').value = r.from; $('db-end').value = r.to; }
  if (!silent) renderDashboard();
}

// ── ตัวชี้วัดงานซ่อม ───────────────────────────────────────────────
const wlPool = () => records.filter(r => r.ppmPid == null);
const wlDoneAt = r => r.status === 'เสร็จแล้ว' ? (r.finish || r.date) : null;
function wlMetrics(from, to) {
  const inR = x => x && x >= from && x <= to, pool = wlPool();
  const incoming = pool.filter(r => inR(r.date));
  const resolved = pool.filter(r => inR(wlDoneAt(r)));
  const backlog  = pool.filter(r => r.date <= to && !(r.status === 'เสร็จแล้ว' && (r.finish || r.date) <= to));
  return { incoming, resolved, backlog };
}
// ── ตัวชี้วัด PM & AN ──────────────────────────────────────────────
const ppmDone = r => ppmStatusOf(r) === 'เสร็จแล้ว' || (ppmStatusOf(r) !== 'เลื่อน' && r.progress >= 1);
const ppmPost = r => ppmStatusOf(r) === 'เลื่อน';
const ppmDue  = r => r.end || r.start;
function pmMetrics(list, from, to) {
  const planned = list.filter(r => r.start && r.start >= from && r.start <= to);
  const done = planned.filter(ppmDone), post = planned.filter(ppmPost);
  const open = list.filter(r => r.start && r.start <= to && !ppmDone(r) && !ppmPost(r));
  const overdue = open.filter(r => ppmDue(r) < today());
  return { planned, done, post, open, overdue, carry: open.filter(r => r.start < from) };
}

function dDelta(cur, prev, goodUp) {
  if (prev == null) return '';
  if (prev === 0) return `<span class="dl">ช่วงก่อนหน้า 0</span>`;
  const p = Math.round((cur - prev) / prev * 100);
  if (p === 0) return `<span class="dl">▬ เท่าช่วงก่อน (${prev})</span>`;
  const up = p > 0, cls = goodUp == null ? '' : (up === goodUp ? 'g' : 'b');
  return `<span class="dl ${cls}">${up ? '▲' : '▼'} ${Math.abs(p)}% จากช่วงก่อน (${prev})</span>`;
}
const rateCls = v => v == null ? 'gray' : v >= 80 ? 'moss' : v >= 50 ? 'amber' : 'danger';

function dashBuckets(from, to) {
  const len = daysBetween(from, to) + 1, out = [];
  if (len <= 14 || len <= 100) {
    const step = len <= 14 ? 1 : 7;
    for (let s = from; s <= to; s = addDays(s, step)) { const e = addDays(s, step - 1) > to ? to : addDays(s, step - 1); out.push({ s, e, label: step === 1 ? `${+s.slice(8)}/${+s.slice(5,7)}` : `${+s.slice(8)} ${TH_MON[+s.slice(5,7)-1]}` }); }
  } else {
    let y = +from.slice(0, 4), m = +from.slice(5, 7);
    while (true) {
      const ms = `${y}-${String(m).padStart(2,'0')}-01`, me = dfmt(Date.UTC(y, m, 0));
      if (ms > to) break;
      out.push({ s: ms < from ? from : ms, e: me > to ? to : me, label: TH_MON[m-1] + ' ' + String(y).slice(2) });
      m++; if (m > 12) { m = 1; y++; }
    }
  }
  return out;
}
function dashChart(id, cfg) {
  if (dashCharts[id]) dashCharts[id].destroy();
  const el = $(id); if (!el || typeof Chart === 'undefined') return;
  dashCharts[id] = new Chart(el.getContext('2d'), cfg);
}

function goWorklogBacklog() {
  [fStat, fSla].forEach(a => { a.length = 0; });
  fStat.push('กำลังดำเนินการ', 'รอดำเนินการ'); fFrom = ''; fTo = '';
  $('wl-from').value = ''; $('wl-to').value = '';
  switchTab('worklog'); msInitAll(); renderWorkLog();
}

function goWorklogFilter(opts) {          // ไปหน้าบันทึกงานพร้อมตัวกรองตามช่วงเวลาของ Dashboard
  const R = dashRange();
  [fType, fStat, fPrio, fOwner, fProject, fSla].forEach(a => { a.length = 0; });
  srch = opts.search || ''; $('srch').value = srch;
  if (opts.type) fType.push(opts.type);
  fFrom = opts.noRange ? '' : R.from; fTo = opts.noRange ? '' : R.to;
  $('wl-from').value = fFrom; $('wl-to').value = fTo;
  switchTab('worklog'); msInitAll(); renderWorkLog();
}
const hbar = (v, mx, cls) => `<div class="hb"><i class="${cls || ''}" style="width:${mx ? Math.max(v ? 4 : 0, v / mx * 100) : 0}%"></i></div>`;
const avgDays = list => { const a = list.filter(r => r.finish && r.date).map(r => daysBetween(r.date, r.finish)); return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null; };

function renderExec() {
  const root = $('exec-root'); if (!root) return;
  $('exec-periods').innerHTML = DASH_PERIODS.map(([k, l]) => `<button class="pbtn${dashPeriod === k ? ' on' : ''}" onclick="dashSetPeriod('${k}')">${l}</button>`).join('');
  const R = dashRange(), t0 = today();
  const cur = wlMetrics(R.from, R.to), prv = R.prev ? wlMetrics(R.prev.from, R.prev.to) : null;
  const inc = cur.incoming.length, res = cur.resolved.length, bl = cur.backlog.length;
  const rate = inc ? Math.round(res / inc * 100) : null;
  const blCarry = cur.backlog.filter(r => r.date < R.from).length;
  const blIn = cur.backlog.filter(r => r.status === 'กำลังดำเนินการ').length, blPend = cur.backlog.filter(r => r.status === 'รอดำเนินการ').length;
  const blSla = cur.backlog.filter(r => slaEffective(r) === SLA_BREACH).length;
  const blOld = cur.backlog.filter(r => daysBetween(r.date, R.to) > 30).length;
  const slaMet = cur.resolved.filter(r => slaEffective(r) === SLA_MET).length, slaBr = cur.resolved.filter(r => slaEffective(r) === SLA_BREACH).length;
  const sla = slaMet + slaBr ? Math.round(slaMet / (slaMet + slaBr) * 100) : null;

  const pmList = (ppmRecords || []).filter(r => r.type !== 'AN'), anList = (ppmRecords || []).filter(r => r.type === 'AN');
  const PM = pmMetrics(pmList, R.from, R.to), AN = pmMetrics(anList, R.from, R.to);
  const ALL = pmMetrics(ppmRecords || [], R.from, R.to);
  const next30 = g => g.filter(r => r.start > t0 && r.start <= addDays(t0, 30) && !ppmDone(r) && !ppmPost(r)).length;

  const big = (cls, ico, lbl, val, sub, extra, onclick) => `<div class="ecard ${cls}"${onclick ? ` onclick="${onclick}" style="cursor:pointer" title="คลิกเพื่อดูรายการ"` : ''}><div class="ec-l">${ico} ${lbl}</div><div class="ec-v">${val}</div><div class="ec-s">${sub}</div>${extra ? `<div class="ec-x">${extra}</div>` : ''}</div>`;
  const pmCard = (title, ico, m, cls) => {
    const base = m.planned.length, pr = base ? Math.round(m.done.length / base * 100) : null;
    return `<div class="pmcard ${cls}"><div class="pm-h">${ico} ${title} <span class="pm-r ${rateCls(pr)}">${pr == null ? '–' : pr + '%'} เสร็จตามแผน</span></div>
      <div class="pm-grid"><div><b>${base}</b><span>📥 แผน / เข้ามา</span></div><div class="g"><b>${m.done.length}</b><span>✅ ดำเนินการแล้ว</span></div><div class="o"><b>${m.post.length}</b><span>🔁 เลื่อน</span></div><div class="r"><b>${m.open.length}</b><span>⏳ ค้างสะสม</span></div></div>
      <div class="pm-bar"><i class="g" style="width:${base ? m.done.length / base * 100 : 0}%"></i><i class="o" style="width:${base ? m.post.length / base * 100 : 0}%"></i></div>
      <div class="pm-f">⚠️ เลยกำหนด <b>${m.overdue.length}</b> งาน • ค้างมาจากก่อนช่วงนี้ <b>${m.carry.length}</b> งาน</div></div>`;
  };

  // รายการที่ต้องติดตาม
  const prioW = { High: 0, Medium: 1, Low: 2 };
  const topWl = [...cur.backlog].sort((a, b) => (prioW[a.priority] ?? 1) - (prioW[b.priority] ?? 1) || a.date.localeCompare(b.date)).slice(0, 6);
  const topPm = [...ALL.overdue].sort((a, b) => ppmDue(a).localeCompare(ppmDue(b))).slice(0, 6);
  const omExp = [], omSoon = [];
  (pjRecords || []).forEach(p => { const d = pjDate(p.stopOM); if (!d) return; const left = Math.round((d - new Date(t0 + 'T00:00:00')) / DAYMS); if (left < 0) omExp.push(p); else if (left <= 90) omSoon.push(p); });

  // ── แยกตาม Type of work ───────────────────────────────────────────
  const typeNames = uniq([...typesList(), ...[...cur.incoming, ...cur.resolved, ...cur.backlog].map(r => r.typeOfWork || 'ไม่ระบุ')]);
  const tRows = typeNames.map(tn => {
    const f = r => (r.typeOfWork || 'ไม่ระบุ') === tn;
    const a = cur.incoming.filter(f), b = cur.resolved.filter(f), c = cur.backlog.filter(f);
    return { tn, inc: a.length, res: b.length, bl: c.length, rate: a.length ? Math.round(b.length / a.length * 100) : null, prev: prv ? prv.incoming.filter(f).length : null };
  }).filter(x => x.inc + x.res + x.bl > 0).sort((x, y) => y.inc - x.inc || y.bl - x.bl);
  const tMax = Math.max(1, ...tRows.map(x => x.inc));
  const typePanel = `<div class="elist"><div class="el-h">🔧 แยกตาม Type of work <span class="hint">(คลิกแถวเพื่อดูงาน)</span></div>
    <table class="mini"><thead><tr><th>ประเภทงาน</th><th>เข้ามา</th><th>แก้ไขแล้ว</th><th>ค้าง</th><th>ปิดงาน</th></tr></thead><tbody>
    ${tRows.length ? tRows.map(x => `<tr onclick="goWorklogFilter({type:${esc(JSON.stringify(x.tn)).replace(/"/g,'&quot;')}})"><td><span class="dot" style="background:${typeColor(x.tn)}"></span>${esc(x.tn)}${hbar(x.inc, tMax, 'tb')}</td><td class="n">${x.inc}${x.prev != null ? `<small>${x.inc > x.prev ? '▲' : x.inc < x.prev ? '▼' : '▬'}</small>` : ''}</td><td class="n g">${x.res}</td><td class="n r">${x.bl}</td><td class="n">${x.rate == null ? '–' : x.rate + '%'}</td></tr>`).join('') : '<tr><td colspan="5" class="el-n">ไม่มีงานในช่วงนี้</td></tr>'}
    </tbody></table></div>`;
  // ── Job Description ที่เกิดบ่อยสุด ───────────────────────────────
  const jdMap = {};
  const jdAdd = (list, key) => list.forEach(r => (r.jobDescriptions && r.jobDescriptions.length ? r.jobDescriptions : []).forEach(j => { const k = (j || '').trim(); if (!k) return; (jdMap[k] = jdMap[k] || { inc: [], res: [], bl: [] })[key].push(r); }));
  jdAdd(cur.incoming, 'inc'); jdAdd(cur.resolved, 'res'); jdAdd(cur.backlog, 'bl');
  const prevJd = {}; if (prv) prv.incoming.forEach(r => (r.jobDescriptions || []).forEach(j => { const k = (j || '').trim(); if (k) prevJd[k] = (prevJd[k] || 0) + 1; }));
  const jdRows = Object.entries(jdMap).map(([k, v]) => ({ k, inc: v.inc.length, res: v.res.length, bl: v.bl.length, avg: avgDays(v.res),
      proj: (() => { const c = {}; v.inc.forEach(r => { if (r.project) c[r.project] = (c[r.project] || 0) + 1; }); const e = Object.entries(c).sort((a, b) => b[1] - a[1])[0]; return e ? `${e[0]} (${e[1]})` : ''; })() }))
    .sort((a, b) => b.inc - a.inc || b.bl - a.bl || a.k.localeCompare(b.k)).slice(0, 10);
  const noJd = cur.incoming.filter(r => !(r.jobDescriptions || []).some(j => (j || '').trim())).length;
  const jMax = Math.max(1, ...jdRows.map(x => x.inc));
  const jdPanel = `<div class="elist"><div class="el-h">🔩 Job Description — แก้ไขบ่อยสุด <span class="hint">(Top 10 ตามจำนวนครั้งที่เกิดในช่วงนี้)</span></div>
    ${jdRows.length && jdRows[0].inc ? `<div class="top1">🏆 บ่อยสุด: <b>${esc(jdRows[0].k)}</b> — ${jdRows[0].inc} ครั้ง${jdRows[0].proj ? ` • พบมากที่ ${esc(jdRows[0].proj)}` : ''}</div>` : ''}
    <table class="mini"><thead><tr><th>#</th><th>Job Description</th><th>ครั้ง</th><th>แก้ไขแล้ว</th><th>ค้าง</th><th title="เวลาเฉลี่ยจาก Start ถึง Finish ของงานที่ปิด">เฉลี่ย (วัน)</th></tr></thead><tbody>
    ${jdRows.length ? jdRows.map((x, i) => `<tr onclick="goWorklogFilter({search:${esc(JSON.stringify(x.k)).replace(/"/g,'&quot;')}})"><td class="n">${i + 1}</td><td>${esc(x.k)}${hbar(x.inc, jMax, 'jb')}</td><td class="n"><b>${x.inc}</b>${prv ? `<small>${x.inc > (prevJd[x.k] || 0) ? '▲' : x.inc < (prevJd[x.k] || 0) ? '▼' : '▬'}</small>` : ''}</td><td class="n g">${x.res}</td><td class="n r">${x.bl}</td><td class="n">${x.avg == null ? '–' : x.avg}</td></tr>`).join('') : '<tr><td colspan="6" class="el-n">ยังไม่มี Job Description ในช่วงนี้</td></tr>'}
    </tbody></table>${noJd ? `<div class="el-note">มี ${noJd} งานที่ไม่ได้ระบุ Job Description</div>` : ''}</div>`;

  const sumLines = [
    `🔧 <b>งานซ่อม/บำรุงรักษา</b> — เข้ามา <b>${inc}</b> งาน • แก้ไขแล้ว <b>${res}</b> งาน${rate != null ? ` (${rate}%)` : ''} • ค้างอยู่ <b>${bl}</b> งาน${blSla ? ` (เกิน SLA ${blSla})` : ''}`,
    `📅 <b>PM</b> — แผน <b>${PM.planned.length}</b> • เสร็จ <b>${PM.done.length}</b> • เลื่อน <b>${PM.post.length}</b> • ค้าง <b>${PM.open.length}</b> &nbsp;|&nbsp; <b>AN</b> — แผน <b>${AN.planned.length}</b> • เสร็จ <b>${AN.done.length}</b> • เลื่อน <b>${AN.post.length}</b> • ค้าง <b>${AN.open.length}</b>`,
  ];
  root.innerHTML = `
    <div class="exec-sum"><div class="es-h">📌 สรุปสำหรับผู้บริหาร <span>${fmtD(R.from)} – ${fmtD(R.to)} (${R.len} วัน)${R.prev ? ` • เทียบกับ ${fmtD(R.prev.from)} – ${fmtD(R.prev.to)}` : ''}</span></div>${sumLines.map(l => `<div class="es-l">${l}</div>`).join('')}</div>

    <div class="sec-h">🔧 งานซ่อม / บำรุงรักษา (Work Log) <span>เข้ามากี่งาน • แก้ไขไปกี่งาน • ค้างอีกกี่งาน</span></div>
    <div class="egrid5">
      ${big('blue', '📥', 'งานเข้ามา', inc, 'งานใหม่ที่เริ่มในช่วงนี้', dDelta(inc, prv && prv.incoming.length, null))}
      ${big('moss', '✅', 'แก้ไขแล้ว', res, 'ปิดงานได้ในช่วงนี้', dDelta(res, prv && prv.resolved.length, true))}
      ${big('danger', '⏳', 'ค้างอยู่', bl, `⚙️ กำลังทำ ${blIn} • ⏳ รอ ${blPend}`, `${dDelta(bl, prv && prv.backlog.length, false)}<div class="ec-note">⚠️ เกิน SLA ${blSla} • ค้าง &gt;30 วัน ${blOld} • ค้างสะสมก่อนช่วงนี้ ${blCarry}</div>`, 'goWorklogBacklog()')}
      ${big(rateCls(rate), '🎯', 'อัตราปิดงาน', rate == null ? '–' : rate + '%', 'แก้ไขแล้ว ÷ เข้ามา', '')}
      ${big(rateCls(sla), '⏱️', 'SLA ทันกำหนด', sla == null ? '–' : sla + '%', `ทัน ${slaMet} • เกิน ${slaBr} (งานที่ปิดในช่วงนี้)`, '')}
    </div>
    <div class="chart-card"><h3>📈 แนวโน้ม: งานเข้า • แก้ไขแล้ว • ค้างสะสม</h3><div style="height:270px"><canvas id="exFlow"></canvas></div></div>
    <div class="egrid2">${typePanel}${jdPanel}</div>

    <div class="sec-h">🛠️ PM &amp; AN (Plan PM&amp;AN) <span>แผนในช่วงนี้ • ดำเนินการแล้ว • เลื่อน • ค้าง &nbsp;|&nbsp; 📅 ถึงกำหนดใน 30 วันข้างหน้า: PM ${next30(pmList)} • AN ${next30(anList)}</span></div>
    <div class="egrid3">${pmCard('PM (QPM/PPM)', '🔧', PM, 'pm')}${pmCard('AN', '🔬', AN, 'an')}${pmCard('รวม PM + AN', '📋', ALL, 'all')}</div>
    <div class="chart-card"><h3>📊 สถานะงาน PM &amp; AN ตามกำหนดแผนของแต่ละช่วง <span class="hint">(เสร็จ • ค้าง • เลื่อน)</span></h3><div style="height:270px"><canvas id="exPm"></canvas></div></div>

    <div class="sec-h">🚨 รายการที่ผู้บริหารควรติดตาม</div>
    <div class="egrid3">
      <div class="elist"><div class="el-h">🔧 งานซ่อมค้างสำคัญ <a onclick="goWorklogBacklog()">ดูทั้งหมด (${bl}) ›</a></div>${topWl.length ? topWl.map(r => `<div class="el-i" onclick="openEdit(${r.id})"><b>${esc(r.project || '-')}</b><span>${esc(r.typeOfWork || '')} • ค้าง ${daysBetween(r.date, R.to)} วัน</span><em class="pr-${esc(r.priority)}">${esc(r.priority)}</em></div>`).join('') : '<div class="el-n">ไม่มีงานซ่อมค้าง ✓</div>'}</div>
      <div class="elist"><div class="el-h">🛠️ PM/AN เลยกำหนด <a onclick="switchTab('planpm')">ไปหน้า Plan ›</a></div>${topPm.length ? topPm.map(r => `<div class="el-i" onclick="openEditPpm(${r.pid})"><b>${esc(r.plant)}</b><span>${esc(r.type)} • ${esc(r.activity || '')} • กำหนด ${esc(fmtD(ppmDue(r)))}</span><em>${esc(r.team || '')}</em></div>`).join('') : '<div class="el-n">ไม่มีงานเลยกำหนด ✓</div>'}</div>
      <div class="elist"><div class="el-h">📑 สัญญา O&amp;M <a onclick="switchTab('projects')">Alert Center ›</a></div>
        <div class="el-big"><div class="${omExp.length ? 'bad' : ''}"><b>${omExp.length}</b><span>หมดอายุแล้ว</span></div><div class="${omSoon.length ? 'warn' : ''}"><b>${omSoon.length}</b><span>หมดภายใน 90 วัน</span></div></div>
        ${[...omExp, ...omSoon].slice(0, 4).map(p => `<div class="el-i" onclick="switchTab('projects');alertGo(this.dataset.n)" data-n="${esc(p.name)}"><b>${esc(p.name)}</b><span>OM สิ้นสุด ${esc(p.stopOM)}</span></div>`).join('')}</div>
    </div>`;

  // charts
  const B = dashBuckets(R.from, R.to), pool = wlPool();
  const cnt = (arr, f, b) => arr.filter(r => { const x = f(r); return x && x >= b.s && x <= b.e; }).length;
  dashChart('exFlow', { type: 'bar', data: { labels: B.map(b => b.label), datasets: [
    { label: 'งานเข้า', data: B.map(b => cnt(pool, r => r.date, b)), backgroundColor: '#2E6DB4', borderRadius: 3, order: 2 },
    { label: 'แก้ไขแล้ว', data: B.map(b => cnt(pool, wlDoneAt, b)), backgroundColor: '#35654E', borderRadius: 3, order: 2 },
    { label: 'ค้างสะสม', type: 'line', data: B.map(b => pool.filter(r => r.date <= b.e && !(r.status === 'เสร็จแล้ว' && (r.finish || r.date) <= b.e)).length), borderColor: '#D9542C', backgroundColor: '#D9542C', tension: .25, pointRadius: 3, order: 1 } ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f0ede8' } }, x: { grid: { display: false } } } } });
  const all = ppmRecords || [];
  const inB = (r, b) => r.start && r.start >= b.s && r.start <= b.e;
  dashChart('exPm', { type: 'bar', data: { labels: B.map(b => b.label), datasets: [
    { label: 'เสร็จ', data: B.map(b => all.filter(r => inB(r, b) && ppmDone(r)).length), backgroundColor: '#35654E', stack: 's' },
    { label: 'ค้าง', data: B.map(b => all.filter(r => inB(r, b) && !ppmDone(r) && !ppmPost(r)).length), backgroundColor: '#C0504D', stack: 's' },
    { label: 'เลื่อน', data: B.map(b => all.filter(r => inB(r, b) && ppmPost(r)).length), backgroundColor: '#F0A030', stack: 's' } ] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } }, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f0ede8' } } } } });
}
