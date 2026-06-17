'use client';
import { useState, useMemo, useRef } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { uid, fdt, fd } from '@/lib/utils';
import * as XLSX from 'xlsx';

const UNITS = ['ც', 'კგ', 'მ', 'მ²', 'მ³', 'ლ', 'კომ.', 'ყუ.'];

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '₾' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/* ── Item Modal (add/edit) ── */
function ItemModal({ item, onClose, onSave }) {
  const { t } = useApp();
  const isNew = !item?.id;
  const [form, setForm] = useState({
    name:      item?.name      || '',
    category:  item?.category  || '',
    supplier:  item?.supplier  || '',
    sku:       item?.sku       || '',
    qty:       item?.qty       ?? 0,
    unit:      item?.unit      || 'ც',
    minQty:    item?.minQty    ?? 0,
    costPrice: item?.costPrice ?? 0,
    markupPct: item?.markupPct ?? 25,
    country:   item?.country   || '',
    notes:     item?.notes     || '',
  });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const sellPrice = (Number(form.costPrice) * (1 + Number(form.markupPct) / 100)).toFixed(2);
  const [err, setErr] = useState('');

  const submit = () => {
    if (!form.name.trim()) return setErr('დასახელება სავალდებულოა');
    onSave({ ...item, ...form, sellPrice: parseFloat(sellPrice) });
    onClose();
  };

  return (
    <Modal open size="lg" title={isNew ? t('add_item') : t('edit') + ' — ' + item.name} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box">{err}</div>}
      <div className="frow">
        <div className="fg" style={{ gridColumn: 'span 2' }}>
          <label>{t('name')} *</label>
          <input value={form.name} onChange={e => upd('name', e.target.value)} autoFocus placeholder="HDMI კაბელი 1m" />
        </div>
      </div>
      <div className="frow">
        <div className="fg"><label>{t('wh_category')}</label><input value={form.category} onChange={e => upd('category', e.target.value)} placeholder="კაბელი" /></div>
        <div className="fg"><label>{t('wh_supplier')}</label><input value={form.supplier} onChange={e => upd('supplier', e.target.value)} placeholder="Hitech" /></div>
      </div>
      <div className="frow">
        <div className="fg"><label>{t('wh_sku')}</label><input value={form.sku} onChange={e => upd('sku', e.target.value)} placeholder="HDMI-1M" /></div>
        <div className="fg"><label>{t('wh_country')}</label><input value={form.country} onChange={e => upd('country', e.target.value)} placeholder="China" /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12 }}>
        <div className="fg"><label>{t('quantity')} *</label><input type="number" min="0" step="0.01" value={form.qty} onChange={e => upd('qty', e.target.value)} /></div>
        <div className="fg">
          <label>{t('unit')}</label>
          <select value={form.unit} onChange={e => upd('unit', e.target.value)}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="fg"><label>{t('wh_min_qty')}</label><input type="number" min="0" step="0.01" value={form.minQty} onChange={e => upd('minQty', e.target.value)} /></div>
      </div>

      {/* Price Calculator */}
      <div className="price-calc-box">
        <div className="price-calc-title">💰 {t('wh_price_calc')}</div>
        <div className="price-calc-grid">
          <div className="fg" style={{ marginBottom: 0 }}>
            <label>{t('wh_cost_price')} (₾) *</label>
            <input type="number" min="0" step="0.01" value={form.costPrice} onChange={e => upd('costPrice', e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label>{t('wh_markup')} (%)</label>
            <input type="number" min="0" step="1" value={form.markupPct} onChange={e => upd('markupPct', e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label>{t('wh_sell_price')}</label>
            <div className="price-sell-display">₾{sellPrice}</div>
          </div>
        </div>
      </div>

      <div className="fg"><label>{t('notes')}</label><textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2} /></div>
    </Modal>
  );
}

/* ── Use Item Modal (give to client) ── */
function UseItemModal({ item, onClose, onSave }) {
  const { db, user, t } = useApp();
  const [form, setForm] = useState({
    clientId: '',
    taskId: '',
    qty: 1,
    unitPrice: item?.sellPrice ?? item?.costPrice ?? 0,
    notes: '',
  });
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState('');

  const clients = db?.clients || [];
  const tasks = (db?.tasks || []).filter(tk =>
    !form.clientId || tk.client === form.clientId
  );
  const totalPrice = (Number(form.qty) * Number(form.unitPrice)).toFixed(2);
  const stockAfter = (item?.qty || 0) - Number(form.qty);
  const stockWarn = form.qty > 0 && stockAfter >= 0 && form.qty / item.qty > 0.7;

  const submit = () => {
    if (!form.clientId) return setErr('კლიენტი სავალდებულოა');
    if (!form.qty || Number(form.qty) <= 0) return setErr('რაოდენობა სავალდებულოა');
    if (Number(form.qty) > item.qty) return setErr(`მარაგი არ კმარა. ხელმისაწვდომია: ${item.qty} ${item.unit}`);
    onSave({ ...form, qty: Number(form.qty), unitPrice: Number(form.unitPrice), totalPrice: Number(totalPrice) });
    onClose();
  };

  return (
    <Modal open title={`${item.name} — ${t('wh_give_to_client')}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box">{err}</div>}
      <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 20, fontSize: 13 }}>
        <span>📦 <strong>{item.name}</strong></span>
        <span style={{ color: 'var(--text-secondary)' }}>მარაგი: <strong style={{ color: item.qty <= item.minQty ? 'var(--danger)' : 'var(--success)' }}>{item.qty} {item.unit}</strong></span>
        <span style={{ color: 'var(--text-secondary)' }}>გასაყ.ფ: <strong style={{ color: 'var(--accent)' }}>{fmt(item.sellPrice)}</strong></span>
      </div>

      <div className="fg">
        <label>{t('client')} *</label>
        <select value={form.clientId} onChange={e => { upd('clientId', e.target.value); upd('taskId', ''); }}>
          <option value="">— კლიენტი —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {form.clientId && (
        <div className="fg">
          <label>Task (სურვ.)</label>
          <select value={form.taskId} onChange={e => upd('taskId', e.target.value)}>
            <option value="">— Task-თან კავშირი —</option>
            {tasks.map(tk => <option key={tk.id} value={tk.id}>{tk.title}</option>)}
          </select>
        </div>
      )}
      <div className="frow">
        <div className="fg">
          <label>რაოდენობა * (max: {item.qty} {item.unit})</label>
          <input type="number" min="0.01" max={item.qty} step="0.01" value={form.qty} onChange={e => upd('qty', e.target.value)} />
        </div>
        <div className="fg">
          <label>{t('wh_individual_price')} (₾)</label>
          <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => upd('unitPrice', e.target.value)} />
        </div>
      </div>
      {stockWarn && (
        <div style={{ background: 'var(--warning-bg)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: 'var(--warning)', marginBottom: 12 }}>
          ⚠ {t('wh_qty_warning')} — დარჩება: {stockAfter.toFixed(2)} {item.unit}
        </div>
      )}
      <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius)', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{t('wh_total_price')}</span>
        <span style={{ color: 'var(--success)', fontWeight: 800, fontSize: 18 }}>₾{totalPrice}</span>
      </div>
      <div className="fg"><label>{t('notes')}</label><textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2} /></div>
    </Modal>
  );
}

/* ── Log Modal (history) ── */
function LogModal({ item, onClose }) {
  const { db, t } = useApp();
  const [filter, setFilter] = useState('all');

  const allLogs = (db?.whlogs || [])
    .filter(l => l.itemId === item.id)
    .sort((a, b) => new Date(b.at) - new Date(a.at));

  const filtered = allLogs.filter(l => {
    if (filter === 'all') return true;
    if (filter === 'client') return l.action === 'client_used';
    if (filter === 'in') return ['in','added'].includes(l.action);
    if (filter === 'out') return ['out','adjusted'].includes(l.action);
    return true;
  });

  const clients = db?.clients || [];
  const users = db?.users || [];

  const actionLabel = {
    in: { icon: '📥', color: 'var(--success)', label: 'შემოსვლა' },
    out: { icon: '📤', color: 'var(--danger)', label: 'გასვლა' },
    added: { icon: '📥', color: 'var(--accent)', label: 'დამატება' },
    adjusted: { icon: '✏️', color: 'var(--warning)', label: 'კორექცია' },
    client_used: { icon: '🤝', color: 'var(--purple)', label: 'კლიენტზე' },
  };

  return (
    <Modal open title={`📋 ${item.name} — ოპერაციების ისტორია`} onClose={onClose} size="lg">
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[['all','ყველა'],['in','შემოსვლა'],['out','გასვლა'],['client','კლიენტი']].map(([val, label]) => (
          <button key={val} className={`btn btn-xs ${filter === val ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(val)}>{label}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty" style={{ padding: 32 }}>
          <div className="empty-icon">📋</div>
          <div className="empty-title">{t('no_logs')}</div>
        </div>
      ) : filtered.map(l => {
        const act = actionLabel[l.action] || { icon: '•', color: 'var(--text-muted)', label: l.action };
        const byUser = users.find(u => u.id === l.by);
        const client = clients.find(c => c.id === l.clientId);
        const qtySign = ['out','client_used','adjusted'].includes(l.action) && l.qty > 0 ? '-' : '+';
        return (
          <div key={l.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 20, flexShrink: 0, width: 28, textAlign: 'center' }}>{act.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: act.color, fontSize: 13 }}>{act.label}</span>
                {client && <span style={{ fontSize: 11, color: 'var(--accent)' }}>• {client.name}</span>}
                {byUser && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>• {byUser.firstName} {byUser.lastName}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span style={{ color: act.color, fontWeight: 700 }}>{qtySign}{l.qty} {item.unit}</span>
                {l.qtyAfter !== undefined && <span>მარაგი: {l.qtyAfter} {item.unit}</span>}
                {l.totalPrice && <span style={{ color: 'var(--success)', fontWeight: 700 }}>₾{Number(l.totalPrice).toFixed(2)}</span>}
              </div>
              {l.reason && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{l.reason}</div>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, textAlign: 'right' }}>
              {fdt(l.at)}
            </div>
          </div>
        );
      })}
    </Modal>
  );
}

/* ── Import Modal ── */
function ImportModal({ onClose, onImport }) {
  const { t } = useApp();
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  const parseFile = async (file) => {
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {
        range: 5,
        header: ['_num','name','category','supplier','qty','unit','minQty','costPrice','markupPct','_sell','sku','country','notes'],
      });
      const now = new Date().toISOString();
      const items = rows
        .filter(r => r.name && r.qty)
        .map(r => ({
          id: uid(),
          name: String(r.name).trim(),
          category: r.category ? String(r.category).trim() : '',
          supplier: r.supplier ? String(r.supplier).trim() : '',
          qty: parseFloat(r.qty) || 0,
          unit: r.unit ? String(r.unit).trim() : 'ც',
          minQty: parseFloat(r.minQty) || 0,
          costPrice: parseFloat(r.costPrice) || 0,
          markupPct: parseFloat(r.markupPct) || 25,
          sellPrice: parseFloat(r.costPrice) * (1 + (parseFloat(r.markupPct) || 25) / 100),
          sku: r.sku ? String(r.sku).trim() : '',
          country: r.country ? String(r.country).trim() : '',
          notes: r.notes ? String(r.notes).trim() : '',
          created: now,
          updated: now,
        }));
      setPreview(items);
    } catch {
      alert('ფაილის წაკითხვა ვერ მოხერხდა');
    }
    setLoading(false);
  };

  return (
    <Modal open title={`📥 ${t('wh_import')}`} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        {preview && <button className="btn btn-primary btn-sm" onClick={() => { onImport(preview); onClose(); }}>✅ {t('wh_import')} ({preview.length})</button>}
      </>}
    >
      <a
        href="/api/warehouse/template"
        download="warehouse-template.xlsx"
        className="btn btn-secondary btn-sm"
        style={{ display: 'inline-flex', marginBottom: 16 }}
      >
        📄 {t('wh_download_tpl')}
      </a>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) parseFile(f); }}
        style={{
          border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '28px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragging ? 'var(--accent-glow)' : 'var(--bg-muted)',
          transition: 'all 0.15s',
          marginBottom: 16,
          color: 'var(--text-secondary)',
        }}
      >
        {loading ? <span className="spinner" style={{ margin: '0 auto' }} /> : (
          <>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
            <div style={{ fontSize: 13 }}>გადაიტანეთ .xlsx ფაილი ან <span style={{ color: 'var(--accent)' }}>დააჭირეთ ატვირთვისთვის</span></div>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) parseFile(e.target.files[0]); }} />

      {preview && (
        <>
          <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600, marginBottom: 10 }}>
            ✅ {preview.length} {t('wh_import_ready')}
          </div>
          <div className="tw" style={{ maxHeight: 260, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>დასახელება</th>
                  <th>რაოდ.</th>
                  <th>შეძ.ფ.</th>
                  <th>გასაყ.</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td><strong>{r.name}</strong>{r.category && <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 6 }}>{r.category}</span>}</td>
                    <td>{r.qty} {r.unit}</td>
                    <td>{fmt(r.costPrice)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(r.sellPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
}

/* ── Main Page ── */
export default function WarehousePage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [editItem, setEditItem] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [useItem, setUseItem] = useState(null);
  const [logItem, setLogItem] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const wh = db?.wh || [];
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const cats = [...new Set(wh.map(i => i.category).filter(Boolean))].sort();
  const suppliers = [...new Set(wh.map(i => i.supplier).filter(Boolean))].sort();

  const filtered = useMemo(() => wh.filter(i => {
    if (search && !i.name?.toLowerCase().includes(search.toLowerCase()) && !i.sku?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && i.category !== filterCat) return false;
    if (filterSupplier && i.supplier !== filterSupplier) return false;
    if (filterStock === 'low' && !(i.qty <= i.minQty)) return false;
    if (filterStock === 'ok' && i.qty <= i.minQty) return false;
    return true;
  }), [wh, search, filterCat, filterSupplier, filterStock]);

  const stats = {
    total: wh.length,
    lowStock: wh.filter(i => i.qty !== undefined && i.minQty !== undefined && i.qty <= i.minQty).length,
    costValue: wh.reduce((s, i) => s + (i.qty || 0) * (i.costPrice || 0), 0),
    sellValue: wh.reduce((s, i) => s + (i.qty || 0) * (i.sellPrice || 0), 0),
  };
  const profit = stats.sellValue - stats.costValue;

  const handleSave = async (data) => {
    const now = new Date().toISOString();
    const newDb = { ...db };
    const isNew = !data.id;
    if (isNew) {
      data.id = uid(); data.created = now;
    }
    data.updated = now;
    newDb.wh = isNew ? [...newDb.wh, data] : newDb.wh.map(i => i.id === data.id ? data : i);
    if (isNew) {
      newDb.whlogs = [...(newDb.whlogs || []), {
        id: uid(), itemId: data.id, action: 'added',
        qty: data.qty, qtyAfter: data.qty,
        clientId: null, taskId: null, unitPrice: null, totalPrice: null,
        reason: 'პროდუქტი დაემატა', by: user.id, at: now,
      }];
    }
    await saveDB(newDb);
    toast(t('toast_wh_saved'));
  };

  const handleUseItem = async ({ clientId, taskId, qty, unitPrice, totalPrice, notes }) => {
    const item = useItem;
    const now = new Date().toISOString();
    const newQty = (item.qty || 0) - qty;
    const client = (db?.clients || []).find(c => c.id === clientId);

    const newDb = { ...db };
    newDb.wh = newDb.wh.map(i => i.id === item.id ? { ...i, qty: newQty, updated: now } : i);
    newDb.whlogs = [...(newDb.whlogs || []), {
      id: uid(), itemId: item.id, action: 'client_used',
      qty, qtyAfter: newQty,
      clientId, taskId: taskId || null,
      unitPrice, totalPrice,
      reason: notes || null, by: user.id, at: now,
    }];
    const usedEntry = { itemId: item.id, itemName: item.name, qty, unitPrice, totalPrice, taskId: taskId || null, date: now, notes: notes || null };
    newDb.clients = newDb.clients.map(c => c.id === clientId
      ? { ...c, usedItems: [...(c.usedItems || []), usedEntry] }
      : c
    );
    await saveDB(newDb);
    toast(`✅ ${qty} ${item.unit} ${item.name} გადაეცა ${client?.name || ''}`);
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    await saveDB({ ...db, wh: db.wh.filter(i => i.id !== id) });
    toast(t('toast_wh_deleted'));
  };

  const handleImport = async (items) => {
    const now = new Date().toISOString();
    const newDb = { ...db };
    newDb.wh = [...(newDb.wh || []), ...items];
    const logs = items.map(item => ({
      id: uid(), itemId: item.id, action: 'added',
      qty: item.qty, qtyAfter: item.qty,
      clientId: null, taskId: null, unitPrice: null, totalPrice: null,
      reason: 'Excel-ით იმპორტი', by: user.id, at: now,
    }));
    newDb.whlogs = [...(newDb.whlogs || []), ...logs];
    await saveDB(newDb);
    toast(`✅ ${items.length} პოზიცია დაემატა`);
  };

  const STAT_CARDS = [
    { label: t('wh_stats_total'),  val: stats.total,                cls: 'stat-blue',   icon: '📦' },
    { label: t('wh_stats_low'),    val: stats.lowStock,             cls: 'stat-red',    icon: '⚠️' },
    { label: t('wh_stats_cost'),   val: fmt(stats.costValue),       cls: 'stat-yellow', icon: '💰' },
    { label: t('wh_stats_sell'),   val: fmt(stats.sellValue),       cls: 'stat-teal',   icon: '📈' },
    { label: t('wh_stats_profit'), val: fmt(profit),                cls: 'stat-green',  icon: '✅' },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{t('warehouse')}</div>
          <div className="page-subtitle">{wh.length} პოზიცია სულ</div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowImport(true)}>📥 {t('wh_import')}</button>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditItem(null); setShowForm(true); }}>{t('add_item')}</button>
          </div>
        )}
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 16 }}>
        {STAT_CARDS.map(c => (
          <div key={c.label} className={`stat-card ${c.cls}`}>
            <div className="stat-icon">{c.icon}</div>
            <div className="stat-value" style={{ fontSize: typeof c.val === 'string' ? 16 : 28 }}>{c.val}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        <input className="input" style={{ maxWidth: 220 }} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search') + ' (სახ. / SKU)'} />
        <select className="select" style={{ width: 'auto' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">{t('all_categories')}</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)}>
          <option value="">{t('all_suppliers')}</option>
          {suppliers.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="select" style={{ width: 'auto' }} value={filterStock} onChange={e => setFilterStock(e.target.value)}>
          <option value="">ყველა სტატუსი</option>
          <option value="low">⚠ დაბალი მარაგი</option>
          <option value="ok">✓ ნორმა</option>
        </select>
        {(search || filterCat || filterSupplier || filterStock) && (
          <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(''); setFilterCat(''); setFilterSupplier(''); setFilterStock(''); }}>× გასუფთავება</button>
        )}
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>#</th>
                <th>დასახელება</th>
                <th>{t('wh_category')}</th>
                <th>{t('wh_supplier')}</th>
                <th>მარაგი</th>
                <th>{t('wh_cost_price')}</th>
                <th>{t('wh_sell_price')}</th>
                <th>სტ.</th>
                <th style={{ width: 140 }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <div className="empty">
                      <div className="empty-icon">📦</div>
                      <div className="empty-title">{t('no_items')}</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map((i, idx) => {
                const low = i.qty !== undefined && i.minQty !== undefined && i.qty <= i.minQty;
                return (
                  <tr key={i.id} style={low ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{idx + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{i.name}</div>
                      {i.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {i.sku}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{i.category || '—'}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{i.supplier || '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: low ? 'var(--danger)' : 'var(--text-primary)' }}>
                        {i.qty ?? '—'} {i.unit}
                      </span>
                      {i.minQty > 0 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>მინ: {i.minQty}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{fmt(i.costPrice)}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(i.sellPrice)}</td>
                    <td>
                      {low
                        ? <span className="badge b-stopped">⚠ მცირე</span>
                        : <span className="badge b-completed">✓ ნორმა</span>
                      }
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isAdmin && (
                          <>
                            <button className="btn btn-ghost btn-xs" title={t('wh_use_item')} onClick={() => setUseItem(i)}>🤝</button>
                            <button className="btn btn-ghost btn-xs" title={t('edit')} onClick={() => { setEditItem(i); setShowForm(true); }}>✏️</button>
                            <button className="btn btn-danger btn-xs" title={t('delete')} onClick={() => handleDelete(i.id)}>🗑</button>
                          </>
                        )}
                        <button className="btn btn-ghost btn-xs" title={t('history')} onClick={() => setLogItem(i)}>📋</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm   && <ItemModal   item={editItem} onClose={() => setShowForm(false)}   onSave={handleSave} />}
      {useItem    && <UseItemModal item={useItem}  onClose={() => setUseItem(null)}     onSave={handleUseItem} />}
      {logItem    && <LogModal     item={logItem}  onClose={() => setLogItem(null)} />}
      {showImport && <ImportModal                  onClose={() => setShowImport(false)} onImport={handleImport} />}
    </AppShell>
  );
}
