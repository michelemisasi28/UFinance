// Aggiornamento reale: stessa origine, service worker attivo, banner «Aggiornamento disponibile».
// Uso: tests/esegui.sh (prepara le versioni in tests/.work/ver e serve tests/.work/upg sulla porta 8768)
//      oppure: node tests/aggiornamento.js [cartella-nuova-versione]
const { chromium } = require('playwright'); const cp = require('child_process'), fs = require('fs'), path = require('path');
const SP = path.join(__dirname, '.work'), UPG = path.join(SP, 'upg'), URL = 'http://127.0.0.1:8768/index.html';
const NEW = process.argv[2] || path.join(__dirname, '..', 'app');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const serve = dir => cp.execSync(`rm -rf ${UPG}/* && cp -r ${dir}/. ${UPG}/`);
// impronta dei dati dell'utente: conti, movimenti (senza ordine), investimenti (senza i prezzi cripto di oggi), regole, categorie
const sigFn = () => { const S = __UF.S, T = __UF.TODAY;
  const pos = JSON.parse(JSON.stringify(S.pos)).map(p => { delete p.cgId; delete p.cgName; if (p.kind === 'crypto') p.prices = p.prices.filter(x => x.d !== T); return p; });
  const cats = JSON.parse(JSON.stringify(S.cats)).map(c => { delete c.budget; return c; });
  const o = { a: S.accounts, g: S.gone, t: S.tx.slice().sort((x, y) => x.id < y.id ? -1 : 1), p: pos, r: S.rules, c: cats, s: S.subs, conti: S.accounts.reduce((z, a) => z + __UF.balance(a.id), 0), lb: S.lastBackup, cur: S.cur, th: S.theme };
  const out = {}; Object.keys(o).forEach(k => out[k] = __UF.stable(o[k])); return JSON.stringify(out); };

async function upgradeTo(p, dir, label) {
  serve(dir);
  await p.reload(); await p.waitForTimeout(1500);           // il browser scopre il nuovo sw.js
  const banner = await p.waitForSelector('#upd', { timeout: 10000 }).catch(() => null);
  ok(!!banner, `${label}: compare «Aggiornamento disponibile»`);
  if (banner) { await banner.click(); await p.waitForTimeout(2500); }
  else { await p.reload(); await p.waitForTimeout(1500); }
}
async function run(b, chain) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: r.request().url().includes('search') ? JSON.stringify({ coins: [{ id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', market_cap_rank: 1 }] }) : JSON.stringify({ bitcoin: { eur: 70000 } }) }));
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; }); // qui si verificano i dati, il tutorial ha i suoi test
  const p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  // ---- utente con la versione di partenza e i suoi dati ----
  serve(chain[0][0]);
  await p.goto(URL); await p.waitForTimeout(800);
  await p.click('[data-act="startdemo"]'); await p.waitForTimeout(600);
  await p.evaluate(async () => {   // diventano dati «veri»: niente esempio, qualche movimento e un conto in più, preferenze personali
    const S = __UF.S; S.demo = false; S.theme = 'scuro'; S.lastBackup = '2026-11-18';
    S.accounts.push({ id: 'a900', name: 'Revolut', type: 'liquidita', sub: 's4', icon: '💳', color: '#3B5BDB', opening: 12345, openDate: '2026-09-01' });
    for (let i = 0; i < 40; i++) S.tx.push({ id: 'tz' + i, kind: 'spesa', cents: 100 + i * 7, accId: i % 2 ? 'a900' : 'a1', date: __UF.addDays('2026-11-19', -i), catId: 'c1', note: 'Mia spesa ' + i + ' «test» & <ok>', ts: 5000 + i });
    S.tx = S.tx.filter(t => t.id !== 'tz5'); __UF.render(); await __UF.flushNow();
  });
  await p.reload(); await p.waitForTimeout(1200);         // ora il service worker controlla la pagina
  const ctrl = await p.evaluate(() => !!navigator.serviceWorker.controller);
  ok(ctrl, `${chain[0][1]}: app installata, service worker attivo`);
  const sig0 = await p.evaluate(sigFn), b0 = await p.evaluate(() => window.UF_BUILD);
  for (let i = 1; i < chain.length; i++) {
    await upgradeTo(p, chain[i][0], chain[i][1]);
    await p.evaluate(() => { if (__UF.tourEnd) __UF.tourEnd(true); });
    const st = await p.evaluate(() => ({ build: window.UF_BUILD, n: __UF.S.tx.length, theme: document.documentElement.getAttribute('data-uf') }));
    const sig = await p.evaluate(sigFn);
    ok(st.build !== b0, `${chain[i][1]}: codice aggiornato (${b0} → ${st.build})`);
    const A = JSON.parse(sig0), B = JSON.parse(sig), diff = Object.keys(A).filter(k => A[k] !== B[k]);
    if (diff.length) console.log('     differenze in: ' + diff.join(', ') + diff.map(k => '\n     ' + k + ' PRIMA ' + A[k].slice(0, 300) + '\n     ' + k + ' DOPO  ' + B[k].slice(0, 300)).join(''));
    ok(sig === sig0, `${chain[i][1]}: tutti i dati identici (conti, ${st.n} movimenti, investimenti, ricorrenze, categorie, patrimonio, preferenze)`);
    ok(st.theme === 'scuro', `${chain[i][1]}: preferenze conservate (tema scuro)`);
  }
  // ---- dopo l'aggiornamento: si salva, si riapre, si esporta e reimporta ----
  await p.evaluate(async () => { __UF.S.tx.push({ id: 'tnew', kind: 'entrata', cents: 777, accId: 'a2', date: __UF.TODAY, catId: 'e2', note: 'dopo', ts: 99999999 }); __UF.render(); await __UF.flushNow(); });
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => { if (__UF.tourEnd) __UF.tourEnd(true); });
  const after = await p.evaluate(async () => { const r = await __UF.repo.load(); return { mem: __UF.S.tx.length, db: r.snapshot.tx.length, schema: r.snapshot.schema, newTx: __UF.S.tx.some(t => t.id === 'tnew') }; });
  ok(after.newTx && after.mem === after.db, `nuovi movimenti salvati e riletti (${after.db} nell’archivio, formato ${after.schema})`);
  const bk = await p.evaluate(() => { const f = __UF.backupFile(), r = __UF.readBackup(JSON.stringify(f)); return r.err || ('ok ' + r.snap.tx.length); });
  ok(bk.startsWith('ok'), 'backup della nuova versione valido e reimportabile: ' + bk);
  const cached = await p.evaluate(async () => { const ks = await caches.keys(); return ks; });
  ok(cached.length === 1, 'una sola cache dell’interfaccia (le vecchie rimosse): ' + cached.join(','));
  // ---- offline dopo l'aggiornamento ----
  await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => !!window.__UF && __UF.S.tx.some(t => t.id === 'tnew')), 'dopo l’aggiornamento funziona anche offline, con i dati');
  await ctx.setOffline(false);
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await ctx.close();
}
(async () => {
  const b = await chromium.launch();
  const V = d => path.join(SP, 'ver', d);
  console.log('--- percorso 1: versione originale → versione pubblicata oggi → nuova');
  await run(b, [[V('originale'), 'originale'], [V('pubblicata'), 'pubblicata'], [NEW, 'nuova']]);
  console.log('--- percorso 2: versione originale → nuova (chi non ha aggiornato)');
  await run(b, [[V('originale'), 'originale'], [NEW, 'nuova']]);
  console.log('--- percorso 3: versione appena pubblicata → nuova (il prossimo aggiornamento)');
  await run(b, [[V('online'), 'online'], [NEW, 'nuova']]);
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
