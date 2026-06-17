'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { StatusBadge, PriorityBadge } from '@/components/UI/Badge';
import TaskDetailModal from '@/components/UI/TaskDetailModal';
import { uid, fd, fdt, calcDeadline, deadlineStatus } from '@/lib/utils';

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

  const allUsers = (db?.users || []).filter(u => u.active !== false);
  const employees = user.role === 'super_admin'
    ? allUsers
    : user.role === 'admin'
      ? allUsers.filter(u => u.role !== 'super_admin')
      : allUsers.filter(u => u.role === 'specialist' || u.role === 'admin');
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
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
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
        <label>{t('responsible')}</label>
        <select value={form.responsible} onChange={e => upd('responsible', e.target.value)}>
          <option value="">{t('no_assignees')}</option>
          {employees.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
      </div>
      <div className="fg">
        <label>{t('assignees')}</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 160, overflowY: 'auto', background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '8px 10px', border: '1px solid var(--border)' }}>
          {employees.map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, padding: '3px 0' }}>
              <input type="checkbox" checked={form.assignees.includes(u.id)} onChange={() => toggleAssignee(u.id)} style={{ width: 14, height: 14, accentColor: 'var(--accent)', flexShrink: 0 }} />
              <div className="avatar avatar-sm">{u.firstName?.[0]}{u.lastName?.[0]}</div>
              <span style={{ flex: 1 }}>{u.firstName} {u.lastName}</span>
              <span className={`badge b-${u.role}`} style={{ fontSize: 9, marginLeft: 'auto' }}>{t('r_' + u.role)}</span>
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


export default function TasksPage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [view, setView] = useState('list');
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
    const prevResponsible = !isNew ? (db.tasks || []).find(tk => tk.id === data.id)?.responsible : null;
    if (isNew) {
      data.id = uid();
      data.created = new Date().toISOString();
      data.photos = [];
      newDb.tasks = [...newDb.tasks, { ...data, updated: data.created }];
      newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: data.id, userId: user.id, date: data.created, status: 'created', comment: t('log_created') }];
    } else {
      newDb.tasks = newDb.tasks.map(tk => tk.id === data.id ? { ...data, updated: new Date().toISOString() } : tk);
      newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: data.id, userId: user.id, date: new Date().toISOString(), status: 'updated', comment: t('log_updated') }];
    }
    await saveDB(newDb);
    toast(t('toast_task_saved'));

    if (data.responsible && data.responsible !== prevResponsible) {
      const responsible = (newDb.users || []).find(u => u.id === data.responsible);
      const client = (newDb.clients || []).find(c => c.id === data.client);
      if (responsible?.email) {
        fetch('/api/email/task-assigned', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task: data, responsible, client }),
        }).catch(e => console.warn('task email failed', e));
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_task_del'))) return;
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.filter(tk => tk.id !== id && tk.parent !== id);
    await saveDB(newDb);
    toast(t('toast_task_deleted'));
  };

  const refreshDetail = (updated) => {
    if (updated) setModalTask(updated);
  };


  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const getClientName = (clientId) => clientId ? (db?.clients || []).find(c => c.id === clientId)?.name || '—' : '—';

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('tasks')}</div></div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <div className="view-toggle">
            <button className={`view-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')}>
              ☰ {t('list_view')}
            </button>
            <button className={`view-btn ${view === 'board' ? 'active' : ''}`} onClick={() => setView('board')}>
              ⊞ {t('board_view')}
            </button>
          </div>
          {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setShowForm(true); }}>{t('add_task')}</button>}
        </div>
      </div>

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

      {view === 'list' ? (
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
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>{t('no_tasks')}</td></tr>
              ) : rootTasks.map(tk => {
                const ds = tk.deadline ? deadlineStatus(tk.deadline) : null;
                return (
                  <tr key={tk.id}>
                    <td><span style={{ cursor:'pointer', color:'var(--accent)', fontWeight: 500 }} onClick={() => setModalTask(tk)}>{tk.title}</span></td>
                    <td style={{ color:'var(--text-secondary)' }}>{getClientName(tk.client)}</td>
                    <td><StatusBadge status={tk.status} /></td>
                    <td><PriorityBadge priority={tk.priority} /></td>
                    <td style={{ color: ds === 'overdue' ? 'var(--danger)' : ds === 'warning' ? 'var(--warning)' : 'var(--text-secondary)', fontSize:12 }}>
                      {tk.deadline ? fd(tk.deadline) : '—'}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setModalTask(tk)}>👁</button>
                        {isAdmin && <>
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditTask(tk); setShowForm(true); }}>✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete(tk.id)}>🗑</button>
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
            const colors = { pending:'var(--text-muted)', in_progress:'var(--accent)', paused:'var(--warning)', completed:'var(--success)', stopped:'var(--danger)', pending_approval:'var(--purple)' };
            return (
              <div key={s} className="kcol">
                <div className="kch" style={{ color: colors[s] }}>
                  <span>{t(`st_${s}`)}</span>
                  <span style={{ background:'var(--bg-muted)', padding:'1px 7px', borderRadius:10, fontSize:10, color:'var(--text-secondary)' }}>{col.length}</span>
                </div>
                <div className="kcb">
                  {col.length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>—</div>
                    : col.map(tk => (
                      <div key={tk.id} className="kcard" onClick={() => setModalTask(tk)}>
                        <div className="kcard-t">{tk.title}</div>
                        <div className="kcard-m">
                          <PriorityBadge priority={tk.priority} />
                          {tk.deadline && <span style={{ fontSize: 10, color: deadlineStatus(tk.deadline) === 'overdue' ? 'var(--danger)' : 'var(--text-muted)' }}>{fd(tk.deadline)}</span>}
                        </div>
                      </div>
                    ))
                  }
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
