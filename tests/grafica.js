// Nuova grafica e Budget in Analisi: moduli in una schermata a più altezze di iPhone, casi limite dei budget,
// tema Automatico (senza cambiare il formato dati), colore della barra di stato, importi lunghi, aree toccabili.
const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
const A = (p, n, ds) => p.evaluate(([n, ds]) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); __UF.act(n, e); }, [n, ds || {}]);
async function page(b, w, h, o) {
  const ctx = await b.newContext(Object.assign({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true }, o || {}));
  await ctx.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.errs = errs;
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1000);
  return { ctx, p };
}
(async () => {
  const b = await chromium.launch();

  // ---------- 1. ogni modulo sta in una schermata (iPhone SE, 13 mini/15, 15 Pro Max) ----------
  for (const [w, h] of [[375, 667], [375, 768], [390, 844], [430, 932]]) {
    const { ctx, p } = await page(b, w, h);
    const r = await p.evaluate(() => {
      const U = __UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); };
      const P = U.S.pos.find(x => x.kind !== 'crypto').id, out = [];
      const F = [['nuovo movimento', () => A('add')], ['giroconto', () => A('giro')], ['nuovo conto', () => A('newacc')], ['nuovo conto con obiettivo', () => { A('newacc'); A('agoal'); }], ['modifica conto', () => A('accedit', { id: U.S.accounts[0].id })],
        ['categoria', () => { A('managecats', { k: 'spesa' }); A('editcat', { id: U.S.cats[0].id }); }], ['nuova categoria', () => { A('managecats', { k: 'spesa' }); A('newcatm', { k: 'spesa' }); }],
        ['nuovo investimento', () => A('newpos')], ['già posseduto', () => { A('newpos'); A('pmode', { m: 'have' }); }], ['nuova cripto', () => { A('newpos'); A('pkind', { k: 'crypto' }); }],
        ['acquisto', () => A('lotnew', { id: P, dir: 'buy' })], ['vendita', () => A('lotnew', { id: P, dir: 'sell' })], ['aggiorna valore', () => A('pricenew', { id: P })], ['aggiorna valori', () => A('pxall')],
        ['PAC', () => A('pacnew', { id: P })], ['ricorrenza', () => { A('rules'); A('ruleopen', { id: U.S.rules.find(x => x.type !== 'pac').id }); }],
        ['sottotipologia', () => { A('managesubs'); A('editsub', { id: U.S.subs[0].id }); }], ['elimina conto', () => A('delaccopen', { id: U.S.accounts[0].id })], ['elimina investimento', () => A('delposopen', { id: P })], ['voce', () => A('voice')]];
      for (const [n, f] of F) { U.closeAll(); f(); const l = U.L[U.L.length - 1].el, s = l.querySelector('.scrb'); if (s.scrollHeight > s.clientHeight + 1) out.push(n + ' (+' + (s.scrollHeight - s.clientHeight) + ' px)'); }
      U.closeAll(); return out;
    });
    ok(!r.length, `${w}×${h}: tutti i moduli stanno in una schermata${r.length ? ' — scorrono: ' + r.join(', ') : ''}`);
    await ctx.close();
  }

  const { ctx, p } = await page(b, 390, 844);
  // ---------- 2. Budget: posizione e casi limite ----------
  ok(await p.evaluate(() => !document.querySelector('#view .pbar, #view .budrow')), 'Home: nessuna barra dei budget');
  await A(p, 'tab', { tab: 'analisi' }); await tick(p);
  ok(await p.evaluate(() => document.querySelector('[data-act="anview"][data-v="ov"]').classList.contains('on') && !!document.querySelector('[data-act="per"]')), 'Analisi parte da Panoramica (periodo e filtro conti presenti)');
  await A(p, 'anview', { v: 'bud' }); await tick(p);
  ok(await p.evaluate(() => !document.querySelector('[data-act="per"], [data-act="anacc"], [data-act="anpers"]')), 'Budget: niente selettore di periodo, filtro conti e «Vista»');
  ok(await p.evaluate(() => /novembre 2026/i.test(document.querySelector('#view .nav .lb').textContent) && document.querySelector('[data-act="budnext"]').disabled), 'Budget: selettore del mese su novembre 2026, «successivo» disattivato');
  ok((await p.textContent('#view')).includes('Imposta budget'), 'Budget: senza limiti mostra lo stato vuoto con «Imposta budget» (nessuna barra a zero)');
  ok(await p.evaluate(() => !document.querySelector('#view .pbar') && !/NaN|Infinity/.test(document.querySelector('#view').textContent)), 'Budget vuoto: nessuna barra, nessun NaN/Infinity');
  // limiti: Alimentari 1 € (oltre), Trasporti molto alto; totale ≠ 0
  await p.evaluate(() => { const S = __UF.S; S.cats.find(c => c.id === 'c1').budget = 100; S.cats.find(c => c.id === 'c2').budget = 99999900; __UF.render(); });
  await tick(p);
  const over = await p.evaluate(() => {
    const row = document.querySelector('[data-act="budtx"][data-id="c1"]'), bar = row.querySelector('.pbar'), fill = bar.querySelector('b');
    return { txt: row.textContent, inside: fill.getBoundingClientRect().width <= bar.getBoundingClientRect().width + 0.5, pace: !!row.querySelector('.pace') };
  });
  ok(/Oltre il limite: −/.test(over.txt) && /Oltre/.test(over.txt), 'categoria oltre il 100%: stato «Oltre» e importo con segno − (' + over.txt.replace(/\s+/g, ' ').slice(0, 80) + ')');
  ok(over.inside, 'barra oltre il 100%: piena ma dentro il contenitore');
  ok(await p.evaluate(() => /Oltre/.test(document.querySelector('.budsum .badge').textContent) && /1 categoria oltre il limite/.test(document.querySelector('.budsum').textContent)), 'riepilogo: «Oltre» se una categoria supera il limite, anche se il totale è sotto');
  ok(over.pace && /Giorno 20 di 30 · ritmo atteso 67%/.test(await p.textContent('#view')), 'mese in corso: ritmo atteso «Giorno 20 di 30 · 67%» e tacca sulla barra');
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('[data-act="budtx"][data-id="c1"] .sb')).color !== getComputedStyle(document.querySelector('[data-act="budtx"][data-id="c1"] .nm')).color), 'importo oltre il budget in un colore diverso (rosso)');
  ok(await p.isVisible('[data-tab="analisi"] .bdot'), 'puntino sulla scheda Analisi con una categoria oltre l’80%');
  // mese precedente: nessun ritmo
  await A(p, 'budprev'); await tick(p);
  const prev = await p.evaluate(() => ({ t: document.querySelector('#view').textContent, pace: !!document.querySelector('#view .pace'), st: __UF.budgetState('2026-10-15') }));
  ok(/ottobre 2026/i.test(prev.t) && /Mese concluso/.test(prev.t) && !prev.pace && prev.st.pace === null, 'mese passato: niente ritmo atteso né tacca, solo speso/limite');
  const octSpent = await p.evaluate(() => { let s = 0; __UF.S.tx.forEach(t => { if (t.kind === 'spesa' && t.catId === 'c1' && t.date >= '2026-10-01' && t.date <= '2026-10-31') s += t.cents; }); return s; });
  ok(prev.st.rows.find(r => r.c.id === 'c1').spent === octSpent, 'mese passato: speso di ottobre calcolato su tutto il mese (' + octSpent + ')');
  await p.click('[data-act="budtx"][data-id="c1"]'); await tick(p);
  ok(await p.evaluate(() => { const d = __UF.L[__UF.L.length - 1].data; return d.length > 0 && d.every(t => t.catId === 'c1' && t.date >= '2026-10-01' && t.date <= '2026-10-31'); }), 'tocco su una categoria di ottobre: elenco delle spese di ottobre');
  await A(p, 'close'); await A(p, 'budnext'); await tick(p);
  // cambio scheda: la scelta resta finché l'app è aperta; al riavvio si riparte da Panoramica
  await A(p, 'tab', { tab: 'home' }); await A(p, 'tab', { tab: 'analisi' }); await tick(p);
  ok(await p.evaluate(() => document.querySelector('[data-act="anview"][data-v="bud"]').classList.contains('on')), 'la vista Budget resta scelta cambiando scheda (stessa sessione)');
  const snap1 = await p.evaluate(() => __UF.stable(__UF.snapState()));
  ok(!/"anView"|"AV"|"bud"/.test(snap1), 'la vista scelta non finisce nei dati salvati');
  await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 1200);
  await A(p, 'tab', { tab: 'analisi' }); await tick(p);
  ok(await p.evaluate(() => document.querySelector('[data-act="anview"][data-v="ov"]').classList.contains('on')), 'riaprendo l’app Analisi riparte da Panoramica');
  // obiettivi: «+ Nuovo»
  await A(p, 'anview', { v: 'bud' }); await A(p, 'goalnew'); await tick(p);
  ok(await p.evaluate(() => __UF.L.length === 1 && __UF.L[0].name === 'goalpick' && !__UF.L[0].el.querySelector('[data-id="a4"]') && !!__UF.L[0].el.querySelector('[data-id="a1"]')), '«+ Nuovo» obiettivo: elenco dei conti di risparmio/liquidità (niente crediti)');
  await p.click('.pick.addnew[data-act="goalacc"]'); await tick(p);
  ok(await p.evaluate(() => __UF.L.length === 1 && __UF.L[0].name === 'acc' && __UF.L[0].st.type === 'risparmio' && !document.querySelector('#af-goal').hidden), '«Nuovo conto di risparmio»: modulo del conto con l’obiettivo aperto');
  await A(p, 'close'); await A(p, 'goalnew'); await p.click('[data-act="goalacc"][data-id="a1"]'); await tick(p); await A(p, 'saveacc'); await tick(p);
  ok(await p.evaluate(() => __UF.L.length === 1 && /importo dell’obiettivo/.test(document.querySelector('.layer .msg.bad').textContent) && !__UF.S.accounts.find(a => a.id === 'a1').goal), '«+ Nuovo» obiettivo senza importo: avviso, nessun salvataggio');
  await A(p, 'close');
  // guida e tutorial
  await A(p, 'tab', { tab: 'home' }); await p.evaluate(() => { __UF.S.guideDone = false; __UF.S.demo = false; __UF.S.cats.forEach(c => delete c.budget); __UF.render(); }); await tick(p);
  await p.click('.step[data-act="gobud"]'); await tick(p);
  ok(await p.evaluate(() => __UF.S.tab === 'analisi' && document.querySelector('[data-act="anview"][data-v="bud"]').classList.contains('on')), 'Primi passi → «Imposta un budget» porta ad Analisi → Budget');
  ok(await p.evaluate(() => !document.querySelector('[data-tab="analisi"] .bdot')), 'nessun puntino senza budget all’80%');
  await A(p, 'tab', { tab: 'settings' });
  ok(await p.evaluate(() => !document.querySelector('[data-act="budgets"]')), 'Impostazioni: nessuna riga dei budget');

  await A(p, 'posopen', { id: 'p1' }); await tick(p);
  ok(await p.evaluate(() => { const h = __UF.L[0].el.querySelector('.scrh h2'), n = __UF.L[0].el.querySelector('.posh .pnm'); return !!n && n.textContent === __UF.posById('p1').name && h.scrollHeight <= h.clientHeight + 1; }), 'scheda investimento: nome completo nell’intestazione e titolo non tagliato (fino a 2 righe)');
  await A(p, 'close');
  // ---------- 3. tema Automatico, barra di stato, formato dati ----------
  const meta = () => p.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  await A(p, 'theme', { k: 'scuro' }); await tick(p, 100);
  ok(await p.evaluate(() => document.documentElement.dataset.uf === 'scuro') && await meta() === '#000000', 'tema scuro: pagina scura e barra di stato #000000');
  await p.emulateMedia({ colorScheme: 'dark' }); await A(p, 'theme', { k: 'auto' }); await tick(p, 100);
  ok(await p.evaluate(() => document.documentElement.dataset.uf === 'scuro') && await meta() === '#000000', 'Automatico con iPhone in scuro → scuro');
  await p.emulateMedia({ colorScheme: 'light' }); await tick(p, 200);
  ok(await p.evaluate(() => document.documentElement.dataset.uf === 'chiaro') && await meta() === '#F2F2F7', 'Automatico segue il cambio del sistema a chiaro, anche la barra di stato');
  const sn = await p.evaluate(() => { const s = __UF.snapState(); return { schema: s.schema, theme: s.prefs.theme, err: __UF.validateSnap(s) }; });
  ok(sn.schema === 8 && sn.theme === 'auto' && !sn.err.length, 'formato dati invariato (8) e backup con tema «auto» valido');
  ok(await p.evaluate(() => { const s = __UF.snapState(); delete s.prefs.theme; return !__UF.validateSnap(s).length; }), 'backup senza tema (versioni vecchie) ancora valido');
  await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 1200);
  ok(await p.evaluate(() => __UF.S.theme === 'auto' && document.documentElement.dataset.uf === 'chiaro'), 'riaprendo l’app il tema resta «Automatico»');
  await A(p, 'theme', { k: 'chiaro' });

  // ---------- 4. importi lunghi, nomi lunghi, importi nascosti ----------
  await p.evaluate(() => { const a = __UF.S.accounts[0]; a.name = 'Conto corrente cointestato per le spese di casa e delle vacanze'; a.opening = -123456789; __UF.render(); });
  await A(p, 'tab', { tab: 'conti' }); await tick(p);
  const lng = await p.evaluate(() => {
    const row = document.querySelector('[data-act="acc"][data-id="' + __UF.S.accounts[0].id + '"]'), v = row.querySelector('.v'), nm = row.querySelector('.nm');
    return { v: v.textContent, oneLine: v.getBoundingClientRect().height < 30, notCut: v.scrollWidth <= v.clientWidth + 1, ell: nm.scrollWidth > nm.clientWidth && getComputedStyle(nm).textOverflow === 'ellipsis', fits: row.getBoundingClientRect().right <= innerWidth };
  });
  ok(/−1\.23\d\.\d{3},\d\d/.test(lng.v) && lng.oneLine && lng.notCut, 'importo lungo (' + lng.v + ') su una riga e non troncato');
  ok(lng.ell && lng.fits, 'nome lunghissimo del conto con i puntini, riga dentro lo schermo');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'nessuno scorrimento orizzontale della pagina');
  await p.evaluate(() => { __UF.S.hide = true; __UF.render(); });
  ok(await p.evaluate(() => !/\d,\d\d/.test(document.querySelector('#view').textContent.replace(/\d+ conti/, '')) && document.documentElement.scrollWidth <= innerWidth), 'importi nascosti: nessuna cifra visibile in Conti, larghezza invariata');
  await p.evaluate(() => { __UF.S.hide = false; __UF.render(); });

  // ---------- 5. aree toccabili ≥ 44 px nelle schede ----------
  const small = [];
  for (const t of ['home', 'conti', 'analisi', 'portfolio', 'settings']) {
    await A(p, 'tab', { tab: t }); await tick(p, 150);
    small.push(...await p.evaluate(t => [...document.querySelectorAll('#view button, #view [data-act], #view label.navrow, .tabbar button, #fabw button')].filter(e => e.getClientRects().length && !e.closest('svg')).map(e => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.height < 44 - 0.5 && !e.closest('.seg, .smallseg')).map(([e, r]) => t + ':' + (e.dataset.act || e.className) + ' ' + Math.round(r.height)), t));
  }
  ok(!small.length, 'aree toccabili ≥ 44 px (segmentati esclusi: il controllo è alto 44 px)' + (small.length ? ' — piccole: ' + small.join(', ') : ''));
  ok(!p.errs.length, 'nessun errore JavaScript' + (p.errs.length ? ': ' + p.errs.join(' | ') : ''));
  await ctx.close(); await b.close();
  console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
})();
