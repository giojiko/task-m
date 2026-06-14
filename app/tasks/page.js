'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { StatusBadge, PriorityBadge } from '@/components/UI/Badge';
import { uid, fd, fdt, calcDeadline, deadlineStatus, timeLeft } from '@/lib/utils';

const STATUSES = ['pending','in_progress','paused','completed','stopped','pending_approval'];
const PRIORITIES = ['high','medium','low'];

function TaskModal({ task, onClose, onSave }) {
  const { db, user, t } = useApp();
  const isNew = !task?.id;
  const [form, setForm] = useState({
    title: task?.title || '',
    desc: task?.desc || '',
    client: task?.client || '',
    responsible: task?.responsible || '',
    assignees: task?.assignees || [],
    status: task?.status || 'pending',
    priority: task?.priority || 'medium',
    durationDays: task?.durationDays || '',
    parent: task?.parent || '',
  });
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const employees = (db?.users || []).filter(u => u.active !== false && u.role !== 'super_admin');
  const clients = db?.clients || [];
  const parentTasks = (db?.tasks || []).filter(t => !t.parent && t.id !== task?.id);

  const toggleAssignee = (uid) => {
    const cur = form.assignees;
    upd('assignees', cur.includes(uid) ? cur.filter(x => x !== uid) : [...cur, uid]);
  };

  const submit = () => {
    if (!form.title.trim()) return setErr(t('err_title_req'));
    const deadline = form.durationDays ? calcDeadline(task?.created || new Date().toISOString(), form.durationDays) : null;
    onSave({ ...task, ...form, deadline, title: form.title.trim() });
    onClose();
  };

  return (
    <Modal open title={isNew ? t('add_task') : t('edit')} onClose={onClose} size="modal-lg"
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-teal btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box" style={{ display:'block', marginBottom:10 }}>{err}</div>}
      <div className="fg">
        <label>{t('title_req')}</label>
        <input value={form.title} onChange={e => upd('title', e.target.value)} autoFocus />
      </div>
      <div className="fg">
        <label>{t('description')}</label>
        <textarea value={form.desc} onChange={e => upd('desc', e.target.value)} />
      </div>
      <div className="frow">
        <div className="fg">
          <label>{t('client')}</label>
          <select value={form.client} onChange={e => upd('client', e.target.value)}>
            <option value="">{t('no_direction')}</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>{t('priority')}</label>
          <select value={form.priority} onChange={e => upd('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{t(`pr_${p}`)}</option>)}
          </select>
        </div>
      </div>
      <div className="frow">
        <div className="fg">
          <label>{t('status')}</label>
          <select value={form.status} onChange={e => upd('status', e.target.value)}>
            {STATUSES.map(s => <option key={s} value={s}>{t(`st_${s}`)}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>{t('duration_days')}</label>
          <input type="number" min="1" value={form.durationDays} onChange={e => upd('durationDays', e.target.value)} />
        </div>
      </div>
      <div className="fg">
        <label>{t('subtasks')} — {t('responsible')}</label>
        <select value={form.responsible} onChange={e => upd('responsible', e.target.value)}>
          <option value="">{t('no_assignees')}</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
      </div>
      <div className="fg">
        <label>{t('assignees')}</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
          {employees.map(u => (
            <label key={u.id} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12 }}>
              <input type="checkbox" checked={form.assignees.includes(u.id)} onChange={() => toggleAssignee(u.id)} style={{ width:'auto' }} />
              {u.firstName} {u.lastName}
            </label>
          ))}
        </div>
      </div>
      {parentTasks.length > 0 && (
        <div className="fg">
          <label>{t('subtasks')} (parent)</label>
          <select value={form.parent} onChange={e => upd('parent', e.target.value)}>
            <option value="">— Root task —</option>
            {parentTasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        </div>
      )}
    </Modal>
  );
}

function ActionModal({ task, action, onClose, onSave, t }) {
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');

  const titleKey = { pause: 'action_pause_title', complete: 'action_complete_title', stop: 'action_stop_title' };
  const newStatus = { start: 'in_progress', pause: 'paused', complete: 'pending_approval', stop: 'stopped' };

  const submit = () => {
    if (['pause','complete','stop'].includes(action) && !comment.trim()) return setErr(t('err_comment_req'));
    onSave({ status: newStatus[action], comment: comment.trim() });
    onClose();
  };

  return (
    <Modal open title={t(titleKey[action] || 'status')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-teal btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box" style={{ display:'block', marginBottom:8 }}>{err}</div>}
      {['pause','complete','stop'].includes(action) && (
        <div className="fg">
          <label>{t('comment_req')}</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} autoFocus />
        </div>
      )}
    </Modal>
  );
}

function TaskDetailModal({ task, onClose, onRefresh }) {
  const { db, user, saveDB, t, toast } = useApp();
  const [actionModal, setActionModal] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [tab, setTab] = useState('info');

  const isResponsible = task.responsible === user.id || task.assignees?.includes(user.id);
  const canAct = user.role !== 'specialist' || isResponsible;
  const isAdmin = user.role === 'super_admin' || user.role === 'admin';

  const clientName = task.client ? (db?.clients || []).find(c => c.id === task.client)?.name || task.client : '—';
  const responsibleUser = task.responsible ? (db?.users || []).find(u => u.id === task.responsible) : null;
  const assigneeUsers = (task.assignees || []).map(id => (db?.users || []).find(u => u.id === id)).filter(Boolean);
  const logs = (db?.tasklogs || []).filter(l => l.taskId === task.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const subtasks = (db?.tasks || []).filter(tk => tk.parent === task.id);

  const applyAction = async ({ status, comment }) => {
    const logEntry = { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status, comment };
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status, updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), logEntry];
    await saveDB(newDb);
    toast(t(`toast_${status === 'in_progress' ? 'started' : status === 'paused' ? 'paused' : status === 'pending_approval' ? 'completed' : 'stopped'}`));
    onRefresh(newDb.tasks.find(tk => tk.id === task.id), newDb);
  };

  const approve = async () => {
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'completed', updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status: 'completed', comment: t('log_approved') }];
    await saveDB(newDb);
    toast(t('toast_approved'));
    onRefresh(newDb.tasks.find(tk => tk.id === task.id), newDb);
  };

  const cancelApproval = async () => {
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'in_progress', updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status: 'in_progress', comment: t('log_approval_cancelled') }];
    await saveDB(newDb);
    toast(t('toast_approval_cancelled'));
    onRefresh(newDb.tasks.find(tk => tk.id === task.id), newDb);
  };

  const addSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    if (['completed','stopped'].includes(task.status)) return toast(t('err_task_closed'), 'error');
    const newTask = { id: uid(), title: subtaskTitle.trim(), parent: task.id, status: 'pending', priority: 'medium', assignees: [], created: new Date().toISOString(), updated: new Date().toISOString() };
    const newDb = { ...db };
    newDb.tasks = [...newDb.tasks, newTask];
    if (task.status === 'pending') {
      newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'in_progress' } : tk);
    }
    await saveDB(newDb);
    setSubtaskTitle('');
    toast(t('toast_subtask_added'));
    onRefresh(newDb.tasks.find(tk => tk.id === task.id), newDb);
  };

  const ds = task.deadline ? deadlineStatus(task.deadline) : null;

  return (
    <Modal open title={task.title} onClose={onClose} size="modal-xl">
      <div className="tabs" style={{ marginBottom:14 }}>
        {['info','subtasks','logs'].map(tb => (
          <button key={tb} className={`tab${tab===tb?' active':''}`} onClick={() => setTab(tb)}>
            {tb === 'info' ? t('description') : tb === 'subtasks' ? t('subtasks') : t('history')}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:14, fontSize:13 }}>
            <div><span style={{ color:'var(--text3)' }}>{t('status')}: </span><StatusBadge status={task.status} /></div>
            <div><span style={{ color:'var(--text3)' }}>{t('priority')}: </span><PriorityBadge priority={task.priority} /></div>
            <div><span style={{ color:'var(--text3)' }}>{t('client')}: </span>{clientName}</div>
            <div><span style={{ color:'var(--text3)' }}>{t('responsible')}: </span>{responsibleUser ? `${responsibleUser.firstName} ${responsibleUser.lastName}` : '—'}</div>
            {task.deadline && (
              <div style={{ gridColumn:'1/-1' }}>
                <span style={{ color:'var(--text3)' }}>{t('deadline_auto')}: </span>
                <span style={{ color: ds === 'overdue' ? 'var(--danger)' : ds === 'warning' ? 'var(--warning)' : 'var(--text)' }}>
                  {fd(task.deadline)} {ds !== 'ok' && ds && `(${t(ds === 'overdue' ? 'overdue' : 'deadline_warning')})`}
                </span>
              </div>
            )}
          </div>
          {assigneeUsers.length > 0 && (
            <div style={{ marginBottom:12, fontSize:13 }}>
              <span style={{ color:'var(--text3)' }}>{t('assignees')}: </span>
              {assigneeUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ')}
            </div>
          )}
          {task.desc && <p style={{ fontSize:13, color:'var(--text2)', marginBottom:14 }}>{task.desc}</p>}

          {canAct && !['completed','stopped'].includes(task.status) && (
            <div className="wfbar">
              {task.status === 'pending' && <button className="btn-start" onClick={() => setActionModal('start')}>{t('action_start')}</button>}
              {task.status === 'in_progress' && <>
                <button className="btn btn-warning btn-sm" onClick={() => setActionModal('pause')}>{t('action_pause')}</button>
                <button className="btn btn-success btn-sm" onClick={() => setActionModal('complete')}>{t('action_complete')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => setActionModal('stop')}>{t('action_stop')}</button>
              </>}
              {task.status === 'paused' && <>
                <button className="btn-start" onClick={() => setActionModal('start')}>{t('action_start')}</button>
                <button className="btn btn-danger btn-sm" onClick={() => setActionModal('stop')}>{t('action_stop')}</button>
              </>}
              {task.status === 'pending_approval' && isAdmin && <>
                <button className="btn btn-success btn-sm" onClick={approve}>{t('approve')}</button>
                <button className="btn btn-ghost btn-sm" onClick={cancelApproval}>{t('cancel_approval')}</button>
              </>}
            </div>
          )}
        </>
      )}

      {tab === 'subtasks' && (
        <>
          {subtasks.length === 0 ? <div className="empty"><div className="eico">📋</div>{t('no_subtasks')}</div>
            : subtasks.map(st => (
              <div key={st.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 0', borderTop:'1px solid var(--border)', fontSize:13 }}>
                <span>{st.title}</span>
                <StatusBadge status={st.status} />
              </div>
            ))
          }
          {canAct && !['completed','stopped'].includes(task.status) && (
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <input value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)} placeholder={t('add_subtask')} onKeyDown={e => e.key === 'Enter' && addSubtask()} />
              <button className="btn btn-teal btn-sm" onClick={addSubtask}>{t('add')}</button>
            </div>
          )}
        </>
      )}

      {tab === 'logs' && (
        <div className="loglist">
          {logs.length === 0 ? <div className="empty"><div className="eico">📋</div>{t('no_logs')}</div>
            : logs.map(l => {
              const u = (db?.users || []).find(x => x.id === l.userId);
              return (
                <div key={l.id} className="logitem">
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600 }}>{u ? `${u.firstName} ${u.lastName}` : '?'} — <StatusBadge status={l.status} /></div>
                    {l.comment && <div style={{ color:'var(--text2)', marginTop:3 }}>{l.comment}</div>}
                  </div>
                  <div style={{ color:'var(--text3)', whiteSpace:'nowrap', fontSize:11 }}>{fdt(l.date)}</div>
                </div>
              );
            })
          }
        </div>
      )}

      {actionModal && (
        <ActionModal task={task} action={actionModal} onClose={() => setActionModal(null)} onSave={applyAction} t={t} />
      )}
    </Modal>
  );
}

export default function TasksPage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [modalTask, setModalTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const tasks = db?.tasks || [];
  const myTasks = user?.role === 'specialist'
    ? tasks.filter(tk => tk.assignees?.includes(user.id) || tk.responsible === user.id)
    : tasks;

  const filtered = useMemo(() => myTasks.filter(tk => {
    if (search && !tk.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && tk.status !== filterStatus) return false;
    if (filterPriority && tk.priority !== filterPriority) return false;
    return true;
  }), [myTasks, search, filterStatus, filterPriority]);

  const rootTasks = filtered.filter(tk => !tk.parent);

  const handleSave = async (data) => {
    const newDb = { ...db };
    const isNew = !data.id;
    if (isNew) {
      data.id = uid();
      data.created = new Date().toISOString();
      data.tasklogs = [];
      data.photos = [];
      newDb.tasks = [...newDb.tasks, { ...data, updated: data.created }];
      newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: data.id, userId: user.id, date: data.created, status: 'created', comment: t('log_created') }];
    } else {
      newDb.tasks = newDb.tasks.map(tk => tk.id === data.id ? { ...data, updated: new Date().toISOString() } : tk);
      newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: data.id, userId: user.id, date: new Date().toISOString(), status: 'updated', comment: t('log_updated') }];
    }
    await saveDB(newDb);
    toast(t('toast_task_saved'));
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_task_del'))) return;
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.filter(tk => tk.id !== id && tk.parent !== id);
    await saveDB(newDb);
    toast(t('toast_task_deleted'));
  };

  const refreshDetail = (updated, newDb) => {
    if (updated) setModalTask(updated);
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const getClientName = (clientId) => {
    if (!clientId) return '—';
    return (db?.clients || []).find(c => c.id === clientId)?.name || '—';
  };

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('tasks')}</div></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div className="tabs">
            <button className={`tab${viewMode==='list'?' active':''}`} onClick={() => setViewMode('list')}>{t('list')}</button>
            <button className={`tab${viewMode==='kanban'?' active':''}`} onClick={() => setViewMode('kanban')}>{t('kanban')}</button>
          </div>
          {isAdmin && <button className="btn btn-teal btn-sm" onClick={() => { setEditTask(null); setShowForm(true); }}>{t('add_task')}</button>}
        </div>
      </div>
      <div className="accent-line" />

      <div className="sbar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">{t('all_statuses')}</option>
          {STATUSES.map(s => <option key={s} value={s}>{t(`st_${s}`)}</option>)}
        </select>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">{t('all_priorities')}</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{t(`pr_${p}`)}</option>)}
        </select>
      </div>

      {viewMode === 'list' ? (
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>{t('title')}</th>
                <th>{t('client')}</th>
                <th>{t('status')}</th>
                <th>{t('priority')}</th>
                <th>{t('deadline')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {rootTasks.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>{t('no_tasks')}</td></tr>
              ) : rootTasks.map(tk => {
                const ds = tk.deadline ? deadlineStatus(tk.deadline) : null;
                return (
                  <tr key={tk.id}>
                    <td><span style={{ cursor:'pointer', color:'var(--accent)' }} onClick={() => setModalTask(tk)}>{tk.title}</span></td>
                    <td style={{ color:'var(--text2)' }}>{getClientName(tk.client)}</td>
                    <td><StatusBadge status={tk.status} /></td>
                    <td><PriorityBadge priority={tk.priority} /></td>
                    <td style={{ color: ds === 'overdue' ? 'var(--danger)' : ds === 'warning' ? 'var(--warning)' : 'var(--text2)', fontSize:12 }}>
                      {tk.deadline ? fd(tk.deadline) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-xs" data-tip={t('tip_view')} onClick={() => setModalTask(tk)}>👁</button>
                        {isAdmin && <>
                          <button className="btn btn-ghost btn-xs" data-tip={t('tip_edit')} onClick={() => { setEditTask(tk); setShowForm(true); }}>✏️</button>
                          <button className="btn btn-danger btn-xs" data-tip={t('tip_delete')} onClick={() => handleDelete(tk.id)}>🗑</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="kanban">
          {STATUSES.map(s => {
            const col = filtered.filter(tk => tk.status === s);
            const colors = { pending:'#5A7080', in_progress:'var(--accent)', paused:'var(--warning)', completed:'var(--accent2)', stopped:'var(--danger)', pending_approval:'var(--purple)' };
            return (
              <div key={s} className="kcol">
                <div className="kch" style={{ color: colors[s] }}>
                  <span>{t(`st_${s}`)}</span>
                  <span style={{ background:'var(--bg4)', padding:'1px 6px', borderRadius:10, fontSize:10, color:'var(--text2)' }}>{col.length}</span>
                </div>
                <div className="kcb">
                  {col.map(tk => (
                    <div key={tk.id} className="kcard" onClick={() => setModalTask(tk)}>
                      <div className="kcard-t">{tk.title}</div>
                      <div className="kcard-m"><PriorityBadge priority={tk.priority} /></div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TaskModal task={editTask} onClose={() => setShowForm(false)} onSave={handleSave} />
      )}
      {modalTask && (
        <TaskDetailModal task={modalTask} onClose={() => setModalTask(null)} onRefresh={refreshDetail} />
      )}
    </AppShell>
  );
}
