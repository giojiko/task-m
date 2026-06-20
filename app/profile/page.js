'use client';
import { useState } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { fd, hashPassword } from '@/lib/utils';
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
    if (passForm.new.length < 6) return setPassErr(t('err_pass_short'));
    if (passForm.new !== passForm.rep) return setPassErr(t('err_pass_mismatch'));
    // Verify current password server-side via login attempt
    const checkRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: user.email, password: passForm.cur }),
    });
    if (!checkRes.ok) return setPassErr(t('err_cur_pass'));
    const ph = await hashPassword(passForm.new);
    const newDb = { ...db };
    newDb.users = newDb.users.map(u => u.id === user.id ? { ...u, passwordHash: ph, password: undefined } : u);
    await saveDB(newDb);
    setPassForm({ cur: '', new: '', rep: '' });
    toast(t('toast_pass_changed'));
  };

  const initials = (user.firstName?.[0] || '?') + (user.lastName?.[0] || '');
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name || '';

  return (
    <AppShell>
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-avatar-xl">{initials}</div>
        <div className="profile-hero-info">
          <h1 className="profile-name">{displayName}</h1>
          <div className="profile-meta">
            <RoleBadge role={user.role} />
            {user.position && <span className="profile-pos">• {user.position}</span>}
          </div>
          <div className="profile-email">{user.email}</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(!editMode)}>
          {editMode ? t('cancel') : '✏️ ' + t('edit_profile')}
        </button>
      </div>

      <div className="profile-grid">
        {/* Personal info card */}
        <div className="card">
          <div className="ch" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="ct">{t('personal_info') || t('my_account')}</div>
            {editMode && <button className="btn btn-primary btn-sm" onClick={saveProfile}>{t('save')}</button>}
          </div>
          <div className="card-body">
            {err && <div className="err-box" style={{ marginBottom: 12 }}>{err}</div>}
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
              <div className="profile-fields">
                {[
                  { label: t('mobile_lbl'),      value: user.phone      || '—', icon: '📱' },
                  { label: t('birth_date_lbl'),  value: user.birthDate  ? fd(user.birthDate) : '—', icon: '🎂' },
                  { label: t('personal_id_lbl'), value: user.personalId || '—', icon: '🪪' },
                  { label: t('emp_address'),     value: user.address    || '—', icon: '📍' },
                  { label: t('supervisor'),      value: supervisor ? `${supervisor.firstName} ${supervisor.lastName}` : '—', icon: '👤' },
                ].map(({ label, value, icon }) => (
                  <div key={label} className="profile-field">
                    <span className="pf-icon">{icon}</span>
                    <div>
                      <div className="pf-label">{label}</div>
                      <div className="pf-value">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Password card */}
        <div className="card">
          <div className="ch" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="ct">🔑 {t('change_password')}</div>
          </div>
          <div className="card-body">
            {passErr && <div className="err-box" style={{ marginBottom: 12 }}>{passErr}</div>}
            <div className="fg"><label>{t('current_pass')}</label><input type="password" value={passForm.cur} onChange={e => setPassForm(p => ({ ...p, cur: e.target.value }))} /></div>
            <div className="fg"><label>{t('new_pass')}</label><input type="password" value={passForm.new} onChange={e => setPassForm(p => ({ ...p, new: e.target.value }))} /></div>
            <div className="fg"><label>{t('repeat_pass')}</label><input type="password" value={passForm.rep} onChange={e => setPassForm(p => ({ ...p, rep: e.target.value }))} /></div>
            <button className="btn btn-primary btn-sm" onClick={changePassword}>{t('change_password')}</button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
