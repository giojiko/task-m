/* ═══════════════════════════════════════════
   SmartPro — auth.js
   Login, Logout, Session, First-setup
   ═══════════════════════════════════════════ */

function doLogin() {
  const email = document.getElementById('lemail').value.trim();
  const pass  = document.getElementById('lpass').value;
  const errEl = document.getElementById('loginErr');
  errEl.style.display = 'none';
  const u = DB.users.find(x => x.email===email && x.active);
  if(!u || u.password!==pass) { errEl.textContent=t('err_login'); errEl.style.display='block'; return; }
  _cu = u; localStorage.setItem('spro_session', u.id);
  if(u.mustSetup) { startApp(); showSetupModal(); }
  else startApp();
}

function doLogout() {
  _cu = null; localStorage.removeItem('spro_session');
  document.getElementById('appShell').style.display = 'none';
  document.getElementById('loginPage').style.display = 'flex';
  applyI18n();
}

function startApp() {
  document.getElementById('loginPage').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';
  const nm  = _cu.name || ((_cu.firstName+' '+_cu.lastName).trim()) || _cu.email;
  const ini = nm.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('tav').textContent  = ini;
  document.getElementById('tname').textContent = nm;
  const rEl = document.getElementById('trole');
  rEl.textContent = RL(_cu.role); rEl.className = `rtag r-${_cu.role}`;
  const isSp = _cu.role === 'specialist';
  document.getElementById('navC').style.display = isSp ? 'none' : '';
  // navD (directions) — ყველა role-ისთვის ჩანს, სტილი იგივეა
  document.getElementById('navE').style.display = isSp ? 'none' : '';
  const dirLbl = document.getElementById('sidebarDirLabel'); if(dirLbl) dirLbl.style.display = 'none';
  updateAddBtns(); applyI18n(); renderSidebarDirs(); goto('dashboard'); initAsync();
}

function updateAddBtns() {
  if(!_cu) return;
  const isSp = _cu.role === 'specialist';
  const isSA = _cu.role === 'super_admin';
  const tBtn=document.getElementById('addTaskBtn'); if(tBtn) tBtn.style.display=(!isSp)?'inline-flex':'none';
  const cBtn=document.getElementById('addClientBtn'); if(cBtn) cBtn.style.display=isSA?'inline-flex':'none';
  const wBtn=document.getElementById('addWhBtn'); if(wBtn) wBtn.style.display=(!isSp)?'inline-flex':'none';
  const eBtn=document.getElementById('addEmpBtn'); if(eBtn) eBtn.style.display=(!isSp)?'inline-flex':'none';
}

function showSetupModal() {
  document.getElementById('suFirst').value  = _cu.firstName || '';
  document.getElementById('suLast').value   = _cu.lastName  || '';
  document.getElementById('suBirth').value  = _cu.birthDate || '';
  document.getElementById('suPhone').value  = _cu.phone     || '';
  document.getElementById('suPid').value    = _cu.personalId|| '';
  document.getElementById('suNewPass').value  = '';
  document.getElementById('suNewPass2').value = '';
  applyI18n(); document.getElementById('mSetup').classList.add('open');
}

function saveSetup() {
  const fn=document.getElementById('suFirst').value.trim();
  const ln=document.getElementById('suLast').value.trim();
  const bd=document.getElementById('suBirth').value;
  const ph=document.getElementById('suPhone').value.trim();
  const pid=document.getElementById('suPid').value.trim();
  const np=document.getElementById('suNewPass').value;
  const np2=document.getElementById('suNewPass2').value;
  if(!fn||!ln||!bd||!ph||!pid){toast(t('err_fields_req'),'error');return;}
  if(pid.length!==11||!/^\d{11}$/.test(pid)){toast(t('err_pid_11'),'error');return;}
  if(!np||np.length<6){toast(t('err_pass_short'),'error');return;}
  if(!np||np.length<6){toast(t('err_pass_short'),'error');return;}
  if(np!==np2){toast(t('err_pass_mismatch'),'error');return;}
  const u=DB.users.find(x=>x.id===_cu.id);
  if(u){u.firstName=fn;u.lastName=ln;u.name=fn+' '+ln;u.birthDate=bd;u.phone=ph;u.personalId=pid;u.password=np;u.mustSetup=false;_cu=u;}
  s(); document.getElementById('mSetup').classList.remove('open');
  const ini=(fn[0]+(ln[0]||'')).toUpperCase();
  document.getElementById('tav').textContent=ini;
  document.getElementById('tname').textContent=fn+' '+ln;
  toast(t('toast_emp_saved'),'success');
}

// Profile
function loadProfile() {
  applyI18n();
  const fields=[
    [t('first_name_lbl').replace(' *',''),_cu.firstName||(_cu.name?.split(' ')[0])||'—'],
    [t('last_name_lbl').replace(' *',''), _cu.lastName||(_cu.name?.split(' ')[1])||'—'],
    [t('email_lbl'),   _cu.email],
    [t('mobile_lbl').replace(' *',''), _cu.phone||'—'],
    [t('birth_date_lbl').replace(' *',''), _cu.birthDate?fd(_cu.birthDate):'—'],
    [t('personal_id_lbl').replace(' *',''), _cu.personalId||'—'],
    [t('position'), _cu.position||'—'],
    [t('emp_address'), _cu.address||'—'],
    [t('role'), `<span class="rtag r-${_cu.role}">${RL(_cu.role)}</span>`],
    ...(_cu.supervisorId?[[t('supervisor'),(()=>{const s=DB.users.find(x=>x.id===_cu.supervisorId);return s?esc(s.name||(s.firstName+' '+s.lastName)||s.email):'—';})()]]:[] ),
  ];
  document.getElementById('profInfo').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
    ${fields.map(([label,val])=>`<div><span class="ts tm">${label}</span><div style="margin-top:3px;font-weight:500">${val}</div></div>`).join('')}
  </div>`;
}

function openProfileEdit() {
  document.getElementById('peFirst').value=_cu.firstName||(_cu.name?.split(' ')[0])||'';
  document.getElementById('peLast').value=_cu.lastName||(_cu.name?.split(' ')[1])||'';
  document.getElementById('peBirth').value=_cu.birthDate||'';
  document.getElementById('pePhone').value=_cu.phone||'';
  document.getElementById('pePid').value=_cu.personalId||'';
  document.getElementById('pePosition').value=_cu.position||'';
  applyI18n(); om('mProfileEdit');
}

function saveProfileEdit() {
  const fn=document.getElementById('peFirst').value.trim();
  const ln=document.getElementById('peLast').value.trim();
  const pid=document.getElementById('pePid').value.trim();
  if(pid&&(pid.length!==11||!/^\d{11}$/.test(pid))){toast(t('err_pid_11'),'error');return;}
  const u=DB.users.find(x=>x.id===_cu.id);
  if(u){u.firstName=fn;u.lastName=ln;if(fn||ln)u.name=(fn+' '+ln).trim();u.birthDate=document.getElementById('peBirth').value;u.phone=document.getElementById('pePhone').value.trim();u.personalId=pid;u.position=document.getElementById('pePosition').value.trim()||null;_cu=u;}
  s();toast(t('toast_emp_saved'),'success');cm('mProfileEdit');
  const nm=_cu.name||_cu.email;
  document.getElementById('tname').textContent=nm;
  document.getElementById('tav').textContent=nm.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  loadProfile();
}

function changePw() {
  const cur=document.getElementById('pCur').value;
  const np=document.getElementById('pNew').value;
  const np2=document.getElementById('pNew2').value;
  if(np!==np2){toast(t('err_pass_mismatch'),'error');return;}
  if(_cu.password!==cur){toast(t('err_cur_pass'),'error');return;}
  const u=DB.users.find(x=>x.id===_cu.id);if(u){u.password=np;_cu.password=np;}
  s();toast(t('toast_pass_changed'),'success');
  ['pCur','pNew','pNew2'].forEach(f=>document.getElementById(f).value='');
}

// Keyboard shortcuts on login
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('lpass')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  document.getElementById('lemail')?.addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  // Auto-login from session
  applyI18n();
  const sid = localStorage.getItem('spro_session');
  if(sid) { const u=DB.users.find(x=>x.id===sid&&x.active); if(u){_cu=u;startApp();if(u.mustSetup)showSetupModal();} }
});
