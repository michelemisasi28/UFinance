// Verifica del sito pubblicato (rete vera, CoinGecko vero).
// Uso: NOBADGE=1 node tests/sito_pubblicato.js <build attesa, es. fbb89f72>
// NOBADGE=1 nasconde SOLO nel test il riquadro «Powered by Netlify» (da spegnere nelle impostazioni del progetto Netlify).
const { chromium } = require('playwright');
require('fs').mkdirSync(require('path').join(__dirname, 'out'), { recursive: true });
const SITE = 'https://ufinanceapp.netlify.app/', BUILD = process.argv[2] || 'ab9ba903';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 300) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  // ---- file e intestazioni ----
  const ctx0 = await b.newContext(); const r0 = ctx0.request;
  const files = ['', 'index.html', 'sw.js', 'manifest.webmanifest', 'css/app.css', 'js/repo.js', 'js/voice.js', 'js/app.js', 'js/pwa.js', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/favicon-32.png'];
  const bad = [];
  for (const f of files) { const r = await r0.get(SITE + f); if (r.status() !== 200) bad.push(f + ' ' + r.status()); }
  ok(!bad.length, 'tutti i file dell’app raggiungibili (' + files.length + ')' + (bad.length ? ': ' + bad.join(', ') : ''));
  const sw = await (await r0.get(SITE + 'sw.js')).text(), ix = await r0.get(SITE + 'index.html');
  ok(sw.includes(`BUILD = '${BUILD}'`) && sw.includes('js/voice.js'), 'service worker della nuova versione (' + BUILD + ', con voice.js)');
  ok(/no-cache/.test(ix.headers()['cache-control'] || ''), 'index.html sempre ricontrollato (Cache-Control: ' + ix.headers()['cache-control'] + ')');
  ok((await r0.get(SITE + '.claude/agents/ufinance-reviewer.md')).status() === 404 && (await r0.get(SITE + 'netlify.toml')).status() === 404, 'file di progetto non pubblicati (.claude, netlify.toml)');
  await ctx0.close();
  // ---- nuovo utente sul telefono ----
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'it-IT' });
  const p = await ctx.newPage(), errs = [], cg = [];
  // SOLO NEL TEST: si simula il riquadro «Powered by Netlify» disattivato nelle impostazioni del progetto
  if (process.env.NOBADGE) await ctx.addInitScript(() => { const st = document.createElement('style'); st.textContent = '#nl-badge-frame{display:none!important}'; document.addEventListener('DOMContentLoaded', () => document.head.appendChild(st)); });
  const badge = async () => p.evaluate(() => { const f = document.querySelector('#nl-badge-frame'); return !!f && getComputedStyle(f).display !== 'none'; });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  p.on('response', r => { if (r.url().includes('coingecko')) cg.push(r.status()); if (r.status() >= 400) console.log('INFO risposta ' + r.status() + ' ' + r.url().slice(0, 90) + (r.fromServiceWorker() ? ' (dal service worker)' : '')); });
  await p.goto(SITE); await tick(p, 1200);
  ok(await p.evaluate(() => window.UF_BUILD) === undefined || await p.evaluate(b => (window.UF_BUILD || '').includes(b), BUILD), 'l’app caricata è la nuova versione: ' + await p.evaluate(() => window.UF_BUILD));
  await p.click('[data-act="startdemo"]'); await tick(p, 1500);
  ok(await p.locator('#tour').count() === 1, 'primo avvio: parte il tutorial guidato');
  console.log('INFO riquadro «Powered by Netlify» visibile: ' + await badge());
  await p.click('#tour [data-tour="skip"]'); await tick(p, 400);
  // CoinGecko vero dal dominio del sito
  await p.waitForFunction(() => __UF.posById('p3').cgId === 'bitcoin', null, { timeout: 15000 }).catch(() => {});
  const btc = await p.evaluate(() => ({ id: __UF.posById('p3').cgId, px: __UF.pxAt(__UF.posById('p3'), __UF.TODAY) / 1e6, err: __UF.CG.err }));
  ok(btc.id === 'bitcoin' && btc.px > 1000 && !btc.err, `CoinGecko reale dal sito: Bitcoin collegato, prezzo ${btc.px.toLocaleString('it-IT')} € (risposte ${cg.join(',')})`);
  // voce (testo, come con il microfono della tastiera)
  await p.click('#fabw .fab.mic'); await tick(p);
  await p.fill('#v-text', 'Ho pagato 5€ in farmacia ed ho mandato un bonifico da banca ad antonio ed ha detto che me li ridarà'); await p.click('[data-act="vparse"]'); await tick(p, 400);
  ok(await p.locator('.vcard').count() === 2, 'voce: la frase d’esempio produce 2 movimenti in anteprima');
  await p.locator('.vcard').nth(1).locator('[data-vf="amt"]').fill('100');
  const nw0 = await p.evaluate(() => __UF.netWorth());
  await p.click('#v-ok'); await tick(p, 500);
  ok(await p.evaluate(nw => __UF.netWorth() === nw - 500 && __UF.S.accounts.some(a => a.name === 'Antonio' && a.type === 'credito'), nw0), 'voce: confermati, patrimonio −5 €, credito «Antonio» creato');
  // salvataggio e riapertura
  await p.evaluate(async () => { __UF.S.demo = false; __UF.render(); await __UF.flushNow(); });
  const n = await p.evaluate(() => __UF.S.tx.length);
  await p.reload(); await tick(p, 1500);
  ok(await p.evaluate(() => __UF.S.tx.length) === n, 'riaprendo l’app i dati ci sono tutti (' + n + ' movimenti)');
  ok(await p.evaluate(() => !!navigator.serviceWorker.controller), 'service worker attivo (app installabile, funziona offline)');
  // offline
  await ctx.setOffline(true); await p.reload(); await tick(p, 1500);
  ok(await p.evaluate(n => !!window.__UF && __UF.S.tx.length === n, n), 'senza rete: l’app si apre con tutti i dati');
  await ctx.setOffline(false);
  await p.screenshot({ path: require('path').join(__dirname, 'out', 'live_home.png') });
  const realErrs = errs.filter(e => !/coingecko/i.test(e));
  ok(!realErrs.length, 'nessun errore JS: ' + JSON.stringify(realErrs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
