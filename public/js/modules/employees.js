/* ═══════════════════════════════════════════
   SmartPro — employees.js
   Employees CRUD + password reset
   ═══════════════════════════════════════════ */

function loadEmps() { updateAddBtns(); applyI18n(); renderEmps(); }

function renderEmps() {
  const tb=document.getElementById('etbody');
  tb.innerHTML=DB.users.map(u=>{
    const nm=u.name||((u.firstName||'')+' '+(u.lastName||'')).trim()||u.email;
    const sup=u.supervisorId?DB.users.find(x=>x.id===u.supervisorId):null;
    const showSup=(_cu.role==='super_admin'||_cu.id===u.id)&&sup;
    return `<tr style="${!u.active?'opacity:.45':''}">
      <td>
        <strong>${esc(nm)}</strong>
        ${u.mustSetup?` <span style="background:rgba(229,217,54,.15);color:var(--warning);padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700">⚠ Setup</span>`:''}
        ${u.birthDate?`<div class="ts tm">${fd(u.birthDate)}</div>`:''}
      </td>
      <td><div>${u.email}</div><div class="ts tm">${u.phone||''}</div></td>
      <td>
        <div>${u.position||'—'}</div>
        ${showSup?`<div class="ts" style="color:var(--accent);margin-top:2px">↑ ${esc(sup.name||(sup.firstName+' '+sup.lastName)||sup.email)}</div>`:''}
      </td>
      <td><span class="rtag r-${u.role}">${RL(u.role)}</span></td>
      <td>${u.active?`<span style="color:var(--accent)">${t('active')}</span>`:`<span style="color:var(--danger)">${t('inactive')}</span>`}</td>
      <td><div style="display:flex;gap:4px">
        ${canEditEmp(u)?`
          <button class="btn btn-ghost btn-xs" onclick="openEmpModal('${u.id}')" data-tip="${t('tip_edit')}">✏️</button>
          <button class="btn btn-ghost btn-xs" onclick="openRP('${u.id}')" data-tip="${t('tip_key')}">🔑</button>
          ${u.id!==_cu.id&&_cu.role==='super_admin'?`<button class="btn btn-ghost btn-xs" onclick="toggleEmp('${u.id}',${!u.active})" data-tip="${u.active?t('tip_disable'):t('tip_enable')}">${u.active?'🚫':'✅'}</button>`:''}
        `:'<span class="tm">—</span>'}
      </div></td>
    </tr>`;
  }).join('');
}

function canEditEmp(u) {
  if(_cu.role==='super_admin') return true;
  if(_cu.role==='admin'&&u.role!=='super_admin') return true;
  return false;
}

function openEmpModal(id='') {
  document.getElementById('fEid').value=id;
  document.getElementById('mEmpTitle').textContent=id?t('employees'):t('add_employee');
  document.getElementById('saOpt').style.display=_cu.role==='super_admin'?'':'none';
  document.getElementById('fEpassG').style.display=id?'none':'';
  const supRow=document.getElementById('fEsupervisorRow');
  if(supRow) supRow.style.display=_cu.role==='super_admin'?'':'none';
  const supSel=document.getElementById('fEsupervisor');
  supSel.innerHTML=`<option value="">${t('no_supervisor')}</option>`+
    DB.users.filter(u=>u.active&&u.id!==id).map(u=>`<option value="${u.id}">${esc(u.name||(u.firstName+' '+u.lastName)||u.email)}</option>`).join('');
  applyI18n();
  if(id){
    const u=DB.users.find(x=>x.id===id);
    if(u){
      document.getElementById('fEfirst').value=u.firstName||u.name?.split(' ')[0]||'';
      document.getElementById('fElast').value=u.lastName||u.name?.split(' ')[1]||'';
      document.getElementById('fEemail').value=u.email;
      document.getElementById('fEphone').value=u.phone||'';
      document.getElementById('fEbirth').value=u.birthDate||'';
      document.getElementById('fEpos').value=u.position||'';
      document.getElementById('fEaddr').value=u.address||'';
      document.getElementById('fEsupervisor').value=u.supervisorId||'';
      document.getElementById('fErole').value=u.role;
    }
  } else {
    ['fEfirst','fElast','fEemail','fEphone','fEpos','fEaddr','fEpass'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('fEbirth').value='';
    document.getElementById('fEsupervisor').value='';
    document.getElementById('fErole').value='specialist';
  }
  om('mEmp');
}

function saveEmp() {
  const id=document.getElementById('fEid').value;
  const fn=document.getElementById('fEfirst').value.trim();
  const ln=document.getElementById('fElast').value.trim();
  const phone=document.getElementById('fEphone').value.trim();
  const email=document.getElementById('fEemail').value.trim();
  const birth=document.getElementById('fEbirth').value;
  const pass=document.getElementById('fEpass').value;
  const role=document.getElementById('fErole').value;
  const position=document.getElementById('fEpos').value.trim()||null;
  const address=document.getElementById('fEaddr').value.trim()||null;
  const supervisorId=_cu.role==='super_admin'?(document.getElementById('fEsupervisor').value||null):undefined;
  if(!fn||!ln||!phone||!email||!birth){toast(t('err_emp_required'),'error');return;}
  if(!id&&(!pass||pass.length<6)){toast(t('err_pass_short'),'error');return;}
  const fullName=(fn+' '+ln).trim();
  if(id){
    const u=DB.users.find(x=>x.id===id);
    if(u){u.firstName=fn;u.lastName=ln;u.name=fullName;u.phone=phone;u.email=email;u.birthDate=birth;u.role=role;u.position=position;u.address=address;if(supervisorId!==undefined)u.supervisorId=supervisorId;}
  } else {
    if(DB.users.find(x=>x.email===email)){toast(t('email_exists'),'error');return;}
    DB.users.push({id:uid(),name:fullName,firstName:fn,lastName:ln,email,password:pass,role,position,phone,address,supervisorId:supervisorId!==undefined?supervisorId:null,personalId:'',birthDate:birth,active:true,mustSetup:false,created:now()});
  }
  s();toast(t('toast_emp_saved'),'success');cm('mEmp');renderEmps();
}

function toggleEmp(id,active) { const u=DB.users.find(x=>x.id===id);if(u){u.active=active;s();renderEmps();} }

function openRP(id) { document.getElementById('rpUid').value=id;document.getElementById('rpPass').value='';om('mRP'); }

function doRP() {
  const id=document.getElementById('rpUid').value;
  const p=document.getElementById('rpPass').value.trim();
  if(p.length<6){toast(t('err_pass_short'),'error');return;}
  const u=DB.users.find(x=>x.id===id);if(u) u.password=p;
  s();toast(t('toast_pass_changed'),'success');cm('mRP');
}
