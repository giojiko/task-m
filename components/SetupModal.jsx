'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { hashPassword } from '@/lib/utils';

export default function SetupModal() {
  const { user, db, saveDB, toast, refreshUser } = useApp();
  const [form, setForm] = useState({
    phone: user?.phone || '',
    birthDate: user?.birthDate || '',
    personalId: user?.personalId || '',
    address: user?.address || '',
    newPass: '',
    repeatPass: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setErr('');
    if (!form.phone.trim()) return setErr('ტელეფონი სავალდებულოა');
    if (!form.birthDate) return setErr('დაბადების თარიღი სავალდებულოა');
    if (!form.personalId.trim()) return setErr('პირადი ნომერი სავალდებულოა');
    const pLen = form.personalId.replace(/\D/g,'').length;
    if (pLen !== 11 && pLen !== 9) {
      return setErr('პირადი ნომერი — 11 ციფრი · საიდენტიფიკაციო კოდი — 9 ციფრი');
    }
    if (!form.address.trim()) return setErr('მისამართი სავალდებულოა');
    if (!form.newPass || form.newPass.length < 6) return setErr('პაროლი მინიმუმ 6 სიმბოლო');
    if (form.newPass !== form.repeatPass) return setErr('პაროლები არ ემთხვევა');

    setSaving(true);
    try {
      const passwordHash = await hashPassword(form.newPass);
      const newDb = { ...db };
      newDb.users = newDb.users.map(u => u.id === user.id ? {
        ...u,
        phone: form.phone.trim(),
        birthDate: form.birthDate,
        personalId: form.personalId.replace(/\D/g,''),
        address: form.address.trim(),
        passwordHash,
        mustSetup: false,
      } : u);
      await saveDB(newDb);
      refreshUser(newDb);
      toast('✅ პროფილი განახლდა');
    } catch (e) {
      setErr('შეცდომა შენახვისას — სცადეთ ხელახლა');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="setup-ov">
      <div className="setup-box">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
          <h2 style={{ marginBottom: 6, fontSize: 18 }}>
            მოგესალმებით, {user?.firstName || 'მომხმარებელი'}!
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>
            პირველი შესვლის შემდეგ, პროფილის გააქტიურებისთვის<br />
            გთხოვთ შეავსოთ შემდეგი ინფორმაცია
          </p>
        </div>

        {err && <div className="err-box" style={{ display: 'block', marginBottom: 12 }}>{err}</div>}

        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          🔐 პაროლის შეცვლა
        </div>
        <div className="frow" style={{ marginBottom: 14 }}>
          <div className="fg">
            <label className="form-label req">ახალი პაროლი</label>
            <input className="input" type={showPass ? 'text' : 'password'}
              value={form.newPass} onChange={e => upd('newPass', e.target.value)}
              placeholder="მინ. 6 სიმბოლო" autoFocus />
          </div>
          <div className="fg">
            <label className="form-label req">გამეორება</label>
            <input className="input" type={showPass ? 'text' : 'password'}
              value={form.repeatPass} onChange={e => upd('repeatPass', e.target.value)}
              placeholder="კვლავ შეიყვანე" />
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: 20 }}>
          <input type="checkbox" checked={showPass} onChange={e => setShowPass(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
          პაროლის ჩვენება
        </label>

        <div style={{ marginBottom: 10, fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          📋 პირადი ინფორმაცია
        </div>
        <div className="frow">
          <div className="fg">
            <label className="form-label req">ტელეფონი</label>
            <input className="input" value={form.phone} onChange={e => upd('phone', e.target.value)} placeholder="5XX XXX XXX" />
          </div>
          <div className="fg">
            <label className="form-label req">დაბადების თარიღი</label>
            <input className="input" type="date" value={form.birthDate} onChange={e => upd('birthDate', e.target.value)} />
          </div>
        </div>
        <div className="fg">
          <label className="form-label req">პირადი ნომერი</label>
          <input className="input" value={form.personalId} maxLength={11}
            onChange={e => upd('personalId', e.target.value.replace(/\D/g,''))}
            placeholder="9 ან 11 ციფრი" />
        </div>
        <div className="fg" style={{ marginBottom: 24 }}>
          <label className="form-label req">მისამართი</label>
          <input className="input" value={form.address} onChange={e => upd('address', e.target.value)} placeholder="ქალაქი, ქუჩა, №" />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={save} disabled={saving}>
          {saving ? '⏳ ინახება...' : '✅ პროფილის გააქტიურება'}
        </button>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, lineHeight: 1.5 }}>
          ამ ველების შევსებამდე სისტემაში წვდომა შეზღუდულია
        </p>
      </div>
    </div>
  );
}
