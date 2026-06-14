'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { uid, fd } from '@/lib/utils';

function ClientModal({ client, onClose, onSave }) {
  const { db, t } = useApp();
  const isNew = !client?.id;
  const [form, setForm] = useState({
    name: client?.name || '',
    phone: client?.phone || '',
    addr: client?.addr || '',
    email: client?.email || '',
    pid: client?.pid || '',
    referral: client?.referral || '',
    directions: client?.directions || [],
    notes: client?.notes || '',
  });
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const dirs = db?.directions || [];

  const toggleDir = (id) => {
    const cur = form.directions;
    upd('directions', cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.addr.trim()) return setErr(t('err_client_required'));
    onSave({ ...client, ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <Modal open title={isNew ? t('add_client') : t('edit')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box" style={{ display:'block', marginBottom:10 }}>{err}</div>}
      <div className="fg"><label>{t('c_name_req')}</label><input value={form.name} onChange={e => upd('name', e.target.value)} autoFocus /></div>
      <div className="frow">
        <div className="fg"><label>{t('c_mobile_req')}</label><input value={form.phone} onChange={e => upd('phone', e.target.value)} /></div>
        <div className="fg"><label>{t('email_lbl')}</label><input value={form.email} onChange={e => upd('email', e.target.value)} /></div>
      </div>
      <div className="fg"><label>{t('c_address_req')}</label><input value={form.addr} onChange={e => upd('addr', e.target.value)} /></div>
      <div className="frow">
        <div className="fg"><label>{t('c_pid_opt')}</label><input value={form.pid} onChange={e => upd('pid', e.target.value)} /></div>
        <div className="fg"><label>{t('c_referral')}</label><input value={form.referral} onChange={e => upd('referral', e.target.value)} /></div>
      </div>
      <div className="fg">
        <label>{t('c_direction')}</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
          {dirs.map(d => (
            <label key={d.id} style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:12, background:form.directions.includes(d.id)?'rgba(27,234,205,.1)':'var(--bg3)', padding:'4px 8px', borderRadius:6, border:`1px solid ${form.directions.includes(d.id)?'var(--accent)':'var(--border)'}` }}>
              <input type="checkbox" checked={form.directions.includes(d.id)} onChange={() => toggleDir(d.id)} style={{ width:'auto' }} />
              {d.icon} {d.name}
            </label>
          ))}
        </div>
      </div>
      <div className="fg"><label>{t('notes')}</label><textarea value={form.notes} onChange={e => upd('notes', e.target.value)} /></div>
    </Modal>
  );
}

export default function ClientsPage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const clients = db?.clients || [];
  const dirs = db?.directions || [];
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const filtered = useMemo(() => clients.filter(c => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.phone?.includes(search)) return false;
    if (filterDir && !(c.directions || []).includes(filterDir)) return false;
    return true;
  }), [clients, search, filterDir]);

  const handleSave = async (data) => {
    const newDb = { ...db };
    if (!data.id) {
      data.id = uid();
      data.created = new Date().toISOString();
      newDb.clients = [...newDb.clients, data];
    } else {
      newDb.clients = newDb.clients.map(c => c.id === data.id ? data : c);
    }
    await saveDB(newDb);
    toast(t('toast_client_saved'));
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    const newDb = { ...db, clients: db.clients.filter(c => c.id !== id) };
    await saveDB(newDb);
    toast(t('toast_client_deleted'));
  };

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('clients')}</div></div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditClient(null); setShowForm(true); }}>{t('add_client')}</button>}
      </div>
      <div className="sbar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
        <select value={filterDir} onChange={e => setFilterDir(e.target.value)}>
          <option value="">{t('all_directions')}</option>
          {dirs.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
        </select>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('phone')}</th>
              <th>{t('address')}</th>
              <th>{t('c_direction')}</th>
              <th>{t('created_at')}</th>
              {isAdmin && <th>{t('actions')}</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>{t('no_clients')}</td></tr>
            ) : filtered.map(c => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong>{c.email && <div style={{ fontSize:11, color:'var(--text3)' }}>{c.email}</div>}</td>
                <td style={{ color:'var(--text2)' }}>{c.phone}</td>
                <td style={{ color:'var(--text2)', fontSize:12 }}>{c.addr}</td>
                <td>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
                    {(c.directions||[]).map(did => {
                      const d = dirs.find(x => x.id === did);
                      return d ? <span key={did} style={{ fontSize:10, padding:'2px 6px', borderRadius:10, background:d.color+'22', color:d.color, border:`1px solid ${d.color}44` }}>{d.icon} {d.name}</span> : null;
                    })}
                  </div>
                </td>
                <td style={{ fontSize:12, color:'var(--text3)' }}>{fd(c.created)}</td>
                {isAdmin && (
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      <button className="btn btn-ghost btn-xs" onClick={() => { setEditClient(c); setShowForm(true); }}>✏️</button>
                      <button className="btn btn-danger btn-xs" onClick={() => handleDelete(c.id)}>🗑</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && <ClientModal client={editClient} onClose={() => setShowForm(false)} onSave={handleSave} />}
    </AppShell>
  );
}
