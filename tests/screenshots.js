// Fotografie di tutte le schermate, i fogli e gli stati dell'app, in tema chiaro e scuro e a più dimensioni di iPhone.
// Serve a controllare a occhio tagli, sovrapposizioni e contrasto prima di pubblicare (non è una verifica automatica).
//   node tests/screenshots.js                       → tests/screenshots/<tema>-<LxA>/NN-nome.png (densità 1)
//   OUT=dir DPR=2 FMT=jpeg SIZES=390x844 THEMES=scuro node tests/screenshots.js
//   SOLO=home,conti node tests/screenshots.js       → solo alcune schermate
// Server dell'app su 127.0.0.1:8765 (lo avvia tests/esegui.sh, oppure: python3 -m http.server 8765 --directory app).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const APP = process.env.APP || 'http://127.0.0.1:8765/index.html';
const OUT = process.env.OUT || path.join(__dirname, 'screenshots');
const DPR = +(process.env.DPR || 1), FMT = process.env.FMT || 'png';
const SIZES = (process.env.SIZES || '375x667,390x844').split(',').map(s => s.split('x').map(Number));
const THEMES = (process.env.THEMES || 'chiaro,scuro').split(',');
const SOLO = process.env.SOLO ? process.env.SOLO.split(',') : null;
const tick = (p, ms = 250) => p.waitForTimeout(ms);

// Ogni stato: [nome, funzione eseguita nella pagina (riceve A = azione, U = __UF), opzioni]
// A(nome, {dataset}) simula il tocco su un pulsante con data-act.
const STATES = [
  ['home', `U.closeAll()`],
  ['home-fondo', `U.closeAll(); window.scrollTo(0, 1e6)`],
  ['home-nascosti', `U.closeAll(); U.S.hide = true; U.render()`, { after: `U.S.hide = false; U.render()` }],
  ['conti', `A('tab', { tab: 'conti' })`],
  ['conti-fondo', `A('tab', { tab: 'conti' }); window.scrollTo(0, 1e6)`],
  ['analisi', `A('tab', { tab: 'analisi' })`],
  ['analisi-fondo', `A('tab', { tab: 'analisi' }); window.scrollTo(0, 1e6)`],
  ['analisi-budget', `A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' })`],
  ['analisi-budget-fondo', `A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' }); window.scrollTo(0, 1e6)`],
  ['analisi-budget-mese-prima', `A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' }); A('budprev', {})`, { after: `A('budnext', {}); A('anview', { v: 'ov' })` }],
  ['analisi-budget-dati', `U.S.cats.forEach((c, i) => { if (c.kind === 'spesa' && i < 6) c.budget = [30000, 6000, 45000, 8000, 5000, 4000][i]; }); U.S.accounts.find(a => a.type === 'risparmio').goal = { cents: 1000000, date: '2027-06-30' }; A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' })`, { after: `U.S.cats.forEach(c => delete c.budget); U.S.accounts.forEach(a => delete a.goal); A('anview', { v: 'ov' })` }],
  ['analisi-budget-dati-fondo', `U.S.cats.forEach((c, i) => { if (c.kind === 'spesa' && i < 6) c.budget = [30000, 6000, 45000, 8000, 5000, 4000][i]; }); U.S.accounts.find(a => a.type === 'risparmio').goal = { cents: 1000000, date: '2027-06-30' }; A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' }); window.scrollTo(0, 1e6)`, { after: `U.S.cats.forEach(c => delete c.budget); U.S.accounts.forEach(a => delete a.goal); A('anview', { v: 'ov' })` }],
  ['portfolio', `A('tab', { tab: 'portfolio' })`],
  ['portfolio-fondo', `A('tab', { tab: 'portfolio' }); window.scrollTo(0, 1e6)`],
  ['impostazioni', `A('tab', { tab: 'settings' })`],
  ['impostazioni-fondo', `A('tab', { tab: 'settings' }); window.scrollTo(0, 1e6)`],
  // movimenti
  ['nuova-spesa', `A('tab', { tab: 'home' }); A('add', {})`],
  ['nuova-spesa-importo', `A('add', {}); ['1','2','3','4',',','5','6'].forEach(k => A('key', { k }))`],
  ['nuova-entrata', `A('add', {}); A('mode', { mode: 'entrata' })`],
  ['giroconto', `A('giro', {})`],
  ['scegli-conto', `A('add', {}); A('pickacc', { w: 'from' })`],
  ['scegli-categoria', `A('add', {}); A('pickcat', {})`],
  ['ripeti', `A('add', {}); A('reppick', {})`],
  ['movimento-dettaglio', `A('tx', { id: U.S.tx.filter(t => t.kind === 'spesa').slice(-1)[0].id })`],
  ['movimenti-elenco', `A('txlist', {})`],
  ['movimenti-filtri', `A('txlist', {}); A('tlmore', {})`],
  ['movimenti-nessuno', `A('txlist', {}); const q = document.querySelector('#tl-q'); q.value = 'zzzzqqq'; q.dispatchEvent(new Event('input', { bubbles: true }))`, { wait: 500 }],
  ['ricorrenze', `A('rules', {})`],
  ['ricorrenza-modulo', `A('rules', {}); A('ruleopen', { id: U.S.rules.find(r => r.type !== 'pac').id })`],
  ['voce', `A('voice', {})`],
  ['voce-anteprima', `A('voice', {}); document.querySelector('#v-text').value = 'ho pagato 12,50 euro di pizza con la carta Revolut e ieri ho ricevuto 50 euro da Marco, poi 30 euro di cinema'; U.voiceParse()`],
  ['scegli-vista-home', `A('scope', {})`],
  // conti
  ['conto-dettaglio', `A('acc', { id: U.S.accounts[0].id })`],
  ['conto-modifica', `A('accedit', { id: U.S.accounts[0].id })`],
  ['conto-nuovo', `A('newacc', {})`],
  ['conto-nuovo-obiettivo', `A('newacc', {}); A('agoal', {})`],
  ['conto-icona-colore', `A('newacc', {}); A('aicopen', {})`],
  ['conto-correggi-saldo', `A('fixopen', { id: U.S.accounts[0].id })`],
  ['conto-elimina', `A('delaccopen', { id: U.S.accounts[0].id })`],
  ['andamento', `A('nwopen', {})`],
  // categorie
  ['categorie-spesa', `A('managecats', { k: 'spesa' })`],
  ['categoria-modulo', `A('managecats', { k: 'spesa' }); A('editcat', { id: U.S.cats.find(c => c.kind === 'spesa').id })`],
  ['sottotipologie', `A('managesubs', {})`],
  ['sottotipologia-modulo', `A('managesubs', {}); A('editsub', { id: U.S.subs[0].id })`],
  // analisi
  ['analisi-conti', `A('tab', { tab: 'analisi' }); A('anacc', {})`],
  ['analisi-vista', `A('tab', { tab: 'analisi' }); A('anpers', {})`],
  ['budget-modifica', `A('budgets', {})`],
  // investimenti
  ['investimento-etf', `A('posopen', { id: U.S.pos.find(p => p.kind !== 'crypto').id })`],
  ['investimento-etf-fondo', `A('posopen', { id: U.S.pos.find(p => p.kind !== 'crypto').id }); const s = U.L[U.L.length - 1].el.querySelector('.scrb'); s.scrollTop = 1e6`],
  ['investimento-cripto', `A('posopen', { id: U.S.pos.find(p => p.kind === 'crypto').id })`],
  ['investimento-nuovo', `A('newpos', {})`],
  ['investimento-nuovo-gia-posseduto', `A('newpos', {}); A('pmode', { m: 'have' })`],
  ['investimento-nuovo-cripto', `A('newpos', {}); A('pkind', { k: 'crypto' })`],
  ['acquisto', `A('lotnew', { id: U.S.pos[0].id, dir: 'buy' })`],
  ['vendita', `A('lotnew', { id: U.S.pos[0].id, dir: 'sell' })`],
  ['aggiorna-valore', `A('pricenew', { id: U.S.pos.find(p => p.kind !== 'crypto').id })`],
  ['aggiorna-valori-guidato', `A('pxall', {})`],
  ['aggiorna-valori-posizione', `A('pxall', {}); A('pxwmode', {})`],
  ['pac-nuovo', `A('pacnew', { id: U.S.pos[0].id })`],
  ['operazioni-storico', `A('poslist', { id: U.S.pos[0].id })`],
  ['investimento-elimina', `A('delposopen', { id: U.S.pos[0].id })`],
  ['come-leggere', `A('invhelp', {})`],
  // impostazioni, dati, aiuto
  ['guida', `A('guide', {})`],
  ['esporta', `A('export', {})`],
  ['esporta-cifrato', `A('export', {}); A('expenc', {})`],
  ['versioni-salvate', `A('snaps', {})`, { wait: 700 }],
  ['elimina-dati', `A('resetopen', {})`],
  ['importa', `U.openImport({ snap: U.snapState(), what: 'Backup', at: new Date().toISOString() })`],
  ['conflitto', `U.P.conf = { local: U.snapState(), remote: { snap: U.snapState() } }; U.openConflict()`],
  ['avviso-toast', `U.closeAll(); A('tab', { tab: 'home' }); window.dispatchEvent(new CustomEvent('uf-toast', { detail: 'Movimento eliminato' }))`],
  ['aggiornamento-disponibile', `U.closeAll(); A('tab', { tab: 'home' }); const b = document.createElement('button'); b.id = 'upd'; b.className = 'banner'; b.textContent = 'Aggiornamento disponibile. Tocca per installarlo: i tuoi dati non cambiano.'; document.body.insertBefore(b, document.body.firstChild)`, { after: `document.getElementById('upd').remove()` }],
  ['tutorial', `U.closeAll(); U.startTour()`, { after: `U.tourEnd(true)` }],
  ['tutorial-budget', `U.closeAll(); U.startTour(); for (let i = 0; i < 7; i++) document.querySelector('[data-tour="next"]').click()`, { after: `U.tourEnd(true)`, wait: 600 }],
];
// Stati senza dati (prima apertura e app vuota)
const EMPTY = [
  ['vuoto-home', `A('tab', { tab: 'home' })`],
  ['vuoto-conti', `A('tab', { tab: 'conti' })`],
  ['vuoto-analisi', `A('tab', { tab: 'analisi' })`],
  ['vuoto-budget', `A('tab', { tab: 'analisi' }); A('anview', { v: 'bud' })`],
  ['vuoto-portfolio', `A('tab', { tab: 'portfolio' })`],
];

(async () => {
  const b = await chromium.launch();
  let n = 0, errs = [];
  for (const theme of THEMES) for (const [w, h] of SIZES) {
    const dir = path.join(OUT, theme + '-' + w + 'x' + h); fs.mkdirSync(dir, { recursive: true });
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, locale: 'it-IT', colorScheme: theme === 'scuro' ? 'dark' : 'light' });
    await ctx.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
    await ctx.addInitScript(t => { window.UF_TEST_NOTOUR = true; try { localStorage.setItem('uf-proto', JSON.stringify({ theme: t })); } catch (e) {} }, theme);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(theme + ' ' + w + 'x' + h + ': ' + e.message));
    await p.clock.install({ time: new Date('2026-11-05T10:00:00') });
    await p.goto(APP); await tick(p, 800);
    const shot = async (name, wait) => {
      await tick(p, wait || 300); n++;
      await p.screenshot({ path: path.join(dir, String(n).padStart(3, '0') + '-' + name + '.' + (FMT === 'jpeg' ? 'jpg' : 'png')), type: FMT, quality: FMT === 'jpeg' ? 72 : undefined });
    };
    const run = async (list, prefix) => {
      for (const [name, code, o] of list) {
        if (SOLO && !SOLO.includes(name)) continue;
        try {
          await p.evaluate(code => {
            const U = window.__UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); };
            if (U.L.length && !/closeAll/.test(code)) U.closeAll();
            window.scrollTo(0, 0); return new Function('U', 'A', code)(U, A);
          }, code);
          await shot(prefix + name, o && o.wait);
          if (o && o.after) await p.evaluate(code => { const U = window.__UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); }; return new Function('U', 'A', code)(U, A); }, o.after);
        } catch (e) { errs.push(theme + ' ' + w + 'x' + h + ' ' + name + ': ' + e.message.split('\n')[0]); }
      }
    };
    n = 0;
    if (!SOLO || SOLO.includes('avvio')) await shot('avvio');
    // app vuota
    await p.click('[data-act="start0"]'); await tick(p, 900);
    await run(EMPTY, '');
    // dati di esempio (contesto nuovo)
    await ctx.close();
    const ctx2 = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true, locale: 'it-IT', colorScheme: theme === 'scuro' ? 'dark' : 'light' });
    await ctx2.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{"bitcoin":{"eur":68000,"last_updated_at":1793000000}}' }));
    await ctx2.addInitScript(t => { window.UF_TEST_NOTOUR = true; try { localStorage.setItem('uf-proto', JSON.stringify({ theme: t })); } catch (e) {} }, theme);
    const p2 = await ctx2.newPage(); p2.on('pageerror', e => errs.push(theme + ' ' + w + 'x' + h + ': ' + e.message));
    await p2.clock.install({ time: new Date('2026-11-05T10:00:00') });
    await p2.goto(APP); await tick(p2, 800); await p2.click('[data-act="startdemo"]'); await tick(p2, 1200);
    const pp = p2;
    const run2 = async list => {
      for (const [name, code, o] of list) {
        if (SOLO && !SOLO.includes(name)) continue;
        try {
          await pp.evaluate(code => {
            const U = window.__UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); };
            if (U.L.length && !/closeAll/.test(code)) U.closeAll();
            document.getElementById('toast').hidden = true;
            window.scrollTo(0, 0); return new Function('U', 'A', code)(U, A);
          }, code);
          await tick(pp, (o && o.wait) || 300); n++;
          await pp.screenshot({ path: path.join(dir, String(n).padStart(3, '0') + '-' + name + '.' + (FMT === 'jpeg' ? 'jpg' : 'png')), type: FMT, quality: FMT === 'jpeg' ? 72 : undefined });
          if (o && o.after) await pp.evaluate(code => { const U = window.__UF, A = (n, ds) => { const e = document.createElement('button'); Object.assign(e.dataset, ds || {}); U.act(n, e); }; return new Function('U', 'A', code)(U, A); }, o.after);
        } catch (e) { errs.push(theme + ' ' + w + 'x' + h + ' ' + name + ': ' + e.message.split('\n')[0]); }
      }
    };
    await run2(STATES);
    await ctx2.close();
  }
  await b.close();
  console.log('Fotografie: ' + n + ' per combinazione, in ' + OUT);
  if (errs.length) { console.log('ERRORI:\n' + errs.join('\n')); process.exitCode = 1; }
})();
