'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { uid } from '@/lib/utils';

export default function SetupModal() {
  const { user, db, saveDB, t, toast, refreshUser } = useApp();
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    personalId: user?.personalId || '',
    newPass: '',
    repeatPass: '',
  });
  const [err, setErr] = useState('');

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setErr('');
    if (!form.firstName || !form.lastName || !form.phone || !form.birthDate) {
      return setErr(t('err_emp_required'));
    }
    if (!form.newPass || form.newPass.length < 6) return setErr(t('err_pass_short'));
    if (form.newPass !== form.repeatPass) return setErr(t('err_pass_mismatch'));
    if (form.personalId && form.personalId.length !== 11) return setErr(t('err_pid_11'));

    const newDb = { ...db };
    newDb.users = newDb.users.map(u => u.id === user.id ? {
      ...u,
      firstName: form.firstName,
      lastName: form.lastName,
      name: `${form.firstName} ${form.lastName}`,
      phone: form.phone,
      birthDate: form.birthDate,
      personalId: form.personalId,
      password: form.newPass,
      mustSetup: false,
    } : u);

    await saveDB(newDb);
    refreshUser(newDb);
    toast(t('toast_saved'));
  };

  return (
    <div className="setup-ov">
      <div className="setup-box">
        <h2 style={{ marginBottom: 6 }}>{t('setup_title')}</h2>
        <p style={{ color:'var(--text2)', marginBottom:20, fontSize:13 }}>{t('setup_info')}</p>
        {err && <div className="err-box" style={{ display:'block' }}>{err}</div>}
        <div className="frow">
          <div className="fg">
            <label>{t('first_name_lbl')}</label>
            <input value={form.firstName} onChange={e => upd('firstName', e.target.value)} />
          </div>
          <div className="fg">
            <label>{t('last_name_lbl')}</label>
            <input value={form.lastName} onChange={e => upd('lastName', e.target.value)} />
          </div>
        </div>
        <div className="frow">
          <div className="fg">
            <label>{t('mobile_lbl')}</label>
            <input value={form.phone} onChange={e => upd('phone', e.target.value)} />
          </div>
          <div className="fg">
            <label>{t('birth_date_lbl')}</label>
            <input type="date" value={form.birthDate} onChange={e => upd('birthDate', e.target.value)} />
          </div>
        </div>
        <div className="fg">
          <label>{t('personal_id_lbl')}</label>
          <input value={form.personalId} maxLength={11} placeholder={t('personal_id_hint')} onChange={e => upd('personalId', e.target.value)} />
        </div>
        <div className="frow">
          <div className="fg">
            <label>{t('new_pass')}</label>
            <input type="password" value={form.newPass} onChange={e => upd('newPass', e.target.value)} />
          </div>
          <div className="fg">
            <label>{t('repeat_pass')}</label>
            <input type="password" value={form.repeatPass} onChange={e => upd('repeatPass', e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary" style={{ width:'100%', marginTop:8 }} onClick={save}>{t('setup_save')}</button>
      </div>
    </div>
  );
}
