const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  let cgFail = false;
  await ctx.route('https://api.coingecko.com/**', r => { if (cgFail) return r.fulfill({ status: 500, body: '' }); const u = r.request().url(); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: u.includes('search') ? JSON.stringify({ coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] }) : JSON.stringify({ bitcoin: { eur: 70000 } }) }); });
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { const me = this; setTimeout(() => { me.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: window.__SAY } }] }); me.onend(); }, 60); } stop() {} abort() {} }; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-02T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  const say = async t => { await p.click('#fabw .fab.mic'); await p.evaluate(x => { window.__SAY = x; }, t); await p.click('#v-mic'); await tick(p, 450); };
  // #4 restituzione dagli amici, poi una spesa: non deve finire sul credito
  await say('ho ricevuto 20 euro dagli amici');
  const first = await p.evaluate(() => { const c = document.querySelector('.vcard'); return { k: c.querySelector('[data-vf="k"]').value, from: c.querySelector('[data-vf="acc"]').value }; });
  await p.click('#v-ok'); await tick(p, 500);
  ok(await p.evaluate(() => __UF.acc ? true : true) && await p.evaluate(() => { const a = __UF.S.accounts.find(x => x.id === __UF.S.lastAcc); return a && a.type !== 'credito'; }), '#4 dopo la restituzione l’ultimo conto usato non è il credito (' + JSON.stringify(first) + ')');
  await say('netflix 12,99');
  const nf = await p.evaluate(() => { const v = document.querySelector('.vcard [data-vf="acc"]').value; return { v, type: __UF.S.accounts.find(a => a.id === v).type }; });
  ok(nf.type !== 'credito', '#4 «netflix 12,99» propone un conto vero (' + nf.v + ', ' + nf.type + ')');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  await p.evaluate(() => { __UF.S.lastAcc = 'a4'; __UF.render(); });
  await p.click('#fabw .fab.add'); await tick(p);
  ok(await p.evaluate(() => { const st = __UF.L[__UF.L.length - 1].st; return __UF.S.accounts.find(a => a.id === st.accId).type !== 'credito'; }), '#4 anche il tasto + non propone mai un conto di credito');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  // #5 avviso sul nome visibile per una persona nuova
  await say('ho prestato 50 euro a mio fratello');
  ok(/Controlla il nome della persona/.test(await p.textContent('.vcard .vwarn') || ''), '#5 anteprima: «Controlla il nome della persona» visibile');
  await p.locator('.vcard [data-vf="pname"]').fill('Luca'); await p.locator('.vcard [data-vf="k"]').selectOption('prestito'); await tick(p, 200);
  ok(!/Controlla il nome/.test((await p.locator('.vcard .vwarn').count()) ? await p.textContent('.vcard .vwarn') : ''), '#5 dopo aver scritto il nome l’avviso sparisce');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  // G5#9 scegliendo un credito esistente l'avviso sul nome sparisce
  await say('ho prestato 50 euro a mio fratello');
  await p.locator('.vcard [data-vf="to"]').selectOption('a4'); await tick(p, 200);
  ok(!(await p.locator('.vcard .vwarn').count()) || !/nome/.test(await p.textContent('.vcard .vwarn')), 'G5#9 credito esistente scelto: niente avviso sul nome');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  // #6 testo del banner
  cgFail = true; await p.evaluate(() => __UF.flushNow());
  await p.clock.setSystemTime(new Date('2026-11-06T10:00:00')); await p.reload(); await tick(p, 1500);
  await p.click('[data-tab="portfolio"]'); await tick(p);
  const ban = (await p.textContent('#view')).replace(/ /g, ' ');
  ok(/non aggiornat\w+ di recente/.test(ban) && !/da più di 7 giorni/.test(ban), '#6 banner: «non aggiornato di recente», senza «7 giorni»');
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
