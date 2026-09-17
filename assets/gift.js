/* Incenso Studio — gift-card ledger shared by Gift, Book, Booking, Checkout and Account.
   One card per code; balance tracked here. A card is attached to whichever account signs in with the recipient's number. */
(() => {
  const KEY = 'incenso-gift-cards';
  const save = (l) => { try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {} };
  const load = () => { try { const l = JSON.parse(localStorage.getItem(KEY) || '[]') || []; let dirty = false; l.forEach((x) => { if ((x.status === 'Active' && !/card/i.test(x.pay || '') && !x.confirmed) || /pending|reserved/i.test(x.status)) { if (x.status !== 'Reserved') { x.status = 'Reserved'; dirty = true; } } if (x.status === 'Active' && !x.confirmed) { x.confirmed = x.created; dirty = true; } if (x.status === 'Reserved' && /^Paid via /.test(x.pay || '')) { x.pay = x.pay.replace(/^Paid via /, ''); dirty = true; } }); if (dirty) save(l); return l; } catch (e) { return []; } };
  const digits = (p) => String(p || '').replace(/\D/g, '');
  const same = (a, b) => { a = digits(a); b = digits(b); if (a.length < 6 || b.length < 6) return false; return a === b || a.endsWith(b) || b.endsWith(a); };
  const today = () => new Date().toISOString().slice(0, 10);
  const active = (x) => !!x && x.status === 'Active' && x.balance > 0 && (!x.expires || x.expires >= today());
  const byCode = (c) => load().find((x) => x.code.toUpperCase() === String(c || '').trim().toUpperCase().replace(/\s+/g, '')) || null;
  const issue = (v) => { const l = load().filter((x) => x.code !== v.code); l.unshift(Object.assign({ balance: v.amount, redemptions: [] }, v)); save(l); return v; };
  const update = (code, fn) => { const l = load(); const x = l.find((y) => y.code === code); if (x) { fn(x); save(l); } return x; };
  const confirmed = (x) => !!x && x.status !== 'Reserved';
  const forPhone = (p) => load().filter((x) => same(x.toPhone, p) && confirmed(x));
  const boughtBy = (p) => load().filter((x) => same(x.buyerPhone, p));
  const redeem = (code, amount, ref, what) => { let used = 0; update(code, (x) => { used = Math.min(amount, x.balance); x.balance -= used; x.redemptions.push({ date: new Date().toISOString(), amount: used, ref, what }); if (x.balance <= 0) x.status = 'Used'; }); return used; };
  const confirm = (code) => update(code, (x) => { x.status = x.balance > 0 ? 'Active' : 'Used'; x.confirmed = new Date().toISOString(); x.pay = ({ 'Pay at studio': 'Paid at studio', 'Whish Money': 'Paid via Whish Money', 'OMT Pay': 'Paid via OMT Pay' })[x.pay] || x.pay; });
  const pending = () => load().filter((x) => !confirmed(x));
  const refund = (code, amount, ref) => update(code, (x) => { x.balance += amount; if (x.status === 'Used') x.status = 'Active'; x.redemptions.push({ date: new Date().toISOString(), amount: -amount, ref, what: 'Refund' }); });
  const attach = (acc) => { if (!acc || !acc.phone) return acc; acc.giftCards = forPhone(acc.phone).map((x) => x.code); return acc; };
  const totalFor = (p) => forPhone(p).filter(active).reduce((a, x) => a + x.balance, 0);
  // All cards an account can spend: those sent to its number, plus codes it typed in manually
  const cardsFor = (acc) => { if (!acc) return []; const seen = new Set(); const out = []; forPhone(acc.phone).concat((acc.extraGiftCodes || []).map(byCode).filter(Boolean)).forEach((x) => { if (!seen.has(x.code)) { seen.add(x.code); out.push(x); } }); return out; };
  const spendable = (acc) => cardsFor(acc).filter(active).sort((a, b) => (a.expires || '').localeCompare(b.expires || ''));
  const balanceFor = (acc) => spendable(acc).reduce((a, x) => a + x.balance, 0);
  // Drain cards soonest-to-expire first; returns the parts actually taken
  const redeemFrom = (acc, amount, ref, what) => { const parts = []; let left = amount; for (const c of spendable(acc)) { if (left <= 0) break; const used = redeem(c.code, left, ref, what); if (used > 0) { parts.push({ code: c.code, amount: used }); left -= used; } } return parts; };
  const refundParts = (parts, ref) => (parts || []).forEach((p) => refund(p.code, p.amount, ref));
  window.IncensoGift = { load, issue, update, byCode, forPhone, boughtBy, active, redeem, refund, confirm, confirmed, pending, attach, totalFor, same, cardsFor, spendable, balanceFor, redeemFrom, refundParts };
})();
