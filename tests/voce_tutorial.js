const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html', SP = (require('fs').mkdirSync(require('path').join(__dirname, 'out'), { recursive: true }), require('path').join(__dirname, 'out'));
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
const T = async (p, sel) => ((await p.textContent(sel)) || '').replace(/ /g, ' ');
const SAY = 'Ho pagato 5€ in farmacia ed ho mandato un bonifico da unicredit ad antonio ed ha detto che me li ridarà';
async function ctxWith(b, opts) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const cg = []; await ctx.route('https://api.coingecko.com/**', r => { cg.push(r.request().url()); const u = r.request().url(); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: u.includes('search') ? JSON.stringify({ coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] }) : JSON.stringify({ bitcoin: { eur: 70000 } }) }); });
  if (opts.notour) await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  if (opts.sr) await ctx.addInitScript((mode) => {
    window.__SAY = ''; window.__SRMODE = mode;
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { const me = this; setTimeout(() => { if (window.__SRMODE === 'deny') { me.onerror && me.onerror({ error: 'not-allowed' }); me.onend && me.onend(); return; } me.onresult({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: window.__SAY } }] }); me.onend(); }, 80); } stop() {} abort() {} };
  }, opts.sr);
  if (opts.nosr) await ctx.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  ctx.cg = cg; return ctx;
}
(async () => {
  const b = await chromium.launch(); const errs = [];
  // ================= tutorial guidato =================
  let ctx = await ctxWith(b, {}), p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700);
  await p.click('[data-act="start0"]'); await tick(p, 1000);
  ok(await p.locator('#tour').count() === 1, 'prima apertura («Inizia da zero»): parte il tutorial guidato');
  ok((await T(p, '#tour h3')) === 'Benvenuto in UFinance', 'passo 1: benvenuto');
  await p.screenshot({ path: SP + '/tour1.png' });
  const seen = [];
  for (let i = 0; i < 9; i++) {
    await p.click('#tour [data-tour="next"]'); await tick(p, 350);
    const st = await p.evaluate(() => { const h = document.querySelector('#tour .tour-hole').getBoundingClientRect(); return { t: document.querySelector('#tour h3').textContent, w: h.width, tab: __UF.S.tab }; });
    seen.push(st);
    if (i === 2) await p.screenshot({ path: SP + '/tour3.png' });
    if (i === 6) await p.screenshot({ path: SP + '/tour7.png' });
  }
  ok(seen.map(x => x.t).join('|') === 'Il tuo patrimonio|Nuovo movimento|Oppure dillo a voce|Conti|Analisi|Investimenti|Budget|I tuoi dati|Tutto pronto', 'percorso completo di 10 passi: ' + seen.map(x => x.t).join(' → '));
  ok(seen.filter(x => x.w > 0).length >= 6, 'gli elementi reali vengono evidenziati (' + seen.filter(x => x.w > 0).length + ' passi con riquadro)');
  ok(seen[4].tab === 'analisi' && seen[5].tab === 'portfolio', 'il tutorial cambia scheda mentre spiega');
  ok(await p.locator('#tour [data-tour="acc"]').count() === 1, 'ultimo passo senza conti: «Crea il primo conto»');
  await p.click('#tour [data-tour="acc"]'); await tick(p, 400);
  ok(await p.locator('#tour').count() === 0 && await p.evaluate(() => __UF.L[__UF.L.length - 1].name === 'acc'), 'fine tutorial → si apre il modulo del primo conto');
  await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 1000);
  ok(await p.locator('#tour').count() === 0, 'riaprendo l’app il tutorial non ricompare');
  await p.click('[data-tab="settings"]'); await p.click('.navrow[data-act="tour"]'); await tick(p, 400);
  ok(await p.locator('#tour').count() === 1, 'si può rivedere da Impostazioni → Aiuto');
  await p.click('#tour [data-tour="skip"]'); await tick(p, 300);
  ok(await p.locator('#tour').count() === 0 && /Tutorial saltato/.test(await T(p, '#toast')), '«Salta» chiude il tutorial con un avviso');
  await ctx.close();

  // ================= voce + cripto di default =================
  ctx = await ctxWith(b, { notour: true, sr: 'ok' }); p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  const cgd = await p.evaluate(() => ({ auto: __UF.S.autoCry, id: __UF.posById('p3').cgId, px: __UF.pxAt(__UF.posById('p3'), __UF.TODAY) }));
  ok(cgd.auto === true && cgd.id === 'bitcoin' && cgd.px === 70000000000, 'cripto automatiche attive di default: BTC collegato e aggiornato da solo');
  await p.click('[data-tab="settings"]'); await tick(p);
  const lab = await p.evaluate(() => document.querySelector('[data-chg="autocry"]').closest('label').textContent.trim());
  ok(lab === 'Prezzi cripto automatici' && await p.isChecked('[data-chg="autocry"]'), 'Impostazioni: solo il tasto «Prezzi cripto automatici», attivo');
  await p.click('[data-tab="home"]'); await tick(p);
  // conto Unicredit come nell'esempio
  await p.evaluate(() => { __UF.S.accounts.push({ id: 'u1', name: 'Unicredit', type: 'liquidita', sub: 's1', icon: '🏦', color: '#B3342B', opening: 250000, openDate: '2026-01-01' }); __UF.render(); });
  const nw0 = await p.evaluate(() => __UF.netWorth());
  ok(await p.locator('#fabw .fab.mic').count() === 1, 'Home: pulsante microfono sopra il +');
  await p.click('#fabw .fab.mic'); await tick(p);
  await p.evaluate(s => { window.__SAY = s; }, SAY);
  await p.click('#v-mic'); await tick(p, 500);
  ok((await p.inputValue('#v-text')) === SAY, 'dettatura: il testo compare nel campo');
  const cards = await p.locator('.vcard').count();
  ok(cards === 2, 'anteprima: 2 movimenti riconosciuti');
  const c1 = await p.evaluate(() => { const c = document.querySelectorAll('.vcard')[0]; return { k: c.querySelector('[data-vf="k"]').value, a: c.querySelector('[data-vf="amt"]').value, cat: c.querySelector('[data-vf="cat"]').selectedOptions[0].textContent, note: c.querySelector('[data-vf="note"]').value }; });
  ok(c1.k === 'spesa' && c1.a === '5' && /Salute/.test(c1.cat) && c1.note === 'Farmacia', 'movimento 1: Spesa 5 € · Salute · «Farmacia» → ' + JSON.stringify(c1));
  const c2 = await p.evaluate(() => { const c = document.querySelectorAll('.vcard')[1]; return { k: c.querySelector('[data-vf="k"]').value, a: c.querySelector('[data-vf="amt"]').value, from: c.querySelector('[data-vf="acc"]').selectedOptions[0].textContent, to: c.querySelector('[data-vf="to"]').value, name: c.querySelector('[data-vf="pname"]').value, warn: (c.querySelector('.vwarn') || {}).textContent || '' }; });
  ok(c2.k === 'prestito' && c2.a === '' && /Unicredit/.test(c2.from) && c2.to === '__new__' && c2.name === 'Antonio' && /Importo da inserire/.test(c2.warn), 'movimento 2: Prestito da Unicredit ad Antonio (nuova persona), importo evidenziato → ' + JSON.stringify(c2));
  await p.screenshot({ path: SP + '/voice1.png', fullPage: false });
  await p.click('#v-ok'); await tick(p, 150);
  ok(/importo/.test(await T(p, '#v-msg')), 'conferma senza importo: chiede di completare → ' + await T(p, '#v-msg'));
  await p.locator('.vcard').nth(1).locator('[data-vf="amt"]').fill('100'); await tick(p, 100);
  await p.evaluate(() => document.querySelector('#v-body').scrollTo(0, 9999)); await p.screenshot({ path: SP + '/voice2.png' });
  await p.click('#v-ok'); await tick(p, 400);
  const res = await p.evaluate(() => { const S = __UF.S, an = S.accounts.find(a => a.name === 'Antonio'), tx = S.tx.slice(-2); return { an: an && { type: an.type, bal: __UF.balance(an.id) }, uni: __UF.balance('u1'), t: tx.map(t => [t.kind, t.cents, t.catId || t.toId, t.note]), nw: __UF.netWorth(), toast: document.querySelector('#toast').textContent }; });
  ok(res.an && res.an.type === 'credito' && res.an.bal === 10000 && res.uni === 240000, 'confermati: conto di credito «Antonio» = 100 €, Unicredit 2.500 → 2.400 €');
  ok(res.nw === nw0 - 500, 'patrimonio: scende solo dei 5 € della farmacia (il prestito è un credito)');
  ok(/2 movimenti registrati/.test(res.toast), 'toast: ' + res.toast);
  await p.click('#toast [data-act="undo"]'); await tick(p, 300);
  ok(await p.evaluate(nw => __UF.netWorth() === nw && !__UF.S.accounts.some(a => a.name === 'Antonio'), nw0), 'Annulla: movimenti e conto creato tolti');
  // restituzione detta a voce: dal credito al conto
  await p.evaluate(() => { __UF.S.accounts.push({ id: 'k9', name: 'Antonio', type: 'credito', sub: 's8', icon: '🤝', color: '#9A5700', opening: 10000, openDate: '2026-01-01' }); __UF.render(); });
  await p.click('#fabw .fab.mic'); await p.evaluate(() => { window.__SAY = 'Antonio mi ha ridato 100 euro su unicredit'; }); await p.click('#v-mic'); await tick(p, 500);
  const rp = await p.evaluate(() => { const c = document.querySelector('.vcard'); return { k: c.querySelector('[data-vf="k"]').value, from: c.querySelector('[data-vf="acc"]').value, to: c.querySelector('[data-vf="to"]').value, a: c.querySelector('[data-vf="amt"]').value }; });
  ok(rp.k === 'giro' && rp.from === 'k9' && rp.to === 'u1' && rp.a === '100', 'restituzione: giroconto dal credito «Antonio» a Unicredit');
  // cambio tipo nell'anteprima
  await p.locator('.vcard [data-vf="k"]').selectOption('entrata'); await tick(p, 150);
  ok(await p.locator('.vcard [data-vf="cat"]').count() === 1, 'cambiando il tipo l’anteprima mostra i campi giusti (categoria)');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 400);
  // permesso negato
  await p.evaluate(() => { window.__SRMODE = 'deny'; }); await p.click('#fabw .fab.mic'); await p.click('#v-mic'); await tick(p, 400);
  ok(/Microfono non consentito/.test(await T(p, '#v-msg')), 'microfono negato: messaggio con l’alternativa della tastiera');
  await ctx.close();

  // ================= senza riconoscimento vocale (es. PWA su iPhone): scrittura/dettatura da tastiera =================
  ctx = await ctxWith(b, { notour: true, nosr: true }); p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 800);
  await p.click('#fabw .fab.mic'); await tick(p);
  ok(await p.locator('#v-mic').count() === 0 && /tastiera/.test(await T(p, '#v-hint')), 'senza riconoscimento vocale: niente pulsante, invito al microfono della tastiera');
  await p.fill('#v-text', 'ieri ho speso 12,50 euro al supermercato con la carta'); await p.click('[data-act="vparse"]'); await tick(p, 200);
  await p.click('#v-ok'); await tick(p, 400);
  const last = await p.evaluate(() => { const t = __UF.S.tx[__UF.S.tx.length - 1]; return [t.kind, t.cents, t.catId, t.accId, t.date]; });
  ok(JSON.stringify(last) === JSON.stringify(['spesa', 1250, 'c1', 'a5', '2026-11-19']), 'testo scritto → spesa 12,50 € Alimentari, carta di credito, ieri');
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
