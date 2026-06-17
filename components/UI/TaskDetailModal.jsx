'use client';
import { useState } from 'react';
import Modal from './Modal';
import { useApp } from '@/context/AppContext';
import { StatusBadge, PriorityBadge } from './Badge';
import { uid, fd, fdt, deadlineStatus } from '@/lib/utils';

function ActionModal({ task, action, onClose, onSave }) {
  const { t } = useApp();
  const [comment, setComment] = useState('');
  const [err, setErr] = useState('');
  const titleKey = { pause: 'action_pause_title', complete: 'action_complete_title', stop: 'action_stop_title' };
  const newStatus = { start: 'in_progress', pause: 'paused', complete: 'pending_approval', stop: 'stopped' };
  const submit = () => {
    if (['pause', 'complete', 'stop'].includes(action) && !comment.trim()) return setErr(t('err_comment_req'));
    onSave({ status: newStatus[action], comment: comment.trim() });
    onClose();
  };
  return (
    <Modal open title={t(titleKey[action] || 'status')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box">{err}</div>}
      {['pause', 'complete', 'stop'].includes(action) && (
        <div className="fg">
          <label>{t('comment_req')}</label>
          <textarea value={comment} onChange={e => setComment(e.target.value)} autoFocus />
        </div>
      )}
    </Modal>
  );
}

export default function TaskDetailModal({ task: initialTask, onClose, onRefresh }) {
  const { db, user, saveDB, t, toast } = useApp();
  const [task, setTask] = useState(initialTask);
  const [actionModal, setActionModal] = useState(null);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [viewPhoto, setViewPhoto] = useState(null);

  const isResponsible = task.responsible === user?.id || (task.assignees || []).includes(user?.id);
  const canAct = user?.role !== 'specialist' || isResponsible;
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const clientName = task.client ? (db?.clients || []).find(c => c.id === task.client)?.name || task.client : '—';
  const responsibleUser = task.responsible ? (db?.users || []).find(u => u.id === task.responsible) : null;
  const assigneeUsers = (task.assignees || []).map(id => (db?.users || []).find(u => u.id === id)).filter(Boolean);
  const logs = (db?.tasklogs || []).filter(l => l.taskId === task.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  const subtasks = (db?.tasks || []).filter(tk => tk.parent === task.id);
  const ds = task.deadline ? deadlineStatus(task.deadline) : null;

  const refresh = (updatedDb) => {
    const updated = (updatedDb?.tasks || db?.tasks || []).find(tk => tk.id === task.id);
    if (updated) setTask(updated);
    if (onRefresh) onRefresh(updated, updatedDb);
  };

  const applyAction = async ({ status, comment }) => {
    const logEntry = { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status, comment };
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status, updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), logEntry];
    await saveDB(newDb);
    toast(t(`toast_${status === 'in_progress' ? 'started' : status === 'paused' ? 'paused' : status === 'pending_approval' ? 'completed' : 'stopped'}`));
    refresh(newDb);
  };

  const approve = async () => {
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'completed', updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status: 'completed', comment: t('log_approved') }];
    await saveDB(newDb);
    toast(t('toast_approved'));
    refresh(newDb);
  };

  const cancelApproval = async () => {
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'in_progress', updated: new Date().toISOString() } : tk);
    newDb.tasklogs = [...(newDb.tasklogs || []), { id: uid(), taskId: task.id, userId: user.id, date: new Date().toISOString(), status: 'in_progress', comment: t('log_approval_cancelled') }];
    await saveDB(newDb);
    toast(t('toast_approval_cancelled'));
    refresh(newDb);
  };

  const addSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    if (['completed', 'stopped'].includes(task.status)) return toast(t('err_task_closed'), 'error');
    const newTask = { id: uid(), title: subtaskTitle.trim(), parent: task.id, status: 'pending', priority: 'medium', assignees: [], created: new Date().toISOString(), updated: new Date().toISOString() };
    const newDb = { ...db };
    newDb.tasks = [...newDb.tasks, newTask];
    if (task.status === 'pending') {
      newDb.tasks = newDb.tasks.map(tk => tk.id === task.id ? { ...tk, status: 'in_progress' } : tk);
    }
    await saveDB(newDb);
    setSubtaskTitle('');
    toast(t('toast_subtask_added'));
    refresh(newDb);
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const base64s = await Promise.all(files.map(f => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = ev => res(ev.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(f);
    })));
    const newDb = { ...db };
    newDb.tasks = newDb.tasks.map(tk => tk.id === task.id
      ? { ...tk, photos: [...(tk.photos || []), ...base64s] }
      : tk
    );
    await saveDB(newDb);
    toast(t('photos_uploaded'));
    refresh(newDb);
  };

  return (
    <Modal open title={null} onClose={onClose} size="modal-xl">
      {/* Gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(27,234,205,0.08), rgba(27,234,205,0.02))',
        borderBottom: '1px solid var(--border)',
        padding: '16px 20px',
        margin: '-20px -20px 20px',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {task.deadline && (
              <span style={{ fontSize: 11, color: ds === 'overdue' ? 'var(--danger)' : ds === 'warning' ? 'var(--warning)' : 'var(--text-muted)' }}>
                📅 {fd(task.deadline)}
                {ds === 'overdue' && <span style={{ marginLeft: 4, fontWeight: 700 }}>— {t('overdue')}</span>}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.3 }}>
            {task.title}
          </h2>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {/* 2-column body */}
      <div className="task-detail-grid">
        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* Description */}
          {task.desc && (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header"><span className="card-title">📝 {t('description')}</span></div>
              <div className="card-body" style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {task.desc}
              </div>
            </div>
          )}

          {/* Subtasks */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <span className="card-title">☑ {t('subtasks')}</span>
              {subtasks.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtasks.filter(s => s.status === 'completed').length}/{subtasks.length}</span>
              )}
            </div>
            <div className="card-body">
              {subtasks.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('no_subtasks')}</div>
                : subtasks.map(st => (
                  <div key={st.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ color: st.status === 'completed' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: st.status === 'completed' ? 'line-through' : 'none' }}>{st.title}</span>
                    <StatusBadge status={st.status} />
                  </div>
                ))
              }
              {canAct && !['completed', 'stopped'].includes(task.status) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)}
                    placeholder={t('add_subtask')} onKeyDown={e => e.key === 'Enter' && addSubtask()}
                    className="input" style={{ flex: 1 }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={addSubtask}>{t('add')}</button>
                </div>
              )}
            </div>
          </div>

          {/* Photos */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><span className="card-title">📸 {t('photos_optional')}</span></div>
            <div className="card-body">
              <div className="photos-grid">
                {(task.photos || []).map((photo, i) => (
                  <div key={i} className="photo-thumb" onClick={() => setViewPhoto(photo)}>
                    <img src={photo} alt="" />
                  </div>
                ))}
                <label className="photo-upload-btn">
                  <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handlePhotoUpload} />
                  <span style={{ fontSize: 22 }}>+</span>
                  <span style={{ fontSize: 10 }}>ატვირთვა</span>
                </label>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><span className="card-title">📋 {t('history')}</span></div>
            <div className="card-body" style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 18px' }}>
              {logs.length === 0
                ? <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>{t('no_logs')}</div>
                : logs.slice(0, 10).map(l => {
                  const u = (db?.users || []).find(x => x.id === l.userId);
                  return (
                    <div key={l.id} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                      <div className="avatar avatar-sm" style={{ flexShrink: 0, marginTop: 2 }}>
                        {(u?.firstName?.[0] || '?')}{u?.lastName?.[0] || ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{u ? `${u.firstName} ${u.lastName}` : '?'}</span>
                          <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                          <StatusBadge status={l.status} />
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
                          {fdt(l.date)}
                          {l.comment && <span style={{ marginLeft: 8 }}>— {l.comment}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              }
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Details card */}
          <div className="card" style={{ margin: 0 }}>
            <div className="card-header"><span className="card-title">ℹ️ {t('details')}</span></div>
            <div>
              {[
                { label: t('client'),      val: clientName,    icon: '👤' },
                { label: t('responsible'), val: responsibleUser ? `${responsibleUser.firstName} ${responsibleUser.lastName}` : '—', icon: '🎯' },
                { label: t('created_at'),  val: fd(task.created), icon: '🕐' },
                ...(assigneeUsers.length > 0 ? [{ label: t('assignees'), val: assigneeUsers.map(u => `${u.firstName} ${u.lastName}`).join(', '), icon: '👥' }] : []),
              ].map(({ label, val, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 16px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', wordBreak: 'break-word' }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions card */}
          {canAct && !['completed', 'stopped'].includes(task.status) && (
            <div className="card" style={{ margin: 0 }}>
              <div className="card-header"><span className="card-title">⚡ სტატუსი</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {task.status === 'pending' && (
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('start')}>{t('action_start')}</button>
                )}
                {task.status === 'in_progress' && <>
                  <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('pause')}>{t('action_pause')}</button>
                  <button className="btn btn-success btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('complete')}>{t('action_complete')}</button>
                  <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('stop')}>{t('action_stop')}</button>
                </>}
                {task.status === 'paused' && <>
                  <button className="btn btn-primary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('start')}>{t('action_start')}</button>
                  <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setActionModal('stop')}>{t('action_stop')}</button>
                </>}
                {task.status === 'pending_approval' && isAdmin && <>
                  <button className="btn btn-success btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={approve}>{t('approve')}</button>
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={cancelApproval}>{t('cancel_approval')}</button>
                </>}
              </div>
            </div>
          )}
        </div>
      </div>

      {actionModal && (
        <ActionModal task={task} action={actionModal} onClose={() => setActionModal(null)} onSave={applyAction} />
      )}

      {viewPhoto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          onClick={() => setViewPhoto(null)}>
          <img src={viewPhoto} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
        </div>
      )}
    </Modal>
  );
}
