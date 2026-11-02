const { chromium } = require('playwright');
const fs = require('fs');
const URL = 'http://127.0.0.1:8765/index.html', SP = (require('fs').mkdirSync(require('path').join(__dirname, 'out'), { recursive: true }), require('path').join(__dirname, 'out'));
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
const tick = (p, ms = 200) => p.waitForTimeout(ms);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
  const p = await ctx.newPage(); await ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; }); await ctx.route('https://api.coingecko.com/**', r => r.abort());
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  await p.clock.install({ time: new Date('2026-11-20T10:00:00') });
  await p.goto(URL); await tick(p, 700);

  // ---------- primi passi (inizia da zero) ----------
  await p.click('[data-act="start0"]'); await tick(p, 500);
  ok(await p.locator('.btn[data-act="newacc"]').count() === 1, 'da zero: invito a creare il conto');
  await p.click('.btn[data-act="newacc"]'); await p.fill('#af-name', 'Banca'); await p.fill('#af-open', '2000'); await p.click('[data-act="saveacc"]'); await tick(p, 600);
  ok(await p.locator('.steps .step.done').count() === 1, 'primi passi: 1 di 4 completato dopo il conto');
  await p.click('.steps [data-act="guidex"], [data-act="guidex"]'); await tick(p, 300);
  await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 700);
  ok(await p.locator('.steps').count() === 0, 'primi passi nascosti anche dopo la ricarica');
  await p.click('[data-tab="settings"]'); await p.click('[data-act="guide"]'); await tick(p);
  ok((await p.textContent('.guide')).includes('giroconto'), 'guida «Come funziona» apribile da Impostazioni');
  await p.click('.layer [data-act="close"]'); await tick(p, 500);

  // ---------- dati di esempio per il resto ----------
  await p.evaluate(async () => { __UF.emptyState(); });
  await p.click('[data-act="resetopen"]'); await p.click('[data-act="resetgo"]'); await p.click('[data-act="resetgo"]'); await tick(p, 700);
  await p.click('[data-act="startdemo"]'); await tick(p, 600);
  await p.evaluate(async () => { __UF.S.demo = false; __UF.render(); await __UF.flushNow(); });

  // ---------- budget ----------
  await p.click('[data-tab="settings"]'); await p.click('.navrow[data-act="budgets"]'); await tick(p);
  ok((await p.textContent('.layer')).includes('Media ultimi 3 mesi'), 'budget: media degli ultimi 3 mesi come suggerimento');
  await p.fill('#b-c1', '150'); await p.fill('#b-c4', '80'); await p.fill('#b-c5', 'abc');
  await p.click('[data-act="savebud"]'); await tick(p);
  ok(/non valido per «Svago»/.test(await p.textContent('#b-msg')), 'budget non valido segnalato: ' + await p.textContent('#b-msg'));
  await p.fill('#b-c5', ''); await p.click('[data-act="savebud"]'); await tick(p, 600);
  const bs = await p.evaluate(() => { const b = __UF.budgetState(); return { n: b.rows.length, rows: b.rows.map(r => [r.c.name, r.spent, r.budget]) }; });
  const manual = await p.evaluate(() => { let s = 0; __UF.S.tx.forEach(t => { if (t.kind === 'spesa' && t.catId === 'c1' && t.date >= '2026-11-01' && t.date <= __UF.TODAY) s += t.cents; }); return s; });
  const alim = bs.rows.find(r => r[0] === 'Alimentari');
  ok(bs.n === 2 && alim && alim[1] === manual && alim[2] === 15000, 'budget: speso del mese corretto ' + JSON.stringify(bs.rows));
  await p.click('[data-tab="home"]'); await tick(p, 500);
  ok((await p.textContent('#view')).includes('Budget · novembre'), 'Home: sezione budget presente');
  // spesa che supera il budget Ristoranti (80 €)
  await p.click('.fab.add'); for (const k of '90') await p.click(`[data-act="key"][data-k="${k}"]`);
  await p.click('[data-act="pickcat"]'); await p.click('[data-act="setcat"][data-id="c4"]'); await tick(p, 300);
  await p.click('#a-save'); await tick(p, 300);
  const tmsg = await p.textContent('#toast');
  ok(/Ristoranti: budget superato/.test(tmsg), 'avviso budget nel toast: "' + tmsg + '"');
  await tick(p, 400);
  await p.click('.budrow[data-act="budtx"][data-id="c4"]'); await tick(p);
  const tl1 = await p.evaluate(() => ({ n: __UF.L[__UF.L.length - 1].data.length, all: __UF.L[__UF.L.length - 1].data.every(t => t.catId === 'c4' && t.kind === 'spesa' && t.date >= '2026-11-01') }));
  ok(tl1.n > 0 && tl1.all, 'tocco sul budget: elenco filtrato per categoria e mese (' + tl1.n + ')');
  await p.click('.layer [data-act="close"]'); await tick(p, 500);
  // categoria con budget dal modulo
  await p.click('[data-tab="settings"]'); await p.click('[data-act="managecats"][data-k="spesa"]'); await p.click('[data-act="editcat"][data-id="c3"]');
  await p.fill('#cf-bud', '60'); await p.click('[data-act="savecat"]'); await tick(p, 500);
  ok(await p.evaluate(() => __UF.S.cats.find(c => c.id === 'c3').budget) === 6000, 'budget impostabile anche dal modulo della categoria');
  await p.click('.layer [data-act="close"]'); await tick(p, 500);

  // ---------- obiettivi ----------
  await p.click('[data-tab="conti"]'); await p.click('[data-act="acc"][data-id="a6"]'); await p.click('.layer [data-act="accedit"]'); await tick(p);
  ok(await p.isVisible('#af-goal'), 'obiettivo disponibile per un conto di risparmio');
  await p.fill('#af-gc', '1500'); await p.fill('#af-gd', '2027-06-30'); await p.click('[data-act="saveacc"]'); await tick(p, 600);
  const g = await p.evaluate(() => { const a = __UF.S.accounts.find(a => a.id === 'a6'); const x = __UF.goalInfo(a); return { bal: x.bal, left: x.left, per: x.per, months: x.months }; });
  const expMonths = Math.ceil(((Date.UTC(2027, 5, 30) - Date.UTC(2026, 10, 20)) / 864e5) / 30.44), expPer = Math.ceil((150000 - g.bal) / expMonths);
  ok(g.months === expMonths && g.per === expPer, `obiettivo: mancano ${g.left / 100} €, ${g.per / 100} €/mese per ${g.months} mesi`);
  ok((await p.textContent('[data-act="acc"][data-id="a6"]')).includes('🎯'), 'Conti: avanzamento obiettivo nella riga');
  await p.click('[data-tab="conti"]'); await p.click('[data-act="acc"][data-id="a1"]'); await p.click('.layer [data-act="accedit"]'); await tick(p);
  await p.click('[data-act="atype"][data-t="credito"]').catch(() => {}); await tick(p, 100);
  const hidden = await p.evaluate(() => document.querySelector('#af-goal').hidden);
  await p.click('.layer [data-act="close"]'); await tick(p, 400);
  await p.click('[data-tab="home"]'); await tick(p, 500);
  ok((await p.textContent('#view')).includes('Obiettivi'), 'Home: sezione obiettivi presente');

  // ---------- ricerca e filtri ----------
  await p.click('[data-act="txlist"]'); await tick(p);
  const all = await p.evaluate(() => __UF.S.tx.length);
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].data.length) === all, 'elenco completo: tutti i ' + all + ' movimenti');
  await p.fill('#tl-q', 'affitto'); await tick(p, 400);
  const af = await p.evaluate(() => { const d = __UF.L[__UF.L.length - 1].data; return { n: d.length, ok: d.every(t => /affitto/i.test(t.note)) }; });
  const afMan = await p.evaluate(() => __UF.S.tx.filter(t => /affitto/i.test(t.note)).length);
  ok(af.n === afMan && af.ok, `ricerca «affitto»: ${af.n} risultati (attesi ${afMan})`);
  await p.fill('#tl-q', 'ALIMENTARÌ banca'); await tick(p, 400);
  const multi = await p.evaluate(() => __UF.L[__UF.L.length - 1].data.every(t => t.catId === 'c1' && t.accId === 'a2'));
  ok(multi, 'ricerca a più parole, senza maiuscole e accenti (categoria + conto)');
  await p.fill('#tl-q', ''); await tick(p, 300);
  await p.click('[data-act="tlkind"][data-k="spesa"]'); await p.click('[data-act="tlper"][data-k="prev"]'); await p.click('[data-act="tlmore"]');
  await p.selectOption('#tl-acc', 'a1'); await tick(p); await p.fill('#tl-min', '20'); await tick(p, 500);
  const f = await p.evaluate(() => { const d = __UF.L[__UF.L.length - 1].data; return { n: d.length, ok: d.every(t => t.kind === 'spesa' && t.date >= '2026-10-01' && t.date <= '2026-10-31' && t.accId === 'a1' && t.cents >= 2000) }; });
  const fMan = await p.evaluate(() => __UF.S.tx.filter(t => t.kind === 'spesa' && t.date >= '2026-10-01' && t.date <= '2026-10-31' && (t.accId === 'a1' || t.toId === 'a1') && t.cents >= 2000).length);
  ok(f.ok && f.n === fMan, `filtri combinati (spese, mese scorso, Contanti, ≥ 20 €): ${f.n} (attesi ${fMan})`);
  ok((await p.textContent('#tl-sum')).includes('movimenti') || (await p.textContent('#tl-sum')).includes('movimento'), 'riepilogo: ' + await p.textContent('#tl-sum'));
  // CSV dei filtrati
  let dlP = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await p.click('[data-act="tlcsv"]'); let dl = await dlP;
  const csv = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
  ok(csv.charCodeAt(0) === 0xFEFF && lines[0].startsWith('Data;Tipo;Importo') && lines.length === f.n + 1, `CSV filtrato: ${lines.length - 1} righe, intestazione e BOM per Excel`);
  ok(/^\d\d\/10\/2026;Spesa;-\d+,\d\d;EUR;Contanti;/.test(lines[1] || ''), 'CSV: data italiana, importo negativo con virgola: ' + lines[1]);
  await p.click('[data-act="tlreset"]'); await tick(p);
  // elimina dall'elenco: si resta nell'elenco
  const first = await p.evaluate(() => __UF.L[__UF.L.length - 1].data[0].id);
  await p.click(`#tl-res [data-act="tx"][data-id="${first}"]`); await p.click('.layer [data-act="txdel"]'); await p.click('.layer [data-act="txdel"]'); await tick(p, 400);
  const after = await p.evaluate(id => ({ inList: __UF.L.some(l => l.name === 'txlist'), n: __UF.L[__UF.L.length - 1].data.length, gone: !__UF.S.tx.some(t => t.id === id) }), first);
  ok(after.inList && after.gone && after.n === all - 1, 'eliminazione dall\'elenco: si resta nell\'elenco, aggiornato (' + after.n + ')');
  await p.click('#toast [data-act="undo"]'); await tick(p, 300);
  ok(await p.evaluate(() => __UF.L[__UF.L.length - 1].data.length) === all, 'Annulla: il movimento torna anche nell\'elenco aperto');
  await p.screenshot({ path: SP + '/shot_txlist.png' });
  await p.click('.layer [data-act="close"]'); await tick(p, 500);

  // CSV completo e protezione da formule
  await p.evaluate(() => { __UF.S.tx[0].note = '=HYPERLINK("x";"y")'; });
  const csvAll = await p.evaluate(() => __UF.csvOf(__UF.S.tx.slice(0, 3)));
  ok(csvAll.includes(`"'=HYPERLINK(""x"";""y"")"`), 'CSV: le note che iniziano con «=» non diventano formule');
  await p.click('[data-tab="settings"]');
  dlP = p.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await p.click('[data-act="csvall"]'); dl = await dlP;
  ok(dl && /ufinance-movimenti-2026-11-20\.csv/.test(dl.suggestedFilename()), 'Impostazioni: esporta tutti i movimenti in CSV');

  // ---------- portfolio: prezzi e spiegazioni ----------
  await p.clock.setSystemTime(new Date('2026-12-05T10:00:00')); await p.evaluate(() => __UF.flushNow()); await p.reload(); await tick(p, 800);
  await p.click('[data-tab="portfolio"]'); await tick(p);
  ok((await p.textContent('#view')).includes('non aggiornati di recente'), 'Portfolio: avviso prezzi vecchi');
  await p.click('[data-act="invhelp"]'); await tick(p);
  ok((await p.locator('.layer').last().textContent()).includes('XIRR'), 'Portfolio: «Come leggerli» spiega i numeri');
  await p.locator('.layer').last().locator('[data-act="close"]').first().click(); await tick(p, 500);
  const v0 = await p.evaluate(() => __UF.posValue(__UF.posById('p1')));
  await p.click('.tbtn[data-act="pxall"]'); await tick(p);
  await p.click('[data-act="pxwmode"]'); await p.fill('#w-in', '110,5'); await p.click('#w-next'); await tick(p, 200);
  await p.click('[data-act="pxwskip"]'); await tick(p, 200);
  await p.click('[data-act="pxwmode"]'); await p.fill('#w-in', '95000'); await p.click('#w-next'); await tick(p, 500);
  const v1 = await p.evaluate(() => ({ v: __UF.posValue(__UF.posById('p1')), px: __UF.pxAt(__UF.posById('p1'), __UF.TODAY), banner: document.querySelector('#view').textContent.includes('1 investimento non aggiornato') }));
  ok(v1.px === 110500000 && v1.v !== v0, `prezzi aggiornati insieme: MSCI World 110,50 → valore ${v1.v / 100} €`);
  ok(v1.banner, 'resta segnalato solo il prezzo non aggiornato (1)');
  await p.screenshot({ path: SP + '/shot_portfolio.png', fullPage: true });

  // ---------- dati: schema 8, compatibilità ----------
  const sc = await p.evaluate(() => {
    const sn = JSON.parse(JSON.stringify(__UF.snapState())); const out = { schema: sn.schema };
    const o = JSON.parse(JSON.stringify(sn)); o.schema = 7; o.cats.forEach(c => delete c.budget); o.accounts.forEach(a => delete a.goal); delete o.prefs.guideDone;
    out.v7 = __UF.validateSnap(o).length;
    const bad1 = JSON.parse(JSON.stringify(sn)); bad1.cats.find(c => c.kind === 'entrata').budget = 100; out.badBudget = __UF.validateSnap(bad1)[0] || 'ACCETTATO';
    const bad2 = JSON.parse(JSON.stringify(sn)); bad2.accounts[0].goal = { cents: -5, date: '' }; out.badGoal = __UF.validateSnap(bad2)[0] || 'ACCETTATO';
    return out;
  });
  ok(sc.schema === 8 && sc.v7 === 0, 'formato dati 8; i backup del formato 7 restano validi');
  ok(sc.badBudget !== 'ACCETTATO' && sc.badGoal !== 'ACCETTATO', `rifiutati budget/obiettivi non validi: ${sc.badBudget} / ${sc.badGoal}`);
  await p.click('[data-tab="home"]'); await tick(p, 400); await p.screenshot({ path: SP + '/shot_home.png', fullPage: true });
  ok(errs.length === 0, 'nessun errore JS: ' + JSON.stringify(errs));
  await b.close(); console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
})();
