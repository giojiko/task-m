'use client';
import { useState, useMemo } from 'react';
import AppShell from '@/components/Layout/AppShell';
import Modal from '@/components/UI/Modal';
import { useApp } from '@/context/AppContext';
import { uid } from '@/lib/utils';

const CATALOG = {
  electro_labor: {
    label: '⚡ ელექტრო გაყვანილობა — ხელობა',
    color: '#E5D936', isLabor: true,
    items: [
      { name: '1 წერტილი დაკაბელება / კოლოფი', note: 'კაბელის გაყვანა, გოფრა, კოლოფის ჩასმა', min: 15, max: 30 },
      { name: '1 წერტილი დაერთება', note: 'შემოწმება, დაერთება, მორგება', min: 30, max: 50 },
      { name: 'გამანაწილებელი კოლოფი', note: 'კედელში ან ჭერზე ჩაშენება ან ზედაპირული', min: 35, max: 60 },
      { name: 'ელექტრო ფარის მონტაჟი', note: 'დამოკიდებულია ფარის ზომაზე და კედლზე', min: 50, max: 200 },
      { name: 'ელექტრო ფარის აწყობა', note: 'დამოკიდებულია ავტომატების რაოდენობაზე', min: 150, max: 600 },
      { name: 'ჭაღის მონტაჟი', note: 'ჭერის ტიპისა და წონის მიხედვით', min: 35, max: 100 },
      { name: 'სპოტი / ჩასაშენებელი სანათი', note: 'თითო ცალი', min: 15, max: 30 },
      { name: 'კედლის სანათი', note: 'თითო ცალი', min: 25, max: 50 },
      { name: 'LED ლენტის მონტაჟი', note: 'ლენტა, პროფილი, დრაივერი ცალკე', min: 15, max: 35, unit: 'მ' },
      { name: 'LED პროფილის მონტაჟი', note: 'ჭერის სირთულე გავლენას ახდენს', min: 20, max: 75, unit: 'მ' },
      { name: 'პროჟექტორი / გარე სანათი', note: 'სიმაღლეზე მუშაობა ცალკე', min: 50, max: 120 },
      { name: 'დამიწების კონტურის მოწყობა', note: 'მიწის პირობების მიხედვით', min: 100, max: 900 },
      { name: 'ელ/ავტომობილის დამტენის წერტილი', note: 'სიმძლავრე, კაბელი, ფარი ცალკე', min: 250, max: 700 },
    ],
  },
  network_labor: {
    label: '🌐 ქსელი და Wi-Fi — ხელობა',
    color: '#1BEACD', isLabor: true,
    items: [
      { name: 'RJ45 ქსელური წერტილი', note: 'ბუდე, კისტონი, პაჩ-პანელი ცალკე', min: 25, max: 50 },
      { name: 'ქსელური კაბელის ტერმინაცია', note: 'თითო ბოლო', min: 10, max: 20 },
      { name: 'Wi-Fi როუტერის მონტაჟი და გამართვა', note: 'კონფიგურაციის სირთულით', min: 50, max: 120 },
      { name: 'Access Point-ის მონტაჟი', note: 'PoE, ჭერის სამაგრი და ტესტირება', min: 90, max: 200 },
      { name: 'ქსელური სვიჩის დაყენება', note: 'managed switch-ის კონფიგ. უფრო ძვირია', min: 60, max: 150 },
      { name: 'Rack კარადის აწყობა/კაბელირება', note: 'ზომისა და პორტების რაოდ. მიხედვით', min: 250, max: 900 },
      { name: 'პაჩ-პანელის ტერმინაცია', note: 'კაბელის მარკირებით', min: 15, max: 25, unit: 'პორტი' },
    ],
  },
  security_labor: {
    label: '🎥 უსაფრთხოება — ხელობა',
    color: '#FF4060', isLabor: true,
    items: [
      { name: 'ვიდეოკამერის მონტაჟი', note: 'კაბელის გაყვანა, დამაგრება, კონფიგ.', min: 40, max: 80, unit: 'წერტილი' },
      { name: 'სახანძრო სენსორი', note: 'კვამლის/სითბოს სენსორის მონტაჟი', min: 25, max: 45, unit: 'წერტილი' },
      { name: 'მოძრაობის სენსორი', note: 'PIR სენსორის მონტაჟი', min: 30, max: 50, unit: 'წერტილი' },
      { name: 'საკონტროლო პანელი', note: 'სისტემის ცენტრალური პანელი', min: 50, max: 100 },
    ],
  },
  electro_material: {
    label: '⚡ ელექტრო — მასალა',
    color: '#E5D936', isLabor: false,
    items: [
      { name: 'კაბელი NYM 3x2.5', note: 'თურქული/ევროპული/ქართული NYM', min: 4, max: 7, unit: 'მ' },
      { name: 'კაბელი NYM 3x1.5', note: 'ქართული/ევროპული NYM', min: 3, max: 6, unit: 'მ' },
      { name: 'ავტომატი (1P, 2P)', note: 'Schneider/Legrand', min: 16, max: 100 },
      { name: 'გოფრა (20mm)', note: 'სტანდარტული', min: 1.5, max: 2.5, unit: 'მ' },
      { name: 'ჩასაშენებელი კოლოფი', note: 'სტანდარტული', min: 2, max: 7 },
      { name: 'გამანაწილებელი კოლოფი', note: 'ჩასაშენებლი/ზედაპირული', min: 5, max: 15 },
      { name: 'როზეტი/გამომრთველი', note: 'ხარისხის მიხედვით', min: 10, max: 35 },
      { name: 'წვრილი სახარჯი მასალა', note: 'ხამუთი, გოფრის სამაგრი, დუბელი, სკობი', min: 200, max: 500 },
    ],
  },
  security_material: {
    label: '🎥 უსაფრთხოება — მასალა',
    color: '#FF4060', isLabor: false,
    items: [
      { name: 'IP კამერა (2MP-4MP)', note: 'Hikvision/Dahua/Uniview', min: 150, max: 800 },
      { name: 'ჩამწერი (NVR/DVR)', note: 'Hikvision/Dahua/Uniview', min: 300, max: 5000 },
      { name: 'მყარი დისკი', note: '2TB/4TB/6TB/8TB/10TB', min: 500, max: 4000 },
      { name: 'სახანძრო სენსორი', note: 'სტანდარტული/სმარტ სისტემები', min: 80, max: 400 },
      { name: 'სახანძრო საგანგაშო სირენა', note: 'სტანდარტული/სმარტ სისტემები', min: 50, max: 300 },
      { name: 'სახანძრო სამართავი დაფა', note: 'სტანდარტული/სმარტ სისტემები', min: 600, max: 5000 },
      { name: 'მოძრაობის სენსორი', note: 'Ajax/სტანდარტული/სმარტ სისტემები', min: 80, max: 200 },
      { name: 'სიგნალიზაციის სამართავი დაფა', note: 'Ajax/სტანდარტული', min: 600, max: 5000 },
      { name: 'კაბელი (ვიდეო/კვების)', note: 'სტანდარტული', min: 2, max: 4, unit: 'მ' },
      { name: 'წვრილი სახარჯი მასალა', note: 'ხამუთი, გოფრის სამაგრი, დუბელი, სკობი', min: 200, max: 500 },
    ],
  },
};

const VAT_RATE = 0.22;
const GN = (n) => Number(n).toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Client Info Step ───
function ClientInfoStep({ initial, onNext }) {
  const [form, setForm] = useState(initial || {
    name: '', phone: '', address: '', floor: '', apartment: '',
    sqm: '', rooms: '', internalComment: '',
  });
  const [err, setErr] = useState('');
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const next = () => {
    if (!form.name.trim())      return setErr('სახელი გვარი სავალდებულოა');
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length !== 9)
      return setErr('ტელეფონი — ზუსტად 9 ციფრი');
    if (!form.address.trim())   return setErr('მისამართი სავალდებულოა');
    if (!form.floor.trim())     return setErr('სართული სავალდებულოა');
    if (!form.apartment.trim()) return setErr('ბინის ნომერი სავალდებულოა');
    if (!form.sqm.trim())       return setErr('კვადრატულობა სავალდებულოა');
    if (!form.rooms.trim())     return setErr('ოთახების რაოდენობა სავალდებულოა');
    onNext(form);
  };

  const inputSm = { padding: '8px 8px', fontSize: 13, textAlign: 'center' };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>👤 კლიენტის ინფორმაცია</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>ყველა ველი სავალდებულოა</div>
        {err && <div className="err-box" style={{ marginBottom: 14 }}>{err}</div>}

        <div className="fg">
          <label className="form-label req">სახელი გვარი</label>
          <input className="input" value={form.name} autoFocus
            onChange={e => upd('name', e.target.value)} placeholder="მაგ: გიორგი ჯიქია" />
        </div>

        <div className="fg">
          <label className="form-label req">ტელეფონის ნომერი</label>
          <input className="input" value={form.phone}
            onChange={e => upd('phone', e.target.value.replace(/\D/g, '').slice(0, 9))}
            placeholder="5XXXXXXXX" maxLength={9}
            style={{ letterSpacing: '.05em' }} />
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
            ციფრების გარდა სხვა სიმბოლოები ავტომატურად მოიხსნება
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
          <div className="fg" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label req">ქუჩა / მისამართი</label>
            <input className="input" value={form.address}
              onChange={e => upd('address', e.target.value)} placeholder="ქუჩა, №" />
          </div>
          <div style={{ marginBottom: 0, width: 72 }}>
            <label className="form-label req" style={{ display: 'block', marginBottom: 5 }}>სართ.</label>
            <input className="input" value={form.floor} maxLength={4}
              onChange={e => upd('floor', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="5" style={inputSm} />
          </div>
          <div style={{ marginBottom: 0, width: 72 }}>
            <label className="form-label req" style={{ display: 'block', marginBottom: 5 }}>ბინა №</label>
            <input className="input" value={form.apartment} maxLength={4}
              onChange={e => upd('apartment', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="14" style={inputSm} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label req">ბინის კვადრატულობა (მ²)</label>
            <input className="input" value={form.sqm}
              onChange={e => upd('sqm', e.target.value.replace(/\D/g, ''))}
              placeholder="85" />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label req">ოთახების რაოდენობა</label>
            <input className="input" value={form.rooms}
              onChange={e => upd('rooms', e.target.value.replace(/\D/g, ''))}
              placeholder="3" />
          </div>
        </div>

        <div className="fg" style={{ marginBottom: 18 }}>
          <label className="form-label">
            🔒 შიდა კომენტარი
            <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
              (მხოლოდ ადმინ პანელში ჩანს, PDF-ში არ გამოჩნდება)
            </span>
          </label>
          <textarea className="textarea" rows={2} value={form.internalComment}
            onChange={e => upd('internalComment', e.target.value)}
            placeholder="შიდა შენიშვნები, კლიენტის სპეციფიკა..." />
        </div>

        <button className="btn btn-primary" style={{ width: '100%' }} onClick={next}>
          შემდეგი →
        </button>
      </div>
    </div>
  );
}

// ─── Catalog Row ───
function CatalogRow({ item, value, onChange, readOnly }) {
  const avg = ((item.min + item.max) / 2).toFixed(2);
  const lineTotal = (Number(value.qty) || 0) * (Number(value.price) || 0);
  return (
    <tr>
      <td style={{ fontSize: 12.5 }}>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{item.note}</div>
      </td>
      <td style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
        {item.unit ? `₾${item.min}–${item.max}/${item.unit}` : `₾${item.min}–${item.max}`}
      </td>
      <td style={{ width: 80 }}>
        {readOnly ? (
          <span style={{ fontSize: 13, fontWeight: 600 }}>{value.qty || '—'}</span>
        ) : (
          <input type="number" min="0" step="0.01" value={value.qty}
            onChange={e => onChange({ ...value, qty: e.target.value })}
            className="input"
            style={{ padding: '4px 6px', fontSize: 12.5, textAlign: 'right' }}
            placeholder="0" />
        )}
      </td>
      <td style={{ width: 110 }}>
        {readOnly ? (
          <span style={{ fontSize: 13 }}>₾{Number(value.price).toFixed(2)}</span>
        ) : (
          <input type="number" min="0" step="0.01" value={value.price}
            onChange={e => onChange({ ...value, price: e.target.value })}
            className="input"
            style={{ padding: '4px 6px', fontSize: 12.5, textAlign: 'right' }}
            placeholder={avg} />
        )}
      </td>
      <td style={{ fontWeight: 600, color: lineTotal > 0 ? 'var(--success)' : 'var(--text-muted)',
        textAlign: 'right', fontSize: 13, whiteSpace: 'nowrap' }}>
        {lineTotal > 0 ? `₾${GN(lineTotal)}` : '—'}
      </td>
    </tr>
  );
}

// ─── Calculator Step ───
function CalculatorStep({ client, onSave, onBack, existingEstimate, readOnly: initialReadOnly }) {
  const isEdit = !!existingEstimate;
  const [readOnly, setReadOnly] = useState(!!initialReadOnly);

  const initRows = () => {
    if (existingEstimate?.rows) return existingEstimate.rows;
    const r = {};
    Object.keys(CATALOG).forEach(k => {
      r[k] = CATALOG[k].items.map(item => ({
        qty: '',
        price: ((item.min + item.max) / 2).toFixed(2),
      }));
    });
    return r;
  };

  const [rows, setRows] = useState(initRows);
  const [discount, setDiscount] = useState(existingEstimate?.discount || '');
  const [notes, setNotes] = useState(existingEstimate?.notes || '');
  const [withVat, setWithVat] = useState(existingEstimate?.withVat ?? false);
  const [internalComment, setInternalComment] = useState(
    existingEstimate?.client?.internalComment || client?.internalComment || ''
  );
  const [saving, setSaving] = useState(false);

  const updRow = (catKey, idx, val) =>
    setRows(prev => ({ ...prev, [catKey]: prev[catKey].map((r, i) => i === idx ? val : r) }));

  const totals = useMemo(() => {
    let laborTotal = 0;
    let materialTotal = 0;
    const cats = {};
    Object.entries(CATALOG).forEach(([catKey, cat]) => {
      let catTotal = 0;
      cat.items.forEach((item, i) => {
        const qty = Number(rows[catKey][i].qty) || 0;
        const price = Number(rows[catKey][i].price) || 0;
        catTotal += qty * price;
      });
      cats[catKey] = catTotal;
      if (cat.isLabor) laborTotal += catTotal;
      else materialTotal += catTotal;
    });
    const subtotal = laborTotal + materialTotal;
    const disc = Number(discount) || 0;
    const laborAfterDisc = Math.max(0, laborTotal - disc);
    const vat = withVat ? laborAfterDisc * VAT_RATE : 0;
    const total = laborAfterDisc + materialTotal + vat;
    return { subtotal, laborTotal, materialTotal, cats, disc, vat, total };
  }, [rows, discount, withVat]);

  const buildLineItems = () => {
    const items = [];
    Object.entries(CATALOG).forEach(([catKey, cat]) => {
      cat.items.forEach((item, i) => {
        const qty = Number(rows[catKey][i].qty) || 0;
        if (qty > 0) items.push({
          category: cat.label, isLabor: cat.isLabor,
          name: item.name, note: item.note, unit: item.unit || 'ც',
          qty, price: Number(rows[catKey][i].price) || 0,
          total: qty * (Number(rows[catKey][i].price) || 0),
        });
      });
    });
    return items;
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({
      client: { ...client, internalComment },
      rows, discount: Number(discount) || 0,
      notes, withVat,
      lineItems: buildLineItems(),
      subtotal: totals.subtotal,
      laborTotal: totals.laborTotal,
      materialTotal: totals.materialTotal,
      vat: totals.vat,
      total: totals.total,
    }, existingEstimate?.id);
    setSaving(false);
    if (isEdit) setReadOnly(true);
  };

  const openPrintWindow = async () => {
    await handleSave();
    const lineItems = buildLineItems();
    const laborItems = lineItems.filter(li => li.isLabor);
    const materialItems = lineItems.filter(li => !li.isLabor);

    const rowsHtml = (items) => items.map((li, i) => `
      <tr>
        <td class="num">${i + 1}</td>
        <td><strong>${li.name}</strong></td>
        <td style="text-align:right">${li.qty}</td>
        <td>${li.unit}</td>
        <td style="text-align:right">₾${li.price.toFixed(2)}</td>
        <td style="text-align:right;font-weight:700">₾${GN(li.total)}</td>
      </tr>`).join('');

    const win = window.open('', '_blank', 'width=960,height=860,scrollbars=yes');
    win.document.write(`<!DOCTYPE html><html lang="ka"><head>
      <meta charset="UTF-8"/>
      <title>SmartPro — კალკულაცია</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;600;700&display=swap');
        @page{size:A4;margin:8mm 7mm;}
        *{margin:0;padding:0;box-sizing:border-box;}
        @media print{body{background:#fff;padding:0;}.no-print{display:none!important;}}
        body{font-family:'Noto Sans Georgian',sans-serif;background:#f4f7fc;color:#1a2340;padding:16px;font-size:13px;}
        .wrap{max-width:860px;margin:0 auto;background:#fff;border-radius:14px;box-shadow:0 8px 40px rgba(13,27,62,.13);overflow:hidden;}
        .hdr{background:linear-gradient(135deg,#0d1b3e 0%,#152d5e 60%,#0077cc 100%);padding:22px 36px;display:flex;justify-content:space-between;align-items:center;}
        .hdr img{height:40px;filter:brightness(0) invert(1);}
        .hdr-r{text-align:right;}
        .hdr-r h1{font-size:20px;font-weight:700;color:#fff;letter-spacing:1px;}
        .hdr-r .sub{color:#1BEACD;font-size:10px;font-weight:600;letter-spacing:.08em;margin-top:3px;}
        .meta{background:#eef3fb;padding:10px 36px;display:flex;gap:0;border-bottom:1px solid #dce4f0;}
        .mi{flex:1;border-right:1px solid #dce4f0;padding:0 14px 0 0;margin-right:14px;}
        .mi:last-child{border-right:none;}
        .ml{font-size:9px;color:#6b7a99;text-transform:uppercase;letter-spacing:.6px;margin-bottom:2px;}
        .mv{font-size:12px;font-weight:700;}
        .sec{padding:14px 36px 0;}
        .sec-title{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#00aaff;font-weight:700;margin-bottom:8px;}
        table.t{width:100%;border-collapse:collapse;margin-bottom:14px;}
        table.t thead tr{background:#0d1b3e;color:#fff;}
        table.t thead th{padding:7px 8px;font-size:10px;font-weight:600;text-align:left;}
        table.t tbody tr{border-bottom:1px solid #dce4f0;}
        table.t tbody tr:nth-child(even){background:#f8faff;}
        table.t tbody td{padding:6px 8px;font-size:11.5px;vertical-align:middle;}
        td.num{color:#6b7a99;font-size:10px;text-align:center;width:22px;}
        .totals{padding:12px 36px;border-top:2px solid #0d1b3e;}
        .tr{display:flex;justify-content:space-between;padding:4px 0;font-size:13px;border-bottom:1px solid #dce4f0;}
        .tr:last-child{border:none;padding-top:8px;}
        .tl{color:#6b7a99;}
        .tv{font-weight:600;}
        .grand .tl{font-size:14px;font-weight:700;color:#0d1b3e;}
        .grand .tv{font-size:19px;font-weight:800;color:#0077cc;}
        .vat-note{font-size:11px;color:#6b7a99;margin-top:6px;font-style:italic;}
        .note-box{margin:0 36px 14px;background:#f4f7fc;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.7;}
        .ftr{background:#0d1b3e;padding:8px 36px;display:flex;justify-content:space-between;align-items:center;}
        .ftr-c{color:rgba(255,255,255,.6);font-size:10px;line-height:1.6;}
        .ftr-c span{color:#1BEACD;font-weight:600;}
        .action-bar{max-width:860px;margin:14px auto 0;display:flex;gap:10px;justify-content:flex-end;}
        .btn{padding:10px 22px;border-radius:8px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;border:none;}
        .btn-outline{background:#fff;border:2px solid #dce4f0;color:#1a2340;}
        .btn-primary{background:linear-gradient(135deg,#0d1b3e,#0077cc);color:#fff;}
      </style>
    </head><body>
    <div class="wrap">
      <div class="hdr">
        <div>
          <img src="https://smartpro.ge/wp-content/uploads/2025/12/LOGO-SMARTPRO_for-site-2.png" onerror="this.style.display='none'"/>
          <div style="color:rgba(255,255,255,.5);font-size:10px;margin-top:4px">ელექტროობა · უსაფრთხოება · ჭკვიანი სახლი</div>
        </div>
        <div class="hdr-r">
          <h1>საორიენტაციო კალკულაცია</h1>
          <div class="sub">წერტილებით დათვლა · ცდომილება 10-15%</div>
        </div>
      </div>
      <div class="meta">
        <div class="mi"><div class="ml">კლიენტი</div><div class="mv">${client.name}</div></div>
        <div class="mi"><div class="ml">ტელეფონი</div><div class="mv">${client.phone}</div></div>
        <div class="mi"><div class="ml">მისამართი</div><div class="mv">${client.address}, სართ.${client.floor}, ბინა ${client.apartment}</div></div>
        <div class="mi"><div class="ml">ფართი / ოთახი</div><div class="mv">${client.sqm} მ² / ${client.rooms}</div></div>
      </div>
      ${laborItems.length > 0 ? `
      <div class="sec">
        <div class="sec-title">ხელობა</div>
        <table class="t"><thead><tr>
          <th style="width:22px">#</th><th>სამუშაო</th>
          <th style="width:55px;text-align:right">რაოდ.</th><th style="width:48px">ერთ.</th>
          <th style="width:80px;text-align:right">ფასი</th><th style="width:88px;text-align:right">ჯამი</th>
        </tr></thead><tbody>${rowsHtml(laborItems)}</tbody></table>
      </div>` : ''}
      ${materialItems.length > 0 ? `
      <div class="sec">
        <div class="sec-title">მასალა</div>
        <table class="t"><thead><tr>
          <th style="width:22px">#</th><th>მასალა</th>
          <th style="width:55px;text-align:right">რაოდ.</th><th style="width:48px">ერთ.</th>
          <th style="width:80px;text-align:right">ფასი</th><th style="width:88px;text-align:right">ჯამი</th>
        </tr></thead><tbody>${rowsHtml(materialItems)}</tbody></table>
      </div>` : ''}
      ${notes ? `<div class="note-box">${notes}</div>` : ''}
      <div class="totals">
        ${laborItems.length > 0 ? `<div class="tr"><span class="tl">ხელობა</span><span class="tv">₾${GN(totals.laborTotal)}</span></div>` : ''}
        ${materialItems.length > 0 ? `<div class="tr"><span class="tl">მასალა</span><span class="tv">₾${GN(totals.materialTotal)}</span></div>` : ''}
        ${totals.disc > 0 ? `<div class="tr"><span class="tl">ფასდაკლება</span><span class="tv">−₾${GN(totals.disc)}</span></div>` : ''}
        ${withVat ? `<div class="tr"><span class="tl">კომპანიით მომსახურება (22%)</span><span class="tv">₾${GN(totals.vat)}</span></div>` : ''}
        <div class="tr grand"><span class="tl">სულ გადასახდელი</span><span class="tv">₾${GN(totals.total)}</span></div>
        ${withVat ? `<div class="vat-note">* თანხა მითითებულია დღგ-ს ჩათვლით</div>` : ''}
      </div>
      <div class="ftr">
        <div class="ftr-c"><span>+995 505 55 65 65</span> · gj.jikia@smartpro.ge · www.smartpro.ge</div>
        <div style="color:#fff;font-size:11px;font-weight:700;text-align:right">SMART PRO<br/><span style="color:rgba(255,255,255,.4);font-size:9px;font-weight:400">გმადლობთ ნდობისთვის!</span></div>
      </div>
    </div>
    <div class="action-bar no-print">
      <button class="btn btn-outline" onclick="window.close()">✕ დახურვა</button>
      <button class="btn btn-primary" onclick="window.print()">🖨️ დაბეჭდვა / PDF</button>
    </div>
    </body></html>`);
    win.document.close();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>📋 {client.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {client.address}, სართ. {client.floor}, ბინა {client.apartment} · {client.sqm} მ² · {client.rooms} ოთახი
          </div>
          {readOnly && internalComment && (
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent)',
              background: 'rgba(27,234,205,0.07)', borderRadius: 6,
              padding: '4px 10px', display: 'inline-block' }}>
              🔒 {internalComment}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={onBack}>← უკან</button>
          {readOnly && (
            <button className="btn btn-secondary btn-sm" onClick={() => setReadOnly(false)}>✏️ რედაქტირება</button>
          )}
        </div>
      </div>

      {Object.entries(CATALOG).map(([catKey, cat]) => (
        <div key={catKey} className="card" style={{ padding: 0, marginBottom: 14, borderColor: cat.color + '44' }}>
          <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: cat.color + '0D', borderRadius: '8px 8px 0 0' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: cat.color }}>{cat.label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: cat.color }}>
              {totals.cats[catKey] > 0 ? `₾${GN(totals.cats[catKey])}` : ''}
            </div>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ fontSize: 12.5 }}>
              <thead>
                <tr>
                  <th>სამუშაო / მასალა</th>
                  <th style={{ width: 110 }}>საო. ფასი</th>
                  <th style={{ width: 80 }}>რაოდ.</th>
                  <th style={{ width: 110 }}>რ. ფასი (₾)</th>
                  <th style={{ width: 100 }}>ჯამი</th>
                </tr>
              </thead>
              <tbody>
                {cat.items.map((item, i) => (
                  <CatalogRow key={i} item={item}
                    value={rows[catKey][i]}
                    onChange={val => updRow(catKey, i, val)}
                    readOnly={readOnly} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">შენიშვნები (PDF-ში გამოჩნდება)</label>
            <textarea className="textarea" rows={2} value={notes}
              onChange={e => setNotes(e.target.value)} readOnly={readOnly}
              placeholder="დამატებითი ინფო, პირობები..." />
          </div>
          <div className="fg" style={{ marginBottom: 0 }}>
            <label className="form-label">
              🔒 შიდა კომენტარი
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                (მხოლოდ ადმინ პანელში ჩანს)
              </span>
            </label>
            <textarea className="textarea" rows={2} value={internalComment}
              onChange={e => setInternalComment(e.target.value)}
              placeholder="დამატე შიდა კომენტარი..." />
          </div>
        </div>

        <div className="card" style={{ padding: '16px 18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10,
            cursor: readOnly ? 'default' : 'pointer',
            padding: '10px 12px', borderRadius: 8, marginBottom: 12,
            background: withVat ? 'rgba(27,234,205,0.08)' : 'var(--bg-muted)',
            border: `1.5px solid ${withVat ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'all .15s' }}>
            <input type="checkbox" checked={withVat} disabled={readOnly}
              onChange={e => setWithVat(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>კომპანიით მომსახურება</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>+22% ხელობის ჯამზე · დღგ ჩათვლით</div>
            </div>
          </label>

          {!readOnly && (
            <div style={{ marginBottom: 12 }}>
              <label className="form-label">ფასდაკლება (₾)</label>
              <input className="input" type="number" min="0" value={discount}
                onChange={e => setDiscount(e.target.value)} placeholder="0" />
            </div>
          )}

          {[
            { label: 'ხელობა', value: totals.laborTotal, show: totals.laborTotal > 0 },
            { label: 'მასალა', value: totals.materialTotal, show: totals.materialTotal > 0 },
            { label: 'ფასდაკლება', value: -totals.disc, show: totals.disc > 0 },
            { label: 'კომპანიით მომსახურება (22%)', value: totals.vat, show: withVat && totals.vat > 0 },
          ].filter(r => r.show).map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
              padding: '5px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
              <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
              <span style={{ fontWeight: 600 }}>
                {row.value < 0 ? '−' : ''}₾{GN(Math.abs(row.value))}
              </span>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>სულ</span>
            <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--success)' }}>
              ₾{GN(totals.total)}
            </span>
          </div>
          {withVat && (
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
              * თანხა მითითებულია დღგ-ს ჩათვლით
            </div>
          )}

          {!readOnly && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" style={{ width: '100%' }}
                onClick={handleSave} disabled={saving}>
                💾 {saving ? 'ინახება...' : 'შენახვა'}
              </button>
              <button className="btn btn-primary btn-sm" style={{ width: '100%' }}
                onClick={openPrintWindow}>
                💾 შენახვა + 🖨️ PDF
              </button>
            </div>
          )}
          {readOnly && (
            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: 14 }}
              onClick={openPrintWindow}>
              🖨️ PDF გახსნა
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Saved Estimates List ───
function EstimatesList({ onOpen }) {
  const { db, dbRef, saveDB, toast } = useApp();
  const [confirmDel, setConfirmDel] = useState(null);

  const estimates = useMemo(() =>
    [...(db?.estimates || [])].sort((a, b) => new Date(b.created) - new Date(a.created)),
    [db?.estimates]
  );

  const deleteEst = async (est) => {
    const cur = dbRef?.current || db;
    const newDb = { ...cur, estimates: (cur.estimates || []).filter(e => e.id !== est.id) };
    await saveDB(newDb);
    toast('🗑 კალკულაცია წაიშალა');
    setConfirmDel(null);
  };

  if (estimates.length === 0) {
    return (
      <div className="empty" style={{ padding: '60px 0' }}>
        <div className="empty-icon">🧮</div>
        <div className="empty-title">დათვლილი პროექტები არ არის</div>
        <div className="empty-sub">პირველი კალკულაცია შეინახე</div>
      </div>
    );
  }

  return (
    <>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>კლიენტი</th>
              <th>მისამართი</th>
              <th>ფართი</th>
              <th>სულ</th>
              <th>თარიღი</th>
              <th>შიდა კომ.</th>
              <th style={{ width: 110 }}>მოქმ.</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map(est => (
              <tr key={est.id}>
                <td style={{ fontWeight: 600 }}>{est.client.name}</td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {est.client.address}, სართ.{est.client.floor} / ბინა {est.client.apartment}
                </td>
                <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{est.client.sqm} მ²</td>
                <td style={{ fontWeight: 700, color: 'var(--success)' }}>₾{GN(est.total)}</td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(est.created).toLocaleDateString('ka-GE')}
                </td>
                <td style={{ fontSize: 11.5, color: 'var(--accent)', maxWidth: 160,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  title={est.client.internalComment}>
                  {est.client.internalComment || '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-xs" title="ნახვა"
                      onClick={() => onOpen(est, true)}>👁️</button>
                    <button className="btn btn-ghost btn-xs" title="რედაქტირება"
                      onClick={() => onOpen(est, false)}>✏️</button>
                    <button className="btn btn-ghost btn-xs" title="წაშლა"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setConfirmDel(est)}>🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDel && (
        <Modal open title="🗑 კალკულაციის წაშლა"
          onClose={() => setConfirmDel(null)}
          footer={<>
            <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)}>გაუქმება</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteEst(confirmDel)}>წაშლა</button>
          </>}>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            წაიშლება: <strong>{confirmDel.client.name}</strong><br />
            <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠️ წაშლა შეუქცევადია</span>
          </p>
        </Modal>
      )}
    </>
  );
}

// ─── Main Page ───
export default function CalculatorPage() {
  const { db, dbRef, saveDB, toast, user } = useApp();
  const [tab, setTab] = useState('points');
  const [step, setStep] = useState('client');
  const [clientInfo, setClientInfo] = useState(null);
  const [openEstimate, setOpenEstimate] = useState(null);
  const [openReadOnly, setOpenReadOnly] = useState(false);

  const handleSave = async (data, existingId) => {
    const cur = dbRef?.current || db;
    if (existingId) {
      const newDb = { ...cur, estimates: cur.estimates.map(e =>
        e.id === existingId
          ? { ...e, ...data, client: data.client, updated: new Date().toISOString() }
          : e
      )};
      await saveDB(newDb);
      toast('✅ კალკულაცია განახლდა');
    } else {
      const estimate = {
        id: uid(), type: 'points',
        client: data.client,
        rows: data.rows,
        lineItems: data.lineItems,
        discount: data.discount,
        notes: data.notes,
        withVat: data.withVat,
        subtotal: data.subtotal,
        laborTotal: data.laborTotal,
        materialTotal: data.materialTotal,
        vat: data.vat,
        total: data.total,
        createdBy: user?.id,
        created: new Date().toISOString(),
      };
      const newDb = { ...cur, estimates: [...(cur.estimates || []), estimate] };
      await saveDB(newDb);
      toast('✅ კალკულაცია შენახულია');
      setTab('saved');
    }
  };

  const handleOpen = (est, readOnly) => {
    setOpenEstimate(est);
    setOpenReadOnly(readOnly);
    setTab('calc_view');
  };

  const TABS = [
    { key: 'points', label: '📍 წერტილებით დათვლა', sub: 'ცდომილება 10-15%' },
    { key: 'sqm',    label: '📐 კვადრატულით დათვლა', sub: 'მალე დაემატება', disabled: true },
    { key: 'saved',  label: `💾 დათვლილი პროექტები (${(db?.estimates || []).length})`, sub: '' },
  ];

  return (
    <AppShell>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <div className="page-title">🧮 კალკულატორი</div>
          <div className="page-subtitle">პროექტის საორიენტაციო ღირებულების გაანგარიშება</div>
        </div>
      </div>

      {tab !== 'calc_view' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.key} disabled={t.disabled}
              onClick={() => { setTab(t.key); setStep('client'); setClientInfo(null); }}
              style={{
                flex: 1, minWidth: 160, padding: '13px 16px', border: 'none',
                borderRadius: 'var(--radius-md)', cursor: t.disabled ? 'not-allowed' : 'pointer',
                background: tab === t.key
                  ? 'linear-gradient(135deg, rgba(27,234,205,0.15), rgba(27,234,205,0.05))'
                  : 'var(--bg-muted)',
                border: `1.5px solid ${tab === t.key ? 'var(--accent)' : 'var(--border)'}`,
                opacity: t.disabled ? 0.5 : 1, textAlign: 'left', transition: 'all .15s',
              }}>
              <div style={{ fontWeight: 700, fontSize: 13.5,
                color: tab === t.key ? 'var(--accent)' : 'var(--text-primary)' }}>{t.label}</div>
              {t.sub && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {t.disabled ? '🔜 მალე' : t.sub}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {tab === 'points' && (
        step === 'client'
          ? <ClientInfoStep initial={clientInfo} onNext={info => { setClientInfo(info); setStep('calc'); }} />
          : <CalculatorStep
              client={clientInfo}
              onSave={handleSave}
              onBack={() => setStep('client')}
            />
      )}

      {tab === 'sqm' && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔜</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>მალე დაემატება</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>კვადრატულით დათვლა ამჟამად მუშავდება</div>
        </div>
      )}

      {tab === 'saved' && <EstimatesList onOpen={handleOpen} />}

      {tab === 'calc_view' && openEstimate && (
        <div>
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 16 }}
            onClick={() => { setTab('saved'); setOpenEstimate(null); }}>
            ← დათვლილი პროექტები
          </button>
          <CalculatorStep
            client={openEstimate.client}
            existingEstimate={openEstimate}
            readOnly={openReadOnly}
            onSave={handleSave}
            onBack={() => { setTab('saved'); setOpenEstimate(null); }}
          />
        </div>
      )}
    </AppShell>
  );
}
