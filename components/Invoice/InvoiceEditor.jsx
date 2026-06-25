'use client';
import { useState, useRef } from 'react';
import Modal from '@/components/UI/Modal';
import { useApp } from '@/context/AppContext';
import { uid, getNextInvoiceNumber, calcInvoiceTotals } from '@/lib/utils';

const UNITS = ['ცალი','კომპლ.','მეტრი','მ²','საათი','მომსახ.','კგ'];
const emptyItem = () => ({ name: '', qty: 1, unit: 'ცალი', price: 0, vatEnabled: false, vatRate: 18 });

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildInvoiceHTML({ client, items, invoiceNumber, issueDate, dueDate, discount, notes, totals }) {
  const validItems = items.filter(i => i.name.trim());
  const rows = validItems.map((item, i) => {
    const lineTotal = Number(item.qty) * Number(item.price);
    const lineVat = item.vatEnabled ? lineTotal * (Number(item.vatRate ?? 18) / 100) : 0;
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escHtml(item.name)}</td>
        <td style="text-align:right">${item.qty}</td>
        <td>${escHtml(item.unit)}</td>
        <td style="text-align:right">₾ ${Number(item.price).toFixed(2)}</td>
        <td style="text-align:center">${item.vatEnabled ? `${item.vatRate ?? 18}%` : '—'}</td>
        <td style="text-align:right;font-weight:600">₾ ${(lineTotal + lineVat).toFixed(2)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8"/>
  <title>Smart Pro — ინვოისი ${invoiceNumber}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;600;700&display=swap');
    @page{size:A4;margin:8mm 7mm;}
    *{margin:0;padding:0;box-sizing:border-box;}
    @media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{background:#fff;padding:0;}.no-print{display:none!important;}.invoice-wrap{box-shadow:none;border-radius:0;max-width:100%;}}
    :root{--primary:#0d1b3e;--accent:#00aaff;--accent2:#0077cc;--light:#f4f7fc;--border:#dce4f0;--text:#1a2340;--muted:#6b7a99;}
    body{font-family:'Noto Sans Georgian',sans-serif;background:var(--light);color:var(--text);padding:16px;font-size:13px;}
    .invoice-wrap{max-width:860px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(13,27,62,.13);overflow:hidden;}
    .inv-header{background:linear-gradient(135deg,#0d1b3e 0%,#152d5e 60%,#0077cc 100%);padding:26px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;}
    .logo-side img{height:48px;filter:brightness(0) invert(1);object-fit:contain;}
    .logo-side .tagline{color:rgba(255,255,255,.5);font-size:10px;margin-top:5px;}
    .title-side{text-align:right;}
    .title-side h1{font-size:28px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;}
    .title-side .inv-num{color:var(--accent);font-size:14px;font-weight:600;margin-top:3px;}
    .title-side .inv-badge{display:inline-block;margin-top:8px;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(0,170,255,.18);color:var(--accent);border:1px solid rgba(0,170,255,.35);}
    .inv-meta{background:#eef3fb;padding:12px 36px;display:flex;border-bottom:1px solid var(--border);}
    .meta-item{flex:1;border-right:1px solid var(--border);padding:0 16px 0 0;margin-right:16px;}
    .meta-item:last-child{border-right:none;margin-right:0;}
    .meta-item .ml{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px;}
    .meta-item .mv{font-size:13px;font-weight:700;color:var(--text);}
    .inv-parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);}
    .party-block{padding:10px 36px;}
    .party-block:first-child{border-right:1px solid var(--border);}
    .party-block .pb-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:700;margin-bottom:6px;}
    .party-block table{width:100%;border-collapse:collapse;}
    .party-block table td{padding:2px 0;font-size:11.5px;vertical-align:top;}
    .party-block table td:first-child{color:var(--muted);width:110px;font-size:9.5px;padding-top:2px;}
    .party-block table td.val{font-weight:600;color:var(--text);}
    .party-block table td.val.bold{font-weight:700;font-size:13px;}
    .inv-table-wrap{padding:18px 36px;border-bottom:1px solid var(--border);}
    .section-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:700;margin-bottom:10px;}
    table.items{width:100%;border-collapse:collapse;}
    table.items thead tr{background:var(--primary);color:#fff;}
    table.items thead th{padding:8px 10px;font-size:10px;font-weight:600;text-align:left;}
    table.items tbody tr{border-bottom:1px solid var(--border);}
    table.items tbody tr:nth-child(even){background:#f8faff;}
    table.items tbody td{padding:7px 10px;font-size:11.5px;vertical-align:middle;}
    table.items tbody td.num{color:var(--muted);font-size:10px;text-align:center;width:26px;}
    table.items tfoot tr{background:#eef3fb;border-top:2px solid var(--primary);}
    table.items tfoot td{padding:8px 10px;font-size:12px;font-weight:700;}
    .inv-bottom{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);}
    .inv-notes{padding:16px 36px;border-right:1px solid var(--border);}
    .note-box{background:var(--light);border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;}
    .inv-totals{padding:16px 36px;display:flex;flex-direction:column;justify-content:center;}
    .totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid var(--border);}
    .totals-row:last-child{border-bottom:none;}
    .totals-row .tl{color:var(--muted);}
    .totals-row .tv{font-weight:600;}
    .totals-row.grand{border-top:2px solid var(--primary);padding-top:10px;}
    .totals-row.grand .tl{font-size:14px;font-weight:700;color:var(--primary);}
    .totals-row.grand .tv{font-size:20px;font-weight:800;color:var(--accent2);}
    .inv-payment{background:#f7faff;padding:14px 36px;border-bottom:1px solid var(--border);display:flex;gap:24px;flex-wrap:wrap;}
    .pay-item{display:flex;flex-direction:column;flex:1;min-width:120px;}
    .pay-item .pl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;}
    .pay-item .pv{font-size:12px;font-weight:700;color:var(--text);}
    .inv-footer{background:var(--primary);padding:8px 36px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}
    .footer-contact{color:rgba(255,255,255,.6);font-size:10px;line-height:1.6;}
    .footer-contact span{color:var(--accent);font-weight:600;}
    .footer-brand{text-align:right;}
    .footer-brand .fb-sub{color:rgba(255,255,255,.35);font-size:9px;}
    .footer-brand .fb-name{color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;}
    .footer-qr img{border-radius:5px;background:#fff;padding:2px;width:48px;height:48px;}
    .footer-qr .qr-label{color:rgba(255,255,255,.4);font-size:8px;text-align:center;margin-top:3px;}
    .action-bar{max-width:860px;margin:16px auto 0;display:flex;gap:10px;justify-content:flex-end;}
    .btn{padding:10px 22px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:7px;}
    .btn-outline{background:#fff;border:2px solid var(--border);color:var(--text);}
    .btn-primary{background:linear-gradient(135deg,#0d1b3e,#0077cc);color:#fff;box-shadow:0 4px 15px rgba(0,119,204,.35);}
  </style>
</head>
<body>
<div class="invoice-wrap">
  <div class="inv-header">
    <div class="logo-side">
      <img src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png" alt="Smart Pro" onerror="this.style.display='none'"/>
      <div class="tagline">ელექტროობა · უსაფრთხოება · ჭკვიანი სახლი</div>
    </div>
    <div class="title-side">
      <h1>ინვოისი</h1>
      <div class="inv-num">#${invoiceNumber}</div>
      <div class="inv-badge">გადასახდელი</div>
    </div>
  </div>
  <div class="inv-meta">
    <div class="meta-item"><div class="ml">ინვოისის №</div><div class="mv">${invoiceNumber}</div></div>
    <div class="meta-item"><div class="ml">გამოწერის თარიღი</div><div class="mv">${issueDate}</div></div>
    <div class="meta-item"><div class="ml">გადახდის ვადა</div><div class="mv">${dueDate}</div></div>
    <div class="meta-item"><div class="ml">ვალუტა</div><div class="mv">₾ ლარი (GEL)</div></div>
  </div>
  <div class="inv-parties">
    <div class="party-block">
      <div class="pb-title">გამყიდველი</div>
      <table>
        <tr><td>კომპანია</td><td class="val bold">Smart Pro Georgia</td></tr>
        <tr><td>საიდ. კოდი</td><td class="val">402336307</td></tr>
        <tr><td>მისამართი</td><td class="val">კოსმონავტების სან. N91, სართ. N8, თბილისი</td></tr>
        <tr><td>ტელეფონი</td><td class="val">+995 505 55 65 65</td></tr>
        <tr><td>ელ. ფოსტა</td><td class="val">gj.jikia@smartpro.ge</td></tr>
      </table>
    </div>
    <div class="party-block">
      <div class="pb-title">მყიდველი</div>
      <table>
        <tr><td>კომპანია / პირი</td><td class="val bold">${escHtml(client.name || '')}</td></tr>
        <tr><td>საიდ. / პირ. კოდი</td><td class="val">${escHtml(client.pid || '—')}</td></tr>
        <tr><td>მისამართი</td><td class="val">${escHtml(client.addr || '—')}</td></tr>
        <tr><td>ტელეფონი</td><td class="val">${escHtml(client.phone || '—')}</td></tr>
        <tr><td>ელ. ფოსტა</td><td class="val">${escHtml(client.email || '—')}</td></tr>
      </table>
    </div>
  </div>
  <div class="inv-table-wrap">
    <div class="section-title">სერვისები / პროდუქტები</div>
    <table class="items">
      <thead>
        <tr>
          <th style="width:26px;text-align:center">#</th>
          <th>დასახელება</th>
          <th style="width:60px;text-align:right">რაოდ.</th>
          <th style="width:60px">ერთ.</th>
          <th style="width:90px;text-align:right">ფასი</th>
          <th style="width:50px;text-align:center">დღგ</th>
          <th style="width:90px;text-align:right">ჯამი ₾</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="5"></td>
          <td style="text-align:right;color:#6b7a99;font-size:11px">სულ</td>
          <td style="text-align:right;color:#0077cc;font-size:14px;font-weight:700">₾ ${totals.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="inv-bottom">
    <div class="inv-notes">
      <div class="section-title">შენიშვნები</div>
      <div class="note-box">${escHtml(notes || '—')}</div>
    </div>
    <div class="inv-totals">
      <div class="totals-row"><span class="tl">ქვეჯამი (დღგ-ს გარეშე)</span><span class="tv">₾ ${totals.subtotal.toFixed(2)}</span></div>
      <div class="totals-row"><span class="tl">დღგ ჯამი</span><span class="tv">₾ ${totals.vatAmount.toFixed(2)}</span></div>
      <div class="totals-row"><span class="tl">ფასდაკლება</span><span class="tv">₾ ${Number(discount).toFixed(2)}</span></div>
      <div class="totals-row grand"><span class="tl">სულ გადასახდელი</span><span class="tv">₾ ${totals.total.toFixed(2)}</span></div>
    </div>
  </div>
  <div class="inv-payment">
    <div class="pay-item"><div class="pl">ბანკი</div><div class="pv">საქართველოს ბანკი</div></div>
    <div class="pay-item"><div class="pl">IBAN</div><div class="pv">GE19BG0000000606381321</div></div>
    <div class="pay-item"><div class="pl">დანიშნულება</div><div class="pv">ინვოისი #${invoiceNumber}</div></div>
  </div>
  <div class="inv-footer">
    <div class="footer-contact"><span>+995 505 55 65 65</span> · gj.jikia@smartpro.ge · www.smartpro.ge</div>
    <div class="footer-qr"><img id="qr-fb" src="" alt="QR"/><div class="qr-label">Facebook · SmartPro</div></div>
    <div class="footer-brand"><div class="fb-sub">გმადლობთ ნდობისთვის!</div><div class="fb-name">SMART PRO</div></div>
  </div>
</div>
<div class="action-bar no-print">
  <button class="btn btn-outline" onclick="window.close()">✕ დახურვა</button>
  <button class="btn btn-primary" onclick="window.print()">🖨️ დაბეჭდვა / PDF</button>
</div>
<script>
window.onload=function(){
  var h=document.createElement('div');
  h.style.cssText='position:absolute;left:-9999px;top:-9999px;';
  document.body.appendChild(h);
  try{
    new QRCode(h,{text:'https://www.facebook.com/profile.php?id=61582332145766',width:128,height:128,colorDark:'#0d1b3e',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});
    setTimeout(function(){var c=h.querySelector('canvas');if(c)document.getElementById('qr-fb').src=c.toDataURL('image/png');if(document.body.contains(h))document.body.removeChild(h);},200);
  }catch(e){if(document.body.contains(h))document.body.removeChild(h);}
};
<\/script>
</body></html>`;
}

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
                placeholder="11 ციფრი" />
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

export default function InvoiceEditor({ invoice, prefillClientId, onClose, onSaved }) {
  const { db, user, saveDB, toast } = useApp();
  const wh = db?.wh || [];
  const [suggestions,   setSuggestions]   = useState([]);
  const [activeSugIdx,  setActiveSugIdx]  = useState(null);
  const sugRef = useRef(null);
  const isNew = !invoice?.id;
  const clients = db?.clients || [];

  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = (() => { const d = new Date(); d.setDate(d.getDate() + 5); return d.toISOString().slice(0, 10); })();

  const [clientId,       setClientId]       = useState(invoice?.clientId || prefillClientId || '');
  const [newClientDraft, setNewClientDraft] = useState({ name: '', pid: '', phone: '', addr: '', _active: false });
  const [issueDate,      setIssueDate]      = useState(invoice?.issueDate || today);
  const [dueDate,        setDueDate]        = useState(invoice?.dueDate   || dueDefault);
  const [discount,       setDiscount]       = useState(invoice?.discount  ?? 0);
  const [notes,          setNotes]          = useState(invoice?.notes     || 'ფასები ეროვნულ ვალუტაში (GEL)');
  const [items,          setItems]          = useState(
    invoice?.items?.length ? invoice.items : [emptyItem(), emptyItem(), emptyItem()]
  );

  const selectedClient = clients.find(c => c.id === clientId);
  const isCreatingNew  = !clientId && (newClientDraft._active || newClientDraft.name.trim());
  const displayClient  = isCreatingNew ? newClientDraft : (selectedClient || {});

  const totals = calcInvoiceTotals(items, discount);

  const updItem = (idx, key, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));
  const addRow    = () => setItems(prev => [...prev, emptyItem()]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  async function handleSave(openAfter = true) {
    let newDb = { ...db };
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

    const validItems = items.filter(i => i.name.trim());
    if (validItems.length === 0) { toast('მინიმუმ 1 პოზიცია საჭიროა'); return; }

    const finalClient = finalClientId
      ? (newDb.clients || []).find(c => c.id === finalClientId) || {}
      : isCreatingNew ? newClientDraft : {};

    const recalc = calcInvoiceTotals(validItems, discount);
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
      discount: Number(discount),
      notes,
      subtotal:  recalc.subtotal,
      vatAmount: recalc.vatAmount,
      total:     recalc.total,
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
    onSaved?.(invoiceData);

    if (openAfter) {
      const html = buildInvoiceHTML({
        client: invoiceData.clientSnapshot,
        items: validItems,
        invoiceNumber: invoiceData.number,
        issueDate, dueDate, discount, notes,
        totals: recalc,
      });
      const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
      win.document.write(html);
      win.document.close();
    }
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14, alignItems: 'start' }}>

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
                    <th style={{ width: 82 }}>ფასი (₾)</th>
                    <th style={{ width: 54 }}>დღგ</th>
                    <th style={{ width: 82 }}>ჯამი</th>
                    <th style={{ width: 26 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => {
                    const lineTotal = Number(item.qty) * Number(item.price);
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
                                      updItem(idx, 'name',  w.name || '');
                                      updItem(idx, 'unit',  w.unit || 'ცალი');
                                      updItem(idx, 'price', sellP);
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
                            value={item.price} onChange={e => updItem(idx, 'price', e.target.value)} />
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
                          <button className="btn btn-ghost btn-xs" onClick={() => removeRow(idx)}
                            style={{ color: 'var(--danger)' }}>✕</button>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">გამოწერის თარიღი</label>
            <input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">გადახდის ვადა</label>
            <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">ფასდაკლება (₾)</label>
            <input className="input" type="number" min="0" value={discount}
              onChange={e => setDiscount(e.target.value)} />
          </div>
          <div style={{
            background: 'var(--bg-muted)', borderRadius: 'var(--radius)',
            padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
          }}>
            {[
              { label: 'ქვეჯამი',    val: totals.subtotal.toFixed(2) },
              { label: 'დღგ ჯამი',   val: totals.vatAmount.toFixed(2) },
              { label: 'ფასდაკლება', val: `-${Number(discount).toFixed(2)}` },
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
          </div>
        </div>
      </div>
    </Modal>
  );
}
