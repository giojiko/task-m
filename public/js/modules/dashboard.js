/* ═══════════════════════════════════════════
   SmartPro — dashboard.js
   Dashboard statistics and charts
   ═══════════════════════════════════════════ */

function loadDash() {
  document.getElementById('dwelcome').textContent = t('welcome_msg') + ', ' + _cu.name;

  // სპეციალისტს — მხოლოდ assignees[]-ში მყოფი ტასკები
  const allMyTasks = DB.tasks.filter(x => !x.parent && (
    _cu.role === 'specialist' ? (x.assignees||[]).includes(_cu.id) : true
  ));

  // სპეციალისტის Dashboard-ზე მხოლოდ active სტატუსები
  const ACTIVE = ['pending','in_progress','paused'];
  const myTasks = _cu.role === 'specialist'
    ? allMyTasks.filter(x => ACTIVE.includes(x.status))
    : allMyTasks;

  const tm = {};
  myTasks.forEach(x => { tm[x.status] = (tm[x.status]||0) + 1; });
  const total = myTasks.length;
  const low = DB.wh.filter(i => i.qty <= i.minQty).length;

  // Warehouse badge
  document.getElementById('wbadge').style.display = low > 0 ? '' : 'none';
  if(low > 0) document.getElementById('wbadge').textContent = low;

  // Stats cards — სპეციალისტს completed არ ეჩვენება
  document.getElementById('sgrid').innerHTML = `
    <div class="scard teal"><div class="si">📋</div><div class="sv">${total}</div><div class="sl">${t('total_tasks')}</div></div>
    <div class="scard blue"><div class="si">▶️</div><div class="sv">${tm.in_progress||0}</div><div class="sl">${t('in_progress_tasks')}</div></div>
    ${_cu.role!=='specialist'?`<div class="scard teal"><div class="si">✅</div><div class="sv">${tm.completed||0}</div><div class="sl">${t('completed_tasks')}</div></div>`:''}
    ${_cu.role!=='specialist'?`<div class="scard purple"><div class="si">👥</div><div class="sv">${DB.clients.length}</div><div class="sl">${t('clients_count')}</div></div>`:''}
    ${low>0?`<div class="scard red"><div class="si">⚠️</div><div class="sv" style="color:var(--danger)">${low}</div><div class="sl">${t('low_stock')}</div></div>`:''}
    ${_cu.role==='super_admin'?`<div class="scard blue"><div class="si">🏢</div><div class="sv">${DB.users.filter(u=>u.active).length}</div><div class="sl">${t('employees_count')}</div></div>`:''}
  `;

  // Recent tasks — სპეციალისტს completed/stopped გარეშე
  const rec = myTasks.slice(-5).reverse();
  document.getElementById('rtasks').innerHTML = rec.length
    ? rec.map(x=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer;gap:8px" onclick="openDetail('${x.id}')">
        <div><div style="font-weight:600;font-size:13px">${esc(x.title)}</div>
        <div class="ts tm">${clientName(x.client)}${x.responsible?' · '+userName(x.responsible):''}</div></div>
        <span class="badge b-${x.status}">${SL(x.status)}</span>
      </div>`).join('')
    : `<div class="empty" style="padding:20px"><p>${t('no_tasks')}</p></div>`;

  // ── Deadline warnings — admin/super_admin მხოლოდ ──────────────────────────
  if(_cu.role !== 'specialist') {
    const warnings = typeof getDeadlineWarnings === 'function' ? getDeadlineWarnings() : [];
    const warnEl = document.getElementById('deadline-warnings');
    if(warnEl) {
      if(warnings.length) {
        warnEl.innerHTML = `
          <div class="card" style="margin-bottom:18px;border:1px solid rgba(229,217,54,.25)">
            <div class="ch" style="background:rgba(229,217,54,.06)">
              <span class="ct" style="color:var(--warning)">${t('deadline_warning_title')}</span>
              <span style="background:var(--warning);color:#000;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:700">${warnings.length}</span>
            </div>
            <div style="overflow-x:auto">
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <thead>
                  <tr style="color:var(--text3);font-size:11px">
                    <th style="text-align:left;padding:6px 10px;font-weight:500">${t('title')}</th>
                    <th style="text-align:left;padding:6px 10px;font-weight:500">${t('responsible')}</th>
                    <th style="text-align:left;padding:6px 10px;font-weight:500">${t('deadline_auto')}</th>
                    <th style="text-align:left;padding:6px 10px;font-weight:500">${t('days_left')}</th>
                    <th style="text-align:left;padding:6px 10px;font-weight:500">${t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${warnings.map(x => {
                    const left    = formatTimeLeft(x.deadline, x.status);
                    const overdue = isDeadlineOverdue(x.deadline, x.status);
                    const color   = overdue ? 'var(--danger)' : 'var(--warning)';
                    return `<tr style="border-top:1px solid var(--border);cursor:pointer" onclick="openDetail('${x.id}')">
                      <td style="padding:8px 10px;font-weight:600">${esc(x.title)}</td>
                      <td style="padding:8px 10px;color:var(--text2)">${x.responsible ? userName(x.responsible) : '<span class="tm">—</span>'}</td>
                      <td style="padding:8px 10px;color:var(--text2)">${fd(x.deadline)}</td>
                      <td style="padding:8px 10px;font-weight:700;color:${color}">${overdue ? '🔴' : '⚠️'} ${left}</td>
                      <td style="padding:8px 10px"><span class="badge b-${x.status}">${SL(x.status)}</span></td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>`;
      } else {
        warnEl.innerHTML = '';
      }
    }
  }

  // Status bar chart — სპეციალისტს მხოლოდ active სტატუსები
  const allStatuses = [
    {k:'pending',c:'#5A7080'},{k:'in_progress',c:'#1BEACD'},{k:'paused',c:'#E5D936'},
    {k:'completed',c:'#06B59C'},{k:'stopped',c:'#FF4060'}
  ];
  const statuses = _cu.role === 'specialist'
    ? allStatuses.filter(x => ACTIVE.includes(x.k))
    : allStatuses;
  document.getElementById('tchart').innerHTML = statuses.map(x => {
    const cnt = tm[x.k]||0;
    const pct = total ? Math.round(cnt/total*100) : 0;
    return `<div class="bar-row">
      <div class="bar-label"><span>${SL(x.k)}</span><span style="color:${x.c}">${cnt}</span></div>
      <div class="bar-bg"><div class="bar-fill" style="background:${x.c};width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
