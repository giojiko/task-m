/* ═══════════════════════════════════════════
   SmartPro — directions.js
   Directions page + Sidebar sub-items
   ═══════════════════════════════════════════ */

let _selectedDir = null;

function loadDirections() {
  applyI18n(); renderSidebarDirs(); renderDirGrid();
  if(_selectedDir) showDirClients(_selectedDir);
  else clearDirPageFilter();
}

function renderSidebarDirs() {
  const box=document.getElementById('sidebarDirs');if(!box) return;
  const isSpec=_cu&&_cu.role==='specialist';
  // "ყველა კლიენტი" — მხოლოდ არა-სპეციალისტებს
  const all=isSpec?'':
    `<div class="dir-sub ${!_activeDirFilter?'active':''}" onclick="gotoClientsByDir(null)" style="color:var(--text2)">
      <span style="font-size:13px">👥</span><span data-i18n="all_clients"></span>
    </div>`;
  const items=DB.directions.map(d=>{
    const cnt=DB.clients.filter(c=>(c.directions||[]).includes(d.id)).length;
    const isActive=isSpec?(_selectedDir===d.id):(_activeDirFilter===d.id);
    return `<div class="dir-sub ${isActive?'active':''}" onclick="gotoClientsByDir('${d.id}')" style="${isActive?'color:'+d.color:''}">
      <span style="font-size:13px">${d.icon}</span>
      <span style="flex:1;overflow:hidden;text-overflow:ellipsis">${esc(_lang==='en'?d.nameEn||d.name:_lang==='ru'?d.nameRu||d.name:d.name)}</span>
      <span style="margin-left:auto;font-size:10px;padding:1px 5px;border-radius:8px;background:var(--bg4);color:var(--text3)">${cnt}</span>
    </div>`;
  }).join('');
  const allDirs=`<div class="dir-sub" onclick="gotoAllDirections()">
    <span style="font-size:13px">🗂</span><span data-i18n="all_directions"></span>
  </div>`;
  box.innerHTML=all+items+allDirs;applyI18n();
}

function gotoAllDirections() {
  goto('directions');
}

function renderDirGrid() {
  const grid=document.getElementById('dirGrid');
  if(!grid){console.error('dirGrid not found');return;}
  if(!DB.directions||!DB.directions.length){grid.innerHTML='<p style="color:var(--text2);padding:20px">მიმართულებები არ მოიძებნა</p>';return;}
  let out='';
  for(const d of DB.directions){
    const cnt=DB.clients.filter(c=>(c.directions||[]).includes(d.id)).length;
    const isActive=_selectedDir===d.id;
    const borderCol=isActive?d.color:d.color+'44';
    const bg=isActive?d.color+'18':'var(--card)';
    const shadow=isActive?'box-shadow:0 0 24px '+d.color+'44;':'';
    out+=`<div data-did="${d.id}" style="background:${bg};border:2px solid ${borderCol};border-radius:var(--radius);padding:18px;cursor:pointer;transition:all .2s;${shadow}">`;
    out+=`<div style="font-size:32px;margin-bottom:8px">${d.icon}</div>`;
    out+=`<div style="font-size:14px;font-weight:800;color:${d.color};margin-bottom:6px">${esc(_lang==='en'?d.nameEn||d.name:_lang==='ru'?d.nameRu||d.name:d.name)}</div>`;
    out+=`<div style="font-size:12px;color:var(--text2);line-height:1.5;margin-bottom:12px">${esc(d.desc)}</div>`;
    out+=`<div style="display:flex;align-items:center;justify-content:space-between">`;
    out+=`<span style="font-size:11px;padding:2px 10px;border-radius:10px;background:${d.color}22;color:${d.color};font-weight:700">👥 ${cnt} კლ.</span>`;
    if(isActive) out+=`<span style="font-size:10px;color:${d.color};font-weight:600">✓ აქტიური</span>`;
    out+=`</div></div>`;
  }
  grid.innerHTML=out;
  grid.querySelectorAll('[data-did]').forEach(el=>{
    el.addEventListener('click',()=>showDirClients(el.dataset.did));
    el.addEventListener('mouseover',()=>{if(_selectedDir!==el.dataset.did)el.style.borderColor=DB.directions.find(x=>x.id===el.dataset.did)?.color||'var(--accent)';});
    el.addEventListener('mouseout',()=>{if(_selectedDir!==el.dataset.did){const d=DB.directions.find(x=>x.id===el.dataset.did);el.style.borderColor=d?d.color+'44':'var(--border)';}});
  });
}

function showDirClients(dirId) {
  _selectedDir=dirId; renderDirGrid();
  const d=DB.directions.find(x=>x.id===dirId);
  const clients=DB.clients.filter(c=>(c.directions||[]).includes(dirId));
  const panel=document.getElementById('dirClientPanel');
  const title=document.getElementById('dirClientPanelTitle');
  const cnt=document.getElementById('dirClientCount');
  const tbody=document.getElementById('dirClientBody');
  if(!panel) return;
  panel.style.display='';
  if(title) title.innerHTML=`<span style="color:${d.color}">${d.icon} ${esc(d.name)}</span>`;
  if(cnt) cnt.textContent=clients.length+' კლიენტი';
  if(tbody){
    tbody.innerHTML=clients.length?clients.map(c=>`<tr style="cursor:pointer" onclick="openDirClientDetail('${c.id}')" title="${esc(c.name)}">
      <td><strong>${esc(c.name)}</strong>${c.pid?`<div class="ts tm">${c.pid}</div>`:''}</td>
      <td>${c.phone||'—'}</td><td>${c.addr||'—'}</td>
      <td>${c.referral?esc(c.referral):'—'}</td><td>${c.email||'—'}</td>
    </tr>`).join(''):`<tr><td colspan="5"><div class="empty" style="padding:30px"><p>${t('dir_no_clients')}</p></div></td></tr>`;
  }
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}),100);
}

function clearDirPageFilter() {
  _selectedDir=null; renderDirGrid();
  const panel=document.getElementById('dirClientPanel');
  if(panel) panel.style.display='none';
}

/* ── კლიენტის დეტალების პანელი (Direction-დან) ── */
function openDirClientDetail(clientId) {
  const c=DB.clients.find(x=>x.id===clientId);
  if(!c) return;

  const dirs=(c.directions||[]).map(id=>DB.directions.find(d=>d.id===id)).filter(Boolean);
  const tasks=DB.tasks.filter(tk=>tk.client===clientId);

  const stCol={
    pending:'var(--text3)', in_progress:'var(--accent)',
    paused:'#f59e0b', completed:'#22c55e',
    stopped:'#ef4444', pending_approval:'#8b5cf6'
  };

  let html=`<div style="display:flex;flex-direction:column;gap:16px">
    <div class="card" style="margin:0">
      <div class="ch"><span class="ct" style="font-size:14px">👤 ${esc(c.name)}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('c_mobile')}</div>
          <div style="font-weight:600">${c.phone||'—'}</div>
        </div>
        <div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('address')}</div>
          <div style="font-weight:600">${c.addr||'—'}</div>
        </div>
        ${c.email?`<div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('email_lbl')}</div>
          <div>${c.email}</div>
        </div>`:''}
        ${c.referral?`<div>
          <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">${t('c_referral')}</div>
          <div>${esc(c.referral)}</div>
        </div>`:''}
      </div>
      ${dirs.length?`<div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:5px">
        ${dirs.map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;padding:2px 9px;border-radius:10px;background:${d.color}20;color:${d.color};border:1px solid ${d.color}44;font-weight:600">${d.icon} ${esc(d.name)}</span>`).join('')}
      </div>`:''}
    </div>
    <div class="card" style="margin:0">
      <div class="ch">
        <span class="ct" style="font-size:14px">📋 ${t('tasks')}</span>
        <span style="font-size:11px;color:var(--text3)">${tasks.length} ${t('total_tasks').toLowerCase()}</span>
      </div>`;

  if(!tasks.length){
    html+=`<div class="empty" style="padding:24px"><p>${t('no_tasks')}</p></div>`;
  } else {
    html+=`<div style="display:flex;flex-direction:column;gap:6px">`;
    tasks.forEach(tk=>{
      const col=stCol[tk.status]||'var(--text3)';
      const lbl=t('st_'+tk.status)||tk.status;
      const prCol={high:'#ef4444',medium:'#f59e0b',low:'#6b7280'}[tk.priority]||'var(--text3)';
      html+=`<div
        onclick="cm('mDirClientDetail');openTaskDetail('${tk.id}')"
        style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 14px;background:var(--bg3);border-radius:var(--radius2);cursor:pointer;border:1px solid var(--border);transition:border-color .15s"
        onmouseover="this.style.borderColor='var(--accent)'"
        onmouseout="this.style.borderColor='var(--border)'">
        <div style="min-width:0;flex:1">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tk.title)}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:3px">
            ${tk.due?`<span style="font-size:11px;color:var(--text3)">📅 ${tk.due}</span>`:''}
            <span style="font-size:10px;padding:1px 7px;border-radius:8px;background:${prCol}20;color:${prCol};font-weight:700;border:1px solid ${prCol}44">${t('pr_'+tk.priority)}</span>
          </div>
        </div>
        <span style="flex-shrink:0;font-size:11px;padding:3px 10px;border-radius:10px;background:${col}18;color:${col};font-weight:600;border:1px solid ${col}33">${lbl}</span>
      </div>`;
    });
    html+=`</div>`;
  }

  html+=`</div></div>`;

  document.getElementById('mDirClientDetailTitle').textContent=c.name;
  document.getElementById('mDirClientDetailBody').innerHTML=html;
  om('mDirClientDetail');
}
