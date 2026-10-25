// County & district builder. Tables live in regions.js, county geometry in counties.js.

const MAX_TAGS = 32;
const DISTRICT_OF = {};
for (const [k, d] of Object.entries(DISTRICTS)) d.c.forEach(c => DISTRICT_OF[c] = k);

// Approximate OKI metro membership (metro statistical areas). OKI's MeshMapper borders govern.

/*
 opts: { naming: "iso"|"prop", countyTags: bool, oki: bool, fw: "1.16"|"1.15"|"1.14",
         maxLen: number, defaultLevel: "county"|"district"|"state" }
 sel: array of {name, st} ; home: {name, st}
 Returns { tree: Map(name -> parent), order: [names], commands: [...], tags, warnings, levels }
*/
function buildPlan(sel, home, opts) {
  const parent = new Map();     // insertion order = preorder-ish; we sort later
  const put = (n, p) => { if (!parent.has(n)) parent.set(n, p); };
  const iso = opts.naming === "iso";
  const inRoot = iso ? "us-in" : "in";
  const inState = iso ? "us-in" : "in-us";
  const dTag = d => iso ? `us-in-${d}` : `in-us-${d}`;
  const cTag = (d, c) => `${dTag(d)}-${c}`;
  const warnings = [];

  const indiana = sel.filter(s => s.st === "IN");
  const other = sel.filter(s => s.st !== "IN");

  const T = Object.assign({phase1:true, midwest:false, southeast:false, oki:false, metros:false, usin:false}, opts.tags || {});
  if (T.phase1) put("us", "*");
  if (opts.oki) { T.midwest = T.oki = T.metros = true; T.southeast = T.southeast || other.some(s => s.st === "KY"); }
  if (T.midwest) put("us-midwest", "*");
  if (T.southeast) put("us-southeast", "*");
  const stateParent = st => T.phase1 ? "us" : st === "KY" ? (T.southeast ? "us-southeast" : "*") : (T.midwest ? "us-midwest" : "*");
  const districts = opts.districtTags && indiana.length > 0;
  const needUsIn = T.phase1 || (iso ? districts : (T.usin || T.metros && indiana.some(s => OKI_METRO["IN:" + s.name])));
  if (T.phase1) put("us-in", "us");

  if (districts) {
    if (!iso) { put("in", "*"); put("in-us", "in"); }
    if (needUsIn) put("us-in", stateParent("IN"));
    const ds = [...new Set(indiana.map(s => DISTRICT_OF[s.name]))].sort((a, b) => DISTRICTS[a].n - DISTRICTS[b].n);
    for (const d of ds) {
      put(dTag(d), inState);
      if (opts.countyTags) {  // county tags sit under district tags
        indiana.filter(s => DISTRICT_OF[s.name] === d).map(s => CODES[s.name]).sort()
          .forEach(c => put(cTag(d, c), dTag(d)));
      }
    }
  } else if (needUsIn) put("us-in", stateParent("IN"));
  if (T.phase1) ["OH","KY","MI","IL"].forEach(st => put(STATE_TAG[st], "us"));
  for (const st of [...new Set(other.map(s => s.st))].sort()) put(STATE_TAG[st], stateParent(st));

  if (T.metros) {
    const metros = new Map();
    for (const s of sel) {
      const m = OKI_METRO[`${s.st}:${s.name}`];
      if (m && !metros.has(m)) metros.set(m, s.st === "IN" ? "us-in" : STATE_TAG[s.st]);
    }
    [...metros.keys()].sort().forEach(m => put(m, metros.get(m)));
  }
  if (T.oki) put("oki", "*");
  for (const c of (opts.custom || [])) {
    if (!/^[a-z0-9][a-z0-9-]{0,29}$/.test(c)) { warnings.push({sev:"crit", text:`Custom tag "${c}" must be lowercase letters, digits, and hyphens, 30 characters or fewer.`}); continue; }
    if (parent.has(c)) { warnings.push({sev:"warn", text:`Custom tag "${c}" is already in the set.`}); continue; }
    put(c, "*");
  }

  // Preorder walk so every parent is defined before its children.
  const kids = new Map();
  for (const [n, p] of parent) { if (!kids.has(p)) kids.set(p, []); kids.get(p).push(n); }
  const order = [];
  const walk = p => (kids.get(p) || []).forEach(n => { order.push(n); walk(n); });
  walk("*");

  // Levels for default/companion scope
  const hd = home && home.st === "IN" ? DISTRICT_OF[home.name] : null;
  const levels = {
    county: hd && districts && opts.countyTags ? cTag(hd, CODES[home.name]) : null,
    district: hd && districts ? dTag(hd) : null,
    state: home ? (home.st === "IN" ? (iso || districts ? inRoot : "us-in") : STATE_TAG[home.st]) : (T.phase1 ? "us-in" : null),
    oki: T.oki ? "oki" : null,
    midwest: T.midwest ? "us-midwest" : null,
  };
  if (!iso && districts && home && home.st === "IN") levels.state = "in";

  // Commands
  const maxLen = opts.maxLen || 140;
  const commands = [];
  if (opts.fw === "1.16") {
    const chain = n => { const a = []; for (let x = n; x !== "*"; x = parent.get(x)) a.unshift(x); return a; };
    let cmd = [], real = 0, cursor = "*";
    const text = t => "region def " + t.join(" ");
    for (let i = 0; i < order.length; i++) {
      const n = order[i], next = order[i + 1];
      const jumpTo = next === undefined ? n : parent.get(next);
      const tok = jumpTo === n ? n : `${n}|${jumpTo}`;
      if (cmd.length === 0) cmd = chain(cursor);
      if (real > 0 && text([...cmd, tok]).length > maxLen) {
        commands.push(text(cmd)); cmd = [...chain(cursor)]; real = 0;
      }
      cmd.push(tok); real++;
      cursor = jumpTo;
    }
    if (real) commands.push(text(cmd));
  } else {
    for (const n of order) {
      const p = parent.get(n);
      commands.push(p === "*" ? `region put ${n}` : `region put ${n} ${p}`);
      if (opts.fw === "1.14") commands.push(`region allowf ${n}`);
    }
  }
  const defTag = opts.defaultLevel === "none" ? null : (levels[opts.defaultLevel] || levels.district || levels.state);
  if (defTag) {
    commands.push(`region default ${defTag}`);
    warnings.push({sev:"warn", text:`region default ${defTag} scopes this repeater's own adverts and replies to ${defTag}, so repeaters without that tag drop them. Indiana repeaters leave the default off; choose None to stay open.`});
  }
  commands.push("region allowf *");
  commands.push("region save");

  const tags = order.length;
  if (tags > 32) warnings.push({sev:"crit", text:`${tags} tags exceeds the firmware limit of 32. Turn off county tags or remove counties.`});
  else if (tags > 24) warnings.push({sev:"warn", text:`${tags} of 32 tag slots used. Leave room for tags added later.`});
  const tooLong = commands.find(c => c.length > maxLen);
  if (tooLong) warnings.push({sev:"warn", text:`A command is ${tooLong.length} characters, over the ${maxLen} limit you set.`});
  for (const n of order) if (n.length > 30) warnings.push({sev:"crit", text:`Tag "${n}" is over 30 characters.`});

  // Discover Regions reply: mirrors RegionMap::exportNamesTo with a 172-byte buffer (184-byte payload minus 12).
  // Assumes a freshly configured node (tags stored in the order created) with flood allowed on "*".
  const DISC = 172;
  let used = 2; const hidden = [];
  for (const n of order) { if (used + n.length + 2 < DISC) used += n.length + 1; else hidden.push(n); }
  const discovery = { used: Math.max(0, used - 1), max: DISC, hidden };
  if (hidden.length) warnings.push({sev:"warn", text:`Discover Regions and MeshMapper will not list ${hidden.length} tag${hidden.length>1?"s":""} (${hidden.join(", ")}). The reply holds 172 bytes of names. These tags still forward traffic; they are just invisible to discovery.`});

  return { parent, order, commands, tags, warnings, levels, defTag, discovery };
}

// Mirror of MeshCore's region def / region put parsing, for verification.
function simulate(commands) {
  const regions = new Map(); // name -> parent
  const findPrefix = p => { if (p === "*") return "*"; if (regions.has(p)) return p; let part = null; for (const n of regions.keys()) if (n.startsWith(p)) part = n; return part; };
  const putRegion = (n, p) => { regions.set(n, p); return n; };
  for (const c of commands) {
    if (c.startsWith("region def ")) {
      let cursor = "*";
      for (const tok of c.slice(11).trim().split(/\s+/)) {
        const bar = tok.indexOf("|");
        const name = bar < 0 ? tok : tok.slice(0, bar);
        const jump = bar < 0 ? null : tok.slice(bar + 1);
        putRegion(name, cursor);
        if (jump !== null) { const j = findPrefix(jump); if (!j) throw new Error("unknown jump " + jump); cursor = j; }
        else cursor = name;
      }
    } else if (c.startsWith("region put ")) {
      const [, , n, p] = c.split(" ");
      const par = p ? findPrefix(p) : "*";
      if (!par) throw new Error("unknown parent " + p);
      putRegion(n, par);
    }
  }
  return regions;
}

function verify(plan) {
  try {
    const got = simulate(plan.commands);
    if (got.size !== plan.parent.size) return false;
    for (const [n, p] of plan.parent) if (got.get(n) !== p) return false;
    return true;
  } catch (e) { return false; }
}

if (typeof module !== "undefined") module.exports = { MAX_TAGS, buildPlan, simulate, verify, CODES, DISTRICTS, DISTRICT_OF };

const $ = id => document.getElementById(id);
const key = c => `${c.st}:${c.name}`;
const byKey = new Map(COUNTIES.map(c => [key(c), c]));
const state = {
  sel: [],
  home: null,
  channels: [
    {name:"Public", reach:"none"},
    {name:"#porchlight", reach:"none"},
    {name:"#emergency", reach:"none"},
    {name:"#meshcore", reach:"none"},
    {name:"#skywarn", reach:"none"},
    {name:"#weather", reach:"none"},
    {name:"#test", reach:"none"},
  ],
  compDefault: "none",
  tags: {phase1:true, midwest:false, southeast:false, oki:false, metros:false, usin:false},
  custom: [],
};
const TAGDEFS = [
  {k:"phase1", name:"Phase 1", sum:"us, us-in, us-oh, us-ky, us-mi, us-il",
   def:"The six tags every Indiana repeater carries, so every neighbouring state's scoped traffic passes through. This is what the <a href=\"../meshcore/#owner-h\">Get on the mesh</a> page sets up. Keep it on."},
  {k:"oki", name:"oki", sum:"OKI Mesh, Cincinnati tri-state",
   def:"OKI Mesh's group-wide tag. A message scoped to oki crosses every repeater that carries it. OKI Mesh covers Hamilton County, Ohio and the counties next to it: Butler, Clermont and Warren (OH), Boone, Campbell and Kenton (KY), and Dearborn (IN). Add it if your repeater is in or near those counties. Their <a href=\"https://docs.okimesh.org/books/oki-mesh-alliance/page/oki-mesh-region-scopes\" target=\"_blank\" rel=\"noopener\">region plan</a> has the details."},
  {k:"midwest", name:"us-midwest", sum:"OKI meta region for midwestern states",
   def:"In OKI Mesh's region plan, the level above Ohio, Indiana, Illinois, and Michigan. Without Phase 1 it becomes the parent of the state tags. Kentucky repeaters carry us-southeast instead, so anything scoped to us-midwest stops at the Ohio River unless a border repeater carries both."},
  {k:"southeast", name:"us-southeast", sum:"OKI meta region for Kentucky and the South",
   def:"OKI Mesh's plan places Kentucky under this tag. Indiana repeaters along the Ohio River can add it so traffic scoped from Kentucky can cross into Indiana. The page reminds you when a Kentucky county is selected and this tag is off."},
  {k:"metros", name:"OKI metros", sum:"ind, fwa, sdf, cvg, matched to your counties",
   def:"OKI's metro tags use airport codes: ind (Indianapolis), fwa (Fort Wayne), sdf (Louisville), cvg (Cincinnati), and day (Dayton). With this on, the page adds the metro for each selected county that falls in one. Membership here is approximated from metro statistical areas; OKI Mesh's own maps are the real reference. Add them only if your repeater serves one of those metros."},
  {k:"usin", name:"us-in", sum:"OKI's Indiana state tag", propOnly:true,
   def:"Indiana's state tag, also part of Phase 1. With the us-in-… format it is always part of your chain. With the in-us-… format it is a separate tag, and Indiana repeaters need it too, or traffic scoped to us-in stops when it reaches them."},
];
const REACH = {none:"Unscoped", county:"Home county", district:"District", state:"State", midwest:"Midwest", oki:"OKI tri-state"};

function opts(){ return { naming:$("naming").value, fw:$("fw").value, defaultLevel:$("deflevel").value,
  maxLen:Math.max(40,Math.min(160,+$("maxlen").value||140)), districtTags:$("districtTags").checked, countyTags:$("districtTags").checked && $("countyTags").checked, tags:{...state.tags}, custom:[...state.custom] }; }

// Map
const svg = $("map"), NS = "http://www.w3.org/2000/svg";
const pathEls = new Map(), textEls = new Map();
COUNTIES.forEach(c => {
  const p = document.createElementNS(NS,"path");
  p.setAttribute("d", c.d);
  p.setAttribute("tabindex","0");
  p.setAttribute("role","button");
  if (c.st === "IN") p.style.setProperty("--dfill", `var(--d${DISTRICTS[DISTRICT_OF[c.name]].n})`); else p.classList.add("out");
  p.addEventListener("pointerdown", e => { if (e.button !== 0) return; startPaint(key(c), e); });
  p.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(key(c), e.shiftKey); }});
  p.addEventListener("mousemove", e => showTip(c, e));
  p.addEventListener("mouseleave", () => $("tip").hidden = true);
  svg.appendChild(p); pathEls.set(key(c), p);
});
COUNTIES.forEach(c => {
  const t = document.createElementNS(NS,"text");
  t.setAttribute("x", c.cx); t.setAttribute("y", c.cy);
  t.textContent = c.st === "IN" ? CODES[c.name] : c.st;
  svg.appendChild(t); textEls.set(key(c), t);
});
function label(c){ return c.st === "IN" ? `${c.name} Co. · ${CODES[c.name]} · ${DISTRICTS[DISTRICT_OF[c.name]].name}` : `${c.name} Co., ${c.st}`; }
function showTip(c, e){
  const box = $("mapbox").getBoundingClientRect(), tip = $("tip");
  let cost = "";
  if (!state.sel.includes(key(c))) {
    const b = planFor(state.sel), a = planFor([...state.sel, key(c)]);
    const d = a.tags - (b ? b.tags : 0);
    cost = a.tags > MAX_TAGS ? " · no room" : ` · +${d} tag${d===1?"":"s"}`;
  }
  tip.textContent = label(c) + cost; tip.hidden = false;
  const x = e.clientX - box.left + 12, y = e.clientY - box.top + 12;
  tip.style.left = Math.min(x, box.width - tip.offsetWidth - 4) + "px"; tip.style.top = y + "px";
}
// Capacity: project the plan with extra counties and refuse adds that would pass 32 tags.
function planFor(selKeys){
  const sel = selKeys.map(k => byKey.get(k));
  const home = byKey.get(state.home && selKeys.includes(state.home) ? state.home : selKeys[0]) || null;
  return buildPlan(sel, home, opts());
}
function capMessage(text){ const m = $("capMsg"); m.textContent = text; m.hidden = !text; clearTimeout(capMessage.t); if (text) capMessage.t = setTimeout(() => m.hidden = true, 7000); }
function addMany(keys, label){
  const add = keys.filter(k => byKey.has(k) && !state.sel.includes(k));
  if (!add.length) { capMessage(""); return false; }
  const before = planFor(state.sel), after = planFor([...state.sel, ...add]);
  const free = MAX_TAGS - (before ? before.tags : 0);
  if (after.tags > MAX_TAGS) {
    const need = after.tags - (before ? before.tags : 0);
    capMessage(`Out of region space. Adding ${label || add.map(k => byKey.get(k).name).join(", ")} needs ${need} more tag${need>1?"s":""}, and only ${free} of 32 ${free===1?"is":"are"} left. Turn off county tags, drop a shared tag, or remove counties.`);
    return false;
  }
  capMessage("");
  state.sel.push(...add); if (!state.home) state.home = add[0];
  render(); return true;
}
function toggle(k, makeHome){
  const i = state.sel.indexOf(k);
  if (makeHome && i >= 0) { state.home = k; render(); }
  else if (i >= 0) { state.sel.splice(i,1); if (state.home === k) state.home = state.sel[0] || null; capMessage(""); render(); }
  else addMany([k]);
}
let paint = null;
function startPaint(k, e){
  if (e.shiftKey) { toggle(k, true); return; }
  const removing = state.sel.includes(k);
  paint = { removing, touched: new Set([k]), mouse: e.pointerType === "mouse" };
  toggle(k, false);
}
svg.addEventListener("pointermove", e => {
  if (!paint || !paint.mouse || !(e.buttons & 1)) return;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el || el.tagName !== "path") return;
  const k = [...pathEls].find(([,p]) => p === el)?.[0];
  if (!k || paint.touched.has(k)) return;
  paint.touched.add(k);
  const has = state.sel.includes(k);
  if (paint.removing && has) toggle(k, false);
  else if (!paint.removing && !has) { if (!addMany([k])) paint = null; }
});
window.addEventListener("pointerup", () => paint = null);
$("btnClear").onclick = () => { state.sel = []; state.home = null; render(); };
$("btnNeighbors").onclick = () => {
  const h = byKey.get(state.home); if (!h) { capMessage("Pick a home county first."); return; }
  const ks = h.nb.map(f => COUNTIES.find(x => x.fips === f)).filter(Boolean).map(key);
  addMany(ks, `the neighbors of ${h.name}`);
};
// Add by name list
$("countyList").innerHTML = COUNTIES.map(c => `<option value="${c.st==="IN"?c.name:c.name+" "+c.st}">`).join("");
$("addForm").addEventListener("submit", e => {
  e.preventDefault();
  const parts = $("addIn").value.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  const keys = [], unknown = [];
  for (const raw of parts) {
    const m = raw.replace(/\s+county$/i,"").match(/^(.*?)(?:[\s,]+(IN|OH|KY|IL|MI))?$/i);
    const nm = m[1].trim().toLowerCase(), st = (m[2] || "IN").toUpperCase();
    const c = COUNTIES.find(x => x.st === st && (x.name.toLowerCase() === nm || x.name.toLowerCase().replace(/[^a-z]/g,"") === nm.replace(/[^a-z]/g,"")))
           || (st === "IN" && COUNTIES.find(x => x.st === "IN" && CODES[x.name] === nm));
    if (c) keys.push(key(c)); else unknown.push(raw);
  }
  const ok = keys.length ? addMany(keys) : false;
  if (unknown.length) capMessage(`Not found: ${unknown.join(", ")}. Use a county name, a three-letter code, or a name plus state (Hamilton OH).`);
  if (ok && !unknown.length) $("addIn").value = "";
});
function renderDistricts(){
  $("dchips").innerHTML = Object.entries(DISTRICTS).map(([k,d]) => {
    const have = d.c.filter(n => state.sel.includes("IN:" + n)).length;
    const all = have === d.c.length;
    return `<button type="button" data-d="${k}" aria-pressed="${all}" class="${have && !all ? "part" : ""}" title="${d.c.join(", ")}">${d.n} · ${d.name}<span class="n">${have}/${d.c.length}</span></button>`;
  }).join("");
  $("dchips").querySelectorAll("button").forEach(b => b.onclick = () => {
    const d = DISTRICTS[b.dataset.d], keys = d.c.map(n => "IN:" + n);
    if (keys.every(k => state.sel.includes(k))) {
      state.sel = state.sel.filter(k => !keys.includes(k));
      if (!state.sel.includes(state.home)) state.home = state.sel[0] || null;
      capMessage(""); render();
    } else addMany(keys, `District ${d.n} (${d.c.length} counties)`);
  });
}
["naming","fw","deflevel","maxlen","districtTags","countyTags"].forEach(id => $(id).addEventListener("input", render));
$("compDefault").addEventListener("input", e => { state.compDefault = e.target.value; render(); });
$("presetOki").onclick = () => { Object.assign(state.tags,{midwest:true,oki:true,metros:true,usin:true}); state.tags.southeast = state.sel.some(k=>k.startsWith("KY:")) || state.tags.southeast; render(); };
$("presetIn").onclick = () => { Object.assign(state.tags,{phase1:true,midwest:false,southeast:false,oki:false,metros:false,usin:false}); render(); };
$("customForm").addEventListener("submit", e => { e.preventDefault(); const v = $("customIn").value.trim().toLowerCase(); const cur = planFor(state.sel); if (cur && cur.tags >= MAX_TAGS) { capMessage("Out of region space. Remove a county or tag before adding a custom tag."); return; } if (v && !state.custom.includes(v)) state.custom.push(v); $("customIn").value = ""; render(); });
document.addEventListener("click", e => { const b = e.target.closest("button[data-def]"); if (!b) return; const d = $("def-"+b.dataset.def); d.hidden = !d.hidden; b.setAttribute("aria-expanded", String(!d.hidden)); b.textContent = d.hidden ? "Define" : "Hide"; });
$("addCh").onclick = () => { state.channels.push({name:"#newchannel", reach:"district"}); render(); };

async function copy(text, btn){
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch(e){ btn.textContent = "Select and copy"; }
  setTimeout(() => btn.textContent = old, 1400);
}
let lastCli = "", lastComp = "";
$("copyCli").onclick = e => copy(lastCli, e.currentTarget);
const sent = new Set();
$("chunkPreset").addEventListener("input", e => { if (e.target.value !== "custom") { $("maxlen").value = e.target.value; render(); } });
$("maxlen").addEventListener("input", () => { const v = $("maxlen").value; $("chunkPreset").value = [...$("chunkPreset").options].some(o => o.value === v) ? v : "custom"; });
function renderSteps(cmds){
  const ol = $("cliSteps");
  ol.innerHTML = cmds.map((c,i) => `<li class="${sent.has(c)?"done":""}"><span style="min-width:0"><code>${esc(c)}</code><span class="meta">${c.length} chars${c.startsWith("region def")?` · ${c.slice(11).split(" ").length} tags`:""}</span></span>
    <span class="acts"><button type="button" data-ci="${i}">Copy</button><label><input type="checkbox" data-si="${i}"${sent.has(c)?" checked":""}> Sent</label></span></li>`).join("");
  ol.querySelectorAll("button[data-ci]").forEach(b => b.onclick = e => copy(cmds[+b.dataset.ci], e.currentTarget));
  ol.querySelectorAll("input[data-si]").forEach(cb => cb.onchange = () => { const c = cmds[+cb.dataset.si]; cb.checked ? sent.add(c) : sent.delete(c); cb.closest("li").classList.toggle("done", cb.checked); });
}
$("copyComp").onclick = e => copy(lastComp, e.currentTarget);

function treeText(plan){
  const kids = new Map(); for (const [n,p] of plan.parent){ if(!kids.has(p)) kids.set(p,[]); kids.get(p).push(n); }
  const lines = ["*"]; const walk = (p,d) => (kids.get(p)||[]).forEach(n => { lines.push(" ".repeat(d)+n+(n===plan.defTag?"   ← default":"")); walk(n,d+1); });
  walk("*",1); return lines.join("\n");
}
const esc = s => s.replace(/[&<>"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch]));

function renderTags(plan, o){
  const open = new Set([...document.querySelectorAll(".tc-def")].filter(d => !d.hidden).map(d => d.id));
  const carried = plan ? new Set(plan.order) : new Set();
  $("tagCards").innerHTML = TAGDEFS.filter(t => !(t.propOnly && o.naming === "iso")).map(t => {
    const on = state.tags[t.k];
    let extra = "";
    if (t.k === "metros" && on) {
      const ms = ["ind","fwa","sdf","cvg","day","lex"].filter(m => carried.has(m));
      extra = `<p class="tc-sum">This selection adds: ${ms.length ? ms.map(m => `<code>${m}</code>`).join(" ") : "none"}</p>`;
    }
    return `<div class="tagcard${on?" on":""}">
      <div class="tc-head"><code class="tc-name">${t.name}</code><button type="button" class="linkish" data-def="${t.k}" aria-expanded="${open.has("def-"+t.k)}">${open.has("def-"+t.k)?"Hide":"Define"}</button></div>
      <p class="tc-sum">${t.sum}</p>${extra}
      <p class="tc-def" id="def-${t.k}"${open.has("def-"+t.k)?"":" hidden"}>${t.def}</p>
      <div class="tc-act"><button type="button" class="add" data-tag="${t.k}" aria-pressed="${on}">${on ? "Added · remove" : "Add " + (t.k==="metros"?"metros":t.name)}</button></div>
    </div>`;
  }).join("");
  $("tagCards").querySelectorAll("button[data-tag]").forEach(b => b.onclick = () => { state.tags[b.dataset.tag] = !state.tags[b.dataset.tag]; render(); });
  $("customChips").innerHTML = state.custom.map((c,i) => `<span class="chip">${esc(c)}<button type="button" data-ci="${i}" aria-label="Remove ${esc(c)}">×</button></span>`).join("");
  $("customChips").querySelectorAll("button").forEach(b => b.onclick = () => { state.custom.splice(+b.dataset.ci,1); render(); });
}

function render(){
  renderDistricts();
  const o = opts();
  const sel = state.sel.map(k => byKey.get(k));
  const home = byKey.get(state.home) || null;

  pathEls.forEach((p,k) => { p.classList.toggle("sel", state.sel.includes(k) && k !== state.home); p.classList.toggle("home", k === state.home);
    p.setAttribute("aria-pressed", state.sel.includes(k)); p.setAttribute("aria-label", label(byKey.get(k))); });
  textEls.forEach((t,k) => { t.classList.toggle("sel", state.sel.includes(k) && k !== state.home); t.classList.toggle("home", k === state.home); });

  $("chips").innerHTML = sel.length ? sel.map(c => `<span class="chip${key(c)===state.home?" home":""}">${esc(c.st==="IN"?c.name:c.name+", "+c.st)}<button type="button" data-k="${esc(key(c))}" aria-label="Remove ${esc(c.name)}">×</button></span>`).join("")
    : `<span class="sub">Nothing selected. Click a county on the map.</span>`;
  $("chips").querySelectorAll("button").forEach(b => b.onclick = () => toggle(b.dataset.k, false));

  const plan0 = buildPlan(sel, home, o);
  if (!plan0.order.length){
    $("cliSteps").innerHTML = `<li><span></span><code>No tags. Turn Phase 1 on or select a county.</code></li>`; $("tree").textContent = ""; $("status").innerHTML = ""; $("warnings").innerHTML = "";
    $("meter").style.width = "0"; $("cap").innerHTML = ""; lastCli = ""; renderTags(null, o); renderCompanion(null, o); return;
  }
  const plan = plan0;
  const ok = verify(plan);
  lastCli = plan.commands.join("\n");
  renderSteps(plan.commands);
  $("tree").textContent = treeText(plan);
  const lvl = plan.tags > 32 ? "crit" : plan.tags > 24 ? "warn" : "ok";
  $("status").innerHTML =
    `<span class="pill ${lvl}">${plan.tags} / 32 tags</span>` +
    `<span class="pill info">${plan.commands.length} command${plan.commands.length>1?"s":""}</span>` +
    `<span class="pill ${ok?"ok":"crit"}">${ok?"Verified against firmware parsing":"Tree mismatch, do not use"}</span>`;
  $("meter").style.width = Math.min(100, plan.tags/32*100) + "%";
  const tl = plan.tags > 32 ? "crit" : plan.tags > 24 ? "warn" : "", dl = plan.discovery.hidden.length ? "warn" : "";
  $("cap").innerHTML =
    `<div class="capitem ${tl}"><div class="lbl"><span>Region slots</span><b>${plan.tags} / 32 · ${Math.max(0,32-plan.tags)} left</b></div><div class="meter"><i style="width:${Math.min(100,plan.tags/32*100)}%"></i></div></div>` +
    `<div class="capitem ${dl}"><div class="lbl"><span>Discover Regions list</span><b>${plan.discovery.used} / 172 bytes${plan.discovery.hidden.length?` · ${plan.discovery.hidden.length} hidden`:""}</b></div><div class="meter"><i style="width:${Math.min(100,plan.discovery.used/172*100)}%"></i></div></div>`;
  const ws = [...plan.warnings];
  if (sel.some(c => c.st === "KY") && !state.tags.southeast) ws.push({sev:"warn", text:"A Kentucky county is selected but us-southeast is off. Add it so Kentucky-scoped traffic passes this repeater."});
  if (home && home.st !== "IN") ws.push({sev:"warn", text:"Home county is outside Indiana, so no district or county tags apply to it."});
  if (o.districtTags && !o.countyTags && $("countyTags").checked) ws.push({sev:"warn", text:"County tags need district tags. Turn on district tags to use them."});
  if (o.countyTags && sel.filter(c=>c.st==="IN").length > 8) ws.push({sev:"warn", text:"More than 8 counties selected. County tags are cheap individually but add up on tall sites. Consider turning county tags off for backbone nodes."});
  $("warnings").innerHTML = ws.map(w => `<li class="${w.sev}">${esc(w.text)}</li>`).join("");
  renderTags(plan, o);
  renderCompanion(plan, o);
}

function renderCompanion(plan, o){
  const lv = plan ? plan.levels : {};
  const tagFor = r => r === "none" ? null : (lv[r] || null);
  const avail = Object.keys(REACH).filter(r => r === "none" || tagFor(r));
  if (!avail.includes(state.compDefault)) state.compDefault = "none";
  $("compDefault").innerHTML = avail.map(r => `<option value="${r}"${r===state.compDefault?" selected":""}>${REACH[r]}${tagFor(r)?" · "+tagFor(r):" · leave unset"}</option>`).join("");

  $("chBody").innerHTML = state.channels.map((ch,i) => {
    const t = tagFor(ch.reach);
    return `<tr><td><input type="text" id="chn${i}" value="${esc(ch.name)}" aria-label="Channel name" style="width:130px"></td>
      <td><select id="chr${i}" aria-label="Reach for ${esc(ch.name)}">${Object.keys(REACH).map(r => `<option value="${r}"${r===ch.reach?" selected":""}${r!=="none"&&!tagFor(r)?" disabled":""}>${REACH[r]}</option>`).join("")}</select></td>
      <td>${t?`<code>${esc(t)}</code>`:`<span class="sub">${ch.reach==="none"?"leave unset":"not available"}</span>`}</td>
      <td><button type="button" data-i="${i}" aria-label="Remove ${esc(ch.name)}">×</button></td></tr>`;
  }).join("");
  state.channels.forEach((ch,i) => {
    $("chn"+i).addEventListener("change", e => { ch.name = e.target.value.trim() || ch.name; render(); });
    $("chr"+i).addEventListener("input", e => { ch.reach = e.target.value; render(); });
  });
  $("chBody").querySelectorAll("button").forEach(b => b.onclick = () => { state.channels.splice(+b.dataset.i,1); render(); });

  const dt = tagFor(state.compDefault);
  const steps = [];
  steps.push(dt ? `Settings → Experimental Settings → Default Region Scope: enter <code>${esc(dt)}</code>. Adverts and unscoped channel messages will carry it.`
                : `Settings → Experimental Settings → Default Region Scope: leave unset for now.`);
  state.channels.forEach(ch => {
    const t = tagFor(ch.reach);
    steps.push(t ? `Open <b>${esc(ch.name)}</b> → ⋮ → Set Region Scope: enter <code>${esc(t)}</code>.${ch.note ? ` <span class="sub">${esc(ch.note)}</span>` : ""}`
                 : `Leave <b>${esc(ch.name)}</b> unscoped${dt?` (it will use the default, <code>${esc(dt)}</code>)`:""}.`);
  });
  steps.push(`Verify with ⋮ → Tools → Discover Regions. Each tag above should appear on a nearby repeater.`);
  $("compSteps").innerHTML = steps.map(s => `<li>${s}</li>`).join("");
  lastComp = steps.map((s,i) => `${i+1}. ` + s.replace(/<[^>]+>/g,"")).join("\n");
}
render();
