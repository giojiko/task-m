/* ═══════════════════════════════════════════
   SmartPro — warehouse.js
   Warehouse items CRUD + change logs
   ═══════════════════════════════════════════ */

function loadWh() { updateAddBtns(); applyI18n(); renderWarehouse(); }

function renderWarehouse() {
  const q=document.getElementById('wsearch').value.toLowerCase();
  const cat=document.getElementById('wcatfil').value;
  const items=DB.wh.filter(i=>(!q||i.name.toLowerCase().includes(q))&&(!cat||i.cat===cat));
  const cats=[...new Set(DB.wh.map(i=>i.cat).filter(Boolean))];
  const cs=document.getElementById('wcatfil');const cv=cs.value;
  cs.innerHTML=`<option value="">${t('all_categories')}</option>`+cats.map(c=>`<option value="${esc(c)}" ${c===cv?'selected':''}>${esc(c)}</option>`).join('');
  const tb=document.getElementById('wtbody');
  if(!items.length){tb.innerHTML=`<tr><td colspan="7"><div class="empty"><div class="eico">📦</div><p>${t('no_items')}</p></div></td></tr>`;return;}
  tb.innerHTML=items.map(i=>{
    const low=i.qty<=i.minQty;
    return `<tr ${low?'class="low-row"':''}>
      <td><strong ${low?'style="color:var(--danger)"':''}>${esc(i.name)}</strong>${i.desc?`<div class="ts tm">${esc(i.desc)}</div>`:''}</td>
      <td>${i.cat||'—'}</td>
      <td style="font-weight:700;color:${low?'var(--danger)':i.qty>i.minQty*2?'var(--accent)':'inherit'}">${i.qty}</td>
      <td>${i.unit}</td><td>${i.minQty}</td>
      <td>${low?`<span style="background:rgba(255,64,96,.12);color:var(--danger);padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700">${t('stock_low')}</span>`:`<span style="color:var(--accent);font-size:12px">${t('stock_ok')}</span>`}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-ghost btn-xs" data-tip="${t('tip_history')}" onclick="openWhLogs('${i.id}','${esc(i.name)}')">📋</button>
        ${_cu.role!=='specialist'?`<button class="btn btn-ghost btn-xs" data-tip="${t('tip_edit')}" onclick="openWhModal('${i.id}')">✏️</button><button class="btn btn-ghost btn-xs" data-tip="${t('tip_delete')}" onclick="delWh('${i.id}')">🗑</button>`:''}
      </div></td>
    </tr>`;
  }).join('');
}

function openWhModal(id='') {
  document.getElementById('fWhId').value=id;
  document.getElementById('mWhTitle').textContent=id?t('warehouse'):t('add_item');
  if(id){
    const i=DB.wh.find(x=>x.id===id);
    if(i){document.getElementById('fWhName').value=i.name;document.getElementById('fWhCat').value=i.cat||'';document.getElementById('fWhQty').value=i.qty;document.getElementById('fWhUnit').value=i.unit;document.getElementById('fWhMin').value=i.minQty;document.getElementById('fWhDesc').value=i.desc||'';document.getElementById('fWhReason').value='';document.getElementById('fWhReasonG').style.display='';}
  } else {
    ['fWhName','fWhCat','fWhDesc','fWhReason'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('fWhQty').value='0';document.getElementById('fWhUnit').value='ც';document.getElementById('fWhMin').value='0';
    document.getElementById('fWhReasonG').style.display='none';
  }
  om('mWh');
}

function saveWh() {
  const id=document.getElementById('fWhId').value;
  const name=document.getElementById('fWhName').value.trim();
  if(!name){toast(t('err_name_req'),'error');return;}
  const qty=parseFloat(document.getElementById('fWhQty').value)||0;
  const data={name,cat:document.getElementById('fWhCat').value.trim()||null,qty,unit:document.getElementById('fWhUnit').value.trim()||'ც',minQty:parseFloat(document.getElementById('fWhMin').value)||0,desc:document.getElementById('fWhDesc').value.trim()||null};
  if(id){
    const i=DB.wh.find(x=>x.id===id);
    if(i){const diff=qty-i.qty;Object.assign(i,data);if(diff!==0)DB.whlogs.push({id:uid(),item:id,action:diff>0?'in':'out',change:diff,after:qty,reason:document.getElementById('fWhReason').value.trim()||null,by:_cu.id,at:now()});}
  } else {
    const nid=uid();DB.wh.push({id:nid,...data,created:now()});
    DB.whlogs.push({id:uid(),item:nid,action:'added',change:qty,after:qty,reason:null,by:_cu.id,at:now()});
  }
  s();toast(t('toast_wh_saved'),'success');cm('mWh');renderWarehouse();
}

function delWh(id) {
  if(!confirm(t('confirm_delete'))) return;
  DB.wh=DB.wh.filter(i=>i.id!==id);DB.whlogs=DB.whlogs.filter(l=>l.item!==id);
  s();toast(t('toast_wh_deleted'),'success');renderWarehouse();
}

function openWhLogs(id,name) {
  document.getElementById('mWhLogsTitle').textContent=name;
  const logs=DB.whlogs.filter(l=>l.item===id).reverse();
  const al={added:t('wh_add'),in:t('wh_in'),out:t('wh_out')};
  document.getElementById('mWhLogsBody').innerHTML=logs.length?`<div class="loglist">${logs.map(l=>`
    <div class="logitem"><div style="flex:1">
      <span style="font-weight:700;color:${l.action==='out'?'var(--danger)':'var(--accent)'}">${al[l.action]||l.action}</span>
      <span class="tm" style="margin-left:6px">${userName(l.by)}</span>
      <span style="margin-left:6px;font-weight:700;color:${l.change<0?'var(--danger)':'var(--accent)'}">${l.change>0?'+':''}${l.change}</span>
      <span class="tm"> → ${l.after}</span>
      ${l.reason?`<div class="ts tm">${esc(l.reason)}</div>`:''}
    </div><span style="color:var(--text3);font-size:11px;white-space:nowrap">${fdt(l.at)}</span></div>`).join('')}</div>`:`<p class="tm ts">${t('no_logs')}</p>`;
  om('mWhLogs');
}
