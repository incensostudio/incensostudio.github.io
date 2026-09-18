/* Incenso Studio — shop products, admin-editable from Supabase.
   Products live in the web_products table (admin edits price/stock/copy there).
   The shop keeps a synchronous localStorage cache so the shelf paints instantly,
   then refreshes from Supabase and fires 'products:updated' if anything changed.
   Stock: null/undefined = in stock (unlimited), 0 = sold out, >0 = limited count. */
(() => {
  const SB = window.SB;
  const CKEY = 'incenso-products';

  // Design fallback — used before the first Supabase fetch, and if offline.
  const FALLBACK = [
    { cat: 'hair',  name: 'Ritual Hair Oil',     note: 'Bergamot + cedar. Three drops, ends first.',   price: 28, details: 'Cold-pressed jojoba base with bergamot peel and Atlas cedar. Worked through mid-lengths and ends after every blow-out at the studio. 30 ml, glass dropper.' },
    { cat: 'hair',  name: 'Repair Mask',         note: 'Deep treatment for color-tired lengths.',      price: 32, stock: 2, details: 'A ten-minute bond-building treatment we reach for after color work. Fine hair takes a coin-size amount; thick hair, two. 200 ml jar.' },
    { cat: 'hair',  name: 'Silk Scrunchie Trio', note: 'Mulberry silk, studio neutrals.',              price: 14, details: '22-momme mulberry silk in three studio neutrals — bone, sand, ink. No creases, no snags, survives a whole appointment book.' },
    { cat: 'hair',  name: 'Wide-Tooth Comb',     note: 'Acetate, hand-polished. Wet-hair safe.',       price: 11, details: 'Hand-polished acetate, seamless teeth. The only thing we let near wet hair. Fits a handbag pocket.' },
    { cat: 'nails', name: 'Cuticle Oil Pen',     note: 'Jojoba blend — the one on every station.',     price: 12, details: 'Jojoba, vitamin E and a trace of the studio scent in a click-pen brush. Lives on every station — now on your desk. 4 ml.' },
    { cat: 'nails', name: 'Glass File Duo',      note: 'Etched glass, seals as it shapes.',            price: 9,  stock: 1, details: 'Etched Bohemian glass in two grits. Seals the nail edge as it shapes, so polish holds longer. Sleeve included.' },
    { cat: 'nails', name: 'Studio Top Coat',     note: 'High-gloss seal between visits.',              price: 10, details: 'The high-gloss seal we finish every set with. One thin coat every third day keeps a manicure honest between visits. 11 ml.' },
    { cat: 'body',  name: 'Hand Cream',          note: 'Fast-sinking, incense-trace scent.',           price: 16, details: 'Shea and squalane, sinks in before you pick your phone back up. The incense-trace scent fades within the hour. 50 ml tube.' },
    { cat: 'body',  name: 'Body Mist',           note: 'Warm amber. A veil, not a statement.',         price: 22, details: 'Warm amber and a little smoke — a veil, not a statement. Mist once at the collarbone, walk through the rest. 100 ml.' },
    { cat: 'home',  name: 'Incenso Sticks №1',   note: 'Our namesake blend. 20 sticks, slow burn.',    price: 18, details: 'Our namesake blend: frankincense, cedar and a citrus lift. 20 hand-rolled sticks, roughly 40 minutes of slow burn each.' },
    { cat: 'home',  name: 'Ceramic Burner',      note: 'Unglazed stoneware, catches its own ash.',     price: 26, stock: 0, details: 'Unglazed stoneware thrown for us in small batches. The lip catches its own ash; the base stays cool on wood.' },
    { cat: 'home',  name: 'Studio Candle',       note: 'The scent of the space, 40-hour pour.',        price: 30, details: 'The exact scent of the space, poured into a 40-hour candle. Cotton wick, reusable vessel worth keeping.' },
  ];

  const fromRow = (r) => {
    const p = { cat: r.cat, name: r.name, note: r.note || '', price: r.price, details: r.details || '' };
    if (r.stock !== null && r.stock !== undefined) p.stock = r.stock; // null → unlimited (omit)
    return p;
  };

  let list = FALLBACK;
  try {
    const cached = JSON.parse(localStorage.getItem(CKEY) || 'null');
    if (cached && Array.isArray(cached) && cached.length) list = cached;
  } catch (e) {}

  window.IncensoProducts = {
    get list() { return list; },
    ready: Promise.resolve(list),
  };

  if (!SB) return;
  window.IncensoProducts.ready = SB.from('web_products')
    .select('*').eq('active', true).order('sort', { ascending: true })
    .then(({ data, error }) => {
      if (error || !data || !data.length) return list;
      const next = data.map(fromRow);
      const changed = JSON.stringify(next) !== JSON.stringify(list);
      list = next;
      try { localStorage.setItem(CKEY, JSON.stringify(list)); } catch (e) {}
      if (changed) document.dispatchEvent(new CustomEvent('products:updated', { detail: list }));
      return list;
    }, () => list);
})();
