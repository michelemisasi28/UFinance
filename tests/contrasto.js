// Contrasto dei colori (WCAG 2.x, formula ufficiale: https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio):
// legge i token di app/css/app.css per il tema chiaro e scuro e controlla ogni coppia testo/sfondo usata dall'app.
// Soglia 4,5:1 per testo e icone (richiesta del brief, più severa del minimo 3:1 previsto per le icone).
const fs = require('fs'), path = require('path');
const css = fs.readFileSync(path.join(__dirname, '..', 'app', 'css', 'app.css'), 'utf8');
let fails = 0; const ok = (c, m) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m); };
function block(sel) {
  const i = css.indexOf(sel + ' {'); if (i < 0) throw new Error('manca ' + sel);
  const body = css.slice(i, css.indexOf('}', i)), o = {};
  body.replace(/--([a-z0-9]+):\s*(#[0-9A-Fa-f]{6})/g, (_, k, v) => { o[k] = v; });
  return o;
}
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
// [primo piano, sfondo, dove si usa]
const PAIRS = [
  ['tx', 'bg', 'testo sullo sfondo'], ['tx', 'card', 'testo nelle card'], ['tx2', 'card', 'testo secondario'], ['tx2', 'seg', 'segmentato non scelto'],
  ['tx', 'segon', 'segmentato scelto'], ['mu', 'bg', 'testo attenuato sullo sfondo'], ['mu', 'card', 'testo attenuato nelle card'], ['tx2', 'seg', 'segnaposto della ricerca, chiudi del foglio'],
  ['mu', 'bar', 'schede non scelte'], ['ac', 'bar', 'scheda scelta'], ['ac', 'bg', 'link sullo sfondo'], ['ac', 'card', 'link nelle card'], ['ac', 'tint', 'pulsante secondario'],
  ['onac', 'ac', 'pulsante principale'], ['ok', 'card', 'importi positivi'], ['ok', 'bg', 'importi positivi sullo sfondo'], ['bad', 'card', 'importi negativi / elimina'],
  ['bad', 'bg', 'importi negativi sullo sfondo'], ['bg', 'tx', 'avviso in basso (toast)'],
  ['f1', 'b1', 'icona blu'], ['f2', 'b2', 'icona verde / stato «In linea»'], ['f3', 'b3', 'icona viola'], ['f4', 'b4', 'avviso ambra / «Attenzione»'], ['f5', 'b5', 'icona rossa / «Oltre»'],
  ['f4', 'card', 'testo ambra nelle card'], ['ac', 'b1', 'badge blu'],
];
for (const [name, sel] of [['chiaro', ':root'], ['scuro', ':root[data-uf="scuro"]']]) {
  const t = block(sel);
  for (const [f, b, what] of PAIRS) {
    if (!t[f] || !t[b]) { ok(false, `${name}: token mancante ${f}/${b}`); continue; }
    const r = ratio(t[f], t[b]);
    ok(r >= 4.5, `${name}: ${what} (--${f} ${t[f]} su --${b} ${t[b]}) = ${r.toFixed(2)}:1`);
  }
  // testo bianco sul pulsante «Elimina» armato (sfondo --bad, testo --card)
  const r = ratio(t.card, t.bad); ok(r >= 4.5, `${name}: «Tocca ancora per confermare» (--card su --bad) = ${r.toFixed(2)}:1`);
}
console.log(fails ? 'FALLITI: ' + fails : 'TUTTI PASSATI');
process.exitCode = fails ? 1 : 0;
