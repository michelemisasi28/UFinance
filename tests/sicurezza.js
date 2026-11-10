// Sicurezza: l'app gira sotto la stessa Content-Security-Policy del sito senza violazioni, uno script iniettato non parte,
// e nessun testo dell'utente (nomi, note, simboli) viene mai interpretato come HTML in nessuna schermata.
// Server: tests/servi.js (lo avvia tests/esegui.sh), che applica le intestazioni di netlify.toml.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
(async () => {
  // ---------- 0. netlify.toml e index.html combaciano ----------
  const toml = fs.readFileSync(path.join(__dirname, '..', 'netlify.toml'), 'utf8'), html = fs.readFileSync(path.join(__dirname, '..', 'app', 'index.html'), 'utf8');
  const inl = /<script>([\s\S]*?)<\/script>/.exec(html), sha = crypto.createHash('sha256').update(inl[1], 'utf8').digest('base64');
  ok(toml.includes("'sha256-" + sha + "'"), 'netlify.toml: impronta dello script in linea aggiornata (tools/stamp.js)');
  ok((html.match(/<script>/g) || []).length === 1 && !/\son[a-z]+\s*=/.test(html), 'index.html: un solo script in linea, nessun gestore on…=');

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true });
  await ctx.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"bitcoin":{"eur":68000,"last_updated_at":1793000000}}' }));
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; window.__csp = []; document.addEventListener('securitypolicyviolation', e => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI)); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-10T10:00:00') });
  const resp = await p.goto(APP); const H = resp.headers();
  ok(/default-src 'self'/.test(H['content-security-policy'] || '') && /frame-ancestors 'none'/.test(H['content-security-policy']) && H['x-frame-options'] === 'DENY', 'intestazioni: Content-Security-Policy e blocco dell’incorporamento presenti');
  await tick(p, 800);
  ok(await p.evaluate(() => /^(chiaro|scuro)$/.test(document.documentElement.dataset.uf)), 'lo script del tema all’avvio parte (impronta accettata)');
  await p.click('[data-act="startdemo"]'); await tick(p, 1500);
  ok(await p.evaluate(() => !!navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(r => !!r)), 'service worker registrato sotto la policy');

  // se lo script d'avvio non parte (impronta sbagliata), l'app ricava comunque il tema da sola
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await c2.route('**/index.html', async r => { const res = await r.fetch(); await r.fulfill({ response: res, body: (await res.text()).replace('(function () {', '(function () { /* modificato */') }); });
  await c2.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  const p2 = await c2.newPage(); await p2.goto(APP); await p2.waitForTimeout(900);
  ok(await p2.evaluate(() => document.documentElement.dataset.uf === 'scuro' && !!document.querySelector('.splash')), 'script del tema bloccato: l’app si avvia lo stesso e segue il tema del sistema');
  await c2.close();

  // ---------- 1. uno script iniettato non viene eseguito ----------
  await p.evaluate(() => { const s = document.createElement('script'); s.textContent = 'window.__inj = 1'; document.body.appendChild(s); const d = document.createElement('div'); d.innerHTML = '<img src="x" onerror="window.__inj2 = 1">'; document.body.appendChild(d); });
  await tick(p, 300);
  ok(await p.evaluate(() => window.__inj === undefined && window.__inj2 === undefined), 'script e gestori in linea iniettati vengono bloccati dalla policy');
  ok(await p.evaluate(() => fetch('https://example.com/', { mode: 'no-cors' }).then(() => 'APERTO', () => 'bloccato')) === 'bloccato', 'connessioni verso siti diversi da CoinGecko bloccate');
  await p.evaluate(() => { window.__csp = []; document.querySelectorAll('body > div:not(.app):not(#fabw):not(#toast)').forEach(e => { if (!e.className) e.remove(); }); });

  // ---------- 2. testi dell'utente con HTML: mai interpretati ----------
  const X = '<img src=x onerror="window.__xss=1"><b class=xssb>"\'&';
  await p.evaluate(X => {
    const S = __UF.S;
    S.accounts.forEach((a, i) => { a.name = (X + i).slice(0, 60); });
    S.cats.forEach((c, i) => { c.name = X + i; c.budget = c.kind === 'spesa' ? 1000 : undefined; if (c.budget === undefined) delete c.budget; });
    S.subs.forEach((s, i) => { s.name = X + i; });
    S.tx.forEach((t, i) => { t.note = X + i; });
    S.pos.forEach((q, i) => { q.name = X + i; if (q.kind === 'crypto') { q.sym = 'B<b>'; q.cgName = X; } else q.isin = '<i>x</i>'; });
    S.gone.push({ id: 'gx', name: X });
    S.accounts.find(a => a.type === 'risparmio').goal = { cents: 100000, date: '2027-06-30' };
    __UF.render();
  }, X);
  const walk = await p.evaluate(async () => {
    const U = __UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); };
    const P = U.S.pos.find(x => x.kind !== 'crypto').id, C = U.S.pos.find(x => x.kind === 'crypto').id, a0 = U.S.accounts[0].id, bad = [], seen = [];
    const steps = [['home', () => A('tab', { tab: 'home' })], ['conti', () => A('tab', { tab: 'conti' })], ['analisi', () => { A('tab', { tab: 'analisi' }); A('anview', { v: 'ov' }); U.S.an.blocks.acc = U.S.an.blocks.list = true; U.render(); }],
      ['budget', () => A('anview', { v: 'bud' })], ['portfolio', () => A('tab', { tab: 'portfolio' })], ['impostazioni', () => A('tab', { tab: 'settings' })],
      ['nuovo movimento', () => A('add')], ['scegli conto', () => { A('add'); A('pickacc', { w: 'from' }); }], ['scegli categoria', () => { A('add'); A('pickcat'); }], ['giroconto', () => A('giro')],
      ['dettaglio movimento', () => A('tx', { id: U.S.tx[U.S.tx.length - 1].id })], ['movimenti', () => A('txlist')], ['filtri', () => { A('txlist'); A('tlmore'); }], ['ricorrenze', () => A('rules')],
      ['ricorrenza', () => { A('rules'); A('ruleopen', { id: U.S.rules[0].id }); }], ['vista home', () => A('scope')], ['conto', () => A('acc', { id: a0 })], ['modifica conto', () => A('accedit', { id: a0 })],
      ['correggi saldo', () => A('fixopen', { id: a0 })], ['elimina conto', () => A('delaccopen', { id: a0 })], ['andamento', () => A('nwopen')], ['categorie', () => A('managecats', { k: 'spesa' })],
      ['categoria', () => { A('managecats', { k: 'spesa' }); A('editcat', { id: U.S.cats[0].id }); }], ['sottotipologie', () => A('managesubs')], ['conti analisi', () => A('anacc')], ['budget modifica', () => A('budgets')],
      ['obiettivo', () => A('goalnew')], ['investimento', () => A('posopen', { id: P })], ['cripto', () => A('posopen', { id: C })], ['andamento prodotto', () => A('posopen', { id: P, chart: '1' })],
      ['acquisto', () => A('lotnew', { id: P, dir: 'buy' })], ['aggiorna valore', () => A('pricenew', { id: P })], ['aggiorna valori', () => A('pxall')], ['PAC', () => A('pacnew', { id: P })],
      ['operazioni', () => A('poslist', { id: P })], ['elimina investimento', () => A('delposopen', { id: P })], ['versioni', () => A('snaps')], ['importa', () => U.openImport({ snap: U.snapState(), what: 'Backup', at: '2026-11-10' })],
      ['conflitto', () => { U.P.conf = { local: U.snapState(), remote: { snap: U.snapState() } }; U.openConflict(); }],
      ['voce', () => { U.P.canWrite = true; A('voice'); document.querySelector('#v-text').value = 'ho pagato 12 euro di pizza e 5 euro di caffè'; U.voiceParse(); }]];
    for (const [n, f] of steps) {
      if (U.L.length) U.closeAll(); U.P.conf = null; U.P.canWrite = true;
      try { f(); } catch (e) { bad.push(n + ': errore ' + e.message); }
      await new Promise(r => setTimeout(r, 60)); seen.push(n);
      if (document.querySelector('.xssb, img[src="x"]') || window.__xss) bad.push(n + ': HTML interpretato');
    }
    U.closeAll(); window.dispatchEvent(new CustomEvent('uf-toast', { detail: '<b class=xssb>' }));
    if (document.querySelector('.xssb')) bad.push('toast: HTML interpretato');
    return { bad, n: seen.length };
  });
  ok(!walk.bad.length, `nessun testo dell’utente interpretato come HTML in ${walk.n} schermate` + (walk.bad.length ? ' — ' + walk.bad.join(' | ') : ''));
  // un backup con icone o colori «creativi» viene rifiutato prima di arrivare all'interfaccia
  const val = await p.evaluate(() => { const s = __UF.snapState(), a = JSON.parse(JSON.stringify(s)), c = JSON.parse(JSON.stringify(s)), d = JSON.parse(JSON.stringify(s)); a.accounts[0].icon = '<img src=x>'; c.accounts[0].color = 'red;background:url(x)'; d.cats[0].icon = '"><i>'; return [__UF.validateSnap(a).length, __UF.validateSnap(c).length, __UF.validateSnap(d).length]; });
  ok(val.every(n => n > 0), 'backup con icona o colore non validi: rifiutato (' + val.join(', ') + ')');

  // ---------- 3. esportazioni sotto la policy ----------
  const dl = p.waitForEvent('download', { timeout: 8000 }).catch(() => null);
  await p.evaluate(() => { const e = document.createElement('button'); __UF.act('csvall', e); });
  ok(!!(await dl), 'esportazione CSV (file scaricato) funziona sotto la policy');
  const csp = await p.evaluate(() => window.__csp);
  ok(!csp.length, 'nessuna violazione della Content-Security-Policy durante l’uso' + (csp.length ? ': ' + [...new Set(csp)].join(' | ') : ''));
  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
})();
