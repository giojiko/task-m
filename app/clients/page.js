'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/UI/Modal';
import { uid, fd } from '@/lib/utils';
import InvoiceGenerator from '@/components/Invoice/InvoiceGenerator';
import InvoiceEditor from '@/components/Invoice/InvoiceEditor';

function ClientModal({ client, onClose, onSave }) {
  const { db, t } = useApp();
  const isNew = !client?.id;
  const [form, setForm] = useState({
    name:       client?.name       || '',
    phone:      client?.phone      || '',
    addr:       client?.addr       || '',
    email:      client?.email      || '',
    pid:        client?.pid        || '',
    referral:   client?.referral   || '',
    directions: client?.directions || [],
    notes:      client?.notes      || '',
  });
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const dirs = db?.directions || [];

  const toggleDir = (id) => {
    const cur = form.directions;
    upd('directions', cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const submit = () => {
    if (!form.name.trim()) return setErr('სახელი სავალდებულოა');
    if (!form.pid.trim()) return setErr('პირადი / საიდენტიფიკაციო კოდი სავალდებულოა');
    if (form.pid.trim().length !== 11) return setErr('კოდი უნდა შედგებოდეს 11 ციფრისგან');
    onSave({ ...client, ...form, name: form.name.trim() });
    onClose();
  };

  return (
    <Modal open title={isNew ? t('add_client') : t('edit') + ' — ' + client.name} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>{t('cancel')}</button>
        <button className="btn btn-primary btn-sm" onClick={submit}>{t('save')}</button>
      </>}
    >
      {err && <div className="err-box">{err}</div>}
      <div className="fg">
        <label className="form-label req">სახელი / დასახელება</label>
        <input className="input" value={form.name} onChange={e => upd('name', e.target.value)} autoFocus />
      </div>
      <div className="frow">
        <div className="fg">
          <label className="form-label req">პირ. ნომ. / საიდ. კოდი</label>
          <input className="input" value={form.pid} maxLength={11}
            onChange={e => upd('pid', e.target.value.replace(/\D/g, ''))}
            placeholder="11 ციფრი" />
        </div>
        <div className="fg">
          <label className="form-label">მობილური</label>
          <input className="input" value={form.phone} onChange={e => upd('phone', e.target.value)} />
        </div>
      </div>
      <div className="frow">
        <div className="fg">
          <label className="form-label">ელ.ფოსტა</label>
          <input className="input" value={form.email} onChange={e => upd('email', e.target.value)} />
        </div>
        <div className="fg">
          <label className="form-label">რეფერალი (ვინ მოიყვანა)</label>
          <input className="input" value={form.referral} onChange={e => upd('referral', e.target.value)} />
        </div>
      </div>
      <div className="fg">
        <label className="form-label">მისამართი</label>
        <input className="input" value={form.addr} onChange={e => upd('addr', e.target.value)} />
      </div>
      <div className="fg">
        <label className="form-label">მიმართულება</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 4 }}>
          {dirs.map(d => {
            const active = form.directions.includes(d.id);
            return (
              <label key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12.5,
                background: active ? `${d.color}18` : 'var(--bg-muted)',
                padding: '6px 12px', borderRadius: 8,
                border: `1px solid ${active ? d.color : 'var(--border)'}`,
                transition: 'var(--transition)',
              }}>
                <input type="checkbox" checked={active} onChange={() => toggleDir(d.id)}
                  style={{ width: 13, height: 13, accentColor: d.color }} />
                <span>{d.icon}</span>
                <span style={{ color: active ? d.color : 'var(--text-secondary)', fontWeight: active ? 600 : 400 }}>
                  {d.name}
                </span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="fg" style={{ marginBottom: 0 }}>
        <label className="form-label">შენიშვნები</label>
        <textarea className="textarea" rows={3} value={form.notes} onChange={e => upd('notes', e.target.value)} />
      </div>
    </Modal>
  );
}

function ClientDetailModal({ client: initialClient, onClose, defaultTab = 'info' }) {
  const { db, saveDB, t, toast } = useApp();
  const [client, setClient] = useState(initialClient);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [invoiceSelected, setInvoiceSelected] = useState([]);
  const [showInvoiceEditor, setShowInvoiceEditor] = useState(false);
  const dirs = db?.directions || [];
  const usedItems = client.usedItems || [];
  const clientTasks = (db?.tasks || []).filter(tk => tk.client === client.id);
  const clientInvoices = (db?.invoices || []).filter(inv => inv.clientId === client.id);

  const totalCost = usedItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const paidCost  = usedItems.filter(i => i.paid).reduce((s, i) => s + (i.totalPrice || 0), 0);
  const unpaid    = totalCost - paidCost;

  const togglePayment = async (idx) => {
    const newItems = usedItems.map((item, i) => i === idx ? { ...item, paid: !item.paid, paidAt: !item.paid ? new Date().toISOString() : null } : item);
    const updated = { ...client, usedItems: newItems };
    const newDb = { ...db, clients: db.clients.map(c => c.id === client.id ? updated : c) };
    await saveDB(newDb);
    setClient(updated);
    toast(newItems[idx].paid ? '✅ გადახდილად მოინიშნა' : 'გადაუხდელად მოინიშნა');
  };

  return (
    <Modal open title={null} onClose={onClose} size="modal-lg">
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(27,234,205,0.08), transparent)',
        borderBottom: '1px solid var(--border)',
        padding: '16px 20px', margin: '-20px -20px 20px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}>
          {client.name?.[0]}{client.name?.split(' ')?.[1]?.[0] || ''}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0 }}>{client.name}</h2>
          {client.phone && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{client.phone}</div>}
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginRight: 8 }}
          onClick={() => setShowInvoiceEditor(true)}>
          🧾 ახალი ინვოისი
        </button>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        {[
          { key: 'info',      label: `👤 ინფო` },
          { key: 'warehouse', label: `📦 პროდუქცია (${usedItems.length})` },
          { key: 'tasks',     label: `☑ ტასკები (${clientTasks.length})` },
          { key: 'invoices',  label: `🧾 ინვოისები (${clientInvoices.length})` },
        ].map(tab => (
          <button key={tab.key} className={`btn btn-sm ${activeTab === tab.key ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: info */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'ტელეფონი',  val: client.phone    || '—', icon: '📱' },
            { label: 'მეილი',     val: client.email    || '—', icon: '✉️' },
            { label: 'მისამართი', val: client.addr     || '—', icon: '📍' },
            { label: 'პ/ნ',       val: client.pid      || '—', icon: '🪪' },
            { label: 'რეფერალი',  val: client.referral || '—', icon: '🔗' },
            { label: 'შეიქმნა',   val: fd(client.created),     icon: '📅' },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{val}</div>
              </div>
            </div>
          ))}
          {(client.directions || []).length > 0 && (
            <div style={{ gridColumn: 'span 2', background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 8 }}>მიმართულებები</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {(client.directions || []).map(did => {
                  const d = dirs.find(x => x.id === did);
                  return d ? <span key={did} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: d.color + '22', color: d.color, border: `1px solid ${d.color}44`, fontWeight: 600 }}>{d.icon} {d.name}</span> : null;
                })}
              </div>
            </div>
          )}
          {client.notes && (
            <div style={{ gridColumn: 'span 2', background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 6 }}>შენიშვნები</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{client.notes}</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: warehouse */}
      {activeTab === 'warehouse' && (
        <div>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              { label: 'სულ ღირებულება', val: `₾${totalCost.toFixed(2)}`,  color: 'var(--text-primary)' },
              { label: 'გადახდილი',      val: `₾${paidCost.toFixed(2)}`,   color: 'var(--success)' },
              { label: 'გადასახდელი',    val: `₾${unpaid.toFixed(2)}`,     color: unpaid > 0 ? 'var(--danger)' : 'var(--success)' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ background: 'var(--bg-muted)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Invoice bar */}
          {usedItems.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(27,234,205,0.06)', border: '1px solid rgba(27,234,205,0.2)', borderRadius: 'var(--radius)', marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {invoiceSelected.length === 0
                  ? 'ინვოისისთვის მონიშნეთ პოზიციები ↓'
                  : `${invoiceSelected.length} პოზიცია მონიშნული`
                }
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {invoiceSelected.length > 0 && (
                  <button className="btn btn-ghost btn-xs" onClick={() => setInvoiceSelected([])}>× გასუფთავება</button>
                )}
                <InvoiceGenerator
                  client={client}
                  selectedItems={invoiceSelected.length > 0 ? invoiceSelected : usedItems}
                />
              </div>
            </div>
          )}

          {/* Items */}
          {usedItems.length === 0 ? (
            <div className="empty"><div className="empty-icon">📦</div><div className="empty-title">პროდუქცია არ გამოყენებულა</div></div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox"
                        style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                        checked={invoiceSelected.length === usedItems.length && usedItems.length > 0}
                        onChange={e => setInvoiceSelected(e.target.checked ? usedItems.map((item, i) => ({ ...item, _index: i })) : [])}
                      />
                    </th>
                    <th>პროდუქცია</th><th>რაოდ.</th><th>ფასი/ც</th><th>სულ</th><th>თარიღი</th><th>გადახდა</th>
                  </tr>
                </thead>
                <tbody>
                  {usedItems.map((item, i) => {
                    const isSelected = invoiceSelected.some(x => x._index === i);
                    return (
                      <tr key={i} style={{ opacity: item.paid ? 0.7 : 1, background: isSelected ? 'rgba(27,234,205,0.05)' : 'transparent' }}>
                        <td>
                          <input type="checkbox"
                            style={{ width: 14, height: 14, accentColor: 'var(--accent)', cursor: 'pointer' }}
                            checked={isSelected}
                            onChange={() => {
                              setInvoiceSelected(prev =>
                                isSelected ? prev.filter(x => x._index !== i) : [...prev, { ...item, _index: i }]
                              );
                            }}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.itemName}</div>
                          {item.notes && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.notes}</div>}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{item.qty}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>₾{Number(item.unitPrice).toFixed(2)}</td>
                        <td style={{ fontWeight: 700, color: item.paid ? 'var(--success)' : 'var(--text-primary)' }}>₾{Number(item.totalPrice).toFixed(2)}</td>
                        <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fd(item.date)}</td>
                        <td>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                            <input type="checkbox" checked={!!item.paid} onChange={() => togglePayment(i)}
                              style={{ width: 14, height: 14, accentColor: 'var(--success)', cursor: 'pointer' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: item.paid ? 'var(--success)' : 'var(--text-muted)' }}>
                              {item.paid ? '✅ გადახდილია' : 'გადაუხდელი'}
                            </span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: tasks */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientTasks.length === 0 ? (
            <div className="empty"><div className="empty-icon">☑</div><div className="empty-title">ტასკები არ არის</div></div>
          ) : clientTasks.map(tk => (
            <div key={tk.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{tk.title}</div>
                {tk.deadline && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>📅 {fd(tk.deadline)}</div>}
              </div>
              <span className={`badge b-${tk.status}`}>{t('st_' + tk.status)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tab: invoices */}
      {activeTab === 'invoices' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clientInvoices.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🧾</div>
              <div className="empty-title">ინვოისები არ არის</div>
              <div className="empty-desc">header-ში "🧾 ახალი ინვოისი" ღილაკი</div>
            </div>
          ) : [...clientInvoices]
              .sort((a, b) => new Date(b.created) - new Date(a.created))
              .map(inv => (
            <div key={inv.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', background: 'var(--bg-muted)', borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 13 }}>{inv.number}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fd(inv.issueDate)} · ₾{inv.total.toFixed(2)}
                </div>
              </div>
              <span className={`badge b-${inv.status === 'paid' ? 'completed' : 'pending'}`}>
                {inv.status === 'paid' ? '✅ გადახდილი' : '📤 გამოწერილი'}
              </span>
            </div>
          ))}
        </div>
      )}

      {showInvoiceEditor && (
        <InvoiceEditor
          prefillClientId={client.id}
          onClose={() => setShowInvoiceEditor(false)}
          onSaved={() => setActiveTab('invoices')}
        />
      )}
    </Modal>
  );
}

export default function ClientsPage() {
  const { db, user, saveDB, t, toast } = useApp();
  const [search, setSearch] = useState('');
  const [filterDir, setFilterDir] = useState('');
  const [editClient, setEditClient] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [detailClientTab, setDetailClientTab] = useState('info');

  function openDetail(c, tab = 'info') {
    setDetailClientTab(tab);
    setDetailClient(c);
  }

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
      data.id = uid(); data.created = new Date().toISOString();
      newDb.clients = [...newDb.clients, data];
    } else {
      newDb.clients = newDb.clients.map(c => c.id === data.id ? data : c);
    }
    await saveDB(newDb);
    toast(t('toast_client_saved'));
  };

  const handleDelete = async (id) => {
    if (!confirm(t('confirm_delete'))) return;
    await saveDB({ ...db, clients: db.clients.filter(c => c.id !== id) });
    toast(t('toast_client_deleted'));
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{t('clients')}</div>
          <div className="page-subtitle">{clients.length} კლიენტი სულ</div>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={() => { setEditClient(null); setShowForm(true); }}>
            {t('add_client')}
          </button>
        )}
      </div>

      <div className="filter-bar">
        <input className="input" style={{ maxWidth: 240 }} value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} />
        <select className="select" style={{ width: 'auto' }} value={filterDir} onChange={e => setFilterDir(e.target.value)}>
          <option value="">{t('all_directions')}</option>
          {dirs.map(d => <option key={d.id} value={d.id}>{d.icon} {d.name}</option>)}
        </select>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{t('name')}</th>
                <th>{t('phone')}</th>
                <th>{t('address')}</th>
                <th>{t('c_direction')}</th>
                <th>📦</th>
                <th>{t('created_at')}</th>
                {isAdmin && <th>{t('actions')}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="empty">
                      <div className="empty-icon">◉</div>
                      <div className="empty-title">{t('no_clients')}</div>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(c => {
                const usedTotal = (c.usedItems || []).reduce((s, i) => s + (i.totalPrice || 0), 0);
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="clickable-name" onClick={() => openDetail(c)}>{c.name}</div>
                      {c.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>}
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{c.addr}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {(c.directions || []).map(did => {
                          const d = dirs.find(x => x.id === did);
                          return d ? (
                            <span key={did} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: d.color + '22', color: d.color, border: `1px solid ${d.color}44` }}>
                              {d.icon} {d.name}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </td>
                    <td>
                      {(c.usedItems || []).length > 0 ? (
                        <button className="btn btn-ghost btn-xs" onClick={() => openDetail(c, 'warehouse')} title="პროდუქცია / ინვოისი">
                          📦 <span style={{ color: 'var(--success)', fontWeight: 700 }}>₾{usedTotal.toFixed(0)}</span>
                        </button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fd(c.created)}</td>
                    {isAdmin && (
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(c.usedItems || []).length > 0 && (
                            <button className="btn btn-ghost btn-xs" title="ინვოისი" onClick={() => openDetail(c, 'warehouse')}>🧾</button>
                          )}
                          <button className="btn btn-ghost btn-xs" onClick={() => { setEditClient(c); setShowForm(true); }}>✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => handleDelete(c.id)}>🗑</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showForm     && <ClientModal       client={editClient}   onClose={() => setShowForm(false)}    onSave={handleSave} />}
      {detailClient && <ClientDetailModal client={detailClient} onClose={() => setDetailClient(null)} defaultTab={detailClientTab} />}
    </AppShell>
  );
}
