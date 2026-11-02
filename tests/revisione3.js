const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
const T = async (p, sel) => ((await p.textContent(sel)) || '').replace(/ /g, ' ');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 375, height: 667 } });
  let cgMode = 'ok';
  await ctx.route('https://api.coingecko.com/**', r => { if (cgMode === 'fail') return r.fulfill({ status: 429, body: '' }); const u = r.request().url(); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: u.includes('search') ? JSON.stringify({ coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] }) : JSON.stringify({ bitcoin: { eur: 70000 } }) }); });
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { const me = this; setTimeout(() => { me.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: window.__SAY } }] }); me.onend(); }, 60); } stop() {} abort() {} }; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  // #3 testi coerenti
  await p.click('[data-tab="portfolio"]'); await tick(p);
  ok((await T(p, '#view')).includes('Cripto: prezzi automatici da CoinGecko'), '#3 Portfolio: la nota spiega che le cripto sono automatiche');
  await p.click('[data-tab="settings"]'); await p.click('.navrow[data-act="guide"]'); await tick(p);
  const g = await T(p, '.guide');
  ok(g.includes('CoinGecko') && !g.includes('Aggiorna prezzi') && g.includes('Aggiorna valori'), '#3 guida aggiornata (CoinGecko, «Aggiorna valori»)');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  // #1 a voce: entrata da Marco con credito aperto = restituzione; spesa mai sul credito
  await p.evaluate(() => { __UF.S.accounts.push({ id: 'k7', name: 'Marco', type: 'credito', sub: 's8', icon: '🤝', color: '#9A5700', opening: 5000, openDate: '2026-01-01' }); __UF.S.lastAcc = 'a1'; __UF.act('tab', { dataset: { tab: 'home' } }); });
  const nw0 = await p.evaluate(() => __UF.netWorth());
  await p.click('#fabw .fab.mic'); await p.evaluate(() => { window.__SAY = 'ho ricevuto 20 euro da Marco e ho pagato 10 euro a Marco per la pizza'; }); await p.click('#v-mic'); await tick(p, 500);
  await p.click('#v-ok'); await tick(p, 400);
  const r1 = await p.evaluate(() => ({ marco: __UF.balance('k7'), cash: __UF.balance('a1'), nw: __UF.netWorth() }));
  ok(r1.marco === 3000, '#1 credito Marco 50 → 30 € (restituzione), non 70 €');
  ok(r1.nw === nw0 - 1000, '#1 patrimonio: −10 € della pizza, la restituzione non è reddito');
  // #2 prestito a mio fratello: giroconto, il patrimonio non cambia
  await tick(p, 500); await p.click('#fabw .fab.mic'); await p.evaluate(() => { window.__SAY = 'ho prestato 50 euro a mio fratello'; }); await p.click('#v-mic'); await tick(p, 500);
  ok(await p.evaluate(() => document.querySelector('.vcard [data-vf="k"]').value === 'prestito' && document.querySelector('.vcard [data-vf="pname"]').value === 'Fratello'), '#2 «a mio fratello» → Prestito, nome proposto «Fratello»');
  await p.locator('.vcard [data-vf="pname"]').fill('Luca'); await p.click('#v-ok'); await tick(p, 400);
  ok(await p.evaluate(nw => __UF.netWorth() === nw && __UF.S.accounts.some(a => a.name === 'Luca' && a.type === 'credito'), r1.nw), '#2 prestito confermato: credito «Luca», patrimonio invariato');
  // #5 anteprima coerente quando manca «Contanti»
  await tick(p, 500); await p.evaluate(() => { __UF.S.accounts.find(a => a.id === 'a1').name = 'Portafoglio'; __UF.render(); });
  await p.click('#fabw .fab.mic'); await p.evaluate(() => { window.__SAY = 'ho prelevato 50 euro'; }); await p.click('#v-mic'); await tick(p, 500);
  const pv = await p.evaluate(() => { const c = document.querySelector('.vcard'); return { a: c.querySelector('[data-vf="acc"]').value, t: c.querySelector('[data-vf="to"]').value }; });
  await p.click('#v-ok'); await tick(p, 400);
  ok(pv.a && pv.t && pv.a !== pv.t && await p.evaluate(() => !__UF.L.some(l => l.name === 'voice')), '#5 senza «Contanti»: la tendina mostra conti validi e la conferma riesce');
  // #9 il microfono non copre l'ultimo movimento
  await tick(p, 500); await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await tick(p, 200);
  const ov = await p.evaluate(() => { const m = document.querySelector('#fabw .fab.mic').getBoundingClientRect(); return [...document.querySelectorAll('#view .row .v')].filter(v => { const r = v.getBoundingClientRect(); return r.bottom > m.top && r.top < m.bottom && r.right > m.left && r.left < m.right; }).length; });
  ok(ov === 0, '#9 iPhone SE, Home in fondo: nessun importo coperto dal microfono');
  // #11 «Vedi tutti» da Analisi: stessi conti, solo entrate e spese
  await p.click('[data-tab="analisi"]'); await tick(p);
  await p.evaluate(() => { __UF.S.an.blocks.list = true; __UF.S.an.accIds = ['a2']; __UF.render(); });
  const box = await p.evaluate(() => { const r = __UF.range(); return __UF.S.tx.filter(t => (t.kind === 'spesa' || t.kind === 'entrata') && t.date >= r.from && t.date <= r.to && t.accId === 'a2').length; });
  await p.click('[data-act="txlist"][data-an="1"]'); await tick(p);
  const lst = await p.evaluate(() => __UF.L[__UF.L.length - 1].data);
  ok(lst.length === box && lst.every(t => t.accId === 'a2' && (t.kind === 'spesa' || t.kind === 'entrata')), `#11 l’elenco corrisponde al riquadro dell’Analisi (${lst.length} movimenti, solo Banca C/C)`);
  await p.click('[data-act="tlaccsx"]'); await tick(p);
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].data.some(t => t.accId !== 'a2')), '#11 il filtro dei conti si toglie con un tocco');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', {}); }); await tick(p, 400);
  // #4 cripto automatica con prezzo vecchio, CoinGecko in errore
  cgMode = 'fail'; await p.evaluate(() => __UF.flushNow());
  await p.clock.setSystemTime(new Date('2026-12-30T10:00:00')); await p.reload(); await tick(p, 1500);
  await p.click('[data-tab="portfolio"]'); await tick(p);
  const row = await T(p, '[data-act="posopen"][data-id="p3"]');
  ok(!row.includes('⚡ auto') && /valore di \d+ giorni fa/.test(row), '#4 Portfolio: cripto automatica con prezzo vecchio segnalata → ' + row.replace(/\s+/g, ' ').slice(0, 90));
  await p.click('[data-act="posopen"][data-id="p3"]'); await tick(p);
  ok(/Prezzo automatico di \d+ giorni fa/.test(await T(p, '.layer')), '#4 scheda: data del prezzo automatico visibile');
  await ctx.setOffline(true); await p.click('.layer [data-act="cgnow"]'); await tick(p, 300); await ctx.setOffline(false);
  ok(/offline/.test(await T(p, '#toast')), '#4 «Aggiorna ora» offline: «Sei offline» (non «già aggiornati»)');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', {}); }); await tick(p, 400);
  // #10 importi nascosti
  await p.evaluate(() => { __UF.S.hide = true; __UF.render(); }); await p.click('.tbtn[data-act="pxall"]'); await tick(p);
  ok(await p.getAttribute('#w-in', 'placeholder') === '0,00', '#10 importi nascosti: nessun valore reale nel campo');
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
