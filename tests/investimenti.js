const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html', SP = (require('fs').mkdirSync(require('path').join(__dirname, 'out'), { recursive: true }), require('path').join(__dirname, 'out'));
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
const T = async (p, sel) => ((await p.textContent(sel)) || '').replace(/\u00a0/g, ' ');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  // CoinGecko simulato
  const cgReq = []; let cgFail = false, btc = 70000, eth = 2500;
  await ctx.route('https://api.coingecko.com/**', route => {
    const u = route.request().url(); cgReq.push(u);
    if (cgFail) return route.fulfill({ status: 500, body: 'err' });
    if (u.includes('/search')) {
      const q = new URL(u).searchParams.get('query').toUpperCase();
      const coins = q === 'BTC' ? [{ id: 'bitcoin-cash', symbol: 'BCH', name: 'Bitcoin Cash', market_cap_rank: 20 }, { id: 'wrapped-bitcoin', symbol: 'WBTC', name: 'Wrapped Bitcoin', market_cap_rank: 15 }, { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }, { id: 'btc-fake', symbol: 'BTC', name: 'Fake BTC', market_cap_rank: null }]
        : q === 'ETH' ? [{ id: 'ethereum', symbol: 'ETH', name: 'Ethereum', market_cap_rank: 2 }] : [];
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ coins }) });
    }
    const ids = new URL(u).searchParams.get('ids').split(','), out = {};
    ids.forEach(i => { if (i === 'bitcoin') out.bitcoin = { eur: btc }; if (i === 'ethereum') out.ethereum = { eur: eth }; });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
  const p = await ctx.newPage(); await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700);
  if (await p.locator('[data-act="startdemo"]').count()) { await p.click('[data-act="startdemo"]'); await tick(p, 500); }
  await tick(p, 600); ok(cgReq.length > 0 && await p.evaluate(() => __UF.S.autoCry === true && __UF.posById('p3').cgId === 'bitcoin'), 'cripto automatiche attive di default: BTC collegato all’avvio');
  await p.evaluate(() => { __UF.S.autoCry = false; __UF.render(); }); // il resto del test parte con l'automatico spento

  // ---------- scheda dell'investimento ----------
  await p.click('[data-tab="portfolio"]'); await p.click('[data-act="posopen"][data-id="p2"]'); await tick(p);
  const sd = await T(p, '.layer');
  ok(/Hai versato 2\.222,50 €/.test(sd) && sd.includes('Oggi vale'), 'scheda: frase versato / vale oggi');
  ok(sd.includes('Prezzo medio di carico') && sd.includes('111,125 €'), 'scheda: prezzo medio di carico (15×109 + 5×117,5)/20 = 111,125 €');
  ok(sd.includes('Operazioni') && (await p.locator('.layer [data-act="lotedit"]').count()) === 2, 'scheda: operazioni visibili senza «Altro»');
  await p.screenshot({ path: SP + '/shot_posd.png' });
  // aggiorna col valore della posizione
  await p.locator('.layer').last().locator('[data-act="pricenew"]').first().click(); await tick(p);
  ok(await p.evaluate(() => document.querySelector('#x-in').dataset.m) === 'val', 'Aggiorna valore: si parte dal valore della posizione');
  await p.fill('#x-in', '2600'); await tick(p, 100);
  ok((await T(p, '#x-hint')).includes('130,00 €'), 'anteprima: 2.600 € / 20 quote = 130,00 € per quota → ' + await T(p, '#x-hint'));
  await p.screenshot({ path: SP + '/shot_valform.png' });
  await p.click('[data-act="saveprice"]'); await tick(p, 400);
  const v = await p.evaluate(() => ({ px: __UF.pxAt(__UF.posById('p2'), __UF.TODAY), val: __UF.posValue(__UF.posById('p2')), top: __UF.L[__UF.L.length - 1].name }));
  ok(v.px === 130000000 && v.val === 260000 && v.top === 'posd', 'salvato: prezzo 130 €, valore 2.600 €, si torna alla scheda aggiornata');
  ok((await T(p, '.layer')).includes('2.600,00 €'), 'la scheda mostra subito il nuovo valore');
  // modalità prezzo e data senza quote
  await p.locator('.layer').last().locator('[data-act="pricenew"]').first().click(); await p.click('[data-act="xmode"][data-m="px"]'); await p.fill('#x-in', '131'); await tick(p, 100);
  ok((await T(p, '#x-hint')).includes('2.620,00 €'), 'modalità prezzo per quota: anteprima del valore 2.620 €');
  await p.fill('#x-date', '2024-01-01'); await p.dispatchEvent('#x-date', 'change'); await tick(p, 100);
  ok(await p.locator('#x-modes').count() === 0 && /Nessuna quota/.test(await T(p, '#x-hint')), 'data senza quote possedute: solo prezzo, con spiegazione');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  // grafico ancora raggiungibile
  await p.click('.layer [data-chart="1"]'); await tick(p);
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].name === 'nw'), 'dalla scheda si apre il grafico «Andamento nel tempo»');
  await p.evaluate(() => { __UF.act('close', {}); __UF.act('close', {}); }); await tick(p, 500);

  // ---------- aggiornamento guidato ----------
  await p.clock.setSystemTime(new Date('2026-12-10T10:00:00')); await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 800);
  await p.click('[data-tab="portfolio"]'); await tick(p);
  ok((await T(p, '#view')).includes('investimenti non aggiornati'), 'Portfolio: avviso sugli investimenti non aggiornati');
  const before = await p.evaluate(() => ({ p1: __UF.pxAt(__UF.posById('p1'), __UF.TODAY), p3: __UF.pxAt(__UF.posById('p3'), __UF.TODAY) }));
  await p.click('.tbtn[data-act="pxall"]'); await tick(p);
  ok((await T(p, '#w-body')).includes('1 di 3'), 'guidato: 3 investimenti da aggiornare, uno alla volta');
  await p.fill('#w-in', 'abc'); await p.click('#w-next'); await tick(p, 150);
  ok(/non valido/.test(await T(p, '#w-msg')) && (await T(p, '#w-body')).includes('1 di 3'), 'importo non valido: messaggio, si resta sul passo');
  await p.fill('#w-in', '1700'); await tick(p, 100);
  ok(/dall’ultimo aggiornamento/.test(await T(p, '#w-hint')), 'anteprima della variazione: ' + await T(p, '#w-hint'));
  await p.screenshot({ path: SP + '/shot_wiz.png' });
  await p.press('#w-in', 'Enter'); await tick(p, 200);
  ok((await T(p, '#w-body')).includes('2 di 3'), 'Invio sulla tastiera passa al successivo');
  await p.click('[data-act="pxwskip"]'); await tick(p, 200);
  await p.click('[data-act="pxwmode"]'); await p.fill('#w-in', '80000'); await p.click('#w-next'); await tick(p, 400);
  const after = await p.evaluate(() => ({ open: __UF.L.some(l => l.name === 'pxwiz'), p1v: __UF.posValue(__UF.posById('p1')), p3: __UF.pxAt(__UF.posById('p3'), __UF.TODAY), toast: document.querySelector('#toast').textContent }));
  ok(!after.open && after.p1v === 170000 && after.p3 === 80000000000 && /2 valori aggiornati/.test(after.toast), 'fine: valore MSCI 1.700 €, BTC per prezzo 80.000 €, saltato Vanguard · ' + after.toast);
  await p.click('#toast [data-act="undo"]'); await tick(p, 300);
  const und = await p.evaluate(() => ({ p1: __UF.pxAt(__UF.posById('p1'), __UF.TODAY), p3: __UF.pxAt(__UF.posById('p3'), __UF.TODAY) }));
  ok(und.p1 === before.p1 && und.p3 === before.p3, 'Annulla ripristina tutti i valori del giro');

  // ---------- cripto automatiche ----------
  await p.click('[data-tab="settings"]'); await p.check('[data-chg="autocry"]'); await tick(p, 800);
  const cg = await p.evaluate(() => { const x = __UF.posById('p3'); return { id: x.cgId, name: x.cgName, px: __UF.pxAt(x, __UF.TODAY), val: __UF.posValue(x), err: __UF.CG.err }; });
  ok(cg.id === 'bitcoin' && cg.name === 'Bitcoin', 'collegamento automatico: BTC → bitcoin (simbolo identico, capitalizzazione maggiore)');
  ok(cg.px === 70000000000 && cg.val === 87500, 'prezzo automatico: 70.000 € × 0,0125 = 875,00 €');
  const urls = cgReq.join(' ');
  ok(!/12500|0\.0125|875|p3|qty/i.test(urls) && cgReq.every(u => u.startsWith('https://api.coingecko.com/api/v3/')), 'privacy: alle richieste vanno solo simbolo e id, mai quantità o valori');
  const nReq = cgReq.length; await p.evaluate(() => __UF.cgFetch(false));
  ok(cgReq.length === nReq, 'limite: nessuna nuova richiesta entro 15 minuti');
  await p.click('[data-tab="portfolio"]'); await tick(p);
  ok((await T(p, '[data-act="posopen"][data-id="p3"]')).includes('⚡ auto'), 'Portfolio: cripto segnata «auto»');
  await p.click('.tbtn[data-act="pxall"]'); await tick(p);
  ok((await T(p, '#w-body')).includes('di 2'), 'guidato: la cripto automatica aggiornata oggi non viene chiesta');
  await p.evaluate(() => __UF.act('close', {})); await tick(p, 500);
  await p.click('[data-act="posopen"][data-id="p3"]'); await tick(p);
  ok((await T(p, '.layer')).includes('Prezzo automatico') && (await T(p, '.layer')).includes('CoinGecko'), 'scheda cripto: fonte automatica indicata');
  btc = 71000; await p.click('.layer [data-act="cgnow"]'); await tick(p, 500);
  ok(await p.evaluate(() => __UF.pxAt(__UF.posById('p3'), __UF.TODAY)) === 71000000000 && (await T(p, '.layer')).includes('887,50 €'), '«Aggiorna ora»: 71.000 € → la scheda mostra 887,50 €');
  cgFail = true; btc = 99999; await p.click('.layer [data-act="cgnow"]'); await tick(p, 500);
  ok(await p.evaluate(() => __UF.pxAt(__UF.posById('p3'), __UF.TODAY)) === 71000000000 && /non risponde/.test(await T(p, '#toast')), 'CoinGecko in errore: prezzo invariato, messaggio chiaro');
  cgFail = false;
  await ctx.setOffline(true); const n2 = cgReq.length; await p.evaluate(() => __UF.cgFetch(true)); await ctx.setOffline(false);
  ok(cgReq.length === n2, 'offline: nessun tentativo di rete');
  await p.evaluate(() => __UF.act('close', {})); await tick(p, 500);
  // nuova cripto con l'automatico attivo
  await p.click('[data-act="newpos"]'); await p.click('[data-act="pkind"][data-k="crypto"]'); await tick(p, 100);
  await p.fill('#p-name', 'Ethereum'); await p.fill('#p-sym', 'ETH'); await p.fill('#p-qty', '2'); await p.fill('#p-tot', '4000');
  await p.click('[data-act="savepos"]'); await tick(p, 900);
  const eth2 = await p.evaluate(() => { const x = __UF.S.pos.find(q => q.sym === 'ETH'); return { id: x.cgId, val: __UF.posValue(x) }; });
  ok(eth2.id === 'ethereum' && eth2.val === 500000, 'nuova cripto: collegata e valutata subito (2 ETH × 2.500 € = 5.000 €)');
  // validazione
  const vv = await p.evaluate(() => { const sn = JSON.parse(JSON.stringify(__UF.snapState())); const a = JSON.parse(JSON.stringify(sn)); a.pos[2].cgId = 'x"><img>'; const c = JSON.parse(JSON.stringify(sn)); c.prefs.autoCry = 'si'; return [__UF.validateSnap(sn).length, __UF.validateSnap(a)[0] || 'ACCETTATO', __UF.validateSnap(c)[0] || 'ACCETTATO']; });
  ok(vv[0] === 0 && vv[1] !== 'ACCETTATO' && vv[2] !== 'ACCETTATO', 'validazione: id CoinGecko e preferenza non validi rifiutati');
  // disattivazione
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', {}); }); await tick(p, 500);
  await p.click('[data-tab="settings"]'); await p.uncheck('[data-chg="autocry"]'); await tick(p, 300);
  const n3 = cgReq.length; await p.evaluate(() => __UF.cgFetch(true));
  ok(cgReq.length === n3, 'disattivate: nessuna richiesta');
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
