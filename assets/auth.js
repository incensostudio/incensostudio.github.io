/* Incenso Studio — shared account + OTP sign-in (demo: no backend, code is shown on screen) */
(() => {
  const AKEY = 'incenso-account', SKEY = 'incenso-signedin';
  const MKEY = 'incenso-accounts';
  const digits = (p) => String(p || '').replace(/\D/g, '');
  const all = () => { try { return JSON.parse(localStorage.getItem(MKEY) || '{}') || {}; } catch (e) { return {}; } };
  const findByPhone = (p) => { const d = digits(p); if (d.length < 6) return null; const m = all(); const k = Object.keys(m).find((x) => x === d || x.endsWith(d) || d.endsWith(x)); return k ? m[k] : null; };
  const get = () => { try { return JSON.parse(localStorage.getItem(AKEY) || 'null'); } catch (e) { return null; } };
  const set = (a) => { try { localStorage.setItem(AKEY, JSON.stringify(a)); const m = all(); m[digits(a.phone)] = a; localStorage.setItem(MKEY, JSON.stringify(m)); } catch (e) {} };
  const signedIn = () => { try { return localStorage.getItem(SKEY) === '1' && !!get(); } catch (e) { return false; } };

  const TIERS = [
    { name: 'Member',  min: 0,    color: '#CFDFDD', perk: 'Welcome — every dollar counts toward Insider' },
    { name: 'Insider', min: 500,  color: '#EED4D3', perk: '10% off everything — services and the shelf' },
    { name: 'Loyal',   min: 1000, color: '#EFE2AF', perk: '20% off everything — services and the shelf' },
  ];
  const tierFor = (spend) => TIERS.filter((t) => spend >= t.min).pop();
  const nextTier = (spend) => TIERS.find((t) => spend < t.min) || null;
  // Rolling 12-month spend — recomputed daily from dated visits + orders, so levels ease off as old spend ages out
  const yearSpend = (acc) => {
    if (!acc) return 0;
    const cutoff = Date.now() - 365 * 24 * 3600 * 1000;
    let s = 0;
    (acc.visits || []).forEach((v) => { if (new Date(v.date + 'T12:00:00').getTime() >= cutoff) s += v.price || 0; });
    (acc.orders || []).forEach((o) => { if (!/cancel/i.test(o.status || '') && new Date(o.date + 'T12:00:00').getTime() >= cutoff) s += o.total || 0; });
    (acc.bookings || []).forEach((b) => { const t = new Date(b.date + 'T23:59:59').getTime(); if (!/cancel/i.test(b.status || '') && t < Date.now() && t >= cutoff) s += b.price || 0; });
    return s;
  };

  const seed = (name, phone, email) => ({ name, phone, email: email || '', created: new Date().toISOString(), visits: [], orders: [], bookings: [] });

  // ---- Modal ----
  const css = '.au{position:fixed;inset:0;z-index:60;display:grid;place-items:center;padding:clamp(16px,3vw,40px);opacity:0;pointer-events:none;transition:opacity 240ms cubic-bezier(0.16,1,0.3,1)}' +
  '.au.open{opacity:1;pointer-events:auto}body.au-open{overflow:hidden}' +
  '.au-scrim{position:absolute;inset:0;background:rgba(30,26,18,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}' +
  '.au-card{position:relative;z-index:1;width:min(420px,100%);background:#FEFEF1;border:1px solid rgba(0,0,0,0.25);box-shadow:0 24px 64px rgba(0,0,0,0.28);padding:clamp(26px,4vw,36px);transform:translateY(10px) scale(0.985);transition:transform 280ms cubic-bezier(0.16,1,0.3,1)}' +
  '.au.open .au-card{transform:none}' +
  '.au-close{position:absolute;right:10px;top:10px;appearance:none;width:34px;height:34px;border-radius:999px;border:1px solid rgba(0,0,0,0.18);background:transparent;color:#000;font-size:19px;line-height:1;display:grid;place-items:center;cursor:pointer;padding:0 0 2px;transition:background-color 180ms}' +
  '.au-close:hover{background:rgba(0,0,0,0.06)}' +
  '.au-kicker{font-family:var(--font-mono,monospace);font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:rgba(0,0,0,0.45);margin:0 0 10px}' +
  '.au-title{font-weight:600;font-size:22px;letter-spacing:-0.015em;margin:0 0 8px}' +
  '.au-sub{margin:0 0 20px;font-size:13px;line-height:1.55;color:rgba(0,0,0,0.62)}' +
  '.au-field{display:flex;flex-direction:column;gap:7px;margin-bottom:14px}' +
  '.au-field label{font-size:13px;font-weight:500}' +
  '.au-field input{appearance:none;width:100%;height:44px;padding:0 18px;border-radius:999px;border:1px solid rgba(0,0,0,0.25);background:rgba(229,220,201,0.25);font:inherit;font-size:14px;color:#000}' +
  '.au-field input:focus{outline:none;border-color:rgba(0,0,0,0.6)}' +
  '.au-btn{appearance:none;display:flex;align-items:center;justify-content:center;width:100%;height:46px;border-radius:999px;border:0;background:#000;color:#FEFEF1;font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:transform 160ms}' +
  '.au-btn:active{transform:scale(0.98)}' +
  '.au-code{display:flex;gap:10px;justify-content:center;margin:6px 0 16px}' +
  '.au-code input{width:52px;height:58px;text-align:center;font-family:var(--font-mono,monospace);font-size:22px;font-weight:600;border:1px solid rgba(0,0,0,0.25);border-radius:12px;background:rgba(229,220,201,0.25);color:#000}' +
  '.au-code input:focus{outline:none;border-color:#000}' +
  '.au-sms{display:flex;align-items:center;gap:10px;margin:0 0 16px;padding:12px 16px;border:1px dashed rgba(0,0,0,0.3);background:rgba(229,220,201,0.3);font-size:13px;line-height:1.45}' +
  '.au-sms .c{font-family:var(--font-mono,monospace);font-weight:600;font-size:16px;letter-spacing:0.14em}' +
  '.au-err{color:#C81E2D;font-size:12px;margin:-6px 0 12px;display:none}' +
  '.au-alt{margin:14px 0 0;font-size:12px;color:rgba(0,0,0,0.55);text-align:center}' +
  '.au-alt button{appearance:none;border:0;background:none;font:inherit;font-weight:600;color:#000;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:0}' +
  '.au-photo{display:flex;align-items:center;gap:14px;margin-bottom:14px}' +
  '.au-photo .av{width:56px;height:56px;border-radius:999px;border:1px dashed rgba(0,0,0,0.35);background:rgba(229,220,201,0.3) center/cover no-repeat;display:grid;place-items:center;flex:none;overflow:hidden}' +
  '.au-photo .av svg{width:20px;height:20px;opacity:0.4}' +
  '.au-photo .av.filled{border-style:solid}' +
  '.au-photo .av.filled svg{display:none}' +
  '.au-photo-btn{appearance:none;border:1px solid rgba(0,0,0,0.3);background:transparent;border-radius:999px;height:36px;padding:0 18px;font:inherit;font-size:13px;font-weight:500;color:#000;cursor:pointer;transition:background-color 160ms}' +
  '.au-photo-btn:hover{background:rgba(0,0,0,0.05)}' +
  '.au-photo .hint{font-size:11px;color:rgba(0,0,0,0.45);margin:6px 0 0}' +
  '[data-account-btn].has-photo{background-size:cover;background-position:center;border-color:rgba(0,0,0,0.35)}' +
  '[data-account-btn].has-photo svg{display:none}';

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'au';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="au-scrim"></div><div class="au-card"><button type="button" class="au-close" aria-label="Close">&times;</button><div class="au-body"></div></div>';
  const mount = () => { if (!el.isConnected) document.body.appendChild(el); };
  const body = () => el.querySelector('.au-body');

  let onDone = null, code = '', pendingPhone = '';
  const open = (cb, prefill) => { mount(); onDone = cb || null; stepPhone(prefill); el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); document.body.classList.add('au-open'); };
  const close = () => { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('au-open'); };

  const stepPhone = (prefill) => {
    const acc = get();
    const pre = prefill || (acc ? String(acc.phone) : '');
    body().innerHTML = '<p class="au-kicker">Incenso Studio</p><h2 class="au-title">Enter your phone to continue</h2>' +
      '<p class="au-sub">Enter your number and we\u2019ll send a one-time verification code \u2014 no password needed. If you\u2019re new, your account is created automatically.</p>' +
      '<form id="auPhoneForm"><div class="au-field"><label for="auPhone">Phone</label><div class="phone-combo"><select class="pc-cc" aria-label="Country code"></select><input id="auPhone" type="tel" inputmode="tel" placeholder="Phone number" required value="' + pre.replace(/^\+[\d]+\s*/, '') + '" /></div></div>' +
      '<button type="submit" class="au-btn">Send code</button></form>';
    if (window.IncensoPhone) window.IncensoPhone.fill(body());
    const preCC = String(pre).match(/^\+\d+/);
    if (preCC) { const sel = body().querySelector('.pc-cc'); if (sel) sel.value = preCC[0]; }
    body().querySelector('#auPhoneForm').addEventListener('submit', (e) => {
      e.preventDefault();
      pendingPhone = (body().querySelector('.pc-cc').value + ' ' + body().querySelector('#auPhone').value.trim()).trim();
      code = String(Math.floor(1000 + Math.random() * 9000));
      stepCode();
    });
  };

  const stepCode = () => {
    body().innerHTML = '<p class="au-kicker">Verify</p><h2 class="au-title">Enter the code</h2>' +
      '<p class="au-sub">Sent by SMS to ' + pendingPhone + '.</p>' +
      '<form id="auCodeForm"><div class="au-code">' +
      [0,1,2,3].map((i) => '<input type="text" inputmode="numeric" maxlength="1" aria-label="Digit ' + (i+1) + '" />').join('') +
      '</div><p class="au-err" id="auErr">Enter the 4-digit code from the SMS.</p>' +
      '<button type="submit" class="au-btn">Verify</button></form>' +
      '<p class="au-alt" id="auResendRow">Didn\u2019t get it? <button type="button" id="auResend">Send code again</button></p>' +
      '<p class="au-alt">Wrong number? <button type="button" id="auBack">Go back</button></p>';
    const inputs = [...body().querySelectorAll('.au-code input')];
    inputs[0].focus();
    inputs.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 1); if (inp.value && inputs[i + 1]) inputs[i + 1].focus(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && inputs[i - 1]) inputs[i - 1].focus(); });
    });
    body().querySelector('#auBack').addEventListener('click', stepPhone);
    const resend = body().querySelector('#auResend');
    resend.addEventListener('click', () => {
      code = String(Math.floor(1000 + Math.random() * 9000));
      inputs.forEach((x) => { x.value = ''; });
      inputs[0].focus();
      resend.disabled = true;
      const row = body().querySelector('#auResendRow');
      let left = 30;
      row.childNodes[0].textContent = 'Code sent \u2014 again in ' + left + 's ';
      resend.style.display = 'none';
      const t = setInterval(() => {
        left -= 1;
        if (left <= 0) { clearInterval(t); row.childNodes[0].textContent = 'Didn\u2019t get it? '; resend.style.display = ''; resend.disabled = false; return; }
        row.childNodes[0].textContent = 'Code sent \u2014 again in ' + left + 's ';
      }, 1000);
    });
    body().querySelector('#auCodeForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = inputs.map((x) => x.value).join('');
      if (entered.length !== 4) { body().querySelector('#auErr').style.display = 'block'; return; }
      const acc = findByPhone(pendingPhone);
      if (acc) { finish(acc); } else { stepDetails(); }
    });
  };

  const stepDetails = () => {
    body().innerHTML = '<p class="au-kicker">New account</p><h2 class="au-title">Almost there</h2>' +
      '<p class="au-sub">So we know who\u2019s in the chair \u2014 and where to send updates.</p>' +
      '<form id="auDetForm"><div class="au-field"><label for="auName">Full name</label><input id="auName" type="text" autocomplete="name" required /></div>' +
      '<div class="au-field"><label for="auEmail">E-mail</label><input id="auEmail" type="email" autocomplete="email" required /></div>' +
      '<div class="au-field"><label>Photo <span style="font-weight:400;color:rgba(0,0,0,0.45)">\u2014 optional</span></label>' +
      '<div class="au-photo"><span class="av" id="auAv"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"></circle><path d="M5 19.5c1.3-3.2 4-4.8 7-4.8s5.7 1.6 7 4.8"></path></svg></span>' +
      '<span><button type="button" class="au-photo-btn" id="auPhotoBtn">Upload photo</button><p class="hint">JPG or PNG, up to 5 MB</p></span>' +
      '<input id="auPhoto" type="file" accept="image/*" hidden /></div></div>' +
      '<button type="submit" class="au-btn">Create account</button></form>';
    let photoData = '';
    const photoInput = body().querySelector('#auPhoto');
    const av = body().querySelector('#auAv');
    body().querySelector('#auPhotoBtn').addEventListener('click', () => photoInput.click());
    photoInput.addEventListener('change', () => {
      const f = photoInput.files && photoInput.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => { photoData = r.result; av.style.backgroundImage = 'url(' + photoData + ')'; av.classList.add('filled'); body().querySelector('#auPhotoBtn').textContent = 'Change photo'; };
      r.readAsDataURL(f);
    });
    body().querySelector('#auDetForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const acc = seed(body().querySelector('#auName').value.trim(), pendingPhone, body().querySelector('#auEmail').value.trim());
      if (photoData) acc.photo = photoData;
      finish(acc, true);
    });
  };

  const finish = (acc) => {
    if (window.IncensoGift) window.IncensoGift.attach(acc);
    set(acc);
    try { localStorage.setItem(SKEY, '1'); } catch (e) {}
    syncButtons();
    close();
    if (onDone) onDone(acc);
  };

  el.addEventListener('click', (e) => { if (e.target.closest('.au-scrim') || e.target.closest('.au-close')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && el.classList.contains('open')) close(); });

  // ---- Account buttons ([data-account-btn]) ----
  const syncButtons = () => {
    const acc = signedIn() ? get() : null;
    document.querySelectorAll('[data-account-btn]').forEach((b) => {
      b.setAttribute('aria-label', signedIn() ? 'Your account' : 'Sign in');
      b.classList.toggle('signed', signedIn());
      const ph = acc && acc.photo;
      b.classList.toggle('has-photo', !!ph);
      b.style.backgroundImage = ph ? 'url(' + ph + ')' : '';
    });
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-account-btn]');
    if (!b) return;
    e.preventDefault();
    if (signedIn()) location.href = 'Account.html';
    else open(() => { location.href = 'Account.html'; });
  });

  const signOut = () => { try { localStorage.setItem(SKEY, '0'); } catch (e) {} syncButtons(); };

  window.IncensoAuth = { get, set, signedIn, open, close, signOut, tierFor, nextTier, yearSpend, TIERS, sync: syncButtons, findByPhone, all };

  // ---- Newsletter subscribe: members pass straight through, new numbers sign up first ----
  document.addEventListener('submit', (e) => {
    const nf = e.target && e.target.id === 'newsForm' ? e.target : null;
    if (!nf) return;
    e.preventDefault();
    e.stopPropagation();
    const raw = nf.email.value;
    const digits = raw.replace(/\D/g, '');
    if (raw.includes('+')) { nf.email.setCustomValidity('Just the number \u2014 the country code is picked on the left'); nf.email.reportValidity(); return; }
    if (digits.length < 6 || digits.length > 12) { nf.email.setCustomValidity('Enter a valid phone number'); nf.email.reportValidity(); return; }
    const done = () => { nf.innerHTML = '<span class="news-done">Noted \u2726 We\u2019ll keep you up to date</span>'; };
    const acc = get();
    const accDigits = acc ? String(acc.phone).replace(/\D/g, '') : '';
    if (acc && accDigits && (accDigits === digits || accDigits.endsWith(digits) || digits.endsWith(accDigits))) { done(); return; }
    const cc = nf.querySelector('.pc-cc');
    open(done, ((cc ? cc.value : '') + ' ' + raw.trim()).trim());
  }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncButtons);
  else syncButtons();
})();
