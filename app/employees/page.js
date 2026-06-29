'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { RoleBadge } from '@/components/UI/Badge';
import { uid, fd, hashPassword } from '@/lib/utils';

function EmployeeModal({ emp, onClose, onSave }) {
  const { db, user: currentUser, t } = useApp();
  const isNew = !emp?.id;
  const isSelf = emp?.id === currentUser?.id;
  const isSuper = currentUser?.role === 'super_admin';
  const isCurrentUserAdmin = currentUser?.role === 'admin';

  const [form, setForm] = useState({
    firstName: emp?.firstName || '',
    lastName: emp?.lastName || '',
    email: emp?.email || '',
    phone: emp?.phone || '',
    birthDate: emp?.birthDate || '',
    personalId: emp?.personalId || '',
    position: emp?.position || '',
    role: emp?.role || 'specialist',
    supervisorId: emp?.supervisorId || '',
    address: emp?.address || '',
    password: '',
    active: emp?.active !== false,
  });
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const supervisors = (db?.users || []).filter(u => u.id !== emp?.id && u.active !== false && ['admin','super_admin'].includes(u.role));

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
    let p = '';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    for (let i = 0; i < 12; i++) p += chars[bytes[i] % chars.length];
    upd('password', p);
    setShowPass(true);
  };

  const submit = async () => {
    setErr('');
    if (!form.firstName.trim()) return setErr('სახელი სავალდებულოა');
    if (!form.lastName.trim()) return setErr('გვარი სავალდებულოა');
    if (!form.email.trim()) return setErr('ელ.ფოსტა სავალდებულოა');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(form.email)) return setErr('ელ.ფოსტა არასწორი ფორმატით');
    if ((db?.users || []).some(u => u.email?.toLowerCase() === form.email.toLowerCase() && u.id !== emp?.id)) return setErr(t('email_exists'));
    if (form.personalId) {
      const pLen = form.personalId.replace(/\D/g,'').length;
      if (pLen !== 11 && pLen !== 9) {
        return setErr('პირადი ნომერი — 11 ციფრი · საიდენტიფიკაციო კოდი — 9 ციფრი');
      }
    }
    if (isNew && (!form.password || form.password.length < 6)) return setErr(t('err_pass_short'));
    if (isCurrentUserAdmin && form.role === 'super_admin') return setErr('admin-ს არ შეუძლია super_admin-ის დანიშვნა');

    const data = {
      ...emp,
      id: emp?.id || uid(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      name: `${form.firstName.trim()} ${form.lastName.trim()}`,
      email: form.email.trim().toLowerCase(),
      position: form.position,
      role: form.role,
      supervisorId: form.supervisorId,
      phone: form.phone,
      birthDate: form.birthDate,
      personalId: form.personalId,
      address: form.address,
      active: form.active,
      mustSetup: isNew ? true : (emp?.mustSetup ?? false),
      created: emp?.created || new Date().toISOString(),
    };
    if (isNew || form.password) {
      data.passwordHash = await hashPassword(form.password);
    }
    onSave(data, isNew ? form.password : null);
    onClose();
  };

  return (
    <Modal open title={isNew ? t('add_employee') : t('edit')} onClose={onClose} size="modal-lg"
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:8, color:'var(--danger)', padding:'9px 12px', marginBottom:14, fontSize:13 }}>{err}</div>}

      <div style={{ marginBottom: 12, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        სავალდებულო
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label req">სახელი</label>
          <input className="input" value={form.firstName} onChange={e => upd('firstName',e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label req">გვარი</label>
          <input className="input" value={form.lastName} onChange={e => upd('lastName',e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label req">ელ.ფოსტა</label>
        <input className="input" type="email" value={form.email} onChange={e => upd('email',e.target.value)} placeholder="example@smartpro.ge" />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('position')}</label>
          <input className="input" value={form.position} onChange={e => upd('position',e.target.value)} />
        </div>
        {(isSuper || isCurrentUserAdmin) && !isSelf && (
          <div className="form-group">
            <label className="form-label">{t('role')}</label>
            <select className="select" value={form.role} onChange={e => upd('role',e.target.value)}>
              <option value="specialist">{t('r_specialist')}</option>
              <option value="admin">{t('r_admin')}</option>
              {isSuper && <option value="super_admin">{t('r_super_admin')}</option>}
            </select>
          </div>
        )}
      </div>

      <div className="form-group">
        <label className={`form-label${isNew ? ' req' : ''}`}>
          {isNew ? 'დროებითი პაროლი (email-ით გაიგზავნება)' : 'ახალი პაროლი (ცარიელი = შეუცვლელი)'}
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" type={showPass ? 'text' : 'password'} value={form.password}
            onChange={e => upd('password', e.target.value)}
            placeholder={isNew ? 'მინ. 6 სიმბოლო' : 'ცარიელი = არ შეიცვლება'}
            style={{ flex: 1 }} />
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowPass(s => !s)} style={{ padding: '0 10px', fontSize: 14 }}>
            {showPass ? '🙈' : '👁️'}
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={generatePassword} title="ავტო-გენერაცია">
            🎲
          </button>
        </div>
        {form.password && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            პაროლი: <span style={{ color: 'var(--accent)', fontFamily: 'monospace', userSelect: 'all' }}>
              {showPass ? form.password : '••••••••••••'}
            </span>
            {' '}— email-ზე გაიგზავნება
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, marginBottom: 8, fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
        სურვილისამებრ (თანამშრომელი პირველ login-ზე შეავსებს)
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('mobile_lbl').replace(' *','')}</label>
          <input className="input" value={form.phone} onChange={e => upd('phone',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('birth_date_lbl').replace(' *','')}</label>
          <input className="input" type="date" value={form.birthDate} onChange={e => upd('birthDate',e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('personal_id_lbl')}</label>
          <input className="input" value={form.personalId} maxLength={11} onChange={e => upd('personalId', e.target.value.replace(/\D/g,''))} placeholder="9 ან 11 ციფრი" />
        </div>
        <div className="form-group">
          <label className="form-label">{t('emp_address')}</label>
          <input className="input" value={form.address} onChange={e => upd('address',e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{t('supervisor')}</label>
        <select className="select" value={form.supervisorId} onChange={e => upd('supervisorId',e.target.value)}>
          <option value="">{t('no_supervisor')}</option>
          {supervisors.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
        </select>
      </div>
      {(isSuper || (isCurrentUserAdmin && emp?.role !== 'super_admin')) && !isSelf && (
        <label className="cb-row" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={form.active} onChange={e => upd('active',e.target.checked)} />
          <span>{t('active')}</span>
        </label>
      )}
    </Modal>
  );
}

function EmployeeDetailModal({ emp, onClose }) {
  const { db, t } = useApp();
  const supervisor = emp.supervisorId ? (db?.users || []).find(u => u.id === emp.supervisorId) : null;
  const myTasks = (db?.tasks || []).filter(tk => tk.responsible === emp.id || (tk.assignees || []).includes(emp.id));
  const activeTasks = myTasks.filter(tk => !['completed', 'stopped'].includes(tk.status));

  return (
    <Modal open title={null} onClose={onClose} size="modal-lg">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(27,234,205,0.1), transparent)',
        borderBottom: '1px solid var(--border)',
        padding: '18px 20px', margin: '-20px -20px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, flexShrink: 0 }}>
          {emp.firstName?.[0]}{emp.lastName?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
            {emp.firstName} {emp.lastName}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <RoleBadge role={emp.role} />
            {emp.position && <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{emp.position}</span>}
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: emp.active !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: emp.active !== false ? 'var(--success)' : 'var(--danger)' }}>
              {emp.active !== false ? '● აქტიური' : '● არააქტიური'}
            </span>
          </div>
        </div>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Personal info */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header"><span className="card-title">👤 პირადი ინფო</span></div>
          <div>
            {[
              { label: 'ელ. ფოსტა', val: emp.email       || '—', icon: '✉️' },
              { label: 'ტელეფონი',  val: emp.phone       || '—', icon: '📱' },
              { label: 'დ. თარიღი', val: emp.birthDate ? fd(emp.birthDate) : '—', icon: '🎂' },
              { label: 'პ/ნ',       val: emp.personalId  || '—', icon: '🪪' },
              { label: 'მისამართი', val: emp.address     || '—', icon: '📍' },
              { label: 'ხელმძღვ.', val: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : '—', icon: '👆' },
              { label: 'შეიქმნა',  val: fd(emp.created),          icon: '📅' },
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

        {/* Tasks */}
        <div className="card" style={{ margin: 0 }}>
          <div className="card-header">
            <span className="card-title">☑ ტასკები</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeTasks.length} აქტ. / {myTasks.length} სულ</span>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {myTasks.length === 0 ? (
              <div className="empty" style={{ padding: 24 }}>
                <div className="empty-icon">☑</div>
                <div className="empty-title">ტასკები არ არის</div>
              </div>
            ) : myTasks.map(tk => (
              <div key={tk.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{tk.title}</div>
                  {tk.deadline && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📅 {fd(tk.deadline)}</div>}
                </div>
                <span className={`badge b-${tk.status}`} style={{ flexShrink: 0 }}>{t('st_' + tk.status)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function EmployeesPage() {
  const { db, user, saveDB, t, toast, refreshUser } = useApp();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailEmp, setDetailEmp] = useState(null);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuper = user?.role === 'super_admin';

  const filtered = useMemo(() => (db?.users || []).filter(e =>
    !search || `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase())
  ), [db?.users, search]);

  const handleSave = async (data, tempPassword) => {
    const newDb = { ...db };
    const isNew = !(db?.users || []).some(u => u.id === data.id);
    if (isNew) {
      newDb.users = [...newDb.users, data];
    } else {
      newDb.users = newDb.users.map(u => u.id === data.id ? data : u);
    }
    await saveDB(newDb);
    refreshUser(newDb);
    toast(t('toast_emp_saved'));

    if (isNew && tempPassword) {
      try {
        await fetch('/api/email/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ employeeId: data.id, tempPassword }),
        });
      } catch (e) { console.warn('welcome email failed', e); }
    }
  };

  const toggleActive = async (emp) => {
    if (emp.id === user.id) return;
    const newDb = { ...db, users: db.users.map(u => u.id === emp.id ? { ...u, active: !u.active } : u) };
    await saveDB(newDb);
    toast(t('toast_emp_saved'));
  };

  const getSupervisor = (id) => {
    const s = (db?.users || []).find(u => u.id === id);
    return s ? `${s.firstName} ${s.lastName}` : '—';
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{t('employees')}</div>
          <div className="page-subtitle">{filtered.length} {t('employees')}</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditEmp(null); setShowForm(true); }}>
            {t('add_employee')}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input className="input search" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('role')}</th>
              <th>{t('position')}</th>
              <th>{t('phone')}</th>
              <th>{t('supervisor')}</th>
              <th>{t('status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => (
              <tr key={e.id}>
                <td>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div className="avatar avatar-sm">
                      {(e.firstName?.[0]||'') + (e.lastName?.[0]||'')}
                    </div>
                    <div>
                      <div className="clickable-name" onClick={() => setDetailEmp(e)}>{e.firstName} {e.lastName}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{e.email}</div>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={e.role} /></td>
                <td style={{ color:'var(--text2)' }}>{e.position || '—'}</td>
                <td style={{ color:'var(--text2)' }}>{e.phone || '—'}</td>
                <td style={{ color:'var(--text2)', fontSize:12 }}>{e.supervisorId ? getSupervisor(e.supervisorId) : '—'}</td>
                <td>
                  <span className={`badge ${e.active!==false ? 'b-active' : 'b-inactive'}`}>
                    {e.active !== false ? t('active') : t('inactive')}
                  </span>
                </td>
                <td>
                  <div className="td-actions">
                    {(isSuper || (isAdmin && e.role !== 'super_admin')) && (
                      <button className="act-btn" onClick={() => { setEditEmp(e); setShowForm(true); }}>✏️</button>
                    )}
                    {(isSuper || (isAdmin && e.role !== 'super_admin')) && e.id !== user.id && (
                      <button className="act-btn" onClick={() => toggleActive(e)}>
                        {e.active !== false ? t('tip_disable') : t('tip_enable')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign:'center', padding:32, color:'var(--text2)' }}>
                {t('no_tasks').replace('ტასკ', 'თანამშრომ')}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm  && <EmployeeModal       emp={editEmp}   onClose={() => setShowForm(false)}  onSave={handleSave} />}
      {detailEmp && <EmployeeDetailModal emp={detailEmp} onClose={() => setDetailEmp(null)} />}
    </AppShell>
  );
}
