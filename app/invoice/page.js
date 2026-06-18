'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import { useApp } from '@/context/AppContext';
import { fd } from '@/lib/utils';
import InvoiceEditor from '@/components/Invoice/InvoiceEditor';

function reopenPrint(inv) {
  const escHtml = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const rows = (inv.items || []).map((item, i) => {
    const lineTotal = Number(item.qty) * Number(item.price);
    const lineVat = item.vatEnabled ? lineTotal * (Number(item.vatRate ?? 18) / 100) : 0;
    return `<tr><td style="text-align:center;color:#6b7a99;font-size:10px">${i+1}</td><td>${escHtml(item.name)}</td><td style="text-align:right">${item.qty}</td><td>${escHtml(item.unit)}</td><td style="text-align:right">₾ ${Number(item.price).toFixed(2)}</td><td style="text-align:center">${item.vatEnabled ? `${item.vatRate ?? 18}%` : '—'}</td><td style="text-align:right;font-weight:600">₾ ${(lineTotal+lineVat).toFixed(2)}</td></tr>`;
  }).join('');
  const html = `<!DOCTYPE html><html lang="ka"><head><meta charset="UTF-8"/><title>Smart Pro — ინვოისი ${inv.number}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><style>@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700&display=swap');@page{size:A4;margin:8mm 7mm;}*{margin:0;padding:0;box-sizing:border-box;}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{background:#fff;padding:0;}.no-print{display:none!important;}.invoice-wrap{box-shadow:none;border-radius:0;max-width:100%;}}:root{--primary:#0d1b3e;--accent:#00aaff;--accent2:#0077cc;--light:#f4f7fc;--border:#dce4f0;--text:#1a2340;--muted:#6b7a99;}body{font-family:'Noto Sans Georgian',sans-serif;background:var(--light);color:var(--text);padding:16px;font-size:13px;}.invoice-wrap{max-width:860px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(13,27,62,.13);overflow:hidden;}.inv-header{background:linear-gradient(135deg,#0d1b3e 0%,#152d5e 60%,#0077cc 100%);padding:26px 36px 22px;display:flex;justify-content:space-between;align-items:flex-start;}.logo-side img{height:48px;filter:brightness(0) invert(1);}.logo-side .tagline{color:rgba(255,255,255,.5);font-size:10px;margin-top:5px;}.title-side{text-align:right;}.title-side h1{font-size:28px;font-weight:700;color:#fff;letter-spacing:1px;text-transform:uppercase;}.title-side .inv-num{color:var(--accent);font-size:14px;font-weight:600;margin-top:3px;}.title-side .inv-badge{display:inline-block;margin-top:8px;padding:3px 14px;border-radius:20px;font-size:11px;font-weight:700;background:rgba(0,170,255,.18);color:var(--accent);border:1px solid rgba(0,170,255,.35);}.inv-meta{background:#eef3fb;padding:12px 36px;display:flex;border-bottom:1px solid var(--border);}.meta-item{flex:1;border-right:1px solid var(--border);padding:0 16px 0 0;margin-right:16px;}.meta-item:last-child{border-right:none;margin-right:0;}.meta-item .ml{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px;}.meta-item .mv{font-size:13px;font-weight:700;color:var(--text);}.inv-parties{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);}.party-block{padding:10px 36px;}.party-block:first-child{border-right:1px solid var(--border);}.party-block .pb-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:700;margin-bottom:6px;}.party-block table{width:100%;border-collapse:collapse;}.party-block table td{padding:2px 0;font-size:11.5px;vertical-align:top;}.party-block table td:first-child{color:var(--muted);width:110px;font-size:9.5px;padding-top:2px;}.party-block table td.val{font-weight:600;color:var(--text);}.party-block table td.val.bold{font-weight:700;font-size:13px;}.inv-table-wrap{padding:18px 36px;border-bottom:1px solid var(--border);}.section-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:700;margin-bottom:10px;}table.items{width:100%;border-collapse:collapse;}table.items thead tr{background:var(--primary);color:#fff;}table.items thead th{padding:8px 10px;font-size:10px;font-weight:600;text-align:left;}table.items tbody tr{border-bottom:1px solid var(--border);}table.items tbody tr:nth-child(even){background:#f8faff;}table.items tbody td{padding:7px 10px;font-size:11.5px;vertical-align:middle;}table.items tfoot tr{background:#eef3fb;border-top:2px solid var(--primary);}table.items tfoot td{padding:8px 10px;font-size:12px;font-weight:700;}.inv-bottom{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--border);}.inv-notes{padding:16px 36px;border-right:1px solid var(--border);}.note-box{background:var(--light);border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;}.inv-totals{padding:16px 36px;display:flex;flex-direction:column;justify-content:center;}.totals-row{display:flex;justify-content:space-between;padding:5px 0;font-size:13px;border-bottom:1px solid var(--border);}.totals-row:last-child{border-bottom:none;}.totals-row .tl{color:var(--muted);}.totals-row .tv{font-weight:600;}.totals-row.grand{border-top:2px solid var(--primary);padding-top:10px;}.totals-row.grand .tl{font-size:14px;font-weight:700;color:var(--primary);}.totals-row.grand .tv{font-size:20px;font-weight:800;color:var(--accent2);}.inv-payment{background:#f7faff;padding:14px 36px;border-bottom:1px solid var(--border);display:flex;gap:24px;flex-wrap:wrap;}.pay-item{display:flex;flex-direction:column;flex:1;min-width:120px;}.pay-item .pl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;}.pay-item .pv{font-size:12px;font-weight:700;color:var(--text);}.inv-footer{background:var(--primary);padding:8px 36px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;}.footer-contact{color:rgba(255,255,255,.6);font-size:10px;line-height:1.6;}.footer-contact span{color:var(--accent);font-weight:600;}.footer-brand{text-align:right;}.footer-brand .fb-sub{color:rgba(255,255,255,.35);font-size:9px;}.footer-brand .fb-name{color:#fff;font-size:12px;font-weight:800;letter-spacing:1px;}.footer-qr img{border-radius:5px;background:#fff;padding:2px;width:48px;height:48px;}.footer-qr .qr-label{color:rgba(255,255,255,.4);font-size:8px;text-align:center;margin-top:3px;}.action-bar{max-width:860px;margin:16px auto 0;display:flex;gap:10px;justify-content:flex-end;}.btn{padding:10px 22px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:none;display:inline-flex;align-items:center;gap:7px;}.btn-outline{background:#fff;border:2px solid var(--border);color:var(--text);}.btn-primary{background:linear-gradient(135deg,#0d1b3e,#0077cc);color:#fff;}</style></head><body><div class="invoice-wrap"><div class="inv-header"><div class="logo-side"><img src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png" alt="Smart Pro" onerror="this.style.display='none'"/><div class="tagline">ელექტროობა · უსაფრთხოება · ჭკვიანი სახლი</div></div><div class="title-side"><h1>ინვოისი</h1><div class="inv-num">#${inv.number}</div><div class="inv-badge">გადასახდელი</div></div></div><div class="inv-meta"><div class="meta-item"><div class="ml">ინვოისის №</div><div class="mv">${inv.number}</div></div><div class="meta-item"><div class="ml">გამოწერის თარიღი</div><div class="mv">${inv.issueDate}</div></div><div class="meta-item"><div class="ml">გადახდის ვადა</div><div class="mv">${inv.dueDate}</div></div><div class="meta-item"><div class="ml">ვალუტა</div><div class="mv">₾ ლარი (GEL)</div></div></div><div class="inv-parties"><div class="party-block"><div class="pb-title">გამყიდველი</div><table><tr><td>კომპანია</td><td class="val bold">Smart Pro Georgia</td></tr><tr><td>საიდ. კოდი</td><td class="val">402336307</td></tr><tr><td>ტელეფონი</td><td class="val">+995 505 55 65 65</td></tr><tr><td>ელ. ფოსტა</td><td class="val">gj.jikia@smartpro.ge</td></tr></table></div><div class="party-block"><div class="pb-title">მყიდველი</div><table><tr><td>კომპანია / პირი</td><td class="val bold">${escHtml(inv.clientSnapshot?.name)}</td></tr><tr><td>საიდ. / პირ. კოდი</td><td class="val">${escHtml(inv.clientSnapshot?.pid || '—')}</td></tr><tr><td>მისამართი</td><td class="val">${escHtml(inv.clientSnapshot?.addr || '—')}</td></tr><tr><td>ტელეფონი</td><td class="val">${escHtml(inv.clientSnapshot?.phone || '—')}</td></tr></table></div></div><div class="inv-table-wrap"><div class="section-title">სერვისები / პროდუქტები</div><table class="items"><thead><tr><th style="width:26px">#</th><th>დასახელება</th><th style="width:60px;text-align:right">რაოდ.</th><th style="width:60px">ერთ.</th><th style="width:90px;text-align:right">ფასი</th><th style="width:50px;text-align:center">დღგ</th><th style="width:90px;text-align:right">ჯამი ₾</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="5"></td><td style="text-align:right;color:#6b7a99;font-size:11px">სულ</td><td style="text-align:right;color:#0077cc;font-size:14px;font-weight:700">₾ ${inv.total.toFixed(2)}</td></tr></tfoot></table></div><div class="inv-bottom"><div class="inv-notes"><div class="section-title">შენიშვნები</div><div class="note-box">${escHtml(inv.notes || '—')}</div></div><div class="inv-totals"><div class="totals-row"><span class="tl">ქვეჯამი</span><span class="tv">₾ ${inv.subtotal.toFixed(2)}</span></div><div class="totals-row"><span class="tl">დღგ ჯამი</span><span class="tv">₾ ${inv.vatAmount.toFixed(2)}</span></div><div class="totals-row"><span class="tl">ფასდაკლება</span><span class="tv">₾ ${inv.discount.toFixed(2)}</span></div><div class="totals-row grand"><span class="tl">სულ გადასახდელი</span><span class="tv">₾ ${inv.total.toFixed(2)}</span></div></div></div><div class="inv-payment"><div class="pay-item"><div class="pl">ბანკი</div><div class="pv">საქართველოს ბანკი</div></div><div class="pay-item"><div class="pl">IBAN</div><div class="pv">GE19BG0000000606381321</div></div><div class="pay-item"><div class="pl">დანიშნულება</div><div class="pv">ინვოისი #${inv.number}</div></div></div><div class="inv-footer"><div class="footer-contact"><span>+995 505 55 65 65</span> · gj.jikia@smartpro.ge · www.smartpro.ge</div><div class="footer-qr"><img id="qr-fb" src="" alt="QR"/><div class="qr-label">Facebook · SmartPro</div></div><div class="footer-brand"><div class="fb-sub">გმადლობთ ნდობისთვის!</div><div class="fb-name">SMART PRO</div></div></div></div><div class="action-bar no-print"><button class="btn btn-outline" onclick="window.close()">✕ დახურვა</button><button class="btn btn-primary" onclick="window.print()">🖨️ დაბეჭდვა / PDF</button></div><script>window.onload=function(){var h=document.createElement('div');h.style.cssText='position:absolute;left:-9999px;top:-9999px;';document.body.appendChild(h);try{new QRCode(h,{text:'https://www.facebook.com/profile.php?id=61582332145766',width:128,height:128,colorDark:'#0d1b3e',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M});setTimeout(function(){var c=h.querySelector('canvas');if(c)document.getElementById('qr-fb').src=c.toDataURL('image/png');if(document.body.contains(h))document.body.removeChild(h);},200);}catch(e){if(document.body.contains(h))document.body.removeChild(h);}}<\/script></body></html>`;
  const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
  win.document.write(html);
  win.document.close();
}

export default function InvoicePage() {
  const { db } = useApp();
  const [editorOpen,    setEditorOpen]    = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [search,        setSearch]        = useState('');

  const invoices = useMemo(() => {
    return [...(db?.invoices || [])]
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .filter(inv => {
        if (!search) return true;
        const q = search.toLowerCase();
        return inv.number.toLowerCase().includes(q) ||
          (inv.clientSnapshot?.name || '').toLowerCase().includes(q);
      });
  }, [db?.invoices, search]);

  const openNew  = () => { setEditingInvoice(null); setEditorOpen(true); };
  const openEdit = (inv) => { setEditingInvoice(inv); setEditorOpen(true); };

  const totalPaid   = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const totalUnpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

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
            { label: 'სულ ინვოისი',  val: invoices.length,            color: 'stat-blue',  icon: '🧾' },
            { label: 'გადახდილი',    val: `₾${totalPaid.toFixed(0)}`, color: 'stat-green', icon: '✅' },
            { label: 'გადასახდელი',  val: `₾${totalUnpaid.toFixed(0)}`, color: 'stat-red', icon: '⏳' },
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
                <th style={{ width: 90 }}>მოქმ.</th>
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
                    <span className={`badge b-${inv.status === 'paid' ? 'completed' : 'pending'}`}>
                      {inv.status === 'paid' ? '✅ გადახდილი' : '📤 გამოწერილი'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-xs" title="ბეჭდვა" onClick={() => reopenPrint(inv)}>🖨️</button>
                      <button className="btn btn-ghost btn-xs" title="რედაქტირება" onClick={() => openEdit(inv)}>✏️</button>
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
          onSaved={() => {}}
        />
      )}
    </AppShell>
  );
}
