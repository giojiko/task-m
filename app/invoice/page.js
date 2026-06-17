'use client';
import { useState } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getNextInvoiceNum() {
  if (typeof window === 'undefined') return 'SP-2026-001';
  const y = new Date().getFullYear();
  const k = 'sp_inv_' + y;
  let n = parseInt(localStorage.getItem(k) || '0', 10) + 1;
  localStorage.setItem(k, String(n));
  return `SP-${y}-${String(n).padStart(3, '0')}`;
}

function buildInvoiceHTML({ client, items, invoiceNumber, issueDate, dueDate, discount, vatRate, notes }) {
  const rows = items.filter(i => i.name.trim()).map((item, i) => {
    const total = (Number(item.qty) * Number(item.price)).toFixed(2);
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escHtml(item.name)}</td>
        <td style="text-align:right">${item.qty}</td>
        <td>${escHtml(item.unit)}</td>
        <td style="text-align:right">₾ ${Number(item.price).toFixed(2)}</td>
        <td style="text-align:right;font-weight:600">₾ ${total}</td>
        <td></td><td></td>
      </tr>`;
  }).join('');

  const subtotal   = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const vatAmt     = subtotal * (Number(vatRate) / 100);
  const grandTotal = Math.max(0, subtotal + vatAmt - Number(discount));

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8"/>
  <title>Smart Pro — ინვოისი ${invoiceNumber}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;600;700&display=swap');
    @page { size:A4; margin:8mm 7mm; }
    *{margin:0;padding:0;box-sizing:border-box;}
    @media print{
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      body{background:#fff;padding:0;}
      .no-print{display:none!important;}
      .invoice-wrap{box-shadow:none;border-radius:0;max-width:100%;}
    }
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
    .inv-meta{background:#eef3fb;padding:12px 36px;display:flex;gap:0;border-bottom:1px solid var(--border);}
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
    table.items thead th.r{text-align:right;}
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
    .btn{padding:10px 22px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:7px;transition:all .2s;}
    .btn-outline{background:#fff;border:2px solid var(--border);color:var(--text);}
    .btn-outline:hover{border-color:var(--accent);color:var(--accent);}
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
    <div class="party-block sender">
      <div class="pb-title">გამყიდველი</div>
      <table>
        <tr><td>კომპანია</td><td class="val bold">Smart Pro Georgia</td></tr>
        <tr><td>საიდ. კოდი</td><td class="val">402336307</td></tr>
        <tr><td>მისამართი</td><td class="val">კოსმონავტების სან. N91, სართ. N8</td></tr>
        <tr><td></td><td class="val">თბილისი, საქართველო</td></tr>
        <tr><td>ტელეფონი</td><td class="val">+995 505 55 65 65</td></tr>
        <tr><td>ელ. ფოსტა</td><td class="val">gj.jikia@smartpro.ge</td></tr>
        <tr><td>ვებ-საიტი</td><td class="val">www.smartpro.ge</td></tr>
      </table>
    </div>
    <div class="party-block">
      <div class="pb-title">მყიდველი</div>
      <table>
        <tr><td>კომპანია / პირი</td><td class="val bold">${escHtml(client.name || '')}</td></tr>
        <tr><td>საიდ. / პირ. კოდი</td><td class="val">${escHtml(client.pid || '—')}</td></tr>
        <tr><td>მისამართი</td><td class="val">${escHtml(client.address || client.addr || '—')}</td></tr>
        <tr><td>ტელეფონი</td><td class="val">${escHtml(client.phone || client.mobile || '—')}</td></tr>
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
          <th class="r" style="width:60px">რაოდ.</th>
          <th style="width:60px">ერთ.</th>
          <th class="r" style="width:90px">ერთ. ფასი</th>
          <th class="r" style="width:90px">ჯამი ₾</th>
          <th style="width:28px"></th>
          <th style="width:28px"></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"></td>
          <td style="text-align:right;color:#6b7a99;font-weight:600;font-size:11px">სულ გადასახდელი</td>
          <td style="text-align:right;color:#0077cc;font-size:14px;font-weight:700">₾ ${grandTotal.toFixed(2)}</td>
          <td></td><td></td>
        </tr>
      </tfoot>
    </table>
  </div>
  <div class="inv-bottom">
    <div class="inv-notes">
      <div class="section-title">შენიშვნები</div>
      <div class="note-box">${escHtml(notes || 'ფასები მოიცავს დღგ-ს (18%)')}</div>
    </div>
    <div class="inv-totals">
      <div class="totals-row"><span class="tl">ქვეჯამი</span><span class="tv">₾ ${subtotal.toFixed(2)}</span></div>
      <div class="totals-row"><span class="tl">დღგ (${vatRate}%)</span><span class="tv">₾ ${vatAmt.toFixed(2)}</span></div>
      <div class="totals-row"><span class="tl">ფასდაკლება</span><span class="tv">₾ ${Number(discount).toFixed(2)}</span></div>
      <div class="totals-row grand"><span class="tl">სულ გადასახდელი</span><span class="tv">₾ ${grandTotal.toFixed(2)}</span></div>
    </div>
  </div>
  <div class="inv-payment">
    <div class="pay-item"><div class="pl">ბანკი</div><div class="pv">საქართველოს ბანკი</div></div>
    <div class="pay-item"><div class="pl">IBAN</div><div class="pv">GE19BG0000000606381321</div></div>
    <div class="pay-item"><div class="pl">ვალუტა</div><div class="pv">GEL</div></div>
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
    setTimeout(function(){var c=h.querySelector('canvas');if(c)document.getElementById('qr-fb').src=c.toDataURL('image/png');document.body.removeChild(h);},200);
  }catch(e){if(document.body.contains(h))document.body.removeChild(h);}
};
<\/script>
</body></html>`;
}

const UNITS = ['ცალი','კომპლ.','მეტრი','მ²','საათი','მომსახ.','კგ'];
const emptyItem = () => ({ name: '', qty: 1, unit: 'ცალი', price: 0 });

export default function InvoicePage() {
  const { db, t } = useApp();
  const clients = db?.clients || [];

  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  })();

  const [clientId,  setClientId]  = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate,   setDueDate]   = useState(dueDefault);
  const [vatRate,   setVatRate]   = useState(18);
  const [discount,  setDiscount]  = useState(0);
  const [notes,     setNotes]     = useState('ფასები მოიცავს დღგ-ს (18%)');
  const [items,     setItems]     = useState([emptyItem(), emptyItem(), emptyItem()]);

  const client = clients.find(c => c.id === clientId) || {};

  const subtotal   = items.reduce((s, i) => s + Number(i.qty) * Number(i.price), 0);
  const vatAmt     = subtotal * (vatRate / 100);
  const grandTotal = Math.max(0, subtotal + vatAmt - Number(discount));

  const updItem = (idx, key, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val } : it));

  const addRow    = () => setItems(prev => [...prev, emptyItem()]);
  const removeRow = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const openInvoice = () => {
    const num = getNextInvoiceNum();
    const html = buildInvoiceHTML({ client, items, invoiceNumber: num, issueDate, dueDate, discount, vatRate, notes });
    const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
    win.document.write(html);
    win.document.close();
  };

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">🧾 {t('invoice')}</div>
          <div className="page-subtitle">ინვოისის გენერატორი</div>
        </div>
        <button className="btn btn-primary" onClick={openInvoice}>
          🖨️ გახსნა / ბეჭდვა
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── მარცხენა ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* მყიდველი */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">👤 მყიდველი</span>
            </div>
            <div className="card-body">
              <div className="fg">
                <label>კლიენტი სიიდან (სურვ.)</label>
                <select className="select" value={clientId} onChange={e => setClientId(e.target.value)}>
                  <option value="">— ხელით შევსება —</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {clientId && client.name && (
                <div style={{
                  background: 'rgba(27,234,205,0.06)',
                  border: '1px solid rgba(27,234,205,0.2)',
                  borderRadius: 'var(--radius)',
                  padding: '10px 14px',
                  fontSize: 12,
                  display: 'flex', flexDirection: 'column', gap: 4,
                  marginTop: 4,
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{client.name}</div>
                  {(client.phone || client.mobile) && (
                    <div style={{ color: 'var(--text-secondary)' }}>📱 {client.phone || client.mobile}</div>
                  )}
                  {client.email && <div style={{ color: 'var(--text-secondary)' }}>✉️ {client.email}</div>}
                  {(client.address || client.addr) && (
                    <div style={{ color: 'var(--text-secondary)' }}>📍 {client.address || client.addr}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* პოზიციები */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📦 პოზიციები</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} სტრ.</span>
            </div>
            <div style={{ padding: 0 }}>
              <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 30, textAlign: 'center' }}>#</th>
                      <th>დასახელება</th>
                      <th style={{ width: 70 }}>რაოდ.</th>
                      <th style={{ width: 90 }}>ერთ.</th>
                      <th style={{ width: 100 }}>ფასი ₾</th>
                      <th style={{ width: 100, textAlign: 'right' }}>ჯამი</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11, textAlign: 'center' }}>
                          {idx + 1}
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: 12 }}
                            value={item.name}
                            onChange={e => updItem(idx, 'name', e.target.value)}
                            placeholder="პროდუქტი / სერვისი"
                          />
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', textAlign: 'right', fontSize: 12 }}
                            type="number" min="0" step="0.01"
                            value={item.qty}
                            onChange={e => updItem(idx, 'qty', e.target.value)}
                          />
                        </td>
                        <td>
                          <select
                            className="select"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', fontSize: 12 }}
                            value={item.unit}
                            onChange={e => updItem(idx, 'unit', e.target.value)}
                          >
                            {UNITS.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td>
                          <input
                            className="input"
                            style={{ border: 'none', background: 'transparent', padding: '4px 0', textAlign: 'right', fontSize: 12 }}
                            type="number" min="0" step="0.01"
                            value={item.price}
                            onChange={e => updItem(idx, 'price', e.target.value)}
                          />
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)', textAlign: 'right', fontSize: 13 }}>
                          ₾{(Number(item.qty) * Number(item.price)).toFixed(2)}
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-xs"
                            onClick={() => removeRow(idx)}
                            style={{ color: 'var(--danger)' }}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ padding: '12px 16px' }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={addRow}
                  style={{ border: '1.5px dashed var(--border)', width: '100%', justifyContent: 'center' }}
                >
                  + სტრიქონის დამატება
                </button>
              </div>
            </div>
          </div>

          {/* შენიშვნები */}
          <div className="card">
            <div className="card-header"><span className="card-title">📝 შენიშვნები</span></div>
            <div className="card-body">
              <textarea
                className="textarea"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="გადახდის პირობები, გარანტია..."
              />
            </div>
          </div>
        </div>

        {/* ── მარჯვენა ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* თარიღები */}
          <div className="card">
            <div className="card-header"><span className="card-title">📅 თარიღები</span></div>
            <div className="card-body">
              <div className="fg">
                <label>გამოწერის თარიღი</label>
                <input className="input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
              </div>
              <div className="fg">
                <label>გადახდის ვადა</label>
                <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
            </div>
          </div>

          {/* ჯამი */}
          <div className="card">
            <div className="card-header"><span className="card-title">💰 ჯამი</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between',
                padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>ქვეჯამი</span>
                <span style={{ fontWeight: 600 }}>₾{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  დღგ (
                  <input
                    type="number" min="0" max="100"
                    value={vatRate}
                    onChange={e => setVatRate(Number(e.target.value))}
                    style={{ width: 36, background: 'transparent', border: 'none',
                      borderBottom: '1px dashed var(--border)', color: 'var(--text-primary)',
                      fontWeight: 600, fontSize: 13, textAlign: 'center', outline: 'none' }}
                  />%)
                </span>
                <span style={{ fontWeight: 600 }}>₾{vatAmt.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-secondary)' }}>ფასდაკლება</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input
                    type="number" min="0"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                    style={{ width: 60, background: 'transparent', border: 'none',
                      borderBottom: '1px dashed var(--border)', color: 'var(--text-primary)',
                      fontWeight: 600, fontSize: 13, textAlign: 'right', outline: 'none' }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>₾</span>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0 4px', fontSize: 15 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>სულ</span>
                <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--success)' }}>
                  ₾{grandTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 44, fontSize: 14 }}
            onClick={openInvoice}
          >
            🖨️ ინვოისის გახსნა / PDF
          </button>

          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6 }}>
            ახალ ფანჯარაში გაიხსნება.<br/>
            ბრაუზერი → Print → Save as PDF
          </div>
        </div>
      </div>
    </AppShell>
  );
}
