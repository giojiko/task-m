'use client';
import { useState, useRef } from 'react';
import Modal from '@/components/UI/Modal';
import { useApp } from '@/context/AppContext';
import { uid, getNextInvoiceNumber, calcInvoiceTotals } from '@/lib/utils';
import { buildInvoiceHTML } from '@/lib/invoiceHTML';

const UNITS = ['ცალი','კომპლ.','მეტრი','მ²','საათი','მომსახ.','კგ'];
// listPrice = საწყისი (quote) ფასი; salePrice = ჩემი გასაყიდი ფასი (ხელით)
const emptyItem = () => ({ name: '', qty: 1, unit: 'ცალი', listPrice: 0, salePrice: 0, price: 0, vatEnabled: false, vatRate: 18 });

function ClientPicker({ clientId, onSelect, newClientDraft, onNewClient }) {
  const { db } = useApp();
  const clients = db?.clients || [];
  const showNewForm = !clientId && (newClientDraft.name || newClientDraft._active);

  const handleChange = (e) => {
    const val = e.target.value;
    if (val === '__new__') {
      onNewClient({ ...newClientDraft, _active: true });
      onSelect('');
    } else {
      onNewClient({ name: '', pid: '', phone: '', addr: '', _active: false });
      onSelect(val);
    }
  };

  return (
    <>
      <select className="select" value={showNewForm ? '__new__' : clientId} onChange={handleChange}>
        <option value="">— ხელით შევსება —</option>
        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__new__">➕ ახალი კლიენტი...</option>
      </select>
      {showNewForm && (
        <div style={{
          marginTop: 10, padding: 14,
          background: 'var(--bg-muted)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)',
            textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 10 }}>
            ➕ ახალი კლიენტის მონაცემები
          </div>
          <div className="frow">
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="form-label">სახელი *</label>
              <input className="input" value={newClientDraft.name}
                onChange={e => onNewClient({ ...newClientDraft, name: e.target.value })}
                placeholder="კლიენტის სახელი" />
            </div>
            <div className="fg" style={{ marginBottom: 8 }}>
              <label className="form-label">პ/ნ ან საიდ. კოდი *</label>
              <input className="input" value={newClientDraft.pid} maxLength={11}
                onChange={e => onNewClient({ ...newClientDraft, pid: e.target.value.replace(/\D/g, '') })}
                placeholder="9 ან 11 ციფრი" />
            </div>
          </div>
          <div className="frow">
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="form-label">მობილური</label>
              <input className="input" value={newClientDraft.phone}
                onChange={e => onNewClient({ ...newClientDraft, phone: e.target.value })} />
            </div>
            <div className="fg" style={{ marginBottom: 0 }}>
              <label className="form-label">მისამართი</label>
              <input className="input" value={newClientDraft.addr}
                onChange={e => onNewClient({ ...newClientDraft, addr: e.target.value })} />
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            ℹ️ კლიენტი ავტომატურად დაემატება ბაზაში ინვოისის შენახვისას
          </div>
        </div>
      )}
    </>
  );
}

/* ── კომისიის გამოთვლა ────────────────────────────────────────────── */
function calcSellerCommission(items, sellerId, sellerPrices, sellers) {
  if (!sellerId) return { lines: [], totalComm: 0 };
  const seller = (sellers || []).find(s => s.id === sellerId);
  const lines = items.filter(i => i.name?.trim()).map(i => {
    const qty       = Number(i.qty) || 0;
    const myPrice   = Number(i.salePrice || i.price || 0);
    const lp        = Number(i.listPrice || myPrice);
    // seller's specific price for this product
    const spEntry   = (sellerPrices || []).find(p =>
      p.sellerId === sellerId &&
      p.productName?.toLowerCase().trim() === i.name?.toLowerCase().trim()
    );
    let sellerPrice;
    if (spEntry) {
      if (spEntry.price > 0) {
        sellerPrice = spEntry.price;
      } else if (spEntry.discountPct > 0) {
        sellerPrice = myPrice * (1 - spEntry.discountPct / 100);
      } else {
        sellerPrice = myPrice;
      }
    } else if (seller?.defPct > 0) {
      sellerPrice = myPrice * (1 - seller.defPct / 100);
    } else {
      sellerPrice = myPrice; // no diff
    }
    const commission = Math.max(0, (myPrice - sellerPrice) * qty);
    return { name: i.name, qty, myPrice, sellerPrice, commission, hasEntry: !!spEntry };
  });
  const totalComm = lines.reduce((s, l) => s + l.commission, 0);
  return { lines, totalComm };
}

export default function InvoiceEditor({ invoice, prefillClientId, onClose, onSaved }) {
  const { db, dbRef, user, saveDB, toast } = useApp();
  const wh = db?.wh || [];
  const [suggestions,   setSuggestions]   = useState([]);
  const [activeSugIdx,  setActiveSugIdx]  = useState(null);
  const sugRef = useRef(null);
  const isNew = !invoice?.id;
  const clients = db?.clients || [];
  const sellers = db?.sellers || [];
  const sellerPrices = db?.sellerPrices || [];

  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })();

  const [clientId,       setClientId]       = useState(invoice?.clientId || prefillClientId || '');
  const [newClientDraft, setNewClientDraft] = useState({ name: '', pid: '', phone: '', addr: '', _active: false });
  const [issueDate,      setIssueDate]      = useState(invoice?.issueDate || today);
  const [dueDate,        setDueDate]        = useState(invoice?.dueDate   || dueDefault);
  const [discount,       setDiscount]       = useState(invoice?.discount  ?? 0);
  const [discountMode,   setDiscountMode]   = useState(invoice?.discountMode ?? 'lari'); // 'lari' | 'pct'
  const [discountPct,    setDiscountPct]    = useState(invoice?.discountPct  ?? 0);
  const [prepayPct,      setPrepayPct]      = useState(invoice?.prepayPct ?? 0);
  const [notes,          setNotes]          = useState(invoice?.notes     || 'ფასები ეროვნულ ვალუტაში (GEL)');
  const [sellerId,       setSellerId]       = useState(invoice?.sellerId  || '');
  const [items,          setItems]          = useState(
    invoice?.items?.length ? invoice.items : [emptyItem(), emptyItem(), emptyItem()]
  );

  const selectedClient = clients.find(c => c.id === clientId);
  const isCreatingNew  = !clientId && (newClientDraft._active || newClientDraft.name.trim());
  const displayClient  = isCreatingNew ? newClientDraft : (selectedClient || {});

  const origSubtotal = items.reduce((s, i) => {
    const lp = parseFloat(i.listPrice) || parseFloat(i.price) || 0;
    return s + lp * (parseFloat(i.qty) || 0);
  }, 0);
  const subtotalForDiscount = items.reduce((s, i) => {
    const lp = parseFloat(i.listPrice) || parseFloat(i.price) || 0;
    const sp = parseFloat(i.salePrice);
    const fp = (!isNaN(sp) && sp > 0 && sp < lp) ? sp : lp;
    return s + fp * (parseFloat(i.qty) || 0);
  }, 0);
  const discountLari = discountMode === 'pct'
    ? Math.round(subtotalForDiscount * parseFloat(discountPct || 0)) / 100
    : parseFloat(discount || 0);
  const totals = calcInvoiceTotals(items, discountLari);
  const sellerComm = calcSellerCommission(items, sellerId, sellerPrices, sellers);

  const updItem = (idx, key, val) =>
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: val };
      // when listPrice changes, reset salePrice to match (unless user already set it lower)
      if (key === 'listPrice') {
        const lp = parseFloat(val) || 0;
        const sp = parseFloat(updated.salePrice);
        if (isNaN(sp) || sp <= 0 || sp >= lp) {
          updated.salePrice = lp;
        }
        updated.price = parseFloat(updated.salePrice) || lp;
      }
      // when salePrice changes, update price directly
      if (key === 'salePrice') {
        updated.price = parseFloat(val) || 0;
      }
      return updated;
    }));
  const addRow    = () => setItems(prev => [...prev, emptyItem()]);
  const insertRowAfter = (idx) => setItems(prev => [...prev.slice(0, idx + 1), emptyItem(), ...prev.slice(idx + 1)]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  async function handleSave(openAfter = true) {
    let newDb = { ...(dbRef?.current || db) };
    let finalClientId = clientId;

    if (isCreatingNew) {
      if (!newClientDraft.name.trim() || !newClientDraft.pid.trim()) {
        toast('ახალი კლიენტისთვის სახელი და პ/ნ სავალდებულოა');
        return;
      }
      const newClient = {
        id: uid(), created: new Date().toISOString(),
        name: newClientDraft.name.trim(), pid: newClientDraft.pid,
        phone: newClientDraft.phone, addr: newClientDraft.addr,
        email: '', directions: [], notes: '',
      };
      newDb.clients = [...(newDb.clients || []), newClient];
      finalClientId = newClient.id;
    }

    const validItems = items.filter(i => i.name.trim()).map(i => {
      const lp = parseFloat(i.listPrice) || parseFloat(i.price) || 0;
      const sp = parseFloat(i.salePrice);
      const fp = (!isNaN(sp) && sp > 0 && sp < lp) ? sp : lp;
      return { ...i, listPrice: lp, salePrice: fp, price: fp };
    });
    if (validItems.length === 0) { toast('მინიმუმ 1 პოზიცია საჭიროა'); return; }

    const finalClient = finalClientId
      ? (newDb.clients || []).find(c => c.id === finalClientId) || {}
      : isCreatingNew ? newClientDraft : {};

    const recalc = calcInvoiceTotals(validItems, discountLari);
    const invoiceData = {
      id:       invoice?.id      || uid(),
      number:   invoice?.number  || getNextInvoiceNumber(newDb),
      clientId: finalClientId    || null,
      clientSnapshot: {
        name:  finalClient.name  || '', phone: finalClient.phone || '',
        email: finalClient.email || '', addr:  finalClient.addr  || '', pid: finalClient.pid || '',
      },
      issueDate, dueDate,
      items: validItems,
      discount:     discountLari,
      discountMode: discountMode,
      discountPct:  discountMode === 'pct' ? Number(discountPct) : 0,
      prepayPct: Number(prepayPct),
      notes,
      subtotal:  recalc.subtotal,
      vatAmount: recalc.vatAmount,
      total:     recalc.total,
      sellerId:         sellerId || null,
      sellerSnapshot:   sellerId ? (sellers.find(s => s.id === sellerId) || null) : null,
      sellerCommission: sellerId ? sellerComm.totalComm : 0,
      status:    invoice?.status    || 'sent',
      createdBy: invoice?.createdBy || user.id,
      created:   invoice?.created   || new Date().toISOString(),
      updated:   new Date().toISOString(),
    };

    newDb.invoices = isNew
      ? [...(newDb.invoices || []), invoiceData]
      : (newDb.invoices || []).map(inv => inv.id === invoiceData.id ? invoiceData : inv);

    await saveDB(newDb);
    toast(isNew ? '✅ ინვოისი შეიქმნა' : '✅ ინვოისი განახლდა');

    if (openAfter) {
      const html = buildInvoiceHTML({
        client: invoiceData.clientSnapshot,
        items: validItems,
        invoiceNumber: invoiceData.number,
        issueDate, dueDate, discount: discountLari, notes,
        totals: recalc,
        prepayPct: Number(prepayPct),
      });
      const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
      win.document.write(html);
      win.document.close();
    }
    onSaved?.(invoiceData);
    onClose();
  }

  return (
    <Modal
      open
      size="modal-xl"
      title={isNew ? '🧾 ახალი ინვოისი' : `🧾 რედაქტირება — ${invoice.number}`}
      onClose={onClose}
      footer={<>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>გაუქმება</button>
        <button className="btn btn-secondary btn-sm" onClick={() => handleSave(false)}>💾 მხოლოდ შენახვა</button>
        <button className="btn btn-primary btn-sm" onClick={() => handleSave(true)}>💾 შენახვა + 🖨️ გახსნა</button>
      </>}
    >
      <div className="invoice-editor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, alignItems: 'start' }}>

        {/* მარცხენა */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="fg">
            <label className="form-label">მყიდველი</label>
            <ClientPicker
              clientId={clientId}
              onSelect={setClientId}
              newClientDraft={newClientDraft}
              onNewClient={setNewClientDraft}
            />
          </div>

          {displayClient.name && !isCreatingNew && (
            <div style={{
              background: 'rgba(27,234,205,0.06)', border: '1px solid rgba(27,234,205,0.2)',
              borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12,
              display: 'flex', gap: 14, flexWrap: 'wrap', color: 'var(--text-secondary)',
            }}>
              {displayClient.phone && <span>📱 {displayClient.phone}</span>}
              {displayClient.addr  && <span>📍 {displayClient.addr}</span>}
              {displayClient.pid   && <span>🪪 {displayClient.pid}</span>}
            </div>
          )}

          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">პოზიციები</label>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 22 }}>#</th>
                    <th style={{ minWidth: 160 }}>დასახელება</th>
                    <th style={{ width: 52 }}>რაოდ.</th>
                    <th style={{ width: 70 }}>ერთ.</th>
                    <th style={{ width: 90 }}>საწყისი ფასი (₾)</th>
                    <th style={{ width: 90 }}>ფასდაკლ. ფასი (₾)</th>
                    <th style={{ width: 54 }}>დღგ</th>
                    <th style={{ width: 82 }}>ჯამი</th>
                    <th style={{ width: 40, textAlign: 'center', fontSize: 9, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '.04em' }}>+/✕</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lp = parseFloat(item.listPrice) || parseFloat(item.price) || 0;
                    const sp = parseFloat(item.salePrice);
                    const finalPrice = (!isNaN(sp) && sp > 0 && sp < lp) ? sp : lp;
                    const discLari = lp - finalPrice;
                    const lineTotal = Number(item.qty) * finalPrice;
                    const lineVat = item.vatEnabled ? lineTotal * (Number(item.vatRate ?? 18) / 100) : 0;
                    return (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ minWidth: 160, position: 'relative' }}>
                          <textarea
                            className="input"
                            rows={item.name && item.name.length > 30 ? 2 : 1}
                            style={{
                              border: 'none', background: 'transparent',
                              padding: '3px 2px', fontSize: 12.5,
                              width: '100%', minWidth: 0,
                              resize: 'none', overflow: 'hidden',
                              lineHeight: '1.4', whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word', display: 'block',
                            }}
                            value={item.name}
                            onChange={e => {
                              const val = e.target.value;
                              updItem(idx, 'name', val);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                              if (val.trim().length >= 2) {
                                const q = val.trim().toLowerCase();
                                const matches = wh.filter(w =>
                                  w.name?.toLowerCase().includes(q) ||
                                  w.sku?.toLowerCase().includes(q)
                                ).slice(0, 6);
                                if (matches.length > 0) {
                                  setSuggestions(matches);
                                  setActiveSugIdx(idx);
                                } else {
                                  setSuggestions([]);
                                  setActiveSugIdx(null);
                                }
                              } else {
                                setSuggestions([]);
                                setActiveSugIdx(null);
                              }
                            }}
                            onBlur={() => {
                              setTimeout(() => {
                                setSuggestions([]);
                                setActiveSugIdx(null);
                              }, 180);
                            }}
                            placeholder="პროდუქტი / სერვისი"
                          />
                          {activeSugIdx === idx && suggestions.length > 0 && (
                            <div ref={sugRef} style={{
                              position: 'absolute', top: '100%', left: 0, zIndex: 999,
                              background: 'var(--bg-card)', border: '1px solid var(--border-accent)',
                              borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                              minWidth: 260, maxWidth: 360, overflow: 'hidden',
                            }}>
                              <div style={{
                                padding: '5px 10px', fontSize: 10, fontWeight: 700,
                                color: 'var(--text-muted)', textTransform: 'uppercase',
                                letterSpacing: '.05em', borderBottom: '1px solid var(--border)',
                                background: 'var(--bg-subtle)',
                              }}>
                                📦 საწყობი — {suggestions.length} შედეგი
                              </div>
                              {suggestions.map(w => {
                                const sellP = w.sellPrice ?? w.costPrice ?? 0;
                                const inStock = (w.qty || 0) > 0;
                                return (
                                  <div key={w.id}
                                    onMouseDown={e => {
                                      e.preventDefault();
                                      updItem(idx, 'name',      w.name || '');
                                      updItem(idx, 'unit',      w.unit || 'ცალი');
                                      updItem(idx, 'listPrice', sellP);
                                      updItem(idx, 'salePrice', sellP);
                                      updItem(idx, 'price',     sellP);
                                      setSuggestions([]);
                                      setActiveSugIdx(null);
                                    }}
                                    style={{
                                      padding: '7px 12px', cursor: 'pointer',
                                      borderBottom: '1px solid var(--border)',
                                      display: 'flex', justifyContent: 'space-between',
                                      alignItems: 'center', gap: 8, fontSize: 12.5,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-muted)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontWeight: 600, color: 'var(--text-primary)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {w.name}
                                      </div>
                                      {w.sku && (
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                                          SKU: {w.sku}
                                        </div>
                                      )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                      <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: 13 }}>
                                        ₾{Number(sellP).toFixed(2)}
                                      </div>
                                      <div style={{ fontSize: 10, color: inStock ? 'var(--success)' : 'var(--danger)', marginTop: 1 }}>
                                        {inStock ? `${w.qty} ${w.unit || 'ც'}` : 'არ არის'}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div style={{ padding: '5px 10px', fontSize: 10,
                                color: 'var(--text-muted)', textAlign: 'center' }}>
                                ↵ არჩევისას ფასი და ერთეული ავტომატურად ჩაიწერება
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          <input className="input" type="number" min="0" step="0.01"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', textAlign: 'right' }}
                            value={item.qty} onChange={e => updItem(idx, 'qty', e.target.value)} />
                        </td>
                        <td>
                          <select className="select"
                            style={{ border: 'none', background: 'var(--bg-subtle)', padding: '4px 4px', fontSize: 12 }}
                            value={item.unit} onChange={e => updItem(idx, 'unit', e.target.value)}>
                            {UNITS.map(u => <option key={u} style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input className="input" type="number" min="0" step="0.01"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', textAlign: 'right' }}
                            value={item.listPrice ?? item.price ?? 0}
                            onChange={e => updItem(idx, 'listPrice', e.target.value)} />
                        </td>
                        <td>
                          {(() => {
                            const spEntry = sellerId
                              ? sellerPrices.find(p =>
                                  p.sellerId === sellerId &&
                                  p.productName?.toLowerCase().trim() === item.name?.toLowerCase().trim()
                                )
                              : null;
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <input className="input" type="number" min="0" step="0.01"
                                  style={{
                                    border: 'none',
                                    background: discLari > 0.001 ? 'rgba(26,110,58,0.10)' : 'transparent',
                                    padding: '4px 2px', textAlign: 'right', flex: 1, minWidth: 0,
                                    color: discLari > 0.001 ? '#1a6e3a' : 'var(--text-primary)',
                                    fontWeight: discLari > 0.001 ? 700 : 400,
                                  }}
                                  value={item.salePrice ?? lp}
                                  onChange={e => updItem(idx, 'salePrice', e.target.value)}
                                  placeholder={lp > 0 ? lp.toFixed(2) : '0.00'} />
                                {spEntry && spEntry.price > 0 && (
                                  <button
                                    type="button"
                                    title={`დილერის ფასი: ₾${spEntry.price}`}
                                    onClick={() => updItem(idx, 'salePrice', spEntry.price)}
                                    style={{
                                      flexShrink: 0, padding: '2px 5px', fontSize: 11,
                                      border: '1px solid var(--accent)',
                                      borderRadius: 4, background: 'rgba(27,234,205,0.12)',
                                      color: 'var(--accent)', cursor: 'pointer',
                                      fontWeight: 700, lineHeight: 1.3,
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(27,234,205,0.28)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(27,234,205,0.12)'}
                                  >💲</button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                            <input type="checkbox" checked={!!item.vatEnabled}
                              onChange={e => updItem(idx, 'vatEnabled', e.target.checked)}
                              style={{ width: 14, height: 14, accentColor: 'var(--accent)' }} />
                            {item.vatEnabled && (
                              <input type="number" min="0" max="100" value={item.vatRate ?? 18}
                                onChange={e => updItem(idx, 'vatRate', Number(e.target.value))}
                                style={{ width: 30, background: 'transparent', border: 'none',
                                  borderBottom: '1px dashed var(--border)', color: 'var(--text-primary)',
                                  fontSize: 11, textAlign: 'center', outline: 'none' }} />
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)', textAlign: 'right', fontSize: 12.5 }}>
                          ₾{(lineTotal + lineVat).toFixed(2)}
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                            <button
                              className="btn btn-ghost btn-xs"
                              title="ამ სტრიქონის ქვეშ ახლის ჩასმა"
                              onClick={() => insertRowAfter(idx)}
                              style={{
                                color: 'var(--accent)',
                                border: '1px solid var(--accent)',
                                borderRadius: 4,
                                fontSize: 13,
                                fontWeight: 700,
                                lineHeight: 1,
                                padding: '2px 7px',
                                opacity: 0.7,
                                transition: 'opacity .15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.opacity = 1}
                              onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                            >+</button>
                            <button className="btn btn-ghost btn-xs" onClick={() => removeRow(idx)}
                              style={{ color: 'var(--danger)', fontSize: 11, padding: '2px 5px' }}>✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={addRow}
              style={{ border: '1.5px dashed var(--border)', width: '100%', justifyContent: 'center', marginTop: 8 }}>
              + სტრიქონის დამატება
            </button>
          </div>

          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">შენიშვნები</label>
            <textarea className="textarea" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        {/* მარჯვენა */}
        <div className="invoice-editor-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">გამოწერის თარიღი</label>
            <input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">გადახდის ვადა</label>
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>ფასდაკლება</span>
              <span style={{ display: 'flex', gap: 0, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
                {['lari', 'pct'].map(mode => (
                  <button key={mode} type="button"
                    onClick={() => setDiscountMode(mode)}
                    style={{ padding: '2px 10px', fontSize: 12, border: 'none', cursor: 'pointer',
                      background: discountMode === mode ? 'var(--primary)' : 'transparent',
                      color: discountMode === mode ? '#fff' : 'var(--text-secondary)',
                      fontWeight: discountMode === mode ? 700 : 400 }}>
                    {mode === 'lari' ? '₾' : '%'}
                  </button>
                ))}
              </span>
            </label>
            {discountMode === 'lari' ? (
              <input className="input" type="number" min="0" value={discount}
                onChange={e => setDiscount(e.target.value)} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input className="input" type="number" min="0" max="100" step="0.1" value={discountPct}
                  onChange={e => setDiscountPct(e.target.value)} style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  = ₾{discountLari.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">წინასწარი ჩარიცხვა %</label>
            <input className="input" type="number" min="0" max="100" step="5"
              value={prepayPct} onChange={e => setPrepayPct(e.target.value)} placeholder="0" />
          </div>

          {/* Seller Picker */}
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">🤝 გამყიდველი / რეფერალი</label>
            <select className="select" value={sellerId} onChange={e => setSellerId(e.target.value)}>
              <option value="">— არ მიბმულა —</option>
              {sellers.filter(s => s.active !== false).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Seller Commission Panel */}
          {sellerId && sellerComm.totalComm >= 0 && (
            <div style={{
              background: 'rgba(234,179,8,0.06)',
              border: '1px solid rgba(234,179,8,0.25)',
              borderRadius: 'var(--radius)', padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#d97706',
                textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>
                🤝 {sellers.find(s => s.id === sellerId)?.name} — საკომისო
              </div>
              {sellerComm.lines.filter(l => l.commission > 0.001).map((l, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, color: 'var(--text-secondary)' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap', maxWidth: 100 }} title={l.name}>{l.name}</span>
                  <span style={{ color: '#d97706', fontWeight: 700, flexShrink: 0 }}>
                    ₾{l.commission.toFixed(2)}
                  </span>
                </div>
              ))}
              {sellerComm.lines.filter(l => l.commission <= 0.001).length > 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {sellerComm.lines.filter(l => l.commission <= 0.001).length} პოზ. — ცალკე ფასი არ არის
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                borderTop: '1px solid rgba(234,179,8,0.3)', paddingTop: 6, marginTop: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#d97706' }}>სულ საკომ.</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: '#d97706' }}>
                  ₾{sellerComm.totalComm.toFixed(2)}
                </span>
              </div>
            </div>
          )}
          <div style={{
            background: 'var(--bg-muted)', borderRadius: 'var(--radius)',
            padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {origSubtotal > subtotalForDiscount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-muted)' }}>საწყისი ფასი</span>
                <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)' }}>₾{origSubtotal.toFixed(2)}</span>
              </div>
            )}
            {[
              { label: 'ქვეჯამი',    val: totals.subtotal.toFixed(2) },
              { label: 'დღგ ჯამი',   val: totals.vatAmount.toFixed(2) },
              { label: discountMode === 'pct' ? `ფასდაკლება ${discountPct}%` : 'ფასდაკლება', val: `-${discountLari.toFixed(2)}` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span>₾{val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingTop: 6, borderTop: '1px solid var(--border)', fontSize: 15 }}>
              <span style={{ fontWeight: 700 }}>სულ</span>
              <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 17 }}>
                ₾{totals.total.toFixed(2)}
              </span>
            </div>
            {Number(prepayPct) > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6,
                  borderTop: '2px solid var(--accent)', marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>წინასწარი ({prepayPct}%)</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                    ₾{(totals.total * Number(prepayPct) / 100).toFixed(2)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12 }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }}>დარჩენილი</span>
                  <span style={{ color: 'var(--danger)', fontWeight: 800 }}>
                    ₾{(totals.total * (1 - Number(prepayPct) / 100)).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
