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
  await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; window.UF_TEST_IOS = true; });
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
  ok(await p.evaluate(y => window.scrollY === 0 && document.body.scrollTop === y && document.documentElement.scrollHeight <= document.documentElement.clientHeight, y0), 'documento senza nulla da scorrere e pagina sotto ferma dov’era (' + y0 + ')');
  ok((await layerBox()).top === 0, 'la schermata resta in alto (top 0)');
  const scr = () => p.evaluate(() => __UF.L[__UF.L.length - 1].el.querySelector('.scrb').scrollTop);
  const fit = await p.evaluate(() => { const l = __UF.L[__UF.L.length - 1].el, s = l.querySelector('.scrb'); return { h: s.scrollHeight, c: s.clientHeight, sc: l.classList.contains('scrolls'), ta: getComputedStyle(l).touchAction }; });
  ok(fit.h <= fit.c + 1 && !fit.sc && fit.ta === 'none', 'il modulo del conto sta tutto nello schermo ed è fermo come «Aggiungi investimento» (' + JSON.stringify(fit) + ')');
  ok(await drag(200, 300, 600), 'trascinare il contenuto verso il basso non muove nulla');
  ok(await drag(200, 600, 200), 'trascinare il contenuto verso l’alto non muove nulla');
  ok((await scr()) === 0, 'il contenuto del modulo non è scorso');
  ok((await p.evaluate(() => window.scrollY)) === 0, 'il documento sotto è ancora fermo in cima');
  ok(!(await drag(200, 300, 600, 2)), 'due dita (zoom) restano permesse');

  // Tocco su un campo (iPhone): il focus lo dà l'app, Safari non deve trovare nulla da far scorrere
  await p.evaluate(() => __UF.L[0].el.querySelector('.scrb').scrollTop = 0);
  const hdr = () => p.evaluate(() => Math.round(__UF.L[0].el.querySelector('.scrh').getBoundingClientRect().top));
  const h0 = await hdr();
  const nb = await p.evaluate(() => { const r = document.getElementById('af-name').getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; });
  await p.evaluate(() => { const el = document.getElementById('af-name'); window.__tr = []; new MutationObserver(() => window.__tr.push(el.style.transform)).observe(el, { attributes: true, attributeFilter: ['style'] }); });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: nb.x, y: nb.y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await tick(p, 300);
  ok(await p.evaluate(() => document.activeElement && document.activeElement.id === 'af-name'), 'tocco sul campo «Nome»: il campo riceve il focus');
  const tr = await p.evaluate(() => ({ list: window.__tr, now: document.getElementById('af-name').style.transform }));
  ok(tr.list.some(x => /translateY\(-2000px\)/.test(x)) && tr.now === '', 'al tocco il campo esce di vista per un istante, così Safari non sposta la schermata (' + JSON.stringify(tr) + ')');
  ok((await hdr()) === h0 && (await p.evaluate(() => window.scrollY)) === 0, 'dopo il tocco intestazione e documento non si sono mossi');
  await p.evaluate(() => document.activeElement.blur());
  // un trascinamento che finisce su un campo non lo seleziona
  const fb = await p.evaluate(() => { const r = document.getElementById('af-open').getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 }; });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fb.x, y: fb.y + 120, id: 1 }] });
  for (let k = 1; k <= 6; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: fb.x, y: fb.y + 120 - k * 20, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await tick(p, 300);
  ok(await p.evaluate(() => !document.activeElement || document.activeElement.id !== 'af-open'), 'scorrere col dito sopra un campo non apre la tastiera');
  await p.evaluate(() => __UF.L[0].el.querySelector('.scrb').scrollTop = 0);

  // Tastiera aperta: la schermata non si sposta né si ridimensiona; il campo viene portato in vista scorrendo il contenuto
  await kbd(450, 0); await tick(p, 100);
  let lb = await layerBox();
  ok(lb.h === 844 && lb.top === 0, 'tastiera aperta: la schermata resta ferma e a tutta altezza (' + JSON.stringify(lb) + ')');
  ok((await hdr()) === h0, 'tastiera aperta: l’intestazione non si è mossa');
  ok(await p.evaluate(() => __UF.L[0].el.querySelector('.scrf .btn').getBoundingClientRect().bottom <= 450), 'tastiera aperta: il pulsante «Crea conto» resta sopra la tastiera');
  ok(await p.evaluate(() => document.documentElement.classList.contains('kb')), 'stato «tastiera aperta» riconosciuto');
  await p.evaluate(() => { const b = document.querySelector('[data-act="agoal"]'); if (b && !b.hidden) __UF.act('agoal', b); document.activeElement && document.activeElement.blur(); });
  await p.focus('#af-gc'); await tick(p, 500);
  const vis = await p.evaluate(() => { const r = document.getElementById('af-gc').getBoundingClientRect(), s = __UF.L[0].el.querySelector('.scrb').getBoundingClientRect(); return r.top >= s.top && r.bottom <= 450; });
  ok(vis, 'il campo «Importo da raggiungere» viene portato in vista sopra la tastiera');
  ok((await hdr()) === h0, 'e l’intestazione resta ferma');
  await p.evaluate(() => __UF.L[0].el.querySelector('.scrb').scrollTop = 99999); await tick(p, 50);
  ok(await p.evaluate(() => document.getElementById('af-gd').getBoundingClientRect().bottom <= 450), 'con la tastiera aperta si arriva fino all’ultimo campo (Entro il) sopra la tastiera');
  ok(await p.evaluate(() => __UF.L[0].el.classList.contains('scrolls')), 'con la tastiera aperta il contenuto può scorrere (serve per i campi sotto la tastiera)');
  await kbd(450, 180); await tick(p, 100);
  lb = await layerBox();
  ok(lb.top === 180, 'se iOS sposta comunque l’area visibile, la schermata la segue (top ' + lb.top + ')');
  ok(await drag(200, 200, 400), 'con la tastiera aperta trascinare l’intestazione non muove lo schermo');
  await kbd(null); await p.evaluate(() => document.activeElement.blur()); await tick(p, 100);
  lb = await layerBox();
  ok(lb.top === 0 && lb.h === 844, 'tastiera chiusa: schermata come prima (' + JSON.stringify(lb) + ')');

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
  ok((await layerBox()).h === 844, 'la schermata dell’investimento non si ridimensiona');
  await kbd(null); await p.evaluate(() => document.activeElement.blur()); await tick(p, 100);

  // ---- Foglio dal basso: lo sfondo scuro non trascina lo schermo ----
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('acc', b); }); await tick(p, 300);
  ok(await p.evaluate(() => __UF.L.length === 1 && __UF.L[0].kind === 'sheet'), 'foglio del conto aperto');
  ok(await drag(200, 40, 300), 'foglio: trascinare lo sfondo scuro non muove lo schermo');
  ok((await layerBox()).top === 0, 'foglio: resta fermo');
  await kbd(450, 0); await tick(p, 100);
  if (await p.evaluate(() => !!__UF.L[0].el.querySelector('#fx'))) {
    await p.focus('#fx'); await tick(p, 500);
    ok(await p.evaluate(() => document.getElementById('fx').getBoundingClientRect().bottom <= 450), 'foglio con la tastiera aperta: il campo resta sopra la tastiera');
  } else ok(true, 'foglio senza campo di testo (saltato)');
  await kbd(null); await p.evaluate(() => document.activeElement && document.activeElement.blur()); await tick(p, 100);
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Revisione: piccolo tremolio iniziale non blocca lo scorrimento di una lista lunga ----
  await p.evaluate(() => __UF.act('txlist', document.createElement('button'))); await tick(p, 300);
  const jit = await p.evaluate(() => {
    const sc = __UF.L[__UF.L.length - 1].el.querySelector('.scrb'); sc.scrollTop = 200;
    const tgt = [...sc.querySelectorAll('button, .card, div')].find(e => { const b = e.getBoundingClientRect(); return b.top > 300 && b.bottom < 700 && b.height > 20; }), r = tgt.getBoundingClientRect(), x = r.left + 20, y = r.top + 10;
    const T = (cx, cy) => new Touch({ identifier: 7, target: tgt, clientX: cx, clientY: cy });
    const send = (type, cx, cy) => { const ev = new TouchEvent(type, { cancelable: true, bubbles: true, touches: type === 'touchend' ? [] : [T(cx, cy)], changedTouches: [T(cx, cy)] }); tgt.dispatchEvent(ev); return ev.defaultPrevented; };
    send('touchstart', x, y);
    const a = send('touchmove', x + 3, y - 1), b2 = send('touchmove', x + 3, y - 10), c = send('touchmove', x + 4, y - 30);
    send('touchend', x + 4, y - 30);
    send('touchstart', x, y); const d = send('touchmove', x + 1, y - 20); send('touchend', x, y);
    return [a, b2, c, d];
  });
  ok(JSON.stringify(jit) === '[false,false,false,false]', 'tremolio orizzontale iniziale: lo scorrimento della lista non viene bloccato (' + JSON.stringify(jit) + ')');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Revisione: dopo «Elimina tutti i dati» la Home torna scorrevole ----
  await p.evaluate(() => { __UF.S.tab = 'settings'; __UF.render(); }); await open('resetopen');
  for (let k = 0; k < 2 && await p.evaluate(() => __UF.L.length > 0); k++) { await p.click('.layer [data-act="resetgo"]'); await tick(p, 500); }
  ok(await p.evaluate(() => __UF.L.length === 0), 'dati eliminati, schermata chiusa');
  await p.click('[data-act="startdemo"]'); await tick(p, 1200);
  ok(!(await p.evaluate(() => document.documentElement.classList.contains('lock') || document.body.classList.contains('lock'))), 'dopo il reset la pagina non resta bloccata');
  await p.evaluate(() => window.scrollTo(0, 250)); await tick(p, 100);
  ok((await p.evaluate(() => window.scrollY)) > 0, 'dopo il reset la Home scorre di nuovo');

  // ---- Nuovo movimento: scrivendo la nota il pulsante «Salva» resta sopra la tastiera ----
  await p.evaluate(() => { __UF.S.tab = 'home'; __UF.render(); }); await open('add');
  await kbd(450, 0); await p.focus('#a-note'); await tick(p, 400);
  ok(await p.evaluate(() => { const r = document.getElementById('a-save').getBoundingClientRect(); return r.bottom <= 450 && r.top > 0; }), 'nota del movimento: «Salva» resta sopra la tastiera');
  ok(await p.evaluate(() => Math.round(__UF.L[0].el.querySelector('.scrh').getBoundingClientRect().top) === 0), 'nota del movimento: l’intestazione resta ferma');
  await kbd(null); await p.evaluate(() => document.activeElement.blur()); await tick(p, 100);
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Icona e colore in un foglio a parte ----
  await open('newacc'); await open('aicopen');
  ok(await p.evaluate(() => __UF.L.length === 2 && __UF.L[1].name === 'icopick' && getComputedStyle(__UF.L[1].el).touchAction === 'none'), 'foglio «Icona e colore» aperto e fermo');
  await p.click('#is-ico button[data-i="7"]'); await p.click('#is-col button[data-i="3"]'); await tick(p, 200);
  ok(await p.evaluate(() => __UF.L[0].st.icon === '🐷' && /1E7A4C/i.test(__UF.L[0].st.col) && document.querySelector('#is-ico button[data-i="7"]').classList.contains('on')), 'icona e colore scelti nel foglio arrivano al conto');
  await p.click('.layer.sheet .btn[data-act="close"]'); await tick(p, 300);
  ok(await p.evaluate(() => __UF.L.length === 1 && document.querySelector('#af-prev .ico').textContent === '🐷'), 'chiuso il foglio, l’anteprima del conto mostra la nuova icona');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Tutte le schermate dei moduli stanno nello schermo e sono ferme (390×844) ----
  const checkForms = () => p.evaluate(async () => {
    const U = __UF, btn = o => { const b = document.createElement('button'); Object.assign(b.dataset, o || {}); return b; }, out = [];
    const pos = U.S.pos[0], a0 = U.S.accounts[0], rule = U.S.rules.find(r => r.type !== 'pac');
    const risp = U.S.accounts.find(a => a.type === 'risparmio');
    const cases = [['nuovo conto', 'newacc', {}], ['conto risparmio con obiettivo', 'accedit', { id: risp.id }, 'agoal'], ['investimento già posseduto', 'newpos', {}, ['pmode', { m: 'oggi' }]], ['cripto già posseduta', 'newpos', {}, ['pkind', { k: 'crypto' }], ['pmode', { m: 'oggi' }]], ['modifica conto', 'accedit', { id: a0.id }], ['nuovo investimento', 'newpos', {}], ['acquisto', 'lotnew', { id: pos.id, dir: 'buy' }], ['vendita', 'lotnew', { id: pos.id, dir: 'sell' }], ['modifica acquisto', 'lotedit', { pos: pos.id, id: pos.lots[0].id }], ['aggiorna valore', 'pricenew', { id: pos.id }], ['nuova categoria', 'newcatm', { k: 'spesa' }], ['modifica categoria', 'editcat', { id: U.S.cats[0].id }], ['elimina conto', 'delaccopen', { id: a0.id }], ['elimina investimento', 'delposopen', { id: pos.id }], ['nuovo PAC', 'pacnew', { id: pos.id }], ['nuovo movimento', 'add', {}]].concat(rule ? [['modifica ricorrenza', 'ruleopen', { id: rule.id }]] : []);
    for (const [lab, a, d, ...then] of cases) {
      U.act(a, btn(d)); then.forEach(t => typeof t === 'string' ? U.act(t, btn()) : U.act(t[0], btn(t[1]))); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const l = U.L[U.L.length - 1].el; out.push([lab, !l.classList.contains('scrolls') && getComputedStyle(l).touchAction === 'none']);
      while (U.L.length) U.act('close', btn());
    }
    return out;
  });
  for (const [w, h, safe] of [[390, 844, 0], [390, 797, 34], [375, 768, 34], [430, 885, 34]]) {
    await p.setViewportSize({ width: w, height: h });
    // safe area di iPhone (barra in basso): Chromium la considera 0, qui la si simula
    await p.evaluate(sf => { let st = document.getElementById('__safe'); if (!st) { st = document.createElement('style'); st.id = '__safe'; document.head.appendChild(st); } st.textContent = sf ? '.scrf{padding-bottom:' + (12 + sf) + 'px!important} .panel{padding-bottom:' + (20 + sf) + 'px!important}' : ''; }, safe);
    await tick(p, 200);
    const forms = await checkForms();
    const bad = forms.filter(f => !f[1]).map(f => f[0]);
    ok(!bad.length, w + '×' + h + (safe ? ' (con safe area)' : '') + ': tutte le schermate dei moduli sono ferme (' + forms.length + ' controllate)' + (bad.length ? ' — non ferme: ' + bad.join(', ') : ''));
  }
  await p.setViewportSize({ width: 390, height: 844 }); await p.evaluate(() => document.getElementById('__safe').textContent = ''); await tick(p, 200);
  // le liste lunghe scorrono, ma senza rimbalzo
  await p.evaluate(() => __UF.act('txlist', document.createElement('button'))); await tick(p, 300);
  ok(await p.evaluate(() => { const l = __UF.L[0].el; return l.classList.contains('scrolls') && getComputedStyle(l).touchAction !== 'none' && getComputedStyle(l.querySelector('.scrb')).overscrollBehaviorY === 'none'; }), 'elenco movimenti: scorre (è una lista lunga) ma senza rimbalzo');
  ok(!(await drag(200, 600, 300)), 'elenco movimenti: il dito fa scorrere la lista');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 300);

  // ---- Revisione: a schermo basso restano visibili gli avvisi importanti ----
  await p.setViewportSize({ width: 375, height: 667 }); await tick(p, 200);
  await p.evaluate(() => { const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('accedit', b); }); await tick(p, 300);
  ok(await p.evaluate(() => { const e = document.getElementById('af-eff'); return !!e && getComputedStyle(e).display !== 'none' && /Saldo attuale/.test(e.textContent); }), '375×667: in Modifica conto resta visibile «Saldo attuale … →»');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); const b = document.createElement('button'); b.dataset.id = __UF.S.accounts[0].id; __UF.act('delaccopen', b); }); await tick(p, 300);
  ok(await p.evaluate(() => [...__UF.L[0].el.querySelectorAll('.hint')].every(h => getComputedStyle(h).display !== 'none')), '375×667: in Elimina conto restano visibili i riepiloghi');
  await p.evaluate(() => { while (__UF.L.length) __UF.act('close', document.createElement('button')); }); await tick(p, 200);
  await p.setViewportSize({ width: 390, height: 844 }); await tick(p, 200);
  // ---- Revisione: trascinamento verticale su una riga che scorre solo in orizzontale ----
  const ax = await p.evaluate(() => {
    const L = document.createElement('div'); L.className = 'layer screen'; L.innerHTML = '<div class="scr"><div class="scrb"><div class="chips" id="__ch">' + '<button class="chip">Conto lungo</button>'.repeat(12) + '</div></div></div>';
    document.body.appendChild(L); __UF.L.push({ el: L, kind: 'screen', name: '__t', st: {} });
    const ch = document.getElementById('__ch'), t = ch.firstChild, r = t.getBoundingClientRect(), x = r.left + 10, y = r.top + 10;
    const T = (cx, cy) => new Touch({ identifier: 9, target: t, clientX: cx, clientY: cy });
    const go = (dx, dy) => { t.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [T(x, y)], changedTouches: [T(x, y)] })); const ev = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [T(x + dx, y + dy)], changedTouches: [T(x + dx, y + dy)] }); t.dispatchEvent(ev); t.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], changedTouches: [T(x, y)] })); return ev.defaultPrevented; };
    const res = { vert: go(1, 20), hor: go(-20, 1) };
    __UF.L.pop(); L.remove(); return res;
  });
  ok(ax.vert === true && ax.hor === false, 'riga di chip: il trascinamento verticale è bloccato, quello orizzontale fa scorrere la riga (' + JSON.stringify(ax) + ')');

  ok(!errs.length, 'nessun errore JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
  process.exit(fails ? 1 : 0);
})();
