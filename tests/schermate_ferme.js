// Schermate ferme: creare/modificare conti e investimenti non deve far muovere lo schermo intero
// (trascinamento, rimbalzo, tastiera aperta su iPhone). Simula il dito con eventi touch reali (CDP)
// e la tastiera riducendo visualViewport.
const { chromium } = require('playwright');
const APP = 'http://127.0.0.1:8765/index.html';
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 250) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  await ctx.route('https://api.coingecko.com/**', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: '{}' }));
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.clock.install({ time: new Date('2026-11-02T10:00:00') });
  await p.goto(APP); await tick(p, 700); await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  const cdp = await ctx.newCDPSession(p);
  await p.evaluate(() => { document.addEventListener('touchmove', e => { window.__dp = window.__dp || e.defaultPrevented; }, { passive: true }); });
  // trascina con un dito da (x,y0) a (x,y1); restituisce se almeno un touchmove è stato bloccato
  const drag = async (x, y0, y1, fingers = 1) => {
    await p.evaluate(() => { window.__dp = false; });
    const pts = y => Array.from({ length: fingers }, (_, i) => ({ x: x + i * 60, y, id: i }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pts(y0) });
    for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pts(y0 + (y1 - y0) * k / 8) }); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await tick(p, 300);
    return p.evaluate(() => window.__dp);
  };
  const open = async n => { await p.evaluate(n => __UF.act(n, document.createElement('button')), n); await tick(p, 300); };
  const layerBox = () => p.evaluate(() => { const r = __UF.L[__UF.L.length - 1].el.getBoundingClientRect(); return { top: Math.round(r.top), h: Math.round(r.height) }; });
  const kbd = (h, top) => p.evaluate(([h, top]) => {
    const v = window.visualViewport;
    if (h == null) { delete v.height; delete v.offsetTop; } else { Object.defineProperty(v, 'height', { get: () => h, configurable: true }); Object.defineProperty(v, 'offsetTop', { get: () => top, configurable: true }); }
    v.dispatchEvent(new Event('resize'));
  }, [h, top]);

  // Senza schermate aperte la Home scorre normalmente
  ok(!(await drag(200, 600, 300)), 'Home: il trascinamento non viene bloccato (la pagina scorre)');
  await p.evaluate(() => window.scrollTo(0, 300)); await tick(p, 100);
  const y0 = await p.evaluate(() => window.scrollY);

  // ---- Nuovo conto ----
  await open('newacc');
  ok(await p.evaluate(() => __UF.L.length === 1 && __UF.L[0].name === 'acc'), 'Nuovo conto aperto');
  ok(await p.evaluate(() => document.documentElement.classList.contains('lock')), 'pagina sotto bloccata (html.lock)');
  ok(await drag(200, 30, 400), 'Nuovo conto: trascinare l’intestazione non muove lo schermo (touchmove bloccato)');
  ok(await drag(200, 800, 400), 'Nuovo conto: trascinare la barra dei pulsanti non muove lo schermo');
  ok((await p.evaluate(() => window.scrollY)) === y0, 'la pagina sotto non è scorsa (' + y0 + ')');
  ok((await layerBox()).top === 0, 'la schermata resta in alto (top 0)');
  const scr = () => p.evaluate(() => __UF.L[__UF.L.length - 1].el.querySelector('.scrb').scrollTop);
  const over = await p.evaluate(() => { const s = __UF.L[__UF.L.length - 1].el.querySelector('.scrb'); return s.scrollHeight > s.clientHeight; });
  ok(over, 'il modulo del conto è più alto dello schermo (serve lo scorrimento interno)');
  ok(await drag(200, 300, 600), 'contenuto già in cima: tirare giù non fa rimbalzare lo schermo');
  ok(!(await drag(200, 600, 200)), 'trascinare il contenuto lo fa scorrere (non bloccato)');
  ok((await scr()) > 0, 'il contenuto del modulo è scorso (' + (await scr()) + ' px)');
  ok((await p.evaluate(() => window.scrollY)) === y0, 'la pagina sotto è ancora ferma');
  ok(!(await drag(200, 300, 600, 2)), 'due dita (zoom) restano permesse');

  // Tastiera aperta (iPhone): la schermata si adatta all'area visibile e il campo resta visibile
  await p.evaluate(() => __UF.L[0].el.querySelector('.scrb').scrollTop = 0);
  await kbd(450, 0); await tick(p, 100);
  let lb = await layerBox();
  ok(lb.h === 450 && lb.top === 0, 'tastiera aperta: la schermata occupa solo l’area visibile (' + JSON.stringify(lb) + ')');
  ok(await p.evaluate(() => document.documentElement.classList.contains('kb')), 'stato «tastiera aperta» riconosciuto');
  const footVis = await p.evaluate(() => { const r = __UF.L[0].el.querySelector('.scrf .btn').getBoundingClientRect(); return r.bottom <= 450; });
  ok(footVis, 'il pulsante «Crea conto» resta sopra la tastiera');
  await p.focus('#af-gc'); await tick(p, 500);
  const vis = await p.evaluate(() => { const r = document.getElementById('af-gc').getBoundingClientRect(), s = __UF.L[0].el.querySelector('.scrb').getBoundingClientRect(); return r.top >= s.top && r.bottom <= s.bottom && r.bottom <= 450; });
  ok(vis, 'il campo «Importo da raggiungere» viene portato in vista sopra la tastiera');
  await kbd(450, 180); await tick(p, 100);
  lb = await layerBox();
  ok(lb.top === 180, 'se iOS sposta l’area visibile, la schermata la segue invece di scivolare (top ' + lb.top + ')');
  ok(await drag(200, 200, 400), 'con la tastiera aperta trascinare l’intestazione non muove lo schermo');
  await kbd(null); await p.evaluate(() => document.activeElement.blur()); await tick(p, 100);
  lb = await layerBox();
  ok(lb.top === 0 && lb.h === 844, 'tastiera chiusa: schermata di nuovo a tutto schermo (' + JSON.stringify(lb) + ')');

  // ---- Modifica conto ----
  await p.evaluate(() => __UF.act('close', document.createElement('button'))); await tick(p, 300);
  ok((await p.evaluate(() => window.scrollY)) === y0, 'chiusa la schermata, la Home è alla stessa posizione (' + y0 + ')');
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('lock'))), 'pagina sbloccata');
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('accedit', b); }); await tick(p, 300);
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].name === 'acc'), 'Modifica conto aperta');
  ok(await drag(200, 30, 400), 'Modifica conto: l’intestazione non trascina lo schermo');
  ok((await layerBox()).top === 0, 'Modifica conto: la schermata resta ferma');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Nuovo investimento (schermata «fissa») ----
  await p.evaluate(() => { __UF.S.tab = 'portfolio'; __UF.render(); }); await tick(p, 200);
  await open('newpos');
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].name === 'posf'), 'Nuovo investimento aperto');
  ok(await drag(200, 30, 400), 'Nuovo investimento: l’intestazione non trascina lo schermo');
  ok(await drag(200, 300, 600), 'Nuovo investimento: il modulo senza scorrimento non trascina lo schermo');
  ok((await layerBox()).top === 0, 'Nuovo investimento: la schermata resta ferma');
  await kbd(420, 0); await tick(p, 100);
  ok(await p.evaluate(() => getComputedStyle(__UF.L[__UF.L.length - 1].el.querySelector('.scrb')).overflowY === 'auto'), 'con la tastiera aperta i campi in basso restano raggiungibili (scorrimento interno)');
  const last = await p.evaluate(() => { const ins = [...__UF.L[__UF.L.length - 1].el.querySelectorAll('.scrb input')].filter(i => i.offsetParent); const i = ins[ins.length - 1]; i.focus(); return i.id; });
  await tick(p, 500);
  ok(await p.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return r.bottom <= 420 && r.top >= 0; }, last), 'l’ultimo campo (' + last + ') resta visibile sopra la tastiera');
  ok((await layerBox()).h === 420, 'la schermata dell’investimento occupa l’area visibile');
  await kbd(null); await p.evaluate(() => document.activeElement.blur()); await tick(p, 100);

  // ---- Foglio dal basso: lo sfondo scuro non trascina lo schermo ----
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('acc', b); }); await tick(p, 300);
  ok(await p.evaluate(() => __UF.L.length === 1 && __UF.L[0].kind === 'sheet'), 'foglio del conto aperto');
  ok(await drag(200, 40, 300), 'foglio: trascinare lo sfondo scuro non muove lo schermo');
  ok((await layerBox()).top === 0, 'foglio: resta fermo');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Revisione: piccolo tremolio iniziale non blocca lo scorrimento del modulo ----
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('accedit', b); }); await tick(p, 300);
  const jit = await p.evaluate(() => {
    const sc = __UF.L[__UF.L.length - 1].el.querySelector('.scrb'); sc.scrollTop = 200;
    const tgt = sc.querySelector('.fld'), r = tgt.getBoundingClientRect(), x = r.left + 20, y = r.top + 10;
    const T = (cx, cy) => new Touch({ identifier: 7, target: tgt, clientX: cx, clientY: cy });
    const send = (type, cx, cy) => { const ev = new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [T(cx, cy)], changedTouches: [T(cx, cy)] }); tgt.dispatchEvent(ev); return ev.defaultPrevented; };
    send('touchstart', x, y);
    const a = send('touchmove', x + 3, y - 1), b2 = send('touchmove', x + 3, y - 10), c = send('touchmove', x + 4, y - 30);
    send('touchend', x + 4, y - 30);
    send('touchstart', x, y); const d = send('touchmove', x + 1, y - 20); send('touchend', x, y);
    return [a, b2, c, d];
  });
  ok(JSON.stringify(jit) === '[false,false,false,false]', 'tremolio orizzontale iniziale: lo scorrimento verticale del modulo non viene bloccato (' + JSON.stringify(jit) + ')');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Revisione: dopo «Elimina tutti i dati» la Home torna scorrevole ----
  await p.evaluate(() => { __UF.S.tab = 'settings'; __UF.render(); }); await open('resetopen');
  for (let k = 0; k < 2 && await p.evaluate(() => __UF.L.length > 0); k++) { await p.click('.layer [data-act="resetgo"]'); await tick(p, 500); }
  ok(await p.evaluate(() => __UF.L.length === 0), 'dati eliminati, schermata chiusa');
  await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('lock') || document.body.classList.contains('lock'))), 'dopo il reset la pagina non resta bloccata');
  await p.evaluate(() => window.scrollTo(0, 250)); await tick(p, 100);
  ok((await p.evaluate(() => window.scrollY)) > 0, 'dopo il reset la Home scorre di nuovo');

  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
  process.exit(fails ? 1 : 0);
})();
