// Novità del 3/11/2026: conti/categorie creati dalla voce, prezzo medio per un investimento già posseduto,
// prezzi CoinGecko aggiornati ogni minuto in euro con l'orario del dato.
const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const cgReq = []; let btc = 68887.8459713436;
  await ctx.route('https://api.coingecko.com/**', r => {
    const u = r.request().url(); cgReq.push(u);
    if (u.includes('/search')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] }) });
    const cur = new URL(u).searchParams.get('vs_currencies');
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ bitcoin: { [cur]: btc, last_updated_at: Math.floor(new Date('2026-11-20T09:58:00').getTime() / 1000) } }) });
  });
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  const btn = o => p.evaluate(o => { const b = document.createElement('button'); Object.assign(b.dataset, o.d || {}); __UF.act(o.a, b); }, o);

  // ---------- 1. voce: conto e categoria mancanti creati alla conferma ----------
  const before = await p.evaluate(() => ({ acc: __UF.S.accounts.length, cats: __UF.S.cats.length, tx: __UF.S.tx.length }));
  await btn({ a: 'voice' }); await tick(p, 300);
  await p.fill('#v-text', 'ieri ho pagato 8 euro al cinema con la carta Amex e 20 euro categoria compleanni'); await p.evaluate(() => __UF.voiceParse()); await tick(p, 300);
  const prev = await p.evaluate(() => [...document.querySelectorAll('.vcard')].map(c => ({ acc: c.querySelector('[data-vf="acc"]').value, accTxt: c.querySelector('[data-vf="acc"]').selectedOptions[0].textContent, cat: c.querySelector('[data-vf="cat"]').value, catTxt: c.querySelector('[data-vf="cat"]').selectedOptions[0].textContent, hint: (c.querySelector('.vnew') || {}).textContent || '' })));
  ok(prev.length === 2 && prev.every(x => x.acc === '__newacc__' && /Nuovo conto «Amex»/.test(x.accTxt)), 'anteprima: proposto «➕ Nuovo conto «Amex»» per entrambi i movimenti');
  ok(/Svago/.test(prev[0].catTxt) && prev[1].cat === '__newcat__' && /Nuova «Compleanni»/.test(prev[1].catTxt), 'anteprima: cinema → «Svago» esistente; proposta la nuova categoria «Compleanni»');
  ok(/verrà creat/.test(prev[0].hint) && /Amex/.test(prev[0].hint), 'anteprima: avviso «Alla conferma verrà creato…»');
  ok(/verranno creati il conto «Amex».* e la categoria «Compleanni»/.test(prev[1].hint), 'anteprima: «verranno creati il conto … e la categoria …» (' + prev[1].hint + ')');
  await p.click('#v-ok'); await tick(p, 500);
  const after = await p.evaluate(() => { const S = __UF.S, a = S.accounts.filter(x => x.name === 'Amex'), sv = S.cats.filter(c => c.name === 'Svago' && c.kind === 'spesa'), cp = S.cats.filter(c => c.name === 'Compleanni'); const tx = S.tx.slice(-2); return { na: a.length, type: a[0] && a[0].type, open: a[0] && a[0].openDate, opening: a[0] && a[0].opening, sv: sv.length, cp: cp.length, txAcc: tx.every(t => a[0] && t.accId === a[0].id), txCat: tx[0].catId === (sv[0] || {}).id && tx[1].catId === (cp[0] || {}).id, bal: a[0] && __UF.balance(a[0].id), toast: document.getElementById('toast').textContent, valid: __UF.validateSnap(__UF.snapState()) }; });
  ok(after.na === 1 && after.type === 'liquidita' && after.opening === 0 && after.open === '2026-11-19', 'conferma: creato UN solo conto «Amex» (liquidità, saldo 0 dal giorno del movimento)');
  ok(after.sv === 1 && after.cp === 1, 'conferma: creata la categoria «Compleanni» (e nessun doppione di «Svago»)');
  ok(after.txAcc && after.txCat && after.bal === -2800, 'i due movimenti sono sul nuovo conto (saldo −28,00 €) e nelle nuove categorie');
  ok(/creat/.test(after.toast) && /Amex/.test(after.toast), 'avviso: «… creati conto «Amex», categoria …» (' + after.toast + ')');
  ok(!after.valid || after.valid.length === 0, 'i dati restano validi (validateSnap)');
  await p.click('#toast [data-act="undo"]'); await tick(p, 400);
  const und = await p.evaluate(() => ({ acc: __UF.S.accounts.length, cats: __UF.S.cats.length, tx: __UF.S.tx.length }));
  ok(und.acc === before.acc && und.cats === before.cats && und.tx === before.tx, 'Annulla toglie movimenti, conto e categorie creati (' + JSON.stringify([before, und]) + ')');
  // scegliendo un conto esistente non si crea nulla
  await btn({ a: 'voice' }); await tick(p, 300);
  await p.fill('#v-text', 'ho pagato 30 euro con la carta Amex'); await p.evaluate(() => __UF.voiceParse()); await tick(p, 300);
  const exist = await p.evaluate(() => __UF.S.accounts.find(a => a.type === 'liquidita').id);
  await p.selectOption('.vcard [data-vf="acc"]', exist); await tick(p, 200);
  ok(!(await p.locator('.vcard .vnew').count()), 'scelto un conto esistente: sparisce l’avviso di creazione');
  await p.click('#v-ok'); await tick(p, 400);
  ok(await p.evaluate(e => __UF.S.accounts.length === e && __UF.S.tx[__UF.S.tx.length - 1].accId === __UF.S.accounts.find(a => a.type === 'liquidita').id, before.acc), 'nessun conto creato, movimento sul conto scelto');

  // ---------- 2. investimento già posseduto con prezzo medio ----------
  await p.evaluate(() => { __UF.S.tab = 'portfolio'; __UF.render(); });
  const mk = async (kind, by, name, q, px, pmc, pmd) => {
    await btn({ a: 'newpos' }); await tick(p, 200);
    if (kind === 'crypto') await btn({ a: 'pkind', d: { k: 'crypto' } });
    await btn({ a: 'pmode', d: { m: 'oggi' } }); if (by === 'val') await btn({ a: 'pby', d: { k: 'val' } }); await tick(p, 150);
    await p.fill('#p-name', name); await p.fill('#p-px', px); await p.fill(by === 'val' ? '#p-val' : '#p-qty', q); if (pmc !== null) await p.fill('#p-pmc', pmc); if (pmd) await p.fill('#p-pmd', pmd);
    await p.click('[data-act="savepos"]'); await tick(p, 400);
    return p.evaluate(n => { const x = __UF.S.pos.find(y => y.name === n); if (!x) return null; const st = __UF.posStat(x), c = __UF.posCalc(x); return { d: x.lots[0].d, xirr: st.xirr, qty: x.lots[0].qty, tot: x.lots[0].tot, lotPx: x.lots[0].px, val: st.value, gain: st.gain, px: __UF.pxAt(x, __UF.TODAY), msg: (document.querySelector('#p-msg') || {}).textContent || '' }; }, name);
  };
  let r = await mk('inv', 'qty', 'ETF Prova', '10', '100', '80', '2023-11-20');
  ok(r && r.d === '2023-11-20' && r.xirr !== null && Math.abs(r.xirr - 0.0772) < 0.002 && r.qty === 1000000000 && r.tot === 80000 && r.val === 100000 && r.gain === 20000 && r.px === 100000000, 'ETF già posseduto dal 20/11/2023: 10 quote, oggi 100, medio 80 → versato 800 €, valore 1.000 €, +200 €, rendimento annuo ≈ 7,7% (non gonfiato) (' + JSON.stringify(r) + ')');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  r = await mk('crypto', 'qty', 'Bitcoin Prova', '0,05', '68000', '52000,50', '2025-01-15');
  if (!r) console.log('MSG', await p.evaluate(() => document.getElementById('p-msg') && document.getElementById('p-msg').textContent));
  ok(r && r.tot === 260003 && r.val === 340000 && r.gain === 79997, 'cripto già posseduta: 0,05 × medio 52.000,50 = 2.600,03 € versati; valore 3.400 €; guadagno 799,97 € (' + JSON.stringify(r) + ')');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  r = await mk('inv', 'val', 'ETF Valore', '1500', '50', '40', '2024-05-02');
  ok(r && r.qty === 3000000000 && r.tot === 120000 && r.val === 150000, 'per valore: 1.500 € a 50 → 30 quote; medio 40 → versato 1.200 € (' + JSON.stringify(r) + ')');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  r = await mk('inv', 'qty', 'ETF Senza', '10', '100', null);
  ok(r && r.tot === 100000 && r.gain === 0, 'senza prezzo medio: come prima (versato = valore di oggi, guadagno 0)');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  r = await mk('inv', 'qty', 'ETF Errato', '10', '100', 'abc', '2024-01-01');
  ok(r === null && await p.evaluate(() => /Prezzo medio/.test(document.getElementById('p-msg').textContent)), 'prezzo medio non valido: errore, nessun investimento creato');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });

  r = await mk('inv', 'qty', 'ETF SoloData', '1', '100', null, '2023-01-01');
  ok(r === null && await p.evaluate(() => /prezzo medio/.test(document.getElementById('p-msg').textContent)), 'data senza prezzo medio: chiede il prezzo medio invece di ignorare la data');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  r = await mk('inv', 'qty', 'ETF SenzaData', '10', '100', '80', '');
  ok(r === null && await p.evaluate(() => /da quando lo possiedi/.test(document.getElementById('p-msg').textContent)), 'prezzo medio senza data: chiede la data del primo acquisto');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });

  // revisione 2: con un messaggio d'errore il modulo resta fermo anche su iPhone 12-14 (390×797 + safe area)
  await p.setViewportSize({ width: 390, height: 797 }); await p.addStyleTag({ content: '.scrf{padding-bottom:46px!important}' });
  for (const [pmc, pmd, lab] of [['80', '', 'senza data'], ['abc', '2024-01-01', 'prezzo non valido']]) {
    await btn({ a: 'newpos' }); await btn({ a: 'pmode', d: { m: 'oggi' } }); await tick(p, 150);
    await p.fill('#p-name', 'Prova ' + lab); await p.fill('#p-px', '100'); await p.fill('#p-qty', '1'); await p.fill('#p-pmc', pmc); if (pmd) await p.fill('#p-pmd', pmd);
    await p.click('[data-act="savepos"]'); await tick(p, 300);
    ok(await p.evaluate(() => { const l = __UF.L[__UF.L.length - 1].el; return document.getElementById('p-msg').textContent.length > 0 && !l.classList.contains('scrolls'); }), 'errore «' + lab + '» visibile e modulo ancora fermo a 390×797');
    await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });
  }
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => document.querySelectorAll('style').forEach(st => { if (st.textContent.includes('46px')) st.remove(); }));

  // ---------- revisione 2: giroconto verso un conto nuovo ----------
  await btn({ a: 'voice' }); await tick(p, 300);
  await p.fill('#v-text', 'ho versato 50 euro sulla Revolut dalla banca'); await p.evaluate(() => __UF.voiceParse()); await tick(p, 300);
  const gv = await p.evaluate(() => ({ k: document.querySelector('.vcard [data-vf="k"]').value, to: document.querySelector('.vcard [data-vf="to"]').value, nw: __UF.netWorth ? __UF.netWorth() : null }));
  ok(await p.evaluate(() => /verrà creato il conto «Revolut»/.test(document.querySelector('.vcard .vnew').textContent)), 'anteprima: «verrà creato il conto «Revolut»» (genere corretto)');
  ok(gv.k === 'giro' && gv.to === '__newacc__', 'anteprima: «versato sulla Revolut dalla banca» è un giroconto verso «➕ Nuovo conto «Revolut»»');
  await p.click('#v-ok'); await tick(p, 400);
  const ga = await p.evaluate(() => { const r = __UF.S.accounts.find(a => a.name === 'Revolut'), t = __UF.S.tx[__UF.S.tx.length - 1]; return { ok: !!r && t.kind === 'giro' && t.toId === r.id, bal: r && __UF.balance(r.id), nw: __UF.netWorth ? __UF.netWorth() : null }; });
  ok(ga.ok && ga.bal === 5000 && ga.nw === gv.nw, 'conferma: creato «Revolut» con +50 €, patrimonio invariato');
  await p.click('#toast [data-act="undo"]'); await tick(p, 300);

  // ---------- revisione: cambio di tipo nell'anteprima vocale ----------
  await btn({ a: 'voice' }); await tick(p, 300);
  await p.fill('#v-text', 'ho pagato 20 euro categoria palestra'); await p.evaluate(() => __UF.voiceParse()); await tick(p, 300);
  await p.selectOption('.vcard [data-vf="k"]', 'entrata'); await tick(p, 200);
  const kc = await p.evaluate(() => ({ opt: [...document.querySelectorAll('.vcard [data-vf="cat"] option')].some(o => o.value === '__newcat__'), hint: !!document.querySelector('.vcard .vnew') }));
  ok(!kc.opt && !kc.hint, 'passando a Entrata sparisce la proposta «Nuova «Palestra»» (era di spesa)');
  await p.selectOption('.vcard [data-vf="k"]', 'spesa'); await tick(p, 200);
  ok(await p.evaluate(() => document.querySelector('.vcard [data-vf="cat"]').value === '__newcat__'), 'tornando a Spesa la proposta ritorna');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); });

  // ---------- 3. CoinGecko: euro, dato aggiornato ogni minuto, orario del dato ----------
  cgReq.length = 0;
  await p.evaluate(() => { __UF.S.autoCry = true; __UF.CG.at = 0; }); await p.evaluate(() => __UF.cgFetch(true)); await tick(p, 300);
  const u = cgReq.find(x => x.includes('simple/price')) || '';
  ok(/vs_currencies=eur/.test(u) && /include_last_updated_at=true/.test(u) && /precision=full/.test(u), 'richiesta in euro, con orario del dato e precisione piena (' + u.split('?')[1] + ')');
  const pr = await p.evaluate(() => { const x = __UF.S.pos.find(y => y.cgId === 'bitcoin'); return x ? __UF.pxAt(x, __UF.TODAY) : null; });
  ok(pr === 68887845971, 'prezzo salvato con precisione (68.887,845971 €)');
  const n0 = cgReq.length; await p.evaluate(() => __UF.cgFetch(false)); ok(cgReq.length === n0, 'entro un minuto nessuna nuova richiesta');
  btc = 69100; for (let k = 0; k < 16; k++) { await p.clock.runFor(5000); await tick(p, 150); } // passi brevi: la risposta arriva prima del timeout di 10 s
  let pr2 = 0; for (let k = 0; k < 20 && pr2 !== 69100000000; k++) { await tick(p, 250); pr2 = await p.evaluate(() => { const x = __UF.S.pos.find(y => y.cgId === 'bitcoin'); return __UF.pxAt(x, __UF.TODAY); }); } // attende la risposta
  ok(cgReq.length > n0 && pr2 === 69100000000, JSON.stringify([n0, cgReq.length, pr2]) +  'dopo un minuto, con l’app aperta, il prezzo si aggiorna da solo (69.100 €)');
  // revisione: con errori (429) le richieste rallentano invece di ripetersi ogni 15 s
  await ctx.unroute('https://api.coingecko.com/**'); const e429 = [];
  await ctx.route('https://api.coingecko.com/**', r => { e429.push(r.request().url()); r.fulfill({ status: 429, headers: { 'access-control-allow-origin': '*' }, body: '' }); });
  await p.evaluate(() => { __UF.CG.next = 0; __UF.CG.retried = true; window.__cgN = 0; const f0 = window.fetch; window.fetch = function (u) { if (String(u).includes('coingecko')) window.__cgN++; return f0.apply(this, arguments); }; });
  for (let k = 0; k < 36; k++) { await p.clock.runFor(5000); await tick(p, 150); } // passi brevi: la risposta arriva prima del timeout di 10 s
  const nTry = await p.evaluate(() => window.__cgN);
  ok(nTry >= 1 && nTry <= 3 && e429.length === nTry, 'CoinGecko risponde 429: in 3 minuti al massimo 3 richieste (fatte ' + nTry + '), non 12');
  const id = await p.evaluate(() => __UF.S.pos.find(y => y.cgId === 'bitcoin').id);
  await btn({ a: 'posopen', d: { id } }); await tick(p, 300);
  ok(/prezzo delle 09:58/.test(await p.evaluate(() => document.querySelector('.layer').textContent)), 'scheda: mostra l’orario del dato di CoinGecko («prezzo delle 09:58»)');

  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
  process.exit(fails ? 1 : 0);
})();
