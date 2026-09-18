/* Incenso Studio — shared chrome (header/footer injection + behaviors) for account/booking pages */
(() => {
  const WORDMARK = "<svg class=\"wordmark\" viewBox=\"8 76 1282 226\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\"><path class=\"wordmark-o\" d=\"M984 189.676C984 145.506 1007.35 106.459 1045.99 89.6959C1058.86 84.1134 1073.44 81 1089.42 81C1104.88 81 1119.21 83.8833 1132.45 89.1591C1145.74 94.4656 1158.61 102.425 1171.92 112.854C1186.18 122.44 1204.38 132.7 1226.24 143.083C1248.11 153.466 1268.29 164.923 1278.49 178.496C1288.48 191.808 1284.77 206.378 1268.26 221.484C1259.99 229.045 1249.57 236.637 1238.27 243.876C1226.97 251.13 1214.87 257.924 1203.23 264.09C1179.98 276.282 1159.68 284.564 1141.54 289.288C1123.51 293.858 1106.92 296.558 1090.42 296.542C1074.56 296.573 1060.21 293.69 1047.37 288.414C1008.84 272.556 984 235.18 984 189.676ZM1100.66 280.914C1116.94 281.129 1140.85 277.985 1167.52 265.9C1180.95 259.857 1196.3 250.195 1210.71 237.956C1225.11 225.717 1235.17 211.746 1233.01 197.068C1230.81 182.115 1213.73 170.014 1195.25 159.125C1176.76 148.098 1161.34 137.117 1149.18 127.194C1137.32 117.087 1126.04 109.557 1114.71 104.542C1103.42 99.5574 1091.8 96.8888 1080.3 96.8888C1065.42 96.8888 1047.6 101.383 1033.51 113.453C1019.42 125.523 1009.04 145.184 1009.04 175.52C1009.04 205.856 1019.94 232.88 1036.56 251.391C1053.19 269.902 1075.7 280.638 1100.66 280.899V280.914Z\"></path><path d=\"M13.5156 285V89.7H39.0156V285H13.5156ZM192.182 285L82.682 117.6V285H56.582V90H90.782L198.782 255.6V90H224.582V285H192.182ZM340.877 288.6C282.977 288.6 238.877 250.2 238.877 187.5C238.877 124.8 282.977 86.4 340.877 86.4C392.777 86.4 433.577 117.6 438.077 164.7H411.377C407.177 131.1 376.877 109.2 340.577 109.2C299.177 109.2 264.977 138 264.977 187.2C264.977 236.7 299.477 265.5 340.877 265.5C377.477 265.5 407.777 243 411.977 204.9H438.077C434.177 256.8 393.677 288.6 340.877 288.6ZM454.434 285V90H605.334V112.8H479.634V175.2H596.334V198H479.634V262.2H604.134V285H454.434ZM756.44 285L646.94 117.6V285H620.84V90H655.04L763.04 255.6V90H788.84V285H756.44ZM890.378 288.6C845.078 288.6 804.278 268.8 804.878 222.3H831.278C831.578 254.7 857.678 266.7 889.778 266.7C913.178 266.7 939.578 256.8 939.578 232.5C939.578 207 912.878 201.9 883.178 197.4C847.778 192.3 809.378 186.3 809.378 141.9C809.378 108.3 838.478 86.4 879.578 86.4C932.678 86.4 959.078 116.4 959.078 147.9H932.078C931.778 123.3 911.678 108 879.578 108C854.078 108 835.178 121.8 835.178 142.2C835.178 168 861.578 169.8 890.978 174.6C926.078 180.3 965.678 186.9 965.378 231.9C965.078 267 930.878 288.6 890.378 288.6Z\"></path></svg>";
  const CART_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l1.4 10.3a1.4 1.4 0 0 0 1.4 1.2h8a1.4 1.4 0 0 0 1.4-1.1l1.3-6.4H6"></path><circle cx="9" cy="20" r="1.4"></circle><circle cx="17" cy="20" r="1.4"></circle></svg><span class="cart-badge" data-count="0">0</span>';
  const NAV = '<a href="Shop.html">Shop</a>' +
    '<div class="has-menu" aria-expanded="false"><button type="button" class="nav-item" aria-haspopup="true" aria-expanded="false" aria-controls="services-menu"><span>Services</span><svg class="caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4 L5 7 L8 4"></path></svg></button>' +
    '<div class="nav-menu" id="services-menu" role="menu"><a href="Hair.html" role="menuitem">Hair</a><a href="Nails.html" role="menuitem">Nails</a><a href="Makeup.html" role="menuitem">Make-up</a><a href="Brows-Lashes.html" role="menuitem">Brows &amp; Lashes</a></div></div>' +
    '<a href="Our-Work.html">Our Work</a><a href="The-Space.html">The Space</a><a href="Vouchers.html">Gift</a>';
  const header = document.createElement('header');
  header.className = 'topbar';
  header.innerHTML = '<div class="tb-l"><a class="tb-cart tb-cart-left" href="Cart.html" aria-label="Cart">' + CART_SVG + '</a>' +
    '<a class="wm-link" href="Home.html" aria-label="Incenso Studio — home">' + WORDMARK + '</a></div>' +
    '<div class="tb-c"><nav class="nav" aria-label="Primary">' + NAV + '</nav></div>' +
    '<div class="tb-r"><a class="tb-book" href="Book.html">Book</a><a class="tb-cart" href="Cart.html" aria-label="Cart">' + CART_SVG + '</a>' +
    '<a class="tb-cart tb-account" href="Account.html" data-account-btn aria-label="Sign in"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.4"></circle><path d="M5 19.5c1.3-3.2 4-4.8 7-4.8s5.7 1.6 7 4.8"></path></svg></a>' +
    '<button type="button" class="menu-toggle" id="menuToggle" aria-label="Open menu" aria-expanded="false" aria-controls="mobileNav"><svg class="icon-open" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M2 5 H14 M2 11 H14"></path></svg><svg class="icon-close" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13"></path></svg></button></div>';
  const mnav = document.createElement('nav');
  mnav.className = 'mobile-nav';
  mnav.id = 'mobileNav';
  mnav.setAttribute('aria-label', 'Mobile primary');
  mnav.setAttribute('aria-hidden', 'true');
  mnav.innerHTML = '<a href="Book.html">Book an appointment</a><a href="Shop.html">Shop</a>' +
    '<details class="m-services"><summary><span>Services</span><svg class="m-caret" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 4 L5 7 L8 4"></path></svg></summary>' +
    '<div class="m-sub"><a href="Hair.html">Hair</a><a href="Nails.html">Nails</a><a href="Makeup.html">Make-up</a><a href="Brows-Lashes.html">Brows &amp; Lashes</a></div></details>' +
    '<a href="Our-Work.html">Our Work</a><a href="The-Space.html">The Space</a><a href="Vouchers.html">Gift</a>' +
    '<a href="Account.html" data-account-btn>Account</a>';
  const footer = document.createElement('footer');
  footer.innerHTML = '<div class="news-row"><p class="news-line">Be first to hear — new services, quiet offers, studio news.</p>' +
    '<form class="news-form" id="newsForm"><div class="phone-combo news-combo"><select name="cc" class="pc-cc" aria-label="Country code"></select><input type="tel" name="email" inputmode="tel" placeholder="Phone number" aria-label="Phone number" required /></div>' +
    '<button type="submit" class="news-btn">Subscribe<svg viewBox="0 0 30 30" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="15" cy="15" r="13.5"></circle><path d="M10 15 H20 M16 11 L20 15 L16 19"></path></svg></button></form></div>' +
    '<div class="foot-cols"><div class="f-col"><span>© Incenso Studio</span>' +
    '<span class="ticker" aria-live="polite"><span class="ticker-dot" aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 L13.5 8 L8 14 L2.5 8 Z"></path></svg></span><span class="ticker-text">Open daily 10 AM – 7 PM</span></span>' +
    '<a href="https://www.google.com/maps/place//data=!4m2!3m1!1s0x1521f75831aec263:0x491dc69a84008be5?sa=X&ved=1t:8290&ictx=111" target="_blank" rel="noopener">Tripoli · Lebanon</a></div>' +
    '<div class="f-col"><a href="Terms.html">Terms &amp; Conditions</a><a href="Shipping.html">Shipping</a><a href="Privacy.html">Privacy</a></div>' +
    '<div class="f-col"><a href="https://wa.me/96171930290" target="_blank" rel="noopener">WhatsApp</a><a href="https://instagram.com/incensostudio" target="_blank" rel="noopener">Instagram</a><a href="https://tiktok.com/@incensostudio" target="_blank" rel="noopener">TikTok</a></div></div>';

  document.body.insertBefore(mnav, document.body.firstChild);
  document.body.insertBefore(header, document.body.firstChild);
  document.body.appendChild(footer);

  // Mark the current page in the nav
  const here = decodeURIComponent(location.pathname.split('/').pop() || 'Home.html');
  document.querySelectorAll('.topbar a[href], .mobile-nav a[href]').forEach((a) => { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  // Cart badge
  try {
    const n = parseInt(localStorage.getItem('incenso-cart-count') || '0', 10) || 0;
    document.querySelectorAll('.cart-badge').forEach((b) => { b.dataset.count = n; b.textContent = n; });
  } catch (e) {}

  // News form
  const newsForm = document.getElementById('newsForm');
  if (newsForm) {
    newsForm.email.addEventListener('input', () => newsForm.email.setCustomValidity(''));
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const raw = newsForm.email.value;
      const digits = raw.replace(/\D/g, '');
      if (raw.includes('+')) { newsForm.email.setCustomValidity('Just the number \u2014 the country code is picked on the left'); newsForm.email.reportValidity(); return; }
      if (digits.length < 6 || digits.length > 12) { newsForm.email.setCustomValidity('Enter a valid phone number'); newsForm.email.reportValidity(); return; }
      newsForm.innerHTML = '<span class="news-done">Noted \u2726 We\u2019ll keep you up to date</span>';
    });
  }

  // Open/closed ticker (Asia/Beirut)
  const OPEN_MIN = 10 * 60;
  const closeMinFor = (day) => (day === 5 || day === 6 ? 20 * 60 : 19 * 60);
  const fmt = (mins) => {
    const h24 = Math.floor(mins / 60), m = mins % 60;
    const h = ((h24 + 11) % 12) + 1;
    return h + (m ? ':' + String(m).padStart(2, '0') : '') + ' ' + (h24 >= 12 ? 'PM' : 'AM');
  };
  const updateStatus = () => {
    const beirut = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
    const nowMin = beirut.getHours() * 60 + beirut.getMinutes();
    const CLOSE_MIN = closeMinFor(beirut.getDay());
    const isOpen = nowMin >= OPEN_MIN && nowMin < CLOSE_MIN;
    const text = isOpen ? 'Open · closes ' + fmt(CLOSE_MIN) : 'Closed · opens ' + fmt(OPEN_MIN);
    document.querySelectorAll('.ticker-text').forEach((t) => { t.textContent = text; });
    document.querySelectorAll('.ticker .ticker-dot').forEach((d) => { d.style.setProperty('--dot-c', isOpen ? '#1F9A56' : '#C81E2D'); });
  };
  updateStatus();
  setInterval(updateStatus, 60000);

  // Scrolled bar
  const onScroll = () => document.body.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const mToggle = document.getElementById('menuToggle');
  mToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    mToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    mToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    mnav.setAttribute('aria-hidden', open ? 'false' : 'true');
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) mToggle.click();
  });
  mnav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      document.body.classList.remove('menu-open');
      mToggle.setAttribute('aria-expanded', 'false');
      mToggle.setAttribute('aria-label', 'Open menu');
      mnav.setAttribute('aria-hidden', 'true');
    }
  });

  // Services dropdown
  document.querySelectorAll('.nav .has-menu').forEach((w) => {
    const trigger = w.querySelector('[aria-haspopup]');
    const sync = (open) => {
      w.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    if (trigger) trigger.addEventListener('click', (e) => { e.stopPropagation(); sync(w.getAttribute('aria-expanded') !== 'true'); });
    w.addEventListener('mouseenter', () => sync(true));
    w.addEventListener('mouseleave', () => sync(false));
    document.addEventListener('click', () => sync(false));
  });
})();
