// Generate a fully self-contained comps page: public/comps.html
//
//   node scripts/build-standalone.js   (or: npm run build-comps-page)
//
// The output embeds the dataset + taxonomy and a vanilla-JS app (filters,
// charts, tables) with NO external dependencies — it works opened directly
// from disk (file://) and is also served by Next at /comps.html. Re-run after
// editing data/comps-scrape.json.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const data = require(path.join(ROOT, 'data', 'comps-scrape.json'));

// ── Parse the taxonomy (single source of truth) for category + metric labels ─
const taxSrc = fs.readFileSync(path.join(ROOT, 'lib', 'compsTaxonomy.js'), 'utf8');

// Category objects are the only ones with a `color:` immediately after `label:`.
// Capture each category's metrics array too, for the schema reference.
const categories = [...taxSrc.matchAll(/\{\s*key:\s*'([a-z_]+)',\s*label:\s*'([^']+)',\s*color:\s*'[^']+',\s*metrics:\s*\[([\s\S]*?)\]/g)]
  .map((m) => ({
    key: m[1],
    label: m[2],
    metrics: [...m[3].matchAll(/\{\s*key:\s*'([a-z_]+)',\s*label:\s*'([^']+)',\s*defaultUnit:\s*'([^']*)'/g)]
      .map((x) => ({ key: x[1], label: x[2], unit: x[3] })),
  }));

// Every `{ key, label, defaultUnit, ... }` is a metric.
const metricLabels = {};
for (const m of taxSrc.matchAll(/\{\s*key:\s*'([a-z_]+)',\s*label:\s*'([^']+)',\s*defaultUnit:/g)) {
  metricLabels[m[1]] = m[2];
}

// ── Flatten metrics with deal context (mirrors the /api/comps/metrics join) ──
const deals = data.deals.map((d, i) => ({ ...d, id: i + 1 }));
const metrics = [];
for (const d of deals) {
  for (const m of d.metrics || []) {
    metrics.push({
      deal_id: d.id,
      deal_name: d.name,
      technology: d.technology || null,
      deal_type: d.deal_type || null,
      scheme: d.scheme || null,
      program: d.program || null,
      state: d.state || null,
      capacity_mw: d.capacity_mw ?? null,
      capacity_mwh: d.capacity_mwh ?? null,
      transaction_date: d.transaction_date || null,
      category: m.category,
      metric: m.metric,
      value: m.value ?? null,
      unit: m.unit || null,
      basis: m.basis || null,
      source: m.source || d.source || null,
      source_url: m.source_url || d.source_url || null,
      confidence: m.confidence || null,
      notes: m.notes || null,
    });
  }
}

const dealsLite = deals.map((d) => ({
  id: d.id, name: d.name, counterparty: d.counterparty, seller: d.seller,
  technology: d.technology, deal_type: d.deal_type, scheme: d.scheme || null, program: d.program || null, state: d.state,
  capacity_mw: d.capacity_mw ?? null, capacity_mwh: d.capacity_mwh ?? null,
  status: d.status, transaction_date: d.transaction_date, currency: d.currency,
  source: d.source, source_url: d.source_url, confidence: d.confidence, notes: d.notes,
  metric_count: (d.metrics || []).length,
}));

const PAYLOAD = JSON.stringify({
  meta: data._meta || {}, deals: dealsLite, metrics, categories, metricLabels,
}).replace(/</g, '\\u003c');

// ── HTML template ───────────────────────────────────────────────────────────
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CS Capital — Comps Research</title>
<style>
  :root { --bg:#f1f5f9; --card:#fff; --line:#e2e8f0; --ink:#0f172a; --mut:#64748b; --blue:#2563eb; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--ink); }
  header { background:#0f172a; color:#fff; padding:0 24px; height:56px; display:flex; align-items:center; gap:14px; }
  header .mark { width:32px; height:32px; background:var(--blue); border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
  header .t1 { font-weight:700; font-size:14px; line-height:1.1; }
  header .t2 { font-size:9px; letter-spacing:.12em; text-transform:uppercase; color:#94a3b8; }
  main { padding:20px 24px 60px; max-width:1280px; margin:0 auto; }
  h1 { font-size:20px; margin:0 0 2px; }
  .sub { font-size:12px; color:var(--mut); margin:0 0 16px; max-width:760px; }
  .cards { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .card .n { font-size:24px; font-weight:700; }
  .card .l { font-size:11px; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); }
  .panel { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px; margin-bottom:16px; }
  .panel h2 { font-size:13px; margin:0 0 10px; color:#334155; }
  .charts { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
  @media (max-width:900px){ .charts{grid-template-columns:1fr} .cards{grid-template-columns:repeat(2,1fr)} }
  .controls { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:14px; }
  input, select { border:1px solid #cbd5e1; border-radius:6px; padding:6px 8px; font-size:13px; background:#fff; }
  input[type=text]{ width:230px; }
  .toggle { display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  .toggle button { border:0; background:#fff; color:var(--mut); padding:6px 12px; font-size:13px; cursor:pointer; text-transform:capitalize; }
  .toggle button.active { background:var(--blue); color:#fff; }
  .count { margin-left:auto; font-size:12px; color:#94a3b8; }
  .link { color:var(--mut); font-size:13px; text-decoration:underline; cursor:pointer; background:none; border:0; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  thead th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--mut); padding:8px 10px; border-bottom:1px solid var(--line); background:#f8fafc; }
  tbody td { padding:8px 10px; border-bottom:1px solid #f1f5f9; }
  tbody tr:hover { background:#f8fafc; }
  .r { text-align:right; } .c { text-align:center; }
  .grp { background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; margin-bottom:14px; }
  .grp .hd { padding:8px 12px; font-weight:600; font-size:13px; border-bottom:1px solid var(--line); }
  .badge { display:inline-block; padding:1px 6px; border-radius:5px; font-size:10px; font-weight:600; }
  .b-High{background:#d1fae5;color:#065f46;} .b-Medium{background:#fef3c7;color:#92400e;}
  .b-Low{background:#ffedd5;color:#9a3412;} .b-Illustrative{background:#e2e8f0;color:#475569;}
  .muted { color:#94a3b8; }
  a { color:var(--blue); text-decoration:none; } a:hover{ text-decoration:underline; }
  .src { font-size:11px; }
  .dealmeta { font-size:11px; color:#94a3b8; }
  .bar-row { display:flex; align-items:center; gap:8px; margin:3px 0; font-size:11px; }
  .bar-lab { width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#475569; }
  .bar-wrap { flex:1; background:#f1f5f9; border-radius:3px; height:16px; position:relative; }
  .bar-fill { height:16px; border-radius:3px; }
  .bar-val { width:74px; text-align:right; font-variant-numeric:tabular-nums; color:#334155; }
  .note { font-size:11px; color:#94a3b8; margin-top:6px; }
  footer { font-size:11px; color:#94a3b8; max-width:1280px; margin:0 auto; padding:0 24px 40px; }
</style>
</head>
<body>
<header>
  <div class="mark">CS</div>
  <div><div class="t1">CS Capital</div><div class="t2">Comps Research — standalone</div></div>
</header>
<main>
  <h1>Comps Research</h1>
  <p class="sub" id="subline"></p>
  <div class="cards" id="cards"></div>

  <div class="panel">
    <h2>Cost comparison (filtered)</h2>
    <div class="charts">
      <div><div class="muted" style="font-size:11px;margin-bottom:6px">Per MW ($/MW)</div><div id="chartMw"></div></div>
      <div><div class="muted" style="font-size:11px;margin-bottom:6px">Per MWh ($/MWh)</div><div id="chartMwh"></div></div>
    </div>
    <div class="note">Bars include directly-quoted $/MW &amp; $/MWh metrics plus totals (capex, debt, EV) normalised by capacity. Coloured by category.</div>
  </div>

  <div class="controls">
    <div class="toggle"><button data-v="metrics" class="active">metrics</button><button data-v="deals">deals</button></div>
    <button class="link" id="schemaToggle">Show schema reference</button>
    <input type="text" id="q" placeholder="Search deal or metric…" />
    <select id="fCat"></select>
    <select id="fTech"></select>
    <select id="fState"></select>
    <select id="fType"></select>
    <select id="fScheme"></select>
    <button class="link" id="clear">Clear</button>
    <span class="count" id="count"></span>
  </div>

  <div id="schema" style="display:none"></div>
  <div id="content"></div>
</main>
<footer id="footer"></footer>

<script>
const DATA = ${PAYLOAD};
const PALETTE = ['#6366f1','#10b981','#14b8a6','#0ea5e9','#06b6d4','#f59e0b','#84cc16','#f43f5e','#8b5cf6','#d946ef','#a855f7','#64748b'];
const catColor = {}; DATA.categories.forEach((c,i)=>catColor[c.key]=PALETTE[i%PALETTE.length]);
const catLabel = {}; DATA.categories.forEach(c=>catLabel[c.key]=c.label);
const mLabel = (k)=>DATA.metricLabels[k]||k;
const MONEY={'$bn':1e9,'$m':1e6,'$k':1e3,'$':1};

function perUnit(r){
  const v=Number(r.value); if(!isFinite(v))return {};
  if(r.unit==='$/MW')return {perMw:v};
  if(r.unit==='$/MWh')return {perMwh:v};
  const mult=MONEY[r.unit];
  if(mult!=null && (r.basis==='total'||r.basis==='one_off'||r.basis==='per_annum')){
    const abs=v*mult, o={};
    if(r.capacity_mw)o.perMw=abs/Number(r.capacity_mw);
    if(r.capacity_mwh)o.perMwh=abs/Number(r.capacity_mwh);
    return o;
  }
  return {};
}
function money(n){ if(n==null||!isFinite(n))return '—'; if(Math.abs(n)>=1e6)return '$'+(n/1e6).toFixed(2)+'m'; if(Math.abs(n)>=1e3)return '$'+(n/1e3).toFixed(0)+'k'; return '$'+n.toFixed(2); }
function fmtVal(r){
  const v=Number(r.value); if(!isFinite(v))return '—'; const u=r.unit||'';
  const n=(x)=>x.toLocaleString(undefined,{maximumFractionDigits:2});
  if(u==='$bn')return '$'+n(v)+'bn'; if(u==='$m')return '$'+n(v)+'m'; if(u==='$k')return '$'+n(v)+'k'; if(u==='$')return '$'+n(v);
  if(u==='%')return n(v)+'%'; if(u==='x')return n(v)+'x'; if(u==='ratio')return n(v);
  if(u==='years')return n(v)+' yr'; if(u==='year')return String(Math.round(v)); if(u==='hours')return n(v)+' h'; if(u==='km')return n(v)+' km';
  if(u.startsWith('$'))return '$'+n(v)+u.slice(1);
  return n(v)+' '+u;
}
function fmtCap(d){ const p=[]; if(d.capacity_mw)p.push(Number(d.capacity_mw).toLocaleString()+' MW'); if(d.capacity_mwh)p.push(Number(d.capacity_mwh).toLocaleString()+' MWh'); return p.join(' / ')||'—'; }
function srcLink(s,u){ if(!s&&!u)return '<span class="muted">—</span>'; const l=(s||'source'); return u?'<a class="src" href="'+u+'" target="_blank" rel="noopener">'+esc(l)+' ↗</a>':'<span class="src muted">'+esc(l)+'</span>'; }
function badge(c){ return c?'<span class="badge b-'+c+'">'+c+'</span>':''; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,(m)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

// state
let view='metrics';
const F={q:'',cat:'',tech:'',state:'',type:'',scheme:''};

function uniq(arr){ return [...new Set(arr.filter(Boolean))].sort(); }
function fillSelect(el,opts,all){ el.innerHTML='<option value="">'+all+'</option>'+opts.map(o=>'<option value="'+esc(o.v??o)+'">'+esc(o.l??o)+'</option>').join(''); }

function filteredMetrics(){
  return DATA.metrics.filter(m=>{
    if(F.cat&&m.category!==F.cat)return false;
    if(F.tech&&m.technology!==F.tech)return false;
    if(F.state&&m.state!==F.state)return false;
    if(F.type&&m.deal_type!==F.type)return false;
    if(F.scheme&&m.scheme!==F.scheme)return false;
    if(F.q){ const h=(m.deal_name+' '+mLabel(m.metric)+' '+m.metric).toLowerCase(); if(!h.includes(F.q.toLowerCase()))return false; }
    return true;
  });
}
function filteredDeals(){
  return DATA.deals.filter(d=>{
    if(F.tech&&d.technology!==F.tech)return false;
    if(F.state&&d.state!==F.state)return false;
    if(F.type&&d.deal_type!==F.type)return false;
    if(F.scheme&&d.scheme!==F.scheme)return false;
    if(F.q&&!d.name.toLowerCase().includes(F.q.toLowerCase()))return false;
    return true;
  });
}

function renderCards(){
  const techs=uniq(DATA.deals.map(d=>d.technology)).length;
  const cats=uniq(DATA.metrics.map(m=>m.category)).length;
  const cards=[['Deals tracked',DATA.deals.length],['Observations',DATA.metrics.length],['Technologies',techs],['Metric categories',cats]];
  document.getElementById('cards').innerHTML=cards.map(c=>'<div class="card"><div class="n">'+c[1]+'</div><div class="l">'+c[0]+'</div></div>').join('');
}

function chart(elId,key){
  const cand=filteredMetrics().map(m=>({m,pu:perUnit(m)[key]})).filter(x=>x.pu>0);
  // De-duplicate: a deal's total (EV, capex, debt) and an explicit per-unit
  // metric can normalise to the same number. Prefer the explicit per-unit row,
  // then keep one bar per (deal, rounded value).
  cand.sort((a,b)=>{ const ax=(a.m.unit==='$/MW'||a.m.unit==='$/MWh')?0:1, bx=(b.m.unit==='$/MW'||b.m.unit==='$/MWh')?0:1; return ax-bx; });
  const seen=new Set(), uniq=[];
  for(const x of cand){ const k=x.m.deal_id+'|'+Math.round(x.pu/1000); if(seen.has(k))continue; seen.add(k); uniq.push(x); }
  const rows=uniq.sort((a,b)=>b.pu-a.pu).slice(0,14);
  const el=document.getElementById(elId);
  if(!rows.length){ el.innerHTML='<div class="muted" style="font-size:12px">No '+key.replace('per','per ')+' values in the current filter.</div>'; return; }
  const max=Math.max(...rows.map(r=>r.pu));
  el.innerHTML=rows.map(r=>{
    const w=Math.max(2,(r.pu/max)*100);
    const lab=r.m.deal_name+' · '+mLabel(r.m.metric);
    return '<div class="bar-row"><div class="bar-lab" title="'+esc(lab)+'">'+esc(lab)+'</div>'+
      '<div class="bar-wrap"><div class="bar-fill" style="width:'+w+'%;background:'+(catColor[r.m.category]||'#64748b')+'"></div></div>'+
      '<div class="bar-val">'+money(r.pu)+'</div></div>';
  }).join('');
}

function renderMetrics(){
  const rows=filteredMetrics();
  const byCat={}; rows.forEach(m=>{(byCat[m.category]=byCat[m.category]||[]).push(m);});
  const order=DATA.categories.map(c=>c.key).filter(k=>byCat[k]);
  if(!order.length){ return '<div class="panel muted" style="text-align:center">No observations match the filters.</div>'; }
  return order.map(k=>{
    const items=byCat[k];
    return '<div class="grp"><div class="hd" style="border-left:4px solid '+catColor[k]+'">'+catLabel[k]+' <span class="muted" style="font-weight:400">'+items.length+'</span></div>'+
      '<table><thead><tr><th>Deal</th><th>Metric</th><th class="r">Value</th><th class="r">$/MW</th><th class="r">$/MWh</th><th>Conf.</th><th>Source</th></tr></thead><tbody>'+
      items.map(m=>{ const pu=perUnit(m); return '<tr>'+
        '<td><div>'+esc(m.deal_name)+'</div><div class="dealmeta">'+[m.technology,m.state].filter(Boolean).map(esc).join(' · ')+'</div></td>'+
        '<td>'+esc(mLabel(m.metric))+'</td>'+
        '<td class="r" style="font-weight:600">'+fmtVal(m)+'</td>'+
        '<td class="r muted">'+money(pu.perMw)+'</td>'+
        '<td class="r muted">'+money(pu.perMwh)+'</td>'+
        '<td>'+badge(m.confidence)+'</td>'+
        '<td title="'+esc([m.source,m.notes].filter(Boolean).join(' — '))+'">'+srcLink(m.source,m.source_url)+'</td>'+
      '</tr>'; }).join('')+
      '</tbody></table></div>';
  }).join('');
}

function renderDeals(){
  const rows=filteredDeals();
  if(!rows.length)return '<div class="panel muted" style="text-align:center">No deals match the filters.</div>';
  return '<div class="grp"><table><thead><tr><th>Deal</th><th>Type</th><th>Scheme / round</th><th>Tech</th><th>State</th><th>Capacity</th><th>Date</th><th class="c">Metrics</th><th>Conf.</th></tr></thead><tbody>'+
    rows.map(d=>'<tr>'+
      '<td><div>'+esc(d.name)+'</div>'+(d.counterparty&&d.counterparty!=='—'?'<div class="dealmeta">'+esc(d.counterparty)+(d.seller&&d.seller!=='—'?' ← '+esc(d.seller):'')+'</div>':'')+
        ((d.source||d.source_url)?'<div class="dealmeta">'+srcLink(d.source,d.source_url)+'</div>':'')+'</td>'+
      '<td>'+esc(d.deal_type||'—')+'</td>'+
      '<td>'+(d.scheme?'<span class="badge" style="background:#dbeafe;color:#1e40af">'+esc(d.scheme)+'</span>'+(d.program?'<div class="dealmeta">'+esc(d.program)+'</div>':''):'<span class="muted">—</span>')+'</td>'+
      '<td>'+esc(d.technology||'—')+'</td><td>'+esc(d.state||'—')+'</td>'+
      '<td>'+fmtCap(d)+'</td><td>'+(d.transaction_date?String(d.transaction_date).slice(0,10):'—')+'</td>'+
      '<td class="c">'+(d.metric_count||0)+'</td><td>'+badge(d.confidence)+'</td>'+
    '</tr>').join('')+
    '</tbody></table></div>';
}

function renderSchema(){
  return '<div class="panel"><div class="muted" style="font-size:11px;margin-bottom:10px">Tall schema — each row is one observation: <b>deal → category → metric → value + unit + basis</b>. Canonical taxonomy (lib/compsTaxonomy.js):</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px">'+
    DATA.categories.map(c=>'<div style="border:1px solid var(--line);border-radius:8px;padding:10px">'+
      '<span class="badge" style="background:'+(catColor[c.key]||"#64748b")+"22;color:"+(catColor[c.key]||"#334155")+';margin-bottom:6px;display:inline-block">'+esc(c.label)+'</span>'+
      '<div style="font-size:11px;color:#475569">'+(c.metrics||[]).map(m=>'<div style="display:flex;justify-content:space-between;gap:6px;padding:1px 0"><span>'+esc(m.label)+'</span><span class="muted" style="white-space:nowrap">'+esc(m.unit)+'</span></div>').join('')+'</div>'+
    '</div>').join('')+'</div></div>';
}

function render(){
  chart('chartMw','perMw'); chart('chartMwh','perMwh');
  document.getElementById('content').innerHTML = view==='metrics'?renderMetrics():renderDeals();
  const n = view==='metrics'?filteredMetrics().length+' observations':filteredDeals().length+' deals';
  document.getElementById('count').textContent=n;
}

function init(){
  document.getElementById('subline').textContent = (DATA.meta.scope||'')+ '  ·  Self-contained snapshot generated '+(DATA.meta.scraped_at||'');
  document.getElementById('footer').textContent = DATA.meta.disclaimer||'';
  renderCards();
  fillSelect(document.getElementById('fCat'), DATA.categories.map(c=>({v:c.key,l:c.label})), 'All categories');
  fillSelect(document.getElementById('fTech'), uniq(DATA.deals.map(d=>d.technology)), 'All tech');
  fillSelect(document.getElementById('fState'), uniq(DATA.deals.map(d=>d.state)), 'All states');
  fillSelect(document.getElementById('fType'), uniq(DATA.deals.map(d=>d.deal_type)), 'All deal types');
  fillSelect(document.getElementById('fScheme'), uniq(DATA.deals.map(d=>d.scheme)), 'All schemes');
  document.getElementById('q').addEventListener('input',e=>{F.q=e.target.value;render();});
  document.getElementById('fCat').addEventListener('change',e=>{F.cat=e.target.value;render();});
  document.getElementById('fTech').addEventListener('change',e=>{F.tech=e.target.value;render();});
  document.getElementById('fState').addEventListener('change',e=>{F.state=e.target.value;render();});
  document.getElementById('fType').addEventListener('change',e=>{F.type=e.target.value;render();});
  document.getElementById('fScheme').addEventListener('change',e=>{F.scheme=e.target.value;render();});
  document.getElementById('clear').addEventListener('click',()=>{F.q=F.cat=F.tech=F.state=F.type=F.scheme='';document.getElementById('q').value='';['fCat','fTech','fState','fType','fScheme'].forEach(id=>document.getElementById(id).value='');render();});
  document.querySelectorAll('.toggle button').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.v;document.querySelectorAll('.toggle button').forEach(x=>x.classList.toggle('active',x===b));render();}));
  let schemaOpen=false;
  document.getElementById('schemaToggle').addEventListener('click',()=>{
    schemaOpen=!schemaOpen;
    const el=document.getElementById('schema');
    el.style.display=schemaOpen?'block':'none';
    el.innerHTML=schemaOpen?renderSchema():'';
    document.getElementById('schemaToggle').textContent=(schemaOpen?'Hide':'Show')+' schema reference';
  });
  render();
}
init();
</script>
</body>
</html>
`;

const out = path.join(ROOT, 'public', 'comps.html');
fs.writeFileSync(out, html);
console.log('Wrote ' + path.relative(ROOT, out) + ' (' + deals.length + ' deals, ' + metrics.length + ' metrics, ' + (html.length / 1024).toFixed(0) + ' kB)');
