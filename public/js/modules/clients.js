/* ═══════════════════════════════════════════
   SmartPro — clients.js
   Clients CRUD + Direction filter
   ═══════════════════════════════════════════ */

let _activeDirFilter = null;

function loadClients() { updateAddBtns(); applyI18n(); renderSidebarDirs(); renderClients(); }

function renderClients() {
  const badge=document.getElementById('cDirFilterBadge');
  const badgeLbl=document.getElementById('cDirFilterLabel');
  if(_activeDirFilter){
    const d=DB.directions.find(x=>x.id===_activeDirFilter);
    if(badge) badge.style.display='flex';
    if(badgeLbl&&d) badgeLbl.innerHTML=`<span style="color:${d.color}">${d.icon} ${esc(d.name)}</span>`;
  } else {
    if(badge) badge.style.display='none';
  }
  const q=document.getElementById('csearch').value.toLowerCase();
  const cl=DB.clients.filter(c=>{
    if(q&&!c.name.toLowerCase().includes(q)&&!(c.phone||'').includes(q)) return false;
    if(_activeDirFilter&&!(c.directions||[]).includes(_activeDirFilter)) return false;
    return true;
  });
  const tb=document.getElementById('ctbody');
  if(!cl.length){tb.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="eico">👥</div><p>${t('no_clients')}</p></div></td></tr>`;return;}
  tb.innerHTML=cl.map(c=>{
    const dirs=(c.directions||[]).map(id=>DB.directions.find(d=>d.id===id)).filter(Boolean);
    return `<tr>
      <td>
        <strong>${esc(c.name)}</strong>
        ${dirs.length?dirs.map(d=>`<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:1px 6px;border-radius:10px;border:1px solid ${d.color}44;color:${d.color};margin-top:2px;margin-right:3px">${d.icon} ${esc(d.name)}</span>`).join(''):''}
        ${c.pid?`<div class="ts tm">${c.pid}</div>`:''}
      </td>
      <td>${c.phone||'—'}</td>
      <td>${c.addr||'—'}</td>
      <td>${c.referral?esc(c.referral):'—'}</td>
      <td>${c.email||'—'}</td>
      <td>${(_cu.role==='super_admin')?`<button class="btn btn-ghost btn-xs" data-tip="${t('tip_edit')}" onclick="openClientModal('${c.id}')">✏️</button> <button class="btn btn-ghost btn-xs" data-tip="${t('tip_delete')}" onclick="delClient('${c.id}')">🗑</button>`:'<span class="tm">—</span>'}</td>
    </tr>`;
  }).join('');
}

function openClientModal(id='') {
  document.getElementById('fCid').value=id;
  document.getElementById('mClientTitle').textContent=id?t('clients'):t('add_client');
  const dirBox=document.getElementById('fCdirectionBox');
  if(dirBox) dirBox.innerHTML=DB.directions.map(d=>`
    <label style="display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;font-size:12.5px;border-radius:var(--radius2);transition:background .12s" id="dlbl_${d.id}" onmouseover="this.style.background='var(--bg3)'" onmouseout="if(!document.getElementById('dchk_${d.id}').checked)this.style.background='transparent'">
      <input type="checkbox" id="dchk_${d.id}" value="${d.id}" style="width:14px;height:14px;accent-color:var(--accent);flex-shrink:0" onchange="highlightDirLabel('${d.id}');updateDirLabel()">
      <span style="font-size:15px">${d.icon}</span><span>${esc(d.name)}</span>
    </label>`).join('');
  updateDirLabel();applyI18n();
  if(id){
    const c=DB.clients.find(x=>x.id===id);
    if(c){
      document.getElementById('fCname').value=c.name;
      document.getElementById('fCphone').value=c.phone||'';
      document.getElementById('fCemail').value=c.email||'';
      document.getElementById('fCaddr').value=c.addr||'';
      document.getElementById('fCpid').value=c.pid||'';
      document.getElementById('fCreferral').value=c.referral||'';
      document.getElementById('fCnotes').value=c.notes||'';
      const cdirs=c.directions||[];
      DB.directions.forEach(d=>{const cb=document.getElementById('dchk_'+d.id);if(cb){cb.checked=cdirs.includes(d.id);highlightDirLabel(d.id);}});
    }
  } else {
    ['fCname','fCphone','fCemail','fCaddr','fCnotes','fCpid'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('fCreferral').value='';
    DB.directions.forEach(d=>{const cb=document.getElementById('dchk_'+d.id);if(cb){cb.checked=false;highlightDirLabel(d.id);}});
  }
  om('mClient');
}

function saveClient() {
  const id=document.getElementById('fCid').value;
  const name=document.getElementById('fCname').value.trim();
  const phone=document.getElementById('fCphone').value.trim();
  const addr=document.getElementById('fCaddr').value.trim();
  if(!name||!phone||!addr){toast(t('err_client_required'),'error');return;}
  const data={name,phone,addr,
    email:document.getElementById('fCemail').value.trim()||null,
    pid:document.getElementById('fCpid').value.trim()||null,
    referral:document.getElementById('fCreferral').value.trim()||null,
    directions:DB.directions.map(d=>d.id).filter(did=>{const cb=document.getElementById('dchk_'+did);return cb&&cb.checked;}),
    notes:document.getElementById('fCnotes').value.trim()||null
  };
  if(id){const c=DB.clients.find(x=>x.id===id);if(c) Object.assign(c,data);}
  else DB.clients.push({id:uid(),...data,created:now()});
  s();toast(t('toast_client_saved'),'success');cm('mClient');renderClients();
}

function delClient(id) {
  if(!confirm(t('confirm_delete'))) return;
  DB.clients=DB.clients.filter(c=>c.id!==id);s();toast(t('toast_client_deleted'),'success');renderClients();
}

function toggleDirDrop() {
  const box=document.getElementById('fCdirectionBox');if(!box) return;
  const open=box.style.display==='none';
  box.style.display=open?'block':'none';
  if(open) setTimeout(()=>document.addEventListener('click',closeDirDrop,{once:true}),10);
}
function closeDirDrop(e) {
  const wrap=document.getElementById('dirDropWrap');
  if(wrap&&!wrap.contains(e.target)){const box=document.getElementById('fCdirectionBox');if(box)box.style.display='none';}
}
function updateDirLabel() {
  const label=document.getElementById('dirDropLabel');if(!label) return;
  const checked=DB.directions.filter(d=>{const cb=document.getElementById('dchk_'+d.id);return cb&&cb.checked;});
  if(checked.length===0){label.textContent=t('no_direction');label.style.color='var(--text3)';}
  else{label.innerHTML=checked.map(d=>`<span style="display:inline-flex;align-items:center;gap:3px;margin-right:4px;padding:1px 7px;border-radius:10px;font-size:11px;background:${d.color}22;color:${d.color};border:1px solid ${d.color}44">${d.icon} ${esc(d.name)}</span>`).join('');label.style.color='inherit';}
}
function highlightDirLabel(id) {
  const cb=document.getElementById('dchk_'+id);
  const lbl=document.getElementById('dlbl_'+id);if(!lbl) return;
  const d=DB.directions.find(x=>x.id===id);
  if(cb&&cb.checked){lbl.style.background=d?(d.color+'15'):'rgba(27,234,205,.07)';}
  else lbl.style.background='transparent';
}

function gotoClientsByDir(dirId) {
  if(_cu&&_cu.role==='specialist'){
    // სპეციალისტი → directions გვერდი, შეარჩიე მიმართულება
    _selectedDir=dirId;
    renderSidebarDirs();
    goto('directions');
  } else {
    _activeDirFilter=dirId;
    renderSidebarDirs();
    goto('clients');
  }
}
function clearDirFilter() { _activeDirFilter=null; renderSidebarDirs(); renderClients(); }
