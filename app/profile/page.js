'use client';
import { useState } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { fd } from '@/lib/utils';
import { RoleBadge } from '@/components/UI/Badge';

export default function ProfilePage() {
  const { user, db, saveDB, t, toast, refreshUser } = useApp();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    personalId: user?.personalId || '',
    position: user?.position || '',
    address: user?.address || '',
  });
  const [passForm, setPassForm] = useState({ cur: '', new: '', rep: '' });
  const [err, setErr] = useState('');
  const [passErr, setPassErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  if (!user) return null;

  const supervisor = user.supervisorId ? (db?.users || []).find(u => u.id === user.supervisorId) : null;

  const saveProfile = async () => {
    setErr('');
    if (!form.firstName || !form.lastName) return setErr(t('err_name_req'));
    if (form.personalId && form.personalId.length !== 11) return setErr(t('err_pid_11'));
    const newDb = { ...db };
    newDb.users = newDb.users.map(u => u.id === user.id ? {
      ...u, ...form, name: `${form.firstName} ${form.lastName}`,
    } : u);
    await saveDB(newDb);
    refreshUser(newDb);
    setEditMode(false);
    toast(t('toast_saved'));
  };

  const changePassword = async () => {
    setPassErr('');
    if (user.password !== passForm.cur) return setPassErr(t('err_cur_pass'));
    if (passForm.new.length < 6) return setPassErr(t('err_pass_short'));
    if (passForm.new !== passForm.rep) return setPassErr(t('err_pass_mismatch'));
    const newDb = { ...db };
    newDb.users = newDb.users.map(u => u.id === user.id ? { ...u, password: passForm.new } : u);
    await saveDB(newDb);
    setPassForm({ cur: '', new: '', rep: '' });
    toast(t('toast_pass_changed'));
  };

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('my_account')}</div></div>
        <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? t('cancel') : t('edit_profile')}
        </button>
      </div>
      <div className="accent-line" />

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        <div className="card">
          <div className="ch">
            <div className="ct">{t('my_account')}</div>
            {editMode && <button className="btn btn-teal btn-sm" onClick={saveProfile}>{t('save')}</button>}
          </div>
          {err && <div className="err-box" style={{ display:'block', marginBottom:10 }}>{err}</div>}
          {editMode ? (
            <>
              <div className="frow">
                <div className="fg"><label>{t('first_name_lbl')}</label><input value={form.firstName} onChange={e => upd('firstName', e.target.value)} /></div>
                <div className="fg"><label>{t('last_name_lbl')}</label><input value={form.lastName} onChange={e => upd('lastName', e.target.value)} /></div>
              </div>
              <div className="frow">
                <div className="fg"><label>{t('mobile_lbl')}</label><input value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
                <div className="fg"><label>{t('birth_date_lbl')}</label><input type="date" value={form.birthDate} onChange={e => upd('birthDate', e.target.value)} /></div>
              </div>
              <div className="fg"><label>{t('personal_id_lbl')}</label><input value={form.personalId} maxLength={11} onChange={e => upd('personalId', e.target.value)} /></div>
              <div className="fg"><label>{t('position')}</label><input value={form.position} onChange={e => upd('position', e.target.value)} /></div>
              <div className="fg"><label>{t('emp_address')}</label><input value={form.address} onChange={e => upd('address', e.target.value)} /></div>
            </>
          ) : (
            <div style={{ display:'grid', gap:10, fontSize:13 }}>
              {[
                ['name', `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name],
                ['email_lbl', user.email],
                ['role', <RoleBadge key="role" role={user.role} />],
                ['position', user.position || '—'],
                ['phone', user.phone || '—'],
                ['birth_date_lbl', user.birthDate ? fd(user.birthDate) : '—'],
                ['personal_id_lbl', user.personalId || '—'],
                ['supervisor', supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : '—'],
              ].map(([key, val]) => (
                <div key={key} style={{ display:'flex', gap:8 }}>
                  <span style={{ color:'var(--text3)', minWidth:130 }}>{t(key)}:</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="ch"><div className="ct">{t('change_password')}</div></div>
          {passErr && <div className="err-box" style={{ display:'block', marginBottom:10 }}>{passErr}</div>}
          <div className="fg"><label>{t('current_pass')}</label><input type="password" value={passForm.cur} onChange={e => setPassForm(p => ({ ...p, cur: e.target.value }))} /></div>
          <div className="fg"><label>{t('new_pass')}</label><input type="password" value={passForm.new} onChange={e => setPassForm(p => ({ ...p, new: e.target.value }))} /></div>
          <div className="fg"><label>{t('repeat_pass')}</label><input type="password" value={passForm.rep} onChange={e => setPassForm(p => ({ ...p, rep: e.target.value }))} /></div>
          <button className="btn btn-teal btn-sm" onClick={changePassword}>{t('change_password')}</button>
        </div>
      </div>
    </AppShell>
  );
}
