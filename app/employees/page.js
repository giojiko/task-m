'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { RoleBadge } from '@/components/UI/Badge';
import { uid } from '@/lib/utils';

function EmployeeModal({ emp, onClose, onSave }) {
  const { db, user: currentUser, t } = useApp();
  const isNew = !emp?.id;
  const isSelf = emp?.id === currentUser?.id;
  const isSuper = currentUser?.role === 'super_admin';

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
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const supervisors = (db?.users || []).filter(u => u.id !== emp?.id && u.active !== false);

  const submit = () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.email || !form.birthDate) return setErr(t('err_emp_required'));
    if (isNew && (!form.password || form.password.length < 6)) return setErr(t('err_pass_short'));
    if (form.personalId && form.personalId.length !== 11) return setErr(t('err_pid_11'));
    if ((db?.users || []).some(u => u.email === form.email && u.id !== emp?.id)) return setErr(t('email_exists'));
    const data = { ...emp, ...form, name: `${form.firstName} ${form.lastName}` };
    if (!isNew && !form.password) delete data.password;
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
      <p style={{ fontSize:11, color:'var(--text3)', marginBottom:14 }}>{t('required_fields_note')}</p>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label req">{t('first_name_lbl').replace(' *','')}</label>
          <input className="input" value={form.firstName} onChange={e => upd('firstName',e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label req">{t('last_name_lbl').replace(' *','')}</label>
          <input className="input" value={form.lastName} onChange={e => upd('lastName',e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label req">{t('mobile_lbl').replace(' *','')}</label>
          <input className="input" value={form.phone} onChange={e => upd('phone',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label req">{t('email_req').replace(' *','')}</label>
          <input className="input" type="email" value={form.email} onChange={e => upd('email',e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label req">{t('birth_date_lbl').replace(' *','')}</label>
          <input className="input" type="date" value={form.birthDate} onChange={e => upd('birthDate',e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">{t('personal_id_lbl')}</label>
          <input className="input" value={form.personalId} maxLength={11} onChange={e => upd('personalId',e.target.value)} placeholder="11 ციფრი" />
        </div>
      </div>
      <hr className="divider" />
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('position')}</label>
          <input className="input" value={form.position} onChange={e => upd('position',e.target.value)} />
        </div>
        {isSuper && !isSelf && (
          <div className="form-group">
            <label className="form-label">{t('role')}</label>
            <select className="select" value={form.role} onChange={e => upd('role',e.target.value)}>
              <option value="specialist">{t('r_specialist')}</option>
              <option value="admin">{t('r_admin')}</option>
              <option value="super_admin">{t('r_super_admin')}</option>
            </select>
          </div>
        )}
      </div>
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">{t('supervisor')}</label>
          <select className="select" value={form.supervisorId} onChange={e => upd('supervisorId',e.target.value)}>
            <option value="">{t('no_supervisor')}</option>
            {supervisors.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">{t('emp_address')}</label>
          <input className="input" value={form.address} onChange={e => upd('address',e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label" style={{ ...(isNew && { color: 'var(--danger)' }) }}>
          {isNew ? t('pass_req') : t('reset_password')}
        </label>
        <input className="input" type="password" value={form.password}
          placeholder={isNew ? '' : '(ცარიელი = არ შეიცვლება)'}
          onChange={e => upd('password',e.target.value)} />
      </div>
      {isSuper && !isSelf && (
        <label className="cb-row" style={{ marginTop: 4 }}>
          <input type="checkbox" checked={form.active} onChange={e => upd('active',e.target.checked)} />
          <span>{t('active')}</span>
        </label>
      )}
    </Modal>
  );
}

export default function EmployeesPage() {
  const { db, user, saveDB, t, toast, refreshUser } = useApp();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
  const isSuper = user?.role === 'super_admin';

  const filtered = useMemo(() => (db?.users || []).filter(e =>
    !search || `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase())
  ), [db?.users, search]);

  const handleSave = async (data, tempPassword) => {
    const newDb = { ...db };
    const isNew = !data.id;
    if (isNew) {
      data.id = uid();
      data.created = new Date().toISOString();
      data.mustSetup = false;
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
          body: JSON.stringify({ employee: data, tempPassword }),
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
                      <div style={{ fontWeight:600 }}>{e.firstName} {e.lastName}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{e.email}</div>
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
                    {isAdmin && (
                      <button className="act-btn" onClick={() => { setEditEmp(e); setShowForm(true); }}>✏️</button>
                    )}
                    {isSuper && e.id !== user.id && (
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

      {showForm && (
        <EmployeeModal emp={editEmp} onClose={() => setShowForm(false)} onSave={handleSave} />
      )}
    </AppShell>
  );
}
