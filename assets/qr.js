/* Incenso Studio — tiny QR encoder (byte mode, versions 1–3, EC level M, mask 0). Returns an SVG string. No network. */
(() => {
  const CAP = { 1: [16, 10], 2: [28, 16], 3: [44, 26] }; // [data codewords, ec codewords] at level M
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; };
  const divisor = (deg) => { const r = new Array(deg).fill(0); r[deg - 1] = 1; let root = 1; for (let i = 0; i < deg; i++) { for (let j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); } return r; };
  const remainder = (data, div) => { const r = new Array(div.length).fill(0); for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < div.length; i++) r[i] ^= mul(div[i], f); } return r; };
  const encode = (text) => {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 1; while (ver <= 3 && (bytes.length + 2) > CAP[ver][0]) ver++;
    if (ver > 3) throw new Error('QR: text too long');
    const [dataLen, ecLen] = CAP[ver];
    const bits = []; const push = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    push(4, 4); push(bytes.length, 8); bytes.forEach((b) => push(b, 8));
    push(0, Math.min(4, dataLen * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
    for (let p = 0xEC; data.length < dataLen; p ^= 0xEC ^ 0x11) data.push(p);
    const cw = data.concat(remainder(data, divisor(ecLen)));
    const size = 17 + 4 * ver;
    const m = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, v) => { m[y][x] = !!v; fn[y][x] = true; };
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    if (ver >= 2) { const c = size - 7; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    const fmt = (mask) => { const d = (0 << 3) | mask; let rem = d; for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537); const b = ((d << 10) | rem) ^ 0x5412; const bit = (i) => (b >>> i) & 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i)); set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i)); for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i)); set(8, size - 8, 1); };
    fmt(0);
    let i = 0; const total = cw.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) { if (right === 6) right = 5; for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) { const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v; if (!fn[y][x] && i < total) { m[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; } } }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 === 0) m[y][x] = !m[y][x];
    return { size, m };
  };
  window.IncensoQR = (text, color) => {
    const { size, m } = encode(text);
    let d = '';
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (m[y][x]) d += 'M' + (x + 0.1) + ' ' + (y + 0.5) + 'a0.4 0.4 0 1 0 0.8 0a0.4 0.4 0 1 0 -0.8 0z';
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + ' ' + size + '" aria-hidden="true"><path d="' + d + '" fill="' + (color || '#000') + '"></path></svg>';
  };
})();
