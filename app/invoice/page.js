'use client';
import { useState, useMemo, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { fd, uid } from '@/lib/utils';
import InvoiceEditor from '@/components/Invoice/InvoiceEditor';
import Modal from '@/components/UI/Modal';
import { buildInvoiceHTML } from '@/lib/invoiceHTML';

function reopenPrint(inv) {
  const totals = {
    subtotal:  Number(inv.subtotal  ?? 0),
    vatAmount: Number(inv.vatAmount ?? 0),
    total:     Number(inv.total     ?? 0),
  };
  const html = buildInvoiceHTML({
    client:        inv.clientSnapshot || {},
    items:         inv.items          || [],
    invoiceNumber: inv.number,
    issueDate:     inv.issueDate,
    dueDate:       inv.dueDate,
    discount:      Number(inv.discount ?? 0),
    notes:         inv.notes          || '',
    totals,
    prepayPct:     Number(inv.prepayPct ?? 0),
  });
  const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
  win.document.write(html);
  win.document.close();
}

/* ── Payment Modal ─────────────────────────────────────────────────── */
function PaymentModal({ invoice, onClose }) {
  const { db, dbRef, saveDB, toast } = useApp();
  const [status,     setStatus]     = useState(invoice.status || 'sent');
  const [paidAmount, setPaidAmount] = useState(invoice.paidAmount ?? invoice.total);
  const [paidAt,     setPaidAt]     = useState(
    invoice.paidAt ? invoice.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );

  const remaining = Math.max(0, invoice.total - Number(paidAmount));

  async function save() {
    const updated = {
      ...invoice,
      status,
      paidAmount: status === 'paid' ? invoice.total : status === 'partial' ? Number(paidAmount) : 0,
      paidAt:     status !== 'sent' ? paidAt : null,
    };
    const cur = dbRef?.current || db;
    const newDb = { ...cur, invoices: cur.invoices.map(i => i.id === invoice.id ? updated : i) };
    await saveDB(newDb);
    toast(status === 'paid' ? '✅ სრულად გადახდილად მოინიშნა' : status === 'partial' ? '⚡ ნაწილობრივ გადახდილი' : '↩️ გადასახდელად დაბრუნდა');
    onClose();
  }

  const opts = [
    { val: 'sent',    label: '📤 გადასახდელი',          color: 'var(--text-secondary)' },
    { val: 'partial', label: '⚡ ნაწილობრივ გადახდილი', color: 'var(--warning)' },
    { val: 'paid',    label: '✅ სრულად გადახდილი',      color: 'var(--success)' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200, padding: 18,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg-subtle)', border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420,
        boxShadow: 'var(--shadow-lg)', overflow: 'hidden',
      }}>
        {/* header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(0,0,0,0.12)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>💳 გადახდის სტატუსი</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {invoice.number} · სულ ₾{invoice.total.toFixed(2)}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* radio options */}
          {opts.map(opt => (
            <label key={opt.val} onClick={() => setStatus(opt.val)} style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              padding: '12px 16px', borderRadius: 'var(--radius)',
              border: `2px solid ${status === opt.val ? 'var(--accent)' : 'var(--border)'}`,
              background: status === opt.val ? 'rgba(27,234,205,0.06)' : 'var(--bg-muted)',
              transition: 'var(--transition)',
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${status === opt.val ? 'var(--accent)' : 'var(--border)'}`,
                background: status === opt.val ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {status === opt.val && (
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#0D1117' }} />
                )}
              </div>
              <span style={{ fontWeight: 600, color: status === opt.val ? opt.color : 'var(--text-secondary)', fontSize: 13 }}>
                {opt.label}
              </span>
            </label>
          ))}

          {/* partial amount */}
          {status === 'partial' && (
            <div style={{ padding: '14px 16px', background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius)' }}>
              <div className="fg" style={{ marginBottom: 10 }}>
                <label className="form-label">გადახდილი თანხა (₾)</label>
                <input className="input" type="number" min="0" max={invoice.total} step="0.01"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
                <span style={{ color: 'var(--text-muted)' }}>სულ: ₾{invoice.total.toFixed(2)}</span>
                <span style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  დარჩენილი: ₾{remaining.toFixed(2)}
                </span>
              </div>
              {/* progress bar */}
              <div style={{ height: 4, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-full)', marginTop: 8, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 'var(--radius-full)', background: 'var(--warning)',
                  width: `${Math.min(100, (Number(paidAmount) / invoice.total) * 100)}%`,
                  transition: 'width 200ms ease',
                }} />
              </div>
            </div>
          )}

          {/* date */}
          {status !== 'sent' && (
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="form-label">გადახდის თარიღი</label>
              <input className="input" type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
            </div>
          )}
        </div>

        {/* footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>გაუქმება</button>
          <button className="btn btn-primary btn-sm" onClick={save}>შენახვა</button>
        </div>
      </div>
    </div>
  );
}

function InvoicePageInner() {
  const { db, dbRef, saveDB, toast } = useApp();
  const searchParams = useSearchParams();
  const [editorOpen,     setEditorOpen]    = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [paymentInvoice, setPaymentInvoice] = useState(null);
  const [confirmDel,     setConfirmDel]    = useState(null);
  const [search,         setSearch]        = useState('');
  const [refreshKey,     setRefreshKey]    = useState(0);

  useEffect(() => {
    // URL param (legacy) ან sessionStorage (switches iframe-იდან postMessage-ით)
    let raw = searchParams.get('fromQuote');
    let fromSession = false;
    if (!raw) {
      try {
        const ss = sessionStorage.getItem('sp-fromQuote');
        if (ss) { raw = ss; fromSession = true; }
      } catch {}
    }
    if (!raw) return;
    try {
      const q = fromSession ? JSON.parse(raw) : JSON.parse(decodeURIComponent(raw));
      const prefill = {
        _fromQuote: q.no,
        client: q.client?.name ? { name: q.client.name, address: q.client.project || '' } : undefined,
        items: q.lines.map(l => {
          const origPrice = parseFloat(l.sale || l.price || 0);
          return {
            id: uid(),
            name: l.name || l.ka || '',
            qty: l.qty || 1,
            unit: l.unit || 'ცალი',
            listPrice: origPrice,
            salePrice: origPrice,
            price: origPrice,
            vatEnabled: false,
            vatRate: 18,
          };
        }),
        discountMode: 'lari',
        discountPct:  0,
        discount:     0,
        notes: `შეთავაზება ${q.no}${q.client?.project ? ' — ' + q.client.project : ''}`,
      };
      if (fromSession) {
        try { sessionStorage.removeItem('sp-fromQuote'); } catch {}
      } else {
        const url = new URL(window.location.href);
        url.searchParams.delete('fromQuote');
        window.history.replaceState({}, '', url.toString());
      }
      setEditingInvoice(prefill);
      setEditorOpen(true);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invoices = useMemo(() => {
    return [...(db?.invoices || [])]
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .filter(inv => {
        if (!search) return true;
        const q = search.toLowerCase();
        return inv.number.toLowerCase().includes(q) ||
          (inv.clientSnapshot?.name || '').toLowerCase().includes(q);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db?.invoices, search, refreshKey]);

  const openNew  = () => { setEditingInvoice(null); setEditorOpen(true); };
  const openEdit = (inv) => { setEditingInvoice(inv); setEditorOpen(true); };

  const deleteInvoice = async (inv) => {
    const cur = dbRef?.current || db;
    const newDb = { ...cur, invoices: (cur.invoices || []).filter(i => i.id !== inv.id) };
    await saveDB(newDb);
    toast('🗑 ინვოისი წაიშალა');
    setConfirmDel(null);
  };

  const totalPaid      = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalRemaining = invoices.filter(i => i.status === 'partial').reduce((s, i) => s + Math.max(0, i.total - (i.paidAmount || 0)), 0);
  const totalUnpaid    = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total, 0);

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">🧾 ინვოისები</div>
          <div className="page-subtitle">{invoices.length} ინვოისი სულ</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ ახალი ინვოისი</button>
      </div>

      {/* Summary cards */}
      {invoices.length > 0 && (
        <div className="stats-grid" style={{ marginBottom: 16 }}>
          {[
            { label: 'სულ ინვოისი',      val: invoices.length,               color: 'stat-blue',   icon: '🧾' },
            { label: 'სრულად გადახდ.',   val: `₾${totalPaid.toFixed(0)}`,    color: 'stat-green',  icon: '✅' },
            { label: 'დარჩ. ჩასარიცხი',  val: `₾${totalRemaining.toFixed(0)}`, color: 'stat-yellow', icon: '⚡' },
            { label: 'გადასახდელი',      val: `₾${totalUnpaid.toFixed(0)}`,   color: 'stat-red',    icon: '⏳' },
          ].map(c => (
            <div key={c.label} className={`stat-card ${c.color}`}>
              <div className="stat-icon">{c.icon}</div>
              <div className="stat-value" style={{ fontSize: typeof c.val === 'string' ? 20 : 26 }}>{c.val}</div>
              <div className="stat-label">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <input className="input" style={{ maxWidth: 260 }} value={search}
          onChange={e => setSearch(e.target.value)} placeholder="ძებნა № ან კლიენტით..." />
        {search && (
          <button className="btn btn-ghost btn-sm" onClick={() => setSearch('')}>× გასუფთავება</button>
        )}
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>ინვ. №</th>
                <th>კლიენტი</th>
                <th>გამოწერა</th>
                <th>გადახდის ვადა</th>
                <th>სულ</th>
                <th>სტატუსი</th>
                <th style={{ width: 120 }}>მოქმ.</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty">
                    <div className="empty-icon">🧾</div>
                    <div className="empty-title">ინვოისები არ არის</div>
                    <div className="empty-desc">დააჭირე "+ ახალი ინვოისი" შექმნისთვის</div>
                  </div>
                </td></tr>
              ) : invoices.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{inv.number}</td>
                  <td style={{ fontWeight: 500 }}>{inv.clientSnapshot?.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fd(inv.issueDate)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fd(inv.dueDate)}</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>₾{inv.total.toFixed(2)}</td>
                  <td>
                    {inv.status === 'paid' && (
                      <div>
                        <span className="badge b-completed">✅ სრულად გადახდ.</span>
                        {inv.paidAt && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{fd(inv.paidAt)}</div>}
                      </div>
                    )}
                    {inv.status === 'partial' && (
                      <div>
                        <span className="badge b-paused">⚡ ნაწილობრივ</span>
                        <div style={{ fontSize: 10, color: 'var(--warning)', marginTop: 2, fontWeight: 600 }}>
                          ₾{(inv.paidAmount || 0).toFixed(2)} / ₾{inv.total.toFixed(2)}
                        </div>
                      </div>
                    )}
                    {(!inv.status || inv.status === 'sent') && (
                      <span className="badge b-pending">📤 გადასახდელი</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" title="გადახდა" onClick={() => setPaymentInvoice(inv)}>💳</button>
                      <button className="btn btn-ghost btn-xs" title="ბეჭდვა" onClick={() => reopenPrint(inv)}>🖨️</button>
                      <button className="btn btn-ghost btn-xs" title="რედაქტირება" onClick={() => openEdit(inv)}>✏️</button>
                      <button className="btn btn-ghost btn-xs" title="წაშლა"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setConfirmDel(inv)}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editorOpen && (
        <InvoiceEditor
          invoice={editingInvoice}
          onClose={() => setEditorOpen(false)}
          onSaved={(savedInvoice) => {
            setRefreshKey(k => k + 1);
            setEditingInvoice(savedInvoice);
            setEditorOpen(false);
          }}
        />
      )}
      {paymentInvoice && (
        <PaymentModal
          invoice={paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
        />
      )}
      {confirmDel && (
        <Modal open
          title="🗑 ინვოისის წაშლა"
          onClose={() => setConfirmDel(null)}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>
              გაუქმება
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteInvoice(confirmDel)}>
              წაშლა
            </button>
          </>}
        >
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            წაიშლება:{' '}
            <strong style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
              {confirmDel.number}
            </strong>
            {confirmDel.clientSnapshot?.name && <> — {confirmDel.clientSnapshot.name}</>}
            <br />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
              ₾{confirmDel.total?.toFixed(2)}
            </span>
            <br />
            <span style={{ fontSize: 12, color: 'var(--danger)', display: 'block', marginTop: 4 }}>
              ⚠️ წაშლა შეუქცევადია
            </span>
          </p>
        </Modal>
      )}
    </AppShell>
  );
}

export default function InvoicePage() {
  return (
    <Suspense>
      <InvoicePageInner />
    </Suspense>
  );
}
