'use client';

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getNextInvoiceNum() {
  const y = new Date().getFullYear();
  const k = 'sp_inv_' + y;
  const n = parseInt(localStorage.getItem(k) || '0', 10) + 1;
  localStorage.setItem(k, String(n));
  return `SP-${y}-${String(n).padStart(3, '0')}`;
}

function buildInvoiceHTML({ client, selectedItems, invoiceNumber, issueDate, dueDate }) {
  const today = issueDate || new Date().toISOString().slice(0, 10);
  const due = dueDate || (() => {
    const d = new Date(); d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
  })();

  const rows = selectedItems.map((item, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td>
        <div>${escHtml(item.itemName)}</div>
        ${item.notes ? `<div style="font-size:10px;color:#6b7a99;margin-top:2px">${escHtml(item.notes)}</div>` : ''}
      </td>
      <td style="text-align:right">${item.qty}</td>
      <td>ცალი</td>
      <td style="text-align:right">₾ ${Number(item.unitPrice).toFixed(2)}</td>
      <td style="text-align:right;font-weight:600">₾ ${Number(item.totalPrice).toFixed(2)}</td>
      <td></td>
      <td></td>
    </tr>
  `).join('');

  const grandTotal = selectedItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
  const vat = (grandTotal * 0.18 / 1.18).toFixed(2);

  return `<!DOCTYPE html>
<html lang="ka">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Smart Pro — ინვოისი ${invoiceNumber}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@300;400;500;600;700&display=swap');
    @page { size: A4; margin: 8mm 7mm; }
    * { margin:0; padding:0; box-sizing:border-box; }
    @media print {
      * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
      body { background: white; padding: 0; }
      .no-print { display: none !important; }
      .invoice-wrap { box-shadow: none; border-radius: 0; max-width: 100%; }
    }
    :root {
      --primary: #0d1b3e; --accent: #00aaff; --accent2: #0077cc;
      --light: #f4f7fc; --border: #dce4f0; --text: #1a2340; --muted: #6b7a99; --white: #ffffff;
    }
    body { font-family: 'Noto Sans Georgian', sans-serif; background: var(--light); color: var(--text); padding: 16px; font-size: 13px; }
    .invoice-wrap { max-width: 860px; margin: 0 auto; background: var(--white); border-radius: 14px; box-shadow: 0 8px 40px rgba(13,27,62,0.13); overflow: hidden; }
    .inv-header { background: linear-gradient(135deg, #0d1b3e 0%, #152d5e 60%, #0077cc 100%); padding: 26px 36px 22px; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
    .logo-side img { height: 48px; filter: brightness(0) invert(1); object-fit: contain; }
    .logo-side .tagline { color: rgba(255,255,255,0.5); font-size: 10px; margin-top: 5px; }
    .title-side { text-align: right; }
    .title-side h1 { font-size: 28px; font-weight: 700; color: #fff; letter-spacing: 1px; text-transform: uppercase; }
    .title-side .inv-num { color: var(--accent); font-size: 14px; font-weight: 600; margin-top: 3px; }
    .title-side .inv-badge { display: inline-block; margin-top: 8px; padding: 3px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(0,170,255,0.18); color: var(--accent); border: 1px solid rgba(0,170,255,0.35); }
    .inv-meta { background: #eef3fb; padding: 12px 36px; display: flex; gap: 0; border-bottom: 1px solid var(--border); }
    .meta-item { flex:1; border-right:1px solid var(--border); padding:0 16px 0 0; margin-right:16px; }
    .meta-item:last-child { border-right:none; margin-right:0; }
    .meta-item .ml { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px; }
    .meta-item .mv { font-size:13px; font-weight:700; color:var(--text); }
    .inv-parties { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--border); }
    .party-block { padding: 10px 36px; }
    .party-block:first-child { border-right: 1px solid var(--border); }
    .party-block .pb-title { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:var(--accent); font-weight:700; margin-bottom:6px; }
    .party-block table { width:100%; border-collapse:collapse; }
    .party-block table td { padding: 2px 0; font-size: 11.5px; vertical-align: top; }
    .party-block table td:first-child { color: var(--muted); width: 110px; font-size: 9.5px; padding-top: 2px; }
    .party-block table td.val { font-weight: 600; color: var(--text); }
    .party-block table td.val.bold { font-weight: 700; font-size: 13px; }
    .inv-table-wrap { padding: 18px 36px; border-bottom: 1px solid var(--border); }
    .section-title { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:var(--accent); font-weight:700; margin-bottom:10px; }
    table.items { width:100%; border-collapse:collapse; }
    table.items thead tr { background: var(--primary); color: #fff; }
    table.items thead th { padding:8px 10px; font-size:10px; font-weight:600; text-align:left; }
    table.items thead th.r { text-align:right; }
    table.items tbody tr { border-bottom: 1px solid var(--border); }
    table.items tbody tr:nth-child(even) { background: #f8faff; }
    table.items tbody td { padding:7px 10px; font-size:11.5px; vertical-align:middle; }
    table.items tbody td.r { text-align:right; }
    table.items tbody td.num { color:var(--muted); font-size:10px; text-align:center; width:26px; }
    table.items tfoot tr { background: #eef3fb; border-top: 2px solid var(--primary); }
    table.items tfoot td { padding:8px 10px; font-size:12px; font-weight:700; }
    .inv-bottom { display:grid; grid-template-columns:1fr 1fr; border-bottom:1px solid var(--border); }
    .inv-notes { padding:16px 36px; border-right:1px solid var(--border); }
    .note-box { background:var(--light); border-radius:8px; padding:10px 12px; font-size:12px; line-height:1.7; }
    .inv-totals { padding:16px 36px; display:flex; flex-direction:column; justify-content:center; }
    .totals-row { display:flex; justify-content:space-between; padding:5px 0; font-size:13px; border-bottom:1px solid var(--border); }
    .totals-row:last-child { border-bottom:none; }
    .totals-row .tl { color:var(--muted); }
    .totals-row .tv { font-weight:600; }
    .totals-row.grand { border-top: 2px solid var(--primary); padding-top:10px; }
    .totals-row.grand .tl { font-size:14px; font-weight:700; color:var(--primary); }
    .totals-row.grand .tv { font-size:20px; font-weight:800; color:var(--accent2); }
    .inv-payment { background:#f7faff; padding:14px 36px; border-bottom:1px solid var(--border); display:flex; gap:24px; flex-wrap:wrap; }
    .pay-item { display:flex; flex-direction:column; flex:1; min-width:120px; }
    .pay-item .pl { font-size:9px; color:var(--muted); text-transform:uppercase; letter-spacing:0.6px; margin-bottom:3px; }
    .pay-item .pv { font-size:12px; font-weight:700; color:var(--text); }
    .inv-footer { background:var(--primary); padding:8px 36px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:wrap; }
    .footer-contact { color:rgba(255,255,255,0.6); font-size:10px; line-height:1.6; }
    .footer-contact span { color:var(--accent); font-weight:600; }
    .footer-brand { text-align:right; }
    .footer-brand .fb-sub { color:rgba(255,255,255,0.35); font-size:9px; }
    .footer-brand .fb-name { color:#fff; font-size:12px; font-weight:800; letter-spacing:1px; }
    .footer-qr { text-align:center; }
    .footer-qr img { border-radius:5px; background:#fff; padding:2px; width:48px; height:48px; }
    .footer-qr .qr-label { color:rgba(255,255,255,0.4); font-size:8px; margin-top:3px; }
    .action-bar { max-width:860px; margin:16px auto 0; display:flex; gap:10px; justify-content:flex-end; }
    .btn { padding:10px 22px; border-radius:8px; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; border:none; display:inline-flex; align-items:center; gap:7px; transition:all 0.2s; }
    .btn-outline { background:#fff; border:2px solid var(--border); color:var(--text); }
    .btn-outline:hover { border-color:var(--accent); color:var(--accent); }
    .btn-primary { background:linear-gradient(135deg,#0d1b3e,#0077cc); color:#fff; box-shadow:0 4px 15px rgba(0,119,204,0.35); }
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
    <div class="meta-item"><div class="ml">გამოწერის თარიღი</div><div class="mv">${today}</div></div>
    <div class="meta-item"><div class="ml">გადახდის ვადა</div><div class="mv">${due}</div></div>
    <div class="meta-item"><div class="ml">ვალუტა</div><div class="mv">₾ ლარი (GEL)</div></div>
  </div>

  <div class="inv-parties">
    <div class="party-block">
      <div class="pb-title">გამყიდველი / სერვისის მიმწოდებელი</div>
      <table>
        <tr><td>კომპანია</td><td class="val bold">Smart Pro Georgia</td></tr>
        <tr><td>საიდ. კოდი</td><td class="val">402336307</td></tr>
        <tr><td>მისამართი</td><td class="val">კოსმონავტების სან. N91, სართ. N8, ბ. N58, III ბლ.</td></tr>
        <tr><td></td><td class="val">თბილისი, საქართველო</td></tr>
        <tr><td>ტელეფონი</td><td class="val">+995 505 55 65 65</td></tr>
        <tr><td>ელ. ფოსტა</td><td class="val">gj.jikia@smartpro.ge</td></tr>
        <tr><td>ვებ-საიტი</td><td class="val">www.smartpro.ge</td></tr>
      </table>
    </div>
    <div class="party-block">
      <div class="pb-title">მყიდველი / მომხმარებელი</div>
      <table>
        <tr><td>კომპანია / პირი</td><td class="val bold">${escHtml(client.name)}</td></tr>
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
          <td style="text-align:right;color:var(--muted);font-weight:600;font-size:11px">სულ გადასახდელი</td>
          <td style="text-align:right;color:var(--accent2);font-size:14px;font-weight:700">₾ ${grandTotal.toFixed(2)}</td>
          <td></td><td></td>
        </tr>
      </tfoot>
    </table>
  </div>

  <div class="inv-bottom">
    <div class="inv-notes">
      <div class="section-title">შენიშვნები</div>
      <div class="note-box">ფასები მოიცავს დღგ-ს (18%)</div>
    </div>
    <div class="inv-totals">
      <div class="totals-row"><span class="tl">დღგ (18%)</span><span class="tv">₾ ${vat}</span></div>
      <div class="totals-row"><span class="tl">ფასდაკლება</span><span class="tv">₾ 0.00</span></div>
      <div class="totals-row grand">
        <span class="tl">სულ გადასახდელი</span>
        <span class="tv">₾ ${grandTotal.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="inv-payment">
    <div class="pay-item"><div class="pl">ბანკი</div><div class="pv">საქართველოს ბანკი</div></div>
    <div class="pay-item"><div class="pl">ანგარიშის ნომერი (IBAN)</div><div class="pv">GE19BG0000000606381321</div></div>
    <div class="pay-item"><div class="pl">ვალუტა</div><div class="pv">GEL</div></div>
    <div class="pay-item"><div class="pl">დანიშნულება</div><div class="pv">ინვოისი #${invoiceNumber}</div></div>
  </div>

  <div class="inv-footer">
    <div class="footer-contact">
      <span>+995 505 55 65 65</span> &nbsp;·&nbsp; gj.jikia@smartpro.ge &nbsp;·&nbsp; www.smartpro.ge
    </div>
    <div class="footer-qr">
      <img id="qr-fb" src="" alt="QR" style="width:48px;height:48px"/>
      <div class="qr-label">Facebook · SmartPro</div>
    </div>
    <div class="footer-brand">
      <div class="fb-sub">გმადლობთ ნდობისთვის!</div>
      <div class="fb-name">SMART PRO</div>
      <div class="fb-sub">ინტელექტუალური ინჟინერია</div>
    </div>
  </div>
</div>

<div class="action-bar no-print">
  <button class="btn btn-outline" onclick="window.close()">✕ დახურვა</button>
  <button class="btn btn-primary" onclick="window.print()">🖨️ დაბეჭდვა / PDF</button>
</div>

<script>
  window.onload = () => {
    const holder = document.createElement('div');
    holder.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
    document.body.appendChild(holder);
    try {
      new QRCode(holder, {
        text: 'https://www.facebook.com/profile.php?id=61582332145766',
        width: 128, height: 128,
        colorDark: '#0d1b3e', colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
      setTimeout(() => {
        const canvas = holder.querySelector('canvas');
        if (canvas) document.getElementById('qr-fb').src = canvas.toDataURL('image/png');
        document.body.removeChild(holder);
      }, 300);
    } catch(e) { try { document.body.removeChild(holder); } catch(_) {} }
  };
<\/script>
</body>
</html>`;
}

export default function InvoiceGenerator({ client, selectedItems }) {
  function openInvoice() {
    if (!selectedItems || selectedItems.length === 0) return;
    const invoiceNumber = getNextInvoiceNum();
    const html = buildInvoiceHTML({ client, selectedItems, invoiceNumber });
    const win = window.open('', '_blank', 'width=950,height=860,scrollbars=yes');
    if (!win) return alert('Popup blocked — გთხოვ, dაუშვი popups ამ საიტისთვის');
    win.document.write(html);
    win.document.close();
  }

  return (
    <button
      className="btn btn-primary btn-sm"
      onClick={openInvoice}
      disabled={!selectedItems || selectedItems.length === 0}
      style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: (!selectedItems || selectedItems.length === 0) ? 0.5 : 1 }}
    >
      🧾 ინვოისი ({selectedItems?.length || 0} პოზ.)
    </button>
  );
}
