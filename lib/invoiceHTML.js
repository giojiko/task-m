function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function buildInvoiceHTML({ client, items, invoiceNumber, issueDate, dueDate, discount, notes, totals, prepayPct }) {
  const validItems = items.filter(i => i.name && String(i.name).trim());
  // item-level discount totals
  const origItemsTotal = validItems.reduce((s, it) => {
    const lp = parseFloat(it.listPrice) || parseFloat(it.price) || 0;
    return s + lp * (Number(it.qty) || 0);
  }, 0);
  const saleItemsTotal = validItems.reduce((s, it) => {
    const lp = parseFloat(it.listPrice) || parseFloat(it.price) || 0;
    const sp = parseFloat(it.salePrice);
    const ld = parseFloat(it.itemDisc) || 0;
    const fp = (!isNaN(sp) && sp > 0 && sp < lp) ? sp : (ld > 0 ? lp * (1 - ld / 100) : lp);
    return s + fp * (Number(it.qty) || 0);
  }, 0);
  const itemDiscTotal = origItemsTotal - saleItemsTotal;
  const totalDiscount = itemDiscTotal + Number(discount);
  const rows = validItems.map((item, i) => {
    const lp = parseFloat(item.listPrice) || parseFloat(item.price) || 0;
    const sp = parseFloat(item.salePrice);
    const legacyDisc = parseFloat(item.itemDisc) || 0;
    const legacyPrice = legacyDisc > 0 ? lp * (1 - legacyDisc / 100) : lp;
    const finalPrice = (!isNaN(sp) && sp > 0 && sp < lp) ? sp : (legacyDisc > 0 ? legacyPrice : lp);
    const discLari = lp - finalPrice;
    const lineTotal = Number(item.qty) * finalPrice;
    const lineVat = item.vatEnabled ? lineTotal * (Number(item.vatRate ?? 18) / 100) : 0;
    const priceCell = (discLari > 0.001)
      ? `<div style="text-align:right"><span style="text-decoration:line-through;color:#9aa;font-size:10px">₾ ${lp.toFixed(2)}</span><br><span style="color:#1a6e3a;font-weight:700">₾ ${finalPrice.toFixed(2)}</span><br><span style="font-size:9px;background:#1a6e3a;color:#fff;padding:1px 5px;border-radius:4px">-₾${discLari.toFixed(2)}</span></div>`
      : `<span style="text-align:right;display:block">₾ ${finalPrice.toFixed(2)}</span>`;
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td>${escHtml(item.name)}</td>
        <td style="text-align:right">${item.qty}</td>
        <td>${escHtml(item.unit)}</td>
        <td>${priceCell}</td>
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
          <th style="width:110px;text-align:right">ფასი</th>
          <th style="width:100px;text-align:right">ჯამი ₾</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="4"></td>
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
      ${origItemsTotal > saleItemsTotal ? `
      <div class="totals-row"><span class="tl">საწყისი ფასი</span><span class="tv" style="text-decoration:line-through;color:#9aa">₾ ${origItemsTotal.toFixed(2)}</span></div>
      <div class="totals-row" style="color:#1a6e3a"><span class="tl" style="color:#1a6e3a;font-weight:600">ფასდაკლება პოზიციებზე</span><span class="tv" style="color:#1a6e3a;font-weight:700">-₾ ${itemDiscTotal.toFixed(2)}</span></div>
      ` : ''}
      <div class="totals-row"><span class="tl">ფასი${totals.vatAmount > 0 ? ' (დღგ-ს გარეშე)' : ''}</span><span class="tv">₾ ${totals.subtotal.toFixed(2)}</span></div>
      ${totals.vatAmount > 0 ? `<div class="totals-row"><span class="tl">დღგ</span><span class="tv">₾ ${totals.vatAmount.toFixed(2)}</span></div>` : ''}
      ${Number(discount) > 0 ? `<div class="totals-row"><span class="tl">დამატებითი ფასდაკლება</span><span class="tv" style="color:#1a6e3a">-₾ ${Number(discount).toFixed(2)}</span></div>` : ''}
      ${totalDiscount > 0.001 ? `<div class="totals-row" style="border-top:1px dashed #c3e6cb;padding-top:6px"><span class="tl" style="color:#1a6e3a;font-weight:600">სულ ფასდაკლება</span><span class="tv" style="color:#1a6e3a;font-weight:700">-₾ ${totalDiscount.toFixed(2)}</span></div>` : ''}
      ${Number(prepayPct) > 0
  ? `<div class="totals-row grand"><span class="tl">სრული თანხა</span><span class="tv" style="color:#6b7a99;font-size:15px">₾ ${totals.total.toFixed(2)}</span></div>
     <div class="totals-row" style="border-top:2px solid #0077cc;padding-top:8px"><span class="tl" style="color:#0077cc;font-weight:700">წინასწარი ჩარიცხვა (${prepayPct}%)</span><span class="tv" style="color:#0077cc">₾ ${(totals.total * Number(prepayPct) / 100).toFixed(2)}</span></div>
     <div class="totals-row" style="border-top:none;padding-top:4px"><span class="tl" style="color:#ef4444;font-weight:700;font-size:14px">გადასახდელია ახლა</span><span class="tv" style="color:#ef4444;font-size:20px;font-weight:800">₾ ${(totals.total * Number(prepayPct) / 100).toFixed(2)}</span></div>`
  : `<div class="totals-row grand"><span class="tl">სულ გადასახდელი</span><span class="tv">₾ ${totals.total.toFixed(2)}</span></div>`}
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
