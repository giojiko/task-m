// ღია (კრემისფერი) ფონზე ტექსტი რომ წაიკითხებოდეს: ძალიან ღია ფერს
// (მაგალითად, მიმართულებების ძველ ყვითელს ან ფირუზისფერს) მუქ ლურჯთან ვურევთ.
const NAVY = [7, 26, 43];

function parseHex(hex) {
  if (typeof hex !== 'string') return null;
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function luminance([r, g, b]) {
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

// ტექსტის ფერი ღია ფონისთვის. მუქ ფერს ცვლის არ ვუკეთებთ.
export function inkColor(hex) {
  let rgb = parseHex(hex);
  if (!rgb) return hex;
  // სიკაშკაშის ზღვარი ≈ 4.5:1 კონტრასტი თეთრ ფონზე
  for (let i = 0; i < 8 && luminance(rgb) > 0.18; i++) {
    rgb = rgb.map((v, k) => Math.round(v * 0.8 + NAVY[k] * 0.2));
  }
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
