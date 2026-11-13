'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { uid } from '@/lib/utils';
import Modal from '@/components/UI/Modal';

/* ── Seller-ის შექმნა / რედაქტირება ──────────────────────────────── */
function SellerModal({ seller, onClose, onSaved }) {
  const { db, dbRef, saveDB, toast } = useApp();
  const isNew = !seller?.id;
  const users = (db?.users || []).filter(u => u.active !== false);

  const [name,     setName]     = useState(seller?.name     || '');
  const [userId,   setUserId]   = useState(seller?.userId   || '');
  const [phone,    setPhone]    = useState(seller?.phone    || '');
  const [email,    setEmail]    = useState(seller?.email    || '');
  const [notes,    setNotes]    = useState(seller?.notes    || '');
  const [defPct,   setDefPct]   = useState(seller?.defPct   ?? 0); // default % discount from listPrice

  async function handleSave() {
    if (!name.trim()) { toast('სახელი სავალდებულოა'); return; }
    const data = {
      id:      seller?.id || uid(),
      name:    name.trim(),
      userId:  userId || null,
      phone, email, notes,
      defPct:  Number(defPct) || 0,
      active:  seller?.active ?? true,
      created: seller?.created || new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    const cur = dbRef?.current || db;
    const sellers = isNew
      ? [...(cur.sellers || []), data]
      : (cur.sellers || []).map(s => s.id === data.id ? data : s);
    await saveDB({ ...cur, sellers });
    toast(isNew ? '✅ გამყიდველი დაემატა' : '✅ განახლდა');
    onSaved?.(data);
    onClose();
  }

  return (
    <Modal open size="modal-md"
      title={isNew ? '🤝 ახალი გამყიდველი' : `✏️ ${seller.name}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>გაუქმება</button>
        <button className="btn btn-primary btn-sm" onClick={handleSave}>💾 შენახვა</button>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="fg">
          <label className="form-label">სახელი *</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="გამყიდველის სახელი" />
        </div>
        <div className="fg">
          <label className="form-label">სისტემის მომხმარებელი (სურვ.)</label>
          <select className="select" value={userId} onChange={e => setUserId(e.target.value)}>
            <option value="">— გარე პარტნიორი / რეფერალი —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.firstName || u.name} {u.lastName || ''} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <div className="frow">
          <div className="fg">
            <label className="form-label">ტელეფონი</label>
            <input className="input" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="fg">
            <label className="form-label">ელ. ფოსტა</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <div className="fg">
          <label className="form-label">სტანდარტული ფასდაკლება (% ჩემი ფასიდან)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input className="input" type="number" min="0" max="100" step="0.5"
              value={defPct} onChange={e => setDefPct(e.target.value)} style={{ width: 90 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              % — გამოიყენება პროდუქტებზე, სადაც ცალკე ფასი არ არის
            </span>
          </div>
        </div>
        <div className="fg">
          <label className="form-label">შენიშვნა</label>
          <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

/* ── პრაის ლისტის მოდალი ──────────────────────────────────────────── */
function PriceListModal({ seller, onClose }) {
  const { db, dbRef, saveDB, toast } = useApp();
  const allPrices = db?.sellerPrices || [];
  const myPrices  = allPrices.filter(p => p.sellerId === seller.id);
  const wh        = db?.wh || [];

  const [search,  setSearch]  = useState('');
  const [editing, setEditing] = useState(null); // { productName, price, discountPct, id }
  const [newProd, setNewProd] = useState({ productName: '', price: '', discountPct: '' });
  const [whSugg,  setWhSugg]  = useState([]);

  const filtered = useMemo(() => {
    if (!search.trim()) return myPrices;
    const q = search.toLowerCase();
    return myPrices.filter(p => p.productName?.toLowerCase().includes(q));
  }, [myPrices, search]);

  async function savePrice(data) {
    const cur = dbRef?.current || db;
    const existing = (cur.sellerPrices || []).find(p => p.id === data.id);
    const newList = existing
      ? (cur.sellerPrices || []).map(p => p.id === data.id ? data : p)
      : [...(cur.sellerPrices || []), { ...data, id: uid(), sellerId: seller.id }];
    await saveDB({ ...cur, sellerPrices: newList });
    toast('✅ ფასი შენახულია');
  }

  async function deletePrice(id) {
    if (!confirm('წაიშალოს?')) return;
    const cur = dbRef?.current || db;
    await saveDB({ ...cur, sellerPrices: (cur.sellerPrices || []).filter(p => p.id !== id) });
    toast('🗑 წაიშალა');
  }

  async function addNewPrice() {
    if (!newProd.productName.trim()) { toast('პროდუქტის დასახელება სავალდებულოა'); return; }
    if (!newProd.price && !newProd.discountPct) { toast('ფასი ან % სავალდებულოა'); return; }
    await savePrice({
      productName:  newProd.productName.trim(),
      price:        Number(newProd.price) || 0,
      discountPct:  Number(newProd.discountPct) || 0,
    });
    setNewProd({ productName: '', price: '', discountPct: '' });
    setWhSugg([]);
  }

  return (
    <Modal open size="modal-xl"
      title={`💰 ${seller.name} — პრაის ლისტი`}
      onClose={onClose}
      footer={<button className="btn btn-ghost btn-sm" onClick={onClose}>დახურვა</button>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ახლის დამატება */}
        <div style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            + ახალი ფასის დამატება
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ position: 'relative' }}>
              <label className="form-label">პროდუქტი / სერვისი</label>
              <input className="input"
                value={newProd.productName}
                onChange={e => {
                  const val = e.target.value;
                  setNewProd(p => ({ ...p, productName: val }));
                  if (val.trim().length >= 2) {
                    const q = val.toLowerCase();
                    setWhSugg(wh.filter(w => w.name?.toLowerCase().includes(q)).slice(0, 5));
                  } else {
                    setWhSugg([]);
                  }
                }}
                placeholder="დასახელება..." />
              {whSugg.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, zIndex: 999,
                  background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                  borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  minWidth: 240, overflow: 'hidden',
                }}>
                  {whSugg.map(w => (
                    <div key={w.id}
                      onMouseDown={e => {
                        e.preventDefault();
                        const sp = w.sellPrice ?? w.costPrice ?? 0;
                        setNewProd(p => ({ ...p, productName: w.name, price: String(sp) }));
                        setWhSugg([]);
                      }}
                      style={{ padding: '7px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span>{w.name}</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                        ₾{Number(w.sellPrice ?? w.costPrice ?? 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="form-label">მისი ფასი (₾)</label>
              <input className="input" type="number" min="0" step="0.01"
                value={newProd.price}
                onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))}
                placeholder="0.00" />
            </div>
            <div>
              <label className="form-label">ან (%)</label>
              <input className="input" type="number" min="0" max="100" step="0.5"
                value={newProd.discountPct}
                onChange={e => setNewProd(p => ({ ...p, discountPct: e.target.value }))}
                placeholder="0" />
            </div>
            <button className="btn btn-primary btn-sm" onClick={addNewPrice}
              style={{ marginTop: 20 }}>+ დამატება</button>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            💡 ფასი ან % — ერთ-ერთი სავალდებულოა. % გამოიყენება ინვოისის ფასიდან, თუ ₾ ფასი არ არის.
          </div>
        </div>

        {/* ძიება */}
        <input className="input" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ძიება პრაის ლისტში..." />

        {/* ცხრილი */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
            {myPrices.length === 0
              ? '📋 პრაის ლისტი ცარიელია — დაამატე პირველი ფასი'
              : 'ძიება ვერ მოიძებნა'}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>პროდუქტი / სერვისი</th>
                  <th style={{ width: 120, textAlign: 'right' }}>მისი ფასი (₾)</th>
                  <th style={{ width: 90, textAlign: 'right' }}>ან %</th>
                  <th style={{ width: 80 }}>მოქმ.</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    {editing?.id === p.id ? (
                      <>
                        <td>
                          <input className="input" value={editing.productName}
                            onChange={e => setEditing(v => ({ ...v, productName: e.target.value }))}
                            style={{ padding: '4px 6px' }} />
                        </td>
                        <td>
                          <input className="input" type="number" min="0" step="0.01"
                            value={editing.price}
                            onChange={e => setEditing(v => ({ ...v, price: e.target.value }))}
                            style={{ padding: '4px 6px', textAlign: 'right' }} />
                        </td>
                        <td>
                          <input className="input" type="number" min="0" max="100"
                            value={editing.discountPct}
                            onChange={e => setEditing(v => ({ ...v, discountPct: e.target.value }))}
                            style={{ padding: '4px 6px', textAlign: 'right' }} />
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-primary btn-xs"
                              onClick={async () => {
                                await savePrice({ ...p, ...editing,
                                  price: Number(editing.price) || 0,
                                  discountPct: Number(editing.discountPct) || 0,
                                });
                                setEditing(null);
                              }}>✓</button>
                            <button className="btn btn-ghost btn-xs"
                              onClick={() => setEditing(null)}>✕</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 500 }}>{p.productName}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                          {p.price > 0 ? `₾${Number(p.price).toFixed(2)}` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {p.discountPct > 0 ? `${p.discountPct}%` : '—'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn btn-ghost btn-xs"
                              onClick={() => setEditing({ ...p })}>✏️</button>
                            <button className="btn btn-ghost btn-xs"
                              style={{ color: 'var(--danger)' }}
                              onClick={() => deletePrice(p.id)}>🗑</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ── მთავარი გვერდი ───────────────────────────────────────────────── */
export default function SellersPage() {
  const { db, dbRef, saveDB, toast } = useApp();
  const sellers     = db?.sellers || [];
  const sellerPrices = db?.sellerPrices || [];
  const invoices    = db?.invoices || [];

  const [showAdd,    setShowAdd]    = useState(false);
  const [editSeller, setEditSeller] = useState(null);
  const [priceList,  setPriceList]  = useState(null); // seller obj

  async function toggleActive(seller) {
    const cur = dbRef?.current || db;
    await saveDB({
      ...cur,
      sellers: (cur.sellers || []).map(s =>
        s.id === seller.id ? { ...s, active: !s.active } : s
      ),
    });
    toast(seller.active ? '⛔ გამყიდველი გათიშულია' : '✅ გამყიდველი გააქტიურდა');
  }

  async function deleteSeller(seller) {
    if (!confirm(`${seller.name} — წაიშალოს? ინვოისებზე მიბმული ჩანაწერი ასევე წაიშლება.`)) return;
    const cur = dbRef?.current || db;
    await saveDB({
      ...cur,
      sellers: (cur.sellers || []).filter(s => s.id !== seller.id),
      sellerPrices: (cur.sellerPrices || []).filter(p => p.sellerId !== seller.id),
      invoices: (cur.invoices || []).map(inv =>
        inv.sellerId === seller.id ? { ...inv, sellerId: null, sellerSnapshot: null } : inv
      ),
    });
    toast('🗑 წაიშალა');
  }

  // სტატისტიკა
  const stats = sellers.map(s => {
    const sinvs = invoices.filter(inv => inv.sellerId === s.id);
    const totalSales = sinvs.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const totalComm  = sinvs.reduce((sum, inv) => sum + (Number(inv.sellerCommission) || 0), 0);
    const priceCount = sellerPrices.filter(p => p.sellerId === s.id).length;
    return { ...s, sinvs: sinvs.length, totalSales, totalComm, priceCount };
  });

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">🤝 გამყიდველები</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          + ახალი გამყიდველი
        </button>
      </div>

      {sellers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>გამყიდველი არ გაქვს</div>
          <div style={{ fontSize: 13 }}>დაამატე გამყიდველი და მიაბი ინვოისებს</div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}
            onClick={() => setShowAdd(true)}>+ ახალი გამყიდველი</button>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>სახელი</th>
                <th>ტელეფონი</th>
                <th style={{ textAlign: 'center' }}>სტანდ. %</th>
                <th style={{ textAlign: 'center' }}>პრაის ლისტი</th>
                <th style={{ textAlign: 'center' }}>ინვოისები</th>
                <th style={{ textAlign: 'right' }}>სულ გაყიდვა</th>
                <th style={{ textAlign: 'right' }}>სულ საკომ.</th>
                <th style={{ textAlign: 'center' }}>სტატუსი</th>
                <th>მოქმ.</th>
              </tr>
            </thead>
            <tbody>
              {stats.map(s => (
                <tr key={s.id} style={{ opacity: s.active === false ? 0.5 : 1 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div>}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{s.phone || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {s.defPct > 0
                      ? <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{s.defPct}%</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn btn-ghost btn-xs"
                      onClick={() => setPriceList(s)}
                      style={{ color: s.priceCount > 0 ? 'var(--accent)' : 'var(--text-muted)' }}>
                      {s.priceCount > 0 ? `💰 ${s.priceCount} ფასი` : '+ ფასები'}
                    </button>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: 600 }}>{s.sinvs}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>
                    {s.totalSales > 0 ? `₾${s.totalSales.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                    {s.totalComm > 0 ? `₾${s.totalComm.toFixed(2)}` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11,
                      background: s.active !== false ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.1)',
                      color: s.active !== false ? '#22c55e' : 'var(--danger)',
                      fontWeight: 700,
                    }}>
                      {s.active !== false ? 'აქტიური' : 'გათიშული'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs"
                        onClick={() => setEditSeller(s)}>✏️</button>
                      <button className="btn btn-ghost btn-xs"
                        onClick={() => toggleActive(s)}
                        title={s.active !== false ? 'გათიშვა' : 'გააქტიურება'}>
                        {s.active !== false ? '⛔' : '✅'}
                      </button>
                      <button className="btn btn-ghost btn-xs"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => deleteSeller(s)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd    && <SellerModal onClose={() => setShowAdd(false)} />}
      {editSeller && <SellerModal seller={editSeller} onClose={() => setEditSeller(null)} />}
      {priceList  && <PriceListModal seller={priceList} onClose={() => setPriceList(null)} />}
    </AppShell>
  );
}
