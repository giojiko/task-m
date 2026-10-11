// SVG mini-icons for switch/socket product types. Ported from reference/SmartPro-kalkulatori.html.
export default function ProductIcon({ type = 'blank', hex = '#f3f3f1', size }) {
  function shade(h, amt) {
    const n = parseInt(h.replace('#', ''), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const L = (r * 299 + g * 587 + b * 114) / 1000;
    const k = L > 140 ? -amt : amt;
    r = Math.max(0, Math.min(255, r + k));
    g = Math.max(0, Math.min(255, g + k));
    b = Math.max(0, Math.min(255, b + k));
    return `rgb(${r},${g},${b})`;
  }

  const f = hex, s = shade(hex, 60), d = shade(hex, 95);
  const plate = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2.5" fill="${f}" stroke="${s}" stroke-width="1"/>`;
  const sock = (cx, cy, r = 8.5, ground = true) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" stroke="${s}" stroke-width="1.2"/>` +
    `<circle cx="${cx - 3.6}" cy="${cy}" r="1.3" fill="${d}"/>` +
    `<circle cx="${cx + 3.6}" cy="${cy}" r="1.3" fill="${d}"/>` +
    (ground ? `<rect x="${cx - 1.2}" y="${cy - r + .6}" width="2.4" height="2.2" fill="${d}"/>` : '');

  let inner = '', vb = '0 0 40 40', body = plate(4, 4, 32, 32);

  const m = type.match(/^frame(\d)(v?)$/);
  if (m) {
    const k = +m[1], v = !!m[2], u = 13, g2 = 2;
    const W = k * u + (k + 1) * g2, H = u + 2 * g2;
    if (v) {
      vb = `0 0 ${H + 4} ${W + 4}`;
      body = plate(2, 2, H, W);
      for (let i = 0; i < k; i++)
        inner += `<rect x="${2 + g2}" y="${2 + g2 + i * (u + g2)}" width="${u}" height="${u}" rx="1.5" fill="none" stroke="${s}" stroke-width="1" stroke-dasharray="2 1.5"/>`;
    } else {
      vb = `0 0 ${W + 4} ${H + 4}`;
      body = plate(2, 2, W, H);
      for (let i = 0; i < k; i++)
        inner += `<rect x="${2 + g2 + i * (u + g2)}" y="${2 + g2}" width="${u}" height="${u}" rx="1.5" fill="none" stroke="${s}" stroke-width="1" stroke-dasharray="2 1.5"/>`;
    }
    const w = size || (v ? 24 : Math.min(46, k * 15 + 6));
    const h = size || (v ? 34 : 20);
    return <svg viewBox={vb} width={w} height={h} aria-hidden="true" dangerouslySetInnerHTML={{ __html: body + inner }} />;
  }

  switch (type) {
    case 'sw1': inner = `<rect x="9" y="9" width="22" height="22" rx="1.5" fill="none" stroke="${s}"/>`; break;
    case 'sw2': inner = `<rect x="9" y="9" width="22" height="22" rx="1.5" fill="none" stroke="${s}"/><line x1="20" y1="9" x2="20" y2="31" stroke="${s}"/>`; break;
    case 'sw3': inner = `<rect x="9" y="9" width="22" height="22" rx="1.5" fill="none" stroke="${s}"/><line x1="16.3" y1="9" x2="16.3" y2="31" stroke="${s}"/><line x1="23.7" y1="9" x2="23.7" y2="31" stroke="${s}"/>`; break;
    case 'curtain': inner = `<rect x="9" y="9" width="22" height="22" rx="1.5" fill="none" stroke="${s}"/><line x1="20" y1="9" x2="20" y2="31" stroke="${s}"/><path d="M14.5 17l-2.5 4h5zM25.5 23l-2.5-4h5z" fill="${d}"/>`; break;
    case 'bell': inner = `<path d="M20 13c-3.3 0-5 2.6-5 5.6v3.6l-1.6 2h13.2l-1.6-2v-3.6c0-3-1.7-5.6-5-5.6z" fill="none" stroke="${d}" stroke-width="1.2"/><circle cx="20" cy="26.6" r="1.3" fill="${d}"/>`; break;
    case 'sock': inner = sock(20, 20); break;
    case 'sockr': inner = sock(20, 20, 8.5, false); break;
    case 'sockf': inner = sock(20, 20) + `<circle cx="20" cy="15.6" r="1" fill="${d}"/>`; break;
    case 'usb':
    case 'usbf': inner = sock(20, 22, 7.5) + `<rect x="9" y="8" width="5" height="2.6" rx=".5" fill="${d}"/><rect x="27" y="8" width="3.6" height="2" rx="1" fill="${d}"/>`; break;
    case 'usbonly': inner = `<rect x="17.5" y="13" width="5" height="2.6" rx=".5" fill="${d}"/><rect x="18.2" y="24" width="3.6" height="2" rx="1" fill="${d}"/>`; break;
    case 'sock2': vb = '0 0 64 40'; body = plate(3, 4, 58, 32); inner = sock(19, 20, 9) + sock(45, 20, 9); break;
    case 'tv': inner = `<circle cx="20" cy="19" r="4.5" fill="none" stroke="${d}" stroke-width="1.3"/><circle cx="20" cy="19" r="1.4" fill="${d}"/>`; break;
    case 'tv2': inner = `<circle cx="14" cy="20" r="3.6" fill="none" stroke="${d}" stroke-width="1.2"/><circle cx="26" cy="20" r="3.6" fill="none" stroke="${d}" stroke-width="1.2"/>`; break;
    case 'data': inner = `<rect x="15.5" y="15" width="9" height="8" rx="1" fill="none" stroke="${d}" stroke-width="1.3"/><rect x="18" y="20" width="4" height="3" fill="${d}"/>`; break;
    case 'data2': inner = `<rect x="9.5" y="15" width="8" height="8" rx="1" fill="none" stroke="${d}" stroke-width="1.2"/><rect x="22.5" y="15" width="8" height="8" rx="1" fill="none" stroke="${d}" stroke-width="1.2"/>`; break;
    case 'dimmer': inner = `<circle cx="20" cy="20" r="7" fill="${f}" stroke="${d}" stroke-width="1.3"/><line x1="20" y1="14.5" x2="20" y2="18" stroke="${d}" stroke-width="1.4"/>`; break;
    case 'cover': inner = sock(20, 22, 7.5) + `<rect x="8" y="7" width="24" height="7" rx="1.5" fill="none" stroke="${s}" stroke-width="1"/>`; break;
    case 'outlet': inner = `<circle cx="20" cy="18" r="6" fill="${d}"/>`; break;
    case 'blank': inner = ''; break;
    default: inner = `<circle cx="20" cy="15" r="2" fill="${d}"/><rect x="18.8" y="19" width="2.4" height="9" rx="1.2" fill="${d}"/>`;
  }

  const wide = type === 'sock2';
  const w = size || (wide ? 46 : 32);
  const h = size || (wide ? 29 : 32);
  return <svg viewBox={vb} width={w} height={h} aria-hidden="true" dangerouslySetInnerHTML={{ __html: body + inner }} />;
}
