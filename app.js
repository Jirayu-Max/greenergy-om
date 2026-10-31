'use strict';
// ── Storage keys ──────────────────────────────────────────────
const KEY     = 'greenergy_maint_v3';
const OPT_KEY = 'greenergy_maint_opts_v3';

// ── Default work types (full names) ───────────────────────────
const DEFAULT_TYPES = ['Preventive Maintenance','Corrective Maintenance','Emergency Maintenance','Inspection','Testing'];

// ── Sample data ───────────────────────────────────────────────
// Fields: date(=Start), finish, plan, project, owner, typeOfWork,
//         jobDescriptions[], detail, operator, priority, status
const SAMPLE = [
  {id:1,  date:'2026-01-15',finish:'2026-01-15',plan:'2026-01-08',project:'Plant A',     owner:'Phoowadol J.', typeOfWork:'Preventive Maintenance', detail:'ตรวจเช็คระบบน้ำมันและกรองอากาศ',  operator:'สมชาย ใจดี',         priority:'Medium',status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยนไส้กรองอากาศ','ตรวจระดับน้ำมันเครื่อง']},
  {id:2,  date:'2026-02-10',finish:'2026-02-10',plan:'2026-02-03',project:'Plant A',     owner:'Phoowadol J.', typeOfWork:'Preventive Maintenance', detail:'ทำความสะอาดใบพัดและตรวจน้ำ',      operator:'วิชัย มั่นคง',        priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยน nozzle 2 ตัว','ล้างใบพัด']},
  {id:3,  date:'2026-03-05',finish:'2026-03-06',plan:'2026-02-26',           project:'Plant B',     owner:'Jirayu C.',    typeOfWork:'Corrective Maintenance', detail:'ซ่อมแซมรอยรั่วสายลม',            operator:'ประสิทธิ์ แกล้วกล้า', priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยน O-ring','ทดสอบแรงดัน']},
  {id:4,  date:'2026-03-20',finish:'2026-03-20',plan:'2026-03-13',project:'Plant B',     owner:'Jirayu C.',    typeOfWork:'Preventive Maintenance', detail:'ตรวจสอบแบริ่งและ seal',          operator:'สมชาย ใจดี',         priority:'Low',   status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:[]},
  {id:5,  date:'2026-04-08',finish:'2026-04-08',plan:'2026-04-01',project:'Substation',  owner:'Anucha K.',    typeOfWork:'Inspection',             detail:'ตรวจวัดกระแสและแรงดันไฟฟ้า',     operator:'อนุชา เก่งกาจ',       priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['ผลปกติ']},
  {id:6,  date:'2026-04-22',finish:'2026-04-22',plan:'2026-04-15',           project:'Control Room',owner:'Anucha K.',    typeOfWork:'Preventive Maintenance', detail:'เปลี่ยนไส้กรองและตรวจน้ำยา',       operator:'วิชัย มั่นคง',        priority:'Medium',status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:[]},
  {id:7,  date:'2026-05-14',finish:'2026-05-14',plan:'2026-05-07',           project:'Plant A',     owner:'Jirayu C.',    typeOfWork:'Corrective Maintenance', detail:'แก้ไขปัญหา over-temperature',     operator:'ประสิทธิ์ แกล้วกล้า', priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยน thermostat']},
  {id:8,  date:'2026-05-28',finish:'2026-05-28',plan:'2026-05-21',project:'Solar Farm',  owner:'Anucha K.',    typeOfWork:'Testing',                detail:'ตรวจสอบ parameter และ firmware',   operator:'อนุชา เก่งกาจ',       priority:'Medium',status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:[]},
  {id:9,  date:'2026-06-03',finish:'2026-06-03',plan:'2026-05-27',project:'Solar Farm',  owner:'Jirayu C.',    typeOfWork:'Inspection',             detail:'ตรวจวัด SOC และ cell voltage',     operator:'สมชาย ใจดี',         priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:[]},
  {id:10, date:'2026-06-10',finish:'2026-06-10',plan:'2026-06-03',           project:'Plant B',     owner:'Jirayu C.',    typeOfWork:'Preventive Maintenance', detail:'เปลี่ยนน้ำมันและไส้กรอง',         operator:'วิชัย มั่นคง',        priority:'Medium',status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยนน้ำมัน','เปลี่ยนไส้กรอง']},
  {id:11, date:'2026-06-19',finish:'',          plan:'2026-06-12',project:'Utility',     owner:'Jirayu C.',    typeOfWork:'Corrective Maintenance', detail:'ซ่อมปั๊มสูบน้ำ #2',               operator:'ประสิทธิ์ แกล้วกล้า', priority:'High',  status:'กำลังดำเนินการ',report:'อยู่ระหว่างจัดทำ', jobDescriptions:['รอชิ้นส่วน']},
  {id:12, date:'2026-06-24',finish:'2026-06-24',plan:'2026-06-17',project:'Substation',  owner:'Anucha K.',    typeOfWork:'Testing',                detail:'ตรวจวัดค่า insulation resistance', operator:'อนุชา เก่งกาจ',       priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:[]},
  {id:13, date:'2026-06-26',finish:'2026-06-26',plan:'2026-06-19',           project:'Plant A',     owner:'Jirayu C.',    typeOfWork:'Emergency Maintenance',  detail:'แก้ไขพัดลมหยุดทำงาน',             operator:'สมชาย ใจดี',         priority:'High',  status:'เสร็จแล้ว',report:'นำส่งแล้ว',      jobDescriptions:['เปลี่ยน motor']},
  {id:14, date:'2026-06-26',finish:'',          plan:'2026-06-19',project:'Plant B',     owner:'Jirayu C.',    typeOfWork:'Preventive Maintenance', detail:'ตรวจสอบตามแผน preventive',        operator:'วิชัย มั่นคง',        priority:'Low',   status:'รอดำเนินการ',report:'ยังไม่จัดทำ',    jobDescriptions:[]},
];

const MONTHS = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
                'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

// Report# = สถานะการจัดทำรายงาน (ภาษาทางการ)
const REPORT_STATES = ['ยังไม่จัดทำ','อยู่ระหว่างจัดทำ','นำส่งแล้ว'];

// ── State ─────────────────────────────────────────────────────
let records = [];
let options = { typeOfWork:[], project:[], owner:[], operator:[] };
let nextId  = 1;
let editId  = null;
let curTab  = 'dashboard';
let srch    = '', fFrom = '', fTo = '';
const fType = [], fStat = [], fPrio = [], fOwner = [], fProject = [], fSla = [];   // multi-select
let pSrch   = '', pRegion = '', pType = '', pStatus = '', pOmexp = '', pOwner = '';
let pjRecords = [], nextPid = 1, editPid = null;
const PKEY = 'greenergy_projects_v1';
let wpTitle = '', wpSubtitle = '', wpStart = '', wpEnd = '', wpRows = [];
let wpColW = [110,360,150,230,150], wpRowH = 72, wpOps = [];
const WPKEY = 'greenergy_workplan_v1';
let hdRecords = [];
const HDKEY = 'greenergy_holidays_v1';
let dbStart = '', dbEnd = '';
let chartGran = 'month';
let barChart = null, typeChart = null, statChart = null, ownerChart = null;

// ── Storage ───────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { records = JSON.parse(raw).map(migrate); }
    else { records = JSON.parse(JSON.stringify(SAMPLE)).map(migrate); save(); }
  } catch(e) { records = JSON.parse(JSON.stringify(SAMPLE)).map(migrate); }
  nextId = Math.max(0, ...records.map(r => r.id)) + 1;
}
function migrate(r) {
  if (!Array.isArray(r.jobDescriptions)) r.jobDescriptions = r.remarks ? [r.remarks] : [];
  if (!Array.isArray(r.details)) r.details = r.detail ? [r.detail] : (r.description ? [r.description] : []);
  if (r.detail     == null) r.detail     = r.description || '';
  if (r.project    == null) r.project    = r.location   || '';
  if (r.operator   == null) r.operator   = r.technician || '';
  if (!Array.isArray(r.operators)) r.operators = opsOf(r);
  if (r.typeOfWork == null) r.typeOfWork = r.workType   || '';
  if (r.owner      == null) r.owner      = '';
  if (r.finish     == null) r.finish     = '';
  if (r.plan       == null) r.plan       = '';
  if (r.report     == null) r.report     = 'ยังไม่จัดทำ';
  if (r.slaHours   == null) r.slaHours   = '';   // SLA เป้าหมาย (ชม.)
  if (r.slaActual  == null) r.slaActual  = '';   // SLA ใช้จริง (ชม.) ว่าง = คำนวณ
  if (r.slaDue     == null) r.slaDue     = '';   // SLA (ข้อมูลเก่าไม่มี → ว่าง)
  if (r.slaStatus  == null) r.slaStatus  = '';   // '' = คำนวณอัตโนมัติ
  return r;
}
function save() { localStorage.setItem(KEY, JSON.stringify(records)); }

function loadOpts() {
  try {
    const raw = localStorage.getItem(OPT_KEY);
    if (raw) { options = JSON.parse(raw); }
    else throw 0;
  } catch(e) {
    options = {
      typeOfWork: DEFAULT_TYPES.slice(),
      project:    uniq(records.map(r=>r.project)),
      owner:      uniq(records.map(r=>r.owner)),
      operator:   uniq(records.flatMap(opsOf)),
      jobDescriptions: uniq(records.flatMap(r=>r.jobDescriptions||[])),
    };
    saveOpts();
  }
  // ensure every type in data is present in options
  records.forEach(r => { if (r.typeOfWork && !options.typeOfWork.includes(r.typeOfWork)) options.typeOfWork.push(r.typeOfWork); });
  // ensure jobDescriptions option list exists (backward-compat)
  if (!Array.isArray(options.jobDescriptions)) options.jobDescriptions = uniq(records.flatMap(r=>r.jobDescriptions||[]));
  if (!Array.isArray(options.priority)) options.priority = ['High','Medium','Low'];
  if (!Array.isArray(options.status))   options.status   = ['เสร็จแล้ว','กำลังดำเนินการ','รอดำเนินการ'];
  if (!Array.isArray(options.report))   options.report   = ['ยังไม่จัดทำ','อยู่ระหว่างจัดทำ','นำส่งแล้ว'];
  saveOpts();
}
function saveOpts() { localStorage.setItem(OPT_KEY, JSON.stringify(options)); }

// ── Work Order: เลขที่ใบสั่งงาน WO-YYMM-### (นับต่อเนื่องรายเดือน ใช้ร่วมกันทั้งบันทึกงานและ Plan PM&AN) ──
function woNext(dateStr, extra) {
  const d = /^\d{4}-\d{2}/.test(dateStr || '') ? dateStr : today(), pre = `WO-${d.slice(2,4)}${d.slice(5,7)}-`;
  const used = [...records, ...(ppmRecords || []), ...(extra || [])].map(r => String(r.workOrder || '')).filter(w => w.startsWith(pre)).map(w => parseInt(w.slice(pre.length), 10) || 0);
  return pre + String(Math.max(0, ...used) + 1).padStart(3, '0');
}
// เติมเลข WO ให้งานเดิมที่ยังไม่มี: Plan PM&AN ก่อน (เรียงตาม Start) แล้วบันทึกงาน — งานที่ดึงมาจาก PM&AN ใช้เลขเดียวกับต้นทาง
function woBackfill() {
  const pp = (ppmRecords || []).filter(p => !p.workOrder), rs = records.filter(r => !r.workOrder);
  if (!pp.length && !rs.length) { alert('ทุกงานมีเลข Work Order ครบแล้ว'); return; }
  if (!confirm(`สร้างเลข Work Order ให้งานเดิมที่ยังไม่มีเลข\n\n• Plan PM&AN: ${pp.length} งาน\n• บันทึกงาน: ${rs.length} งาน\n\nเรียงตามวันเริ่มงาน รูปแบบ WO-ปปดด-### (งานที่มีเลขอยู่แล้วไม่เปลี่ยน)`)) return;
  const order = (da, ia, db, ib) => String(da || '9999').localeCompare(String(db || '9999')) || (+ia || 0) - (+ib || 0);
  pp.sort((a, b) => order(a.start, a.pid, b.start, b.pid)).forEach(p => { p.workOrder = woNext(p.start); });
  const byPid = new Map((ppmRecords || []).map(p => [p.pid, p]));
  rs.sort((a, b) => order(a.date, a.id, b.date, b.id)).forEach(r => { const p = r.ppmPid != null && byPid.get(r.ppmPid); r.workOrder = p && p.workOrder ? p.workOrder : woNext(r.date); });
  if (pp.length) ppmSaveStore();
  if (rs.length) save();
  renderCur();
  toast(`สร้างเลข Work Order แล้ว ${pp.length + rs.length} งาน`);
}
const woCell = w => w ? `<span class="wo-chip">${esc(w)}</span>` : '<span style="color:#ccc">-</span>';
function uniq(arr) { return [...new Set(arr.filter(x=>x && String(x).trim()))]; }
function typesList() {
  const set = [...options.typeOfWork];
  records.forEach(r => { if (r.typeOfWork && !set.includes(r.typeOfWork)) set.push(r.typeOfWork); });
  return set;
}

// ── Utility ───────────────────────────────────────────────────
function weekNum(dateStr) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}
function mOf(r) { return new Date(r.date).getMonth()+1; }
function yOf(r) { return new Date(r.date).getFullYear(); }
function wOf(r) { return weekNum(r.date); }
// Operator หลายคนต่องาน: operators[] เป็นข้อมูลหลัก, operator (ข้อความคั่นด้วย ,) เก็บไว้เพื่อความเข้ากันได้กับข้อมูล/ไฟล์เดิม
function opsOf(r) { return Array.isArray(r.operators) && r.operators.length ? r.operators.filter(Boolean) : (r.operator ? String(r.operator).split(/\s*,\s*/).filter(Boolean) : []); }
function opsBr(r) { return opsOf(r).map(esc).join('<br>'); }
function pct(a,b) { return b ? Math.round(a/b*100) : 0; }

// ── SLA ───────────────────────────────────────────────────────
// slaStatus ว่าง = อัตโนมัติ: คำนวณจาก SLA Due Date เทียบกับ Finish (หรือวันนี้ถ้ายังไม่เสร็จ)
const SLA_NONE = 'ไม่กำหนด SLA', SLA_RUN = 'อยู่ในกำหนด', SLA_MET = 'ทันกำหนด', SLA_BREACH = 'เกิน SLA';
const SLA_MANUAL = [SLA_NONE, SLA_RUN, SLA_MET, SLA_BREACH];
function hasNum(v) { return v !== '' && v != null && !isNaN(+v); }
// ชม.ที่ใช้จริง: กรอกเอง หรือคำนวณจาก Start→Finish (ข้อมูลวันที่ละเอียดระดับวัน → วัน×24)
function slaActualH(r) {
  if (hasNum(r.slaActual)) return +r.slaActual;
  if (r.finish && r.date) return Math.max(0, Math.round((Date.parse(r.finish) - Date.parse(r.date)) / 36e5));
  return null;
}
function slaEffective(r) {
  if (hasNum(r.slaHours)) {                       // โหมดใหม่: ชั่วโมง
    const a = slaActualH(r);
    if (a != null) return a <= +r.slaHours ? SLA_MET : SLA_BREACH;
    const el = Math.round((Date.parse(today()) - Date.parse(r.date)) / 36e5);
    return el > +r.slaHours ? SLA_BREACH : SLA_RUN;
  }
  if (r.slaStatus) return r.slaStatus;            // ข้อมูลเก่า (วันที่/สถานะ)
  if (!r.slaDue)   return SLA_NONE;
  if (r.finish)    return r.finish <= r.slaDue ? SLA_MET : SLA_BREACH;
  return today() > r.slaDue ? SLA_BREACH : SLA_RUN;
}
function today() { return new Date().toISOString().slice(0,10); }

function daysPassed(r) {
  if (!r.date) return '-';
  const start = new Date(r.date);
  const end   = r.finish ? new Date(r.finish) : new Date(today());
  const d = Math.round((end - start) / 86400000);
  return (d >= 0 ? d : 0) + ' วัน';
}
// Bucket key/label for the Type-of-work graph (adapts to granularity)
function chartKey(r, gran) {
  if (!r.date) return '';
  if (gran==='day')  return r.date;
  if (gran==='week') return r.date.slice(0,4) + '-W' + String(weekNum(r.date)).padStart(2,'0');
  if (gran==='year') return r.date.slice(0,4);
  return r.date.slice(0,7); // month YYYY-MM
}
function chartLabel(key, gran) {
  if (!key) return '-';
  if (gran==='day')  return key.slice(5);              // MM-DD
  if (gran==='week') return 'W' + key.split('-W')[1] + ' (' + key.slice(0,4) + ')';
  if (gran==='year') return key;
  const [y,m] = key.split('-'); return (MONTHS[+m]||m) + ' ' + y.slice(2);
}

// ── Colors ────────────────────────────────────────────────────
const C = { primary:'#35654E', secondary:'#789474', accent:'#A9947A', danger:'#C00000', gray:'#BCBEC0' };
const TYPE_COLORS = ['#35654E','#A9947A','#789474','#C00000','#5B8C5A','#8E6C88','#C9A227','#5A7D9A'];
// Inline plugin: draw the value on each bar (works for vertical & horizontal bars)
const valueLabelPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const ctx = chart.ctx, horiz = chart.options.indexAxis === 'y';
    chart.data.datasets.forEach((ds, di) => {
      const meta = chart.getDatasetMeta(di); if (meta.hidden) return;
      meta.data.forEach((el, i) => {
        const v = ds.data[i]; if (v == null || v === 0) return;
        ctx.save(); ctx.fillStyle = '#333'; ctx.font = 'bold 11px Tahoma, sans-serif';
        if (horiz) { ctx.textAlign='left'; ctx.textBaseline='middle'; ctx.fillText(v, el.x + 5, el.y); }
        else { ctx.textAlign='center'; ctx.textBaseline='bottom'; ctx.fillText(v, el.x, el.y - 3); }
        ctx.restore();
      });
    });
  }
};
function typeColor(t) { const i = typesList().indexOf(t); return TYPE_COLORS[(i<0?0:i) % TYPE_COLORS.length]; }

function badge(cls, txt) { return `<span class="badge ${cls}">${esc(txt)}</span>`; }
function statBadge(s)  { return badge({'เสร็จแล้ว':'b-done','กำลังดำเนินการ':'b-inprog','รอดำเนินการ':'b-pending'}[s]||'b-pending', s); }
function reportBadge(s) { return badge({'นำส่งแล้ว':'b-done','อยู่ระหว่างจัดทำ':'b-inprog','ยังไม่จัดทำ':'b-pending'}[s]||'b-pending', s||'ยังไม่จัดทำ'); }
function prioBadge(p)  { return badge({High:'b-high',Medium:'b-medium',Low:'b-low'}[p]||'b-medium', p); }
function slaBadge(r)   { const st = slaEffective(r); return badge({[SLA_MET]:'b-done',[SLA_RUN]:'b-blue',[SLA_BREACH]:'b-high',[SLA_NONE]:'b-pending'}[st]||'b-pending', st); }
function typeChip(t) {
  if (!t) return '<span style="color:#ccc">-</span>';
  const c = typeColor(t);
  return `<span class="type-chip-sm" style="background:${c}1A;color:${c};border-color:${c}">${esc(t)}</span>`;
}
function progBar(v) {
  return `<div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${v}%"></div></div><span class="prog-pct">${v}%</span></div>`;
}
function jdCell(arr) {
  if (!arr || !arr.length) return '<span style="color:#ccc">-</span>';
  return `<span title="${esc(arr.join(' • '))}">${esc(arr.map(j=>'• '+j).join('  '))}</span>`;
}
function detailCell(arr) {
  if (!arr || !arr.length) return '<span style="color:#ccc">-</span>';
  return `<span title="${esc(arr.join(' • '))}">${esc(arr.map(j=>'• '+j).join('  '))}</span>`;
}

// ── Charts ────────────────────────────────────────────────────
function mkCharts(data) {
  const types = typesList();

  // Type-of-work bar — buckets adapt to selected granularity & date range
  const gran = chartGran;
  const keys = [...new Set(data.map(r=>chartKey(r,gran)).filter(Boolean))].sort();
  const barDatasets = types.map(t => ({
    label: t,
    data: keys.map(k => data.filter(r=>chartKey(r,gran)===k && r.typeOfWork===t).length),
    backgroundColor: typeColor(t), borderRadius: 3,
  }));
  if (barChart) barChart.destroy();
  barChart = new Chart($('barChart').getContext('2d'), {
    type:'bar',
    data:{ labels: keys.map(k=>chartLabel(k,gran)), datasets: barDatasets },
    options:{ responsive:true, maintainAspectRatio:false,
      onClick:(e,els)=>{ if(els.length){ const k=keys[els[0].index], t=types[els[0].datasetIndex];
        openDrill(`${chartLabel(k,gran)} — ${t}`, r=>chartKey(r,gran)===k && r.typeOfWork===t); } },
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}},
      scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,grid:{color:'#f0ede8'},ticks:{font:{size:10},precision:0}}}
    }
  });

  // Type doughnut
  const tcount = types.map(t=>data.filter(r=>r.typeOfWork===t).length);
  if (typeChart) typeChart.destroy();
  typeChart = new Chart($('typeChart').getContext('2d'), {
    type:'bar',
    data:{labels:types,datasets:[{data:tcount,backgroundColor:types.map(typeColor),borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:14}},
      onClick:(e,els)=>{ if(els.length){ const t=types[els[0].index]; openDrill(`ประเภท: ${t}`, r=>r.typeOfWork===t); } },
      plugins:{legend:{display:false}},
      scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,grid:{color:'#f0ede8'},ticks:{font:{size:10},precision:0}}}},
    plugins:[valueLabelPlugin]
  });

  // Status doughnut
  const stats = ['เสร็จแล้ว','กำลังดำเนินการ','รอดำเนินการ'];
  const scount = stats.map(s=>data.filter(r=>r.status===s).length);
  if (statChart) statChart.destroy();
  statChart = new Chart($('statChart').getContext('2d'), {
    type:'doughnut',
    data:{labels:stats,datasets:[{data:scount,backgroundColor:[C.primary,C.accent,C.gray],borderWidth:2,borderColor:'#fff'}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'58%',
      onClick:(e,els)=>{ if(els.length){ const s=stats[els[0].index]; openDrill(`สถานะ: ${s}`, r=>r.status===s); } },
      plugins:{legend:{position:'bottom',labels:{boxWidth:9,font:{size:10}}}}}
  });

  // Owner share (pie)
  const owners = [...new Set(data.map(r=>r.owner).filter(Boolean))];
  const ocount = owners.map(o=>data.filter(r=>r.owner===o).length);
  if (ownerChart) ownerChart.destroy();
  ownerChart = new Chart($('ownerChart').getContext('2d'), {
    type:'bar',
    data:{labels:owners,datasets:[{data:ocount,backgroundColor:owners.map((_,i)=>TYPE_COLORS[i%TYPE_COLORS.length]),borderRadius:4}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:22}},
      onClick:(e,els)=>{ if(els.length){ const o=owners[els[0].index]; openDrill(`Owner: ${o}`, r=>r.owner===o); } },
      plugins:{legend:{display:false}},
      scales:{x:{beginAtZero:true,grid:{color:'#f0ede8'},ticks:{font:{size:9},precision:0}},y:{grid:{display:false},ticks:{font:{size:10}}}}},
    plugins:[valueLabelPlugin]
  });
}

// ── Drill-down modal ──────────────────────────────────────────
let drillCtx = null;
function openDrill(title, predicate) {
  drillCtx = { title, predicate };
  renderDrill();
  $('drill-modal').classList.add('open');
}
function renderDrill() {
  if (!drillCtx) return;
  const jobs = dashRecords().filter(drillCtx.predicate);
  $('drill-title').textContent = `${drillCtx.title} — ${jobs.length} รายการ`;
  $('drill-tbody').innerHTML = jobs.length ? jobs.map(r => `
    <tr>
      <td>${r.date||'-'}</td><td>${r.finish||'-'}</td><td>${esc(r.project)}</td>
      <td>${typeChip(r.typeOfWork)}</td>
      <td style="max-width:210px;font-size:11px">${detailCell(r.details)}</td>
      <td>${opsBr(r)}</td><td>${statBadge(r.status)}</td><td>${reportBadge(r.report)}</td>
      <td><button class="btn-edit" onclick="openEdit(${r.id})">✏️ แก้ไข</button></td>
    </tr>`).join('') : '<tr><td colspan="9" class="empty">ไม่มีรายการ</td></tr>';
}
function drillType(t) { openDrill('ประเภท: ' + t, r => r.typeOfWork === t); }
function closeDrill() { drillCtx = null; $('drill-modal').classList.remove('open'); }
function drillOpen() { return $('drill-modal').classList.contains('open'); }

// ── Dashboard ─────────────────────────────────────────────────
function dashRecords() {
  return records.filter(r => {
    if (dbStart && r.date < dbStart) return false;
    if (dbEnd   && r.date > dbEnd)   return false;
    return true;
  });
}
function initDashDates() { if (typeof dashSetPeriod === 'function') dashSetPeriod(dashPeriod || 'year', true); }
function applyRange() { dashPeriod = 'custom'; renderDashboard(); }
function resetRange() { dashSetPeriod('all'); }


function renderDashboard() {
  const R = dashRange(); dbStart = R.from; dbEnd = R.to;
  renderExec();
}

// ── Work Log ──────────────────────────────────────────────────
// ── Multi-select dropdown (checkbox) ──────────────────────────
const MS = {};
function msSet(id, items, selArr) {
  const el = $(id); if (!el) return;
  if (!MS[id]) {
    MS[id] = {};
    el.addEventListener('click', e => {
      if (e.target.closest('.ms-btn')) { document.querySelectorAll('.ms.open').forEach(x => { if (x !== el) x.classList.remove('open'); }); el.classList.toggle('open'); return; }
      if (e.target.closest('.ms-clear')) { MS[id].sel.length = 0; msRender(id); renderWorkLog(); }
    });
    el.addEventListener('change', e => {
      const cb = e.target.closest('input[type=checkbox]'); if (!cb) return;
      const v = MS[id].items[+cb.dataset.i], a = MS[id].sel, k = a.indexOf(v);
      if (cb.checked && k < 0) a.push(v); else if (!cb.checked && k >= 0) a.splice(k, 1);
      msRender(id); renderWorkLog();
    });
  }
  MS[id].items = items; MS[id].sel = selArr;
  selArr.splice(0, selArr.length, ...selArr.filter(v => items.includes(v)));
  msRender(id);
}
function msRender(id) {
  const m = MS[id], el = $(id), sel = m.sel;
  const txt = !sel.length ? 'ทั้งหมด' : sel.length === 1 ? sel[0] : `เลือก ${sel.length} รายการ`;
  el.innerHTML = `<button type="button" class="ms-btn${sel.length?' has':''}"><span>${esc(txt)}</span><i>▾</i></button>
    <div class="ms-panel"><div class="ms-head"><span>เลือกได้หลายรายการ</span><a class="ms-clear">ล้าง</a></div>
    ${m.items.map((v,i)=>`<label class="ms-opt"><input type="checkbox" data-i="${i}"${sel.includes(v)?' checked':''}><span>${esc(v)}</span></label>`).join('') || '<div class="ms-empty">ไม่มีรายการ</div>'}</div>`;
}
document.addEventListener('click', e => { if (!e.target.closest('.ms')) document.querySelectorAll('.ms.open').forEach(x => x.classList.remove('open')); });
function refreshTypeFilter()  { msSet('f-type',   typesList(), fType); }
function refreshOwnerFilter() { msSet('f-ownerf', uniq([...(options.owner||[]), ...records.map(r=>r.owner)]), fOwner); }
function filtered() {
  return records.filter(r => {
    if (srch   && !JSON.stringify(r).toLowerCase().includes(srch.toLowerCase())) return false;
    if (fType.length  && !fType.includes(r.typeOfWork))      return false;
    if (fStat.length  && !fStat.includes(r.status))          return false;
    if (fPrio.length  && !fPrio.includes(r.priority))        return false;
    if (fOwner.length && !fOwner.includes(r.owner))          return false;
    if (fProject.length && !fProject.includes(r.project))    return false;
    if (fSla.length   && !fSla.includes(slaEffective(r)))    return false;
    const end = r.finish || r.date;                                   // ช่วงวันที่: งานที่คาบเกี่ยวช่วงที่เลือก
    if (fFrom && end && end < fFrom) return false;
    if (fTo   && r.date && r.date > fTo) return false;
    return true;
  });
}
function refreshProjectFilter() {
  if (!$('f-projectf')) return;
  const seen = new Set(), names = [];
  (pjRecords||[]).forEach(p => { if (p.name && !seen.has(p.name)) { seen.add(p.name); names.push(p.name); } });
  (options.project||[]).forEach(n => { if (n && !seen.has(n)) { seen.add(n); names.push(n); } });
  msSet('f-projectf', names, fProject);
}
function msInitAll() {
  msSet('f-stat', ['เสร็จแล้ว','กำลังดำเนินการ','รอดำเนินการ'], fStat);
  msSet('f-prio', ['High','Medium','Low'], fPrio);
  msSet('f-sla',  SLA_MANUAL, fSla);
  refreshTypeFilter(); refreshOwnerFilter(); refreshProjectFilter();
}
function renderWlDash(rows) {
  const n = st => rows.filter(r => r.status === st).length;
  const total = rows.length, done = n('เสร็จแล้ว'), inprog = n('กำลังดำเนินการ'), pend = n('รอดำเนินการ');
  $('wl-k-total').textContent  = total;
  $('wl-k-done').textContent   = done;
  $('wl-k-inprog').textContent = inprog;
  $('wl-k-pend').textContent   = pend;
  $('wl-k-done-sub').textContent   = pct(done, total)   + '% ของงานที่แสดง';
  $('wl-k-inprog-sub').textContent = pct(inprog, total) + '% ของงานที่แสดง';
  $('wl-k-pend-sub').textContent   = pct(pend, total)   + '% ของงานที่แสดง';
  const sl = rows.map(slaEffective);
  const met = sl.filter(x => x === SLA_MET).length, br = sl.filter(x => x === SLA_BREACH).length, run = sl.filter(x => x === SLA_RUN).length;
  const measured = met + br;                       // งานที่ตัดสินผล SLA ได้แล้ว
  const v = measured ? Math.round(met / measured * 100) : null;
  $('wl-k-sla').textContent = v == null ? '–' : v + '%';
  $('wl-k-sla-sub').textContent = `ทันกำหนด ${met} · เกิน ${br} · อยู่ในกำหนด ${run}`;
  const card = $('wl-k-sla-card');
  card.classList.remove('blue', 'amber', 'danger', 'moss');
  card.classList.add(v == null ? 'gray' : v >= 90 ? 'moss' : v >= 70 ? 'amber' : 'danger');
  if (v == null) card.classList.add('gray'); else card.classList.remove('gray');
}
function clearWlFilters() {
  srch = fFrom = fTo = '';
  [fType,fStat,fPrio,fOwner,fProject,fSla].forEach(a => { a.length = 0; });
  $('srch').value = ''; $('wl-from').value = ''; $('wl-to').value = '';
  msInitAll(); renderWorkLog();
}
function clearPpmSynced() {
  const n = records.filter(r => r.ppmPid != null).length;
  if (!n) return;
  if (!confirm(`ลบ ${n} รายการที่เคยถูกดึงมาจาก Plan PM&AN อัตโนมัติ?\n(รายการที่คุณเพิ่มเองไม่ถูกลบ • ข้อมูลใน Plan PM&AN ไม่เปลี่ยน)`)) return;
  records = records.filter(r => r.ppmPid == null); save(); renderWorkLog();
}
// คลิกที่แถว = เปิดแก้ไข (ยกเว้นคลิกปุ่ม/ลิงก์ในแถว, ลากเลือกข้อความ หรือสิทธิ์ดูอย่างเดียว)
function rowEdit(e, src, id) {
  if (e.target.closest('button, a, input, select, label, summary')) return;
  if (String(window.getSelection && getSelection()).trim()) return;
  if (document.body.dataset.role === 'viewer') return;
  if (src === 'ppm') openEditPpm(id); else openEdit(id);
}
function renderWorkLog() {
  const rows = filtered();
  $('btn-clear-ppm').style.display = records.some(r => r.ppmPid != null) ? '' : 'none';
  renderWlDash(rows);
  $('wl-count').textContent = rows.length + ' รายการ';
  $('wl-tbody').innerHTML = rows.length ? rows.map((r,i) => `
    <tr class="row-click" onclick="rowEdit(event,'rec',${r.id})" title="คลิกเพื่อแก้ไข">
      <td style="text-align:center">${i+1}</td>
      <td style="white-space:nowrap">${woCell(r.workOrder)}</td>
      <td style="white-space:nowrap;text-align:center">${r.date||'-'}</td>
      <td style="white-space:nowrap;text-align:center">${r.finish||'<span style=\"color:#ccc\">-</span>'}</td>
      <td style="white-space:nowrap;text-align:center">${r.plan?esc(r.plan):'<span style=\"color:#ccc\">-</span>'}</td>
      <td style="white-space:nowrap;text-align:center">${hasNum(r.slaHours)?(slaActualH(r)!=null?slaActualH(r)+' / ':'')+(+r.slaHours)+' H':(r.slaDue?esc(r.slaDue):'<span style=\"color:#ccc\">-</span>')}</td>
      <td>${esc(r.project)}</td>
      <td>${esc(r.owner)}</td>
      <td>${typeChip(r.typeOfWork)}</td>
      <td style="max-width:190px;font-size:11px">${jdCell(r.jobDescriptions)}</td>
      <td style="min-width:340px;max-width:460px;font-size:11px">${detailCell(r.details)}</td>
      <td style="white-space:nowrap">${opsBr(r)}</td>
      <td style="text-align:center">${daysPassed(r)}</td>
      <td>${prioBadge(r.priority)}</td>
      <td>${statBadge(r.status)}</td>
      <td>${slaBadge(r)}</td>
      <td>${reportBadge(r.report)}</td>
      <td>
        <button class="btn-edit" onclick="openEdit(${r.id})">✏️</button>
        <button class="btn-del"  onclick="del(${r.id})">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="18" class="empty">ไม่พบรายการ</td></tr>';
}

// ── Daily ─────────────────────────────────────────────────────
function renderDaily() {
  const d = $('daily-date').value;
  const rs = records.filter(r => r.date === d);
  $('d-total').textContent  = rs.length;
  $('d-done').textContent   = rs.filter(r=>r.status==='เสร็จแล้ว').length;
  $('d-inprog').textContent = rs.filter(r=>r.status==='กำลังดำเนินการ').length;
  $('d-tbody').innerHTML = rs.length ? rs.map(r => `
    <tr>
      <td>${r.finish||'-'}</td><td>${esc(r.project)}</td><td>${esc(r.owner)}</td><td>${typeChip(r.typeOfWork)}</td>
      <td style="font-size:11px">${jdCell(r.jobDescriptions)}</td>
      <td style="font-size:11px">${detailCell(r.details)}</td><td style="white-space:nowrap">${opsBr(r)}</td>
      <td style="text-align:center">${daysPassed(r)}</td>
      <td>${prioBadge(r.priority)}</td><td>${statBadge(r.status)}</td><td>${reportBadge(r.report)}</td>
    </tr>`).join('') : `<tr><td colspan="11" class="empty">ไม่มีรายการสำหรับ ${d}</td></tr>`;
}

// ── Summary (dynamic per-type, with completion %) ─────────────
function renderSummary(theadId, tbodyId, colLabel, groups) {
  const types = typesList();
  let h = `<tr><th>${colLabel}</th>`;
  types.forEach(t => h += `<th style="border-bottom:3px solid ${typeColor(t)}">${esc(t)}<div class="th-sub">งาน • %สำเร็จ</div></th>`);
  h += '<th>รวมงาน</th><th>เสร็จแล้ว</th><th>% สำเร็จรวม</th></tr>';
  $(theadId).innerHTML = h;

  const tot = {}; types.forEach(t=>tot[t]={n:0,d:0});
  let gT=0, gD=0;
  let body = groups.map(g => {
    let rt=0, rd=0, cells='';
    types.forEach(t => {
      const tr = g.recs.filter(r=>r.typeOfWork===t);
      const n = tr.length, dn = tr.filter(r=>r.status==='เสร็จแล้ว').length;
      tot[t].n+=n; tot[t].d+=dn; rt+=n; rd+=dn;
      cells += n ? `<td><b>${n}</b><div class="mini">${pct(dn,n)}%</div></td>`
                 : `<td><span style="color:#ccc">-</span></td>`;
    });
    gT+=rt; gD+=rd;
    return `<tr${rt===0?' style="opacity:.4"':''}><td><b>${esc(g.label)}</b></td>${cells}<td><b>${rt}</b></td><td>${rd}</td><td>${rt?progBar(pct(rd,rt)):'-'}</td></tr>`;
  }).join('');

  let trow = `<td>รวมทั้งหมด</td>`;
  types.forEach(t => trow += `<td><b>${tot[t].n}</b>${tot[t].n?`<div class="mini">${pct(tot[t].d,tot[t].n)}%</div>`:''}</td>`);
  trow += `<td><b>${gT}</b></td><td><b>${gD}</b></td><td>${gT?progBar(pct(gD,gT)):'-'}</td>`;
  body += `<tr style="background:#d6e5dc;font-weight:700">${trow}</tr>`;
  $(tbodyId).innerHTML = body;
}
function renderWeekly() {
  const weeks = [...new Set(records.map(wOf))].sort((a,b)=>a-b);
  if (!weeks.length) { $('wk-thead').innerHTML=''; $('wk-tbody').innerHTML='<tr><td class="empty">ยังไม่มีข้อมูล</td></tr>'; return; }
  renderSummary('wk-thead','wk-tbody','สัปดาห์ที่', weeks.map(w=>({label:'สัปดาห์ที่ '+w, recs:records.filter(r=>wOf(r)===w)})));
}
function renderMonthly() {
  renderSummary('mo-thead','mo-tbody','เดือน', Array.from({length:12},(_,i)=>({label:MONTHS[i+1], recs:records.filter(r=>mOf(r)===i+1)})));
}
function renderAnnual() {
  const years = [...new Set(records.map(yOf))].sort();
  if (!years.length) { $('yr-thead').innerHTML=''; $('yr-tbody').innerHTML='<tr><td class="empty">ยังไม่มีข้อมูล</td></tr>'; return; }
  renderSummary('yr-thead','yr-tbody','ปี', years.map(y=>({label:String(y), recs:records.filter(r=>yOf(r)===y)})));
}

// ── Custom option dropdowns (add + delete) ────────────────────
function fillSelect(id, list, cur) {
  const el = $(id);
  const vals = [...list];
  if (cur && !vals.includes(cur)) vals.unshift(cur);
  el.innerHTML = vals.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function ownerList() { return uniq([...(options.owner||[]), ...(pjRecords||[]).map(p=>p.owner), ...records.map(r=>r.owner)]); }
function fillOwnerSelect(cur) {
  const list = ownerList(); if (cur && !list.includes(cur)) list.unshift(cur);
  $('f-owner').innerHTML = '<option value="">— เลือก Owner —</option>' + list.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function fillProjectSelect(cur) {
  const ow = $('f-owner').value, seen = new Set(), names = [];
  const add = n => { if (n && !seen.has(n)) { seen.add(n); names.push(n); } };
  const all = () => { (pjRecords||[]).forEach(p => add(p.name)); (options.project||[]).forEach(add); };
  if (ow) {                                   // เฉพาะ Project ของ Owner นี้ (จาก Project list OM + ประวัติบันทึกงาน)
    (pjRecords||[]).filter(p => p.owner === ow).forEach(p => add(p.name));
    records.filter(r => r.owner === ow).forEach(r => add(r.project));
    if (!names.length) all();                 // ไม่พบความเชื่อมโยง → แสดงทั้งหมด ไม่ให้ฟอร์มค้าง
  } else all();
  if (cur && !seen.has(cur)) names.unshift(cur);
  $('f-project').innerHTML = '<option value="">— เลือก Project —</option>' +
    names.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('');
}
function buildSelects(rec) {
  fillSelect('f-worktype', options.typeOfWork, rec ? rec.typeOfWork : (options.typeOfWork[0]||''));
  fillOwnerSelect(rec ? rec.owner : '');
  fillProjectSelect(rec ? rec.project : '');
  opsInit('f-ops', rec ? opsOf(rec) : []);
  fillSelect('f-priority', options.priority,   rec ? rec.priority   : 'Medium');
  fillSelect('f-status',   options.status,     rec ? rec.status     : 'เสร็จแล้ว');
  fillSelect('f-report',   options.report,     rec ? rec.report     : 'ยังไม่จัดทำ');

  // Job Description — single dropdown (blank allowed)
  const jdcur = rec ? ((rec.jobDescriptions && rec.jobDescriptions[0]) || '') : '';
  $('f-jobdesc').innerHTML = '<option value="">— ไม่ระบุ —</option>' +
    options.jobDescriptions.map(v=>`<option value="${esc(v)}"${v===jdcur?' selected':''}>${esc(v)}</option>`).join('');
}
function addOpt(field, label, selId) {
  const val = (prompt(`➕ เพิ่ม${label}ใหม่:`)||'').trim();
  if (!val) return;
  if (!Array.isArray(options[field])) options[field] = [];
  if (!options[field].includes(val)) { options[field].push(val); saveOpts(); }
  if (selId==='f-project') fillProjectSelect(val);
  else if (selId==='f-owner') { fillOwnerSelect(val); fillProjectSelect($('f-project').value); }
  else if (selId==='pp-owner') { fillPpmOwner(val); fillPpmProject($('pp-plant').value); }
  else if (selId==='pp-plant') fillPpmProject(val);
  else if (PPM_ROW_SEL.test(selId)) ppmRefreshField(field, selId, val);
  else fillSelect(selId, options[field], val);
  if (field==='typeOfWork') refreshTypeFilter();
  if (field==='owner') refreshOwnerFilter();
}
function delOpt(field, label, selId) {
  const val = $(selId).value;
  if (!val) return;
  if (!confirm(`ลบ "${val}" ออกจากรายการ ${label}?\n(รายการงานเดิมที่ใช้ค่านี้จะยังคงอยู่)`)) return;
  options[field] = (options[field]||[]).filter(x=>x!==val);
  saveOpts();
  if (selId==='f-project') fillProjectSelect('');
  else if (selId==='f-owner') { fillOwnerSelect(''); fillProjectSelect(''); }
  else if (selId==='pp-owner') { fillPpmOwner(''); fillPpmProject(''); }
  else if (selId==='pp-plant') fillPpmProject('');
  else if (PPM_ROW_SEL.test(selId)) ppmRefreshField(field, selId, '');
  else fillSelect(selId, options[field], options[field][0]||'');
  if (field==='typeOfWork') refreshTypeFilter();
  if (field==='owner') refreshOwnerFilter();
}

// ── Multiple Job Description rows ─────────────────────────────
function addDetail(val='') {
  const wrap = document.createElement('div');
  wrap.className = 'jd-row';
  wrap.innerHTML = `
    <textarea class="dt-input" rows="3" placeholder="รายละเอียดงาน...">${esc(val)}</textarea>
    <button type="button" class="jd-remove" title="ลบ">🗑</button>`;
  wrap.querySelector('.jd-remove').onclick = () => wrap.remove();
  $('detail-container').appendChild(wrap);
}
function collectDetails() {
  return [...document.querySelectorAll('#detail-container .dt-input')].map(i=>i.value.trim()).filter(Boolean);
}

// ── CRUD ──────────────────────────────────────────────────────
function openAdd() {
  editId = null;
  $('modal-title').textContent = '➕ เพิ่มรายการงาน';
  $('rec-form').reset();
  buildSelects(null);
  $('f-start').value    = today();
  $('f-finish').value   = '';
  $('f-plan').value     = '';
  $('f-sla-h').value    = '';
  $('f-sla-act').value  = '';
  $('f-wo').value       = ''; $('f-wo').placeholder = woNext(today()) + ' (อัตโนมัติ)';
  $('f-status').value   = 'เสร็จแล้ว';
  $('f-priority').value = 'Medium';
  $('f-report').value   = 'ยังไม่จัดทำ';
  $('detail-container').innerHTML = ''; addDetail();
  $('rec-modal').classList.add('open');
}
function openEdit(id) {
  const r = records.find(x=>x.id===id);
  if (!r) return;
  editId = id;
  $('modal-title').textContent = '✏️ แก้ไขรายการงาน';
  buildSelects(r);
  $('f-start').value    = r.date;
  $('f-finish').value   = r.finish || '';
  $('f-plan').value     = r.plan || '';
  $('f-sla-h').value    = hasNum(r.slaHours)  ? r.slaHours  : '';
  $('f-sla-act').value  = hasNum(r.slaActual) ? r.slaActual : '';
  $('f-wo').value       = r.workOrder || ''; $('f-wo').placeholder = woNext(r.date) + ' (อัตโนมัติ)';
  $('f-priority').value = r.priority;
  $('f-status').value   = r.status;
  $('f-report').value   = r.report || 'ยังไม่จัดทำ';
  $('detail-container').innerHTML = '';
  if (r.details && r.details.length) r.details.forEach(addDetail);
  else addDetail();
  $('rec-modal').classList.add('open');
}
function closeModal()  { $('rec-modal').classList.remove('open'); }
function openBackup()  { $('bk-modal').classList.add('open'); }
function closeBackup() { $('bk-modal').classList.remove('open'); }

function saveRecord() {
  const date = $('f-start').value;
  if (!date) { alert('กรุณาระบุวันที่เริ่ม (Start)'); return; }
  const tw = $('f-worktype').value, pj = $('f-project').value;
  const ow = $('f-owner').value,    ops = opsGet('f-ops'), op = ops.join(', ');
  opsRegister(ops);
  [['typeOfWork',tw],['project',pj],['owner',ow]].forEach(([f,v])=>{
    if (v && !options[f].includes(v)) options[f].push(v);
  });
  saveOpts(); refreshTypeFilter(); refreshOwnerFilter(); refreshProjectFilter();
  const isNew = !editId;
  const rec = {
    id:          editId || nextId++,
    workOrder:   $('f-wo').value.trim() || woNext(date),
    date,
    finish:      $('f-finish').value,
    plan:        $('f-plan').value.trim(),
    project:     pj,
    owner:       ow,
    typeOfWork:  tw,
    jobDescriptions: $('f-jobdesc').value ? [$('f-jobdesc').value] : [],
    details:     collectDetails(),
    operator:    op,
    operators:   ops,
    priority:    $('f-priority').value,
    status:      $('f-status').value,
    report:      $('f-report').value,
    slaHours:    $('f-sla-h').value,
    slaActual:   $('f-sla-act').value,
    slaDue:      editId ? ((records.find(x=>x.id===editId)||{}).slaDue||'')    : '',   // เก็บค่าเดิมของข้อมูลเก่าไว้
    slaStatus:   editId ? ((records.find(x=>x.id===editId)||{}).slaStatus||'') : '',
  };
  if (!rec.owner && rec.project) { const pj = (pjRecords||[]).find(p=>p.name===rec.project); if (pj && pj.owner) rec.owner = pj.owner; }
  if (editId) { const old = records.find(x=>x.id===editId); if (old) Object.keys(old).forEach(k => { if (!(k in rec)) rec[k] = old[k]; }); }   // คงฟิลด์อื่นไว้ (ppmPid, สถานะเปิด Work ฯลฯ)
  rec.jobDescriptions.forEach(j => { if (j && !options.jobDescriptions.includes(j)) options.jobDescriptions.push(j); });
  saveOpts();
  if (editId) records[records.findIndex(x=>x.id===editId)] = rec;
  else records.push(rec);
  save();
  closeModal();
  if (isNew && typeof opAfterSave === 'function') opAfterSave('job', rec.id);
  renderCur();
  if (drillOpen()) renderDrill();   // keep the drill-down list in sync
}
function del(id) {
  if (!confirm('ต้องการลบรายการนี้?')) return;
  records = records.filter(r=>r.id!==id);
  save();
  renderCur();   // NO. column re-numbers automatically
  if (drillOpen()) renderDrill();
}

// ── Backup / Restore ──────────────────────────────────────────
function rawJSON(k, fb) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch(e) { return fb; } }
function exportJSON() {
  const payload = {version:8, exported:new Date().toISOString(), records, options, projects:pjRecords,
    workplan:rawJSON(WPKEY,null), holidays:rawJSON(HDKEY,[]), planpm:ppmRecords, operatorDir: (typeof opDir!=='undefined'?opDir:null), staff};
  dl(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}), `maintenance_backup_${today()}.json`);
}
function importJSON() {
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json';
  inp.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const fr = new FileReader();
    fr.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const arr  = data.records || data;
        if (!Array.isArray(arr)) throw new Error('Invalid format');
        if (!confirm(`นำเข้า ${arr.length} รายการ?\n(ข้อมูลปัจจุบันจะถูกแทนที่)`)) return;
        records = arr.map(migrate);
        if (data.options) {
          // รองรับไฟล์สำรองเก่า: เติมรายการตัวเลือกที่ขาด ไม่ให้ฟอร์ม/ตัวกรองพัง
          options = data.options;
          ['typeOfWork','project','owner','operator','jobDescriptions','priority','status','report'].forEach(k => { if (!Array.isArray(options[k])) options[k] = []; });
          if (!options.priority.length) options.priority = ['High','Medium','Low'];
          if (!options.status.length)   options.status   = ['เสร็จแล้ว','กำลังดำเนินการ','รอดำเนินการ'];
          if (!options.report.length)   options.report   = ['ยังไม่จัดทำ','อยู่ระหว่างจัดทำ','นำส่งแล้ว'];
          saveOpts();
        }
        if (Array.isArray(data.projects)) { pjRecords = data.projects; pjSave(); projInit(); }
        if (data.workplan) localStorage.setItem(WPKEY, JSON.stringify(data.workplan));   // เก็บข้อมูลเดิมไว้ (หน้าถูกนำออกแล้ว)
        if (Array.isArray(data.holidays)) localStorage.setItem(HDKEY, JSON.stringify(data.holidays));
        if (data.operatorDir && typeof data.operatorDir==='object' && typeof opSaveDir==='function') { opDir = Object.assign({ emails:{}, organizer:'', flowUrl:'', autoSend:false, sent:{} }, data.operatorDir); opSaveDir(); }
        if (Array.isArray(data.staff)) { staff = data.staff.map(staffNorm); staffNextId = Math.max(0, ...staff.map(s => s.sid || 0)) + 1; staffSave(); }
        if (Array.isArray(data.planpm)) { ppmRecords = data.planpm; ppmSaveStore(); planpmInit(); }
        nextId = Math.max(0, ...records.map(r=>r.id))+1;
        save(); initDashDates(); msInitAll(); renderCur(); closeBackup();
        alert('✅ นำเข้าข้อมูลสำเร็จ!');
      } catch(err) { alert('❌ ไฟล์ไม่ถูกต้อง: '+err.message); }
    };
    fr.readAsText(file);
  };
  inp.click();
}
function exportCSV() {
  const cols = ['id','date','finish','plan','slaHours','slaActual','project','owner','typeOfWork','jobDescriptions','details','operator','priority','status','slaStatus','report'];
  const head = ['NO.','Start','Finish','Plan','SLA (H)','SLA ใช้จริง (H)','Project','Owner','Type of work','Job Description','Detail','Operator','Priority','Status','SLA Status','Report#'];
  const body = records.map(r => cols.map(c => {
    let v = (c==='jobDescriptions'||c==='details') ? (r[c]||[]).join(' | ') : c==='slaStatus' ? slaEffective(r) : String(r[c]??'');
    v = v.replace(/"/g,'""');
    return /[,"\n]/.test(v) ? `"${v}"` : v;
  }).join(','));
  dl(new Blob(['﻿'+[head.join(','),...body].join('\n')],{type:'text/csv;charset=utf-8;'}), `maintenance_export_${today()}.csv`);
}
function dl(blob, name) { const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); }

// ── Project list OM (CRUD + persistence) ──────────────────────
const PJ_STATUSES = ['Start OM','Awaiting Handover','Renew OM 2026','PPM'];
function pjMigrate(p) {
  if (p.status==='รอ handover' || p.status==='รอ Handover') p.status = 'Awaiting Handover';
  if (p.status==='RENEW OM 2026') p.status = 'Renew OM 2026';
  if (p.status==='Stop OM') p.status = 'Start OM';
  if (p.gps == null) p.gps = '';
  if (!Array.isArray(p.phones)) p.phones = [];
  if (!Array.isArray(p.emails)) p.emails = [];
  if (!Array.isArray(p.boq)) p.boq = [];
  if (p.budgetContract == null) p.budgetContract = '';
  if (p.budgetYear == null) p.budgetYear = '';
  return p;
}
function omExpiryOf(p) { return p.stopOM ? String(p.stopOM).slice(0,4) : ''; }
function fillManaged(id, list, cur) {
  const vals = [...list];
  if (cur && !vals.includes(cur)) vals.unshift(cur);
  $(id).innerHTML = '<option value="">— เลือก / เพิ่ม ＋ —</option>' +
    vals.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function pjLoad() {
  try {
    const raw = localStorage.getItem(PKEY);
    if (raw) pjRecords = JSON.parse(raw);
    else pjRecords = (window.PROJECTS||[]).map((p,i)=>({pid:i+1, ...p}));
  } catch(e) { pjRecords = (window.PROJECTS||[]).map((p,i)=>({pid:i+1, ...p})); }
  if (!pjRecords.some(p=>p.pid)) pjRecords = pjRecords.map((p,i)=>({pid:i+1, ...p}));
  pjRecords = pjRecords.map(pjMigrate);
  nextPid = Math.max(0, ...pjRecords.map(p=>p.pid||0)) + 1;
}
function pjSave() { localStorage.setItem(PKEY, JSON.stringify(pjRecords)); }
// Copy-to-clipboard ("คัดลอกส่งต่อ") with a small toast
function toast(msg) {
  let t = $('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(()=>t.classList.remove('show'), 1600);
}
function copyShare(text) {
  text = (text||'').trim(); if (!text) { toast('ไม่มีข้อมูลให้คัดลอก'); return; }
  const done = () => toast('📋 คัดลอกแล้ว');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(()=>fallbackCopy(text, done));
  } else { fallbackCopy(text, done); }
}
function fallbackCopy(text, done) {
  const ta = document.createElement('textarea'); ta.value = text;
  ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); done(); } catch(e) {} ta.remove();
}
function addContact(containerId, cls) {
  const wrap = document.createElement('div'); wrap.className = 'jd-row';
  wrap.innerHTML = `<input type="text" class="${cls}" placeholder="${cls==='p-phone'?'เบอร์โทร เช่น 081-234-5678':'อีเมล เช่น name@company.com'}"><button type="button" class="jd-remove" title="ลบ">🗑</button>`;
  wrap.querySelector('.jd-remove').onclick = () => wrap.remove();
  $(containerId).appendChild(wrap);
}
function addContactVal(containerId, cls, val) { addContact(containerId, cls); const els=$(containerId).querySelectorAll('.'+cls); els[els.length-1].value = val; }
function collectContacts(cls) { return [...document.querySelectorAll('#proj-modal .'+cls)].map(i=>i.value.trim()).filter(Boolean); }

function pjStatusChip(s) {
  // Start OM=green, Awaiting Handover=gray, Renew OM 2026=blue, PPM=yellow
  const m = {'Start OM':'b-done','Awaiting Handover':'b-pending','Renew OM 2026':'b-blue','PPM':'b-inprog'};
  return s ? `<span class="badge ${m[s]||'b-medium'}">${esc(s)}</span>` : '<span style="color:#ccc">–</span>';
}
function fillDatalist(id, vals) {
  $(id).innerHTML = [...new Set(vals.filter(Boolean))].sort().map(v=>`<option value="${esc(v)}">`).join('');
}
function projInit() {
  pjLoad();
  // seed managed option lists for the project form (independent of Job Log)
  if (!Array.isArray(options.pjOwner))  options.pjOwner  = [...new Set(pjRecords.map(p=>p.owner).filter(Boolean))].sort();
  if (!Array.isArray(options.pjStatus)) options.pjStatus = [...PJ_STATUSES];
  else {
    options.pjStatus = options.pjStatus.map(s => s==='Stop OM'?'Start OM' : s==='รอ handover'?'Awaiting Handover' : s==='RENEW OM 2026'?'Renew OM 2026' : s);
    PJ_STATUSES.forEach(s => { if (!options.pjStatus.includes(s)) options.pjStatus.push(s); });
  }
  saveOpts();
  const regions = [...new Set(pjRecords.map(p=>p.region).filter(Boolean))].sort();
  const types   = [...new Set(pjRecords.map(p=>p.type).filter(Boolean))].sort();
  const owners  = [...new Set(pjRecords.map(p=>p.owner).filter(Boolean))].sort();
  const years   = [...new Set(pjRecords.map(omExpiryOf).filter(Boolean))].sort();
  $('pj-fregion').innerHTML = '<option value="">ภูมิภาคทั้งหมด</option>' + regions.map(r=>`<option>${esc(r)}</option>`).join('');
  $('pj-ftype').innerHTML   = '<option value="">ประเภททั้งหมด</option>'   + types.map(t=>`<option>${esc(t)}</option>`).join('');
  $('pj-fstatus').innerHTML = '<option value="">สถานะทั้งหมด</option>'    + options.pjStatus.map(s=>`<option>${esc(s)}</option>`).join('');
  $('pj-fomexp').innerHTML  = '<option value="">OM Expiry ทั้งหมด</option>' + years.map(y=>`<option>${esc(y)}</option>`).join('');
  $('pj-fowner').innerHTML  = '<option value="">Owner ทั้งหมด</option>'   + owners.map(o=>`<option>${esc(o)}</option>`).join('');
  fillDatalist('dl-type',   pjRecords.map(p=>p.type));
  fillDatalist('dl-region', pjRecords.map(p=>p.region));
  refreshProjectFilter();   // keep work-log Project filter in sync
}
function pjFiltered() {
  return pjRecords.filter(p => {
    if (pSrch   && !JSON.stringify(p).toLowerCase().includes(pSrch.toLowerCase())) return false;
    if (pRegion && p.region !== pRegion) return false;
    if (pType   && p.type   !== pType)   return false;
    if (pStatus && p.status !== pStatus) return false;
    if (pOmexp  && omExpiryOf(p) !== pOmexp) return false;
    if (pOwner  && p.owner  !== pOwner)  return false;
    return true;
  });
}
// BOQ-by-Activity rows (Project form), shares the Activity option list
function boqActOptions(cur) {
  const vals = [...(options.ppmActivity||[])];
  if (cur && !vals.includes(cur)) vals.unshift(cur);
  return '<option value="">— เลือก Activity —</option>' + vals.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function addBoqRow(act='', amt='') {
  const wrap = document.createElement('div'); wrap.className = 'jd-row boq-row';
  wrap.innerHTML = `<select class="boq-act">${boqActOptions(act)}</select>
    <button type="button" class="btn-add-opt" title="เพิ่ม Activity ใหม่" onclick="addBoqActOpt(this)">＋</button>
    <input type="number" class="boq-amt" min="0" step="0.01" placeholder="BOQ (฿)" value="${amt===''||amt==null?'':amt}">
    <button type="button" class="jd-remove" title="ลบรายการ" onclick="this.closest('.boq-row').remove()">✕</button>`;
  $('p-boq').appendChild(wrap);
}
function addBoqActOpt(btn) {
  const val = (prompt('➕ เพิ่ม Activity ใหม่:')||'').trim();
  if (!val) return;
  if (!Array.isArray(options.ppmActivity)) options.ppmActivity = [];
  if (!options.ppmActivity.includes(val)) { options.ppmActivity.push(val); saveOpts(); }
  const thisSel = btn.parentElement.querySelector('.boq-act');
  document.querySelectorAll('#p-boq .boq-act').forEach(s => { s.innerHTML = boqActOptions(s===thisSel ? val : s.value); });
}
function collectBoq() {
  return [...document.querySelectorAll('#p-boq .boq-row')].map(r => ({
    activity: r.querySelector('.boq-act').value.trim(),
    amount: parseFloat(r.querySelector('.boq-amt').value)||0,
  })).filter(b => b.activity);
}
// ═══ ลิงก์แชร์โฟลเดอร์/พอร์ต ต่อ Project ═══
function normUrl(u) {
  u = (u||'').trim(); if (!u) return '';
  if (/^(https?:)?\/\//i.test(u)) return u.startsWith('//') ? 'https:' + u : u;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return '';            // กัน javascript: ฯลฯ
  return 'https://' + u;
}
function addLinkRow(label='', url='') {
  const wrap = document.createElement('div'); wrap.className = 'jd-row link-row';
  wrap.innerHTML = `<input type="text" class="lk-label" placeholder="ชื่อลิงก์ (เช่น โฟลเดอร์ O&M)" value="${esc(label)}" style="max-width:200px">
    <input type="text" class="lk-url" placeholder="https://..." value="${esc(url)}">
    <button type="button" class="btn-mini" title="เปิดลิงก์" onclick="const u=normUrl(this.parentElement.querySelector('.lk-url').value);if(u)window.open(u,'_blank','noopener')">↗</button>
    <button type="button" class="jd-remove" title="ลบลิงก์" onclick="this.closest('.link-row').remove()">✕</button>`;
  $('p-links').appendChild(wrap);
}
function collectLinks() {
  return [...document.querySelectorAll('#p-links .link-row')].map(r => ({
    label: r.querySelector('.lk-label').value.trim(),
    url: normUrl(r.querySelector('.lk-url').value),
  })).filter(l => l.url);
}
function linkCell(p) {
  const ls = Array.isArray(p.links) ? p.links : [];
  if (!ls.length) return '<span style="color:#ccc">–</span>';
  return ls.map((l,i) => { const u = normUrl(l.url); if (!u) return '';
    return `<div style="white-space:nowrap"><a class="btn-mini" href="${esc(u)}" target="_blank" rel="noopener" title="${esc(u)}">🔗 ${esc(l.label||('ลิงก์ '+(i+1)))}</a> <button class="btn-mini" data-copy="${esc(u)}" onclick="copyShare(this.dataset.copy)" title="คัดลอกลิงก์">📋</button></div>`; }).join('');
}
function contactCell(p) {
  const phones = p.phones||[];
  if (!phones.length) return '<span style="color:#ccc">–</span>';
  const chips = phones.map(x=>`<span class="phone-chip">☎ ${esc(x)}</span>`).join('');
  const all = [p.name, ...phones].filter(Boolean).join(' | ');
  return `<div class="contact-wrap"><div class="phone-list">${chips}</div><button class="btn-mini" data-copy="${esc(all)}" onclick="copyShare(this.dataset.copy)" title="คัดลอกเบอร์ติดต่อ">📋</button></div>`;
}
function pjDate(s) {
  if (!s) return null; const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?/.exec(String(s)); if (!m) return null;
  const d = m[3] ? new Date(+m[1], +m[2]-1, +m[3]) : new Date(+m[1], +m[2], 0);   // ปี-เดือนอย่างเดียว → สิ้นเดือน
  return isNaN(d) ? null : d;
}
function renderAlertCenter() {
  const el = $('alert-center'); if (!el) return;
  const t0 = new Date(today() + 'T00:00:00'), expired = [], soon = [], warn = [];
  (pjRecords||[]).forEach(p => {
    [['stopOM','OM สิ้นสุด'],['stopWarranty','Warranty สิ้นสุด']].forEach(([f, lbl]) => {
      const d = pjDate(p[f]); if (!d) return;
      const left = Math.round((d - t0) / 864e5), it = {p, lbl, date: p[f], left, om: f==='stopOM'};
      if (left < 0) { if (f==='stopOM') expired.push(it); }
      else if (left <= 30) warn.push(it);
      else if (left <= 90 && f==='stopOM') soon.push(it);
    });
  });
  const by = (a,b) => a.left - b.left; expired.sort((a,b)=>b.left-a.left); soon.sort(by); warn.sort(by);
  const col = (cls, ttl, hint, list, fmt) => `<div class="al-col ${cls}"><div class="al-h"><b>${ttl}</b><span class="al-n">${list.length}</span></div><div class="al-hint">${hint}</div>
    <div class="al-list">${list.length ? list.map(it=>`<div class="al-it" onclick="alertGo(this.dataset.n)" data-n="${esc(it.p.name)}"><span class="al-nm">${esc(it.p.name)}</span><span class="al-d">${esc(it.lbl)} · ${esc(it.date)}</span><span class="al-b">${fmt(it)}</span></div>`).join('') : '<div class="al-none">ไม่มีรายการ ✓</div>'}</div></div>`;
  el.innerHTML = `<div class="al-title">🔔 Alert Center <span class="hint">(คลิกรายการเพื่อค้นหาในตาราง)</span></div><div class="al-grid">
    ${col('al-soon','🟠 สัญญา OM ที่กำลังจะหมดอายุ','เหลือ 31–90 วัน',soon,it=>`อีก ${it.left} วัน`)}
    ${col('al-exp','🔴 สัญญา OM หมดอายุแล้ว','เลยกำหนดสิ้นสุด OM',expired,it=>`เกิน ${-it.left} วัน`)}
    ${col('al-warn','⚠️ Warning ภายใน 30 วัน','OM / Warranty สิ้นสุด',warn,it=>it.left===0?'วันนี้':`อีก ${it.left} วัน`)}</div>`;
}
function alertGo(n) { pSrch = n; $('pj-srch').value = n; renderProjects(); }
function renderProjects() {
  renderAlertCenter();
  const rows = pjFiltered();
  const totCap = rows.reduce((s,p)=>s+(typeof p.capacity==='number'?p.capacity:(parseFloat(p.capacity)||0)),0);
  $('pj-total').textContent   = rows.length;
  $('pj-cap').textContent     = totCap.toFixed(2);
  $('pj-startom').textContent = rows.filter(p=>p.status==='Start OM').length;
  $('pj-hand').textContent    = rows.filter(p=>p.status==='Awaiting Handover').length;
  $('pj-renew').textContent   = rows.filter(p=>p.status==='Renew OM 2026').length;
  $('pj-ppm').textContent     = rows.filter(p=>p.status==='PPM').length;
  $('pj-count').textContent   = rows.length + ' โปรเจกต์';
  $('pj-tbody').innerHTML = rows.length ? rows.map(p => `
    <tr>
      <td>${esc(p.no)}</td>
      <td style="font-weight:600">${esc(p.name)}</td>
      <td style="text-align:right">${typeof p.capacity==='number'?p.capacity.toFixed(4):esc(p.capacity)}</td>
      <td>${esc(p.unit)}</td>
      <td>${esc(p.type)}</td>
      <td>${esc(p.region)}</td>
      <td>${esc(p.province)}</td>
      <td>${esc(p.owner)}</td>
      <td>${pjStatusChip(p.status)}</td>
      <td style="text-align:center">${esc(p.omY)}</td>
      <td>${esc(p.startOM)}</td>
      <td>${esc(p.stopOM)}</td>
      <td style="text-align:center">${esc(p.warrantyY)}</td>
      <td>${esc(p.stopWarranty)}</td>
      <td style="white-space:nowrap">${p.gps?`<button class="btn-mini" data-copy="${esc(p.gps)}" onclick="copyShare(this.dataset.copy)" title="คัดลอกพิกัด">📋 คัดลอก</button> <a class="btn-mini" href="https://www.google.com/maps?q=${encodeURIComponent(p.gps)}" target="_blank" title="เปิดแผนที่">🗺️ แผนที่</a>`:'<span style="color:#ccc">–</span>'}</td>
      <td style="font-size:11px">${contactCell(p)}</td>
      <td style="font-size:11px">${linkCell(p)}</td>
      <td style="text-align:right" title="${esc('BOQ รวม: '+Math.round((p.boq||[]).reduce((s,b)=>s+(+b.amount||0),0)).toLocaleString()+'\nBudget 1 ปี: '+(p.budgetYear?Math.round(p.budgetYear).toLocaleString():'-'))}">${p.budgetContract?Math.round(p.budgetContract).toLocaleString():'<span style=\"color:#ccc\">–</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn-edit" onclick="openEditProj(${p.pid})">✏️</button>
        <button class="btn-del"  onclick="delProj(${p.pid})">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="19" class="empty">ไม่พบโปรเจกต์</td></tr>';
}
// ═══ จังหวัด (77) → ภาค ═══
const TH_REGIONS = {
  'ภาคเหนือ': 'เชียงราย เชียงใหม่ น่าน พะเยา แพร่ แม่ฮ่องสอน ลำปาง ลำพูน อุตรดิตถ์',
  'ภาคตะวันออกเฉียงเหนือ': 'กาฬสินธุ์ ขอนแก่น ชัยภูมิ นครพนม นครราชสีมา บึงกาฬ บุรีรัมย์ มหาสารคาม มุกดาหาร ยโสธร ร้อยเอ็ด เลย ศรีสะเกษ สกลนคร สุรินทร์ หนองคาย หนองบัวลำภู อำนาจเจริญ อุดรธานี อุบลราชธานี',
  'ภาคกลาง': 'กรุงเทพมหานคร กำแพงเพชร ชัยนาท นครนายก นครปฐม นครสวรรค์ นนทบุรี ปทุมธานี พระนครศรีอยุธยา พิจิตร พิษณุโลก เพชรบูรณ์ ลพบุรี สมุทรปราการ สมุทรสงคราม สมุทรสาคร สระบุรี สิงห์บุรี สุโขทัย สุพรรณบุรี อ่างทอง อุทัยธานี',
  'ภาคตะวันออก': 'จันทบุรี ฉะเชิงเทรา ชลบุรี ตราด ปราจีนบุรี ระยอง สระแก้ว',
  'ภาคตะวันตก': 'กาญจนบุรี ตาก ประจวบคีรีขันธ์ เพชรบุรี ราชบุรี',
  'ภาคใต้': 'กระบี่ ชุมพร ตรัง นครศรีธรรมราช นราธิวาส ปัตตานี พังงา พัทลุง ภูเก็ต ยะลา ระนอง สงขลา สตูล สุราษฎร์ธานี',
};
const TH_PROV = {}; Object.entries(TH_REGIONS).forEach(([r, l]) => l.split(' ').forEach(p => { TH_PROV[p] = r; }));
const TH_PROV_ALIAS = { 'กรุงเทพ': 'กรุงเทพมหานคร', 'กรุงเทพฯ': 'กรุงเทพมหานคร', 'กทม': 'กรุงเทพมหานคร', 'กทม.': 'กรุงเทพมหานคร', 'อยุธยา': 'พระนครศรีอยุธยา', 'จ.อยุธยา': 'พระนครศรีอยุธยา' };
function pjNormProv(v) { v = String(v || '').trim().replace(/^จ\.\s*|^จังหวัด\s*/, ''); return TH_PROV_ALIAS[v] || v; }
function pjRegionOf(prov) { return TH_PROV[pjNormProv(prov)] || ''; }
function pjFillProvince() {
  const el = $('p-province'); if (el.options.length > 1) return;
  el.innerHTML = '<option value="">— เลือกจังหวัด —</option>' + Object.entries(TH_REGIONS).map(([r, l]) => `<optgroup label="${r}">${l.split(' ').sort((a, b) => a.localeCompare(b, 'th')).map(p => `<option value="${p}">${p}</option>`).join('')}</optgroup>`).join('');
}
function pjSetProvince(v) {
  pjFillProvince(); const el = $('p-province'), n = pjNormProv(v);
  if (n && ![...el.options].some(o => o.value === n)) el.insertAdjacentHTML('beforeend', `<option value="${esc(n)}">${esc(n)} (นอกรายการ)</option>`);
  el.value = n || '';
}
function pjProvChange() { const r = pjRegionOf($('p-province').value); if (r) $('p-region').value = r; }
// Stop = Start + จำนวนปี − 1 วัน
function pjAddYears(iso, y) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m || !(y > 0)) return '';
  const d = new Date(Date.UTC(+m[1] + Math.trunc(y), +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1) d.setUTCDate(0);        // 29 ก.พ. → ปีไม่อธิกสุรทิน
  d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10);
}
function pjCalcStops(clearIfEmpty) {
  const st = $('p-start').value, om = pjAddYears(st, +$('p-omy').value), wr = pjAddYears(st, +$('p-wy').value);
  if (om || clearIfEmpty) $('p-stop').value = om;
  if (wr || clearIfEmpty) $('p-stopw').value = wr;
}
function openAddProj() {
  pjSetProvince('');
  editPid = null;
  $('proj-title').textContent = '➕ เพิ่ม Project';
  $('proj-form').reset();
  fillManaged('p-owner',  options.pjOwner,  '');
  fillManaged('p-status', options.pjStatus, 'Start OM');
  $('p-no').value = Math.max(0, ...pjRecords.map(p=>+p.no||0)) + 1;
  $('p-unit').value = 'MW';
  $('p-gps').value = '';
  $('p-phones').innerHTML = ''; $('p-emails').innerHTML = '';
  $('p-boq').innerHTML = ''; addBoqRow();
  $('p-links').innerHTML = ''; addLinkRow();
  $('p-budcontract').value = ''; $('p-budyear').value = '';
  $('proj-modal').classList.add('open');
}
function openEditProj(pid) {
  const p = pjRecords.find(x=>x.pid===pid);
  if (!p) return;
  editPid = pid;
  $('proj-title').textContent = '✏️ แก้ไข Project';
  fillManaged('p-owner',  options.pjOwner,  p.owner);
  fillManaged('p-status', options.pjStatus, p.status);
  $('p-no').value=p.no; $('p-name').value=p.name; $('p-cap').value=p.capacity; $('p-unit').value=p.unit||'MW';
  $('p-type').value=p.type; pjSetProvince(p.province); $('p-region').value=p.region||pjRegionOf(p.province)||'';
  $('p-omy').value=p.omY; $('p-start').value=p.startOM; $('p-stop').value=p.stopOM;
  $('p-wy').value=p.warrantyY; $('p-stopw').value=p.stopWarranty;
  $('p-gps').value = p.gps || '';
  $('p-phones').innerHTML = ''; (p.phones||[]).forEach(v=>addContactVal('p-phones','p-phone',v));
  $('p-emails').innerHTML = ''; (p.emails||[]).forEach(v=>addContactVal('p-emails','p-email',v));
  $('p-links').innerHTML = ''; if (Array.isArray(p.links) && p.links.length) p.links.forEach(l=>addLinkRow(l.label, l.url)); else addLinkRow();
  $('p-boq').innerHTML = ''; if (p.boq && p.boq.length) p.boq.forEach(b=>addBoqRow(b.activity, b.amount)); else addBoqRow();
  $('p-budcontract').value = p.budgetContract||''; $('p-budyear').value = p.budgetYear||'';
  $('proj-modal').classList.add('open');
}
function closeProj() { $('proj-modal').classList.remove('open'); }
function saveProj() {
  pjCalcStops(false);
  const name = $('p-name').value.trim();
  if (!name) { alert('กรุณาระบุชื่อ Project name'); return; }
  const owner = $('p-owner').value.trim(), status = $('p-status').value.trim();
  const numOr = (v)=>{ const f=parseFloat(v); return isNaN(f)?'' : (f===Math.trunc(f)?Math.trunc(f):f); };
  const rec = {
    pid: editPid || nextPid++,
    no:  numOr($('p-no').value) || $('p-no').value.trim(),
    name, capacity: numOr($('p-cap').value), unit: $('p-unit').value.trim()||'MW',
    type: $('p-type').value.trim(), region: $('p-region').value.trim(), province: $('p-province').value.trim(),
    owner, status,
    omY: numOr($('p-omy').value), startOM: $('p-start').value, stopOM: $('p-stop').value,
    warrantyY: numOr($('p-wy').value), stopWarranty: $('p-stopw').value,
    gps: $('p-gps').value.trim(), phones: collectContacts('p-phone'), emails: collectContacts('p-email'),
    boq: collectBoq(), links: collectLinks(), budgetContract: numOr($('p-budcontract').value), budgetYear: numOr($('p-budyear').value),
  };
  if (owner  && !options.pjOwner.includes(owner))   options.pjOwner.push(owner);
  if (status && !options.pjStatus.includes(status)) options.pjStatus.push(status);
  saveOpts();
  if (editPid) pjRecords[pjRecords.findIndex(x=>x.pid===editPid)] = rec;
  else pjRecords.push(rec);
  pjSave();
  closeProj();
  projInit();
  renderProjects();
}
function delProj(pid) {
  if (!confirm('ต้องการลบ Project นี้?')) return;
  pjRecords = pjRecords.filter(p=>p.pid!==pid);
  pjSave();
  projInit();
  renderProjects();
}

// ── Work Plan (แผนปฏิบัติงาน) ─────────────────────────────────
const WP_DOW = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
function wpSave() {
  localStorage.setItem(WPKEY, JSON.stringify({title:wpTitle, subtitle:wpSubtitle, start:wpStart, end:wpEnd, rows:wpRows, colW:wpColW, rowH:wpRowH, ops:wpOps}));
}
function applyWpLayout() {
  const cg = $('wp-colgroup'); if (!cg) return;
  cg.innerHTML = wpColW.map(w=>`<col style="width:${w}px">`).join('') + '<col style="width:66px">';
  const tbl = document.querySelector('#wp-print table.wp-table');
  if (tbl) tbl.style.width = (wpColW.reduce((a,b)=>a+b,0) + 66) + 'px';
  document.documentElement.style.setProperty('--wp-h', wpRowH + 'px');
}
function initWpResizers() {
  document.querySelectorAll('#tab-workplan .wp-resizer').forEach(h => {
    if (h._bound) return; h._bound = true;
    h.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const ci = +h.dataset.col, startX = e.clientX, startW = wpColW[ci];
      const mm = ev => { wpColW[ci] = Math.max(60, Math.min(700, startW + (ev.clientX - startX))); applyWpLayout(); };
      const mu = () => { document.removeEventListener('mousemove', mm); document.removeEventListener('mouseup', mu); wpSave(); };
      document.addEventListener('mousemove', mm); document.addEventListener('mouseup', mu);
    });
  });
}
function isoOf(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function buildWpRows() {
  // preserve manual edits: imported rows by ppmPid+date, blank-day rows by iso
  const oldDay = {}, oldByKey = {};
  wpRows.forEach(r => { if (r.ppmPid!=null) oldByKey[r.ppmPid+'|'+r.iso] = r; else if (r.iso) oldDay[r.iso] = r; });
  const [sy,sm,sd] = wpStart.split('-').map(Number);
  const [ey,em,ed] = wpEnd.split('-').map(Number);
  let d = new Date(sy, sm-1, sd); const end = new Date(ey, em-1, ed);
  const rows = []; let guard = 0;
  while (d <= end && guard++ < 400) {
    const iso = isoOf(d), day = WP_DOW[d.getDay()];
    const date = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    // auto-pull Plan PM&AN for every day from Start to END (inclusive)
    const acts = (ppmRecords||[]).filter(a => { if (!a.start) return false; const e = a.end || a.start; return iso >= a.start && iso <= e; });
    if (acts.length) {
      acts.forEach(a => {
        const prev = oldByKey[a.pid+'|'+iso];
        rows.push({ iso, day, date, ppmPid: a.pid,
          detail:  prev ? prev.detail  : [a.type, a.round, a.activity].filter(Boolean).join(' '),
          project: prev ? prev.project : (a.plant||''),
          operators: prev && Array.isArray(prev.operators) ? prev.operators : [],
          remark:  prev ? prev.remark  : (a.team||''),
        });
      });
    } else {
      const ex = oldDay[iso];
      rows.push({ iso, day, date,
        detail: ex?ex.detail:'', project: ex?ex.project:'',
        operators: ex && Array.isArray(ex.operators) ? ex.operators : (ex && ex.operator ? [ex.operator] : []),
        remark: ex?ex.remark:'' });
    }
    d.setDate(d.getDate()+1);
  }
  wpRows = rows;
}
function wpInit() {
  try {
    const raw = localStorage.getItem(WPKEY);
    if (!raw) throw 0;
    const d = JSON.parse(raw);
    wpTitle=d.title||''; wpSubtitle=d.subtitle||'Maintenance'; wpStart=d.start||''; wpEnd=d.end||''; wpRows=d.rows||[];
    if (Array.isArray(d.colW) && d.colW.length===5) wpColW = d.colW;
    if (d.rowH) wpRowH = d.rowH;
    if (Array.isArray(d.ops)) wpOps = d.ops;
  } catch(e) {
    const t = new Date(); const offMon = (t.getDay()+6)%7;
    const mon = new Date(t); mon.setDate(t.getDate()-offMon);
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    wpStart = isoOf(mon); wpEnd = isoOf(sun);
    wpTitle = 'แผนปฏิบัติงานประจำเดือน ' + String(mon.getMonth()+1).padStart(2,'0') + '-' + mon.getFullYear();
    wpSubtitle = 'Maintenance';
    buildWpRows(); wpSave();
  }
  wpRows.forEach(r => {
    if (r.project == null) r.project = '';
    if (!Array.isArray(r.operators)) r.operators = r.operator ? [r.operator] : [];
  });
  // seed operator-name dropdown list from Job Log operators + any used names
  if (!wpOps.length) wpOps = [...new Set([...(options.operator||[]), ...wpRows.flatMap(r=>r.operators||[])].filter(Boolean))];
  $('wp-title').value = wpTitle; $('wp-sub').value = wpSubtitle;
  $('wp-start').value = wpStart; $('wp-end').value = wpEnd;
  $('wp-rowh').value = wpRowH;
  applyWpLayout(); initWpResizers();
}
function holidayName(r) {
  if (r.iso) {
    const h = hdRecords.find(x => x.date === r.iso);
    if (h) return h.name || 'วันหยุด';
    const [y,m,d] = r.iso.split('-').map(Number);
    const wd = new Date(y, m-1, d).getDay();
    if (wd === 0 || wd === 6) return 'วันหยุด';
  } else if (r.day === 'เสาร์' || r.day === 'อาทิตย์') { return 'วันหยุด'; }
  return '';
}
function isHoliday(r) { return holidayName(r) !== ''; }
function renderWorkplan() {
  renderHolidays();
  $('wp-title-h').textContent = wpTitle || 'แผนปฏิบัติงาน';
  $('wp-sub-h').textContent   = wpSubtitle || '';
  if (!wpRows.length) { $('wp-tbody').innerHTML = '<tr><td colspan="6" class="empty">กด "สร้างตารางตามวันที่" หรือ "เพิ่มแถว"</td></tr>'; return; }
  let html = '';
  for (let i = 0; i < wpRows.length; ) {
    const r = wpRows[i];
    let span = 1;
    if (r.iso) { while (i+span < wpRows.length && wpRows[i+span].iso === r.iso) span++; }
    const hname = holidayName(r), hc = hname ? ' wp-holiday' : '';
    for (let j = 0; j < span; j++) {
      const idx = i+j, rr = wpRows[idx];
      html += `<tr class="wp-row${hc}" data-iso="${esc(rr.iso)}">`;
      if (j === 0) {
        html += `<td class="wp-daycell${hc}"${span>1?` rowspan="${span}"`:''}>
          <div class="wp-cell wp-day"  contenteditable data-i="${idx}" data-f="day"  oninput="wpEdit(this)">${esc(rr.day)}</div>
          <div class="wp-cell wp-date" contenteditable data-i="${idx}" data-f="date" oninput="wpEdit(this)">${esc(rr.date)}</div>
          ${hname?`<div class="wp-holtag">${esc(hname)}</div>`:''}
        </td>`;
      }
      html += `<td><div class="wp-cell" contenteditable data-i="${idx}" data-f="detail"   oninput="wpEdit(this)">${esc(rr.detail)}</div></td>`;
      html += `<td><div class="wp-cell" contenteditable data-i="${idx}" data-f="project"  oninput="wpEdit(this)">${esc(rr.project||'')}</div></td>`;
      html += `<td class="wp-opcell">${opBoxes(idx, rr.operators)}</td>`;
      html += `<td><div class="wp-cell" contenteditable data-i="${idx}" data-f="remark"   oninput="wpEdit(this)">${esc(rr.remark)}</div></td>`;
      html += `<td class="wp-noprint" style="text-align:center;white-space:nowrap">
        <button class="btn-edit" title="เพิ่มงานในวันนี้" onclick="addWpItem(${idx})">＋</button>
        <button class="btn-del"  title="ลบแถวนี้" onclick="delWpRow(${idx})">🗑️</button></td>`;
      html += `</tr>`;
    }
    i += span;
  }
  $('wp-tbody').innerHTML = html;
}
function wpEdit(el) { wpRows[+el.dataset.i][el.dataset.f] = el.innerText; wpSave(); }
// Operator field: up to 4 separate name boxes per row
function opSelect(rowIdx, oi, cur) {
  const names = [...wpOps]; if (cur && !names.includes(cur)) names.unshift(cur);
  return `<select class="wp-opsel" data-i="${rowIdx}" data-oi="${oi}" onchange="wpOpSel(this)">
    <option value="">— เลือก —</option>
    ${names.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('')}
    <option value="__add__">➕ เพิ่มชื่อใหม่…</option>
  </select>`;
}
function opBoxes(rowIdx, ops) {
  ops = ops || [];
  let h = '<div class="wp-ops">';
  ops.forEach((nm, oi) => {
    h += `<div class="wp-opbox">${opSelect(rowIdx, oi, nm)}<button class="wp-opdel wp-noprint" title="ลบช่อง" onclick="delOp(${rowIdx},${oi})">✕</button></div>`;
  });
  if (ops.length < 4) h += `<button class="wp-opadd wp-noprint" title="เพิ่มช่องชื่อ (สูงสุด 4)" onclick="addOp(${rowIdx})">＋</button>`;
  return h + '</div>';
}
function wpOpSel(el) {
  const i = +el.dataset.i, oi = +el.dataset.oi;
  if (el.value === '__add__') {
    const nm = (prompt('➕ เพิ่มชื่อผู้ปฏิบัติงานใหม่:')||'').trim();
    if (nm) { if (!wpOps.includes(nm)) wpOps.push(nm); wpRows[i].operators[oi] = nm; wpSave(); renderWorkplan(); }
    else { el.value = wpRows[i].operators[oi] || ''; }
    return;
  }
  wpRows[i].operators[oi] = el.value; wpSave();
}
function addOp(i) { if (wpRows[i].operators.length < 4) { wpRows[i].operators.push(''); wpSave(); renderWorkplan(); } }
function delOp(i, oi) { wpRows[i].operators.splice(oi, 1); wpSave(); renderWorkplan(); }
function addWpItem(idx) {
  const r = wpRows[idx];
  wpRows.splice(idx+1, 0, { iso:r.iso, day:r.day, date:r.date, detail:'', project:'', operators:[], remark:'' });
  wpSave(); renderWorkplan();
}
function genWorkplan() {
  const s = $('wp-start').value, e = $('wp-end').value;
  if (!s || !e) { alert('กรุณาเลือกวันที่เริ่มและสิ้นสุด'); return; }
  if (s > e) { alert('วันที่เริ่มต้องไม่เกินวันสิ้นสุด'); return; }
  wpStart = s; wpEnd = e;
  // title follows the selected period (only if still on the default pattern)
  if (!wpTitle || wpTitle.startsWith('แผนปฏิบัติงานประจำเดือน')) {
    const [y,m] = s.split('-');
    wpTitle = 'แผนปฏิบัติงานประจำเดือน ' + m + '-' + y;
    $('wp-title').value = wpTitle;
  }
  buildWpRows(); wpSave(); renderWorkplan();
}
function addWpDate() {
  const v = $('wp-adddate').value;
  if (!v) { alert('กรุณาเลือกวันที่ที่ต้องการเพิ่ม'); return; }
  const [y,m,d] = v.split('-').map(Number); const dt = new Date(y, m-1, d);
  const row = { iso:v, day:WP_DOW[dt.getDay()],
    date:`${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y}`,
    detail:'', project:'', operators:[], remark:'' };
  let pos = wpRows.length;
  for (let i=0;i<wpRows.length;i++) { if (wpRows[i].iso && wpRows[i].iso > v) { pos = i; break; } }
  wpRows.splice(pos, 0, row);
  wpSave(); renderWorkplan();
}
function delWpRow(i) {
  wpRows.splice(i, 1); wpSave(); renderWorkplan();
}
function exportWorkplanPDF() {
  const ps = $('wp-pstart').value, pe = $('wp-pend').value;
  // hide rows outside the chosen print range (rows with a date only)
  document.querySelectorAll('#wp-tbody tr').forEach(tr => {
    const iso = tr.dataset.iso || '';
    let hide = false;
    if ((ps || pe) && iso) { if (ps && iso < ps) hide = true; if (pe && iso > pe) hide = true; }
    tr.classList.toggle('wp-printhide', hide);
  });
  window.print();
}

// ── Annual Holidays (วันหยุดประจำปี) ──────────────────────────
function hdLoad() { try { const r = localStorage.getItem(HDKEY); hdRecords = r ? JSON.parse(r) : []; } catch(e) { hdRecords = []; } }
function hdSave() { localStorage.setItem(HDKEY, JSON.stringify(hdRecords)); }
function hdInit() { hdLoad(); $('hd-date').value = today(); }
function renderHolidays() {
  if (!$('hd-list')) return;
  hdRecords.sort((a,b)=>a.date.localeCompare(b.date));
  $('hd-list').innerHTML = hdRecords.length ? hdRecords.map(h => {
    const [y,m,d] = h.date.split('-').map(Number);
    return `<span class="hd-chip">${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${y} — ${esc(h.name)}<button title="ลบ" onclick="delHoliday('${h.date}')">✕</button></span>`;
  }).join('') : '<span class="hint">ยังไม่มีวันหยุดที่เพิ่มเอง</span>';
}
function addHoliday() {
  const date = $('hd-date').value, name = $('hd-name').value.trim();
  if (!date) { alert('กรุณาเลือกวันที่'); return; }
  if (hdRecords.some(h=>h.date===date)) { alert('มีวันหยุดของวันนี้อยู่แล้ว'); return; }
  hdRecords.push({ date, name: name || 'วันหยุด' });
  hdSave(); $('hd-name').value = '';
  renderHolidays(); renderWorkplan();   // sync red colour into the plan immediately
}
function delHoliday(date) {
  hdRecords = hdRecords.filter(h=>h.date!==date);
  hdSave(); renderHolidays(); renderWorkplan();
}

// ── Plan PM & AN (CRUD) ───────────────────────────────────────
let ppmRecords=[], ppmNextId=1, ppmEditId=null;
let ppmSrch='', ppmYear='', ppmMonth='', ppmType='', ppmOwner='', ppmStatus='', ppmActivity='';
let ppmChart=null, ppmBudgetChart=null;
const PPMKEY = 'greenergy_planpm_v1';
const PPM_MN = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
function ppmLoad() {
  try {
    const r = localStorage.getItem(PPMKEY);
    if (r) ppmRecords = JSON.parse(r);
    else ppmRecords = (window.PLANPM||[]).map((p,i)=>({pid:i+1, ...p}));
  } catch(e) { ppmRecords = (window.PLANPM||[]).map((p,i)=>({pid:i+1, ...p})); }
  if (!ppmRecords.some(p=>p.pid)) ppmRecords = ppmRecords.map((p,i)=>({pid:i+1, ...p}));
  ppmRecords.forEach(r => { if (r.year == null) r.year = r.start ? (parseInt(String(r.start).slice(0,4))||2026) : 2026; });
  ppmNextId = Math.max(0, ...ppmRecords.map(p=>p.pid||0)) + 1;
}
function ppmSaveStore() { localStorage.setItem(PPMKEY, JSON.stringify(ppmRecords)); }
function ppmTypeChip(t) {
  const m = {QPM:'b-done', AN:'b-blue', PPM:'b-medium'};
  return t ? `<span class="badge ${m[t]||'b-pending'}">${esc(t)}</span>` : '<span style="color:#ccc">–</span>';
}
function planpmInit() {
  ppmLoad();
  const owners = uniq(ppmRecords.map(r=>r.owner)).sort();
  const types  = uniq(ppmRecords.map(r=>r.type)).sort();
  const acts   = uniq(ppmRecords.map(r=>r.activity)).sort();
  const years = [...new Set(ppmRecords.map(r=>r.year).filter(Boolean))].sort();
  $('ppm-fyear').innerHTML  = '<option value="">ทุกปี</option>' + years.map(y=>`<option>${y}</option>`).join('');
  $('ppm-fmonth').innerHTML = '<option value="">ทุกเดือน</option>' + Array.from({length:12},(_,i)=>`<option value="${i+1}">${i+1}. ${PPM_MN[i+1]}</option>`).join('');
  $('ppm-ftype').innerHTML  = '<option value="">ทุกประเภท</option>' + types.map(t=>`<option>${esc(t)}</option>`).join('');
  $('ppm-fowner').innerHTML = '<option value="">ทุก Owner</option>' + owners.map(o=>`<option>${esc(o)}</option>`).join('');
  $('ppm-factivity').innerHTML = '<option value="">ทุก Activity</option>' + acts.map(a=>`<option>${esc(a)}</option>`).join('');
  // seed managed option lists for the form (persisted in options)
  if (!Array.isArray(options.ppmProject))  options.ppmProject  = [];
  if (!Array.isArray(options.ppmOwner))    options.ppmOwner    = uniq([...ppmRecords.map(r=>r.owner), ...(pjRecords||[]).map(p=>p.owner)]).sort();
  if (!Array.isArray(options.ppmActivity)) options.ppmActivity = uniq(ppmRecords.map(r=>r.activity)).sort();
  if (!Array.isArray(options.ppmType))     options.ppmType     = uniq(['QPM','AN','PPM', ...ppmRecords.map(r=>r.type)]);
  if (!Array.isArray(options.ppmStatus))   options.ppmStatus   = ['ยังไม่เริ่ม','กำลังดำเนินการ','เสร็จแล้ว','เลื่อน'];
  if (!Array.isArray(options.ppmOperator)) options.ppmOperator = uniq([...(options.operator||[]), ...ppmRecords.flatMap(opsOf)]).sort();
  if (!Array.isArray(options.ppmTeam))     options.ppmTeam     = uniq(ppmRecords.map(r=>r.team)).sort();
  saveOpts();
}
function fillPpmOwner(cur) {
  const list = uniq([...(options.ppmOwner||[]), ...(pjRecords||[]).map(p=>p.owner), ...ppmRecords.map(r=>r.owner)]).sort();
  if (cur && !list.includes(cur)) list.unshift(cur);
  $('pp-owner').innerHTML = '<option value="">— เลือก Owner —</option>' + list.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function fillPpmProject(cur) {
  const ow = $('pp-owner').value, seen = new Set(), names = [];
  const add = n => { if (n && !seen.has(n)) { seen.add(n); names.push(n); } };
  const all = () => { (pjRecords||[]).forEach(p => add(p.name)); (options.ppmProject||[]).forEach(add); };
  if (ow) { (pjRecords||[]).filter(p=>p.owner===ow).forEach(p=>add(p.name)); ppmRecords.filter(r=>r.owner===ow).forEach(r=>add(r.plant)); if (!names.length) all(); }
  else all();
  if (cur && !seen.has(cur)) names.unshift(cur);
  $('pp-plant').innerHTML = '<option value="">— เลือก Project —</option>' +
    names.map(n=>`<option value="${esc(n)}"${n===cur?' selected':''}>${esc(n)}</option>`).join('');
}
function ppmStatusOf(r) { return r.status || (r.progress>=1 ? 'เสร็จแล้ว' : r.progress>0 ? 'กำลังดำเนินการ' : 'ยังไม่เริ่ม'); }
function ppmProgChange(k) {                       // Progress → สถานะอัตโนมัติ (ยกเว้นเลือก “เลื่อน” ไว้)
  const st = $('pp-status-' + k); if (st.value === 'เลื่อน') return;
  const v = +$('pp-progress-' + k).value || 0, want = v>=100 ? 'เสร็จแล้ว' : v>0 ? 'กำลังดำเนินการ' : 'ยังไม่เริ่ม';
  if ([...st.options].some(o=>o.value===want)) st.value = want;
}
function ppmOwnerChange() { fillPpmProject($('pp-plant').value); ppmAutofillAll(); }
function ppmFillProjInfo(name, force) {
  const p = (pjRecords||[]).find(x=>x.name===name); if (!p) return;
  const set = (id,v) => { if (force || !$(id).value) $(id).value = v ?? ''; };
  set('pp-ptype', p.type); set('pp-region', p.region); set('pp-province', p.province);
  if (force || !$('pp-cap').value) $('pp-cap').value = p.capacity ?? '';
  if (force) $('pp-unit').value = p.unit || 'MW.';
}
// ═══ ฟอร์มเพิ่มงาน PM&AN: กล่อง PM&AN เพิ่ม/ลบได้หลายงานในครั้งเดียว ═══
const PPM_ROW_SEL = /^pp-(type|activity|team|status)-\d+$/;
const PPM_FIELD_PREFIX = {ppmType:'pp-type', ppmActivity:'pp-activity', ppmTeam:'pp-team', ppmStatus:'pp-status'};
let ppRowSeq = 0;
function ppmRowIds() { return [...document.querySelectorAll('#pp-rows .ppm-row')].map(e => e.dataset.k); }
function fillPpmYearEl(el, cur) {
  const ys = []; for (let y=2024; y<=2032; y++) ys.push(y);
  if (cur && !ys.includes(+cur)) ys.push(+cur);
  ys.sort((a,b)=>a-b);
  el.innerHTML = ys.map(y=>`<option value="${y}"${+cur===y?' selected':''}>${y}</option>`).join('');
}
function fillPpmStatus(el, cur) {
  const sl = [...options.ppmStatus]; if (cur && !sl.includes(cur)) sl.unshift(cur);
  el.innerHTML = sl.map(v=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(v)}</option>`).join('');
}
function ppmRefreshField(field, originId, originVal) {   // อัปเดตรายการตัวเลือกในทุกแถวพร้อมกัน
  const pre = PPM_FIELD_PREFIX[field]; if (!pre) return;
  ppmRowIds().forEach(k => {
    const id = `${pre}-${k}`, el = $(id), cur = id === originId ? originVal : el.value;
    if (field === 'ppmStatus') fillPpmStatus(el, cur || options.ppmStatus[0]); else fillManaged(id, options[field], cur);
  });
}
function ppmCalcEnd(k) {
  const s = $('pp-start-' + k).value, d = +$('pp-days-' + k).value;
  if (s && d>0) { const dt = new Date(s); dt.setDate(dt.getDate()+d-1); $('pp-end-' + k).value = isoOf(dt); }
}
function ppmNorm(x) { return String(x||'').replace(/\s+/g,' ').trim().toLowerCase(); }
function ppmBoqLookup(plant, act) {
  const p = (pjRecords||[]).find(x=>ppmNorm(x.name)===ppmNorm(plant));
  if (!p) return {p:null, e:null};
  const e = Array.isArray(p.boq) ? p.boq.find(b=>ppmNorm(b.activity)===ppmNorm(act)) : null;
  return {p, e};
}
// ดึง BOQ จาก Project list OM ตาม Project + Activity (ไม่ทับค่าที่ผู้ใช้พิมพ์เอง)
function ppmAutofillBOQ(k, force) {
  const inp = $('pp-budget-' + k), hint = $('pp-boqhint-' + k); if (!inp) return;
  const plant = $('pp-plant').value, act = $('pp-activity-' + k).value;
  const setHint = (t, cls) => { if (hint) { hint.textContent = t; hint.className = 'boq-hint ' + (cls||''); } };
  if (!plant || !act) { setHint(!plant ? 'เลือก Project เพื่อดึง BOQ' : 'เลือก Activity เพื่อดึง BOQ'); return; }
  const {p, e} = ppmBoqLookup(plant, act);
  if (!p) { setHint('ไม่พบ Project ใน Project list OM', 'warn'); return; }
  if (!e || e.amount === '' || e.amount == null) { setHint(`ไม่มี BOQ ของ “${act}” ใน ${plant} (Project list OM) — กรอกเองได้`, 'warn'); return; }
  const blank = inp.value === '' || +inp.value === 0;
  if (force || blank || inp.dataset.auto === '1') { inp.value = e.amount; inp.dataset.auto = '1'; setHint(`✔ ดึงจาก Project list OM: ${plant} / ${act}`, 'ok'); }
  else if (+inp.value !== +e.amount) setHint(`แก้ไขเอง (BOQ ใน Project list OM = ${Number(e.amount).toLocaleString()}) • `, 'warn'), hint.insertAdjacentHTML('beforeend', `<a href="#" onclick="ppmAutofillBOQ(${k},true);return false">↺ ใช้ค่าจาก Project list OM</a>`);
  else { inp.dataset.auto = '1'; setHint(`✔ ตรงกับ Project list OM: ${plant} / ${act}`, 'ok'); }
}
function ppmAutofillAll() { ppmRowIds().forEach(k => ppmAutofillBOQ(k)); }
function ppmOptRow(id, field, label, extra) {
  return `<div class="opt-row"><select id="${id}"${extra||''}></select><button type="button" class="btn-add-opt" title="เพิ่ม ${label}" onclick="addOpt('${field}','${label}','${id}')">＋</button><button type="button" class="btn-del-opt" title="ลบรายการที่เลือก" onclick="delOpt('${field}','${label}','${id}')">✕</button></div>`;
}
function ppmRowHtml(k) {
  const g = (l, inner) => `<div class="form-group"><label>${l}</label>${inner}</div>`;
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'].map((m,i)=>`<option value="${i+1}">${i+1}. ${m}</option>`).join('');
  return `<div class="ppm-row" data-k="${k}">
    <div class="ppm-row-h"><b class="ppm-row-n"></b><button type="button" class="btn-del-row" title="ลบงานนี้" onclick="ppmDelRow(${k})">🗑 ลบงานนี้</button></div>
    <div class="form-grid cols-4">
      ${g('PM&AN', ppmOptRow(`pp-type-${k}`,'ppmType','PM&AN'))}
      ${g('Activity', ppmOptRow(`pp-activity-${k}`,'ppmActivity','Activity',` onchange="ppmAutofillBOQ(${k})"`))}
      ${g('Work Order (WO) <span class="lbl-hint">ว่าง = อัตโนมัติ</span>', `<input type="text" id="pp-wo-${k}" placeholder="WO-YYMM-001">`)}
      ${g('Round', `<input type="text" id="pp-round-${k}" placeholder="3/15">`)}
      ${g('ปี (Year)', `<select id="pp-year-${k}"></select>`)}
      ${g('เดือน', `<select id="pp-month-${k}">${months}</select>`)}
      ${g('Start', `<input type="date" id="pp-start-${k}" onchange="ppmCalcEnd(${k})">`)}
      ${g('Days', `<input type="number" id="pp-days-${k}" min="0" placeholder="จำนวนวัน" onchange="ppmCalcEnd(${k})">`)}
      ${g('END <span class="lbl-hint">(Start + Days)</span>', `<input type="date" id="pp-end-${k}" readonly style="background:#f1efe9">`)}
      ${g('BOQ (฿) <span class="lbl-hint">(เชื่อมจาก Project list OM)</span>', `<input type="number" id="pp-budget-${k}" min="0" step="0.01" oninput="this.dataset.auto='';ppmAutofillBOQ(${k})"><div class="boq-hint" id="pp-boqhint-${k}"></div>`)}
      ${g('Actual (฿)', `<input type="number" id="pp-actual-${k}" min="0" step="0.01">`)}
      ${g('Progress (%)', `<input type="number" id="pp-progress-${k}" min="0" max="100" placeholder="0–100" oninput="ppmProgChange(${k})">`)}
      ${g('สถานะ <span class="lbl-hint">(มี “เลื่อน”)</span>', ppmOptRow(`pp-status-${k}`,'ppmStatus','สถานะ'))}
      ${g('Subcontractor', ppmOptRow(`pp-team-${k}`,'ppmTeam','Subcontractor'))}
      ${g('Operator <span class="lbl-hint">(ทำหลายคน — เพิ่มช่องได้)</span>', `<div class="ops-box" id="pp-ops-${k}"></div>`)}
    </div>
    <div class="form-group full" style="margin-top:8px"><label>Remark (หมายเหตุ)</label><textarea id="pp-remark-${k}" rows="2" placeholder="หมายเหตุเพิ่มเติม..."></textarea></div>
  </div>`;
}
function ppmRenumber() {
  const ks = ppmRowIds();
  document.querySelectorAll('#pp-rows .ppm-row-n').forEach((e,i) => { e.textContent = `🛠️ งานที่ ${i+1}`; });
  const c = $('pp-row-count'); if (c) c.textContent = ks.length > 1 ? `(${ks.length} งาน)` : '';
  document.querySelectorAll('#pp-rows .btn-del-row').forEach(b => { b.style.visibility = ks.length > 1 ? 'visible' : 'hidden'; });
}
function ppmAddRow(rec) {
  const prev = ppmRowIds().slice(-1)[0], k = ++ppRowSeq, w = document.createElement('div');
  w.innerHTML = ppmRowHtml(k); $('pp-rows').appendChild(w.firstElementChild);
  const pv = id => prev ? $(`${id}-${prev}`).value : '';
  const d = rec ? null : {year: pv('pp-year') || ppmYear || 2026, month: pv('pp-month') || (new Date().getMonth()+1), type: pv('pp-type') || 'QPM', team: pv('pp-team'), ops: prev ? opsGet('pp-ops-' + prev) : []};
  fillPpmYearEl($('pp-year-' + k), rec ? rec.year : d.year);
  $('pp-month-' + k).value = rec ? rec.month : d.month;
  fillManaged('pp-type-' + k,     options.ppmType,     rec ? rec.type     : d.type);
  fillManaged('pp-activity-' + k, options.ppmActivity, rec ? rec.activity : '');
  fillManaged('pp-team-' + k,     options.ppmTeam,     rec ? rec.team     : d.team);
  opsInit('pp-ops-' + k, rec ? opsOf(rec) : d.ops);
  fillPpmStatus($('pp-status-' + k), rec ? ppmStatusOf(rec) : 'ยังไม่เริ่ม');
  if (rec) {
    $('pp-wo-' + k).value = rec.workOrder || '';
    $('pp-round-' + k).value = rec.round ?? ''; $('pp-start-' + k).value = rec.start || ''; $('pp-days-' + k).value = rec.days ?? '';
    $('pp-end-' + k).value = rec.end || ''; $('pp-budget-' + k).value = rec.budget ?? ''; $('pp-actual-' + k).value = rec.actual ?? '';
    $('pp-progress-' + k).value = Math.round((rec.progress||0)*100); $('pp-remark-' + k).value = rec.remark || '';
  } else { $('pp-progress-' + k).value = 0; }
  ppmAutofillBOQ(k);
  ppmRenumber();
  if (!rec && prev) $('pp-rows').lastElementChild.scrollIntoView({behavior:'smooth', block:'nearest'});
  return k;
}
function ppmDelRow(k) {
  if (ppmRowIds().length <= 1) return;
  const el = document.querySelector(`#pp-rows .ppm-row[data-k="${k}"]`); if (el) el.remove(); ppmRenumber();
}
function buildPpmSelects(rec) {                  // เฉพาะส่วน Project (Owner → Project)
  fillPpmOwner(rec ? rec.owner : '');
  fillPpmProject(rec ? rec.plant : '');
}
function ppmProjectChange(el) {
  const p = (pjRecords||[]).find(x=>x.name===el.value);
  if (!p) return;
  ppmFillProjInfo(el.value, true);
  if (p.owner) { fillPpmOwner(p.owner); }
  ppmAutofillAll();
}
function ppmFiltered() {
  return ppmRecords.filter(r => {
    if (ppmSrch     && !JSON.stringify(r).toLowerCase().includes(ppmSrch.toLowerCase())) return false;
    if (ppmYear     && r.year  !== +ppmYear)  return false;
    if (ppmMonth    && r.month !== +ppmMonth) return false;
    if (ppmType     && r.type  !== ppmType)   return false;
    if (ppmOwner    && r.owner !== ppmOwner)  return false;
    if (ppmActivity && r.activity !== ppmActivity) return false;
    if (ppmStatus)  { const sv = ppmStatusOf(r), st = sv==='เลื่อน'?'postponed':sv==='เสร็จแล้ว'?'done':sv==='กำลังดำเนินการ'?'inprog':'pending'; if (st !== ppmStatus) return false; }
    return true;
  });
}
function renderPlanPM() {
  const rows = ppmFiltered();
  $('ppm-total').textContent  = rows.length;
  $('ppm-qpm').textContent    = rows.filter(r=>r.type==='QPM').length;
  $('ppm-an').textContent     = rows.filter(r=>r.type==='AN').length;
  $('ppm-done').textContent   = rows.filter(r=>r.progress>=1).length;
  $('ppm-pct').textContent    = (rows.length ? Math.round(rows.reduce((s,r)=>s+(r.progress||0),0)/rows.length*100) : 0) + '%';
  $('ppm-budget').textContent = '฿' + Math.round(rows.reduce((s,r)=>s+(r.budget||0),0)).toLocaleString();
  $('ppm-count').textContent  = rows.length + ' รายการ';
  $('ppm-tbody').innerHTML = rows.length ? rows.map((r,i) => `
    <tr class="row-click" onclick="rowEdit(event,'ppm',${r.pid})" title="คลิกเพื่อแก้ไข">
      <td style="text-align:center">${r.month}</td>
      <td style="text-align:center">${i+1}</td>
      <td style="font-weight:600">${esc(r.plant)}</td>
      <td style="white-space:nowrap">${woCell(r.workOrder)}</td>
      <td style="text-align:right">${r.capacity?(+r.capacity).toFixed(4):'-'}</td>
      <td>${esc(r.owner)}</td>
      <td>${esc(r.activity)}</td>
      <td style="text-align:center">${ppmTypeChip(r.type)}</td>
      <td style="text-align:center">${esc(r.round)||'-'}</td>
      <td style="white-space:nowrap">${esc(r.start)||'-'}</td>
      <td style="white-space:nowrap">${esc(r.end)||'-'}</td>
      <td style="text-align:center">${r.days||'-'}</td>
      <td style="text-align:right">${r.budget?Math.round(r.budget).toLocaleString():'-'}</td>
      <td style="text-align:right">${r.actual?Math.round(r.actual).toLocaleString():'-'}</td>
      <td style="min-width:96px">${progBar(Math.round((r.progress||0)*100))}${ppmStatusOf(r)==='เลื่อน'?'<span class="badge b-inprog" style="margin-top:3px">เลื่อน</span>':''}</td>
      <td>${esc(r.team)}</td>
      <td>${opsBr(r)}</td>
      <td style="white-space:nowrap">
        <button class="btn-edit" onclick="openEditPpm(${r.pid})">✏️</button>
        <button class="btn-del"  onclick="delPpm(${r.pid})">🗑️</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="18" class="empty">ไม่พบรายการ</td></tr>';

  // Monthly chart — 3 bars/เดือน: QPM (สำเร็จ/คงเหลือ) • AN (สำเร็จ/คงเหลือ) • เลื่อน (QPM+AN)
  const qd=[],qp=[],ad=[],ap=[],qx=[],ax=[];
  for (let i=0;i<12;i++){
    const m=i+1;
    const q=rows.filter(r=>r.month===m&&r.type==='QPM'); const a=rows.filter(r=>r.month===m&&r.type==='AN');
    const pp = r => ppmStatusOf(r)==='เลื่อน';
    const qX=q.filter(pp).length, aX=a.filter(pp).length;
    const qDone=q.filter(r=>!pp(r)&&r.progress>=1).length, aDone=a.filter(r=>!pp(r)&&r.progress>=1).length;
    qd.push(qDone); qx.push(qX); qp.push(q.length-qDone-qX); ad.push(aDone); ax.push(aX); ap.push(a.length-aDone-aX);
  }
  if (ppmChart) ppmChart.destroy();
  ppmChart = new Chart($('ppmChart').getContext('2d'), {
    type:'bar',
    data:{ labels:['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'],
      datasets:[
        {label:'QPM สำเร็จ', data:qd, stack:'QPM', backgroundColor:'#35654E', borderRadius:2},
        {label:'QPM คงเหลือ',data:qp, stack:'QPM', backgroundColor:'#AFC9B8', borderRadius:2},
        {label:'QPM เลื่อน', data:qx, stack:'เลื่อน', backgroundColor:'#F0A030', borderRadius:2},
        {label:'AN สำเร็จ',  data:ad, stack:'AN',  backgroundColor:'#2E6DB4', borderRadius:2},
        {label:'AN คงเหลือ', data:ap, stack:'AN',  backgroundColor:'#B9D0EC', borderRadius:2},
        {label:'AN เลื่อน',  data:ax, stack:'เลื่อน', backgroundColor:'#E07B39', borderRadius:2},
      ] },
    options:{ responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{font:{size:10}}},y:{stacked:true,beginAtZero:true,grid:{color:'#f0ede8'},ticks:{font:{size:10},precision:0}}} }
  });

  // BOQ + Actual by Activity (grouped horizontal bars)
  const ab={}, aa={};
  rows.forEach(r=>{ if(r.activity){ ab[r.activity]=(ab[r.activity]||0)+(+r.budget||0); aa[r.activity]=(aa[r.activity]||0)+(+r.actual||0); } });
  const acts = Object.keys(ab).filter(a=>(ab[a]||0)+(aa[a]||0)>0).sort((x,y)=>((ab[y]||0)+(aa[y]||0))-((ab[x]||0)+(aa[x]||0))).slice(0,10);
  if (ppmBudgetChart) ppmBudgetChart.destroy();
  ppmBudgetChart = new Chart($('ppmBudgetChart').getContext('2d'), {
    type:'bar',
    data:{ labels:acts, datasets:[
      {label:'BOQ (฿)',    data:acts.map(a=>Math.round(ab[a]||0)), backgroundColor:'#35654E', borderRadius:3},
      {label:'Actual (฿)', data:acts.map(a=>Math.round(aa[a]||0)), backgroundColor:'#A9947A', borderRadius:3},
    ] },
    options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false,
      plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}},
      scales:{x:{beginAtZero:true,grid:{color:'#f0ede8'},ticks:{font:{size:9}}},y:{grid:{display:false},ticks:{font:{size:10}}}} }
  });
}
function openAddPpm() {
  ppmEditId = null;
  $('ppm-title').textContent = '➕ เพิ่มงาน PM & AN';
  $('ppm-form').reset(); $('ppm-modal').classList.remove('ppm-edit');
  buildPpmSelects(null);
  ['pp-ptype','pp-region','pp-province'].forEach(id => { $(id).value = ''; });
  $('pp-unit').value = 'MW.';
  $('pp-rows').innerHTML = ''; ppmAddRow(null);
  $('ppm-modal').classList.add('open');
}
function openEditPpm(pid) {
  const p = ppmRecords.find(x=>x.pid===pid); if (!p) return;
  ppmEditId = pid;
  $('ppm-title').textContent = '✏️ แก้ไขงาน PM & AN';
  $('ppm-modal').classList.add('ppm-edit');
  buildPpmSelects(p);
  $('pp-cap').value = p.capacity; $('pp-unit').value = p.unit || 'MW.';
  $('pp-ptype').value = p.ptype||''; $('pp-region').value = p.region||''; $('pp-province').value = p.province||'';
  ppmFillProjInfo(p.plant, false);
  $('pp-rows').innerHTML = ''; ppmAddRow(p);
  $('ppm-modal').classList.add('open');
}
function closePpm() { $('ppm-modal').classList.remove('open'); }
function savePpm() {
  const plant = $('pp-plant').value.trim();
  if (!plant) { alert('กรุณาเลือก/ระบุ Project'); return; }
  const numOr = v => { const f=parseFloat(v); return isNaN(f)?'':(f===Math.trunc(f)?Math.trunc(f):f); };
  const owner = $('pp-owner').value.trim(), old = ppmEditId ? ppmRecords.find(x=>x.pid===ppmEditId) : null;
  const ks = ppmRowIds(), out = [];
  let nextNo = old ? old.no : (Math.max(0, ...ppmRecords.map(p=>+p.no||0)) + 1);
  ks.forEach(k => {
    const v = id => $(`${id}-${k}`).value;
    if (!old && ks.length > 1 && !v('pp-activity') && !v('pp-start')) return;       // ข้ามแถวว่าง
    ppmCalcEnd(k);
    const rec = {
      pid: old ? old.pid : ppmNextId++,
      year: +v('pp-year') || 2026, month: +v('pp-month') || 1, no: old ? old.no : nextNo++,
      plant, capacity: numOr($('pp-cap').value), unit: $('pp-unit').value.trim()||'MW.',
      owner, activity: v('pp-activity').trim(), type: v('pp-type').trim()||'QPM', round: v('pp-round').trim(),
      budget: numOr(v('pp-budget'))||0, actual: numOr(v('pp-actual'))||0,
      progress: Math.max(0, Math.min(100, +v('pp-progress')||0))/100,
      start: v('pp-start'), end: v('pp-end'), days: numOr(v('pp-days'))||0,
      team: v('pp-team').trim(), operators: opsGet('pp-ops-' + k), operator: opsGet('pp-ops-' + k).join(', '), remark: v('pp-remark').trim(),
      ptype: $('pp-ptype').value.trim(), region: $('pp-region').value.trim(), province: $('pp-province').value.trim(),
      status: v('pp-status'),
    };
    rec.workOrder = v('pp-wo').trim() || woNext(rec.start, out);
    if (old) Object.keys(old).forEach(key => { if (!(key in rec)) rec[key] = old[key]; });
    out.push(rec);
  });
  if (!out.length) { alert('กรุณากรอกอย่างน้อย 1 งาน'); return; }
  if (plant && !(pjRecords||[]).some(p=>p.name===plant) && !options.ppmProject.includes(plant)) options.ppmProject.push(plant);
  out.forEach(r => [['ppmOwner',owner],['ppmActivity',r.activity],['ppmType',r.type],['ppmTeam',r.team],['ppmStatus',r.status]]
    .forEach(([key,val]) => { if (val && !options[key].includes(val)) options[key].push(val); }));
  out.forEach(r => opsRegister(r.operators));
  saveOpts();
  if (old) ppmRecords[ppmRecords.findIndex(x=>x.pid===old.pid)] = out[0]; else ppmRecords.push(...out);
  ppmSaveStore(); closePpm(); planpmInit(); renderCur();
  if (!old && typeof opAfterSave === 'function') out.forEach(r => opAfterSave('ppm', r.pid));
  if (!old && out.length > 1) toast(`เพิ่มงาน PM&AN ${out.length} รายการแล้ว`);
}
function delPpm(pid) {
  if (!confirm('ต้องการลบงานนี้?')) return;
  ppmRecords = ppmRecords.filter(p=>p.pid!==pid);
  ppmSaveStore(); planpmInit(); renderPlanPM();
}
// Map PM&AN Progress → Job Log status
function progToStatus(p) {
  p = +p || 0;
  if (p >= 1) return 'เสร็จแล้ว';
  if (p > 0)  return 'กำลังดำเนินการ';
  return 'รอดำเนินการ';
}
// Auto-link Plan PM&AN → Job Log when an activity's Start date is reached (deduped);
// status always reflects PM&AN Progress.
function syncPpmToJobLog() {
  const cutoff = today();
  const byPid = new Map(records.filter(r=>r.ppmPid!=null).map(r=>[r.ppmPid, r]));
  let added = 0, changed = false;
  (ppmRecords||[]).forEach(a => {
    const ex = byPid.get(a.pid);
    if (ex) {
      const st = progToStatus(a.progress);           // keep status in sync with Progress
      if (ex.status !== st) { ex.status = st; changed = true; }
      if (a.workOrder && ex.workOrder !== a.workOrder) { ex.workOrder = a.workOrder; changed = true; }   // WO เดียวกับงานใน Plan PM&AN
      return;
    }
    if (!a.start || a.start > cutoff) return;         // only up to today's date
    records.push({
      id: nextId++, ppmPid: a.pid, workOrder: a.workOrder || '',
      date: a.start, finish: a.end||'', plan: '',
      project: a.plant||'', owner: a.owner||'', typeOfWork: a.type||'',
      jobDescriptions: a.activity ? [a.activity] : [],
      details: a.round ? [String(a.round)] : [],
      operator: '', priority: 'Medium', status: progToStatus(a.progress), report: 'ยังไม่จัดทำ', slaHours: '', slaActual: '', slaDue: '', slaStatus: '',
    });
    if (a.plant    && !options.project.includes(a.plant))         options.project.push(a.plant);
    if (a.owner    && !options.owner.includes(a.owner))           options.owner.push(a.owner);
    if (a.type     && !options.typeOfWork.includes(a.type))       options.typeOfWork.push(a.type);
    if (a.activity && !options.jobDescriptions.includes(a.activity)) options.jobDescriptions.push(a.activity);
    added++; changed = true;
  });
  if (changed) { save(); saveOpts(); refreshTypeFilter(); refreshOwnerFilter(); refreshProjectFilter(); }
  return added;
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tab) {
  curTab = tab;
  document.body.dataset.tab = tab;   // ใช้กำหนดความกว้างเต็มจอเฉพาะบางหน้า
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab===tab));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id==='tab-'+tab));
  renderCur();
}
function renderCur() {
  ({dashboard:renderDashboard, worklog:renderWorkLog, calendar:(window.renderCalendar||(()=>{})),
    projects:renderProjects, planpm:renderPlanPM, staff:renderStaff}[curTab]||(()=>{}))();
}

// ── Helpers ───────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── Boot ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();
  loadOpts();
  initDashDates();
  refreshTypeFilter();
  refreshOwnerFilter();
  projInit();
  planpmInit();        // load PM&AN before the Work Plan (auto-pull depends on it)
  msInitAll();         // (ไม่ดึงงานจาก Plan PM&AN เข้าบันทึกงานอีกต่อไป)

  $('srch').addEventListener('input',  e => { srch=e.target.value; renderWorkLog(); });
  $('wl-from').addEventListener('change',e => { fFrom=e.target.value; renderWorkLog(); });
  $('wl-to').addEventListener('change',  e => { fTo=e.target.value;   renderWorkLog(); });
  $('db-start').addEventListener('change', applyRange);
  $('db-end').addEventListener('change', applyRange);
  $('pj-srch').addEventListener('input',   e => { pSrch=e.target.value;   renderProjects(); });
  $('pj-fregion').addEventListener('change',e => { pRegion=e.target.value; renderProjects(); });
  $('pj-ftype').addEventListener('change',  e => { pType=e.target.value;   renderProjects(); });
  $('ppm-srch').addEventListener('input',   e => { ppmSrch=e.target.value;   renderPlanPM(); });
  $('ppm-fyear').addEventListener('change', e => { ppmYear=e.target.value;   renderPlanPM(); });
  $('ppm-fmonth').addEventListener('change',e => { ppmMonth=e.target.value;  renderPlanPM(); });
  $('ppm-ftype').addEventListener('change', e => { ppmType=e.target.value;   renderPlanPM(); });
  $('ppm-factivity').addEventListener('change',e => { ppmActivity=e.target.value; renderPlanPM(); });
  $('ppm-fowner').addEventListener('change',e => { ppmOwner=e.target.value;  renderPlanPM(); });
  $('ppm-fstatus').addEventListener('change',e => { ppmStatus=e.target.value; renderPlanPM(); });
  $('pj-fstatus').addEventListener('change',e => { pStatus=e.target.value; renderProjects(); });
  $('pj-fomexp').addEventListener('change', e => { pOmexp=e.target.value;  renderProjects(); });
  $('pj-fowner').addEventListener('change', e => { pOwner=e.target.value;  renderProjects(); });

  switchTab('dashboard');
});
