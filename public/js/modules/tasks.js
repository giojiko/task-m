/* ═══════════════════════════════════════════
   SmartPro — tasks.js
   Tasks CRUD, Kanban, Detail view, Subtasks
   ═══════════════════════════════════════════ */

let _taskView = 'list';

/* მიმდინარე გვერდის მიხედვით ახლებს სწორ view-ს */
function refreshView() {
  try {
    const dashPage  = document.getElementById('page-dashboard');
    const tasksPage = document.getElementById('page-tasks');
    const dashActive  = dashPage  && dashPage.classList.contains('active');
    const tasksActive = tasksPage && tasksPage.classList.contains('active');
    if(dashActive)  loadDash();
    if(tasksActive) renderTasks();
  } catch(e) { console.warn('refreshView error:', e); }
}

function loadTasks() { updateAddBtns(); applyI18n(); renderTasks(); }

function setTaskView(v) {
  _taskView = v;
  document.querySelectorAll('#page-tasks .tab').forEach((el,i) => el.classList.toggle('active',(v==='list'&&i===0)||(v==='kanban'&&i===1)));
  document.getElementById('tlistView').style.display  = v==='list'   ? '' : 'none';
  document.getElementById('tkanbanView').style.display = v==='kanban' ? '' : 'none';
  renderTasks();
}

function renderTasks() {
  const searchEl = document.getElementById('tsearch');
  if(!searchEl) return;
  const q  = searchEl.value.toLowerCase();
  const sf = document.getElementById('tsfil').value;
  const pf = document.getElementById('tpfil').value;
  let tasks = DB.tasks.filter(x => {
    if(x.parent) return false;
    if(_cu.role==='specialist' && !(x.assignees||[]).includes(_cu.id)) return false;
    if(sf && x.status!==sf) return false;
    if(pf && x.priority!==pf) return false;
    if(q && !x.title.toLowerCase().includes(q) && !clientName(x.client).toLowerCase().includes(q)) return false;
    return true;
  });
  if(_taskView==='list') renderTaskList(tasks); else renderKanban(tasks);
}

/* ── Deadline badge helper ───────────────────────────────────────────────── */

function deadlineBadge(x) {
  if(!x.deadline) return '<span class="tm">—</span>';
  const left = formatTimeLeft(x.deadline, x.status);
  if(left === null) {
    // დასრულებული / approved — ვადა ჩერდება
    return `<span style="color:var(--text3);font-size:11px">🏁 ${fd(x.deadline)}</span>`;
  }
  const overdue  = isDeadlineOverdue(x.deadline, x.status);
  const warning  = isDeadlineWarning(x.deadline, x.status);
  const color    = overdue ? 'var(--danger)' : warning ? 'var(--warning)' : 'inherit';
  const icon     = overdue ? '🔴' : warning ? '⚠️' : '📅';
  return `<span style="color:${color};font-size:11px;white-space:nowrap">${icon} ${left}</span>`;
}

/* ── List View ───────────────────────────────────────────────────────────── */

function renderTaskList(tasks) {
  const tb = document.getElementById('ttbody');
  if(!tasks.length){tb.innerHTML=`<tr><td colspan="8"><div class="empty"><div class="eico">📋</div><p>${t('no_tasks')}</p></div></td></tr>`;return;}
  tb.innerHTML = tasks.map(x=>{
    const assigneeSpans = (x.assignees&&x.assignees.length)
      ? x.assignees.filter(id=>id!==x.responsible).map(id=>`<span style="display:inline-flex;align-items:center;margin:1px 2px;padding:1px 7px;border-radius:10px;font-size:11px;background:var(--bg3);color:var(--text2)">${esc(userName(id))}</span>`).join('')||'<span class="tm">—</span>'
      : '<span class="tm">—</span>';
    const respSpan = x.responsible
      ? `<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:11px;background:rgba(27,234,205,.15);color:var(--accent);font-weight:700">👤 ${esc(userName(x.responsible))}</span>`
      : '<span class="tm">—</span>';
    return `<tr>
    <td style="cursor:pointer" onclick="openDetail('${x.id}')">
      <strong>${esc(x.title)}</strong>
      ${x.desc?`<div class="ts tm">${esc(x.desc.slice(0,55))}${x.desc.length>55?'...':''}</div>`:''}
      ${getSubs(x.id).length?`<div class="ts" style="color:var(--accent);margin-top:2px">📌 ${getSubs(x.id).length} ${t('subtasks')}</div>`:''}
    </td>
    <td>${clientName(x.client)||'<span class="tm">—</span>'}</td>
    <td>${assigneeSpans}</td>
    <td>${respSpan}</td>
    <td><span class="badge b-${x.priority}">${PL(x.priority)}</span></td>
    <td><span class="badge b-${x.status}">${SL(x.status)}</span></td>
    <td>${deadlineBadge(x)}</td>
    <td><div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn btn-ghost btn-xs" data-tip="${t('tip_view')}" onclick="openDetail('${x.id}')">👁</button>
      ${canM()?`<button class="btn btn-ghost btn-xs" data-tip="${t('tip_edit')}" onclick="openTaskModal('${x.id}')">✏️</button>
      <button class="btn btn-ghost btn-xs" data-tip="${t('tip_delete')}" onclick="delTask('${x.id}')">🗑</button>`:''}
      ${wfBtn(x)}
    </div></td>
  </tr>`;
  }).join('');
}

/* ── Workflow ───────────────────────────────────────────────────────────── */

function canApprove(x) {
  if(_cu.role === 'super_admin') return true;
  if(!x.responsible) return false;
  const resp = DB.users.find(u => u.id === x.responsible);
  return resp && resp.supervisorId === _cu.id;
}

function wfBtn(x) {
  if(x.status === 'pending_approval') {
    const isResp = (_cu.role !== 'specialist') || x.responsible === _cu.id;
    return [
      canApprove(x) ? `<button class="btn btn-success btn-xs" data-tip="${t('approve')}" onclick="approveTask('${x.id}')">✔ ${t('approve')}</button>` : '',
      isResp        ? `<button class="btn btn-warning btn-xs" data-tip="${t('cancel_approval')}" onclick="cancelApproval('${x.id}')">↩ ${t('cancel_approval')}</button>` : ''
    ].join('');
  }

  const isResponsible = (_cu.role !== 'specialist') || x.responsible === _cu.id;
  if(!isResponsible) return '';
  if(x.status==='pending'||x.status==='paused') return `<button class="btn-start btn-xs" data-tip="${t('tip_start')}" onclick="startTask('${x.id}')">▶</button>`;
  if(x.status==='in_progress') return `
    <button class="btn btn-warning btn-xs" data-tip="${t('tip_pause')}" onclick="openAction('${x.id}','pause')">⏸</button>
    <button class="btn btn-success btn-xs" data-tip="${t('tip_complete')}" onclick="openAction('${x.id}','complete')">✅</button>
    <button class="btn btn-danger btn-xs" data-tip="${t('tip_stop')}" onclick="openAction('${x.id}','stop')">⛔</button>`;
  return '';
}

function cancelApproval(id) {
  const x = DB.tasks.find(z => z.id === id);
  if(!x || x.status !== 'pending_approval') return;
  const isResp = (_cu.role !== 'specialist') || x.responsible === _cu.id;
  if(!isResp) return;
  x.status = 'in_progress';
  addLog(id, 'approval_cancelled');
  s();
  toast(t('toast_approval_cancelled'), 'success');
  refreshView();
}

function approveTask(id) {
  const x = DB.tasks.find(z => z.id === id);
  if(!x || !canApprove(x)) return;
  x.status = 'completed';
  x.completedAt = now();
  addLog(id, 'approved');
  s();
  toast(t('toast_approved'), 'success');
  refreshView();
}

/* ── Kanban ─────────────────────────────────────────────────────────────── */

function renderKanban(tasks) {
  const cols=[
    {k:'pending',        c:'#5A7080'},
    {k:'in_progress',    c:'#1BEACD'},
    {k:'paused',         c:'#E5D936'},
    {k:'pending_approval',c:'#A78BFA'},
    {k:'completed',      c:'#06B59C'},
    {k:'stopped',        c:'#FF4060'}
  ];
  document.getElementById('kboard').innerHTML = cols.map(c => {
    const ct = tasks.filter(x=>x.status===c.k);
    return `<div class="kcol">
      <div class="kch"><span style="color:${c.c}">${SL(c.k)}</span><span style="background:var(--bg4);padding:2px 7px;border-radius:10px;font-size:10px">${ct.length}</span></div>
      <div class="kcb">${ct.map(x=>`<div class="kcard" onclick="openDetail('${x.id}')">
        <div class="kcard-t">${esc(x.title)}</div><div class="kcard-m">${clientName(x.client)}</div>
        <div style="display:flex;justify-content:space-between;margin-top:7px;align-items:center">
          <span class="badge b-${x.priority}">${PL(x.priority)}</span>
          ${x.responsible?`<span class="ts tm">👤 ${userName(x.responsible)}</span>`:''}
        </div>
        ${x.deadline?`<div style="margin-top:5px;font-size:11px">${deadlineBadge(x)}</div>`:''}
      </div>`).join('')}</div>
    </div>`;
  }).join('');
}

function getSubs(pid) { return DB.tasks.filter(x=>x.parent===pid); }

/* ── Assign Dropdown ────────────────────────────────────────────────────── */

function buildAssignDrop() {
  const box = document.getElementById('assignDropBox');
  if(!box) return;
  box.innerHTML = DB.users.filter(u=>u.active).map(u=>`
    <div id="arow_${u.id}" style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:var(--radius2);cursor:pointer;transition:background .12s"
         onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
      <input type="checkbox" id="achk_${u.id}" style="width:14px;height:14px;accent-color:var(--accent);flex-shrink:0" onchange="updateAssignRow('${u.id}')">
      <span style="flex:1;font-size:12.5px">${esc(u.name||(u.firstName+' '+u.lastName)||u.email)}</span>
      <label id="arb_wrap_${u.id}" style="display:none;align-items:center;gap:3px;cursor:pointer;white-space:nowrap">
        <input type="radio" name="taskResponsible" id="arb_${u.id}" value="${u.id}"
               style="width:12px;height:12px;accent-color:var(--accent)" onchange="updateAssignLabel()">
        <span style="font-size:10px;color:var(--accent)">${t('responsible')}</span>
      </label>
    </div>`).join('');
  updateAssignLabel();
}

function updateAssignRow(uid) {
  const cb      = document.getElementById('achk_'+uid);
  const rbWrap  = document.getElementById('arb_wrap_'+uid);
  const rb      = document.getElementById('arb_'+uid);
  if(!cb) return;
  if(rbWrap) rbWrap.style.display = cb.checked ? 'flex' : 'none';
  if(!cb.checked && rb) rb.checked = false;
  updateAssignLabel();
}

function updateAssignLabel() {
  const label = document.getElementById('assignLabel'); if(!label) return;
  const checked = DB.users.filter(u=>{ const cb=document.getElementById('achk_'+u.id); return cb&&cb.checked; });
  const resp    = DB.users.find(u=>{ const rb=document.getElementById('arb_'+u.id); return rb&&rb.checked; });
  if(!checked.length){ label.textContent=t('no_assignees'); label.style.color='var(--text3)'; }
  else {
    label.style.color = 'inherit';
    label.innerHTML = checked.map(u=>{
      const nm  = u.name||(u.firstName+' '+u.lastName)||u.email;
      const isr = resp && resp.id===u.id;
      return `<span style="margin-right:4px;${isr?'color:var(--accent);font-weight:700':'color:var(--text2)'}">
        ${esc(nm)}${isr?` <small>(${t('responsible')})</small>`:''}</span>`;
    }).join('');
  }
}

function toggleAssignDrop() {
  const box=document.getElementById('assignDropBox'); if(!box) return;
  const open=box.style.display==='none';
  box.style.display=open?'block':'none';
  if(open) setTimeout(()=>document.addEventListener('click',closeAssignDrop,{once:true}),10);
}
function closeAssignDrop(e) {
  const wrap=document.getElementById('assignDropWrap');
  if(wrap&&!wrap.contains(e.target)){const box=document.getElementById('assignDropBox');if(box)box.style.display='none';}
}

/* ── Task Modal ─────────────────────────────────────────────────────────── */

function openTaskModal(id='') {
  document.getElementById('fTaskId').value=id;
  document.getElementById('mTaskTitle').textContent=id?t('tasks'):t('add_task');
  document.getElementById('fTclient').innerHTML=`<option value="">— ${t('client')} —</option>`+DB.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');
  buildAssignDrop();

  // deadline ველების ინიციალიზაცია
  const nowStr = now();
  const createdAtEl  = document.getElementById('fTcreatedAt');
  const durationEl   = document.getElementById('fTdurationDays');
  const deadlineEl   = document.getElementById('fTdeadlineDisplay');

  if(id){
    const x=DB.tasks.find(z=>z.id===id);
    if(x){
      document.getElementById('fTtitle').value=x.title;
      document.getElementById('fTdesc').value=x.desc||'';
      document.getElementById('fTclient').value=x.client||'';
      document.getElementById('fTprio').value=x.priority;
      // deadline ველები
      if(createdAtEl) createdAtEl.value = fdt(x.createdAt||x.created||nowStr);
      if(durationEl)  durationEl.value  = x.durationDays||'';
      if(deadlineEl)  deadlineEl.value  = x.deadline ? fdt(x.deadline) : '—';
      (x.assignees||[]).forEach(uid=>{const cb=document.getElementById('achk_'+uid);if(cb){cb.checked=true;updateAssignRow(uid);}});
      if(x.responsible){const rb=document.getElementById('arb_'+x.responsible);if(rb){rb.checked=true;updateAssignLabel();}}
    }
  } else {
    ['fTtitle','fTdesc'].forEach(f=>document.getElementById(f).value='');
    document.getElementById('fTclient').value='';
    document.getElementById('fTprio').value='medium';
    if(createdAtEl) createdAtEl.value = fdt(nowStr);
    if(durationEl)  durationEl.value  = '';
    if(deadlineEl)  deadlineEl.value  = '—';
  }
  om('mTask');
}

/** deadline-ის ავტო-გამოთვლა — durationDays input-ის onchange */
function onDurationChange() {
  const durationEl  = document.getElementById('fTdurationDays');
  const deadlineEl  = document.getElementById('fTdeadlineDisplay');
  if(!durationEl || !deadlineEl) return;
  const days = parseInt(durationEl.value, 10);
  if(!isNaN(days) && days > 0) {
    const taskId = document.getElementById('fTaskId').value;
    const task   = taskId ? DB.tasks.find(z=>z.id===taskId) : null;
    const base   = task ? (task.createdAt||task.created||now()) : now();
    const dl     = computeDeadline(base, days);
    deadlineEl.value = dl ? fdt(dl) : '—';
  } else {
    deadlineEl.value = '—';
  }
}

function saveTask() {
  const id    = document.getElementById('fTaskId').value;
  const title = document.getElementById('fTtitle').value.trim();
  if(!title){toast(t('err_title_req'),'error');return;}

  const assignees   = DB.users.filter(u=>{const cb=document.getElementById('achk_'+u.id);return cb&&cb.checked;}).map(u=>u.id);
  const responsible = DB.users.find(u=>{const rb=document.getElementById('arb_'+u.id);return rb&&rb.checked;})?.id||null;
  if(responsible && !assignees.includes(responsible)) assignees.push(responsible);

  // deadline გამოთვლა
  const durationEl  = document.getElementById('fTdurationDays');
  const durationDays = durationEl ? (parseInt(durationEl.value,10)||null) : null;

  const data = {
    title,
    desc:        document.getElementById('fTdesc').value.trim(),
    client:      document.getElementById('fTclient').value||null,
    assignees,
    responsible,
    priority:    document.getElementById('fTprio').value,
    durationDays,
  };

  if(id){
    const x = DB.tasks.find(z=>z.id===id);
    if(x){
      // deadline გადათვლა მხოლოდ თუ durationDays შეიცვალა
      if(durationDays && durationDays !== x.durationDays) {
        const base    = x.createdAt || x.created || now();
        data.deadline = computeDeadline(base, durationDays);
        data.notification_sent = false; // reset — შეიძლება ახალი გაფრთხილება გაიგზავნოს
      }
      Object.assign(x, data);
      addLog(id,'updated');
    }
  } else {
    const createdAt = now();
    const deadline  = durationDays ? computeDeadline(createdAt, durationDays) : null;
    const x = {
      id: uid(),
      ...data,
      status:    'pending',
      parent:    null,
      createdAt,
      created:   createdAt,
      deadline,
      notification_sent: false,
    };
    DB.tasks.push(x);
    addLog(x.id,'created');
  }
  s();
  toast(t('toast_task_saved'),'success');
  cm('mTask');
  refreshView();
}

function delTask(id) {
  if(!confirm(t('confirm_task_del'))) return;
  DB.tasks=DB.tasks.filter(x=>x.id!==id&&x.parent!==id);
  DB.tasklogs=DB.tasklogs.filter(l=>l.task!==id);delete DB.photos[id];
  s();toast(t('toast_task_deleted'),'success');refreshView();
}

function startTask(id) {
  const x=DB.tasks.find(z=>z.id===id);if(!x) return;
  x.status='in_progress';x.startedAt=now();addLog(id,'started');s();
  toast(t('toast_started'),'success');refreshView();
}

/* ── Action Modal ───────────────────────────────────────────────────────── */

let _actionFromDetail = false;

function openAction(id, type, fromDetail=false) {
  _actionFromDetail = fromDetail;
  document.getElementById('aTaskId').value=id;document.getElementById('aType').value=type;
  const titles={pause:t('action_pause_title'),complete:t('action_complete_title'),stop:t('action_stop_title')};
  const cls={pause:'btn btn-warning',complete:'btn btn-success',stop:'btn btn-danger'};
  const lbl={pause:t('action_pause'),complete:t('action_complete'),stop:t('action_stop')};
  document.getElementById('mActionTitle').textContent=titles[type];
  document.getElementById('aCmt').value='';document.getElementById('aPhotos').value='';
  document.getElementById('aPhotoSec').style.display=(type==='complete'||type==='stop')?'':'none';
  const btn=document.getElementById('aConfBtn');btn.className=cls[type];btn.textContent=lbl[type];
  om('mAction');
}

async function confirmAction() {
  const id=document.getElementById('aTaskId').value;const type=document.getElementById('aType').value;
  const cmt=document.getElementById('aCmt').value.trim();
  if(!cmt){toast(t('err_comment_req'),'error');return;}
  const x=DB.tasks.find(z=>z.id===id);if(!x) return;
  x.comment=cmt;
  if(type==='pause'){
    x.status='paused'; x.pausedAt=now(); addLog(id,'paused',cmt);
    // პაუზა deadline-ს არ ცვლის — ფიქსირებულია
  } else if(type==='complete'){
    x.status='pending_approval'; // deadline ათვლა ჩერდება pending_approval-ზე
    addLog(id,'completed',cmt);
  } else if(type==='stop'){
    x.status='stopped'; x.completedAt=now(); addLog(id,'stopped',cmt);
  }
  const photos=document.getElementById('aPhotos').files;
  if(photos.length>0){
    if(!DB.photos[id]) DB.photos[id]=[];
    for(const f of photos){try{const b64=await f2b(f);DB.photos[id].push({id:uid(),name:f.name,data:b64,by:_cu.id,at:now()});}catch{}}
    addLog(id,'photos');
  }
  s();
  const msgs={pause:t('toast_paused'),complete:t('pending_approval'),stop:t('toast_stopped')};
  toast(msgs[type],'success');
  cm('mAction');
  refreshView();
  if(_actionFromDetail) openDetail(id);
}

/* ── Detail Modal ───────────────────────────────────────────────────────── */

function openDetail(id) {
  const x=DB.tasks.find(z=>z.id===id);if(!x) return;
  document.getElementById('mDetailTitle').textContent=x.title;
  const isResponsible=_cu.role!=='specialist'||x.responsible===_cu.id;
  const isAssignee=_cu.role!=='specialist'||(x.assignees||[]).includes(_cu.id);
  const subs=getSubs(id);const photos=DB.photos[id]||[];
  const logs=(DB.tasklogs.filter(l=>l.task===id)||[]).reverse();
  const la={
    created:t('log_created'),updated:t('log_updated'),started:t('log_started'),
    paused:t('log_paused'),completed:t('log_completed'),stopped:t('log_stopped'),
    photos:t('log_photos'),approved:t('log_approved')
  };
  const stColors={'stopped':'rgba(255,64,96,.1)','paused':'rgba(229,217,54,.08)','completed':'rgba(27,234,205,.08)','pending_approval':'rgba(167,139,250,.1)'};
  const stBorders={'stopped':'rgba(255,64,96,.2)','paused':'rgba(229,217,54,.18)','completed':'rgba(27,234,205,.18)','pending_approval':'rgba(167,139,250,.25)'};

  const responsibleBlock = x.responsible
    ? `<div>
         <span class="ts tm">${t('responsible')}</span>
         <div style="margin-top:4px">
           <span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:rgba(27,234,205,.18);color:var(--accent);border:1px solid rgba(27,234,205,.3)">
             👤 ${esc(userName(x.responsible))}
           </span>
         </div>
       </div>`
    : '';

  const otherAssignees = (x.assignees||[]).filter(aid => aid !== x.responsible);
  const assigneesBlock = otherAssignees.length
    ? `<div style="grid-column:1/-1">
         <span class="ts tm">${t('assignees')}</span>
         <div style="margin-top:5px;display:flex;flex-wrap:wrap;gap:5px">
           ${otherAssignees.map(aid=>`<span style="display:inline-flex;align-items:center;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:500;background:var(--bg3);color:var(--text2);border:1px solid var(--border)">${esc(userName(aid))}</span>`).join('')}
         </div>
       </div>`
    : '';

  // Deadline info block
  const deadlineBlock = x.deadline ? (()=>{
    const left    = formatTimeLeft(x.deadline, x.status);
    const overdue = isDeadlineOverdue(x.deadline, x.status);
    const warning = isDeadlineWarning(x.deadline, x.status);
    const stopped = ['completed','stopped'].includes(x.status);
    const approved = x.status === 'pending_approval';
    let color = 'var(--text2)';
    if(overdue) color = 'var(--danger)';
    else if(warning) color = 'var(--warning)';

    return `<div style="grid-column:1/-1;padding:10px 13px;border-radius:var(--radius2);background:${overdue?'rgba(255,64,96,.07)':warning?'rgba(229,217,54,.07)':'rgba(27,234,205,.05)'};border:1px solid ${overdue?'rgba(255,64,96,.2)':warning?'rgba(229,217,54,.2)':'rgba(27,234,205,.12)'};display:flex;gap:18px;flex-wrap:wrap;align-items:center">
      <div><span class="ts tm">${t('created_at')}</span><div style="font-size:12px;margin-top:2px">${fdt(x.createdAt||x.created)}</div></div>
      ${x.durationDays?`<div><span class="ts tm">${t('duration_days')}</span><div style="font-size:12px;margin-top:2px;font-weight:600">${x.durationDays} ${t('day_short')}</div></div>`:''}
      <div><span class="ts tm">${t('deadline_auto')}</span><div style="font-size:12px;margin-top:2px;font-weight:600;color:${color}">${fd(x.deadline)}</div></div>
      ${left!==null?`<div><span class="ts tm">${t('days_left')}</span><div style="font-size:13px;margin-top:2px;font-weight:700;color:${color}">${left}</div></div>`:''}
      ${stopped||approved?`<div><span style="font-size:11px;color:var(--text3)">🏁 ${stopped?t('st_'+x.status):t('pending_approval')}</span></div>`:''}
    </div>`;
  })() : '';

  document.getElementById('mDetailBody').innerHTML=`
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap">
        <span class="badge b-${x.status}">${SL(x.status)}</span>
        <span class="badge b-${x.priority}">${PL(x.priority)}</span>
      </div>
      ${x.desc?`<div style="margin-bottom:12px;font-size:13px;color:var(--text2);line-height:1.6">${esc(x.desc)}</div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;font-size:13px">
        <div><span class="ts tm">${t('client')}</span><div style="margin-top:3px;font-weight:500">${clientName(x.client)||'—'}</div></div>
        ${responsibleBlock}
        ${assigneesBlock}
        ${deadlineBlock}
        ${x.startedAt?`<div><span class="ts tm">▶</span><div style="margin-top:3px">${fdt(x.startedAt)}</div></div>`:''}
        ${x.completedAt?`<div><span class="ts tm">🏁</span><div style="margin-top:3px">${fdt(x.completedAt)}</div></div>`:''}
      </div>
      ${x.comment?`<div style="padding:10px 13px;border-radius:var(--radius2);margin-bottom:12px;background:${stColors[x.status]||'rgba(27,234,205,.06)'};border:1px solid ${stBorders[x.status]||'rgba(27,234,205,.15)'};font-size:13px">💬 ${esc(x.comment)}</div>`:''}
      <div class="wfbar">
        ${isResponsible&&(x.status==='pending'||x.status==='paused')?`<button class="btn-start" onclick="startTask('${x.id}');openDetail('${x.id}')">${t('action_start')}</button>`:''}
        ${isResponsible&&x.status==='in_progress'?`
          <button class="btn btn-warning" onclick="cm('mDetail');openAction('${x.id}','pause',true)">${t('action_pause')}</button>
          <button class="btn btn-success" onclick="cm('mDetail');openAction('${x.id}','complete',true)">${t('action_complete')}</button>
          <button class="btn btn-danger" onclick="cm('mDetail');openAction('${x.id}','stop',true)">${t('action_stop')}</button>`:''}
        ${x.status==='pending_approval'&&canApprove(x)?`<button class="btn btn-success" onclick="approveTask('${x.id}');openDetail('${x.id}')">✔ ${t('approve')}</button>`:''}
        ${x.status==='pending_approval'&&isResponsible?`<button class="btn btn-warning" onclick="cancelApproval('${x.id}');openDetail('${x.id}')">↩ ${t('cancel_approval')}</button>`:''}
        ${x.status==='pending_approval'&&!isResponsible&&!canApprove(x)?`<span class="ts" style="color:var(--warning)">⏳ ${t('pending_approval')}</span>`:''}
        ${['completed','stopped'].includes(x.status)?`<span class="ts tm">${SL(x.status)}</span>`:''}
      </div>
      <div class="card" style="margin-top:10px">
        <div class="ch"><span class="ct">${t('subtasks')}</span>${isAssignee&&!['completed','stopped'].includes(x.status)?`<button class="btn btn-ghost btn-xs" onclick="openSubModal('${id}')">+ ${t('add')}</button>`:''}</div>
        ${subs.length?subs.map(s=>{
          const isSubOwner=s.assignedTo===_cu.id||(!s.assignedTo&&s.createdBy===_cu.id);
          const canApproveSub=isResponsible;
          const creatorName=userName(s.createdBy||s.assignedTo||'');
          return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);gap:8px">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.title)}</div>
              ${creatorName?`<div class="ts tm" style="margin-top:2px">👤 ${esc(creatorName)}</div>`:''}
            </div>
            <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
              <span class="badge b-${s.approved?'completed':s.status}">${s.approved?SL('completed'):SL(s.status)}</span>
              ${isSubOwner&&!s.approved&&s.status==='pending'?`<button class="btn btn-success btn-xs" onclick="completeSubtask('${s.id}','${id}')">✅ ${t('action_complete')}</button>`:''}
              ${canApproveSub&&!s.approved&&s.status==='pending_approval'?`<button class="btn btn-teal btn-xs" onclick="approveSubtask('${s.id}','${id}')">✔ ${t('approve_subtask')}</button>`:''}
            </div>
          </div>`;
        }).join(''):`<p class="tm ts" style="padding:8px 0">${t('no_subtasks')}</p>`}
      </div>
    </div>
    <div>
      <div class="card" style="margin-bottom:12px">
        <div class="ch"><span class="ct">${t('photos_optional')}</span>
          ${isResponsible?`<label class="btn btn-ghost btn-xs" style="cursor:pointer">📎 ${t('add')}<input type="file" accept="image/*" multiple style="display:none" onchange="uploadPhotos('${id}',this)"></label>`:''}
        </div>
        <div class="pgrid">
          ${photos.length?photos.map(p=>`<div class="pthumb" onclick="viewPhoto('${p.data}')">
            <img src="${p.data}" alt="">
            ${canM()?`<button class="pdel" onclick="event.stopPropagation();delPhoto('${id}','${p.id}')">✕</button>`:''}
          </div>`).join(''):`<p class="tm ts">${t('no_photos')}</p>`}
        </div>
      </div>
      <div class="card">
        <div class="ch"><span class="ct">${t('history')}</span></div>
        <div class="loglist">
          ${logs.length?logs.map(l=>`<div class="logitem">
            <div style="flex:1">
              <span style="font-weight:700;color:var(--accent)">${la[l.action]||l.action}</span>
              <span class="tm" style="margin-left:6px">${userName(l.by)}</span>
              ${l.comment?`<div class="tm ts" style="margin-top:2px">${esc(l.comment)}</div>`:''}
            </div>
            <span style="color:var(--text3);font-size:11px;white-space:nowrap">${fdt(l.at)}</span>
          </div>`).join(''):`<p class="tm ts">${t('no_logs')}</p>`}
        </div>
      </div>
    </div>
  </div>`;
  om('mDetail');
}

/* ── Photos ─────────────────────────────────────────────────────────────── */

async function uploadPhotos(tid,input) {
  if(!DB.photos[tid]) DB.photos[tid]=[];
  for(const f of input.files){try{const b64=await f2b(f);DB.photos[tid].push({id:uid(),name:f.name,data:b64,by:_cu.id,at:now()});}catch{}}
  addLog(tid,'photos');s();toast(t('photos_uploaded'),'success');cm('mDetail');openDetail(tid);
}

function delPhoto(tid,pid) {
  if(!confirm(t('confirm_photo_del'))) return;
  if(DB.photos[tid]) DB.photos[tid]=DB.photos[tid].filter(p=>p.id!==pid);
  s();toast(t('photo_deleted'),'success');cm('mDetail');openDetail(tid);
}

/* ── Subtasks ───────────────────────────────────────────────────────────── */

function openSubModal(pid) { document.getElementById('sParentId').value=pid;document.getElementById('sTitle').value='';document.getElementById('sDesc').value='';om('mSub'); }

function saveSub() {
  const pid=document.getElementById('sParentId').value;
  const title=document.getElementById('sTitle').value.trim();
  if(!title){toast(t('err_title_req'),'error');return;}
  const par=DB.tasks.find(z=>z.id===pid);
  if(!par) return;
  if(['completed','stopped'].includes(par.status)){toast(t('err_task_closed'),'error');return;}
  // ნებისმიერი assignee-ს შეუძლია დამატება
  const isAssigneeOfTask=_cu.role!=='specialist'||(par.assignees||[]).includes(_cu.id);
  if(!isAssigneeOfTask){toast(t('err_task_closed'),'error');return;}
  DB.tasks.push({
    id:uid(), parent:pid, title,
    desc:document.getElementById('sDesc').value.trim(),
    client:par.client||null,
    assignees:par.assignees||[], responsible:par.responsible||null,
    priority:'medium', status:'pending',
    createdAt:now(), created:now(),
    createdBy:_cu.id, assignedTo:_cu.id,
    completedBy:null, approvedBy:null, approved:false
  });
  if(['pending_approval','paused'].includes(par.status)){
    par.status='in_progress';
    addLog(pid,'restarted_by_subtask');
  }
  s();
  toast(t('toast_subtask_added'),'success');
  cm('mSub');
  refreshView();
  openDetail(pid);
}

function completeSubtask(sid, pid) {
  const sub=DB.tasks.find(z=>z.id===sid);if(!sub) return;
  const isOwner=sub.assignedTo===_cu.id||(!sub.assignedTo&&sub.createdBy===_cu.id);
  if(!isOwner) return;
  sub.status='pending_approval';sub.completedBy=_cu.id;
  addLog(pid,'subtask_completed');
  s();toast(t('pending_approval'),'success');
  openDetail(pid);
}

function approveSubtask(sid, pid) {
  const par=DB.tasks.find(z=>z.id===pid);if(!par) return;
  const isResp=_cu.role!=='specialist'||par.responsible===_cu.id;
  if(!isResp) return;
  const sub=DB.tasks.find(z=>z.id===sid);if(!sub) return;
  sub.status='completed';sub.approved=true;sub.approvedBy=_cu.id;sub.completedAt=now();
  addLog(pid,'subtask_approved');
  s();toast(t('subtask_approved'),'success');
  openDetail(pid);
}

/* ── Log ────────────────────────────────────────────────────────────────── */

function addLog(tid,action,comment='') {
  DB.tasklogs.push({id:uid(),task:tid,by:_cu.id,action,comment,at:now()});
}

/* ── Deadline warnings for dashboard ────────────────────────────────────── */

function getDeadlineWarnings() {
  return DB.tasks.filter(x => {
    if(x.parent) return false;
    if(['completed','stopped'].includes(x.status)) return false;
    if(!x.deadline) return false;
    return isDeadlineWarning(x.deadline, x.status) || isDeadlineOverdue(x.deadline, x.status);
  }).sort((a,b) => new Date(a.deadline)-new Date(b.deadline));
}
