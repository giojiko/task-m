'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { uid, fdt } from '@/lib/utils';

function ItemModal({ item, onClose, onSave }) {
  const { t } = useApp();
  const isNew = !item?.id;
  const [form, setForm] = useState({
    name: item?.name || '',
    category: item?.category || '',
    qty: item?.qty ?? 0,
    unit: item?.unit || 'ც',
    minQty: item?.minQty ?? 0,
    notes: item?.notes || '',
  });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <Modal open title={isNew ? t('add_item') : t('edit')} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={() => { onSave({ ...item, ...form }); onClose(); }}>{t('save')}</button>
      </>}
    >
      <div className="fg"><label>{t('name')}</label><input value={form.name} onChange={e => upd('name', e.target.value)} autoFocus /></div>
      <div className="frow">
        <div className="fg"><label>{t('category')}</label><input value={form.category} onChange={e => upd('category', e.target.value)} /></div>
        <div className="fg"><label>{t('unit')}</label><input value={form.unit} onChange={e => upd('unit', e.target.value)} /></div>
      </div>
      <div className="frow">
        <div className="fg"><label>{t('quantity')}</label><input type="number" min="0" value={form.qty} onChange={e => upd('qty', Number(e.target.value))} /></div>
        <div className="fg"><label>{t('min_qty_warn')}</label><input type="number" min="0" value={form.minQty} onChange={e => upd('minQty', Number(e.target.value))} /></div>
      </div>
      <div className="fg"><label>{t('notes')}</label><textarea value={form.notes} onChange={e => upd('notes', e.target.value)} /></div>
    </Modal>
  );
}

function ChangeModal({ item, onClose, onSave }) {
  const { t } = useApp();
  const [type, setType] = useState('in');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  return (
    <Modal open title={`${item.name} — ${t('change_reason')}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={() => { onSave({ type, qty: Number(qty), reason }); onClose(); }}>{t('save')}</button>
      </>}
    >
      <div className="fg">
        <label>{t('actions')}</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="in">{t('wh_in')}</option>
          <option value="out">{t('wh_out')}</option>
        </select>
      </div>
      <div className="fg"><label>{t('quantity')}</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
      <div className="fg"><label>{t('change_reason')}</label><textarea value={reason} onChange={e => setReason(e.target.value)} /></div>
    </Modal>
  );
}

function LogModal({ item, logs, onClose }) {
  const { t, db } = useApp();
  const itemLogs = logs.filter(l => l.itemId === item.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <Modal open title={`${item.name} — ${t('history')}`} onClose={onClose}>
      <div className="loglist">
        {itemLogs.length === 0 ? <div className="empty"><div className="eico">📋</div>{t('no_logs')}</div>
          : itemLogs.map(l => {
            const u = (db?.users || []).find(x => x.id === l.userId);
            return (
              <div key={l.id} className="logitem">
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:600 }}>{u ? `${u.firstName} ${u.lastName}` : '?'} — <span style={{ color: l.type==='in'?'var(--accent)':'var(--danger)' }}>{l.type==='in'?'+':'-'}{l.qty} {item.unit}</span></div>
                  {l.reason && <div style={{ color:'var(--text2)', marginTop:3 }}>{l.reason}</div>}
                </div>
                <div style={{ color:'var(--text3)', fontSize:11 }}>{fdt(l.date)}</div>
              </div>
            );
          })}
      </div>
    </Modal>
  );
}

export default function WarehousePage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [changeItem, setChangeItem] = useState(null);
  const [logItem, setLogItem] = useState(null);

  const wh = db?.wh || [];
  const whlogs = db?.whlogs || [];
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const cats = [...new Set(wh.map(i => i.category).filter(Boolean))];

  const filtered = useMemo(() => wh.filter(i => {
    if (search && !i.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && i.category !== filterCat) return false;
    return true;
  }), [wh, search, filterCat]);

  const handleSave = async (data) => {
    const newDb = { ...db };
    if (!data.id) {
      data.id = uid();
      data.created = new Date().toISOString();
      newDb.wh = [...newDb.wh, data];
    } else {
      newDb.wh = newDb.wh.map(i => i.id === data.id ? data : i);
    }
    await saveDB(newDb);
    toast(t('toast_wh_saved'));
  };

  const handleChange = async ({ type, qty, reason }) => {
    const item = changeItem;
    const newQty = type === 'in' ? (item.qty || 0) + qty : Math.max(0, (item.qty || 0) - qty);
    const newDb = { ...db };
    newDb.wh = newDb.wh.map(i => i.id === item.id ? { ...i, qty: newQty } : i);
    const log = { id: uid(), itemId: item.id, userId: user.id, date: new Date().toISOString(), type, qty, reason, qtyBefore: item.qty, qtyAfter: newQty };
    newDb.whlogs = [...(newDb.whlogs || []), log];
    await saveDB(newDb);
    toast(t('toast_wh_saved'));
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    const newDb = { ...db, wh: db.wh.filter(i => i.id !== id) };
    await saveDB(newDb);
    toast(t('toast_wh_deleted'));
  };

  return (
    <AppShell>
      <div className="ph">
        <div><div className="pt">{t('warehouse')}</div></div>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowForm(true); }}>{t('add_item')}</button>}
      </div>
      <div className="sbar">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">{t('all_categories')}</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>{t('name')}</th>
              <th>{t('category')}</th>
              <th>{t('quantity')}</th>
              <th>{t('min_qty')}</th>
              <th>{t('stock_status')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign:'center', padding:40, color:'var(--text3)' }}>{t('no_items')}</td></tr>
            ) : filtered.map(i => {
              const low = i.qty !== undefined && i.minQty !== undefined && i.qty <= i.minQty;
              return (
                <tr key={i.id} className={low ? 'low-row' : ''}>
                  <td><strong>{i.name}</strong>{i.notes && <div style={{ fontSize:11, color:'var(--text3)' }}>{i.notes}</div>}</td>
                  <td style={{ color:'var(--text2)' }}>{i.category || '—'}</td>
                  <td style={{ fontWeight:700, color: low?'var(--danger)':'var(--text)' }}>{i.qty ?? '—'} {i.unit}</td>
                  <td style={{ color:'var(--text3)' }}>{i.minQty ?? '—'}</td>
                  <td>{low ? <span className="badge b-stopped">{t('stock_low')}</span> : <span className="badge b-completed">{t('stock_ok')}</span>}</td>
                  <td>
                    <div style={{ display:'flex', gap:4 }}>
                      {isAdmin && <>
                        <button className="btn btn-ghost btn-xs" onClick={() => setChangeItem(i)}>{t('wh_in')}/{t('wh_out')}</button>
                        <button className="btn btn-ghost btn-xs" onClick={() => { setEditItem(i); setShowForm(true); }}>✏️</button>
                        <button className="btn btn-danger btn-xs" onClick={() => handleDelete(i.id)}>🗑</button>
                      </>}
                      <button className="btn btn-ghost btn-xs" onClick={() => setLogItem(i)}>📋</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showForm && <ItemModal item={editItem} onClose={() => setShowForm(false)} onSave={handleSave} />}
      {changeItem && <ChangeModal item={changeItem} onClose={() => setChangeItem(null)} onSave={handleChange} />}
      {logItem && <LogModal item={logItem} logs={whlogs} onClose={() => setLogItem(null)} />}
    </AppShell>
  );
}
