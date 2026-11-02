const { chromium } = require('playwright');
const URL = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 150) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage(); await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; }); await ctx.route('https://api.coingecko.com/**', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  await p.clock.install({ time: new Date('2026-11-02T10:00:00') });
  await p.goto(URL); await tick(p, 600);
  await p.click('[data-act="startdemo"]'); await tick(p, 600);
  const h = await p.evaluate(() => ({ txt: document.querySelector('.totalbtn .amt').textContent, m: __UF.money(__UF.netWorth()) }));
  ok(h.txt === h.m, 'Home = patrimonio ' + h.txt);
  const before = await p.evaluate(async () => { await __UF.flushNow(); return { tx: __UF.S.tx.length, rev: __UF.P.base }; });
  // salvataggio saltato se nulla cambia (cambio scheda, touch senza modifiche)
  const skip = await p.evaluate(async () => { const r0 = await __UF.repo.readRev(); __UF.act('tab', { dataset: { tab: 'conti' } }); __UF.render(); await __UF.flushNow(); return [r0, await __UF.repo.readRev()]; });
  ok(skip[0] === skip[1], 'nessuna scrittura se i dati non cambiano (rev ' + skip.join('→') + ')');
  // riapertura 45 giorni dopo: ricorrenze + avviso
  await p.clock.setSystemTime(new Date('2026-12-17T10:00:00')); await p.reload(); await tick(p, 800);
  const after = await p.evaluate(() => ({ tx: __UF.S.tx.length, toast: document.querySelector('#toast').hidden ? '' : document.querySelector('#toast').textContent, aria: document.querySelector('#toast').getAttribute('aria-live') }));
  ok(after.tx > before.tx && /Registrate/.test(after.toast), `ricorrenze all'avvio: ${before.tx}→${after.tx}, toast "${after.toast}"`);
  ok(after.aria === 'polite', 'toast annunciato ai lettori di schermo');
  // modifica movimento ricorrente
  const rid = await p.evaluate(() => __UF.S.tx.find(t => t.rule && t.kind === 'spesa').id);
  await p.evaluate(id => __UF.act('tx', { dataset: { id } }), rid); await p.click('[data-act="txedit"]');
  await p.fill('#a-note', 'modificata'); await p.click('#a-save'); await tick(p);
  ok(await p.evaluate(id => { const t = __UF.S.tx.find(t => t.id === id); return t.note === 'modificata' && !!t.rule; }, rid), 'Salva durante la nota funziona al primo clic e conserva la ricorrenza');
  // movimenti senza posizione: eliminare il più vecchio non riscrive gli altri
  const puts = await p.evaluate(async () => {
    await __UF.flushNow(); let n = 0; const orig = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function () { n++; return orig.apply(this, arguments); };
    __UF.S.tx.shift(); __UF.render(); await __UF.flushNow();
    IDBObjectStore.prototype.put = orig; return n;
  });
  ok(puts <= 3, 'eliminare il primo movimento scrive solo ' + puts + ' record (prima: tutti i successivi)');
  await p.reload(); await tick(p, 600);
  ok(await p.evaluate(() => __UF.S.tx.length) === after.tx - 1, 'dopo ricarica i movimenti sono coerenti');
  // export backup (headless: download)
  await p.evaluate(() => __UF.act('tab', { dataset: { tab: 'settings' } }));
  ok(await p.locator('[data-act="chkupd"]').count() === 1, 'pulsante «Controlla aggiornamenti» presente');
  const dlP = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await p.click('[data-act="export"]'); await p.click('[data-act="expgo"]');
  const dl = await dlP; ok(!!dl, 'backup scaricato: ' + (dl && dl.suggestedFilename()));
  const txt = dl ? require('fs').readFileSync(await dl.path(), 'utf8') : '';
  const cases = await p.evaluate((t) => {
    const out = {}; const base = JSON.parse(t);
    function mk(fn) { const o = JSON.parse(JSON.stringify(base)); fn(o.data); o.check = __UF.hash53(__UF.stable(o.data)); return __UF.readBackup(JSON.stringify(o)).err || 'ACCETTATO'; }
    out.xssLot = mk(d => { d.pos[0].lots[0].id = 'x"><img src=x onerror=alert(1)>'; });
    out.homeView = mk(d => { d.prefs.homeView = 5; });
    out.lastBackup = mk(d => { d.prefs.lastBackup = 20261101; });
    out.fee = mk(d => { d.rules.find(r => r.type === 'pac').fee = 0.5; });
    out.ctorType = mk(d => { d.accounts[0].type = 'constructor'; });
    out.ctorKind = mk(d => { d.tx[0].kind = 'toString'; });
    out.valid = mk(d => {});
    return out;
  }, txt);
  for (const k of ['xssLot', 'homeView', 'lastBackup', 'fee', 'ctorType', 'ctorKind']) ok(cases[k] !== 'ACCETTATO', `rifiuta backup ${k}: ${cases[k]}`);
  ok(cases.valid === 'ACCETTATO', 'backup valido accettato');
  // data del saldo: conto con saldo al 1° ottobre, spesa del 15 ottobre
  await p.evaluate(() => __UF.act('tab', { dataset: { tab: 'conti' } }));
  await p.click('[data-act="newacc"]'); await p.fill('#af-name', 'Conto test'); await p.fill('#af-open', '1000'); await p.fill('#af-date', '2026-10-01');
  await p.click('[data-act="saveacc"]'); await tick(p, 600);
  const acc = await p.evaluate(() => __UF.S.accounts.find(a => a.name === 'Conto test'));
  ok(acc && acc.openDate === '2026-10-01', 'nuovo conto con data del saldo 1 ott');
  const pastTx = await p.evaluate((id) => { __UF.S.lastAcc = id; return id; }, acc.id);
  await p.click('[data-tab="home"]'); await p.click('[data-act="add"]');
  for (const k of '25') await p.click(`[data-act="key"][data-k="${k}"]`);
  await p.fill('#a-date', '2026-10-15'); await p.dispatchEvent('#a-date', 'change'); await p.click('#a-save'); await tick(p, 600);
  ok(await p.evaluate(id => __UF.balance(id), acc.id) === 97500, 'spesa del 15 ott registrata: saldo 975,00');
  await p.evaluate(id => __UF.act('acc', { dataset: { id } }), acc.id); await p.click('.layer [data-act="accedit"]');
  await p.fill('#af-date', '2026-10-20'); await p.click('[data-act="saveacc"]'); await tick(p);
  ok(/movimento del/.test(await p.textContent('#af-msg')), 'data del saldo dopo un movimento rifiutata: ' + await p.textContent('#af-msg'));
  await p.click('.layer [data-act="close"]'); await tick(p);
  // Annulla aggiorna le schermate aperte
  const u = await p.evaluate(async () => {
    __UF.act('posopen', { dataset: { id: 'p1', chart: '1' } }); const v0 = document.querySelector('#nw-val').textContent;
    __UF.act('pricenew', { dataset: { id: 'p1' } }); __UF.act('xmode', { dataset: { m: 'px' } }); document.querySelector('#x-in').value = '50'; __UF.act('saveprice', {}); 
    const v1 = document.querySelector('#nw-val').textContent; __UF.act('undo', {}); const v2 = document.querySelector('#nw-val').textContent;
    return [v0, v1, v2];
  });
  ok(u[0] !== u[1] && u[2] === u[0], 'Annulla aggiorna la schermata aperta: ' + u.join(' → '));
  await p.evaluate(() => __UF.act('close', {}));
  // XIRR con perdita estrema e titolo investimento eliminato
  const x = await p.evaluate(() => __UF.xirr([{ d: '2025-12-17', cf: -10000 }], '2026-12-17', 300));
  ok(x !== null && x < -0.96, 'XIRR con perdita del 97%: ' + (x * 100).toFixed(2) + '%');
  // clearData conserva le versioni salvate
  const cd = await p.evaluate(async () => { await __UF.repo.snapPut({ id: 'stest', at: Date.now(), kind: 'pre', z: 'r:{}' }); const before = (await __UF.repo.snapList()).length; await __UF.repo.clearData(); const after = (await __UF.repo.snapList()).length; return [before, after]; });
  ok(cd[0] >= 1 && cd[0] === cd[1], 'clearData conserva le versioni salvate: ' + cd.join('→'));
  // offline dopo la prima apertura
  await p.reload(); await tick(p, 800);
  const swOk = await p.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()));
  ok(swOk, 'service worker registrato');
  await ctx.setOffline(true); await p.reload(); await tick(p, 800);
  ok(await p.evaluate(() => !!document.querySelector('.splash, #view .hero, #view h1')), 'si apre anche offline');
  const miss = await p.evaluate(async () => { const r = await fetch('nonesiste.png'); return r.status; });
  ok(miss === 503, 'risorsa assente offline → 503, non errore: ' + miss);
  await ctx.setOffline(false);
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
