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
    const emailExists = (db?.users || []).some(u => u.email === form.email && u.id !== emp?.id);
    if (emailExists) return setErr(t('email_exists'));

    const data = { ...emp, ...form, name: `${form.firstName} ${form.lastName}` };
    if (!isNew && !form.password) delete data.password;
    onSave(data);
    onClose();
  };

  return (
    <Modal open title={isNew ? t('add_employee') : t('edit')} onClose={onClose} size="modal-lg"
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-teal btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box" style={{ display:'block', marginBottom:10 }}>{err}</div>}
      <p style={{ fontSize:11, color:'var(--text3)', marginBottom:12 }}>{t('required_fields_note')}</p>
      <div className="frow">
        <div className="fg"><label>{t('first_name_lbl')}</label><input value={form.firstName} onChange={e => upd('firstName', e.target.value)} autoFocus /></div>
        <div className="fg"><label>{t('last_name_lbl')}</label><input value={form.lastName} onChange={e => upd('lastName', e.target.value)} /></div>
      </div>
      <div className="frow">
        <div className="fg"><label>{t('mobile_lbl')}</label><input value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
        <div className="fg"><label>{t('email_req')}</label><input type="email" value={form.email} onChange={e => upd('email', e.target.value)} /></div>
      </div>
      <div className="frow">
        <div className="fg"><label>{t('birth_date_lbl')}</label><input type="date" value={form.birthDate} onChange={e => upd('birthDate', e.target.value)} /></div>
        <div className="fg"><label>{t('personal_id_lbl')}</label><input value={form.personalId} maxLength={11} onChange={e => upd('personalId', e.target.value)} /></div>
      </div>
      <div style={{ height:1, background:'var(--border)', margin:'14px 0' }} />
      <div className="frow">
        <div className="fg"><label>{t('position')}</label><input value={form.position} onChange={e => upd('position', e.target.value)} /></div>
        {isSuper && !isSelf && (
          <div className="fg">
            <label>{t('role')}</label>
            <select value={form.role} onChange={e => upd('role', e.target.value)}>
              <option value="specialist">{t('r_specialist')}</option>
              <option value="admin">{t('r_admin')}</option>
              {isSuper && <option value="super_admin">{t('r_super_admin')}</option>}
            </select>
          </div>
        )}
      </div>
      <div className="frow">
        <div className="fg">
          <label>{t('supervisor')}</label>
          <select value={form.supervisorId} onChange={e => upd('supervisorId', e.target.value)}>
            <option value="">{t('no_supervisor')}</option>
            {supervisors.map(u => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </select>
        </div>
        <div className="fg"><label>{t('emp_address')}</label><input value={form.address} onChange={e => upd('address', e.target.value)} /></div>
      </div>
      <div className="fg">
        <label>{isNew ? t('pass_req') : t('reset_password')}</label>
        <input type="password" value={form.password} placeholder={isNew ? '' : '(leave empty to keep current)'} onChange={e => upd('password', e.target.value)} />
      </div>
      {isSuper && !isSelf && (
        <div className="fg" style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" id="emp-active" checked={form.active} onChange={e => upd('active', e.target.checked)} style={{ width:'auto' }} />
          <label htmlFor="emp-active" style={{ textTransform:'none', letterSpacing:'normal', fontSize:13 }}>{t('active')}</label>
        </div>
      )}
    </Modal>
  );
}

export default function EmployeesPage() {
  const { db, user, saveDB, t, toast, refreshUser } = useApp();
  const [search, setSearch] = useState('');
  const [editEmp, setEditEmp] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const employees = db?.users || [];
  const isSuper = user?.role === 'super_admin';
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const filtered = useMemo(() => employees.filter(e => {
    if (search && !`${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [employees, search]);

  const handleSave = async (data) => {
    const newDb = { ...db };
    if (!data.id) {
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
  };

  const toggleActive = async (emp) => {
    if (emp.id === user.id) return;
    const newDb = { ...db };
    newDb.users = newDb.users.map(u => u.id === emp.id ? { ...u, active: !u.active } : u);
    await saveDB(newDb);
    toast(t('toast_emp_saved'));
  };

  const getSupervisor = (id) => {
    const s = employees.find(u => u.id === id);
    return s ? `${s.firstName} ${s.lastName}` : '—';
  };

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('employees')}</div></div>
        {isAdmin && <button className="btn btn-teal btn-sm" onClick={() => { setEditEmp(null); setShowForm(true); }}>{t('add_employee')}</button>}
      </div>
      <div className="accent-line" />
      <div className="sbar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
      </div>
      <div className="tw">
        <table>
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
                  <div style={{ fontWeight:600 }}>{e.firstName} {e.lastName}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>{e.email}</div>
                </td>
                <td><RoleBadge role={e.role} /></td>
                <td style={{ color:'var(--text2)' }}>{e.position || '—'}</td>
                <td style={{ color:'var(--text2)' }}>{e.phone || '—'}</td>
                <td style={{ color:'var(--text2)', fontSize:12 }}>{e.supervisorId ? getSupervisor(e.supervisorId) : '—'}</td>
                <td>
                  <span className={`badge ${e.active!==false ? 'b-completed' : 'b-stopped'}`}>
                    {e.active !== false ? t('active') : t('inactive')}
                  </span>
                </td>
                <td>
                  <div style={{ display:'flex', gap:4 }}>
                    {isAdmin && <button className="btn btn-ghost btn-xs" onClick={() => { setEditEmp(e); setShowForm(true); }}>✏️</button>}
                    {isSuper && e.id !== user.id && (
                      <button className={`btn btn-xs ${e.active!==false?'btn-warning':'btn-success'}`} onClick={() => toggleActive(e)}>
                        {e.active !== false ? t('tip_disable') : t('tip_enable')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <EmployeeModal emp={editEmp} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </AppShell>
  );
}
