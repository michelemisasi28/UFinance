window.UF_BUILD = '2026-11-03 · 6f87fa51';
(function () {
  'use strict';
  /* ================= utilità ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); }
  function addMonths(s, n) { var d = parseD(s); d.setDate(1); d.setMonth(d.getMonth() + n); return ymd(d); }
  var TODAY = ymd(new Date());
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var MESI_L = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var GIORNI_I = ['D', 'L', 'M', 'M', 'G', 'V', 'S'];
  function dayLabel(s) {
    if (s === TODAY) return 'Oggi';
    if (s === addDays(TODAY, -1)) return 'Ieri';
    var d = parseD(s);
    return d.getDate() + ' ' + MESI[d.getMonth()] + (d.getFullYear() !== parseD(TODAY).getFullYear() ? ' ' + d.getFullYear() : '');
  }
  function shortD(s) { var d = parseD(s); return d.getDate() + ' ' + MESI[d.getMonth()]; }

  // Importi sempre in centesimi interi: mai numeri decimali per i soldi.
  function parseCents(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/\s+/g, '');
    if (!/^[-+]?\d{1,9}([.,]\d{1,2})?$/.test(s)) return null;
    var neg = s.charAt(0) === '-';
    s = s.replace(/^[-+]/, '').replace(',', '.');
    var p = s.split('.');
    var c = parseInt(p[0], 10) * 100 + parseInt(((p[1] || '') + '00').slice(0, 2), 10);
    return neg ? -c : c;
  }
  function amtStr(c) { var a = Math.abs(c); return Math.floor(a / 100) + (a % 100 ? ',' + pad(a % 100) : ''); }
  function dispAmt(s) {
    if (s === '') return '0';
    var p = s.split(',');
    return p[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (p.length > 1 ? ',' + p[1] : '');
  }
  function pct(x) { return (x * 100).toFixed(1).replace('.', ',') + '%'; }

  /* Valuta: cambia solo simbolo e formato, nessuna conversione degli importi. */
  var SYM = { EUR: '€', USD: '$' };
  var CURN = { EUR: 'Euro', USD: 'Dollaro USA' };
  var NF = {};
  function nfFor(cur) {
    if (!NF[cur]) NF[cur] = new Intl.NumberFormat('it-IT', { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', useGrouping: 'always' });
    return NF[cur];
  }
  function money(c) { return S.hide ? '•••• ' + SYM[S.cur] : nfFor(S.cur).format(c / 100); }
  function moneyS(c) { var s = c > 0 ? '+' : c < 0 ? '−' : ''; return s + (S.hide ? '•••• ' + SYM[S.cur] : nfFor(S.cur).format(Math.abs(c) / 100)); }

  function isinOk(s) {
    if (!/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(s)) return false;
    var digits = '';
    for (var i = 0; i < s.length; i++) { var ch = s.charAt(i); digits += /[0-9]/.test(ch) ? ch : String(ch.charCodeAt(0) - 55); }
    var sum = 0, alt = false;
    for (var j = digits.length - 1; j >= 0; j--) { var n = +digits.charAt(j); if (alt) { n *= 2; if (n > 9) n -= 9; } sum += n; alt = !alt; }
    return sum % 10 === 0;
  }

  /* ================= stato ================= */
  var TYPES = { liquidita: 'Liquidità', risparmio: 'Risparmi', credito: 'Crediti', debito: 'Debiti' };
  var TYPE_ORDER = ['liquidita', 'risparmio', 'credito', 'debito'];
  var TYPE_ICON = { liquidita: '💶', risparmio: '🐷', credito: '🤝', debito: '💳' };
  var ICONS = ['💶', '💵', '💰', '🏦', '💳', '👛', '🧾', '🐷', '🎯', '🎁', '🛡️', '🏖️',
    '✈️', '🏠', '🚗', '🎓', '💍', '👶', '🩺', '🛒', '🍽️', '☕', '🚌', '⛽',
    '🎬', '🎮', '📱', '💡', '📚', '🐶', '🏋️', '💊', '👕', '🧳', '🔧', '🌱',
    '📈', '🤝', '🏢', '🛍️', '🎵', '🧸', '✂️', '🏥', '🚲', '🍕', '🎟️', '💼'];
  var COLORS = ['#2F6DB5', '#17607A', '#0E7C86', '#1E7A4C', '#5E8C31', '#8A6D00', '#9A5700', '#C2410C',
    '#B3342B', '#A23B72', '#5B4B9A', '#3B5BDB', '#7C5A3C', '#4A5568', '#1F2937', '#6B7280'];

  var S = {
    tab: 'home', hide: false, homeView: 'all', lastAcc: null, theme: 'chiaro', cur: 'EUR',
    accounts: [], gone: [], subs: [], cats: [], tx: [], pos: [], rules: [],
    an: { period: 'month', offset: 0, from: addDays(TODAY, -29), to: TODAY, accIds: null, blocks: { time: true, cat: true, acc: false, list: false }, catKind: 'spesa', chart: 'exp', sel: -1 }
  };
  var L = [];            // pila dei livelli aperti (schermate e fogli)
  var armed = null;      // elemento in attesa del secondo tocco per eliminare
  var seq = 1000;
  function uid(p) { seq += 1; return p + seq; }

  function loadPrefs() {
    try {
      var j = JSON.parse(localStorage.getItem('uf-proto') || '{}') || {};
      if (j.cur === 'EUR' || j.cur === 'USD') S.cur = j.cur;
      if (typeof j.hide === 'boolean') S.hide = j.hide;
    } catch (e) {}
    S.theme = document.documentElement.getAttribute('data-uf') === 'scuro' ? 'scuro' : 'chiaro';
  }
  function savePrefs() { try { localStorage.setItem('uf-proto', JSON.stringify({ theme: S.theme, cur: S.cur, hide: S.hide })); } catch (e) {} }

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function baseData() {
    S.subs = [
      { id: 's1', type: 'liquidita', name: 'Conto corrente' }, { id: 's2', type: 'liquidita', name: 'Contanti' },
      { id: 's3', type: 'liquidita', name: 'Carta prepagata' }, { id: 's4', type: 'liquidita', name: 'Portafoglio digitale' },
      { id: 's5', type: 'risparmio', name: 'Fondo emergenza' }, { id: 's6', type: 'risparmio', name: 'Vacanze' }, { id: 's7', type: 'risparmio', name: 'Obiettivi' },
      { id: 's8', type: 'credito', name: 'Prestiti a persone' }, { id: 's9', type: 'credito', name: 'Altri crediti' },
      { id: 's10', type: 'debito', name: 'Carta di credito' }, { id: 's11', type: 'debito', name: 'Prestito' }, { id: 's12', type: 'debito', name: 'Mutuo' }
    ];
    S.cats = [
      { id: 'c1', kind: 'spesa', name: 'Alimentari', icon: '🛒' }, { id: 'c2', kind: 'spesa', name: 'Casa', icon: '🏠' },
      { id: 'c3', kind: 'spesa', name: 'Trasporti', icon: '🚌' }, { id: 'c4', kind: 'spesa', name: 'Ristoranti', icon: '🍽️' },
      { id: 'c5', kind: 'spesa', name: 'Svago', icon: '🎬' }, { id: 'c6', kind: 'spesa', name: 'Salute', icon: '💊' },
      { id: 'c7', kind: 'spesa', name: 'Abbonamenti', icon: '📱' }, { id: 'c8', kind: 'spesa', name: 'Altro', icon: '🧾' },
      { id: 'e1', kind: 'entrata', name: 'Stipendio', icon: '💼' }, { id: 'e2', kind: 'entrata', name: 'Rimborsi', icon: '💵' },
      { id: 'e3', kind: 'entrata', name: 'Regali', icon: '🎁' }, { id: 'e4', kind: 'entrata', name: 'Altro', icon: '🧾' }
    ];
  }

  function seed() {
    baseData();
    var open = addDays(TODAY, -85);
    function A(id, name, type, sub, icon, color, opening) { return { id: id, name: name, type: type, sub: sub, icon: icon, color: color, opening: opening, openDate: open }; }
    S.accounts = [
      A('a1', 'Contanti', 'liquidita', 's2', '💶', '#1E7A4C', 15000),
      A('a2', 'Banca C/C', 'liquidita', 's1', '🏦', '#2F6DB5', 180000),
      A('a3', 'Conto risparmio', 'risparmio', 's5', '🛡️', '#5B4B9A', 480000),
      A('a6', 'Risparmio vacanza', 'risparmio', 's6', '🏖️', '#0E7C86', 60000),
      A('a4', 'Crediti verso amici', 'credito', 's8', '🤝', '#9A5700', 15000),
      A('a5', 'Carta di credito', 'debito', 's10', '💳', '#4A5568', -8000)
    ];
    var rnd = mulberry(20261027), ts = 1, card = -8000, tx = [];
    function push(o) { o.id = 't' + (++ts); o.ts = ts; o.note = o.note || ''; tx.push(o); }
    var exp = [['c1', 800, 6500, 4], ['c4', 1200, 4500, 2], ['c3', 150, 2500, 3], ['c5', 800, 3500, 2], ['c6', 1500, 6000, 1], ['c8', 300, 2000, 1]];
    var wsum = exp.reduce(function (s, e) { return s + e[3]; }, 0);
    for (var i = -84; i <= 0; i++) {
      var d = addDays(TODAY, i), dom = parseD(d).getDate();
      if (dom === 5) push({ kind: 'spesa', cents: 42000, accId: 'a2', date: d, catId: 'c2', note: 'Affitto' });
      if (dom === 27) push({ kind: 'entrata', cents: 145000, accId: 'a2', date: d, catId: 'e1' });
      if (dom === 12) { push({ kind: 'spesa', cents: 999, accId: 'a5', date: d, catId: 'c7', note: 'Abbonamento musica' }); card -= 999; }
      if (dom === 10) push({ kind: 'giro', cents: 20000, accId: 'a2', toId: 'a3', date: d });
      if (dom === 15) push({ kind: 'giro', cents: 10000, accId: 'a2', toId: 'a6', date: d });
      if (dom === 3) push({ kind: 'giro', cents: 10000, accId: 'a2', toId: 'a1', date: d });
      if (rnd() < 0.55) {
        var pick = rnd() * wsum, e = exp[0];
        for (var k = 0; k < exp.length; k++) { pick -= exp[k][3]; if (pick <= 0) { e = exp[k]; break; } }
        var cents = Math.round((e[1] + rnd() * (e[2] - e[1])) / 10) * 10;
        var r2 = rnd(), accId = r2 < 0.25 ? 'a1' : r2 < 0.45 ? 'a5' : 'a2';
        push({ kind: 'spesa', cents: cents, accId: accId, date: d, catId: e[0] });
        if (accId === 'a5') card -= cents;
      }
      if (dom === 28 && card < 0) { push({ kind: 'giro', cents: -card, accId: 'a2', toId: 'a5', date: d }); card = 0; }
    }
    S.tx = tx; S.gone = [];
    // Investimenti: quantità in 1/100.000.000 di unità, prezzi in 1/1.000.000 di valuta, importi in centesimi.
    S.pos = [
      { id: 'p1', kind: 'inv', sym: '', isin: 'IE00B4L5Y983', name: 'iShares Core MSCI World',
        lots: [{ id: 'l1', d: addDays(TODAY, -400), qty: 900000000, px: 88000000, fee: 0, tot: 79200, txId: '', rule: '', est: false }],
        prices: [{ d: addDays(TODAY, -400), px: 88000000 }, { d: addDays(TODAY, -200), px: 93100000 }, { d: addDays(TODAY, -85), px: 96750000 }, { d: addDays(TODAY, -45), px: 98500000 }, { d: addDays(TODAY, -10), px: 100300000 }, { d: TODAY, px: 101200000 }] },
      { id: 'p2', kind: 'inv', sym: '', isin: 'IE00BK5BQT80', name: 'Vanguard FTSE All-World',
        lots: [{ id: 'l2', d: addDays(TODAY, -300), qty: 1500000000, px: 109000000, fee: 0, tot: 163500, txId: '', rule: '', est: false },
          { id: 'l3', d: addDays(TODAY, -40), qty: 500000000, px: 117500000, fee: 0, tot: 58750, txId: 'ti1', rule: '', est: false }],
        prices: [{ d: addDays(TODAY, -300), px: 109000000 }, { d: addDays(TODAY, -150), px: 113000000 }, { d: addDays(TODAY, -40), px: 117500000 }, { d: TODAY, px: 124800000 }] },
      { id: 'p3', kind: 'crypto', sym: 'BTC', isin: '', name: 'Bitcoin',
        lots: [{ id: 'l4', d: addDays(TODAY, -220), qty: 1250000, px: 60000000000, fee: 0, tot: 75000, txId: '', rule: '', est: false }],
        prices: [{ d: addDays(TODAY, -220), px: 60000000000 }, { d: addDays(TODAY, -120), px: 52000000000 }, { d: addDays(TODAY, -45), px: 71000000000 }, { d: addDays(TODAY, -10), px: 84000000000 }, { d: TODAY, px: 90000000000 }] }
    ];
    S.tx.push({ id: 'ti1', kind: 'inv', dir: 'buy', cents: 58750, accId: 'a2', posId: 'p2', lotId: 'l3', date: addDays(TODAY, -40), note: '', ts: 99999, rule: '' });
    function nextDom(dom) { for (var i = 1; i <= 40; i++) { var d = addDays(TODAY, i); if (parseD(d).getDate() === dom) return d; } return addDays(TODAY, 30); }
    S.rules = [
      { id: 'r1', type: 'pac', posId: 'p1', cents: 15000, fee: 0, accId: 'a2', freq: 'm', anchor: addDays(TODAY, -80), k: 0, end: '', active: true },
      { id: 'r2', type: 'mov', kind: 'spesa', cents: 42000, accId: 'a2', toId: '', catId: 'c2', note: 'Affitto', freq: 'm', anchor: nextDom(5), k: 0, end: '', active: true },
      { id: 'r3', type: 'mov', kind: 'entrata', cents: 145000, accId: 'a2', toId: '', catId: 'e1', note: '', freq: 'm', anchor: nextDom(27), k: 0, end: '', active: true },
      { id: 'r4', type: 'mov', kind: 'spesa', cents: 999, accId: 'a5', toId: '', catId: 'c7', note: 'Abbonamento musica', freq: 'm', anchor: nextDom(12), k: 0, end: '', active: true }
    ];
    runRules(true);
  }

  /* ================= modello ================= */
  function acc(id) { for (var i = 0; i < S.accounts.length; i++) if (S.accounts[i].id === id) return S.accounts[i]; return null; }
  function cat(id) { for (var i = 0; i < S.cats.length; i++) if (S.cats[i].id === id) return S.cats[i]; return null; }
  function sub(id) { for (var i = 0; i < S.subs.length; i++) if (S.subs[i].id === id) return S.subs[i]; return null; }
  function subsOf(type) { return S.subs.filter(function (s) { return s.type === type; }); }
  function txById(id) { for (var i = 0; i < S.tx.length; i++) if (S.tx[i].id === id) return S.tx[i]; return null; }
  // Conti eliminati con i movimenti conservati: restano solo come nome per lo storico.
  function accName(id) { var a = acc(id); if (a) return a.name; for (var i = 0; i < S.gone.length; i++) if (S.gone[i].id === id) return S.gone[i].name + ' (eliminato)'; return 'Conto'; }
  function isGone(id) { return !acc(id); }
  function accTxCount(id) { return S.tx.filter(function (t) { return t.accId === id || t.toId === id; }).length; }
  function effect(t, id) {
    if (t.kind === 'spesa') return t.accId === id ? -t.cents : 0;
    if (t.kind === 'entrata') return t.accId === id ? t.cents : 0;
    if (t.kind === 'giro') return (t.accId === id ? -t.cents : 0) + (t.toId === id ? t.cents : 0);
    if (t.kind === 'rett') return t.accId === id ? t.cents : 0;
    if (t.kind === 'inv') return t.accId === id ? (t.dir === 'sell' ? t.cents : -t.cents) : 0;
    return 0;
  }
  function balance(id, upto) {
    var a = acc(id); if (!a) return 0;
    var b = a.opening;
    for (var i = 0; i < S.tx.length; i++) { var t = S.tx[i]; if (upto && t.date > upto) continue; b += effect(t, id); }
    return b;
  }
  function netWorth(upto) { var s = 0; S.accounts.forEach(function (a) { s += balance(a.id, upto); }); return s + portfolioNW(upto); }

  // Ambito del totale in Home: 'all', 'acc:ID', 'sub:ID', 'type:T'.
  function scopeSet(v) {
    if (v === 'all') return null;
    var k = v.split(':')[0], id = v.slice(k.length + 1), ids = [];
    S.accounts.forEach(function (a) { if (k === 'acc' ? a.id === id : k === 'sub' ? a.sub === id : a.type === id) ids.push(a.id); });
    return new Set(ids);
  }
  function scopeLabel(v) {
    if (v === 'all') return 'Patrimonio totale';
    if (v === 'inv') return 'Investimenti';
    if (v.indexOf('pos:') === 0) return posById(v.slice(4)) ? posById(v.slice(4)).name : 'Investimento';
    var k = v.split(':')[0], id = v.slice(k.length + 1);
    if (k === 'acc') return acc(id) ? acc(id).name : 'Conto';
    if (k === 'sub') return sub(id) ? sub(id).name : 'Sottotipologia';
    return TYPES[id] || 'Tipo';
  }
  function scopeValue(v, upto) {
    var set = scopeSet(v); if (!set) return netWorth(upto);
    var s = 0; set.forEach(function (id) { s += balance(id, upto); }); return s;
  }
  function inSet(t, set) { return !set || set.has(t.accId) || (t.toId && set.has(t.toId)); }
  function setEffect(t, set) { var s = 0; set.forEach(function (id) { s += effect(t, id); }); return s; }
  function sortTx(list) { return list.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : b.ts - a.ts; }); }
  function stats(from, to, set) {
    var inc = 0, exp = 0;
    S.tx.forEach(function (t) {
      if (t.date < from || t.date > to) return;
      if (set && !set.has(t.accId)) return;
      if (t.kind === 'entrata') inc += t.cents; else if (t.kind === 'spesa') exp += t.cents;
    });
    return { inc: inc, exp: exp };
  }
  // Saldo di un conto calcolato su un elenco di movimenti alternativo (per le anteprime).
  function balWith(a, txs) { var b = a.opening; for (var i = 0; i < txs.length; i++) b += effect(txs[i], a.id); return b; }
  function invIds(scope) { return scope === 'inv' ? S.pos.map(function (p) { return p.id; }) : scope.indexOf('pos:') === 0 ? [scope.slice(4)] : null; }
  function firstDate(scope) {
    var ii = invIds(scope), f = null;
    if (ii) {
      ii.forEach(function (id) { var p = posById(id); if (p) p.lots.forEach(function (l) { if (f === null || l.d < f) f = l.d; }); });
      return f || TODAY;
    }
    var set = scopeSet(scope) || new Set(S.accounts.map(function (a) { return a.id; }));
    S.accounts.forEach(function (a) { if (set.has(a.id) && (f === null || a.openDate < f)) f = a.openDate; });
    S.tx.forEach(function (t) { if (inSet(t, set) && (f === null || t.date < f)) f = t.date; });
    return f || TODAY;
  }
  // Serie giornaliera del valore di un ambito. Il saldo iniziale vale per tutto il periodo (come in balance()).
  // Gli investimenti hanno storico proprio: lotti e prezzi inseriti.
  function nwSeries(scope, from, to, withInv) {
    var ii = invIds(scope); if (ii) return invSeries(ii, from, to);
    var set = scopeSet(scope), ids = set || new Set(S.accounts.map(function (a) { return a.id; }));
    var cur = 0; ids.forEach(function (id) { var a = acc(id); if (a) cur += a.opening; });
    var byDay = {};
    S.tx.forEach(function (t) {
      if (t.date > to) return;
      var e = setEffect(t, ids); if (!e) return;
      if (t.date < from) cur += e; else byDay[t.date] = (byDay[t.date] || 0) + e;
    });
    var inv = !set && withInv !== false, out = [];
    for (var d = from; d <= to; d = addDays(d, 1)) { cur += byDay[d] || 0; out.push({ d: d, v: cur + (inv ? portfolioNW(d) : 0) }); }
    return out;
  }
  // Valore, capitale netto versato (c) e capitale investito lordo (i) per giorno.
  function invSeries(ids, from, to) {
    var ps = ids.map(posById).filter(Boolean), out = [];
    for (var d = from; d <= to; d = addDays(d, 1)) {
      var v = 0, c = 0, i = 0;
      ps.forEach(function (p) { v += posValueAt(p, d); var k = posCalc(p, d); c += k.invested - k.proceeds; i += k.invested; });
      out.push({ d: d, v: v, c: c, i: i });
    }
    return out;
  }
  function alloc() {
    var liq = 0, sav = 0, cred = 0, debt = 0;
    S.accounts.forEach(function (a) {
      var b = balance(a.id);
      if (b < 0) { debt += b; return; }
      if (a.type === 'liquidita') liq += b; else if (a.type === 'risparmio') sav += b; else cred += b;
    });
    var inv = 0, cry = 0; S.pos.forEach(function (p) { var v = posValueAt(p, TODAY); if (isCry(p)) cry += v; else inv += v; });
    return { liq: liq, sav: sav, cred: cred, inv: inv, cry: cry, debt: debt, tot: liq + sav + cred + inv + cry };
  }

  /* ================= investimenti: quantità in 1e-8, prezzi in 1e-6, importi in centesimi ================= */
  function isCry(p) { return !!p && p.kind === 'crypto'; }
  function posIcon(p) { return isCry(p) ? '🪙' : '📈'; }
  function unitL(p) { return isCry(p) ? (p.sym || 'unità') : 'quote'; }
  function posTag(p) { return isCry(p) ? (p.sym || 'Cripto') : (p.isin || 'Titolo / ETF'); }
  function posById(id) { for (var i = 0; i < S.pos.length; i++) if (S.pos[i].id === id) return S.pos[i]; return null; }
  function dn(s) { var p = s.split('-'); return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5); }
  function valCents(qty, px) { return Number((BigInt(qty) * BigInt(px) + 500000000000n) / 1000000000000n); }
  function lotsSorted(lots, upto) {
    return lots.map(function (l, i) { return { l: l, i: i }; }).filter(function (x) { return !upto || x.l.d <= upto; })
      .sort(function (a, b) { return a.l.d < b.l.d ? -1 : a.l.d > b.l.d ? 1 : (b.l.qty > 0) - (a.l.qty > 0) || a.i - b.i; }).map(function (x) { return x.l; });
  }
  // Nessuna vendita può superare le quote possedute in quel momento.
  function lotsOk(lots) { var q = 0, ok = true; lotsSorted(lots).forEach(function (l) { q += l.qty; if (q < 0) ok = false; }); return ok; }
  function posQtyAt(p, d) { var q = 0; p.lots.forEach(function (l) { if (l.d <= d) q += l.qty; }); return q; }
  // Prezzo del giorno: tra due prezzi inseriti la curva è una retta; fuori dal primo e dall'ultimo resta fermo.
  function pxAt(p, d) {
    var a = p.prices; if (!a.length) return 0;
    if (d <= a[0].d) return a[0].px;
    var last = a[a.length - 1]; if (d >= last.d) return last.px;
    for (var i = 1; i < a.length; i++) {
      if (d <= a[i].d) {
        var x0 = a[i - 1], x1 = a[i]; if (d === x1.d) return x1.px;
        var t = (dn(d) - dn(x0.d)) / (dn(x1.d) - dn(x0.d)); return Math.round(x0.px + (x1.px - x0.px) * t);
      }
    }
    return last.px;
  }
  function posValueAt(p, d) { var q = posQtyAt(p, d); return q > 0 ? valCents(q, pxAt(p, d)) : 0; }
  function posValue(p) { return posValueAt(p, TODAY); }
  function portfolioValue(d) { var s = 0; S.pos.forEach(function (p) { s += posValueAt(p, d || TODAY); }); return s; }
  // Per il patrimonio nel tempo, un acquisto senza conto collegato (già posseduto) vale fin dall'inizio, come i saldi iniziali.
  function posValueNW(p, d) { var q = 0; p.lots.forEach(function (l) { if (l.d <= d || (l.qty > 0 && !l.txId)) q += l.qty; }); return q > 0 ? valCents(q, pxAt(p, d)) : 0; }
  function portfolioNW(d) { var s = 0; S.pos.forEach(function (p) { s += posValueNW(p, d || TODAY); }); return s; }
  // Costo medio ponderato: quote residue, costo residuo, totale investito, incassi e utile realizzato.
  function posCalc(p, upto) {
    var qty = 0, cost = 0, invested = 0, proceeds = 0, realized = 0, flows = [];
    lotsSorted(p.lots, upto).forEach(function (l) {
      if (l.qty > 0) { qty += l.qty; cost += l.tot; invested += l.tot; flows.push({ d: l.d, cf: -l.tot }); }
      else {
        var sq = -l.qty, rem = qty > 0 ? Number((BigInt(cost) * BigInt(sq) + BigInt(qty) / 2n) / BigInt(qty)) : 0;
        qty -= sq; cost -= rem; proceeds += l.tot; realized += l.tot - rem; flows.push({ d: l.d, cf: l.tot });
      }
    });
    return { qty: qty, cost: cost, invested: invested, proceeds: proceeds, realized: realized, flows: flows };
  }
  // Riepilogo di una posizione: rendimento totale = valore + incassi - investito.
  function posStat(p) {
    var k = posCalc(p), v = posValue(p), gain = v + k.proceeds - k.invested;
    return { k: k, value: v, gain: gain, pct: k.invested > 0 ? gain / k.invested : null, xirr: xirr(k.flows, TODAY, v), px: pxAt(p, TODAY), pxDate: p.prices.length ? p.prices[p.prices.length - 1].d : TODAY };
  }
  // Rendimento annualizzato (money-weighted). Non definito sotto 90 giorni o senza flussi di segno opposto.
  function xirr(flows, endD, endV) {
    var f = flows.slice(); if (endV > 0) f.push({ d: endD, cf: endV });
    if (!f.some(function (x) { return x.cf < 0; }) || !f.some(function (x) { return x.cf > 0; })) return null;
    var t0 = f.reduce(function (m, x) { var v = dn(x.d); return v < m ? v : m; }, Infinity);
    if (dn(endD) - t0 < 90) return null;
    function npv(r) { var s = 0; f.forEach(function (x) { s += x.cf / Math.pow(1 + r, (dn(x.d) - t0) / 365); }); return s; }
    var lo = -0.9999, hi = 50, flo = npv(lo), fhi = npv(hi);
    if (!isFinite(flo) || !isFinite(fhi) || flo * fhi > 0) return null;
    for (var i = 0; i < 90; i++) { var mid = (lo + hi) / 2, fm = npv(mid); if (flo * fm <= 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }

  /* ================= ricorrenze e PAC ================= */
  var FREQ = { d: 'Giornaliero', w: 'Settimanale', m: 'Mensile', q: 'Trimestrale', y: 'Annuale' };
  var FREQ_L = { d: 'ogni giorno', w: 'ogni settimana', m: 'ogni mese', q: 'ogni trimestre', y: 'ogni anno' };
  /* cadenza personalizzata: r.ev = ogni N unità (d, w, m, y). Assente = 1. Limiti: tengono ogni data entro l'anno 2100. */
  var EV_MAX = { d: 3650, w: 520, m: 120, y: 10 };
  var EV_U = { d: ['giorno', 'giorni'], w: ['settimana', 'settimane'], m: ['mese', 'mesi'], y: ['anno', 'anni'] };
  function hasK(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function evOf(r) { return r.ev > 1 ? r.ev : 1; }
  function evOk(r) { return r.ev === undefined || (r.freq !== 'q' && hasK(EV_MAX, r.freq) && isInt(r.ev) && r.ev >= 1 && r.ev <= EV_MAX[r.freq]); }
  function freqL(r) { var e = evOf(r); return e === 1 ? FREQ_L[r.freq] : 'ogni ' + e + ' ' + EV_U[r.freq][1]; }
  function freqCap(r) { var e = evOf(r); return e === 1 ? FREQ[r.freq] : 'Ogni ' + e + ' ' + EV_U[r.freq][1]; }
  var tsSeq = 0;
  function nextTs() { tsSeq += 1; return Date.now() + tsSeq / 1e6; }
  function addMonthsClamped(s, n) {
    var d = parseD(s), day = d.getDate(), t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate())); return ymd(t);
  }
  // La data k-esima parte sempre dalla data iniziale: nessuna deriva (31 → 28 → 31).
  function nthDate(anchor, freq, k, ev) {
    var n = k * (ev > 1 ? ev : 1), d = freq === 'd' ? addDays(anchor, n) : freq === 'w' ? addDays(anchor, 7 * n) : addMonthsClamped(anchor, n * (freq === 'm' ? 1 : freq === 'q' ? 3 : 12));
    return /^\d{4}-\d\d-\d\d$/.test(d) && d <= '2100-12-31' ? d : '9999-12-31'; // oltre l'anno 2100: mai in scadenza
  }
  function ruleNext(r) { var d = nthDate(r.anchor, r.freq, r.k, r.ev); return r.end && d > r.end ? '' : d; }
  function nextFuture(r) { var k = r.k, d = nthDate(r.anchor, r.freq, k, r.ev), g = 0; while (d < TODAY && g++ < 6000) { k += 1; d = nthDate(r.anchor, r.freq, k, r.ev); } return d; }
  function pacQty(cents, fee, px) { var net = cents - fee; return net > 0 && px > 0 ? Number((BigInt(net) * 1000000000000n) / BigInt(px)) : 0; }
  function snapDeep() { return JSON.parse(JSON.stringify({ tx: S.tx, pos: S.pos, rules: S.rules })); }
  function restoreDeep(z) { S.tx = z.tx; S.pos = z.pos; S.rules = z.rules; }
  function makeOcc(r, d) {
    var a = acc(r.accId);
    if (!a) { r.active = false; return false; }
    if (d < a.openDate) return false;
    if (r.type === 'pac') {
      var p = posById(r.posId); if (!p) { r.active = false; return false; }
      var px = pxAt(p, d), q = pacQty(r.cents, r.fee || 0, px); if (q <= 0 || q > QMAX) return false;
      var lid = uid('l'), tid = uid('t');
      p.lots.push({ id: lid, d: d, qty: q, px: px, fee: r.fee || 0, tot: r.cents, txId: tid, rule: r.id, est: true });
      S.tx.push({ id: tid, kind: 'inv', dir: 'buy', cents: r.cents, accId: r.accId, posId: p.id, lotId: lid, date: d, note: '', ts: nextTs(), rule: r.id });
      return true;
    }
    if (r.kind === 'giro') { var b = acc(r.toId); if (!b) { r.active = false; return false; } if (d < b.openDate) return false; }
    var t = { id: uid('t'), kind: r.kind, cents: r.cents, accId: r.accId, date: d, note: r.note || '', ts: nextTs(), rule: r.id };
    if (r.kind === 'giro') t.toId = r.toId; else t.catId = r.catId || '';
    S.tx.push(t); return true;
  }
  function rulesDue() { return S.rules.some(function (r) { var d = r.active ? ruleNext(r) : ''; return d && d <= TODAY; }); }
  var RUN_MAX = 6000;
  // Registra le scadenze arrivate (anche quelle perse mentre l'app era chiusa). Si ferma a 6000 per regola per volta.
  function runRules(silent) {
    if (!rulesDue()) return 0;
    var snap = snapDeep(), made = 0;
    S.rules.forEach(function (r) {
      var g = 0;
      while (r.active && g++ < RUN_MAX) {
        var d = ruleNext(r); if (!d || d > TODAY) break;
        if (S.tx.length >= LIM.tx - 10) break; // limite dati: il resto resta in coda
        if (r.type === 'pac') { var pp = posById(r.posId); if (pp && pp.lots.length >= LIM.lots - 10) break; }
        if (makeOcc(r, d)) made += 1;
        r.k += 1;
      }
    });
    if (made && !silent) { toast(made === 1 ? 'Registrata 1 operazione ricorrente' : 'Registrate ' + made + ' operazioni ricorrenti', function () { restoreDeep(snap); }); }
    return made;
  }
  // All'avvio: avvisa delle scadenze registrate mentre l'app era chiusa.
  function rulesToast(made) { if (made > 0) toast(made === 1 ? 'Registrata 1 operazione ricorrente' : 'Registrate ' + made + ' operazioni ricorrenti'); }

  /* ================= icone e grafici ================= */
  var I = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
    bars: '<path d="M5 20V10M12 20V4M19 20v-7"/>',
    pie: '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
    sliders: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3.2 3.9M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.8 9.8 0 0 0 4-.9"/>',
    chev: '<path d="M6 9l6 6 6-6"/>',
    swap: '<path d="M7 7h12l-3-3M17 17H5l3 3"/>',
    left: '<path d="M15 6l-6 6 6 6"/>', right: '<path d="M9 6l6 6-6 6"/>',
    check: '<path d="M5 12l5 5 9-10"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    mic: '<rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5"/>',
    back: '<path d="M15 6l-6 6 6 6"/>', del: '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M13 9.5l4 5M17 9.5l-4 5"/>'
  };
  function svg(n, c) { return '<svg class="ic ' + (c || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + '</svg>'; }

  function sparkSVG(vals) {
    var W = 320, H = 72, p = 5, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), rng = (max - min) || 1;
    var pts = vals.map(function (v, i) { return [p + i * (W - 2 * p) / (vals.length - 1), H - p - (v - min) / rng * (H - 2 * p)]; });
    var line = pts.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
    var last = pts[pts.length - 1];
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Andamento degli ultimi 30 giorni">' +
      '<path class="sp-area" d="' + line + 'L' + last[0].toFixed(1) + ' ' + H + 'L' + p + ' ' + H + 'Z"/>' +
      '<path class="sp-line" d="' + line + '"/><circle class="sp-dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4"/></svg>';
  }
  function barsSVG(bs) {
    var W = 340, H = 150, base = 122, top = 10, left = 4, right = 336;
    var m = S.an.chart, max = 1;
    bs.forEach(function (b) { max = Math.max(max, m !== 'inc' ? b.exp : 0, m !== 'exp' ? b.inc : 0); });
    var slot = (right - left) / bs.length, bw = Math.max(2, Math.min(14, slot * 0.34));
    var bwx = m === 'both' ? bw : Math.max(3, Math.min(18, slot * 0.6));
    var step = bs.length > 31 ? 7 : bs.length > 12 ? 5 : 1;
    var g = '<line class="ax" x1="' + left + '" y1="' + base + '" x2="' + right + '" y2="' + base + '"/>';
    bs.forEach(function (b, i) {
      var cx = left + slot * (i + 0.5);
      var hi = b.inc ? Math.max(2, b.inc / max * (base - top)) : 0, he = b.exp ? Math.max(2, b.exp / max * (base - top)) : 0;
      if (i === S.an.sel) g += '<rect class="selbg" x="' + (cx - slot / 2).toFixed(1) + '" y="' + (top - 4) + '" width="' + slot.toFixed(1) + '" height="' + (base - top + 4) + '" rx="3"/>';
      if (m !== 'exp') g += '<rect class="b-in" x="' + (m === 'both' ? cx - bwx - 0.5 : cx - bwx / 2).toFixed(1) + '" y="' + (base - hi).toFixed(1) + '" width="' + bwx.toFixed(1) + '" height="' + hi.toFixed(1) + '" rx="1.5"/>';
      if (m !== 'inc') g += '<rect class="b-out" x="' + (m === 'both' ? cx + 0.5 : cx - bwx / 2).toFixed(1) + '" y="' + (base - he).toFixed(1) + '" width="' + bwx.toFixed(1) + '" height="' + he.toFixed(1) + '" rx="1.5"/>';
      if (i % step === 0) g += '<text class="tx" x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(b.label) + '</text>';
      g += '<rect class="hit" data-act="bar" data-i="' + i + '" x="' + (cx - slot / 2).toFixed(1) + '" y="0" width="' + slot.toFixed(1) + '" height="' + H + '"/>';
    });
    return '<svg class="bars" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Entrate e spese nel periodo">' + g + '</svg>';
  }

  /* ================= schermate ================= */
  function txRow(t, set) {
    var ico, title, sub2, c = cat(t.catId), a1 = { name: accName(t.accId) }, a2 = t.toId ? { name: accName(t.toId) } : null;
    if (t.kind === 'giro') { ico = '⇄'; title = t.note || 'Giroconto'; sub2 = (a1 ? a1.name : '') + ' → ' + (a2 ? a2.name : ''); }
    else if (t.kind === 'rett') { ico = '≈'; title = 'Correzione saldo'; sub2 = a1 ? a1.name : ''; }
    else if (t.kind === 'inv') { var ip = posById(t.posId); ico = posIcon(ip); title = ip ? (t.dir === 'sell' ? 'Vendita ' : t.rule ? 'PAC ' : 'Acquisto ') + ip.name : (t.note || (t.dir === 'sell' ? 'Vendita investimento' : 'Acquisto investimento')); sub2 = a1.name; }
    else {
      ico = c ? c.icon : '🧾'; title = t.note || (c ? c.name : 'Senza categoria');
      sub2 = (c && t.note && t.note !== c.name ? c.name + ' · ' : '') + (a1 ? a1.name : '');
    }
    var eff = set ? setEffect(t, set) : (t.kind === 'giro' ? 0 : effect(t, t.accId));
    var amt = eff === 0 ? money(t.cents) : moneyS(eff), cls = eff === 0 ? 'neutral' : eff > 0 ? 'pos' : '';
    return '<button class="row" data-act="tx" data-id="' + t.id + '"><span class="ico">' + ico + '</span><span class="mid"><span class="nm">' + esc(title) + '</span><span class="sb">' + esc(sub2) + ' · ' + dayLabel(t.date) + (t.rule ? ' · ↻' : '') + '</span></span><span class="v ' + cls + '">' + amt + '</span></button>';
  }

  function viewHome() {
    var v = S.homeView, set = scopeSet(v);
    if (set && set.size === 0) { S.homeView = v = 'all'; set = null; }
    // un solo passaggio sui movimenti: 31 punti, da 30 giorni fa a oggi (stesso intervallo della variazione)
    var series = nwSeries(v, addDays(TODAY, -30), TODAY).map(function (q) { return q.v; });
    var cur = series[series.length - 1], past = series[0], d = cur - past;
    var st = stats(TODAY.slice(0, 8) + '01', TODAY, set);
    var rec = sortTx(S.tx.filter(function (t) { return inSet(t, set); })).slice(0, 5);
    var mnow = MESI_L[parseD(TODAY).getMonth()];
    if (!S.accounts.length) return '<section class="hero"><div class="herotop"><span class="lbl">Patrimonio totale</span></div><div class="amt" style="font-size:34px;font-weight:700">' + money(0) + '</div></section>' +
      '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:12px"><h2 style="margin:0">Crea il primo conto</h2><p class="hint" style="margin:0">Aggiungi dove tieni i soldi (contanti, banca, risparmi) con il saldo di oggi. Poi registra spese ed entrate col tasto +.</p><button class="btn" data-act="newacc">Crea un conto</button><button class="lnk" data-act="guide" style="align-self:flex-start">Come funziona l’app</button></div></section>';
    return remBanner() + (S.demo ? '<button class="banner" data-act="resetopen" style="text-align:left;width:100%">Dati di esempio. Tocca per eliminarli e iniziare da zero.</button>' : '') +
      '<section class="hero"><div class="herotop"><button class="totalbtn" data-act="scope" aria-label="Cambia il totale mostrato"><span class="lbl">' + esc(scopeLabel(v)) + svg('chev') + '</span><span class="amt">' + money(cur) + '</span></button>' +
      '<button class="iconbtn" data-act="hide" aria-label="' + (S.hide ? 'Mostra importi' : 'Nascondi importi') + '">' + svg(S.hide ? 'eyeoff' : 'eye') + '</button></div>' +
      '<div class="delta"><b class="' + (d >= 0 ? 'pos' : 'neg') + '">' + moneyS(d) + '</b> negli ultimi 30 giorni</div><button class="sparkbtn" data-act="nwopen" aria-label="Apri l’andamento nel tempo">' + sparkSVG(series) + '<span class="sparkcap">Andamento nel tempo ' + svg('right') + '</span></button></section>' +
      guideCard() + '<section class="sec"><h2>Questo mese · ' + mnow + '</h2><div class="card three"><div><span class="k">Entrate</span><span class="n pos">' + money(st.inc) + '</span></div><div><span class="k">Spese</span><span class="n neg">' + money(st.exp) + '</span></div><div><span class="k">Risparmiato</span><span class="n ' + (st.inc - st.exp >= 0 ? 'pos' : 'neg') + '">' + moneyS(st.inc - st.exp) + '</span></div></div></section>' +
      budgetSection() + goalsSection() +
      '<section class="sec"><div class="sech"><h2>Ultimi movimenti</h2>' + (rec.length ? '<button class="lnk" data-act="txlist">Vedi tutti e cerca</button>' : '') + '</div>' + (rec.length ? '<div class="list">' + rec.map(function (t) { return txRow(t, set); }).join('') + '</div>' : '<p class="empty">Nessun movimento. Tocca +.</p>') + '</section>';
  }

  function viewConti() {
    var tot = 0, liq = 0;
    S.accounts.forEach(function (a) { var b = balance(a.id); tot += b; if (a.type === 'liquidita') liq += b; });
    var groups = TYPE_ORDER.map(function (ty) {
      var list = S.accounts.filter(function (a) { return a.type === ty; });
      if (!list.length) return '';
      var subt = list.reduce(function (s, a) { return s + balance(a.id); }, 0);
      return '<section class="grp"><div class="grph"><h2>' + TYPES[ty] + '</h2><span class="gv">' + money(subt) + '</span></div><div class="list">' +
        list.map(function (a) {
          var b = balance(a.id), sb = sub(a.sub);
          return '<button class="row" data-act="acc" data-id="' + a.id + '"><span class="ico" style="--c:' + a.color + '">' + a.icon + '</span><span class="mid"><span class="nm">' + esc(a.name) + '</span>' + (sb || (a.goal && goalOk(a.type)) ? '<span class="sb">' + (sb ? esc(sb.name) : '') + (a.goal && goalOk(a.type) ? (sb ? ' · ' : '') + '🎯 ' + Math.min(100, Math.floor(goalInfo(a).ratio * 100)) + '% di ' + money(a.goal.cents) : '') + '</span>' : '') + '</span><span class="v ' + (b < 0 ? 'neg' : '') + '">' + money(b) + '</span></button>';
        }).join('') + '</div></section>';
    }).join('');
    return '<header class="ph"><h1>Conti</h1><div class="acts"><button class="tbtn" data-act="giro">' + svg('swap') + 'Giroconto</button><button class="tbtn pri" data-act="newacc">' + svg('plus') + 'Nuovo</button></div></header>' +
      '<div class="card"><div class="sb">Totale conti</div><div class="big">' + money(tot) + '</div><div class="sb">Disponibilità (liquidità): ' + money(liq) + '</div></div>' + (groups || '<p class="empty">Nessun conto. Crea il primo con Nuovo.</p>');
  }

  function range() {
    var a = S.an, base = TODAY, from, to, label, m, d;
    if (a.period === 'day') { from = to = addDays(base, a.offset); label = dayLabel(from); }
    else if (a.period === 'week') { d = parseD(addDays(base, a.offset * 7)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); from = ymd(d); to = addDays(from, 6); label = shortD(from) + ' – ' + shortD(to); }
    else if (a.period === 'month') { m = parseD(addMonths(base, a.offset)); from = ymd(new Date(m.getFullYear(), m.getMonth(), 1)); to = ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0)); label = MESI_L[m.getMonth()] + ' ' + m.getFullYear(); }
    else if (a.period === 'year') { var y = parseD(base).getFullYear() + a.offset; from = y + '-01-01'; to = y + '-12-31'; label = String(y); }
    else { from = a.from; to = a.to; label = shortD(from) + ' – ' + shortD(to); }
    return { from: from, to: to > TODAY ? TODAY : to, full: to, label: label };
  }
  function buckets(r) {
    var a = S.an, out = [], days = (dn(r.full) - dn(r.from)) + 1;
    var unit = (a.period === 'year' || (a.period === 'custom' && days > 62)) ? 'month' : 'day';
    if (unit === 'day') {
      for (var d = r.from; d <= r.full; d = addDays(d, 1)) {
        var dd = parseD(d);
        out.push({ from: d, to: d, label: a.period === 'week' ? GIORNI_I[dd.getDay()] : String(dd.getDate()) });
      }
    } else {
      var m = parseD(r.from); m = new Date(m.getFullYear(), m.getMonth(), 1);
      while (ymd(m) <= r.full) {
        var f = ymd(m), t = ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0));
        out.push({ from: f < r.from ? r.from : f, to: t > r.full ? r.full : t, label: MESI[m.getMonth()] });
        m = new Date(m.getFullYear(), m.getMonth() + 1, 1);
      }
    }
    return out;
  }
  function viewAnalisi() {
    var a = S.an, r = range(), set = a.accIds ? new Set(a.accIds) : null;
    var txs = S.tx.filter(function (t) { return (t.kind === 'spesa' || t.kind === 'entrata') && t.date >= r.from && t.date <= r.to && (!set || set.has(t.accId)); });
    var inc = 0, exp = 0; txs.forEach(function (t) { if (t.kind === 'entrata') inc += t.cents; else exp += t.cents; });
    var P = [['day', 'Giorno'], ['week', 'Settimana'], ['month', 'Mese'], ['year', 'Anno'], ['custom', 'Personalizzato']];
    var h = '<header class="ph"><h1>Analisi</h1><div class="acts"><button class="tbtn" data-act="anpers">' + svg('sliders') + 'Vista</button></div></header>';
    h += '<div class="chips" role="tablist">' + P.map(function (p) { return '<button class="chip ' + (a.period === p[0] ? 'on' : '') + '" data-act="per" data-p="' + p[0] + '" role="tab" aria-selected="' + (a.period === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
    if (a.period === 'custom') {
      h += '<div class="dates"><div class="fld"><label for="an-from">Dal</label><input type="date" id="an-from" data-chg="range" max="' + TODAY + '" value="' + a.from + '"></div><div class="fld"><label for="an-to">Al</label><input type="date" id="an-to" data-chg="range" max="' + TODAY + '" value="' + a.to + '"></div></div>';
    } else {
      h += '<div class="nav"><button class="iconbtn" data-act="prev" aria-label="Periodo precedente">' + svg('left') + '</button><span class="lb">' + esc(r.label) + '</span><button class="iconbtn" data-act="next" aria-label="Periodo successivo"' + (a.offset >= 0 ? ' disabled' : '') + '>' + svg('right') + '</button></div>';
    }
    h += '<button class="tbtn" data-act="anacc" style="align-self:flex-start">' + (a.accIds ? a.accIds.length + ' conti selezionati' : 'Tutti i conti') + svg('chev') + '</button>';
    h += '<div class="card three"><div><span class="k">Entrate</span><span class="n pos">' + money(inc) + '</span></div><div><span class="k">Spese</span><span class="n neg">' + money(exp) + '</span></div><div><span class="k">Saldo</span><span class="n ' + (inc - exp >= 0 ? 'pos' : 'neg') + '">' + moneyS(inc - exp) + '</span></div></div>';

    if (a.blocks.time && a.period !== 'day') {
      var bs = buckets(r).map(function (b) { var i2 = 0, e2 = 0; txs.forEach(function (t) { if (t.date >= b.from && t.date <= b.to) { if (t.kind === 'entrata') i2 += t.cents; else e2 += t.cents; } }); b.inc = i2; b.exp = e2; return b; });
      var cap = 'Tocca una barra per il dettaglio.';
      if (a.sel >= 0 && bs[a.sel]) {
        var b = bs[a.sel], parts = [];
        if (a.chart !== 'inc') parts.push('spese ' + money(b.exp));
        if (a.chart !== 'exp') parts.push('entrate ' + money(b.inc));
        cap = (b.from === b.to ? dayLabel(b.from) : esc(b.label)) + ' · ' + parts.join(' · ');
      }
      var CH = [['exp', 'Spese'], ['inc', 'Entrate'], ['both', 'Entrambe']];
      h += '<section class="sec"><div class="sech"><h2>Andamento</h2><div class="smallseg s3">' + CH.map(function (c) { return '<button data-act="chart" data-k="' + c[0] + '" class="' + (a.chart === c[0] ? 'on' : '') + '">' + c[1] + '</button>'; }).join('') + '</div></div><div class="card">' + barsSVG(bs) +
        '<div class="legend">' + (a.chart !== 'inc' ? '<span><i style="background:var(--out)"></i>Spese</span>' : '') + (a.chart !== 'exp' ? '<span><i style="background:var(--inc)"></i>Entrate</span>' : '') + '</div><p class="cap" style="margin-top:8px">' + cap + '</p></div></section>';
    }
    if (a.blocks.cat) {
      var kind = a.catKind, map = {}, total = 0;
      txs.forEach(function (t) { if (t.kind !== kind) return; var k = t.catId || '-'; map[k] = (map[k] || 0) + t.cents; total += t.cents; });
      var rows = Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (x, y) { return y[1] - x[1]; });
      var shown = rows.slice(0, 6), rest = rows.slice(6).reduce(function (s, x) { return s + x[1]; }, 0);
      if (rest) shown.push(['*', rest]);
      h += '<section class="sec"><div class="sech"><h2>Per categoria</h2><div class="smallseg"><button data-act="catkind" data-k="spesa" class="' + (kind === 'spesa' ? 'on' : '') + '">Spese</button><button data-act="catkind" data-k="entrata" class="' + (kind === 'entrata' ? 'on' : '') + '">Entrate</button></div></div>';
      h += shown.length ? '<div class="card">' + shown.map(function (x) {
        var c = cat(x[0]), nm = x[0] === '*' ? 'Altre categorie' : c ? c.name : 'Senza categoria', ic = x[0] === '*' ? '…' : c ? c.icon : '🧾';
        return '<div class="cbar"><div class="top"><span class="nm">' + ic + ' ' + esc(nm) + '</span><span class="v">' + money(x[1]) + ' · ' + pct(x[1] / total) + '</span></div><div class="tr"><div class="fl2" style="width:' + (x[1] / total * 100).toFixed(1) + '%;--c:' + (kind === 'spesa' ? 'var(--out)' : 'var(--inc)') + '"></div></div></div>';
      }).join('') + '</div>' : '<p class="empty">Nessun movimento in questo periodo.</p>';
      h += '</section>';
    }
    if (a.blocks.acc) {
      var ids = a.accIds || S.accounts.map(function (x) { return x.id; });
      h += '<section class="sec"><h2>Per conto</h2><div class="list">' + ids.map(function (id) {
        var ac = acc(id); if (!ac) return '';
        var i3 = 0, e3 = 0; txs.forEach(function (t) { if (t.accId === id) { if (t.kind === 'entrata') i3 += t.cents; else e3 += t.cents; } });
        if (!i3 && !e3) return '';
        return '<div class="row"><span class="ico" style="--c:' + ac.color + '">' + ac.icon + '</span><span class="mid"><span class="nm">' + esc(ac.name) + '</span><span class="sb">Entrate ' + money(i3) + ' · Spese ' + money(e3) + '</span></span><span class="v ' + (i3 - e3 >= 0 ? 'pos' : 'neg') + '">' + moneyS(i3 - e3) + '</span></div>';
      }).join('') + (function () {
        if (a.accIds) return '';
        var i4 = 0, e4 = 0; txs.forEach(function (t) { if (isGone(t.accId)) { if (t.kind === 'entrata') i4 += t.cents; else e4 += t.cents; } });
        return (!i4 && !e4) ? '' : '<div class="row"><span class="ico">🗂️</span><span class="mid"><span class="nm">Conti eliminati</span><span class="sb">Entrate ' + money(i4) + ' · Spese ' + money(e4) + '</span></span><span class="v ' + (i4 - e4 >= 0 ? 'pos' : 'neg') + '">' + moneyS(i4 - e4) + '</span></div>';
      })() + '</div></section>';
    }
    if (a.blocks.list || a.period === 'day') {
      var l = sortTx(txs).slice(0, 15);
      h += '<section class="sec"><div class="sech"><h2>Movimenti del periodo</h2><button class="lnk" data-act="txlist" data-an="1" data-per="custom" data-from="' + r.from + '" data-to="' + r.to + '">Vedi tutti</button></div>' + (l.length ? '<div class="list">' + l.map(function (t) { return txRow(t, null); }).join('') + '</div>' : '<p class="empty">Nessun movimento in questo periodo.</p>') + '</section>';
    }
    h += '<p class="note">Giroconti e correzioni non contano come entrate o spese.</p>';
    return h;
  }

  function qtyStr(q, p) { return (q / 1e8).toLocaleString('it-IT', { maximumFractionDigits: p && !isCry(p) ? 6 : 8 }); }
  function pxStr(px) { return S.hide ? '•••• ' + SYM[S.cur] : (px / 1e6).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 6 }) + ' ' + SYM[S.cur]; }
  function xirrStr(x) { return x === null ? 'n.d.' : Math.abs(x) >= 10 ? '>999%' : (x > 0 ? '+' : x < 0 ? '−' : '') + (Math.abs(x) * 100).toFixed(1).replace('.', ',') + '%'; }
  // Torta piena: ogni spicchio è un cerchio con tratto largo quanto il raggio della torta.
  function pieSVG(segs, tot) {
    var R = 30, C = 2 * Math.PI * R, off = 0, g = '';
    segs.forEach(function (x) {
      var len = x[1] / tot * C, gap = segs.length > 1 ? Math.min(1.2, len / 2) : 0;
      g += '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="' + x[2] + '" stroke-width="60" stroke-dasharray="' + (len - gap).toFixed(2) + ' ' + (C - len + gap).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" transform="rotate(-90 60 60)"/>';
      off += len;
    });
    return '<svg class="pie" viewBox="0 0 120 120" role="img" aria-label="Composizione del patrimonio">' + g + '</svg>';
  }
  function viewPortfolio() {
    var al = alloc(), segs = [['Liquidità', al.liq, 'var(--c1)'], ['Risparmi', al.sav, 'var(--c2)'], ['Crediti', al.cred, 'var(--c3)'], ['Investimenti', al.inv, 'var(--c4)'], ['Cripto', al.cry, 'var(--c5)']].filter(function (x) { return x[1] > 0; });
    var h = '<header class="ph"><h1>Portfolio</h1></header>';
    h += '<div class="card"><div class="sb">Patrimonio netto</div><div class="big" style="margin-bottom:12px">' + money(al.tot + al.debt) + '</div>';
    h += al.tot > 0 ? '<div class="piew">' + pieSVG(segs, al.tot) + '</div><div class="leg" style="margin-top:12px">' + segs.map(function (x) { return '<div><i style="background:' + x[2] + '"></i><span class="t">' + x[0] + '</span><span class="m">' + money(x[1]) + '</span><span class="p">' + pct(x[1] / al.tot) + '</span></div>'; }).join('') + '</div>' : '<p class="empty">Nessun dato.</p>';
    h += '<p class="note" style="margin-top:10px">Percentuali sulle attività. Debiti: ' + money(al.debt) + '.</p></div>';
    // investimenti
    var tv = 0, ti = 0, tg = 0, stats = S.pos.map(function (p) { var z = posStat(p); tv += z.value; ti += z.k.invested; tg += z.gain; return z; });
    var stale = S.pos.filter(pxStale).length;
    h += '<section class="sec"><div class="sech"><h2>Investimenti</h2>' + (S.pos.length ? '<button class="tbtn" data-act="pxall">🏷️ Aggiorna valori</button>' : '') + '</div>';
    if (stale) h += '<button class="banner" data-act="pxall" style="text-align:left;width:100%">' + (stale === 1 ? '1 investimento non aggiornato' : stale + ' investimenti non aggiornati') + ' di recente: il guadagno potrebbe non essere attuale. Tocca per aggiornarli (meno di un minuto).</button>';
    if (S.pos.length) {
      h += '<button class="card invsum" data-act="posinv"><div class="three"><div><span class="k">Valore attuale</span><span class="n">' + money(tv) + '</span></div><div><span class="k">Versato</span><span class="n">' + money(ti) + '</span></div><div><span class="k">Guadagno</span><span class="n ' + (tg >= 0 ? 'pos' : 'neg') + '">' + moneyS(tg) + '<br><span class="sb">' + pctS(ti > 0 ? tg / ti : null) + '</span></span></div></div><span class="sparkcap">Andamento ' + svg('right') + '</span></button>';
      h += '<button class="lnk" data-act="invhelp" style="align-self:flex-start">Come leggere valore, versato e guadagno</button>';
      h += '<div class="list">' + S.pos.map(function (p, i) {
        var z = stats[i];
        return '<button class="row" data-act="posopen" data-id="' + p.id + '"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + (isCry(p) ? '' : esc(p.isin || 'Titolo / ETF') + ' · ') + qtyStr(z.k.qty, p) + ' ' + esc(unitL(p)) + (isAuto(p) && !pxStale(p) ? ' · ⚡ auto' : pxStale(p) ? ' · <span class="stale">valore di ' + agoL(z.pxDate) + '</span>' : '') + '</span></span><span class="v">' + money(z.value) + '<br><span class="sb ' + (z.gain >= 0 ? 'pos' : 'neg') + '">' + moneyS(z.gain) + ' · ' + pctS(z.pct) + '</span></span></button>';
      }).join('') + '</div>';
    } else h += '<p class="empty">Nessun investimento. Aggiungi titoli, ETF o cripto.</p>';
    h += '<button class="pick addnew" data-act="newpos"><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Aggiungi investimento</span></span></button></section>';
    var pacs = S.rules.filter(function (r) { return r.type === 'pac'; });
    h += '<section class="sec"><h2>PAC</h2>' + (pacs.length ? '<div class="list">' + pacs.map(function (r) {
      var p = posById(r.posId), nx = ruleNext(r);
      return '<button class="row" data-act="pacopen" data-id="' + r.id + '"><span class="ico">🔁</span><span class="mid"><span class="nm">' + esc(p ? p.name : 'PAC') + '</span><span class="sb">' + freqL(r) + ' · ' + (!r.active ? 'in pausa' : nx ? 'prossimo ' + dayLabel(nx) : 'terminato') + '</span></span><span class="v">' + money(r.cents) + '</span></button>';
    }).join('') + '</div>' : '<p class="empty">Nessun PAC.</p>') + '<button class="pick addnew" data-act="pacnew" data-id=""><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Aggiungi PAC</span></span></button></section>';
    h += '<p class="note">' + (S.autoCry && S.pos.some(isCry) ? 'Titoli ed ETF: valori inseriti da te («Aggiorna valori»). Cripto: prezzi automatici da CoinGecko, disattivabili nelle Impostazioni.' : 'Valori inseriti da te: «Aggiorna valori» li aggiorna tutti in pochi tocchi.') + '</p>';
    return h;
  }

  function viewSettings() {
    var nS = S.cats.filter(function (c) { return c.kind === 'spesa'; }).length, nE = S.cats.filter(function (c) { return c.kind === 'entrata'; }).length;
    var TH = [['chiaro', 'Chiaro'], ['scuro', 'Scuro']];
    return '<header class="ph"><h1>Impostazioni</h1></header>' +
      '<section class="sec"><h2>Aspetto</h2><div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="seg s2" role="radiogroup" aria-label="Tema">' +
      TH.map(function (t) { return '<button data-act="theme" data-k="' + t[0] + '" role="radio" aria-checked="' + (S.theme === t[0]) + '" class="' + (S.theme === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div>' +
      '</div></section>' +
      '<section class="sec"><h2>Valuta</h2><div class="card" style="display:flex;flex-direction:column;gap:12px"><div class="seg s2" role="radiogroup" aria-label="Valuta">' +
      ['EUR', 'USD'].map(function (c) { return '<button data-act="cur" data-k="' + c + '" role="radio" aria-checked="' + (S.cur === c) + '" class="' + (S.cur === c ? 'on' : '') + '">' + CURN[c] + ' (' + SYM[c] + ')</button>'; }).join('') + '</div>' +
      '<p class="note">Cambia solo simbolo e formato: gli importi non vengono convertiti.</p></div></section>' +
      '<section class="sec"><h2>Personalizza</h2><div class="card" style="padding:0 16px">' +
      '<button class="navrow" data-act="budgets"><span>Budget mensili<br><span class="sb">Limite di spesa per categoria</span></span><span class="r">' + S.cats.filter(function (c) { return c.budget > 0; }).length + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="rules"><span>Ricorrenze e PAC</span><span class="r">' + S.rules.length + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managecats" data-k="spesa"><span>Categorie di spesa</span><span class="r">' + nS + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managecats" data-k="entrata"><span>Categorie di entrata</span><span class="r">' + nE + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managesubs" style="border-bottom:0"><span>Sottotipologie di conto</span><span class="r">' + S.subs.length + svg('right') + '</span></button></div></section>' +
      '<section class="sec"><h2>Investimenti</h2><div class="card" style="padding:0 16px"><label class="sw" style="border-bottom:0"><span>Prezzi cripto automatici</span><input type="checkbox" data-chg="autocry"' + (S.autoCry ? ' checked' : '') + ' aria-label="Prezzi cripto automatici"></label></div></section>' +
      '<section class="sec"><h2>Aiuto</h2><div class="card" style="padding:0 16px"><button class="navrow" data-act="tour"><span>Rivedi il tutorial</span><span class="r">' + svg('right') + '</span></button><button class="navrow" data-act="guide" style="border-bottom:0"><span>Come funziona l’app</span><span class="r">' + svg('right') + '</span></button></div></section>' +
      '<section class="sec"><h2>Privacy</h2><div class="card" style="padding:0 16px"><label class="sw" style="border-bottom:0"><span>Nascondi gli importi<br><span class="sb">Utile in pubblico</span></span><input type="checkbox" data-chg="hide"' + (S.hide ? ' checked' : '') + ' aria-label="Nascondi gli importi"></label></div></section>' +
      '<section class="sec"><h2>Dati</h2><div class="card" style="padding:0 16px">' +
      '<div class="navrow"><span>Stato<br><span class="sb" id="sync-sub">' + esc(syncText()) + '</span></span></div>' +
      '<button class="navrow" data-act="export"><span>Esporta backup<br><span class="sb">' + esc(lastBackupText()) + '</span></span><span class="r">' + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="csvall"><span>Esporta movimenti (CSV)<br><span class="sb">Da aprire con Excel o Numbers</span></span><span class="r">' + svg('right') + '</span></button>' +
      '<label class="navrow" for="imp-file" role="button"><span>Importa backup</span><span class="r">' + svg('right') + '</span></label>' +
      '<button class="navrow" data-act="snaps"><span>Versioni salvate<br><span class="sb">Automatiche, su questo dispositivo</span></span><span class="r">' + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="resetopen" style="border-bottom:0"><span style="color:var(--out)">' + (S.demo ? 'Elimina dati di esempio…' : 'Elimina tutti i dati…') + '</span></button></div>' +
      '<p class="note">' + storageNote() + '</p>' + versionRow() + '</section>';
  }

  function render(noSave) {
    var v = { home: viewHome, conti: viewConti, analisi: viewAnalisi, portfolio: viewPortfolio, settings: viewSettings }[S.tab]();
    $('#view').innerHTML = v;
    var T = [['conti', 'Conti', 'wallet'], ['analisi', 'Analisi', 'bars'], ['home', 'Home', 'home'], ['portfolio', 'Portfolio', 'pie'], ['settings', 'Impostazioni', 'sliders']];
    $('#tabs').innerHTML = T.map(function (t) {
      var home = t[0] === 'home';
      return '<button class="tab ' + (home ? 'home ' : '') + (S.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + (home ? '<span class="hb">' + svg('home') + '</span>' : svg(t[2])) + '<span>' + t[1] + '</span></button>';
    }).join('');
    $('#fabw').innerHTML = S.tab === 'home' ? '<button class="fab mic" data-act="voice" aria-label="Inserisci movimenti a voce">' + svg('mic') + '</button>' + '<button class="fab add" data-act="add" aria-label="Aggiungi spesa o entrata">' + svg('plus') + '</button>' : '';
    if (!noSave) touch(); // il cambio di scheda non modifica i dati: niente salvataggio
  }

  /* ================= livelli: schermate intere e fogli ================= */
  function layerOf(name) { for (var i = L.length - 1; i >= 0; i--) if (L[i].name === name) return L[i]; return null; }
  function topL() { return L[L.length - 1] || null; }
  var lastPopT = 0, lastX = 0, lastY = 0;
  function pushLayer(kind, name, html, st, o) {
    // Un doppio tocco non apre due volte la stessa schermata.
    var tp = L[L.length - 1]; if (tp && tp.name === name && tp.kind === kind) return tp;
    var el = document.createElement('div');
    el.className = 'layer ' + kind; el.style.zIndex = String(50 + L.length * 10);
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = kind === 'sheet' ? '<div class="panel">' + html + '</div>' : '<div class="scr">' + html + '</div>';
    document.body.appendChild(el); lockPage(true);
    armed = null; $('#toast').hidden = true;
    var lay = { el: el, kind: kind, name: name, st: st || {}, render: o && o.render, refresh: o && o.refresh };
    L.push(lay); return lay;
  }
  function popLayer() {
    var lay = L.pop(); if (!lay) return null;
    if (lay.name === 'voice') voiceStop();
    lastPopT = Date.now();
    lay.el.remove(); armed = null;
    if (!L.length) { lockPage(false); render(); }
    else { var t = L[L.length - 1]; if (t.refresh) t.refresh(); }
    return lay;
  }
  // Pagina sotto le schermate bloccata: html e body alti quanto lo schermo e senza scorrimento (il documento non ha
  // nulla da far scorrere, nemmeno su iPhone); la posizione della pagina si conserva scorrendo il body dall'interno.
  var lockY = null;
  function lockPage(on) {
    var r = document.documentElement, b = document.body;
    if (on) {
      if (lockY !== null) return;
      lockY = window.scrollY || 0;
      r.classList.add('lock'); b.classList.add('lock');
      b.scrollTop = lockY; if (window.scrollY) window.scrollTo(0, 0);
      return;
    }
    r.classList.remove('lock'); b.classList.remove('lock'); b.scrollTop = 0;
    if (lockY) window.scrollTo(0, lockY);
    lockY = null;
  }
  function closeAll() { voiceStop(); lastPopT = Date.now(); while (L.length) L.pop().el.remove(); armed = null; lockPage(false); render(); }
  function scrHead(title, back, id) {
    return '<div class="scrh"><button class="x" data-act="close" aria-label="' + (back ? 'Indietro' : 'Chiudi') + '">' + svg(back ? 'back' : 'x') + '</button><h2' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2><span class="sp"></span></div>';
  }
  function shHead(t) { return '<div class="shh"><h2>' + esc(t) + '</h2><button class="x" data-act="close" aria-label="Chiudi">' + svg('x') + '</button></div>'; }
  var toastT = null, undoFn = null, txlT = null;
  function toast(msg, undo) {
    clearTimeout(toastT); undoFn = undo || null;
    var t = $('#toast'); t.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo">Annulla</button>' : ''); t.hidden = false;
    toastT = setTimeout(function () { t.hidden = true; undoFn = null; }, 6000);
  }
  function otherAcc(id) { for (var i = 0; i < S.accounts.length; i++) if (S.accounts[i].id !== id) return S.accounts[i].id; return id; }
  function accChip(a) { return a ? '<span>' + a.icon + '</span><span>' + esc(a.name) + '</span>' : '<span>—</span>'; }

  /* ================= nuovo movimento (schermata ferma con tastierino) ================= */
  function addHtml() {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', 'back'];
    return scrHead('', false, 'a-title') +
      '<div class="scrb">' +
      '<div class="seg" role="tablist" aria-label="Tipo di movimento"><button data-act="mode" data-mode="spesa">Spesa</button><button data-act="mode" data-mode="entrata">Entrata</button><button data-act="mode" data-mode="giro">Giroconto</button></div>' +
      '<div class="amtd" id="a-amtd"><span class="num" id="a-num"></span><span class="cur" id="a-cur"></span></div>' +
      '<p class="hint" id="a-hint" style="text-align:center"></p>' +
      '<div class="frows">' +
      '<button class="frow" data-act="pickacc" data-w="from"><span class="fl" id="a-lacc"></span><span class="fv" id="a-vacc"></span>' + svg('right') + '</button>' +
      '<button class="frow" id="a-rto" data-act="pickacc" data-w="to"><span class="fl">A conto</span><span class="fv" id="a-vto"></span>' + svg('right') + '</button>' +
      '<button class="frow" id="a-rcat" data-act="pickcat"><span class="fl">Categoria</span><span class="fv" id="a-vcat"></span>' + svg('right') + '</button>' +
      '<div class="frow split"><label class="half">' + svg('cal') + '<span id="a-vdate"></span><input type="date" id="a-date" aria-label="Data"></label><input class="nota" id="a-note" maxlength="60" autocomplete="off" placeholder="Nota (facoltativa)" aria-label="Nota"></div>' +
      '<button class="frow" id="a-rrep" data-act="reppick"><span class="fl">Ripeti</span><span class="fv" id="a-vrep"></span>' + svg('right') + '</button>' +
      '</div></div>' +
      '<div class="scrf"><p class="msg" id="a-msg" role="alert"></p><button class="btn" id="a-save" data-act="savetx">Salva</button><div class="pad" role="group" aria-label="Tastierino">' +
      keys.map(function (k) { return '<button class="key" data-act="key" data-k="' + k + '" aria-label="' + (k === 'back' ? 'Cancella' : k === ',' ? 'Virgola' : k) + '">' + (k === 'back' ? svg('del') : k) + '</button>'; }).join('') + '</div></div>';
  }
  function openAdd(o) {
    if (!S.accounts.length) { toast('Crea prima un conto.'); return; }
    var t = o.tx || null, mode = t ? t.kind : (o.mode || 'spesa');
    var accId = t ? t.accId : defAccId();
    var st = { edit: t ? t.id : null, mode: mode, amt: t ? amtStr(t.cents) : '', accId: accId, toId: t && t.toId ? t.toId : otherAcc(accId), catId: t ? (t.catId || '') : '', date: t ? t.date : TODAY, note: t ? t.note : '', rep: '' };
    pushLayer('screen', 'add', addHtml(), st, { refresh: syncAdd });
    syncAdd();
  }
  function syncAdd() {
    var lay = layerOf('add'); if (!lay) return;
    var st = lay.st, el = lay.el, m = st.mode, g = function (s) { return el.querySelector(s); };
    Array.prototype.forEach.call(el.querySelectorAll('.seg button'), function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    g('#a-title').textContent = m === 'giro' ? (st.edit ? 'Modifica giroconto' : 'Nuovo giroconto') : (st.edit ? 'Modifica ' : 'Nuova ') + (m === 'spesa' ? 'spesa' : 'entrata');
    var txt = dispAmt(st.amt), num = g('#a-num');
    num.textContent = txt; num.classList.toggle('ph', st.amt === '');
    num.style.fontSize = txt.length <= 8 ? '52px' : txt.length <= 11 ? '42px' : '34px';
    g('#a-cur').textContent = SYM[S.cur];
    g('#a-amtd').className = 'amtd m-' + m;
    g('#a-hint').textContent = m === 'spesa' ? 'Importo senza segno: esce dal conto.' : m === 'entrata' ? 'Importo senza segno: entra nel conto.' : 'Sposta denaro tra due conti. Non è spesa né entrata.';
    g('#a-lacc').textContent = m === 'spesa' ? 'Pagato con' : m === 'entrata' ? 'Accreditato su' : 'Da conto';
    g('#a-vacc').innerHTML = accChip(acc(st.accId));
    g('#a-vto').innerHTML = accChip(acc(st.toId));
    var c = cat(st.catId);
    g('#a-vcat').innerHTML = c ? '<span>' + c.icon + '</span><span>' + esc(c.name) + '</span>' : '<span style="color:var(--muted)">Senza categoria</span>';
    g('#a-rto').hidden = m !== 'giro'; g('#a-rcat').hidden = m === 'giro';
    g('#a-vdate').textContent = dayLabel(st.date);
    var di = g('#a-date'); if (di.value !== st.date) di.value = st.date;
    if (st.rep) di.removeAttribute('max'); else di.setAttribute('max', TODAY);
    g('#a-rrep').hidden = !!st.edit; g('#a-vrep').textContent = st.rep ? FREQ[st.rep] : 'Mai';
    var ni = g('#a-note'); if (ni.value !== st.note) ni.value = st.note;
    var sv = g('#a-save'); sv.className = 'btn m-' + m;
    sv.textContent = m === 'spesa' ? 'Salva spesa' : m === 'entrata' ? 'Salva entrata' : 'Registra giroconto';
  }
  function keyPress(k) {
    var lay = layerOf('add'); if (!lay) return;
    var st = lay.st, s = st.amt;
    if (k === 'back') s = s.slice(0, -1);
    else if (k === ',') { if (s.indexOf(',') < 0) s = (s === '' ? '0' : s) + ','; }
    else {
      var p = s.split(',');
      if (p.length === 2) { if (p[1].length >= 2) return; s += k; }
      else { if (p[0].length >= 9) return; s = (s === '0') ? k : s + k; }
    }
    st.amt = s;
    var msg = lay.el.querySelector('#a-msg'); msg.textContent = ''; msg.className = 'msg';
    syncAdd();
  }
  function saveTx() {
    var lay = layerOf('add'); if (!lay) return;
    var st = lay.st, m = st.mode, msg = lay.el.querySelector('#a-msg');
    function err(t) { msg.textContent = t; msg.className = 'msg bad'; }
    var cents = st.amt === '' ? null : parseCents(st.amt.replace(/,$/, ''));
    if (cents === null) return err('Inserisci l’importo.');
    if (cents === 0) return err('Importo maggiore di zero.');
    var a = acc(st.accId); if (!a) return err('Scegli un conto.');
    var rep = st.edit ? '' : st.rep;
    if (!st.date) return err('Scegli una data.');
    if (st.date > TODAY && !rep) return err('Data futura: imposta «Ripeti».');
    if (st.date <= TODAY && st.date < a.openDate) return err('Prima dell’apertura del conto (' + dayLabel(a.openDate) + ').');
    var tx = { id: st.edit || uid('t'), kind: m, cents: cents, accId: st.accId, date: st.date, note: (st.note || '').trim().slice(0, 60), ts: Date.now() };
    if (m === 'giro') {
      if (st.toId === st.accId) return err('Scegli due conti diversi.');
      var b = acc(st.toId); if (!b) return err('Scegli il conto di destinazione.');
      if (st.date < b.openDate) return err('Prima dell’apertura del conto di destinazione.');
      tx.toId = st.toId;
    } else { tx.catId = st.catId || ''; }
    var label = m === 'spesa' ? 'Spesa' : m === 'entrata' ? 'Entrata' : 'Giroconto';
    if (rep) {
      var snap = snapDeep(), rule = { id: uid('r'), type: 'mov', kind: m, cents: cents, accId: st.accId, toId: tx.toId || '', catId: tx.catId || '', note: tx.note, freq: rep, anchor: st.date, k: 0, end: '', active: true };
      if (st.date <= TODAY) { tx.rule = rule.id; S.tx.push(tx); rule.k = 1; }
      S.rules.push(rule); S.lastAcc = st.accId; popLayer();
      var more = runRules(true);
      toast(st.date > TODAY ? 'Ricorrenza creata. Prossima: ' + dayLabel(st.date) : label + ' ripetuta ' + FREQ_L[rep] + (more ? ' · altre ' + more + ' registrate' : ''), function () { restoreDeep(snap); });
      return;
    }
    if (st.edit) {
      var old = txById(st.edit), idx = S.tx.indexOf(old); tx.ts = old.ts; if (old.rule) tx.rule = old.rule; S.tx[idx] = tx;
      S.lastAcc = st.accId; popLayer();
      toast(label + (m === 'giro' ? ' modificato' : ' modificata'), function () { S.tx[S.tx.indexOf(txById(tx.id))] = old; });
    } else {
      S.tx.push(tx); S.lastAcc = st.accId; popLayer();
      toast(label + (m === 'giro' ? ' registrato: ' : ' salvata: ') + money(cents) + budNote(tx), function () { S.tx = S.tx.filter(function (x) { return x.id !== tx.id; }); });
    }
  }

  function openAccPicker(which) {
    var al = layerOf('add'); if (!al) return;
    var m = al.st.mode, cur = which === 'to' ? al.st.toId : al.st.accId;
    var title = which === 'to' ? 'A quale conto' : m === 'spesa' ? 'Pagato con' : m === 'entrata' ? 'Accreditato su' : 'Da quale conto';
    pushLayer('sheet', 'pick', shHead(title) + '<div>' + S.accounts.map(function (a) {
      var sb = sub(a.sub);
      return '<button class="pick" data-act="setacc" data-w="' + which + '" data-id="' + a.id + '"><span class="ico" style="--c:' + a.color + '">' + a.icon + '</span><span class="mid"><span class="nm">' + esc(a.name) + '</span><span class="sb">' + esc(sb ? sb.name : TYPES[a.type]) + '</span></span><span class="v">' + money(balance(a.id)) + '</span><span class="ck">' + (a.id === cur ? svg('check') : '') + '</span></button>';
    }).join('') + '</div>');
  }
  function openCatPicker() {
    var al = layerOf('add'); if (!al) return;
    var m = al.st.mode, cur = al.st.catId, list = S.cats.filter(function (c) { return c.kind === m; });
    pushLayer('sheet', 'pick', shHead(m === 'spesa' ? 'Categoria di spesa' : 'Categoria di entrata') + '<div>' +
      '<button class="pick" data-act="setcat" data-id=""><span class="ico">∅</span><span class="mid"><span class="nm">Senza categoria</span></span><span class="ck">' + (cur === '' ? svg('check') : '') + '</span></button>' +
      list.map(function (c) { return '<button class="pick" data-act="setcat" data-id="' + c.id + '"><span class="ico">' + c.icon + '</span><span class="mid"><span class="nm">' + esc(c.name) + '</span></span><span class="ck">' + (c.id === cur ? svg('check') : '') + '</span></button>'; }).join('') +
      '<button class="pick addnew" data-act="newcatadd"><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Nuova categoria</span></span></button></div>');
  }

  /* ================= fogli di scelta e dettaglio ================= */
  function sheetScope() {
    var cur = S.homeView;
    function row(v, ico, name, subt, val) {
      return '<button class="pick" data-act="setscope" data-v="' + v + '"><span class="ico">' + ico + '</span><span class="mid"><span class="nm">' + esc(name) + '</span><span class="sb">' + esc(subt) + '</span></span><span class="v">' + money(val) + '</span><span class="ck">' + (cur === v ? svg('check') : '') + '</span></button>';
    }
    var h = shHead('Che totale vuoi vedere?') + '<div>' + row('all', '∑', 'Patrimonio totale', 'Conti e investimenti', netWorth()) + '</div>';
    var tl = TYPE_ORDER.filter(function (t) { return S.accounts.some(function (a) { return a.type === t; }); });
    h += '<h2>Per tipo</h2><div>' + tl.map(function (t) { return row('type:' + t, TYPE_ICON[t], TYPES[t], S.accounts.filter(function (a) { return a.type === t; }).length + ' conti', scopeValue('type:' + t)); }).join('') + '</div>';
    var sl = S.subs.filter(function (s) { return S.accounts.some(function (a) { return a.sub === s.id; }); });
    if (sl.length) h += '<h2>Per sottotipologia</h2><div>' + sl.map(function (s) { return row('sub:' + s.id, TYPE_ICON[s.type], s.name, TYPES[s.type], scopeValue('sub:' + s.id)); }).join('') + '</div>';
    h += '<h2>Per conto</h2><div>' + S.accounts.map(function (a) { return row('acc:' + a.id, a.icon, a.name, (sub(a.sub) || { name: TYPES[a.type] }).name, balance(a.id)); }).join('') + '</div>';
    pushLayer('sheet', 'scope', h);
  }

  function sheetTx(id) {
    var t = txById(id); if (!t) return;
    var canEdit = !!acc(t.accId) && (!t.toId || !!acc(t.toId));
    var c = cat(t.catId), kindL = { spesa: 'Spesa', entrata: 'Entrata', giro: 'Giroconto', rett: 'Correzione saldo', inv: t.dir === 'sell' ? 'Vendita' : 'Acquisto' }[t.kind];
    var amt = t.kind === 'giro' ? money(t.cents) : moneyS(t.kind === 'spesa' || (t.kind === 'inv' && t.dir !== 'sell') ? -t.cents : t.cents);
    var cls = t.kind === 'entrata' || (t.kind === 'rett' && t.cents > 0) ? 'pos' : t.kind === 'spesa' || t.kind === 'rett' ? 'neg' : '';
    pushLayer('sheet', 'tx', shHead(kindL) + '<div class="big ' + cls + '">' + amt + '</div><div>' +
      '<div class="kv"><span>' + (t.kind === 'giro' ? 'Da conto' : 'Conto') + '</span><span>' + esc(accName(t.accId)) + '</span></div>' +
      (t.toId ? '<div class="kv"><span>A conto</span><span>' + esc(accName(t.toId)) + '</span></div>' : '') +
      (c ? '<div class="kv"><span>Categoria</span><span>' + esc(c.icon + ' ' + c.name) + '</span></div>' : '') +
      (t.kind === 'inv' && posById(t.posId) ? '<div class="kv"><span>Investimento</span><span>' + esc(posById(t.posId).name) + '</span></div>' : '') + '<div class="kv"><span>Data</span><span>' + dayLabel(t.date) + (t.rule ? ' · ricorrente' : '') + '</span></div>' + (t.note ? '<div class="kv"><span>Nota</span><span>' + esc(t.note) + '</span></div>' : '') + '</div>' +
      (canEdit ? '' : '<p class="hint">Un conto è stato eliminato: il movimento si può solo eliminare.</p>') + '<div class="btns">' + (t.kind === 'inv' ? (posById(t.posId) ? '<button class="btn ghost" data-act="posopen" data-id="' + t.posId + '">Apri investimento</button>' : '') : t.kind !== 'rett' && canEdit ? '<button class="btn ghost" data-act="txedit" data-id="' + t.id + '">Modifica</button>' : '') + '<button class="btn danger" data-act="txdel" data-id="' + t.id + '">Elimina</button></div>');
  }

  function sheetAcc(id) {
    var a = acc(id), b = balance(id), sb = sub(a.sub);
    var rec = sortTx(S.tx.filter(function (t) { return inSet(t, new Set([id])); })).slice(0, 5);
    pushLayer('sheet', 'accd', shHead(a.name) + '<div style="display:flex;align-items:center;gap:12px"><span class="ico" style="--c:' + a.color + '">' + a.icon + '</span><div><div class="big ' + (b < 0 ? 'neg' : '') + '">' + money(b) + '</div><div class="sb">' + TYPES[a.type] + (sb ? ' · ' + esc(sb.name) : '') + '</div></div></div>' +
      '<div class="btns"><button class="btn ghost" data-act="accview" data-id="' + id + '">Mostra in Home</button><button class="btn ghost" data-act="accedit" data-id="' + id + '">Modifica conto</button></div>' +
      '<div class="btns"><button class="btn ghost" data-act="fixopen" data-id="' + id + '">Correggi saldo</button><button class="btn danger" data-act="delaccopen" data-id="' + id + '">Elimina conto…</button></div>' +
      (a.goal && goalOk(a.type) ? (function () { var x = goalInfo(a); return '<div class="card"><div class="kv" style="border:0;padding-top:0"><span>🎯 Obiettivo</span><span>' + money(x.target) + (a.goal.date ? ' entro ' + shortD(a.goal.date) + ' ' + parseD(a.goal.date).getFullYear() : '') + '</span></div>' + pbar(x.ratio, x.left <= 0 ? 'done' : x.late ? 'warn' : 'goal') + '<p class="sb" style="margin-top:6px">' + goalText(x) + '</p></div>'; })() : '') +
      '<div id="fixbox"></div><div class="sec"><div class="sech"><h2>Ultimi movimenti</h2>' + (rec.length ? '<button class="lnk" data-act="txlist" data-acc="' + id + '">Vedi tutti</button>' : '') + '</div>' + (rec.length ? '<div class="list">' + rec.map(function (t) { return txRow(t, new Set([id])); }).join('') + '</div>' : '<p class="empty">Nessun movimento.</p>') + '</div>');
  }
  function openFix(id) {
    var lay = layerOf('accd'); if (!lay) return;
    lay.el.querySelector('#fixbox').innerHTML = '<form data-form="fix" data-id="' + id + '" novalidate class="fld"><label for="fx">Saldo reale di oggi</label><input id="fx" inputmode="decimal" autocomplete="off" placeholder="0,00"><p class="hint">La differenza diventa una correzione, non una spesa.</p><p class="msg" id="fx-m" role="alert"></p><button class="btn" type="submit">Applica correzione</button></form>';
    lay.el.querySelector('#fx').focus();
  }
  function saveFix(id) {
    var lay = layerOf('accd'), m = lay.el.querySelector('#fx-m'), c = parseCents(lay.el.querySelector('#fx').value);
    if (c === null) { m.textContent = 'Importo non valido.'; m.className = 'msg bad'; return; }
    var delta = c - balance(id);
    if (delta === 0) { m.textContent = 'Il saldo coincide già.'; m.className = 'msg ok'; return; }
    var tx = { id: uid('t'), kind: 'rett', cents: delta, accId: id, date: TODAY, note: '', ts: Date.now() };
    S.tx.push(tx); closeAll();
    toast('Saldo corretto di ' + moneyS(delta), function () { S.tx = S.tx.filter(function (x) { return x.id !== tx.id; }); });
  }

  /* ================= form: conti ================= */
  function twoTap(el, key) {
    if (armed !== key) { armed = key; el.classList.add('armed'); el.textContent = 'Tocca ancora per confermare'; return false; }
    armed = null; return true;
  }
  function allowedTypes(a) {
    if (!a || accTxCount(a.id) === 0) return TYPE_ORDER.slice();
    return a.type === 'debito' ? ['debito'] : ['liquidita', 'risparmio', 'credito'];
  }
  function openAccForm(id) {
    var a = id ? acc(id) : null;
    var st = { id: id || null, type: a ? a.type : 'liquidita', sub: a ? (a.sub || '') : ((subsOf('liquidita')[0] || {}).id || ''), icon: a ? a.icon : ICONS[3], col: a ? a.color : COLORS[0], n: a ? accTxCount(id) : 0, goalOn: !!(a && a.goal) };
    var html = scrHead(a ? 'Modifica conto' : 'Nuovo conto', false) +
      '<div class="scrb pform"><button type="button" class="card prev pickico" id="af-prev" data-act="aicopen"></button>' +
      '<div class="fld"><label for="af-name">Nome</label><input id="af-name" maxlength="30" autocomplete="off" data-in="accname" placeholder="Es. Conto Revolut" value="' + esc(a ? a.name : '') + '"></div>' +
      '<div class="fld"><span class="lab">Tipo</span><div class="seg s4" role="radiogroup" aria-label="Tipo" id="af-types"></div></div>' +
      '<div class="fld"><label for="af-sub">Sottotipologia</label><select id="af-sub" data-chg="asub"></select></div>' +
      '<div class="fld"><div class="fgrid">' +
      fld('<span id="af-ol">Saldo iniziale</span>', '<input id="af-open" inputmode="decimal" autocomplete="off" data-in="accopen" placeholder="0,00" value="' + (a && a.opening !== 0 ? amtStr(Math.abs(a.opening)) : '') + '">', 'af-open') +
      fld('Data del saldo', '<input type="date" id="af-date" max="' + TODAY + '" value="' + (a ? a.openDate : TODAY) + '">', 'af-date') + '</div>' +
      (a ? '<p class="hint" id="af-eff"></p>' : '<p class="hint">Il saldo all’inizio di quel giorno: potrai registrare movimenti da quella data in poi.</p>') + '</div>' +
      '<button type="button" class="lnk" id="af-goaladd" data-act="agoal">+ Obiettivo di risparmio</button>' +
      '<div class="fld" id="af-goal"><span class="lab">Obiettivo di risparmio <span class="opt">facoltativo</span></span><div class="fgrid">' +
      fld('Importo', '<input id="af-gc" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (a && a.goal ? amtStr(a.goal.cents) : '') + '">', 'af-gc') +
      fld('Entro il', '<input type="date" id="af-gd" min="' + TODAY + '" value="' + (a && a.goal ? a.goal.date || '' : '') + '">', 'af-gd') + '</div></div></div>' +
      '<div class="scrf"><p class="msg" id="af-msg" role="alert"></p>' + (a ? '<div class="btnrow"><button class="btn danger" data-act="delaccopen" data-id="' + a.id + '">Elimina…</button><button class="btn" data-act="saveacc">Salva</button></div>' : '<button class="btn" data-act="saveacc">Crea conto</button>') + '</div>';
    pushLayer('screen', 'acc', html, st, { refresh: syncAcc });
    syncAcc();
  }
  function syncAcc() {
    var lay = layerOf('acc'); if (!lay) return;
    var st = lay.st, el = lay.el, a = st.id ? acc(st.id) : null, al = allowedTypes(a);
    var nm = el.querySelector('#af-name').value.trim(), sb = sub(st.sub);
    el.querySelector('#af-prev').innerHTML = '<span class="ico" style="--c:' + st.col + '">' + st.icon + '</span><span class="mid"><span class="nm">' + esc(nm || 'Nome del conto') + '</span><span class="sb">' + TYPES[st.type] + (sb ? ' · ' + esc(sb.name) : '') + '</span></span><span class="chg">Icona ›</span>';
    el.querySelector('#af-types').innerHTML = TYPE_ORDER.map(function (t) { return '<button type="button" role="radio" aria-checked="' + (st.type === t) + '" class="' + (st.type === t ? 'on' : '') + '" data-act="atype" data-t="' + t + '"' + (al.indexOf(t) < 0 ? ' disabled' : '') + '>' + TYPES[t] + '</button>'; }).join('');
    el.querySelector('#af-sub').innerHTML = '<option value="">Nessuna</option>' + subsOf(st.type).map(function (s) { return '<option value="' + s.id + '"' + (st.sub === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '<option value="+">+ Nuova sottotipologia…</option>';
    el.querySelector('#af-sub').value = st.sub;
    icoMark();
    var ol = el.querySelector('#af-ol'); if (ol) ol.textContent = st.type === 'debito' ? 'Importo del debito' : 'Saldo iniziale';
    el.querySelector('#af-goal').hidden = !goalOk(st.type) || !st.goalOn;
    el.querySelector('#af-goaladd').hidden = !goalOk(st.type) || st.goalOn;
    var ef = el.querySelector('#af-eff');
    if (ef && a) {
      var raw = el.querySelector('#af-open').value.trim(), c = raw === '' ? 0 : parseCents(raw);
      if (c === null || (st.type !== 'debito' && c < 0)) ef.textContent = 'Importo non valido.';
      else { var no = st.type === 'debito' ? -Math.abs(c) : c; ef.textContent = 'Saldo attuale ' + money(balance(a.id)) + ' → ' + money(balance(a.id) - a.opening + no) + ' (cambia lo storico; per allinearti usa «Correggi saldo»)'; }
    }
  }
  function saveAcc() {
    var lay = layerOf('acc'); if (!lay) return;
    var st = lay.st, el = lay.el, m = el.querySelector('#af-msg'), name = el.querySelector('#af-name').value.trim();
    function err(t) { m.textContent = t; m.className = 'msg bad'; }
    if (!name) return err('Inserisci un nome.');
    if (S.accounts.some(function (x) { return x.id !== st.id && x.name.toLowerCase() === name.toLowerCase(); })) return err('Esiste già un conto con questo nome.');
    var od = el.querySelector('#af-date').value || TODAY;
    if (!dRange(od) || od > TODAY) return err('Data del saldo non valida.');
    var goal = null, gRaw = el.querySelector('#af-gc').value.trim(), gDate = el.querySelector('#af-gd').value || '';
    if (goalOk(st.type) && gRaw) {
      var gc = parseCents(gRaw); if (gc === null || gc <= 0) return err('Importo dell’obiettivo non valido.');
      if (gDate && !dRange(gDate)) return err('Data dell’obiettivo non valida.');
      goal = { cents: gc, date: gDate };
    }
    if (st.id) {
      // la data non può essere dopo il primo movimento del conto (quei movimenti resterebbero «prima dell'apertura»)
      var first = ''; S.tx.forEach(function (t) { if ((t.accId === st.id || t.toId === st.id) && (!first || t.date < first)) first = t.date; });
      if (first && od > first) return err('C’è un movimento del ' + dayLabel(first) + ': la data del saldo deve essere uguale o precedente.');
    }
    if (st.id) {
      var a = acc(st.id);
      var raw0 = el.querySelector('#af-open').value.trim(), c0 = raw0 === '' ? 0 : parseCents(raw0);
      if (c0 === null) return err('Saldo non valido.');
      if (st.type === 'debito') c0 = -Math.abs(c0); else if (c0 < 0) return err('Saldo negativo solo per i debiti.');
      a.opening = c0;
      a.name = name; a.type = st.type; a.sub = st.sub; a.icon = st.icon; a.color = st.col; a.openDate = od;
      if (goal) a.goal = goal; else delete a.goal;
      popLayer(); toast('Conto aggiornato');
    } else {
      var raw = el.querySelector('#af-open').value.trim(), c = raw === '' ? 0 : parseCents(raw);
      if (c === null) return err('Saldo non valido.');
      if (st.type === 'debito') c = -Math.abs(c); else if (c < 0) return err('Saldo negativo solo per i debiti.');
      S.accounts.push({ id: uid('a'), name: name, type: st.type, sub: st.sub, icon: st.icon, color: st.col, opening: c, openDate: od }); if (goal) S.accounts[S.accounts.length - 1].goal = goal;
      popLayer(); toast('Conto creato: ' + name);
    }
  }
  /* ================= form generico a un solo nome (sottotipologie) ================= */
  function openNameForm(o) {
    var html = scrHead(o.title, true) + '<div class="scrb"><div class="fld"><label for="nf-name">' + esc(o.label) + '</label><input id="nf-name" maxlength="28" autocomplete="off" value="' + esc(o.value || '') + '"></div></div>' +
      '<div class="scrf"><p class="msg" id="nf-msg" role="alert"></p><button class="btn" data-act="savename">Salva</button>' + (o.del ? '<button class="btn danger" data-act="delname">' + esc(o.del.label) + '</button>' : '') + '</div>';
    pushLayer('screen', 'name', html, { o: o });
  }
  function saveName() {
    var lay = layerOf('name'); if (!lay) return;
    var v = lay.el.querySelector('#nf-name').value.trim(), m = lay.el.querySelector('#nf-msg');
    if (!v) { m.textContent = 'Inserisci un nome.'; m.className = 'msg bad'; return; }
    var e = lay.st.o.save(v);
    if (e) { m.textContent = e; m.className = 'msg bad'; return; }
    popLayer();
  }
  function delName(el) {
    var lay = layerOf('name'); if (!lay) return; var d = lay.st.o.del, m = lay.el.querySelector('#nf-msg');
    if (d.blocked) { m.textContent = d.blocked; m.className = 'msg bad'; return; }
    if (!twoTap(el, 'name')) return;
    d.run(); popLayer();
  }
  function newSubForm(type, fromAcc) {
    openNameForm({
      title: 'Nuova sottotipologia', label: 'Nome (' + TYPES[type] + ')',
      save: function (name) {
        if (subsOf(type).some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); })) return 'Esiste già una sottotipologia con questo nome.';
        var s = { id: uid('s'), type: type, name: name }; S.subs.push(s);
        var al = layerOf('acc'); if (fromAcc && al) al.st.sub = s.id;
        return null;
      }
    });
  }
  function editSubForm(id) {
    var s = sub(id); if (!s) return;
    var n = S.accounts.filter(function (a) { return a.sub === id; }).length;
    openNameForm({
      title: 'Modifica sottotipologia', label: 'Nome (' + TYPES[s.type] + ')', value: s.name,
      save: function (name) {
        if (subsOf(s.type).some(function (x) { return x.id !== id && x.name.toLowerCase() === name.toLowerCase(); })) return 'Esiste già una sottotipologia con questo nome.';
        s.name = name; return null;
      },
      del: { label: 'Elimina sottotipologia', blocked: n ? 'Ci sono ' + n + ' conti: spostali prima.' : '', run: function () { S.subs = S.subs.filter(function (x) { return x.id !== id; }); } }
    });
  }

  /* ================= categorie ================= */
  function openCatForm(o) {
    var c = o.id ? cat(o.id) : null, kind = c ? c.kind : o.kind;
    var st = { id: o.id || null, kind: kind, icon: c ? c.icon : ICONS[19], fromAdd: !!o.fromAdd, n: c ? S.tx.filter(function (t) { return t.catId === c.id; }).length + S.rules.filter(function (r) { return r.catId === c.id; }).length : 0 };
    var html = scrHead(c ? 'Modifica categoria' : (kind === 'spesa' ? 'Nuova categoria di spesa' : 'Nuova categoria di entrata'), !!o.back) +
      '<div class="scrb pform"><button type="button" class="card prev pickico" id="cf-prev" data-act="cicopen"></button>' +
      '<div class="fld"><label for="cf-name">Nome</label><input id="cf-name" maxlength="24" autocomplete="off" data-in="catname" placeholder="Es. Palestra" value="' + esc(c ? c.name : '') + '"></div>' +
      (kind === 'spesa' ? '<div class="fld"><label for="cf-bud">Budget mensile <span class="opt">facoltativo</span></label><input id="cf-bud" inputmode="decimal" autocomplete="off" placeholder="Nessun limite" value="' + (c && c.budget > 0 ? amtStr(c.budget) : '') + '"></div>' : '') +
      '</div>' +
      '<div class="scrf"><p class="msg" id="cf-msg" role="alert"></p><button class="btn" data-act="savecat">Salva</button>' +
      (c ? '<button class="btn danger" data-act="delcat">Elimina categoria</button>' : '') + '</div>';
    pushLayer('screen', 'cat', html, st, { refresh: syncCat });
    syncCat();
  }
  function syncCat() {
    var lay = layerOf('cat'); if (!lay) return;
    var st = lay.st, el = lay.el, nm = el.querySelector('#cf-name').value.trim();
    el.querySelector('#cf-prev').innerHTML = '<span class="ico">' + st.icon + '</span><span class="mid"><span class="nm">' + esc(nm || 'Nome della categoria') + '</span><span class="sb">' + (st.kind === 'spesa' ? 'Spesa' : 'Entrata') + (st.n ? ' · ' + st.n + ' movimenti' : '') + '</span></span><span class="chg">Icona ›</span>';
    icoMark();
  }
  function saveCat() {
    var lay = layerOf('cat'); if (!lay) return;
    var st = lay.st, el = lay.el, m = el.querySelector('#cf-msg'), name = el.querySelector('#cf-name').value.trim();
    function err(t) { m.textContent = t; m.className = 'msg bad'; }
    if (!name) return err('Inserisci un nome.');
    if (S.cats.some(function (c) { return c.kind === st.kind && c.id !== st.id && c.name.toLowerCase() === name.toLowerCase(); })) return err('Esiste già una categoria con questo nome.');
    var bi = el.querySelector('#cf-bud'), bud = 0;
    if (bi && bi.value.trim()) { bud = parseCents(bi.value.trim()); if (bud === null || bud <= 0) return err('Budget non valido.'); }
    if (st.id) { var c = cat(st.id); c.name = name; c.icon = st.icon; if (bud) c.budget = bud; else delete c.budget; popLayer(); toast('Categoria aggiornata'); return; }
    var n = { id: uid('c'), kind: st.kind, name: name, icon: st.icon }; if (bud) n.budget = bud; S.cats.push(n);
    var al = layerOf('add'); if (st.fromAdd && al) al.st.catId = n.id;
    popLayer(); toast('Categoria creata: ' + name);
  }
  function delCat(el) {
    var lay = layerOf('cat'); if (!lay) return; var st = lay.st, m = lay.el.querySelector('#cf-msg');
    if (st.n > 0) { m.textContent = 'Usata da ' + st.n + ' movimenti: non si può eliminare.'; m.className = 'msg bad'; return; }
    if (!twoTap(el, 'cat' + st.id)) return;
    S.cats = S.cats.filter(function (c) { return c.id !== st.id; }); popLayer(); toast('Categoria eliminata');
  }

  function manageCatsHtml(kind) {
    var list = S.cats.filter(function (c) { return c.kind === kind; });
    return scrHead(kind === 'spesa' ? 'Categorie di spesa' : 'Categorie di entrata', true) +
      '<div class="scrb">' + (list.length ? '<div class="list">' + list.map(function (c) {
        var n = S.tx.filter(function (t) { return t.catId === c.id; }).length;
        return '<button class="row" data-act="editcat" data-id="' + c.id + '"><span class="ico">' + c.icon + '</span><span class="mid"><span class="nm">' + esc(c.name) + '</span><span class="sb">' + n + ' movimenti</span></span><span class="v">' + svg('right') + '</span></button>';
      }).join('') + '</div>' : '<p class="empty">Nessuna categoria.</p>') + '</div>' +
      '<div class="scrf"><button class="btn" data-act="newcatm" data-k="' + kind + '">Nuova categoria</button></div>';
  }
  function openManageCats(kind) {
    var lay = pushLayer('screen', 'manage', manageCatsHtml(kind), { kind: kind });
    lay.refresh = function () { lay.el.querySelector('.scr').innerHTML = manageCatsHtml(kind); };
  }
  function manageSubsHtml() {
    return scrHead('Sottotipologie di conto', true) + '<div class="scrb">' + TYPE_ORDER.map(function (t) {
      return '<section class="grp"><h2>' + TYPES[t] + '</h2><div class="list">' + subsOf(t).map(function (s) {
        var n = S.accounts.filter(function (a) { return a.sub === s.id; }).length;
        return '<button class="row" data-act="editsub" data-id="' + s.id + '"><span class="ico">' + TYPE_ICON[t] + '</span><span class="mid"><span class="nm">' + esc(s.name) + '</span><span class="sb">' + n + ' conti</span></span><span class="v">' + svg('right') + '</span></button>';
      }).join('') + '<button class="pick addnew" data-act="newsubm" data-t="' + t + '"><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Aggiungi a ' + TYPES[t] + '</span></span></button></div></section>';
    }).join('') + '</div>';
  }
  function openManageSubs() {
    var lay = pushLayer('screen', 'manage', manageSubsHtml(), {});
    lay.refresh = function () { lay.el.querySelector('.scr').innerHTML = manageSubsHtml(); };
  }

  /* ================= investimenti ================= */
  function parseQty(raw) {
    var s = String(raw).trim().replace(',', '.');
    if (!/^\d{1,7}(\.\d{1,8})?$/.test(s)) return null;
    var p = s.split('.'); return parseInt(p[0], 10) * 100000000 + parseInt(((p[1] || '') + '00000000').slice(0, 8), 10);
  }

  /* ================= fogli dell'analisi ================= */
  function sheetAnAcc() {
    var sel = S.an.accIds ? new Set(S.an.accIds) : new Set(S.accounts.map(function (a) { return a.id; }));
    pushLayer('sheet', 'anacc', shHead('Conti da analizzare') + '<form data-form="anacc"><div>' + S.accounts.map(function (a) {
      return '<label class="sw"><span>' + a.icon + ' ' + esc(a.name) + '</span><input type="checkbox" name="ac" value="' + a.id + '"' + (sel.has(a.id) ? ' checked' : '') + '></label>';
    }).join('') + '</div><p class="msg" id="aa-m" role="alert"></p><button class="btn" type="submit">Applica</button></form>');
  }
  function sheetAnPers() {
    var b = S.an.blocks, LB = [['time', 'Andamento nel tempo'], ['cat', 'Per categoria'], ['acc', 'Per conto'], ['list', 'Elenco dei movimenti']];
    pushLayer('sheet', 'anpers', shHead('Cosa vuoi vedere') + '<div>' + LB.map(function (x) { return '<label class="sw"><span>' + x[1] + '</span><input type="checkbox" data-chg="block" data-b="' + x[0] + '"' + (b[x[0]] ? ' checked' : '') + '></label>'; }).join('') + '</div><button class="btn" data-act="close">Fatto</button>');
  }

  /* ================= istantanea completa (per l'annulla delle operazioni grandi) ================= */
  function snapAll() { return JSON.parse(JSON.stringify({ accounts: S.accounts, gone: S.gone, tx: S.tx, pos: S.pos, rules: S.rules, accIds: S.an.accIds, home: S.homeView, last: S.lastAcc })); }
  function restoreAll(z) { S.accounts = z.accounts; S.gone = z.gone; S.tx = z.tx; S.pos = z.pos; S.rules = z.rules; S.an.accIds = z.accIds; S.homeView = z.home; S.lastAcc = z.last; }

  /* ================= eliminazione conto: tenere o cancellare i movimenti ================= */
  function posValueWithout(p, lotIds) {
    var q = 0; p.lots.forEach(function (l) { if (l.d <= TODAY && !lotIds[l.id]) q += l.qty; });
    return q > 0 ? valCents(q, pxAt(p, TODAY)) : 0;
  }
  function delPlan(id, mode) {
    var a = acc(id), mine = S.tx.filter(function (t) { return t.accId === id || t.toId === id; });
    var rest = mode === 'purge' ? S.tx.filter(function (t) { return t.accId !== id && t.toId !== id; }) : S.tx;
    var lotIds = {}, blocked = '';
    if (mode === 'purge') {
      mine.forEach(function (t) { if (t.kind === 'inv' && t.lotId) lotIds[t.lotId] = 1; });
      S.pos.forEach(function (p) { if (!lotsOk(p.lots.filter(function (l) { return !lotIds[l.id]; }))) blocked = 'Una vendita di «' + p.name + '» dipende da acquisti di questo conto.'; });
    }
    var after = 0, ch = [];
    S.accounts.forEach(function (x) {
      if (x.id === id) return;
      var nb = balWith(x, rest), ob = balance(x.id); after += nb;
      if (nb !== ob) ch.push({ a: x, from: ob, to: nb });
    });
    S.pos.forEach(function (p) { after += posValueWithout(p, lotIds); });
    var n = { spesa: 0, entrata: 0, giro: 0, rett: 0, inv: 0, giroAlt: 0 };
    mine.forEach(function (t) { n[t.kind] += 1; if (t.kind === 'giro' && acc(t.accId === id ? t.toId : t.accId)) n.giroAlt += 1; });
    var rl = S.rules.filter(function (r) { return r.accId === id || r.toId === id; });
    return { a: a, mine: mine, n: n, before: netWorth(), after: after, ch: ch, bal: balance(id), rules: rl.length, blocked: blocked, lotIds: lotIds };
  }
  function openDelAcc(id) {
    var a = acc(id); if (!a) return;
    var html = scrHead('Elimina conto', true) + '<div class="scrb"><div class="card prev"><span class="ico" style="--c:' + a.color + '">' + a.icon + '</span><span class="mid"><span class="nm">' + esc(a.name) + '</span><span class="sb" id="dl-sub"></span></span></div>' +
      '<div class="fld"><span class="lab">Movimenti</span><div class="optl" id="dl-opts"></div></div>' +
      '<div class="card" id="dl-imp"></div></div>' +
      '<div class="scrf"><p class="msg" id="dl-msg" role="alert"></p><button class="btn danger" id="dl-go" data-act="delaccgo"></button></div>';
    pushLayer('screen', 'delacc', html, { id: id, mode: 'keep' }, { refresh: syncDel });
    syncDel();
  }
  function syncDel() {
    var lay = layerOf('delacc'); if (!lay) return;
    var st = lay.st, el = lay.el, p = delPlan(st.id, st.mode), nm = p.mine.length;
    el.querySelector('#dl-sub').textContent = 'Saldo ' + money(p.bal) + ' · ' + nm + (nm === 1 ? ' movimento' : ' movimenti');
    el.querySelector('#dl-opts').innerHTML =
      '<button type="button" class="optb ' + (st.mode === 'keep' ? 'on' : '') + '" data-act="delmode" data-m="keep" role="radio" aria-checked="' + (st.mode === 'keep') + '"><b>Tienili</b><span>Restano nello storico. Il saldo esce dal patrimonio.</span></button>' +
      '<button type="button" class="optb ' + (st.mode === 'purge' ? 'on' : '') + '" data-act="delmode" data-m="purge" role="radio" aria-checked="' + (st.mode === 'purge') + '"><b>Eliminali</b><span>Giroconti e acquisti inclusi: gli altri saldi cambiano.</span></button>';
    var h = '<div class="kv"><span>Patrimonio</span><span>' + money(p.before) + ' → <b>' + money(p.after) + '</b></span></div>' +
      '<div class="kv"><span>Variazione</span><span class="' + (p.after - p.before >= 0 ? 'pos' : 'neg') + '">' + moneyS(p.after - p.before) + '</span></div>';
    if (p.ch.length) h += '<h2 style="margin:12px 0 2px">Altri conti</h2>' + p.ch.map(function (c) { return '<div class="kv"><span>' + esc(c.a.name) + '</span><span>' + money(c.from) + ' → ' + money(c.to) + '</span></div>'; }).join('');
    if (nm) {
      var parts = []; if (p.n.spesa) parts.push(p.n.spesa + ' spese'); if (p.n.entrata) parts.push(p.n.entrata + ' entrate'); if (p.n.giro) parts.push(p.n.giro + ' giroconti'); if (p.n.inv) parts.push(p.n.inv + ' acquisti'); if (p.n.rett) parts.push(p.n.rett + ' correzioni');
      h += '<p class="hint" style="margin-top:10px">' + (st.mode === 'purge' ? 'Eliminati: ' : 'Restano: ') + parts.join(', ') + '.</p>';
    }
    if (p.rules) h += '<p class="hint" style="margin-top:6px">' + p.rules + (p.rules === 1 ? ' ricorrenza collegata verrà eliminata.' : ' ricorrenze collegate verranno eliminate.') + '</p>';
    if (p.bal !== 0) h += '<p class="hint" style="margin-top:6px">Se il conto è chiuso, azzera prima il saldo con un giroconto.</p>';
    el.querySelector('#dl-imp').innerHTML = h;
    var go = el.querySelector('#dl-go'); go.classList.remove('armed'); go.disabled = !!p.blocked;
    el.querySelector('#dl-msg').textContent = p.blocked; el.querySelector('#dl-msg').className = 'msg' + (p.blocked ? ' bad' : '');
    go.textContent = st.mode === 'purge' ? 'Elimina conto e ' + nm + ' movimenti' : 'Elimina conto';
    armed = null;
  }
  function delAccRun(el) {
    var lay = layerOf('delacc'); if (!lay) return;
    var id = lay.st.id, mode = lay.st.mode, p = delPlan(id, mode); if (p.blocked) return;
    if (!twoTap(el, 'delacc' + id)) return;
    var a = p.a, snap = snapAll();
    if (p.mine && p.mine.length) snapCapture('pre', 'Prima di eliminare il conto «' + String(a.name).slice(0, 30) + '»');
    S.accounts = S.accounts.filter(function (x) { return x.id !== id; });
    if (mode === 'keep') { if (p.mine.length) S.gone.push({ id: id, name: a.name, icon: a.icon, color: a.color, type: a.type }); }
    else {
      S.tx = S.tx.filter(function (t) { return t.accId !== id && t.toId !== id; });
      S.pos.forEach(function (x) { x.lots = x.lots.filter(function (l) { return !p.lotIds[l.id]; }); });
    }
    S.rules = S.rules.filter(function (r) { return r.accId !== id && r.toId !== id; });
    if (S.an.accIds) { S.an.accIds = S.an.accIds.filter(function (x) { return x !== id; }); if (!S.an.accIds.length) S.an.accIds = null; }
    if (S.homeView === 'acc:' + id) S.homeView = 'all';
    if (S.lastAcc === id) S.lastAcc = null;
    closeAll();
    toast(mode === 'purge' ? 'Conto e ' + p.mine.length + ' movimenti eliminati' : 'Conto eliminato', function () { restoreAll(snap); });
  }

  /* ================= andamento: patrimonio, investimenti, singolo prodotto (schermata fissa) ================= */
  var NW_P = [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['1a', '1A'], ['all', 'Tutto'], ['custom', 'Date']];
  var NW_D = { '1m': 30, '3m': 90, '6m': 182, '1a': 365 };
  var NWG = { W: 340, H: 188, PL: 6, PR: 334, PT: 18, PB: 158 };
  function fullD(s) { var d = parseD(s); return d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + d.getFullYear(); }
  function axD(s, yr) { var d = parseD(s); return yr ? MESI[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2) : d.getDate() + ' ' + MESI[d.getMonth()]; }
  function axM(c) {
    if (S.hide) return '••';
    var v = c / 100, a = Math.abs(v), s;
    if (a >= 1e6) s = (a / 1e6).toFixed(1).replace('.', ',') + ' M'; else if (a >= 1e5) s = Math.round(a / 1e3) + ' k'; else if (a >= 1e3) s = (a / 1e3).toFixed(1).replace('.', ',') + ' k'; else s = String(Math.round(a));
    return (v < 0 ? '−' : '') + s;
  }
  // Variazione percentuale: non definita se il valore di partenza è zero o negativo.
  function chgPct(start, end) { return start > 0 ? (end - start) / start : null; }
  function pctS(p) {
    if (p === null || p === undefined) return 'n.d.';
    if (Math.abs(p) >= 10) return (p > 0 ? '+' : '−') + '>999%';
    var s = (Math.abs(p) * 100).toFixed(1).replace('.', ',');
    return (Math.round(Math.abs(p) * 1000) === 0 ? '' : p > 0 ? '+' : '−') + s + '%';
  }
  function isInvScope(sc) { return sc === 'inv' || sc.indexOf('pos:') === 0; }
  function nwRange(st) {
    var first = firstDate(st.scope), from, to = TODAY;
    if (st.preset === 'custom') { from = st.from; to = st.to; }
    else if (st.preset === 'all') from = first;
    else from = addDays(TODAY, -NW_D[st.preset]);
    var clamped = false;
    if (from < first) { from = first; clamped = true; }
    return { from: from, to: to, first: first, clamped: clamped };
  }
  function nwOpen(scope) {
    var sc = scope || S.homeView, st = { scope: sc, preset: isInvScope(sc) ? 'all' : '3m', from: addDays(TODAY, -30), to: TODAY, inv: true, sel: -1 };
    var lay = pushLayer('screen', 'nw', scrHead(isInvScope(sc) ? 'Investimento' : 'Andamento', false) + '<div class="scrb nwb" id="nw-body"></div>', st, { refresh: nwDraw });
    lay.el.classList.add('fixed');
    nwDraw();
  }
  function nwDraw() {
    var lay = layerOf('nw'); if (!lay) return;
    var st = lay.st, r = nwRange(st), full = r.from <= r.to ? nwSeries(st.scope, r.from, r.to, st.inv) : [], pts = full;
    if (st.scope.indexOf('pos:') === 0 && !posById(st.scope.slice(4))) { popLayer(); return; }
    if (full.length > 240) {
      var step = Math.ceil(full.length / 240); pts = full.filter(function (q, i) { return i % step === 0 || i === full.length - 1; });
    }
    lay.data = { r: r, full: full, pts: pts };
    st.sel = -1;
    lay.el.querySelector('#nw-body').innerHTML = nwHtml(st, lay.data);
    nwHead(-1);
  }
  function nwXY(pts, i, lo, hi) {
    var G = NWG, n = pts.length;
    return [G.PL + (n > 1 ? i * (G.PR - G.PL) / (n - 1) : 0), G.PB - (pts[i].v - lo) / (hi - lo) * (G.PB - G.PT)];
  }
  function cell(k, n, s) { return '<div class="cell"><span class="k">' + k + '</span><span class="n">' + n + '</span><span class="s">' + (s || '&nbsp;') + '</span></div>'; }
  function invFlows(ids) {
    var f = [], v = 0; ids.map(posById).filter(Boolean).forEach(function (p) { f = f.concat(posCalc(p).flows); v += posValue(p); });
    return xirr(f, TODAY, v);
  }
  function nwCells(st, D) {
    var full = D.full, e = full[full.length - 1], s0 = full[0], h = '';
    if (isInvScope(st.scope)) {
      var ids = invIds(st.scope), p = st.scope.indexOf('pos:') === 0 ? posById(st.scope.slice(4)) : null, per;
      if (p) { var p0 = pxAt(p, s0.d), p1 = pxAt(p, e.d); per = p0 > 0 ? p1 / p0 - 1 : null; }
      h += cell('Investito', money(e.i), 'versato');
      if (p) h += cell('Prezzo', pxStr(pxAt(p, TODAY)), p.prices.length ? axD(p.prices[p.prices.length - 1].d, true) : '');
      else h += cell('Valore', money(e.v), 'oggi');
      h += cell('Annuo', xirrStr(invFlows(ids)), 'rendimento');
      h += cell('Nel periodo', p ? pctS(per) : moneyS((e.v - e.c) - (s0.v - s0.c)), p ? 'variazione prezzo' : 'variazione utile');
      return h;
    }
    var imn = 0, imx = 0; full.forEach(function (q, i) { if (q.v < full[imn].v) imn = i; if (q.v > full[imx].v) imx = i; });
    return cell('Inizio', money(s0.v), shortD(s0.d)) + cell('Fine', money(e.v), shortD(e.d)) + cell('Minimo', money(full[imn].v), shortD(full[imn].d)) + cell('Massimo', money(full[imx].v), shortD(full[imx].d));
  }
  function nwHtml(st, D) {
    var G = NWG, full = D.full, pts = D.pts, r = D.r, h = '';
    var isInv = isInvScope(st.scope), pos1 = st.scope.indexOf('pos:') === 0 ? posById(st.scope.slice(4)) : null;
    h += '<div class="nwh"><div class="nwl1">' + esc(scopeLabel(st.scope)) + (pos1 ? ' · ' + esc(posTag(pos1)) : '') + '</div><div class="nwv" id="nw-val"></div><div class="nwc2" id="nw-chg"></div><div class="nwd2" id="nw-dt"></div></div>';
    if (full.length < 2) {
      h += '<div class="card nwcard"><p class="empty" style="padding:30px 8px;text-align:center">' + (full.length ? 'Servono almeno 2 giorni di dati.' : 'Nessun dato in questo intervallo.') + '</p></div>';
    } else {
      var mn = Infinity, mx = -Infinity; full.forEach(function (q) { if (q.v < mn) mn = q.v; if (q.v > mx) mx = q.v; });
      var lo = mn, hi = mx; if (hi === lo) { lo -= 50; hi += 50; } else { var pad = (hi - lo) * 0.08; lo -= pad; hi += pad; }
      var P = pts.map(function (q, i) { return nwXY(pts, i, lo, hi); });
      var line = P.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join('');
      var last = P[P.length - 1], up = isInv ? (full[full.length - 1].v - full[full.length - 1].c) >= (full[0].v - full[0].c) : full[full.length - 1].v >= full[0].v;
      var yr = (dn(r.to) - dn(r.from)) > 330;
      var g = '';
      [mx, (mx + mn) / 2, mn].forEach(function (v) {
        var y = G.PB - (v - lo) / (hi - lo) * (G.PB - G.PT);
        g += '<line class="ax" x1="' + G.PL + '" y1="' + y.toFixed(1) + '" x2="' + G.PR + '" y2="' + y.toFixed(1) + '"/><text class="axl" x="' + G.PL + '" y="' + (y - 4).toFixed(1) + '">' + axM(Math.round(v)) + '</text>';
      });
      if (mn < 0 && mx > 0) { var y0 = G.PB - (0 - lo) / (hi - lo) * (G.PB - G.PT); g += '<line class="zero" x1="' + G.PL + '" y1="' + y0.toFixed(1) + '" x2="' + G.PR + '" y2="' + y0.toFixed(1) + '"/>'; }
      var mid = full[Math.floor((full.length - 1) / 2)].d;
      g += '<text class="tx" x="' + G.PL + '" y="' + (G.H - 6) + '" text-anchor="start">' + axD(r.from, yr) + '</text><text class="tx" x="' + ((G.PL + G.PR) / 2) + '" y="' + (G.H - 6) + '" text-anchor="middle">' + axD(mid, yr) + '</text><text class="tx" x="' + G.PR + '" y="' + (G.H - 6) + '" text-anchor="end">' + axD(r.to, yr) + '</text>';
      g += '<path class="nwa" d="' + line + 'L' + last[0].toFixed(1) + ' ' + G.PB + 'L' + P[0][0].toFixed(1) + ' ' + G.PB + 'Z"/><path class="nwl" d="' + line + '"/>';
      g += '<circle class="nwd" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="4"/>';
      g += '<g id="nw-cur" hidden><line class="nwc" id="nw-cl" x1="0" x2="0" y1="' + G.PT + '" y2="' + G.PB + '"/><circle class="nwd" id="nw-cd" cx="0" cy="0" r="5"/></g>';
      D.lo = lo; D.hi = hi;
      h += '<div class="card nwcard ' + (up ? 'up' : 'dn') + (st.preset === 'custom' ? ' cu' : '') + '"><svg id="nw-svg" class="nwsvg" viewBox="0 0 ' + G.W + ' ' + G.H + '" role="img" aria-label="Andamento nel periodo">' + g + '</svg></div>';
    }
    h += '<div class="chips fit" role="tablist">' + NW_P.map(function (p) { return '<button class="chip ' + (st.preset === p[0] ? 'on' : '') + '" data-act="nwper" data-p="' + p[0] + '" role="tab" aria-selected="' + (st.preset === p[0]) + '">' + p[1] + '</button>'; }).join('') + '</div>';
    if (st.preset === 'custom') h += '<div class="dates"><div class="fld"><label for="nw-from">Dal</label><input type="date" id="nw-from" data-chg="nwrange" max="' + TODAY + '" value="' + st.from + '"></div><div class="fld"><label for="nw-to">Al</label><input type="date" id="nw-to" data-chg="nwrange" max="' + TODAY + '" value="' + st.to + '"></div></div>';
    if (full.length >= 2) h += '<div class="cells">' + nwCells(st, D) + '</div>';
    var foot = '';
    if (r.clamped && r.from <= r.to) foot = 'Dati dal ' + fullD(r.first) + '.';
    if (foot) h += '<p class="hint nwf">' + foot + '</p>';
    if (st.scope === 'all' && S.pos.length) h += '<button class="chip tog ' + (st.inv ? 'on' : '') + '" data-act="nwinv" aria-pressed="' + st.inv + '">' + (st.inv ? '✓ ' : '') + 'Con investimenti</button>';
    if (pos1) h += '<div class="btns four"><button class="btn ghost" data-act="lotnew" data-id="' + pos1.id + '" data-dir="buy">Acquisto</button><button class="btn ghost" data-act="lotnew" data-id="' + pos1.id + '" data-dir="sell">Vendita</button><button class="btn ghost" data-act="pricenew" data-id="' + pos1.id + '">Valore</button><button class="btn ghost" data-act="poslist" data-id="' + pos1.id + '">Altro</button></div>';
    return h;
  }
  // Testata: valore, variazione e data del punto scelto (i = -1: fine periodo). Le altezze sono fisse: il layout non si sposta.
  function nwHead(i) {
    var lay = layerOf('nw'); if (!lay || !lay.data) return;
    var D = lay.data, g = function (s) { return lay.el.querySelector(s); }, full = D.full, st = lay.st;
    if (!g('#nw-val')) return;
    if (!full.length) { g('#nw-val').textContent = '—'; g('#nw-chg').innerHTML = '&nbsp;'; g('#nw-dt').innerHTML = '&nbsp;'; return; }
    var pts = D.pts, sel = i >= 0 && !!pts[i], q = sel ? pts[i] : full[full.length - 1], start = full[0];
    g('#nw-val').textContent = money(q.v);
    if (isInvScope(st.scope)) {
      var gain = q.v - q.c, p = q.i > 0 ? gain / q.i : null;
      g('#nw-chg').innerHTML = '<b class="' + (gain > 0 ? 'pos' : gain < 0 ? 'neg' : '') + '">' + moneyS(gain) + ' · ' + pctS(p) + '</b>';
      g('#nw-dt').textContent = (sel ? fullD(q.d) : 'Oggi') + ' · investiti ' + money(q.i);
    } else {
      var d = q.v - start.v, p2 = chgPct(start.v, q.v);
      g('#nw-chg').innerHTML = '<b class="' + (d > 0 ? 'pos' : d < 0 ? 'neg' : '') + '">' + moneyS(d) + ' · ' + pctS(p2) + '</b>';
      g('#nw-dt').textContent = (sel ? fullD(q.d) : 'Oggi') + ' · da ' + shortD(start.d);
    }
    var cur = g('#nw-cur');
    if (cur) {
      if (sel) {
        var xy = nwXY(pts, i, D.lo, D.hi);
        g('#nw-cl').setAttribute('x1', xy[0].toFixed(1)); g('#nw-cl').setAttribute('x2', xy[0].toFixed(1));
        g('#nw-cd').setAttribute('cx', xy[0].toFixed(1)); g('#nw-cd').setAttribute('cy', xy[1].toFixed(1));
        cur.removeAttribute('hidden');
      } else cur.setAttribute('hidden', '');
    }
    st.sel = sel ? i : -1;
  }
  function nwPointer(e) {
    var lay = layerOf('nw'), sv = document.getElementById('nw-svg');
    if (!lay || !lay.data || !sv || !lay.data.pts.length) return;
    var r = sv.getBoundingClientRect(), n = lay.data.pts.length, G = NWG;
    var x = (e.clientX - r.left) / r.width * G.W, i = Math.round((x - G.PL) / (G.PR - G.PL) * (n - 1));
    nwHead(Math.max(0, Math.min(n - 1, i)));
  }

  /* ================= investimenti: nuovo prodotto, acquisti, vendite, prezzi ================= */
  function parsePx(raw) {
    var s = String(raw).trim().replace(',', '.');
    if (!/^\d{1,7}(\.\d{1,6})?$/.test(s)) return null;
    var p = s.split('.'); return parseInt(p[0], 10) * 1000000 + parseInt(((p[1] || '') + '000000').slice(0, 6), 10);
  }
  function fixedStr(n, dec) { var s = String(Math.round(n)); while (s.length <= dec) s = '0' + s; var f = s.slice(-dec).replace(/0+$/, ''); return s.slice(0, -dec) + (f ? ',' + f : ''); }
  function pxInput(px) { return fixedStr(px, 6); }
  function lotPx(tot, qty) { return Math.max(1, Number((BigInt(tot) * 1000000000000n + BigInt(qty) / 2n) / BigInt(qty))); }
  function setPrice(p, d, px, onlyIfMissing) {
    var f = p.prices.filter(function (x) { return x.d === d; })[0];
    if (f) { if (!onlyIfMissing) f.px = px; } else p.prices.push({ d: d, px: px });
    p.prices.sort(function (a, b) { return a.d < b.d ? -1 : a.d > b.d ? 1 : 0; });
  }
  // Icona (e colore per i conti) in un foglio a parte: il modulo resta in una sola schermata, senza scorrere.
  function openIcoSheet(kind) {
    var base = layerOf(kind); if (!base) return;
    var h = shHead(kind === 'acc' ? 'Icona e colore' : 'Icona') +
      '<div class="grid icos" id="is-ico">' + ICONS.map(function (ic, k) { return '<button type="button" data-act="' + (kind === 'acc' ? 'aicon' : 'cicon') + '" data-i="' + k + '" aria-label="Icona ' + (k + 1) + '">' + ic + '</button>'; }).join('') + '</div>' +
      (kind === 'acc' ? '<div class="grid cols" id="is-col">' + COLORS.map(function (c, k) { return '<button type="button" data-act="acol" data-i="' + k + '" style="--c:' + c + '" aria-label="Colore ' + (k + 1) + '"></button>'; }).join('') + '</div>' : '') +
      '<button class="btn" data-act="close">Fatto</button>';
    pushLayer('sheet', 'icopick', h, { kind: kind });
    icoMark();
  }
  function icoMark() {
    var sh = layerOf('icopick'); if (!sh) return;
    var base = layerOf(sh.st.kind); if (!base) return;
    Array.prototype.forEach.call(sh.el.querySelectorAll('#is-ico button'), function (b) { b.classList.toggle('on', ICONS[+b.dataset.i] === base.st.icon); });
    Array.prototype.forEach.call(sh.el.querySelectorAll('#is-col button'), function (b) { b.classList.toggle('on', COLORS[+b.dataset.i] === base.st.col); });
  }
  function accOpts(sel, none) { return (none ? '<option value="">' + none + '</option>' : '') + S.accounts.map(function (a) { return '<option value="' + a.id + '"' + (a.id === sel ? ' selected' : '') + '>' + esc(a.icon + ' ' + a.name) + '</option>'; }).join(''); }
  function fld(label, inner, id) { return '<div class="fld"><label' + (id ? ' for="' + id + '"' : '') + '>' + label + '</label>' + inner + '</div>'; }
  function msgOf(lay, sel) { var m = lay.el.querySelector(sel || '.msg'); return function (t) { m.textContent = t; m.className = 'msg bad'; }; }
  function dateOk(d, a) { if (!d) return 'Scegli una data.'; if (d > TODAY) return 'Data futura non valida.'; if (a && d < a.openDate) return 'Prima dell’apertura del conto (' + dayLabel(a.openDate) + ').'; return ''; }

  /* nuovo investimento: una sola schermata ferma. Obbligatorio solo il nome. */
  function formVals(el) {
    var m = {}; [].forEach.call(el.querySelectorAll('input, select'), function (i) { if (i.id) m[i.id] = i.value; });
    return m;
  }
  function formRestore(el, m) {
    Object.keys(m).forEach(function (id) { var i = el.querySelector('#' + id); if (i && m[id] !== '') i.value = m[id]; });
  }
  function openPosForm() {
    var html = scrHead('Nuovo investimento', false) + '<div class="scrb"><div id="p-form" class="fcol pform"></div></div>' +
      '<div class="scrf"><p class="msg" id="p-msg" role="alert"></p><button class="btn" data-act="savepos">Aggiungi</button></div>';
    pushLayer('screen', 'posf', html, { kind: 'inv', mode: 'acq', by: 'qty' }, { refresh: syncPosForm }).el.classList.add('fixed');
    syncPosForm();
  }
  function seg2(id, act, key, cur, items) {
    return '<div class="seg s2" role="radiogroup" id="' + id + '">' + items.map(function (x) {
      return '<button type="button" data-act="' + act + '" data-' + key + '="' + x[0] + '" role="radio" aria-checked="' + (cur === x[0]) + '" class="' + (cur === x[0] ? 'on' : '') + '">' + x[1] + '</button>';
    }).join('') + '</div>';
  }
  function syncPosForm() {
    var lay = layerOf('posf'); if (!lay) return;
    var st = lay.st, el = lay.el, form = el.querySelector('#p-form'), keep = st.vals = Object.assign(st.vals || {}, formVals(form)), cry = st.kind === 'crypto', acq = st.mode === 'acq';
    var h = seg2('p-kinds', 'pkind', 'k', st.kind, [['inv', '📈 Titolo / ETF'], ['crypto', '🪙 Cripto']]) +
      fld('Nome <span class="req">obbligatorio</span>', '<input id="p-name" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="' + (cry ? 'Es. Bitcoin' : 'Es. ETF mondo') + '">', 'p-name') +
      '<div class="fgrid">' +
      (cry ? fld('Simbolo <span class="opt">facoltativo</span>', '<input id="p-sym" maxlength="10" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="BTC"><p class="hint">Es. BTC, ETH.</p>', 'p-sym')
        : fld('ISIN <span class="opt">facoltativo</span>', '<input id="p-isin" maxlength="12" autocapitalize="characters" autocorrect="off" spellcheck="false" autocomplete="off" placeholder="IE00B4L5Y983"><p class="hint" id="p-isin-h">Solo se lo conosci.</p>', 'p-isin')) +
      fld('Prezzo oggi (' + SYM[S.cur] + ')' + (acq ? ' <span class="opt">opz.</span>' : ''), '<input id="p-px" inputmode="decimal" autocomplete="off" placeholder="' + (acq ? 'come acquisto' : 'per 1 ' + (cry ? 'unità' : 'quota')) + '">', 'p-px') + '</div>' +
      seg2('p-modes', 'pmode', 'm', st.mode, [['acq', 'Ho acquistato'], ['oggi', 'Lo possiedo già']]);
    if (acq) {
      h += '<div class="fgrid">' + fld('Data acquisto', '<input type="date" id="p-date" max="' + TODAY + '" value="' + TODAY + '">', 'p-date') + fld('Quantità', '<input id="p-qty" inputmode="decimal" autocomplete="off" placeholder="0">', 'p-qty') + '</div>' +
        '<div class="fgrid">' + fld('Pagato (con costi)', '<input id="p-tot" inputmode="decimal" autocomplete="off" placeholder="0,00">', 'p-tot') + fld('Addebita su', '<select id="p-acc">' + accOpts('', 'Nessun conto') + '</select>', 'p-acc') + '</div>' +
        '<p class="hint">Con un conto scelto, l’importo esce dal conto. Il prezzo di oggi, se lo lasci vuoto, è quello d’acquisto.</p>';
    } else {
      h += seg2('p-by', 'pby', 'k', st.by, [['qty', 'So la quantità'], ['val', 'So il valore']]) +
        (st.by === 'qty' ? fld('Quantità posseduta', '<input id="p-qty" inputmode="decimal" autocomplete="off" placeholder="0">', 'p-qty') : fld('Valore di oggi (' + SYM[S.cur] + ')', '<input id="p-val" inputmode="decimal" autocomplete="off" placeholder="0,00">', 'p-val')) +
        '<div class="fgrid">' + fld('Prezzo medio <span class="opt">opz.</span>', '<input id="p-pmc" inputmode="decimal" autocomplete="off" placeholder="d’acquisto">', 'p-pmc') +
        fld('Comprato dal', '<input type="date" id="p-pmd" max="' + TODAY + '">', 'p-pmd') + '</div>' +
        '<p class="hint">Prezzo medio e data (anche indicativa): dall’app del broker.</p>';
    }
    form.innerHTML = h; formRestore(form, keep);
    var m = el.querySelector('#p-msg'); if (m) { m.textContent = ''; m.className = 'msg'; }
  }
  function savePos() {
    var lay = layerOf('posf'); if (!lay) return;
    var st = lay.st, g = function (s) { return lay.el.querySelector(s); }, err = msgOf(lay, '#p-msg'), cry = st.kind === 'crypto';
    var name = g('#p-name').value.trim().replace(/\s+/g, ' ');
    if (!name) return err('Inserisci il nome.');
    var isin = '', sym = '';
    if (cry) {
      sym = g('#p-sym').value.trim().toUpperCase();
      if (!/^[A-Z0-9]{0,10}$/.test(sym)) return err('Simbolo non valido: solo lettere e cifre.');
    } else {
      isin = g('#p-isin').value.trim().toUpperCase();
      if (isin && !isinOk(isin)) return err('ISIN non valido: controllalo o lascialo vuoto.');
      if (isin && S.pos.some(function (p) { return p.isin === isin; })) return err('ISIN già presente: aprilo dal Portfolio.');
    }
    if (S.pos.some(function (p) { return p.kind === st.kind && p.name.toLowerCase() === name.toLowerCase(); })) return err('Già presente: aprilo dal Portfolio.');
    var pxRaw = g('#p-px').value.trim(), px = pxRaw ? parsePx(pxRaw) : null;
    if (pxRaw && (px === null || px <= 0)) return err('Prezzo non valido.');
    var lot, accId = '', u = cry ? 'unità' : 'quote';
    if (st.mode === 'acq') {
      var d = g('#p-date').value, qty = parseQty(g('#p-qty').value), tot = parseCents(g('#p-tot').value);
      accId = g('#p-acc').value; var a = accId ? acc(accId) : null;
      var de = dateOk(d, a); if (de) return err(de);
      if (qty === null || qty <= 0) return err('Quantità non valida (max 8 decimali).');
      if (tot === null || tot <= 0) return err('Importo pagato non valido.');
      var lp = lotPx(tot, qty); if (lp > PMAX) return err('Prezzo per ' + (cry ? 'unità' : 'quota') + ' troppo alto: controlla importo e quantità.');
      lot = { id: uid('l'), d: d, qty: qty, px: lp, fee: 0, tot: tot, txId: '', rule: '', est: false };
      if (px === null) px = lot.px;
    } else {
      if (px === null) return err('Inserisci il prezzo di oggi.');
      var pmcRaw = g('#p-pmc') ? g('#p-pmc').value.trim() : '', pmc = pmcRaw ? parsePx(pmcRaw) : null;
      if (pmcRaw && (pmc === null || pmc <= 0)) return err('Prezzo medio non valido.');
      var pmd = g('#p-pmd') ? g('#p-pmd').value : '';
      if (pmc && !pmd) return err('Indica da quando lo possiedi (anche circa).');
      if (pmc) { var pde = dateOk(pmd, null) || (dRange(pmd) ? '' : 'Data non valida.'); if (pde) return err(pde); }
      if (st.by === 'qty') {
        var q2 = parseQty(g('#p-qty').value); if (q2 === null || q2 <= 0) return err('Quantità non valida (max 8 decimali).');
        var t2 = valCents(q2, px); if (t2 <= 0) return err('Valore troppo piccolo.'); if (t2 > 99999999999) return err('Valore troppo grande.');
        lot = { id: uid('l'), d: TODAY, qty: q2, px: px, fee: 0, tot: t2, txId: '', rule: '', est: false };
        if (pmc) { var c2 = valCents(q2, pmc); if (c2 <= 0) return err('Prezzo medio troppo piccolo.'); if (c2 > 99999999999) return err('Prezzo medio troppo grande.'); lot.px = pmc; lot.tot = c2; lot.d = pmd; }
      } else {
        var t3 = parseCents(g('#p-val').value); if (t3 === null || t3 <= 0) return err('Valore non valido.');
        var q3 = pacQty(t3, 0, px); if (q3 <= 0) return err('Valore troppo piccolo.'); if (q3 > QMAX) return err('Quantità troppo grande: controlla il prezzo.');
        lot = { id: uid('l'), d: TODAY, qty: q3, px: px, fee: 0, tot: t3, txId: '', rule: '', est: false };
        if (pmc) { var c3 = valCents(q3, pmc); if (c3 <= 0) return err('Prezzo medio troppo piccolo.'); if (c3 > 99999999999) return err('Prezzo medio troppo grande.'); lot.px = pmc; lot.tot = c3; lot.d = pmd; }
      }
    }
    var p = { id: uid('p'), kind: st.kind, sym: sym, isin: isin, name: name, lots: [lot], prices: [] };
    setPrice(p, lot.d, lot.px, false); setPrice(p, TODAY, px, false);
    if (accId) {
      var tx = { id: uid('t'), kind: 'inv', dir: 'buy', cents: lot.tot, accId: accId, posId: p.id, lotId: lot.id, date: lot.d, note: '', ts: Date.now(), rule: '' };
      lot.txId = tx.id; S.tx.push(tx);
    }
    S.pos.push(p); popLayer(); toast((cry ? 'Cripto aggiunta' : 'Investimento aggiunto')); openPosDetail(p.id);
    if (cry && S.autoCry) cgLink().then(function () { return cgFetch(true); });
  }

  /* acquisto / vendita */
  function openLotForm(posId, dir, lotId) {
    var p = posById(posId); if (!p) return;
    var lot = lotId ? p.lots.filter(function (l) { return l.id === lotId; })[0] : null; if (lotId && !lot) return;
    var d = lot ? (lot.qty < 0 ? 'sell' : 'buy') : dir, sell = d === 'sell';
    var tx = lot && lot.txId ? txById(lot.txId) : null;
    var html = scrHead((lot ? 'Modifica ' : 'Nuova ') + (sell ? 'vendita' : 'acquisto'), !!lot) + '<div class="scrb"><div class="card prev"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + esc(posTag(p)) + '</span></span></div>' +
      fld('Data', '<input type="date" id="l-date" max="' + TODAY + '" value="' + (lot ? lot.d : TODAY) + '">', 'l-date') +
      fld('Quantità', '<input id="l-qty" inputmode="decimal" autocomplete="off" placeholder="0" value="' + (lot ? qtyInput(Math.abs(lot.qty)) : '') + '">' + (lot && lot.est ? '<p class="hint">Quantità stimata: correggila con quella del broker.</p>' : ''), 'l-qty') +
      fld(sell ? 'Importo incassato' : 'Importo pagato (con commissioni)', '<input id="l-tot" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (lot ? amtStr(lot.tot) : '') + '">', 'l-tot') +
      (lot ? '<div class="kv"><span>Conto</span><span>' + (tx ? esc(accName(tx.accId)) : 'Nessuno') + '</span></div>' : fld(sell ? 'Accreditato su' : 'Pagato con', '<select id="l-acc">' + accOpts('', 'Nessuno') + '</select>', 'l-acc')) +
      '</div><div class="scrf"><p class="msg" id="l-msg" role="alert"></p><button class="btn" data-act="savelot">Salva</button>' + (lot ? '<button class="btn danger" data-act="dellot">Elimina</button>' : '') + '</div>';
    pushLayer('screen', 'lot', html, { posId: posId, dir: d, lotId: lotId || '' });
  }
  function qtyInput(q) { return fixedStr(q, 8); }
  function saveLot() {
    var lay = layerOf('lot'); if (!lay) return;
    var st = lay.st, p = posById(st.posId), g = function (s) { return lay.el.querySelector(s); }, err = msgOf(lay, '#l-msg'), sell = st.dir === 'sell';
    var lot = st.lotId ? p.lots.filter(function (l) { return l.id === st.lotId; })[0] : null;
    var d = g('#l-date').value, qty = parseQty(g('#l-qty').value), tot = parseCents(g('#l-tot').value);
    var accId = lot ? (lot.txId && txById(lot.txId) ? txById(lot.txId).accId : '') : g('#l-acc').value, a = accId ? acc(accId) : null;
    var de = dateOk(d, a); if (de) return err(de);
    if (qty === null || qty <= 0) return err('Quantità non valida.');
    if (tot === null || tot <= 0) return err('Importo non valido.');
    var lp = lotPx(tot, qty); if (lp > PMAX) return err('Prezzo per unità troppo alto: controlla importo e quantità.');
    var nl = { id: lot ? lot.id : uid('l'), d: d, qty: sell ? -qty : qty, px: lp, fee: 0, tot: tot, txId: lot ? lot.txId : '', rule: lot ? lot.rule : '', est: false };
    var lots = p.lots.filter(function (l) { return !lot || l.id !== lot.id; }).concat([nl]);
    if (!lotsOk(lots)) return err('Vendita oltre la quantità posseduta.');
    if (lots.reduce(function (s, l) { return s + Math.abs(l.qty); }, 0) > QMAX) return err('Quantità complessiva troppo grande.');
    var snap = snapAll();
    p.lots = lots;
    if (lot) { var t = lot.txId ? txById(lot.txId) : null; if (t) { t.cents = tot; t.date = d; } }
    else if (accId) {
      var tx = { id: uid('t'), kind: 'inv', dir: sell ? 'sell' : 'buy', cents: tot, accId: accId, posId: p.id, lotId: nl.id, date: d, note: '', ts: Date.now(), rule: '' };
      nl.txId = tx.id; S.tx.push(tx);
    }
    setPrice(p, d, nl.px, true);
    popLayer(); toast(sell ? 'Vendita salvata' : 'Acquisto salvato', function () { restoreAll(snap); });
  }
  // Eliminare dalla lista il movimento di un acquisto/vendita elimina anche l'operazione collegata: patrimonio invariato.
  function delInvTx(el, t) {
    var p = posById(t.posId), lot = p ? p.lots.filter(function (l) { return l.id === t.lotId; })[0] : null;
    if (p && lot && !lotsOk(p.lots.filter(function (l) { return l !== lot; }))) { toast('Una vendita successiva dipende da questo acquisto.'); return; }
    if (!twoTap(el, 'tx' + t.id)) return;
    var snap = snapAll();
    S.tx = S.tx.filter(function (x) { return x.id !== t.id; });
    if (p && lot) p.lots = p.lots.filter(function (l) { return l !== lot; });
    closeAll(); toast('Operazione eliminata', function () { restoreAll(snap); });
  }
  function delLot(el) {
    var lay = layerOf('lot'); if (!lay) return; var st = lay.st, p = posById(st.posId), err = msgOf(lay, '#l-msg');
    var lots = p.lots.filter(function (l) { return l.id !== st.lotId; });
    if (!lotsOk(lots)) return err('Una vendita successiva dipende da questo acquisto.');
    if (!twoTap(el, 'lot' + st.lotId)) return;
    var snap = snapAll(), lot = p.lots.filter(function (l) { return l.id === st.lotId; })[0];
    p.lots = lots; if (lot && lot.txId) S.tx = S.tx.filter(function (t) { return t.id !== lot.txId; });
    popLayer(); toast('Operazione eliminata', function () { restoreAll(snap); });
  }

  /* prezzo */
  function delPrice(el) {
    var lay = layerOf('price'); if (!lay) return; var st = lay.st, p = posById(st.posId);
    if (!twoTap(el, 'px' + st.d0)) return;
    var snap = snapAll(); p.prices = p.prices.filter(function (x) { return x.d !== st.d0; }); popLayer(); toast('Prezzo eliminato', function () { restoreAll(snap); });
  }

  /* elenco di un prodotto: operazioni, prezzi, PAC */
  function posListHtml(id) {
    var p = posById(id); if (!p) return scrHead('Investimento', true);
    var lots = lotsSorted(p.lots).reverse(), prices = p.prices.slice().reverse(), pacs = S.rules.filter(function (r) { return r.type === 'pac' && r.posId === id; });
    var h = scrHead(p.name, true) + '<div class="scrb"><section class="sec"><h2>Operazioni</h2>' + (lots.length ? '<div class="list">' + lots.map(function (l) {
      var sell = l.qty < 0;
      return '<button class="row" data-act="lotedit" data-id="' + esc(l.id) + '" data-pos="' + esc(id) + '"><span class="ico">' + (sell ? '➖' : '➕') + '</span><span class="mid"><span class="nm">' + (sell ? 'Vendita' : l.rule ? 'PAC' : 'Acquisto') + ' · ' + qtyStr(Math.abs(l.qty), p) + ' ' + esc(unitL(p)) + '</span><span class="sb">' + dayLabel(l.d) + ' · ' + pxStr(l.px) + (l.est ? ' · stima' : '') + '</span></span><span class="v">' + money(l.tot) + '</span></button>';
    }).join('') + '</div>' : '<p class="empty">Nessuna operazione.</p>') + '</section>' +
      '<section class="sec"><h2>Prezzi</h2><div class="list">' + prices.map(function (x) {
        return '<button class="row" data-act="priceedit" data-id="' + id + '" data-d="' + x.d + '"><span class="ico">🏷️</span><span class="mid"><span class="nm">' + pxStr(x.px) + '</span><span class="sb">' + dayLabel(x.d) + '</span></span><span class="v">' + svg('right') + '</span></button>';
      }).join('') + '</div></section>' +
      (pacs.length ? '<section class="sec"><h2>PAC</h2><div class="list">' + pacs.map(ruleRow).join('') + '</div></section>' : '') + '</div>' +
      '<div class="scrf"><button class="btn danger" data-act="delposopen" data-id="' + id + '">Elimina investimento…</button></div>';
    return h;
  }
  function openPosList(id) {
    var lay = pushLayer('screen', 'poslist', posListHtml(id), { id: id });
    lay.refresh = function () { if (!posById(id)) { popLayer(); return; } lay.el.querySelector('.scr').innerHTML = posListHtml(id); };
  }

  /* eliminazione di un investimento */
  function delPosPlan(id, mode) {
    var p = posById(id), mine = S.tx.filter(function (t) { return t.posId === id; });
    var rest = mode === 'purge' ? S.tx.filter(function (t) { return t.posId !== id; }) : S.tx;
    var after = 0, ch = [];
    S.accounts.forEach(function (x) { var nb = balWith(x, rest), ob = balance(x.id); after += nb; if (nb !== ob) ch.push({ a: x, from: ob, to: nb }); });
    S.pos.forEach(function (x) { if (x.id !== id) after += posValue(x); });
    return { p: p, mine: mine, ch: ch, before: netWorth(), after: after, pacs: S.rules.filter(function (r) { return r.type === 'pac' && r.posId === id; }).length };
  }
  function openDelPos(id) {
    var p = posById(id); if (!p) return;
    pushLayer('screen', 'delpos', scrHead('Elimina investimento', true) + '<div class="scrb"><div class="card prev"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb" id="dp-sub"></span></span></div><div class="fld"><span class="lab">Addebiti sui conti</span><div class="optl" id="dp-opts"></div></div><div class="card" id="dp-imp"></div></div>' +
      '<div class="scrf"><button class="btn danger" id="dp-go" data-act="delposgo"></button></div>', { id: id, mode: 'keep' }, { refresh: syncDelPos });
    syncDelPos();
  }
  function syncDelPos() {
    var lay = layerOf('delpos'); if (!lay) return;
    var st = lay.st, el = lay.el, q = delPosPlan(st.id, st.mode), n = q.mine.length;
    el.querySelector('#dp-sub').textContent = 'Valore ' + money(posValue(q.p));
    el.querySelector('#dp-opts').innerHTML =
      '<button type="button" class="optb ' + (st.mode === 'keep' ? 'on' : '') + '" data-act="delposmode" data-m="keep" role="radio" aria-checked="' + (st.mode === 'keep') + '"><b>Tienili</b><span>Gli addebiti restano: il denaro risulta uscito.</span></button>' +
      '<button type="button" class="optb ' + (st.mode === 'purge' ? 'on' : '') + '" data-act="delposmode" data-m="purge" role="radio" aria-checked="' + (st.mode === 'purge') + '"><b>Eliminali</b><span>I conti tornano come prima degli acquisti.</span></button>';
    var h = '<div class="kv"><span>Patrimonio</span><span>' + money(q.before) + ' → <b>' + money(q.after) + '</b></span></div><div class="kv"><span>Variazione</span><span class="' + (q.after - q.before >= 0 ? 'pos' : 'neg') + '">' + moneyS(q.after - q.before) + '</span></div>';
    if (q.ch.length) h += '<h2 style="margin:12px 0 2px">Conti</h2>' + q.ch.map(function (c) { return '<div class="kv"><span>' + esc(c.a.name) + '</span><span>' + money(c.from) + ' → ' + money(c.to) + '</span></div>'; }).join('');
    if (q.pacs) h += '<p class="hint" style="margin-top:8px">' + q.pacs + (q.pacs === 1 ? ' PAC verrà eliminato.' : ' PAC verranno eliminati.') + '</p>';
    el.querySelector('#dp-imp').innerHTML = h;
    var go = el.querySelector('#dp-go'); go.classList.remove('armed'); go.textContent = 'Elimina investimento'; armed = null;
  }
  function delPosRun(el) {
    var lay = layerOf('delpos'); if (!lay) return;
    if (!twoTap(el, 'delpos' + lay.st.id)) return;
    var id = lay.st.id, mode = lay.st.mode, snap = snapAll(), gp = posById(id);
    if (gp) snapCapture('pre', 'Prima di eliminare «' + String(gp.name).slice(0, 30) + '»');
    S.pos = S.pos.filter(function (x) { return x.id !== id; });
    S.rules = S.rules.filter(function (r) { return !(r.type === 'pac' && r.posId === id); });
    if (mode === 'purge') S.tx = S.tx.filter(function (t) { return t.posId !== id; });
    else S.tx.forEach(function (t) { if (t.posId === id) { t.posId = ''; t.lotId = ''; t.note = ('Eliminato: ' + (gp ? gp.name : 'investimento')).slice(0, 60); } });
    closeAll(); toast('Investimento eliminato', function () { restoreAll(snap); });
  }

  /* ================= ricorrenze e PAC ================= */
  function ruleTitle(r) {
    if (r.type === 'pac') { var p = posById(r.posId); return 'PAC · ' + (p ? p.name : 'prodotto'); }
    var c = cat(r.catId); return r.note || (r.kind === 'giro' ? 'Giroconto' : c ? c.name : r.kind === 'spesa' ? 'Spesa' : 'Entrata');
  }
  function ruleRow(r) {
    var nx = ruleNext(r), ic = r.type === 'pac' ? '🔁' : r.kind === 'giro' ? '⇄' : (cat(r.catId) || { icon: '↻' }).icon;
    return '<button class="row" data-act="ruleopen" data-id="' + r.id + '"><span class="ico">' + ic + '</span><span class="mid"><span class="nm">' + esc(ruleTitle(r)) + '</span><span class="sb">' + freqL(r) + ' · ' + (!r.active ? 'in pausa' : nx ? 'prossima ' + dayLabel(nx) : 'terminata') + '</span></span><span class="v ' + (r.kind === 'entrata' ? 'pos' : '') + '">' + money(r.cents) + '</span></button>';
  }
  function rulesHtml() {
    return scrHead('Ricorrenze e PAC', true) + '<div class="scrb">' + (S.rules.length ? '<div class="list">' + S.rules.map(ruleRow).join('') + '</div>' : '<p class="empty">Nessuna ricorrenza. Usa «Ripeti» in un nuovo movimento.</p>') + '</div>';
  }
  function openRules() {
    var lay = pushLayer('screen', 'rules', rulesHtml(), {});
    lay.refresh = function () { lay.el.querySelector('.scr').innerHTML = rulesHtml(); };
  }
  function repSheet() {
    var al = layerOf('add'); if (!al) return;
    pushLayer('sheet', 'pickrep', shHead('Ripeti') + '<div>' + [['', 'Mai'], ['w', FREQ.w], ['m', FREQ.m], ['q', FREQ.q], ['y', FREQ.y]].map(function (o) {
      return '<button class="pick" data-act="setrep" data-v="' + o[0] + '"><span class="mid"><span class="nm">' + o[1] + '</span></span><span class="ck">' + (al.st.rep === o[0] ? svg('check') : '') + '</span></button>';
    }).join('') + '</div>');
  }
  /* cadenza: preset oppure personalizzata «ogni N giorni/settimane/mesi/anni». p = prefisso degli id ('k' PAC, 'r' modifica). */
  function cadSel(p, r) {
    var cust = !!r && (evOf(r) > 1 || r.freq === 'd'), f = r ? (cust ? 'c' : r.freq) : 'm';
    return '<select id="' + p + '-freq">' + [['m', FREQ.m], ['w', FREQ.w], ['q', FREQ.q], ['y', FREQ.y], ['c', 'Altra…']].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === f ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>';
  }
  function cadCust(p, r) {
    var cust = !!r && (evOf(r) > 1 || r.freq === 'd'), u = cust ? r.freq : 'w', n = cust ? evOf(r) : 2;
    return '<div class="fgrid" id="' + p + '-cad"' + (cust ? '' : ' hidden') + '>' + fld('Ogni', '<input id="' + p + '-n" inputmode="numeric" maxlength="4" autocomplete="off" value="' + n + '">', p + '-n') +
      fld('Unità', '<select id="' + p + '-u">' + ['d', 'w', 'm', 'y'].map(function (x) { return '<option value="' + x + '"' + (x === u ? ' selected' : '') + '>' + EV_U[x][1] + '</option>'; }).join('') + '</select>', p + '-u') + '</div>';
  }
  function cadShow(lay, p) { var c = lay.el.querySelector('#' + p + '-cad'); if (c) c.hidden = lay.el.querySelector('#' + p + '-freq').value !== 'c'; }
  // → { freq, ev } oppure { err }
  function cadRead(lay, p) {
    var f = lay.el.querySelector('#' + p + '-freq').value;
    if (f !== 'c') return { freq: f, ev: 0 };
    var u = lay.el.querySelector('#' + p + '-u').value, s = lay.el.querySelector('#' + p + '-n').value.trim();
    if (!hasK(EV_MAX, u)) return { err: 'Unità non valida.' };
    if (!/^\d{1,4}$/.test(s) || +s < 1 || +s > EV_MAX[u]) return { err: 'Ogni quanto: un numero intero da 1 a ' + EV_MAX[u] + ' (' + EV_U[u][1] + ').' };
    return { freq: u, ev: +s };
  }
  function openRuleForm(id) {
    var r = S.rules.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    var pac = r.type === 'pac', giro = r.kind === 'giro';
    var cats = S.cats.filter(function (c) { return c.kind === r.kind; });
    var prev = '<div class="card prev"><span class="ico">' + (pac ? '🔁' : giro ? '⇄' : (cat(r.catId) || { icon: '↻' }).icon) + '</span><span class="mid"><span class="nm">' + esc(ruleTitle(r)) + '</span><span class="sb">' + freqCap(r) + ' dal ' + dayLabel(r.anchor) + '</span></span></div>';
    var html;
    if (pac) {
      // PAC: schermata ferma (nessuno scorrimento), campi in griglia
      html = scrHead('Modifica PAC', true) + '<div class="scrb pform">' + prev +
        '<div class="fgrid">' + fld('Importo (' + SYM[S.cur] + ')', '<input id="r-amt" inputmode="decimal" autocomplete="off" value="' + amtStr(r.cents) + '">', 'r-amt') + fld('Frequenza', cadSel('r', r), 'r-freq') + '</div>' + cadCust('r', r) +
        fld('Addebito su', '<select id="r-acc">' + accOpts(r.accId) + '</select>', 'r-acc') +
        '<div class="fgrid">' + fld('Fino al (opz.)', '<input type="date" id="r-end" value="' + (r.end || '') + '">', 'r-end') +
        fld('Stato', '<select id="r-act"><option value="1"' + (r.active ? ' selected' : '') + '>Attivo</option><option value="0"' + (r.active ? '' : ' selected') + '>In pausa</option></select>', 'r-act') + '</div></div>' +
        '<div class="scrf"><p class="msg" id="r-msg" role="alert"></p><div class="btnrow"><button class="btn danger" data-act="delrule">Elimina</button><button class="btn" data-act="saverule">Salva</button></div></div>';
      pushLayer('screen', 'ruleform', html, { id: id }).el.classList.add('fixed');
      return;
    }
    // Ricorrenza: anch'essa in una sola schermata ferma, campi affiancati
    html = scrHead('Modifica ricorrenza', true) + '<div class="scrb pform">' + prev +
      '<div class="fgrid">' + fld('Importo (' + SYM[S.cur] + ')', '<input id="r-amt" inputmode="decimal" autocomplete="off" value="' + amtStr(r.cents) + '">', 'r-amt') + fld('Frequenza', cadSel('r', r), 'r-freq') + '</div>' + cadCust('r', r) +
      '<div class="fgrid">' + fld(giro ? 'Da conto' : r.kind === 'spesa' ? 'Pagato con' : 'Accreditato su', '<select id="r-acc">' + accOpts(r.accId) + '</select>', 'r-acc') +
      (giro ? fld('A conto', '<select id="r-to">' + accOpts(r.toId) + '</select>', 'r-to') : fld('Categoria', '<select id="r-cat"><option value="">Senza categoria</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === r.catId ? ' selected' : '') + '>' + esc(c.icon + ' ' + c.name) + '</option>'; }).join('') + '</select>', 'r-cat')) +
      '</div>' + fld('Nota', '<input id="r-note" maxlength="60" autocomplete="off" value="' + esc(r.note || '') + '">', 'r-note') +
      '<div class="fgrid">' + fld('Fino al (opz.)', '<input type="date" id="r-end" value="' + (r.end || '') + '">', 'r-end') +
      fld('Stato', '<select id="r-act"><option value="1"' + (r.active ? ' selected' : '') + '>Attiva</option><option value="0"' + (r.active ? '' : ' selected') + '>In pausa</option></select>', 'r-act') + '</div></div>' +
      '<div class="scrf"><p class="msg" id="r-msg" role="alert"></p><div class="btnrow"><button class="btn danger" data-act="delrule">Elimina</button><button class="btn" data-act="saverule">Salva</button></div></div>';
    pushLayer('screen', 'ruleform', html, { id: id });
  }
  function skipToFuture(r) { var g = 0; while (ruleNext(r) && ruleNext(r) < TODAY && g++ < 3000) r.k += 1; }
  function saveRule() {
    var lay = layerOf('ruleform'); if (!lay) return;
    var r = S.rules.filter(function (x) { return x.id === lay.st.id; })[0], g = function (s) { return lay.el.querySelector(s); }, err = msgOf(lay, '#r-msg');
    var c = parseCents(g('#r-amt').value); if (c === null || c <= 0) return err('Importo non valido.');
    var accId = g('#r-acc').value, toId = r.kind === 'giro' ? g('#r-to').value : '';
    if (!acc(accId)) return err('Scegli il conto.');
    if (r.kind === 'giro' && (!acc(toId) || toId === accId)) return err('Scegli due conti diversi.');
    var end = g('#r-end').value; if (end && end < r.anchor) return err('La fine è prima dell’inizio.');
    var cd = cadRead(lay, 'r'); if (cd.err) return err(cd.err);
    var chg = cd.freq !== r.freq || (cd.ev || 1) !== evOf(r), nx2 = '';
    if (chg) {
      // il passato resta com'è: la nuova cadenza riparte dalla prossima scadenza non ancora registrata
      var tmp = {}; Object.keys(r).forEach(function (k) { tmp[k] = r[k]; }); tmp.end = end;
      if (tmp.active) runRules(true);
      tmp.k = r.k; skipToFuture(tmp); nx2 = ruleNext(tmp);
      if (!nx2) return err(end ? 'La fine è prima della prossima scadenza.' : 'La ricorrenza è terminata: la cadenza non si può cambiare.');
    }
    var snap = snapDeep(), was = r.active;
    if (chg) { r.anchor = nx2; r.k = 0; r.freq = cd.freq; if (cd.ev > 1) r.ev = cd.ev; else delete r.ev; }
    r.cents = c; r.accId = accId; r.toId = toId; r.end = end; r.active = g('#r-act').type === 'checkbox' ? g('#r-act').checked : g('#r-act').value === '1';
    if (r.type === 'mov') { r.note = (g('#r-note').value || '').trim().slice(0, 60); if (r.kind !== 'giro') r.catId = g('#r-cat').value; }
    if (r.active && !was) skipToFuture(r);
    popLayer(); toast('Salvato', function () { restoreDeep(snap); });
  }
  function delRule(el) {
    var lay = layerOf('ruleform'); if (!lay) return;
    if (!twoTap(el, 'rule' + lay.st.id)) return;
    var snap = snapDeep(); S.rules = S.rules.filter(function (x) { return x.id !== lay.st.id; });
    popLayer(); toast('Eliminata. I movimenti passati restano.', function () { restoreDeep(snap); });
  }
  function openPacForm(posId) {
    if (!S.pos.length) { toast('Aggiungi prima un investimento.'); return; }
    var html = scrHead('Nuovo PAC', true) + '<div class="scrb">' +
      fld('Prodotto', '<select id="k-pos">' + S.pos.map(function (p) { return '<option value="' + p.id + '"' + (p.id === posId ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select>', 'k-pos') +
      '<div class="fgrid">' + fld('Importo (' + SYM[S.cur] + ')', '<input id="k-amt" inputmode="decimal" autocomplete="off" placeholder="0,00">', 'k-amt') +
      fld('Frequenza', cadSel('k'), 'k-freq') + '</div>' + cadCust('k') +
      fld('Addebito su', '<select id="k-acc">' + accOpts('') + '</select>', 'k-acc') +
      '<div class="fgrid">' + fld('Prima data', '<input type="date" id="k-date" value="' + TODAY + '">', 'k-date') +
      fld('Fino al (opz.)', '<input type="date" id="k-end">', 'k-end') + '</div>' +
      '<p class="hint" id="k-hint"></p></div>' +
      '<div class="scrf"><p class="msg" id="k-msg" role="alert"></p><button class="btn" data-act="savepac">Crea PAC</button></div>';
    pushLayer('screen', 'pacf', html, {}).el.classList.add('fixed');
    syncPac();
  }
  // acquisti passati da registrare e prossima data (stessi limiti di runRules)
  function pacInfo(anchor, freq, ev, end, a) {
    var n = 0, k = 0, d = nthDate(anchor, freq, 0, ev);
    while (d <= TODAY && (!end || d <= end) && k < RUN_MAX) { if (!a || d >= a.openDate) n += 1; k += 1; d = nthDate(anchor, freq, k, ev); }
    return { n: n, next: !end || d <= end ? d : '', capped: k >= RUN_MAX };
  }
  function syncPac() {
    var lay = layerOf('pacf'); if (!lay) return;
    var g = function (s) { return lay.el.querySelector(s); }, d = g('#k-date').value, a = acc(g('#k-acc').value);
    cadShow(lay, 'k'); var cd = cadRead(lay, 'k'), h = g('#k-hint');
    if (!d || cd.err) { h.textContent = cd.err && d ? cd.err : ''; return; }
    var inf = pacInfo(d, cd.freq, cd.ev, g('#k-end').value, a), n = inf.n;
    h.textContent = d > TODAY ? 'Il primo acquisto sarà il ' + dayLabel(d) + '.' : (n ? 'Verranno registrati subito ' + n + (n === 1 ? ' acquisto passato' : ' acquisti passati') + (inf.next ? '. Prossimo: ' + dayLabel(inf.next) : '') + '.' : inf.next ? 'Prossimo acquisto: ' + dayLabel(inf.next) + '.' : '');
  }
  function savePac(btn) {
    var lay = layerOf('pacf'); if (!lay) return;
    var g = function (s) { return lay.el.querySelector(s); }, err = msgOf(lay, '#k-msg');
    var p = posById(g('#k-pos').value), c = parseCents(g('#k-amt').value), a = acc(g('#k-acc').value), d = g('#k-date').value, end = g('#k-end').value;
    if (!p) return err('Scegli il prodotto.');
    if (c === null || c <= 0) return err('Importo non valido.');
    if (!a) return err('Scegli il conto.');
    if (!d) return err('Scegli la prima data.');
    if (d <= TODAY && d < a.openDate) return err('Prima dell’apertura del conto (' + dayLabel(a.openDate) + ').');
    if (end && end < d) return err('La fine è prima dell’inizio.');
    var cd = cadRead(lay, 'k'); if (cd.err) return err(cd.err);
    var inf = pacInfo(d, cd.freq, cd.ev, end, a);
    if (inf.capped) return err('Troppi acquisti passati: sposta la prima data più vicina a oggi.');
    if (inf.n > 120 && btn && !twoTap(btn, 'pacbig' + p.id + d + cd.freq + cd.ev + inf.n)) return;
    var snap = snapDeep(), rule = { id: uid('r'), type: 'pac', posId: p.id, cents: c, fee: 0, accId: a.id, freq: cd.freq, anchor: d, k: 0, end: end, active: true };
    if (cd.ev > 1) rule.ev = cd.ev;
    S.rules.push(rule);
    var made = runRules(true);
    popLayer(); toast('PAC creato' + (made ? ' · ' + made + (made === 1 ? ' acquisto registrato' : ' acquisti registrati') : ''), function () { restoreDeep(snap); });
  }

  /* ================= funzioni aggiuntive: ricerca, CSV, budget, obiettivi, prezzi, guida ================= */
  function monthRange(d) { var m = parseD(d); return { from: ymd(new Date(m.getFullYear(), m.getMonth(), 1)), to: ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0)) }; }
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function pbar(ratio, cls, pace) {
    var w = Math.max(0, Math.min(1, ratio)) * 100;
    return '<div class="pbar ' + (cls || '') + '"><b style="width:' + w.toFixed(1) + '%"></b>' + (pace !== undefined ? '<i class="pace" style="left:' + (Math.min(1, pace) * 100).toFixed(1) + '%"></i>' : '') + '</div>';
  }

  /* ---------- budget mensili per categoria (campo budget della categoria, in centesimi) ---------- */
  function budgetState() {
    var r = monthRange(TODAY), by = {}, dim = parseD(r.to).getDate(), day = parseD(TODAY).getDate();
    S.tx.forEach(function (t) { if (t.kind === 'spesa' && t.date >= r.from && t.date <= TODAY) by[t.catId] = (by[t.catId] || 0) + t.cents; });
    var rows = S.cats.filter(function (c) { return c.kind === 'spesa' && c.budget > 0; }).map(function (c) {
      var sp = by[c.id] || 0; return { c: c, spent: sp, budget: c.budget, ratio: sp / c.budget };
    }).sort(function (a, b) { return b.ratio - a.ratio; });
    var tb = 0, ts = 0; rows.forEach(function (x) { tb += x.budget; ts += x.spent; });
    return { rows: rows, budget: tb, spent: ts, pace: day / dim, day: day, dim: dim };
  }
  function budCls(ratio) { return ratio >= 1 ? 'over' : ratio >= 0.8 ? 'warn' : ''; }
  function budgetSection() {
    var b = budgetState(); if (!b.rows.length) return '';
    var h = '<section class="sec"><div class="sech"><h2>Budget · ' + MESI_L[parseD(TODAY).getMonth()] + '</h2><button class="lnk" data-act="budgets">Modifica</button></div><div class="card">';
    h += '<div class="kv" style="border:0;padding-top:0"><span>Speso ' + money(b.spent) + ' di ' + money(b.budget) + '</span><span class="' + (b.spent > b.budget ? 'neg' : '') + '">' + (b.spent > b.budget ? 'oltre di ' + money(b.spent - b.budget) : 'restano ' + money(b.budget - b.spent)) + '</span></div>';
    h += pbar(b.spent / b.budget, budCls(b.spent / b.budget), b.pace);
    h += '<p class="note" style="margin:6px 0 4px">Giorno ' + b.day + ' di ' + b.dim + ': la tacca indica il ritmo per restare nel budget.</p>';
    h += b.rows.map(function (x) {
      var left = x.budget - x.spent, ahead = x.ratio < 1 && x.ratio > b.pace + 0.1;
      return '<button class="cbar budrow" data-act="budtx" data-id="' + x.c.id + '"><div class="top"><span class="nm">' + x.c.icon + ' ' + esc(x.c.name) + '</span><span class="v">' + money(x.spent) + ' / ' + money(x.budget) + '</span></div>' + pbar(x.ratio, budCls(x.ratio), b.pace) +
        '<span class="sb ' + (left < 0 ? 'neg' : '') + '">' + (left < 0 ? 'Superato di ' + money(-left) : 'Restano ' + money(left) + (ahead ? ' · sopra il ritmo' : '')) + '</span></button>';
    }).join('');
    return h + '</div></section>';
  }
  // avviso nel toast quando una spesa porta una categoria vicino o oltre il budget del mese
  function budNote(t) {
    if (!t || t.kind !== 'spesa' || t.date.slice(0, 7) !== TODAY.slice(0, 7)) return '';
    var c = cat(t.catId); if (!c || !(c.budget > 0)) return '';
    var r = monthRange(TODAY), sp = 0; S.tx.forEach(function (x) { if (x.kind === 'spesa' && x.catId === c.id && x.date >= r.from && x.date <= r.to) sp += x.cents; });
    var q = sp / c.budget;
    return q >= 1 ? ' · ' + c.name + ': budget superato' : q >= 0.8 ? ' · ' + c.name + ': ' + Math.round(q * 100) + '% del budget' : '';
  }
  function openBudgets() {
    var cats = S.cats.filter(function (c) { return c.kind === 'spesa'; });
    var f = monthRange(addMonths(TODAY, -3)).from, t = monthRange(addMonths(TODAY, -1)).to, avg = {};
    S.tx.forEach(function (x) { if (x.kind === 'spesa' && x.date >= f && x.date <= t) avg[x.catId] = (avg[x.catId] || 0) + x.cents; });
    var html = scrHead('Budget mensili', true) + '<div class="scrb"><p class="hint">Un limite di spesa al mese per categoria. Lascia vuoto per non avere limiti. Il conteggio riparte ogni primo del mese.</p>' +
      (cats.length ? '<div class="list">' + cats.map(function (c) {
        var a = Math.round((avg[c.id] || 0) / 3);
        return '<div class="row brow"><span class="ico">' + c.icon + '</span><label class="mid" for="b-' + c.id + '"><span class="nm">' + esc(c.name) + '</span><span class="sb">' + (a ? 'Media ultimi 3 mesi: ' + money(a) : 'Nessuna spesa negli ultimi 3 mesi') + '</span></label>' +
          '<input id="b-' + c.id + '" inputmode="decimal" autocomplete="off" placeholder="—" value="' + (c.budget > 0 ? amtStr(c.budget) : '') + '"></div>';
      }).join('') + '</div>' : '<p class="empty">Nessuna categoria di spesa.</p>') + '</div>' +
      '<div class="scrf"><p class="msg" id="b-msg" role="alert"></p><button class="btn" data-act="savebud">Salva budget</button></div>';
    pushLayer('screen', 'budgets', html, {});
  }
  function saveBudgets() {
    var lay = layerOf('budgets'); if (!lay) return;
    var err = msgOf(lay, '#b-msg'), next = {}, bad = '';
    S.cats.forEach(function (c) {
      if (c.kind !== 'spesa' || bad) return;
      var i = lay.el.querySelector('#b-' + c.id); if (!i) return;
      var raw = i.value.trim(); if (!raw) { next[c.id] = 0; return; }
      var v = parseCents(raw); if (v === null || v <= 0) bad = c.name; else next[c.id] = v;
    });
    if (bad) return err('Importo non valido per «' + bad + '».');
    var old = {}; S.cats.forEach(function (c) { if (c.budget) old[c.id] = c.budget; });
    S.cats.forEach(function (c) { if (hasK(next, c.id)) { if (next[c.id] > 0) c.budget = next[c.id]; else delete c.budget; } });
    popLayer(); toast('Budget salvati', function () { S.cats.forEach(function (c) { if (old[c.id]) c.budget = old[c.id]; else delete c.budget; }); });
  }

  /* ---------- obiettivi di risparmio (campo goal del conto: { cents, date }) ---------- */
  function goalOk(type) { return type === 'risparmio' || type === 'liquidita'; }
  function goalInfo(a) {
    var g = a.goal, bal = balance(a.id), left = Math.max(0, g.cents - bal), r = { a: a, bal: bal, target: g.cents, left: left, ratio: g.cents > 0 ? Math.max(0, bal) / g.cents : 0, per: 0, late: false, months: 0 };
    if (g.date && left > 0) {
      if (g.date < TODAY) r.late = true;
      else { r.months = Math.max(1, Math.ceil((dn(g.date) - dn(TODAY)) / 30.44)); r.per = Math.ceil(left / r.months); }
    }
    return r;
  }
  function goalText(x) {
    if (x.left <= 0) return 'Obiettivo raggiunto ✓';
    if (x.late) return 'Scadenza passata · mancano ' + money(x.left);
    if (x.per) return 'Mancano ' + money(x.left) + ' · ' + money(x.per) + ' al mese fino a ' + MESI_L[parseD(x.a.goal.date).getMonth()] + ' ' + parseD(x.a.goal.date).getFullYear();
    return 'Mancano ' + money(x.left);
  }
  function goalsSection() {
    var gs = S.accounts.filter(function (a) { return a.goal && goalOk(a.type); }); if (!gs.length) return '';
    return '<section class="sec"><h2>Obiettivi</h2><div class="card">' + gs.map(function (a) {
      var x = goalInfo(a);
      return '<button class="cbar budrow" data-act="acc" data-id="' + a.id + '"><div class="top"><span class="nm">' + a.icon + ' ' + esc(a.name) + '</span><span class="v">' + money(x.bal) + ' / ' + money(x.target) + '</span></div>' +
        pbar(x.ratio, x.left <= 0 ? 'done' : x.late ? 'warn' : 'goal') + '<span class="sb ' + (x.left <= 0 ? 'pos' : '') + '">' + goalText(x) + '</span></button>';
    }).join('') + '</div></section>';
  }

  /* ---------- elenco completo dei movimenti: ricerca e filtri ---------- */
  var TL_KIND = [['all', 'Tutti'], ['flow', 'Entrate e spese'], ['spesa', 'Spese'], ['entrata', 'Entrate'], ['giro', 'Giroconti'], ['other', 'Altro']];
  var TL_PER = [['all', 'Sempre'], ['month', 'Questo mese'], ['prev', 'Mese scorso'], ['3m', '3 mesi'], ['year', 'Anno'], ['custom', 'Date']];
  function openTxList(o) {
    o = o || {};
    var st = { q: '', kind: o.kind || 'all', acc: o.acc || '', cat: o.cat || '', per: o.per || 'all', from: o.from || monthRange(TODAY).from, to: o.to || TODAY, min: '', max: '', more: !!(o.acc || o.cat), limit: 150, accs: o.accs && o.accs.length ? o.accs.slice() : null };
    var html = scrHead('Movimenti', true) + '<div class="scrb" id="tl-body">' +
      '<input type="search" id="tl-q" data-in="txl" autocomplete="off" enterkeyhint="search" placeholder="Cerca nota, categoria, conto, importo…" aria-label="Cerca nei movimenti">' +
      '<div id="tl-ctl" class="fcol" style="gap:10px"></div><p class="cap" id="tl-sum" aria-live="polite"></p><div id="tl-res"></div></div>' +
      '<div class="scrf"><button class="btn ghost" data-act="tlcsv">Esporta questi movimenti (CSV)</button></div>';
    pushLayer('screen', 'txlist', html, st, { refresh: function () { txlDraw(true); } });
    txlDraw(true);
  }
  function txlCtl(st) {
    var nf = (st.acc ? 1 : 0) + (st.cat ? 1 : 0) + (st.min ? 1 : 0) + (st.max ? 1 : 0) + (st.accs ? 1 : 0);
    var h = '<div class="chips" role="tablist" aria-label="Tipo">' + TL_KIND.map(function (k) { return '<button class="chip ' + (st.kind === k[0] ? 'on' : '') + '" data-act="tlkind" data-k="' + k[0] + '" role="tab" aria-selected="' + (st.kind === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>';
    h += '<div class="chips" role="tablist" aria-label="Periodo">' + TL_PER.map(function (k) { return '<button class="chip ' + (st.per === k[0] ? 'on' : '') + '" data-act="tlper" data-k="' + k[0] + '" role="tab" aria-selected="' + (st.per === k[0]) + '">' + k[1] + '</button>'; }).join('') + '</div>';
    if (st.per === 'custom') h += '<div class="dates"><div class="fld"><label for="tl-from">Dal</label><input type="date" id="tl-from" data-chg="txl" max="' + TODAY + '" value="' + st.from + '"></div><div class="fld"><label for="tl-to">Al</label><input type="date" id="tl-to" data-chg="txl" max="' + TODAY + '" value="' + st.to + '"></div></div>';
    if (st.accs) h += '<button class="chip on tog" data-act="tlaccsx">' + st.accs.length + (st.accs.length === 1 ? ' conto' : ' conti') + ' dall’Analisi ✕</button>';
    h += '<div class="sech"><button class="tbtn" data-act="tlmore" aria-expanded="' + st.more + '">' + svg('sliders') + 'Filtri' + (nf ? ' (' + nf + ')' : '') + '</button>' + (nf || st.q || st.kind !== 'all' || st.per !== 'all' ? '<button class="lnk" data-act="tlreset">Azzera</button>' : '') + '</div>';
    if (st.more) {
      var cats = S.cats.slice().sort(function (a, b) { return a.kind === b.kind ? (a.name < b.name ? -1 : 1) : a.kind === 'spesa' ? -1 : 1; });
      h += '<div class="fgrid">' + fld('Conto', '<select id="tl-acc" data-chg="txl"><option value="">Tutti i conti</option>' + S.accounts.map(function (a) { return '<option value="' + a.id + '"' + (st.acc === a.id ? ' selected' : '') + '>' + esc(a.icon + ' ' + a.name) + '</option>'; }).join('') + '</select>', 'tl-acc') +
        fld('Categoria', '<select id="tl-cat" data-chg="txl"><option value="">Tutte</option><option value="-"' + (st.cat === '-' ? ' selected' : '') + '>Senza categoria</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (st.cat === c.id ? ' selected' : '') + '>' + esc(c.icon + ' ' + c.name) + (c.kind === 'entrata' ? ' (entrata)' : '') + '</option>'; }).join('') + '</select>', 'tl-cat') + '</div>' +
        '<div class="fgrid">' + fld('Importo da', '<input id="tl-min" data-in="txl" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(st.min) + '">', 'tl-min') + fld('fino a', '<input id="tl-max" data-in="txl" inputmode="decimal" autocomplete="off" placeholder="∞" value="' + esc(st.max) + '">', 'tl-max') + '</div>';
    }
    return h;
  }
  function txlRange(st) {
    if (st.per === 'month') return monthRange(TODAY);
    if (st.per === 'prev') return monthRange(addMonths(TODAY, -1));
    if (st.per === '3m') return { from: addDays(TODAY, -90), to: TODAY };
    if (st.per === 'year') return { from: TODAY.slice(0, 4) + '-01-01', to: TODAY };
    if (st.per === 'custom') return { from: st.from, to: st.to };
    return null;
  }
  function txText(t) {
    var c = cat(t.catId), p = t.posId ? posById(t.posId) : null, k = { spesa: 'spesa', entrata: 'entrata', giro: 'giroconto', rett: 'correzione saldo', inv: t.dir === 'sell' ? 'vendita' : 'acquisto' }[t.kind] || '';
    return fold([t.note, c ? c.name : '', accName(t.accId), t.toId ? accName(t.toId) : '', p ? p.name : '', k, amtStr(Math.abs(t.cents)), dayLabel(t.date), t.date.split('-').reverse().join('/')].join(' '));
  }
  function txlFilter(st) {
    var r = txlRange(st), toks = fold(st.q).split(/\s+/).filter(Boolean), mn = st.min ? parseCents(st.min) : null, mx = st.max ? parseCents(st.max) : null;
    return sortTx(S.tx.filter(function (t) {
      if (r && (t.date < r.from || t.date > r.to)) return false;
      if (st.kind === 'other' ? (t.kind !== 'rett' && t.kind !== 'inv') : st.kind === 'flow' ? (t.kind !== 'spesa' && t.kind !== 'entrata') : st.kind !== 'all' && t.kind !== st.kind) return false;
      if (st.acc && t.accId !== st.acc && t.toId !== st.acc) return false;
      if (st.accs && st.accs.indexOf(t.accId) < 0) return false;
      if (st.cat === '-' ? !((t.kind === 'spesa' || t.kind === 'entrata') && !cat(t.catId)) : st.cat && t.catId !== st.cat) return false;
      var a = Math.abs(t.cents);
      if (mn !== null && a < mn) return false;
      if (mx !== null && a > mx) return false;
      if (toks.length) { var h = txText(t); for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false; }
      return true;
    }));
  }
  function txlDraw(full) {
    var lay = layerOf('txlist'); if (!lay) return;
    var st = lay.st, el = lay.el;
    if (full) el.querySelector('#tl-ctl').innerHTML = txlCtl(st);
    var list = txlFilter(st), inc = 0, exp = 0;
    list.forEach(function (t) { if (t.kind === 'entrata') inc += t.cents; else if (t.kind === 'spesa') exp += t.cents; });
    lay.data = list;
    el.querySelector('#tl-sum').textContent = (list.length === 1 ? '1 movimento' : list.length + ' movimenti') + (inc ? ' · entrate ' + money(inc) : '') + (exp ? ' · spese ' + money(exp) : '');
    var h = '', lastM = '', shown = list.slice(0, st.limit);
    shown.forEach(function (t) {
      var m = t.date.slice(0, 7);
      if (m !== lastM) { if (lastM) h += '</div>'; var d = parseD(t.date); h += '<h2 class="tlm">' + MESI_L[d.getMonth()] + ' ' + d.getFullYear() + '</h2><div class="list">'; lastM = m; }
      h += txRow(t, null);
    });
    if (lastM) h += '</div>';
    if (!list.length) h = '<p class="empty">Nessun movimento con questi filtri.</p>';
    if (list.length > shown.length) h += '<button class="btn ghost" data-act="tlnext" style="margin-top:10px">Mostra altri ' + Math.min(300, list.length - shown.length) + '</button>';
    el.querySelector('#tl-res').innerHTML = h;
  }
  function txlRead() {
    var lay = layerOf('txlist'); if (!lay) return null;
    var st = lay.st, g = function (s) { return lay.el.querySelector(s); };
    st.q = g('#tl-q').value;
    if (g('#tl-acc')) st.acc = g('#tl-acc').value;
    if (g('#tl-cat')) st.cat = g('#tl-cat').value;
    if (g('#tl-min')) st.min = g('#tl-min').value.trim();
    if (g('#tl-max')) st.max = g('#tl-max').value.trim();
    if (g('#tl-from')) { var f = g('#tl-from').value, t = g('#tl-to').value; if (f && t) { if (f > t) t = f; st.from = f; st.to = t; } }
    st.limit = 150; return st;
  }

  /* ---------- esportazione CSV (Excel/Numbers in italiano: separatore «;», decimali con la virgola) ---------- */
  function csvText(v) { var s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = '\'' + s; return /[";\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function csvNum(c) { return (c < 0 ? '-' : '') + Math.floor(Math.abs(c) / 100) + ',' + pad(Math.abs(c) % 100); }
  function csvOf(list) {
    var K = { spesa: 'Spesa', entrata: 'Entrata', giro: 'Giroconto', rett: 'Correzione saldo' };
    var rows = [['Data', 'Tipo', 'Importo', 'Valuta', 'Conto', 'Conto di destinazione', 'Categoria', 'Investimento', 'Nota', 'Ricorrente'].join(';')];
    list.forEach(function (t) {
      var c = cat(t.catId), p = t.posId ? posById(t.posId) : null;
      var amt = t.kind === 'giro' ? t.cents : effect(t, t.accId);
      var kind = t.kind === 'inv' ? (t.dir === 'sell' ? 'Vendita investimento' : 'Acquisto investimento') : K[t.kind] || t.kind;
      rows.push([t.date.split('-').reverse().join('/'), csvText(kind), csvNum(amt), S.cur, csvText(accName(t.accId)), csvText(t.toId ? accName(t.toId) : ''), csvText(c ? c.name : ''), csvText(p ? p.name : ''), csvText(t.note), t.rule ? 'sì' : 'no'].join(';'));
    });
    return '﻿' + rows.join('\r\n') + '\r\n';
  }
  function exportCsv(list, name) {
    if (!list.length) { toast('Nessun movimento da esportare.'); return; }
    deliverFile(csvOf(list), name, ['text/csv', 'text/plain'], 'Movimenti UFinance', function (how) { toast(how === 'share' ? 'File CSV condiviso.' : 'File CSV scaricato.'); });
  }

  /* ---------- aggiornamento dei valori: guidato, un investimento alla volta ---------- */
  function pxShort(px) { return S.hide ? '•••• ' + SYM[S.cur] : (px / 1e6).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' ' + SYM[S.cur]; }
  function lastPx(p) { return p.prices.length ? p.prices[p.prices.length - 1] : null; }
  function isAuto(p) { return isCry(p) && !!S.autoCry && !!p.cgId; }
  function pxStale(p) { var l = lastPx(p); return !!l && posQtyAt(p, TODAY) > 0 && l.d < addDays(TODAY, isAuto(p) ? -2 : -7); }
  function agoL(d) { var n = dn(TODAY) - dn(d); return n <= 0 ? 'oggi' : n === 1 ? 'ieri' : n + ' giorni fa'; }
  function unitOf(p) { return isCry(p) ? 'unità' : 'quota'; }
  function openPxAll() {
    var ids = S.pos.filter(function (p) { var l = lastPx(p); return posQtyAt(p, TODAY) > 0 && !(isAuto(p) && l && l.d === TODAY); }).map(function (p) { return p.id; });
    if (!ids.length) { toast(S.pos.length ? 'Valori già aggiornati.' : 'Nessun investimento posseduto.'); return; }
    var lay = pushLayer('screen', 'pxwiz', scrHead('Aggiorna valori', false) + '<div class="scrb" id="w-body"></div><div class="scrf"><p class="msg" id="w-msg" role="alert"></p><div class="btnrow"><button class="btn ghost" data-act="pxwskip">Salta</button><button class="btn" id="w-next" data-act="pxwnext">Avanti</button></div></div>',
      { ids: ids, i: 0, mode: 'val', done: 0, snap: snapAll() });
    lay.el.classList.add('fixed');
    pxwDraw();
  }
  function pxwDraw() {
    var lay = layerOf('pxwiz'); if (!lay) return;
    var st = lay.st, p = posById(st.ids[st.i]); if (!p) { pxwStep(); return; }
    var q = posQtyAt(p, TODAY), l = lastPx(p), lv = l ? valCents(q, l.px) : 0, val = st.mode === 'val';
    lay.el.querySelector('#w-body').innerHTML = '<p class="cap" style="text-align:center">' + (st.i + 1) + ' di ' + st.ids.length + '</p>' +
      '<div class="card prev"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + qtyStr(q, p) + ' ' + esc(unitL(p)) + ' · ' + esc(posTag(p)) + '</span></span></div>' +
      (l ? '<div class="kv"><span>Ultimo valore</span><span>' + money(lv) + ' · ' + agoL(l.d) + '</span></div>' : '') +
      '<div class="fld"><label for="w-in" class="wq">' + (val ? 'Quanto vale oggi la posizione?' : 'Prezzo di oggi per 1 ' + unitOf(p)) + '</label>' +
      '<input id="w-in" class="bigin" data-in="pxw" inputmode="decimal" autocomplete="off" placeholder="' + (l && !S.hide ? esc(val ? amtStr(lv) : pxInput(l.px)) : '0,00') + '">' +
      '<p class="hint" id="w-hint">' + (val ? 'Il numero che vedi nell’app della banca o del broker.' : '') + '</p></div>' +
      '<button class="lnk" data-act="pxwmode" style="align-self:flex-start">' + (val ? 'Conosco il prezzo per ' + unitOf(p) : 'Conosco il valore totale') + '</button>';
    lay.el.querySelector('#w-next').textContent = st.i === st.ids.length - 1 ? 'Salva e chiudi' : 'Avanti';
    var m = lay.el.querySelector('#w-msg'); m.textContent = ''; m.className = 'msg';
    var inp = lay.el.querySelector('#w-in'); try { inp.focus({ preventScroll: true }); } catch (e) {}
  }
  // prezzo per quota ricavato dall'input (valore totale o prezzo): null se vuoto, -1 se non valido
  function pxwPx(st, p, raw) {
    if (!raw) return null;
    if (st.mode === 'px') { var v = parsePx(raw); return v === null || v <= 0 || v > PMAX ? -1 : v; }
    var c = parseCents(raw), q = posQtyAt(p, TODAY); if (c === null || c <= 0 || q <= 0) return -1;
    var x = lotPx(c, q); return x > PMAX ? -1 : x;
  }
  function pxwHint() {
    var lay = layerOf('pxwiz'); if (!lay) return;
    var st = lay.st, p = posById(st.ids[st.i]); if (!p) return;
    var raw = lay.el.querySelector('#w-in').value.trim(), px = pxwPx(st, p, raw), h = lay.el.querySelector('#w-hint'), l = lastPx(p), q = posQtyAt(p, TODAY);
    var wm = lay.el.querySelector('#w-msg'); wm.textContent = ''; wm.className = 'msg';
    if (px === null) { h.textContent = st.mode === 'val' ? 'Il numero che vedi nell’app della banca o del broker.' : ''; return; }
    if (px < 0) { h.textContent = 'Importo non valido.'; return; }
    var nv = valCents(q, px), lv = l ? valCents(q, l.px) : 0;
    h.textContent = (st.mode === 'val' ? 'Prezzo per ' + unitOf(p) + ': ' + pxShort(px) : 'Valore della posizione: ' + money(nv)) + (lv > 0 ? ' · ' + pctS(chgPct(lv, nv)) + ' dall’ultimo aggiornamento' : '');
  }
  function pxwNext(skip) {
    var lay = layerOf('pxwiz'); if (!lay) return;
    var st = lay.st, p = posById(st.ids[st.i]);
    if (!skip && p) {
      var raw = lay.el.querySelector('#w-in').value.trim(), px = pxwPx(st, p, raw);
      if (px === -1) { var m = lay.el.querySelector('#w-msg'); m.textContent = 'Importo non valido: correggilo o tocca «Salta».'; m.className = 'msg bad'; return; }
      if (px) { setPrice(p, TODAY, px, false); st.done += 1; touch(); }
    }
    pxwStep();
  }
  function pxwStep() {
    var lay = layerOf('pxwiz'); if (!lay) return;
    var st = lay.st; st.i += 1; st.mode = 'val';
    if (st.i < st.ids.length) { pxwDraw(); return; }
    var snap = st.snap, n = st.done; popLayer();
    if (n) toast(n === 1 ? '1 valore aggiornato' : n + ' valori aggiornati', function () { restoreAll(snap); });
  }

  /* ---------- modulo «Aggiorna valore» di un investimento: valore della posizione o prezzo per quota ---------- */
  function openPriceForm(posId, date) {
    var p = posById(posId); if (!p) return;
    var pt = date ? p.prices.filter(function (x) { return x.d === date; })[0] : null;
    var html = scrHead(pt ? 'Modifica prezzo' : 'Aggiorna valore', !!pt) + '<div class="scrb"><div class="card prev"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + esc(posTag(p)) + '</span></span></div>' +
      fld('Data', '<input type="date" id="x-date" max="' + TODAY + '" value="' + (pt ? pt.d : TODAY) + '">', 'x-date') + '<div id="x-form" class="fcol"></div>' +
      '</div><div class="scrf"><p class="msg" id="x-msg" role="alert"></p><button class="btn" data-act="saveprice">Salva</button>' + (pt && p.prices.length > 1 ? '<button class="btn danger" data-act="delprice">Elimina</button>' : '') + '</div>';
    var lay = pushLayer('screen', 'price', html, { posId: posId, d0: pt ? pt.d : '', mode: pt ? 'px' : 'val', px0: pt ? pt.px : 0 });
    priceForm(lay);
  }
  function priceForm(lay) {
    var st = lay.st, p = posById(st.posId), d = lay.el.querySelector('#x-date').value || TODAY, q = posQtyAt(p, d), val = st.mode === 'val' && q > 0;
    var keep = lay.el.querySelector('#x-in') ? lay.el.querySelector('#x-in').value : (st.px0 ? pxInput(st.px0) : '');
    if (lay.el.querySelector('#x-in') && (lay.el.querySelector('#x-in').dataset.m !== (val ? 'val' : 'px'))) keep = '';
    lay.el.querySelector('#x-form').innerHTML = (q > 0 ? seg2('x-modes', 'xmode', 'm', val ? 'val' : 'px', [['val', 'Valore posizione'], ['px', 'Prezzo per ' + unitOf(p)]]) : '') +
      fld(val ? 'Quanto vale la posizione (' + SYM[S.cur] + ')' : 'Prezzo per 1 ' + unitOf(p) + ' (' + SYM[S.cur] + ')', '<input id="x-in" data-m="' + (val ? 'val' : 'px') + '" data-in="xpx" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + esc(keep) + '">', 'x-in') +
      '<p class="hint" id="x-hint"></p>';
    priceHint();
  }
  function priceHint() {
    var lay = layerOf('price'); if (!lay) return;
    var st = lay.st, p = posById(st.posId), d = lay.el.querySelector('#x-date').value || TODAY, q = posQtyAt(p, d), i = lay.el.querySelector('#x-in'), h = lay.el.querySelector('#x-hint');
    if (!i || !h) return;
    var raw = i.value.trim(), val = i.dataset.m === 'val';
    if (!raw) { h.textContent = q > 0 ? (val ? 'Il valore che vedi nell’app della banca o del broker. Quote al ' + shortD(d) + ': ' + qtyStr(q, p) + '.' : 'Possiedi ' + qtyStr(q, p) + ' ' + unitL(p) + ' al ' + shortD(d) + '.') : 'Nessuna quota posseduta in quella data: inserisci il prezzo.'; return; }
    if (val) { var c = parseCents(raw); h.textContent = c === null || c <= 0 ? 'Importo non valido.' : 'Prezzo per ' + unitOf(p) + ': ' + pxShort(lotPx(c, q)); }
    else { var x = parsePx(raw); h.textContent = x === null || x <= 0 ? 'Prezzo non valido.' : q > 0 ? 'Valore della posizione: ' + money(valCents(q, x)) : 'Nessuna quota posseduta in quella data: il prezzo resta nello storico.'; }
  }
  function savePrice() {
    var lay = layerOf('price'); if (!lay) return;
    var st = lay.st, p = posById(st.posId), err = msgOf(lay, '#x-msg'), d = lay.el.querySelector('#x-date').value, i = lay.el.querySelector('#x-in'), raw = i.value.trim(), px;
    var de = dateOk(d, null); if (de) return err(de);
    if (i.dataset.m === 'val') {
      var c = parseCents(raw), q = posQtyAt(p, d);
      if (c === null || c <= 0) return err('Valore non valido.');
      if (q <= 0) return err('Nessuna quota posseduta in quella data: inserisci il prezzo.');
      px = lotPx(c, q);
    } else { px = parsePx(raw); if (px === null || px <= 0) return err('Prezzo non valido.'); }
    if (px > PMAX) return err('Valore troppo alto: controlla l’importo.');
    var snap = snapAll();
    if (st.d0 && st.d0 !== d) p.prices = p.prices.filter(function (x) { return x.d !== st.d0; });
    setPrice(p, d, px, false); popLayer(); toast('Valore aggiornato: ' + money(posValue(p)), function () { restoreAll(snap); });
  }

  /* ---------- scheda dell'investimento ---------- */
  function openPosDetail(id) {
    if (!posById(id)) return;
    var lay = pushLayer('screen', 'posd', posdHtml(id), { id: id });
    lay.refresh = function () { if (!posById(id)) { popLayer(); return; } lay.el.querySelector('.scr').innerHTML = posdHtml(id); };
  }
  function posdHtml(id) {
    var p = posById(id), z = posStat(p), k = z.k, q = k.qty, l = lastPx(p), auto = isAuto(p), stale = pxStale(p);
    var avg = q > 0 ? lotPx(k.cost, q) : 0, lots = lotsSorted(p.lots).reverse(), pacs = S.rules.filter(function (r) { return r.type === 'pac' && r.posId === id; });
    var h = scrHead(p.name, true) + '<div class="scrb">';
    h += '<div class="posh"><span class="sb">' + esc(posTag(p)) + ' · ' + qtyStr(q, p) + ' ' + esc(unitL(p)) + '</span><div class="big">' + money(z.value) + '</div>' +
      '<div class="nwchg"><b class="' + (z.gain > 0 ? 'pos' : z.gain < 0 ? 'neg' : '') + '">' + moneyS(z.gain) + ' · ' + pctS(z.pct) + '</b></div>' +
      '<p class="sb">Hai versato ' + money(k.invested) + (k.proceeds ? ' e incassato ' + money(k.proceeds) + ' dalle vendite' : '') + '. Oggi vale ' + money(z.value) + '.</p></div>';
    // freschezza del valore
    if (q > 0) {
      h += '<div class="card fresh' + (stale ? ' old' : '') + '"><div class="fr1"><span>' + (auto ? (stale ? '⚠️ Prezzo automatico di ' : '⚡ Prezzo automatico · ') + (l ? agoL(l.d) : '—') : stale ? '⚠️ Valore di ' + (l ? agoL(l.d) : '—') : '🏷️ Valore aggiornato ' + (l ? agoL(l.d) : '—')) + '</span>' +
        (auto ? '<button class="tbtn" data-act="cgnow">Aggiorna ora</button>' : '<button class="tbtn pri" data-act="pricenew" data-id="' + id + '">Aggiorna valore</button>') + '</div>' +
        '<p class="sb">' + (auto ? 'Da CoinGecko (' + esc(p.cgName || p.cgId) + ')' + (CG.upd ? ' · prezzo delle ' + hhmm(CG.upd) : '') + (CG.err ? ' · ultimo tentativo non riuscito' : '') : stale ? 'Il guadagno mostrato usa il prezzo del ' + shortD(l.d) + ': aggiornalo per vederlo attuale.' : 'Prezzo per ' + unitOf(p) + ': ' + (l ? pxStr(l.px) : '—')) + '</p></div>';
      if (isCry(p) && S.autoCry && !p.cgId) h += '<button class="banner" data-act="cglink" style="text-align:left;width:100%">Non collegata a CoinGecko: tocca per cercarla.</button>';
    }
    h += '<div class="cells">' + cell('Prezzo medio di carico', q > 0 ? pxStr(avg) : '—', 'per ' + unitOf(p)) + cell('Prezzo attuale', l ? pxStr(l.px) : '—', l ? shortD(l.d) : '') +
      cell('Rendimento annuo', xirrStr(z.xirr), z.xirr === null ? 'dopo 90 giorni' : 'tiene conto delle date') + cell(k.proceeds ? 'Guadagno realizzato' : 'Versato', k.proceeds ? moneyS(k.realized) : money(k.invested), k.proceeds ? 'con le vendite' : 'commissioni comprese') + '</div>';
    h += '<button class="navrow card" data-act="posopen" data-chart="1" data-id="' + id + '" style="padding:0 16px"><span>📉 Andamento nel tempo</span><span class="r">' + svg('right') + '</span></button>';
    h += '<div class="btns four"><button class="btn ghost" data-act="lotnew" data-id="' + id + '" data-dir="buy">+ Acquisto</button><button class="btn ghost" data-act="lotnew" data-id="' + id + '" data-dir="sell">− Vendita</button><button class="btn ghost" data-act="pacnew" data-id="' + id + '">🔁 PAC</button></div>';
    h += '<section class="sec"><div class="sech"><h2>Operazioni</h2><button class="lnk" data-act="poslist" data-id="' + id + '">Tutte e storico prezzi</button></div>' + (lots.length ? '<div class="list">' + lots.slice(0, 8).map(function (x) {
      var sell = x.qty < 0;
      return '<button class="row" data-act="lotedit" data-id="' + esc(x.id) + '" data-pos="' + esc(id) + '"><span class="ico">' + (sell ? '➖' : '➕') + '</span><span class="mid"><span class="nm">' + (sell ? 'Vendita' : x.rule ? 'PAC' : 'Acquisto') + ' · ' + qtyStr(Math.abs(x.qty), p) + ' ' + esc(unitL(p)) + '</span><span class="sb">' + dayLabel(x.d) + ' · ' + pxStr(x.px) + (x.est ? ' · quantità stimata' : '') + '</span></span><span class="v">' + money(x.tot) + '</span></button>';
    }).join('') + '</div>' : '<p class="empty">Nessuna operazione.</p>') + '</section>';
    if (pacs.length) h += '<section class="sec"><h2>PAC</h2><div class="list">' + pacs.map(ruleRow).join('') + '</div></section>';
    h += '<button class="lnk" data-act="invhelp" style="align-self:flex-start">Come leggere questi numeri</button>';
    return h + '</div><div class="scrf"><button class="btn danger" data-act="delposopen" data-id="' + id + '">Elimina investimento…</button></div>';
  }

  /* ---------- prezzi automatici delle cripto (CoinGecko, solo se attivati) ---------- */
  // Prezzi cripto: CoinGecko aggiorna i dati dell'API pubblica ogni 60 secondi (docs.coingecko.com/reference/simple-price):
  // l'app li chiede all'apertura e poi ogni minuto mentre è aperta, mai dalla cache del browser.
  var CG = { at: 0, next: 0, fails: 0, upd: 0, err: '', busy: false, API: 'https://api.coingecko.com/api/v3/', EVERY: 60 * 1000 };
  var CG_ID = /^[a-z0-9][a-z0-9-]{0,99}$/;
  function cgGet(path) {
    var ctl = window.AbortController ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 10000);
    return fetch(CG.API + path, { signal: ctl ? ctl.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' })
      .then(function (r) { clearTimeout(t); if (!r.ok) throw { code: 'http_' + r.status }; return r.json(); }, function (e) { clearTimeout(t); throw e; });
  }
  // collega le cripto senza id: simbolo identico (o nome), la più capitalizzata
  async function cgLink() {
    var todo = S.pos.filter(function (p) { return isCry(p) && !p.cgId; }), n = 0;
    for (var i = 0; i < todo.length; i++) {
      var p = todo[i], qry = (p.sym || p.name).trim(); if (!qry) continue;
      try {
        var r = await cgGet('search?query=' + encodeURIComponent(qry)), coins = (r && Array.isArray(r.coins)) ? r.coins : [];
        var m = coins.filter(function (c) { return c && typeof c.id === 'string' && CG_ID.test(c.id) && (p.sym ? String(c.symbol).toUpperCase() === p.sym : fold(c.name) === fold(p.name)); })
          .sort(function (a, b) { return (a.market_cap_rank || 1e9) - (b.market_cap_rank || 1e9); })[0];
        if (m && posById(p.id)) { p.cgId = m.id; p.cgName = String(m.name || m.id).slice(0, 60); n++; }
      } catch (e) { CG.err = errCode(e); }
    }
    if (n) touch();
    return n;
  }
  async function cgFetch(force) {
    if (!S.autoCry || CG.busy) return 0;
    if (navigator.onLine === false) { CG.err = 'offline'; return 0; }
    if (!force && Date.now() < CG.next) return 0; // al massimo una richiesta al minuto; dopo un errore si aspetta di più
    if (!S.pos.some(isCry)) return 0;
    CG.busy = true;
    try {
      if (!CG.linked && S.pos.some(function (p) { return isCry(p) && !p.cgId; })) { CG.linked = true; await cgLink(); }
      var ps = S.pos.filter(function (p) { return isCry(p) && p.cgId && CG_ID.test(p.cgId); }); if (!ps.length) return 0;
      var cur = S.cur.toLowerCase(), ids = ps.map(function (p) { return p.cgId; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      var r = await cgGet('simple/price?ids=' + encodeURIComponent(ids.join(',')) + '&vs_currencies=' + cur + '&include_last_updated_at=true&precision=full'), n = 0, upd = 0;
      ps.forEach(function (p) {
        var v = r && r[p.cgId] && r[p.cgId][cur];
        if (typeof v !== 'number' || !isFinite(v) || v <= 0) return;
        var lu = r[p.cgId].last_updated_at; if (typeof lu === 'number' && lu > upd) upd = lu;
        var px = Math.round(v * 1e6); if (px <= 0 || px > PMAX || !posById(p.id)) return;
        var l = lastPx(p); if (l && l.d === TODAY && l.px === px) return;
        setPrice(p, TODAY, px, false); n++;
      });
      CG.at = Date.now(); CG.next = CG.at + CG.EVERY - 2000; CG.fails = 0; CG.err = ''; CG.retried = false; CG.upd = upd ? upd * 1000 : CG.at;
      var typing = document.activeElement && /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName); // non ridisegna mentre si scrive
      if (n) { touch(); if (PER.canWrite && !PER.conf && !typing) { render(true); L.slice().forEach(function (ly) { if ((ly.name === 'posd' || ly.name === 'nw') && L.indexOf(ly) >= 0 && ly.refresh) ly.refresh(); }); } }
      return n;
    } catch (e) {
      CG.err = errCode(e);
      // errore (429, rete, server): attesa crescente 1 → 2 → 5 → 15 minuti, azzerata al primo successo
      CG.fails++; CG.next = Date.now() + [1, 2, 5, 15][Math.min(CG.fails, 4) - 1] * 60000;
      // troppe richieste (limite del piano gratuito di CoinGecko): un solo nuovo tentativo dopo 30 secondi
      if (CG.err === 'http_429' && !CG.retried) { CG.retried = true; setTimeout(function () { cgFetch(true); }, 30000); }
      return 0;
    }
    finally { CG.busy = false; }
  }
  // Aggiornamento automatico ogni minuto mentre l'app è aperta e visibile (nessuna richiesta in background o offline).
  setInterval(function () { if (document.visibilityState === 'visible' && PER.canWrite && S.autoCry && S.pos.some(isCry)) cgFetch(false); }, 15000); // controlla spesso, chiede al massimo una volta al minuto
  async function cgEnable(on) {
    S.autoCry = !!on; touch(); render();
    if (!on) { toast('Prezzi cripto automatici disattivati.'); return; }
    if (navigator.onLine === false) { toast('Attivati: si aggiorneranno quando c’è rete.'); return; }
    toast('Collego le cripto a CoinGecko…');
    var linked = await cgLink(), got = await cgFetch(true), miss = S.pos.filter(function (p) { return isCry(p) && !p.cgId; }).length;
    toast(CG.err && !got ? 'CoinGecko non risponde: riprovo alla prossima apertura.' : (got ? 'Prezzi cripto aggiornati.' : 'Prezzi già aggiornati.') + (miss ? ' ' + miss + ' non trovate: controlla il simbolo.' : ''));
    render();
  }
  function sheetInvHelp() {
    pushLayer('sheet', 'invhelp', shHead('Come leggere i numeri') + '<div class="guide">' +
      '<h3>Valore</h3><p>Quote possedute × ultimo prezzo. Per aggiornarlo basta inserire quanto vale la posizione nell’app del broker («Aggiorna valori»): il prezzo per quota lo calcola l’app. Le cripto possono aggiornarsi da sole (Impostazioni → Investimenti).</p>' +
      '<h3>Versato</h3><p>Tutto ciò che hai pagato per gli acquisti, commissioni comprese.</p>' +
      '<h3>Guadagno</h3><p>Valore + incassi delle vendite − versato. La percentuale è calcolata sul versato.</p>' +
      '<h3>Rendimento annuo</h3><p>Tiene conto di quando hai versato i soldi (metodo XIRR): confrontabile con un tasso annuo. Compare dopo 90 giorni dal primo acquisto.</p>' +
      '<h3>Prezzo medio di carico</h3><p>Quanto ti è costata in media ogni quota ancora posseduta (costo medio ponderato).</p>' +
      '<h3>PAC</h3><p>Acquisti automatici a cadenza fissa. La quantità è stimata con il prezzo di quel giorno: correggila con quella del broker toccando l’operazione (segnata «stima»).</p>' +
      '</div><button class="btn" data-act="close">Ho capito</button>');
  }

  /* ---------- primi passi e guida ---------- */
  function guideSteps() {
    return [
      { k: 'acc', t: 'Crea il primo conto', s: 'Dove tieni i soldi, con il saldo di oggi', done: S.accounts.length > 0, act: 'newacc' },
      { k: 'tx', t: 'Registra una spesa o un’entrata', s: 'Tasto + in basso a destra', done: S.tx.some(function (t) { return t.kind === 'spesa' || t.kind === 'entrata'; }), act: 'add' },
      { k: 'bud', t: 'Imposta un budget', s: 'Facoltativo: un limite al mese per categoria', done: S.cats.some(function (c) { return c.budget > 0; }), act: 'budgets' },
      { k: 'bk', t: 'Esporta un backup', s: 'I dati sono solo su questo telefono', done: !!S.lastBackup, act: 'export' }
    ];
  }
  function guideCard() {
    if (S.demo || S.guideDone) return '';
    var steps = guideSteps(), n = steps.filter(function (x) { return x.done; }).length;
    if (n === steps.length) return '';
    return '<section class="sec"><div class="sech"><h2>Primi passi · ' + n + ' di ' + steps.length + '</h2><button class="lnk" data-act="guidex">Nascondi</button></div><div class="card steps" style="padding:0 16px">' +
      steps.map(function (x, i) { return '<button class="step ' + (x.done ? 'done' : '') + '" data-act="' + x.act + '"' + (x.done ? ' disabled' : '') + '><span class="dot">' + (x.done ? svg('check') : i + 1) + '</span><span class="mid"><span class="nm">' + x.t + '</span><span class="sb">' + x.s + '</span></span></button>'; }).join('') +
      '<button class="step" data-act="guide" style="border-bottom:0"><span class="dot">?</span><span class="mid"><span class="nm">Come funziona l’app</span><span class="sb">Conti, giroconti, budget, investimenti</span></span></button></div></section>';
  }
  function openGuide() {
    pushLayer('screen', 'guide', scrHead('Come funziona', true) + '<div class="scrb guide">' +
      '<h3>💶 Conti</h3><p>Un conto è dove stanno i soldi: banca, contanti, carta prepagata. I tipi sono quattro: <b>Liquidità</b> (soldi da spendere), <b>Risparmi</b> (messi da parte), <b>Crediti</b> (soldi che qualcuno ti deve) e <b>Debiti</b> (carta di credito, prestiti, mutuo).</p>' +
      '<p>Quando crei un conto inserisci il saldo e la <b>data del saldo</b>. Per registrare spese passate, scegli una data precedente e il saldo che avevi quel giorno.</p>' +
      '<h3>➕ Movimenti</h3><p><b>Spesa</b> ed <b>entrata</b> cambiano il tuo patrimonio. Il <b>giroconto</b> sposta soldi tra due tuoi conti (es. dalla banca ai risparmi): non è né una spesa né un’entrata.</p>' +
      '<p>Se il saldo nell’app non coincide con quello reale, usa <b>Conti → conto → Correggi saldo</b>: la differenza diventa una correzione, non una spesa.</p>' +
      '<h3>🔁 Ricorrenze</h3><p>Affitto, stipendio, abbonamenti: nel nuovo movimento scegli «Ripeti». L’app li registra da sola alla scadenza, anche se l’hai tenuta chiusa.</p>' +
      '<h3>🎯 Budget e obiettivi</h3><p>Il <b>budget</b> è un limite di spesa al mese per categoria (Impostazioni → Budget mensili). L’<b>obiettivo</b> si imposta su un conto di risparmio: importo e data, e l’app calcola quanto mettere da parte ogni mese.</p>' +
      '<h3>📈 Investimenti</h3><p>Titoli, ETF e cripto con acquisti, vendite e PAC. Titoli ed ETF li aggiorni tu inserendo quanto valgono (Portfolio → Aggiorna valori); le cripto si aggiornano da sole da CoinGecko, se l’opzione è attiva nelle Impostazioni.</p>' +
      '<h3>🔒 I tuoi dati</h3><p>Restano solo su questo dispositivo, anche senza rete: niente account, niente server. L’unica connessione è per i prezzi delle cripto (CoinGecko riceve solo i nomi delle cripto, mai le quantità) e si può disattivare. Per questo è importante <b>esportare un backup</b> ogni tanto e salvarlo su File o iCloud.</p>' +
      '</div>', {});
  }

  /* ---------- movimenti a voce: dettatura → anteprima modificabile → conferma ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition || null, REC = null;
  var VK = [['spesa', 'Spesa'], ['entrata', 'Entrata'], ['giro', 'Giroconto'], ['prestito', 'Prestito']];
  function openVoice() {
    if (!S.accounts.length) { toast('Crea prima un conto.'); return; }
    var html = scrHead('Dillo a voce', false) + '<div class="scrb" id="v-body">' +
      (SR ? '<button class="micbtn" id="v-mic" data-act="vmic"><span class="mico">' + svg('mic') + '</span><span id="v-mlab">Tocca e parla</span></button>' : '') +
      '<textarea id="v-text" data-in="vtext" rows="3" placeholder="Es. «Ho pagato 12 euro di pizza con la carta e ieri ho ricevuto 50 euro da Marco»" aria-label="Cosa hai speso o ricevuto"></textarea>' +
      '<p class="hint" id="v-hint">' + (SR ? 'Parla in modo naturale: anche più movimenti nella stessa frase.' : 'Scrivi, oppure detta con il microfono della tastiera.') + '</p>' +
      '<button class="btn ghost" data-act="vparse">Analizza</button><div id="v-res" class="fcol"></div></div>' +
      '<div class="scrf"><p class="msg" id="v-msg" role="alert"></p><button class="btn" id="v-ok" data-act="vok" disabled>Conferma</button></div>';
    pushLayer('screen', 'voice', html, { items: [] });
  }
  function voiceErr(t) { var lay = layerOf('voice'); if (!lay) return; var m = lay.el.querySelector('#v-msg'); m.textContent = t; m.className = t ? 'msg bad' : 'msg'; }
  function micState(on) {
    var lay = layerOf('voice'); if (!lay) return; var b = lay.el.querySelector('#v-mic'); if (!b) return;
    b.classList.toggle('on', on); lay.el.querySelector('#v-mlab').textContent = on ? 'Ti ascolto… tocca per fermare' : 'Tocca e parla';
  }
  function voiceStop() { if (REC) { try { REC.abort(); } catch (e) {} REC = null; } }
  function voiceMic() {
    var lay = layerOf('voice'); if (!lay || !SR) return;
    if (REC) { try { REC.stop(); } catch (e) {} return; }
    var ta = lay.el.querySelector('#v-text'), base = ta.value.trim(), fin = '';
    voiceErr('');
    try { REC = new SR(); } catch (e) { REC = null; voiceErr('Riconoscimento vocale non disponibile: detta con il microfono della tastiera.'); return; }
    var rec = REC;
    rec.lang = 'it-IT'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    rec.onresult = function (e) {
      if (!layerOf('voice')) return;
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) { var t = e.results[i][0].transcript; if (e.results[i].isFinal) fin += t; else interim += t; }
      ta.value = ((base ? base + ' ' : '') + fin + interim).trim();
    };
    rec.onerror = function (e) {
      var c = e && e.error; if (c === 'aborted') return;
      voiceErr(c === 'not-allowed' || c === 'service-not-allowed' ? 'Microfono non consentito: abilitalo, oppure detta con il microfono della tastiera.' : c === 'no-speech' ? 'Non ho sentito nulla: riprova.' : c === 'network' ? 'Il riconoscimento vocale richiede la rete: detta con il microfono della tastiera.' : 'Riconoscimento non riuscito: riprova o scrivi.');
    };
    rec.onend = function () { if (REC === rec) REC = null; micState(false); if (layerOf('voice') && fin.trim()) voiceParse(); };
    try { rec.start(); micState(true); } catch (e) { REC = null; voiceErr('Non riesco ad avviare il microfono: riprova.'); }
  }
  // conto proposto di default per un nuovo movimento: l'ultimo usato, ma mai un conto di credito
  function defAccId() {
    var la = acc(S.lastAcc); if (la && la.type !== 'credito') return la.id;
    return (S.accounts.filter(function (a) { return a.type === 'liquidita'; })[0] || S.accounts.filter(function (a) { return a.type !== 'credito'; })[0] || S.accounts[0]).id;
  }
  function voiceCtx() {
    var def = defAccId();
    return { today: TODAY, defAcc: def, accounts: S.accounts.map(function (a) { return { id: a.id, name: a.name, type: a.type, bal: balance(a.id) }; }), cats: S.cats.map(function (c) { return { id: c.id, name: c.name, kind: c.kind }; }) };
  }
  var CAT_ICON = { Salute: '💊', Alimentari: '🛒', Ristoranti: '🍽️', Trasporti: '🚌', Casa: '🏠', Abbonamenti: '📱', Svago: '🎬', Stipendio: '💼', Rimborsi: '🧾', Regali: '🎁', Shopping: '🛍️', Animali: '🐶', Sport: '🏋️', Viaggi: '✈️', Istruzione: '📚', Auto: '🚗' };
  function voiceParse() {
    var lay = layerOf('voice'); if (!lay) return;
    var txt = lay.el.querySelector('#v-text').value.trim();
    if (!txt) { voiceErr('Di’ o scrivi cosa hai speso o ricevuto.'); return; }
    if (!window.UFVoice) { voiceErr('Riconoscimento delle frasi non disponibile.'); return; }
    voiceErr('');
    var vc = voiceCtx();
    lay.st.items = UFVoice.parse(txt.slice(0, 1000), vc).slice(0, 20).map(function (it) {
      if (!acc(it.accId) && !(it.accId === '__newacc__' && it.newFrom)) it.accId = vc.defAcc;
      if (it.catId === '__newcat__' && !it.newCat) it.catId = '';
      if (it.kind === 'giro' && !it.loan && !(it.toId === '__newacc__' && it.newFrom) && (!acc(it.toId) || it.toId === it.accId)) it.toId = otherAcc(it.accId);
      if (it.loan && it.toId !== '__new__' && !acc(it.toId)) it.toId = '__new__';
      return { k: it.loan ? 'prestito' : it.kind, amt: it.cents ? amtStr(it.cents) : '', accId: it.accId, toId: it.toId, catId: it.catId, date: it.date, note: it.note, pname: it.newAcc ? it.newAcc.name : (it.person || ''), newAccName: it.newFrom ? it.newFrom.name : '', newCatName: it.newCat ? it.newCat.name : '', newCatKind: it.newCat ? it.newCat.kind : '', accWarn: (it.warn || []).filter(function (w) { return /Conto|Contanti/.test(w); }).join(' · '), nWarn: (it.warn || []).filter(function (w) { return !/^Importo|Conto|Contanti/.test(w); }).join(' · ') };
    });
    voiceDraw();
  }
  function voiceCard(it, i) {
    var giro = it.k === 'giro' || it.k === 'prestito', cats = S.cats.filter(function (c) { return c.kind === it.k; });
    var amtBad = !(parseCents(it.amt || '') > 0);
    var h = '<div class="card vcard" data-i="' + i + '"><div class="vtop"><select data-vf="k" aria-label="Tipo">' + VK.map(function (k) { return '<option value="' + k[0] + '"' + (it.k === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') + '</select>' +
      '<input class="vamt' + (amtBad ? ' miss' : '') + '" data-vf="amt" data-in="vf" inputmode="decimal" autocomplete="off" placeholder="Importo" value="' + esc(it.amt || '') + '" aria-label="Importo"><button class="x" data-act="vdel" data-i="' + i + '" aria-label="Rimuovi">' + svg('x') + '</button></div>';
    var newA = it.newAccName ? '<option value="__newacc__"' + (it.accId === '__newacc__' ? ' selected' : '') + '>➕ Nuovo conto «' + esc(it.newAccName) + '»</option>' : '';
    h += '<div class="fgrid">' + fld(giro ? 'Da' : it.k === 'spesa' ? 'Pagato con' : 'Accreditato su', '<select data-vf="acc">' + newA + accOpts(it.accId) + '</select>');
    if (it.k === 'prestito') {
      var cr = S.accounts.filter(function (a) { return a.type === 'credito'; });
      h += fld('A (credito)', '<select data-vf="to"><option value="__new__"' + (it.toId === '__new__' ? ' selected' : '') + '>➕ Nuova persona</option>' + cr.map(function (a) { return '<option value="' + a.id + '"' + (it.toId === a.id ? ' selected' : '') + '>' + esc(a.icon + ' ' + a.name) + '</option>'; }).join('') + '</select>') + '</div>';
      if (it.toId === '__new__') h += fld('Nome della persona', '<input data-vf="pname" data-in="vf" maxlength="30" autocomplete="off" value="' + esc(it.pname || '') + '" placeholder="Es. Antonio">') + '<p class="hint">Verrà creato un conto di credito: i soldi prestati restano nel tuo patrimonio finché non te li restituisce.</p>';
    } else if (it.k === 'giro') h += fld('A', '<select data-vf="to">' + (it.newAccName ? '<option value="__newacc__"' + (it.toId === '__newacc__' ? ' selected' : '') + '>➕ Nuovo conto «' + esc(it.newAccName) + '»</option>' : '') + accOpts(it.toId && it.toId !== '__new__' && it.toId !== '__newacc__' ? it.toId : (it.toId === '__newacc__' ? '' : otherAcc(it.accId))) + '</select>') + '</div>';
    else h += fld('Categoria', '<select data-vf="cat">' + (it.newCatName && it.k === it.newCatKind ? '<option value="__newcat__"' + (it.catId === '__newcat__' ? ' selected' : '') + '>➕ Nuova «' + esc(it.newCatName) + '»</option>' : '') + '<option value=""' + (it.catId ? '' : ' selected') + '>Senza categoria</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === it.catId ? ' selected' : '') + '>' + esc(c.icon + ' ' + c.name) + '</option>'; }).join('') + '</select>') + '</div>';
    h += '<div class="fgrid">' + fld('Data', '<input type="date" data-vf="date" max="' + TODAY + '" value="' + it.date + '">') + fld('Nota', '<input data-vf="note" data-in="vf" maxlength="60" autocomplete="off" value="' + esc(it.note || '') + '">') + '</div>';
    var mk = [];
    if (it.accId === '__newacc__' || (it.k === 'giro' && it.toId === '__newacc__')) mk.push('il conto «' + it.newAccName + '» (liquidità, saldo iniziale 0)');
    if (it.catId === '__newcat__' && it.k === it.newCatKind) mk.push('la categoria «' + it.newCatName + '»');
    if (mk.length) h += '<p class="hint vnew">➕ Alla conferma verrà creat' + (mk.length > 1 ? 'i ' : (it.accId === '__newacc__' ? 'o ' : 'a ')) + esc(mk.join(' e ')) + '. Puoi sceglierne un altro dal menu.</p>';
    var w = []; if (amtBad) w.push('Importo da inserire'); if (it.accWarn) w.push(it.accWarn); if (it.nWarn && it.k === 'prestito' && it.toId === '__new__') w.push(it.nWarn); // solo se c'è il campo del nome
    return h + (w.length ? '<p class="vwarn">⚠️ ' + esc(w.join(' · ')) + '</p>' : '') + '</div>';
  }
  function voiceDraw() {
    var lay = layerOf('voice'); if (!lay) return;
    var items = lay.st.items, n = items.length, el = lay.el.querySelector('#v-res');
    el.innerHTML = n ? '<h2>Ho capito ' + (n === 1 ? '1 movimento' : n + ' movimenti') + ' · controlla e conferma</h2>' + items.map(voiceCard).join('') : (lay.st.parsed ? '<p class="empty">Nessun movimento riconosciuto: prova a dire l’importo e cosa hai pagato.</p>' : '');
    lay.st.parsed = true;
    if (n && !lay.st.shown) { lay.st.shown = true; try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) {} }
    var ok = lay.el.querySelector('#v-ok'); ok.disabled = !n; ok.textContent = n ? 'Conferma ' + (n === 1 ? '1 movimento' : n + ' movimenti') : 'Conferma';
  }
  function voiceSet(el, redraw) {
    var lay = layerOf('voice'), card = el.closest && el.closest('.vcard'); if (!lay || !card) return;
    var it = lay.st.items[+card.dataset.i], f = el.dataset.vf, v = el.value; if (!it) return;
    if (f === 'k') {
      it.k = v;
      if (v === 'prestito' && (!acc(it.toId) || acc(it.toId).type !== 'credito')) it.toId = '__new__';
      if (v === 'giro' && (!acc(it.toId) || it.toId === it.accId)) it.toId = otherAcc(it.accId);
      if ((v === 'spesa' || v === 'entrata') && it.catId && it.catId !== '__newcat__' && (!cat(it.catId) || cat(it.catId).kind !== v)) it.catId = '';
      if (it.catId === '__newcat__' && v !== it.newCatKind) it.catId = '';
      if (v === it.newCatKind && !it.catId && it.newCatName) it.catId = '__newcat__';
    } else if (f === 'acc') { it.accId = v; it.accWarn = ''; }
    else if (f === 'to') it.toId = v;
    else if (f === 'cat') it.catId = v;
    else if (f === 'date') it.date = v;
    else if (f === 'note') it.note = v;
    else if (f === 'pname') { it.pname = v; it.nWarn = ''; }
    else if (f === 'amt') { it.amt = v; el.classList.toggle('miss', !(parseCents(v || '') > 0)); }
    if (redraw) voiceDraw();
  }
  function voiceOk() {
    var lay = layerOf('voice'); if (!lay) return;
    var items = lay.st.items, errs = [];
    items.forEach(function (it, n) {
      var c = parseCents((it.amt || '').trim()), d = it.date, lab = '#' + (n + 1) + ' ';
      var a = it.accId === '__newacc__' && it.newAccName ? { id: '__newacc__', name: it.newAccName, openDate: d } : acc(it.accId); // conto da creare: parte dalla data del movimento
      if (c === null || c <= 0) return errs.push(lab + 'importo');
      if (!a) return errs.push(lab + 'conto');
      if (!dRange(d) || d > TODAY) return errs.push(lab + 'data');
      if (d < a.openDate) return errs.push(lab + 'data prima del saldo iniziale di «' + a.name + '»');
      if (it.k === 'giro' || it.k === 'prestito') {
        if (it.k === 'prestito' && it.toId === '__new__') { if (!(it.pname || '').trim()) errs.push(lab + 'nome della persona'); return; }
        var b = it.toId === '__newacc__' && it.newAccName ? { id: '__newacc__', name: it.newAccName, openDate: d } : acc(it.toId); if (!b || b.id === a.id) return errs.push(lab + 'scegli due conti diversi');
        if (d < b.openDate) return errs.push(lab + 'data prima del saldo iniziale di «' + b.name + '»');
      }
    });
    if (errs.length) return voiceErr('Da completare: ' + errs.join(', ') + '.');
    var snap = snapAll(), catSnap = JSON.parse(JSON.stringify(S.cats)), last = null, made = [];
    // conti e categorie proposti dalla voce: creati una volta sola (anche se usati da più movimenti)
    var newAccs = {}, newCats = {};
    function newAccFor(it) {
      var key = it.newAccName.trim().toLowerCase();
      if (!newAccs[key]) {
        var ex = S.accounts.filter(function (x) { return x.type !== 'credito' && x.name.toLowerCase() === key; })[0];
        if (ex) newAccs[key] = ex;
        else {
          var nm = it.newAccName.trim().slice(0, 30), k = 2, name = nm; while (S.accounts.some(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })) name = nm + ' (' + k++ + ')';
          var sb = subsOf('liquidita')[0], od = items.filter(function (y) { return y.newAccName && y.newAccName.trim().toLowerCase() === key && (y.accId === '__newacc__' || ((y.k === 'giro') && y.toId === '__newacc__')); }).map(function (y) { return y.date; }).sort()[0];
          newAccs[key] = { id: uid('a'), name: name, type: 'liquidita', sub: sb ? sb.id : '', icon: ICONS[3], color: COLORS[0], opening: 0, openDate: od };
          S.accounts.push(newAccs[key]); made.push('conto «' + name + '»');
        }
      }
      return newAccs[key].id;
    }
    items.forEach(function (it) {
      if (it.accId === '__newacc__' && it.newAccName) it.accId = newAccFor(it);
      if (it.k === 'giro' && it.toId === '__newacc__' && it.newAccName) it.toId = newAccFor(it);
      if (it.catId === '__newcat__' && it.newCatName && it.k === it.newCatKind) {
        var ck = it.k + '|' + it.newCatName.trim().toLowerCase(), cx = S.cats.filter(function (x) { return x.kind === it.k && x.name.toLowerCase() === it.newCatName.trim().toLowerCase(); })[0];
        if (!newCats[ck]) {
          if (cx) newCats[ck] = cx;
          else { newCats[ck] = { id: uid('c'), kind: it.k, name: it.newCatName.trim().slice(0, 24), icon: CAT_ICON[it.newCatName] || ICONS[19] }; S.cats.push(newCats[ck]); made.push('categoria «' + newCats[ck].name + '»'); }
        }
        it.catId = newCats[ck].id;
      } else if (it.catId === '__newcat__') it.catId = '';
    });
    items.forEach(function (it) {
      var c = parseCents(it.amt.trim()), to = it.toId;
      if (it.k === 'prestito' && to === '__new__') {
        var nm = it.pname.trim().replace(/\s+/g, ' ').slice(0, 30), ex = S.accounts.filter(function (x) { return x.type === 'credito' && x.name.toLowerCase() === nm.toLowerCase(); })[0];
        if (ex) to = ex.id;
        else {
          var name = nm, k = 2; while (S.accounts.some(function (x) { return x.name.toLowerCase() === name.toLowerCase(); })) name = nm + ' (' + k++ + ')';
          var sb = subsOf('credito')[0], na = { id: uid('a'), name: name, type: 'credito', sub: sb ? sb.id : '', icon: '🤝', color: '#9A5700', opening: 0, openDate: it.date };
          S.accounts.push(na); to = na.id;
        }
      }
      var tx = { id: uid('t'), kind: it.k === 'prestito' ? 'giro' : it.k, cents: c, accId: it.accId, date: it.date, note: (it.note || '').trim().slice(0, 60), ts: nextTs() };
      if (tx.kind === 'giro') tx.toId = to; else tx.catId = it.catId || '';
      S.tx.push(tx); last = tx;
    });
    // ultimo conto usato = il primo conto «vero» del gruppo (per una restituzione, quello che riceve i soldi)
    items.some(function (it) { var c = [it.accId, it.toId].filter(function (x) { return acc(x) && acc(x).type !== 'credito'; })[0]; if (c) S.lastAcc = c; return !!c; });
    var n = items.length; popLayer();
    toast((n === 1 ? '1 movimento registrato' : n + ' movimenti registrati') + (made.length ? ' · creat' + (made.length > 1 ? 'i ' : made[0].indexOf('conto') === 0 ? 'o ' : 'a ') + made.join(', ') : '') + budNote(last), function () { restoreAll(snap); if (made.some(function (m) { return m.indexOf('categoria') === 0; })) S.cats = catSnap; });
  }

  /* ---------- tutorial guidato (alla prima apertura; rivedibile da Impostazioni) ---------- */
  var TOUR = [
    { title: 'Benvenuto in UFinance', text: 'Ti mostro in pochi passi come tenere sotto controllo soldi, spese e investimenti. Meno di un minuto.' },
    { tab: 'home', sel: '.totalbtn', alt: '.hero', title: 'Il tuo patrimonio', text: 'Quanto possiedi in totale, meno i debiti. Toccalo per vedere un solo conto o un gruppo.' },
    { tab: 'home', sel: '#fabw .fab.add', title: 'Nuovo movimento', text: 'Registra spese, entrate e giroconti tra i tuoi conti, con il tastierino.' },
    { tab: 'home', sel: '#fabw .fab.mic', title: 'Oppure dillo a voce', text: '«Ho pagato 5 euro in farmacia»: l’app prepara il movimento, tu controlli e confermi.' },
    { tab: 'conti', sel: '[data-tab="conti"]', title: 'Conti', text: 'Banca, contanti, risparmi, carte e prestiti. Ogni conto parte dal saldo di un giorno a tua scelta.' },
    { tab: 'analisi', sel: '[data-tab="analisi"]', title: 'Analisi', text: 'Dove vanno i soldi: per giorno, mese o anno, per categoria e per conto.' },
    { tab: 'portfolio', sel: '[data-tab="portfolio"]', title: 'Investimenti', text: 'ETF, azioni e cripto. Aggiorni il valore come lo vedi nell’app del broker; le cripto si aggiornano da sole.' },
    { tab: 'settings', sel: '.navrow[data-act="budgets"]', title: 'Budget', text: 'Un limite di spesa al mese per categoria, con un avviso quando ti avvicini.' },
    { tab: 'settings', sel: '.navrow[data-act="export"]', title: 'I tuoi dati', text: 'Restano solo su questo telefono. Ogni tanto esporta un backup e salvalo su File o iCloud.' },
    { tab: 'home', title: 'Tutto pronto', text: '', last: true }
  ];
  var TOURST = null;
  function maybeTour() { if (S.tourDone || window.UF_TEST_NOTOUR || L.length || TOURST || document.body.classList.contains('boot')) return; startTour(); }
  function startTour() {
    if (TOURST) return;
    while (L.length) L.pop().el.remove(); lockPage(false);
    var el = document.createElement('div');
    el.id = 'tour'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Tutorial');
    el.innerHTML = '<div class="tour-hole"></div><div class="tour-card" aria-live="polite"></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-tour]'); e.stopPropagation(); if (!b) return;
      var k = b.dataset.tour;
      if (k === 'next') { if (TOURST.i >= TOUR.length - 1) tourEnd(true); else { TOURST.i += 1; tourShow(); } }
      else if (k === 'prev') { if (TOURST.i > 0) { TOURST.i -= 1; tourShow(); } }
      else if (k === 'skip') tourEnd(false);
      else if (k === 'acc') { tourEnd(true); openAccForm(null); }
    });
    document.body.appendChild(el);
    TOURST = { i: 0, el: el }; tourShow();
  }
  function tourTarget(s) {
    var t = s.sel ? document.querySelector(s.sel) : null;
    if ((!t || !t.getClientRects().length) && s.alt) t = document.querySelector(s.alt);
    return t && t.getClientRects().length ? t : null;
  }
  function tourShow() {
    var st = TOURST; if (!st) return;
    var s = TOUR[st.i], card = st.el.querySelector('.tour-card'), last = st.i === TOUR.length - 1;
    if (s.tab && S.tab !== s.tab) { S.tab = s.tab; render(true); }
    var t = tourTarget(s);
    if (t) t.scrollIntoView({ block: 'center' }); else window.scrollTo(0, 0);
    var txt = last ? (S.accounts.length ? 'Puoi rivedere il tutorial quando vuoi da Impostazioni → Aiuto.' : 'Inizia creando il tuo primo conto. Il tutorial resta in Impostazioni → Aiuto.') : s.text;
    card.innerHTML = '<div class="tour-dots">' + TOUR.map(function (x, i) { return '<i class="' + (i === st.i ? 'on' : '') + '"></i>'; }).join('') + '</div><h3>' + s.title + '</h3><p>' + txt + '</p>' +
      '<div class="tour-btns">' + (last ? '<span></span>' : '<button class="lnk" data-tour="skip">Salta</button>') + '<span class="tour-r">' +
      (st.i > 0 && !last ? '<button class="tbtn" data-tour="prev">Indietro</button>' : '') +
      (last && !S.accounts.length ? '<button class="tbtn pri" data-tour="acc">Crea il primo conto</button>' : '<button class="tbtn pri" data-tour="next">' + (st.i === 0 ? 'Iniziamo' : last ? 'Fine' : 'Avanti') + '</button>') + '</span></div>';
    tourPlace();
    try { card.querySelector('[data-tour="next"],[data-tour="acc"]').focus({ preventScroll: true }); } catch (e) {}
  }
  function tourPlace() {
    var st = TOURST; if (!st) return;
    var s = TOUR[st.i], t = tourTarget(s), hole = st.el.querySelector('.tour-hole'), card = st.el.querySelector('.tour-card');
    var W = window.innerWidth, H = window.innerHeight, cw = Math.min(340, W - 24), ch = card.offsetHeight || 180;
    card.style.width = cw + 'px';
    if (!t) {
      hole.style.cssText = 'left:' + (W / 2) + 'px;top:' + (H / 2) + 'px;width:0;height:0;';
      card.style.left = ((W - cw) / 2) + 'px'; card.style.top = Math.max(16, (H - ch) / 2) + 'px'; return;
    }
    var r = t.getBoundingClientRect(), p = 6;
    hole.style.cssText = 'left:' + (r.left - p) + 'px;top:' + (r.top - p) + 'px;width:' + (r.width + 2 * p) + 'px;height:' + (r.height + 2 * p) + 'px;border-radius:' + (Math.min(r.width, r.height) > 60 ? 16 : 999) + 'px;';
    var top = r.bottom + p + 14 + ch < H ? r.bottom + p + 14 : Math.max(12, r.top - p - 14 - ch);
    card.style.top = top + 'px'; card.style.left = Math.max(12, Math.min(W - cw - 12, r.left + r.width / 2 - cw / 2)) + 'px';
  }
  function tourEnd(done) {
    var st = TOURST; if (!st) return;
    st.el.remove(); TOURST = null;
    S.tourDone = true; S.tab = 'home'; render(); window.scrollTo(0, 0);
    if (!done) toast('Tutorial saltato. Lo trovi in Impostazioni → Aiuto.');
  }
  window.addEventListener('resize', function () { if (TOURST) tourPlace(); });

  /* ================= memoria: parte comune (formato dati, controlli, schermate) =================
     Nessun accesso diretto all'archivio: quello sta nel modulo specifico della build. */
  var SCHEMA = 8, APP_ID = 'ufinance'; // 8: budget nelle categorie, obiettivi nei conti, guida
  var ID_RE = /^[A-Za-z0-9_-]{1,40}$/, DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  function hash53(s) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16) + 'x' + s.length.toString(36);
  }
  function stable(o) {
    if (o === null || typeof o !== 'object') return JSON.stringify(o);
    if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
    return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(o[k]); }).join(',') + '}';
  }
  function withTimeout(p, ms) { return new Promise(function (res, rej) { var t = setTimeout(function () { rej({ code: 'timeout' }); }, ms); p.then(function (v) { clearTimeout(t); res(v); }, function (e) { clearTimeout(t); rej(e); }); }); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function errCode(e) { return (e && e.code) || (e && e.message) || 'unknown'; }
  function snapState() {
    return { schema: SCHEMA, subs: S.subs, cats: S.cats, accounts: S.accounts, gone: S.gone, tx: S.tx, pos: S.pos, rules: S.rules,
      prefs: { theme: S.theme, cur: S.cur, hide: !!S.hide, lastAcc: S.lastAcc || '', homeView: S.homeView || 'all', demo: !!S.demo, lastBackup: S.lastBackup || '', guideDone: !!S.guideDone, autoCry: S.autoCry !== false, tourDone: !!S.tourDone } };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function maxSeq(sn) {
    var m = 1000;
    function see(id) { var x = /(\d+)$/.exec(String(id || '')); if (x) m = Math.max(m, Number(x[1])); }
    ['subs', 'cats', 'accounts', 'gone', 'tx', 'rules'].forEach(function (k) { (sn[k] || []).forEach(function (o) { see(o.id); }); });
    (sn.pos || []).forEach(function (p) { see(p.id); (p.lots || []).forEach(function (l) { see(l.id); }); });
    return m;
  }
  function applySnap(sn) {
    var pr = sn.prefs || {};
    S.subs = sn.subs; S.cats = sn.cats; S.accounts = sn.accounts; S.gone = sn.gone; S.tx = sn.tx; S.pos = sn.pos; S.rules = sn.rules;
    if (pr.cur === 'EUR' || pr.cur === 'USD') S.cur = pr.cur;
    if (pr.theme === 'chiaro' || pr.theme === 'scuro') { S.theme = pr.theme; document.documentElement.setAttribute('data-uf', S.theme); }
    S.hide = !!pr.hide; S.demo = !!pr.demo; S.lastBackup = pr.lastBackup || ''; S.guideDone = !!pr.guideDone; S.autoCry = pr.autoCry !== false; S.tourDone = !!pr.tourDone;
    S.lastAcc = acc(pr.lastAcc) ? pr.lastAcc : null;
    S.homeView = pr.homeView || 'all';
    seq = Math.max(seq, maxSeq(sn));
    S.an.from = addDays(TODAY, -29); S.an.to = TODAY; S.an.offset = 0; S.an.accIds = null; S.an.sel = -1;
    savePrefs();
  }
  function emptyState() {
    S.accounts = []; S.gone = []; S.tx = []; S.pos = []; S.rules = []; S.demo = false; S.lastAcc = null; S.homeView = 'all'; S.lastBackup = ''; S.guideDone = false; S.autoCry = true; S.tourDone = false;
    baseData(); S.an.accIds = null; S.an.sel = -1;
  }
  // Controlli sui dati letti da file o archivio: niente markup nei testi, limiti di dimensione, date plausibili.
  var LIM = { subs: 500, cats: 500, accounts: 2000, gone: 5000, pos: 2000, rules: 5000, tx: 200000, lots: 100000, prices: 100000 };
  function txtOk(s, max) { return typeof s === 'string' && s.length <= max; }
  function iconOk(s) { return typeof s === 'string' && s.length > 0 && s.length <= 16 && !/[<>&"'`\\]/.test(s); }
  function colOk(s) { return typeof s === 'string' && /^#[0-9A-Fa-f]{6}$/.test(s); }
  function dRange(s) { return dOk(s) && s >= '1970-01-01' && s <= '2100-12-31'; }
  function dOk(s) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    var p = s.split('-').map(Number), d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2];
  }
  var QMAX = 9e15, PMAX = 1e13;
  function isQty(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && Math.abs(n) <= QMAX; }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n && Math.abs(n) <= 1e13; }
  function normalizeSnap(sn) {
    if (!sn || typeof sn !== 'object') return sn;
    ['subs', 'cats', 'accounts', 'gone', 'tx', 'pos', 'rules'].forEach(function (k) { if (sn[k] === undefined) sn[k] = []; });
    if (!sn.prefs || typeof sn.prefs !== 'object') sn.prefs = {};
    if (Array.isArray(sn.tx)) sn.tx.forEach(function (t, i) { if (t && typeof t === 'object') { if (typeof t.note !== 'string') t.note = ''; else if (t.note.length > 300) t.note = t.note.slice(0, 300); if (typeof t.ts !== 'number') t.ts = i + 1; } });
    // Schema 7: quantità da 1e-6 a 1e-8 e prezzi da 1e-4 a 1e-6 (per le cripto), tipo e simbolo dell'investimento, ISIN facoltativo.
    var old = !(sn.schema >= 7);
    if (Array.isArray(sn.pos)) sn.pos.forEach(function (p) {
      if (!p || typeof p !== 'object') return;
      if (!Array.isArray(p.lots)) p.lots = []; if (!Array.isArray(p.prices)) p.prices = [];
      if (old) {
        p.lots.forEach(function (l) { if (l && typeof l === 'object') { if (typeof l.qty === 'number') l.qty *= 100; if (typeof l.px === 'number') l.px *= 100; } });
        p.prices.forEach(function (x) { if (x && typeof x === 'object' && typeof x.px === 'number') x.px *= 100; });
      }
      if (p.kind !== 'crypto') p.kind = 'inv';
      if (typeof p.sym !== 'string') p.sym = '';
      if (p.isin === undefined || p.isin === null) p.isin = '';
    });
    if (old && typeof sn.schema === 'number') sn.schema = SCHEMA;
    // i prezzi devono essere in ordine di data (pxAt lo presume)
    if (Array.isArray(sn.pos)) sn.pos.forEach(function (p) { if (p && Array.isArray(p.prices)) p.prices.sort(function (a, b) { var x = a && a.d, y = b && b.d; return x < y ? -1 : x > y ? 1 : 0; }); });
    // Riparazione: movimenti di investimenti eliminati con «Tienili» (versioni precedenti) restano senza investimento collegato.
    if (Array.isArray(sn.tx) && Array.isArray(sn.pos)) {
      var pid = {}; sn.pos.forEach(function (p) { if (p && typeof p.id === 'string') pid[p.id] = 1; });
      sn.tx.forEach(function (t) { if (t && t.kind === 'inv' && typeof t.posId === 'string' && t.posId !== '' && !pid[t.posId]) { t.posId = ''; t.lotId = ''; if (!t.note) t.note = 'Investimento eliminato'; } });
    }
    return sn;
  }
  function validateSnap(sn) {
    var e = [];
    function bad(m) { if (e.length < 6) e.push(m); }
    if (!sn || typeof sn !== 'object') return ['Formato non riconosciuto.'];
    if (typeof sn.schema === 'number' && sn.schema > SCHEMA) return ['Backup creato da una versione più recente dell’app.'];
    var ok = true;
    ['subs', 'cats', 'accounts', 'gone', 'tx', 'pos', 'rules'].forEach(function (k) { if (!Array.isArray(sn[k])) { bad('Manca «' + k + '».'); ok = false; } });
    if (!ok) return e;
    var big = false; Object.keys(LIM).forEach(function (k) { if (sn[k] && sn[k].length > LIM[k]) big = true; });
    if (big) return ['Troppi elementi nel file.'];
    var seen = {};
    function uniq(kind, o) {
      if (!o || typeof o !== 'object' || typeof o.id !== 'string' || !ID_RE.test(o.id)) { bad(kind + ': identificativo non valido.'); return false; }
      var key = kind + ':' + o.id; if (seen[key]) { bad(kind + ': identificativo duplicato (' + o.id + ').'); return false; }
      seen[key] = 1; return true;
    }
    var accIds = {}, posIds = {}, txIds = {};
    sn.subs.forEach(function (x) { if (uniq('Sottotipologia', x) && (!txtOk(x.name, 100) || !hasK(TYPES, x.type))) bad('Sottotipologia non valida.'); });
    sn.cats.forEach(function (x) {
      if (uniq('Categoria', x) && (!txtOk(x.name, 100) || (x.kind !== 'spesa' && x.kind !== 'entrata') || !iconOk(x.icon))) bad('Categoria non valida.');
      if (x && x.budget !== undefined && (!isInt(x.budget) || x.budget <= 0 || x.kind !== 'spesa')) bad('Budget non valido (' + x.id + ').');
    });
    sn.accounts.forEach(function (a) {
      if (!uniq('Conto', a)) return; accIds[a.id] = 1;
      if (!txtOk(a.name, 100) || !a.name) bad('Conto senza nome.');
      if (!iconOk(a.icon) || !colOk(a.color)) bad('Icona o colore del conto non validi (' + a.id + ').');
      if (!hasK(TYPES, a.type)) bad('Tipo di conto non valido (' + a.id + ').');
      if (a.goal !== undefined && (!a.goal || typeof a.goal !== 'object' || !isInt(a.goal.cents) || a.goal.cents <= 0 || typeof a.goal.date !== 'string' || (a.goal.date !== '' && !dRange(a.goal.date)))) bad('Obiettivo non valido (' + a.id + ').');
      if (a.sub !== undefined && a.sub !== '' && typeof a.sub !== 'string') bad('Sottotipologia del conto non valida (' + a.id + ').');
      if (!isInt(a.opening)) bad('Saldo iniziale non valido (' + a.id + ').');
      if (!dRange(a.openDate)) bad('Data di apertura non valida (' + a.id + ').');
    });
    sn.gone.forEach(function (a) { if (uniq('Conto', a)) { accIds[a.id] = 1; if (!txtOk(a.name, 100) || !hasK(TYPES, a.type) || !iconOk(a.icon) || !colOk(a.color)) bad('Conto eliminato non valido.'); } });
    sn.pos.forEach(function (p) {
      if (!uniq('Investimento', p)) return; posIds[p.id] = 1;
      if (typeof p.isin !== 'string' || (p.isin !== '' && !isinOk(p.isin))) bad('ISIN non valido (' + p.id + ').');
      if (p.kind !== 'inv' && p.kind !== 'crypto') bad('Tipo di investimento non valido (' + p.id + ').');
      if (typeof p.sym !== 'string' || p.sym.length > 12) bad('Simbolo non valido (' + p.id + ').');
      if (p.cgId !== undefined && (typeof p.cgId !== 'string' || !/^[a-z0-9][a-z0-9-]{0,99}$/.test(p.cgId))) bad('Collegamento CoinGecko non valido (' + p.id + ').');
      if (p.cgName !== undefined && !txtOk(p.cgName, 100)) bad('Collegamento CoinGecko non valido (' + p.id + ').');
      if (!txtOk(p.name, 100) || !p.name) bad('Investimento senza nome.');
      if (p.lots.length > LIM.lots || p.prices.length > LIM.prices) bad('Troppe operazioni (' + p.id + ').');
      var lid = {};
      p.lots.forEach(function (l) {
        if (!l || typeof l.id !== 'string' || !ID_RE.test(l.id) || lid[l.id]) { bad('Operazione non valida (' + p.id + ').'); return; } lid[l.id] = 1;
        if ((l.txId && (typeof l.txId !== 'string' || !ID_RE.test(l.txId))) || (l.rule && (typeof l.rule !== 'string' || !ID_RE.test(l.rule)))) bad('Operazione non valida (' + p.id + ').');
        if (!dRange(l.d) || !isQty(l.qty) || l.qty === 0 || !isInt(l.px) || l.px <= 0 || l.px > PMAX || !isInt(l.tot)) bad('Operazione non valida (' + p.id + ').');
      });
      p.prices.forEach(function (x) { if (!x || !dRange(x.d) || !isInt(x.px) || x.px <= 0 || x.px > PMAX) bad('Prezzo non valido (' + p.id + ').'); });
      if (!e.length && !lotsOk(p.lots)) bad('Vendita oltre le quote (' + p.name + ').');
    });
    var KINDS = { spesa: 1, entrata: 1, giro: 1, rett: 1, inv: 1 };
    sn.tx.forEach(function (t) {
      if (!uniq('Movimento', t)) return; txIds[t.id] = 1;
      if (!hasK(KINDS, t.kind)) bad('Tipo di movimento non valido (' + t.id + ').');
      if (typeof t.ts !== 'number' || !isFinite(t.ts)) bad('Movimento non valido (' + t.id + ').');
      if (t.catId !== undefined && typeof t.catId !== 'string') bad('Categoria del movimento non valida (' + t.id + ').');
      if (!isInt(t.cents)) bad('Importo non valido (' + t.id + ').');
      if (!dRange(t.date)) bad('Data non valida (' + t.id + ').');
      if (typeof t.note !== 'string' || t.note.length > 300) bad('Nota non valida (' + t.id + ').');
      if (!accIds[t.accId]) bad('Movimento su un conto inesistente (' + t.id + ').');
      if (t.kind === 'giro' && (!accIds[t.toId] || t.toId === t.accId)) bad('Giroconto non valido (' + t.id + ').');
      if (t.kind === 'inv' && ((t.posId !== '' && !posIds[t.posId]) || (t.dir !== 'buy' && t.dir !== 'sell'))) bad('Operazione di investimento non valida (' + t.id + ').');
    });
    sn.pos.forEach(function (p) { p.lots.forEach(function (l) { if (l.txId && !txIds[l.txId]) bad('Acquisto senza addebito (' + p.name + ').'); }); });
    sn.rules.forEach(function (r) {
      if (!uniq('Ricorrenza', r)) return;
      if ((r.type !== 'mov' && r.type !== 'pac') || !hasK(FREQ, r.freq) || !evOk(r) || !dRange(r.anchor) || !isInt(r.k) || r.k < 0 || r.k > 100000 || (r.end && !dRange(r.end)) || !isInt(r.cents) || r.cents <= 0 || !accIds[r.accId]) bad('Ricorrenza non valida (' + r.id + ').');
      if (r.type === 'pac' && !posIds[r.posId]) bad('PAC su un investimento inesistente.');
      if (r.fee !== undefined && (!isInt(r.fee) || r.fee < 0 || r.fee >= r.cents)) bad('Commissione della ricorrenza non valida (' + r.id + ').');
      if (r.type === 'mov' && r.kind === 'giro' && (!accIds[r.toId] || r.toId === r.accId)) bad('Giroconto ricorrente non valido (' + r.id + ').');
      if (r.catId !== undefined && typeof r.catId !== 'string') bad('Ricorrenza non valida (' + r.id + ').');
      if (r.note !== undefined && !txtOk(r.note, 300)) bad('Ricorrenza non valida (' + r.id + ').');
      if (typeof r.active !== 'boolean') bad('Ricorrenza non valida (' + r.id + ').');
      if (r.type === 'mov' && r.kind !== 'spesa' && r.kind !== 'entrata' && r.kind !== 'giro') bad('Ricorrenza non valida (' + r.id + ').');
    });
    if (sn.prefs && sn.prefs.cur && sn.prefs.cur !== 'EUR' && sn.prefs.cur !== 'USD') bad('Valuta non valida.');
    var pf = sn.prefs || {};
    if (pf.homeView !== undefined && (typeof pf.homeView !== 'string' || pf.homeView.length > 60)) bad('Preferenze non valide.');
    if (pf.lastAcc !== undefined && typeof pf.lastAcc !== 'string') bad('Preferenze non valide.');
    if (pf.guideDone !== undefined && typeof pf.guideDone !== 'boolean') bad('Preferenze non valide.');
    if (pf.autoCry !== undefined && typeof pf.autoCry !== 'boolean') bad('Preferenze non valide.');
    if (pf.tourDone !== undefined && typeof pf.tourDone !== 'boolean') bad('Preferenze non valide.');
    if (pf.lastBackup !== undefined && pf.lastBackup !== '' && !dRange(pf.lastBackup)) bad('Preferenze non valide.');
    return e;
  }
  function withState(sn, fn) {
    var keys = ['subs', 'cats', 'accounts', 'gone', 'tx', 'pos', 'rules'], keep = {};
    keys.forEach(function (k) { keep[k] = S[k]; S[k] = sn[k]; });
    try { return fn(); } finally { keys.forEach(function (k) { S[k] = keep[k]; }); }
  }
  function summ(sn) {
    return withState(sn, function () {
      var last = ''; sn.tx.forEach(function (t) { if (t.date > last) last = t.date; });
      return { acc: sn.accounts.length, tx: sn.tx.length, pos: sn.pos.length, rules: sn.rules.length, net: netWorth(), last: last };
    });
  }
  function hhmm(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function syncUI() { var el = $('#sync-sub'); if (el) el.textContent = syncText(); }
  function openConflict() {
    var c = PER.conf, a = summ(c.local), b = c.remote ? summ(c.remote.snap) : null;
    function col(t, s, at) { return '<div class="card"><div class="sb">' + t + '</div><div class="big" style="font-size:22px">' + money(s.net) + '</div><div class="kv"><span>Conti</span><span>' + s.acc + '</span></div><div class="kv"><span>Movimenti</span><span>' + s.tx + '</span></div><div class="kv" style="border:0"><span>Ultimo movimento</span><span>' + (s.last ? dayLabel(s.last) : '—') + '</span></div></div>'; }
    var html = '<div class="scrh"><span class="sp"></span><h2>Dati diversi</h2><span class="sp"></span></div><div class="scrb"><p class="hint">' + conflictNote() + ' Scegli quale versione tenere: l’altra viene sostituita.</p>' +
      col('Questo dispositivo', a) + (b ? col(savedLabel(), b) : '<p class="hint">Non riesco a leggere la versione salvata.</p>') + '</div>' +
      '<div class="scrf"><button class="btn danger" data-act="confgo" data-m="mine">Tieni questo dispositivo</button>' + (b ? '<button class="btn ghost" data-act="confgo" data-m="theirs">Usa i dati salvati</button>' : '') + '</div>';
    while (L.length) L.pop().el.remove();
    pushLayer('screen', 'conf', html, {});
  }
  function splash(h) { document.body.classList.add('boot'); $('#view').innerHTML = '<div class="splash"><div class="logo">UFinance Track</div>' + h + '</div>'; $('#tabs').innerHTML = ''; $('#fabw').innerHTML = ''; }
  function welcome() {
    splash('<p>Conti, spese, budget e investimenti in un unico posto. ' + welcomeNote() + ' Puoi esportarne una copia su file quando vuoi.</p>' +
      '<div class="splashb"><button class="btn" data-act="start0">Inizia da zero</button><button class="btn ghost" data-act="startdemo">Prova con dati di esempio</button>' +
      '<label class="btn ghost" for="imp-file" role="button">Ripristina da un backup</label></div>');
  }
  function bootFail(code) {
    var msg = code === 'schema_newer' ? 'I dati salvati sono di una versione più recente dell’app: aggiorna l’app.' :
      code === 'data_invalid' || code === 'chunk_corrupt' || code === 'chunk_missing' || code === 'meta_invalid' || code === 'corrupt' ? 'I dati salvati risultano incompleti o danneggiati.' : 'Non riesco a leggere i dati salvati.';
    splash('<p>' + msg + ' Non ho modificato nulla.</p><div class="splashb"><button class="btn" data-act="retryboot">Riprova</button><label class="btn ghost" for="imp-file" role="button">Ripristina da un backup</label></div>');
  }
  function enter() { document.body.classList.remove('boot'); PER.canWrite = true; render(); touch(); setTimeout(function () { cgFetch(false); }, 500); setTimeout(maybeTour, 700); if (!PER.snapDone) { PER.snapDone = true; snapCapture('auto', 'Salvataggio automatico'); } }
  function startFresh(demo) {
    S.autoCry = S.autoCry !== false;
    if (demo) { S.accounts = []; S.gone = []; S.tx = []; S.pos = []; S.rules = []; seed(); S.demo = true; }
    else emptyState();
    PER.status = PER.db ? 'saving' : 'local'; PER.dirty = true;
    enter();
  }

  /* ---- cifratura dei backup: password → PBKDF2-SHA256 → AES-GCM 256 ---- */
  var ENC_ITER = 600000, ENC_AAD = 'ufinance-backup-enc-1';
  function cryptoOk() { return !!(window.crypto && window.crypto.subtle && window.crypto.getRandomValues && window.TextEncoder); }
  function b64e(u) { var s = '', i; for (i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
  function b64d(s) { var b = atob(s), u = new Uint8Array(b.length), i; for (i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function encKey(pw, salt, iter) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(String(pw).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']).then(function (km) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  async function encryptBackup(text, pw) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), key = await encKey(pw, salt, ENC_ITER);
    var ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: new TextEncoder().encode(ENC_AAD) }, key, new TextEncoder().encode(text));
    return JSON.stringify({ app: APP_ID, kind: 'backup-enc', format: 1, exportedAt: new Date().toISOString(), kdf: 'PBKDF2-SHA256', iter: ENC_ITER, salt: b64e(salt), iv: b64e(iv), ct: b64e(new Uint8Array(ct)) });
  }
  async function decryptBackup(o, pw) {
    var key = await encKey(pw, b64d(o.salt), o.iter);
    var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(o.iv), additionalData: new TextEncoder().encode(ENC_AAD) }, key, b64d(o.ct));
    return new TextDecoder().decode(pt);
  }
  function encHeaderOk(o) {
    try { return o.format === 1 && o.kdf === 'PBKDF2-SHA256' && isInt(o.iter) && o.iter >= 100000 && o.iter <= 2000000 && typeof o.salt === 'string' && typeof o.iv === 'string' && typeof o.ct === 'string' && o.ct.length > 24 && b64d(o.salt).length === 16 && b64d(o.iv).length === 12; } catch (e) { return false; }
  }
  function openExport() {
    pushLayer('sheet', 'expo', shHead('Esporta backup') + '<div><button class="pick" data-act="expgo"><span class="mid"><span class="nm">File normale</span><span class="sb">Si apre senza password</span></span></button>' +
      (cryptoOk() ? '<button class="pick" data-act="expenc" style="border-bottom:0"><span class="mid"><span class="nm">File con password</span><span class="sb">Cifrato: si legge solo con la password</span></span></button>' : '<p class="hint">La cifratura non è disponibile in questo browser.</p>') + '</div>', {});
  }
  function openExpEnc() {
    pushLayer('sheet', 'expenc', shHead('Backup con password') + '<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:8px">' +
      fld('Password (almeno 8 caratteri)', '<input id="ex-pw" type="password" autocomplete="new-password" maxlength="128">', 'ex-pw') +
      fld('Ripeti la password', '<input id="ex-pw2" type="password" autocomplete="new-password" maxlength="128">', 'ex-pw2') +
      '<p class="hint">Se perdi la password il file non si può recuperare: non esiste un reset.</p><p class="msg" id="ex-msg" role="alert"></p>' +
      '<button class="btn" data-act="expencgo">Esporta con password</button></div>', {});
  }
  async function expEncGo(el) {
    var lay = layerOf('expenc'); if (!lay || el.disabled) return;
    var g = function (s) { return lay.el.querySelector(s); }, err = msgOf(lay, '#ex-msg'), pw = g('#ex-pw').value;
    if (pw.length < 8) return err('Almeno 8 caratteri.');
    if (pw !== g('#ex-pw2').value) return err('Le due password non coincidono.');
    el.disabled = true; el.textContent = 'Cifro…';
    var done = false;
    try { done = await exportEnc(pw); } catch (e) { err('Non riesco a cifrare il backup.'); }
    if (done) { if (layerOf('expenc')) popLayer(); } else { el.disabled = false; el.textContent = 'Esporta con password'; }
  }
  function openImpEnc(o) {
    pushLayer('sheet', 'impenc', shHead('Backup con password') + '<div style="display:flex;flex-direction:column;gap:10px;padding-bottom:8px">' +
      fld('Password', '<input id="ie-pw" type="password" autocomplete="current-password" maxlength="128">', 'ie-pw') +
      '<p class="msg" id="ie-msg" role="alert"></p><button class="btn" data-act="impencgo">Apri backup</button></div>', { enc: o });
  }
  async function impEncGo(el) {
    var lay = layerOf('impenc'); if (!lay || el.disabled) return;
    var err = msgOf(lay, '#ie-msg'), pw = lay.el.querySelector('#ie-pw').value;
    if (!pw) return err('Scrivi la password.');
    el.disabled = true; el.textContent = 'Decifro…';
    var back = function (m) { el.disabled = false; el.textContent = 'Apri backup'; err(m); };
    var txt; try { txt = await decryptBackup(lay.st.enc, pw); } catch (e) { return back('Password errata o file danneggiato.'); }
    var r = readBackup(txt); if (r.err || r.enc) return back(r.err || 'File non valido.');
    popLayer(); openImport(r);
  }

  /* ---- promemoria di backup (per dispositivo) ---- */
  function remSnoozed() { try { return (localStorage.getItem('uf-remind') || '') > TODAY; } catch (e) { return false; } }
  function remLater() { try { localStorage.setItem('uf-remind', addDays(TODAY, 3)); } catch (e) {} render(); }
  function remBanner() {
    if (S.demo || remSnoozed()) return '';
    var d = S.lastBackup ? dn(TODAY) - dn(S.lastBackup) : null;
    if (d === null ? S.tx.length < 10 : (d < 7 || !S.tx.length)) return '';
    return '<div class="banner remind"><button data-act="export">' + (d === null ? 'Non hai ancora esportato un backup.' : 'Ultimo backup: ' + (d === 1 ? 'ieri' : d + ' giorni fa') + '.') + ' <b>Esportalo ora</b></button>' +
      '<button class="x" data-act="remlater" aria-label="Ricordamelo più tardi">' + svg('x') + '</button></div>';
  }

  /* ---- versioni salvate (sul dispositivo): una al giorno e prima delle operazioni importanti ---- */
  var SNAP_KEEP = { auto: 7, pre: 6 };
  function noop() {}
  async function gz(str) {
    if (window.CompressionStream) {
      try { var cs = new CompressionStream('gzip'), w = cs.writable.getWriter(); w.write(new TextEncoder().encode(str)).catch(noop); w.close().catch(noop); return 'g:' + b64e(new Uint8Array(await new Response(cs.readable).arrayBuffer())); } catch (e) {}
    }
    return 'r:' + str;
  }
  async function gunz(z) {
    if (typeof z !== 'string') throw new Error('z');
    if (z.slice(0, 2) === 'r:') return z.slice(2);
    if (z.slice(0, 2) !== 'g:' || !window.DecompressionStream) throw new Error('z');
    var ds = new DecompressionStream('gzip'), w = ds.writable.getWriter(); w.write(b64d(z.slice(2))).catch(noop); w.close().catch(noop);
    return new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
  }
  function snapCapture(kind, label, sn) {
    var str, sig, sm;
    try {
      if (!PER.snaps || !PER.snaps.ok() || S.demo) return Promise.resolve(false);
      sn = sn || snapState(); if (!sn.accounts.length && !sn.tx.length) return Promise.resolve(false);
      str = JSON.stringify(sn); if (str.length > 20e6) return Promise.resolve(false);
      sig = hash53(str); sm = summ(sn);
    } catch (e) { return Promise.resolve(false); }
    return (async function () {
      try {
        var list = await PER.snaps.list();
        if (kind === 'auto' && list.some(function (r) { return r.kind === 'auto' && r.day === TODAY; })) return false;
        if (list.length && list[0].sig === sig) return false;
        await PER.snaps.put({ id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), at: Date.now(), day: TODAY, kind: kind, label: label, sig: sig, sum: { net: sm.net, acc: sm.acc, tx: sm.tx, pos: sm.pos }, z: await gz(str) });
        var all = await PER.snaps.list(), n = {};
        for (var i = 0; i < all.length; i++) { var r = all[i]; n[r.kind] = (n[r.kind] || 0) + 1; if (n[r.kind] > (SNAP_KEEP[r.kind] || 6)) await PER.snaps.del(r.id); }
        return true;
      } catch (e) { return false; }
    })();
  }
  function openSnaps() { pushLayer('screen', 'snaps', scrHead('Versioni salvate', true) + '<div class="scrb" id="sn-body"><p class="hint">Carico…</p></div>', {}); snapFill(); }
  async function snapFill() {
    var list = [], ok = !!(PER.snaps && PER.snaps.ok());
    try { if (ok) list = await PER.snaps.list(); } catch (e) { ok = false; }
    var el = $('#sn-body'); if (!el) return;
    el.innerHTML = (!ok ? '<p class="empty">Le versioni non sono disponibili in questa modalità.</p>' : list.length ? '<div class="list">' + list.map(function (r) {
      var good = r && typeof r.id === 'string' && typeof r.day === 'string' && isInt(r.at) && r.sum && isInt(r.sum.net) && isInt(r.sum.tx);
      if (!good) return '';
      return '<button class="row" data-act="snapopen" data-id="' + esc(r.id) + '"><span class="ico">🕘</span><span class="mid"><span class="nm">' + esc(r.kind === 'auto' ? 'Salvataggio automatico' : String(r.label || 'Versione').slice(0, 60)) + '</span><span class="sb">' + esc(dayLabel(r.day) + ' · ' + hhmm(r.at) + ' · ' + r.sum.tx + ' movimenti') + '</span></span><span class="v">' + money(r.sum.net) + '</span></button>';
    }).join('') + '</div>' : '<p class="empty">Nessuna versione ancora: se ne crea una al giorno, e una prima di importare un backup o eliminare un conto o un investimento.</p>') +
      '<p class="note">Restano su questo dispositivo: non sostituiscono il backup su file.</p>';
  }
  async function snapOpen(id) {
    try {
      var rec = await PER.snaps.get(id); if (!rec) throw new Error('x');
      var sn = normalizeSnap(JSON.parse(await gunz(rec.z))); if (validateSnap(sn).length) throw new Error('x');
      openImport({ snap: sn, at: String(rec.day) + 'T00:00:00Z', what: 'Versione' });
    } catch (e) { toast('Questa versione non è leggibile.'); }
  }
  function lastBackupText() { return S.lastBackup ? 'Ultimo: ' + dayLabel(S.lastBackup) : 'Mai eseguito'; }
  function readBackup(txt) {
    var o; try { o = JSON.parse(txt); } catch (e) { return { err: 'Il file non è un backup valido.' }; }
    if (o && o.app === APP_ID && o.kind === 'backup-enc') return encHeaderOk(o) ? { enc: o } : { err: 'File cifrato non valido.' };
    if (!o || o.app !== APP_ID || o.kind !== 'backup' || !o.data) return { err: 'Il file non è un backup di UFinance.' };
    if (typeof o.format !== 'number' || o.format > 1) return { err: 'Backup creato da una versione più recente dell’app.' };
    if (o.check !== hash53(stable(o.data))) return { err: 'File modificato o danneggiato: il controllo non torna.' };
    var sn = normalizeSnap(o.data), er = validateSnap(sn);
    if (er.length) return { err: er[0] };
    return { snap: sn, at: typeof o.exportedAt === 'string' ? o.exportedAt : '' };
  }
  function importFile(f) {
    if (!f) return;
    if (f.size > 40 * 1024 * 1024) { toast('File troppo grande.'); return; }
    var fr = new FileReader();
    fr.onload = function () { var r = readBackup(String(fr.result)); if (r.err) { toast(r.err); return; } if (r.enc) { openImpEnc(r.enc); return; } openImport(r); };
    fr.onerror = function () { toast('Non riesco a leggere il file.'); };
    fr.readAsText(f);
  }
  function openImport(r) {
    var cur = PER.canWrite ? summ(snapState()) : null, nw = summ(r.snap);
    function row(l, a, b) { return '<div class="kv"><span>' + l + '</span><span>' + (a === null ? '' : a + ' → ') + '<b>' + b + '</b></span></div>'; }
    var html = scrHead('Importa backup', true) + '<div class="scrb"><div class="card"><div class="sb">' + (r.what || 'Backup') + (typeof r.at === 'string' && r.at.slice(0, 10) === TODAY ? ' di oggi' : ' del ' + (typeof r.at === 'string' && dOk(r.at.slice(0, 10)) ? dayLabel(r.at.slice(0, 10)) : '—')) + '</div>' +
      row('Patrimonio', cur ? money(cur.net) : null, money(nw.net)) + row('Conti', cur ? cur.acc : null, nw.acc) + row('Movimenti', cur ? cur.tx : null, nw.tx) + row('Investimenti', cur ? cur.pos : null, nw.pos) + row('Ricorrenze', cur ? cur.rules : null, nw.rules) + '</div>' +
      '<p class="hint">I dati attuali vengono sostituiti da quelli del file.</p></div><div class="scrf"><button class="btn danger" data-act="impgo">Sostituisci i dati</button></div>';
    pushLayer('screen', 'imp', html, { snap: r.snap, what: r.what || '' });
  }
  function openReset() {
    var demo = !!S.demo;
    pushLayer('screen', 'reset', scrHead(demo ? 'Elimina dati di esempio' : 'Elimina tutti i dati', true) + '<div class="scrb"><p class="hint">' +
      (demo ? 'Rimuove i dati di esempio e riparte da zero.' : 'Cancella conti, movimenti, investimenti e ricorrenze ' + resetScope() + '. Non si può annullare.') + '</p>' +
      (demo ? '' : '<button class="btn ghost" data-act="export">Esporta prima un backup</button>') + '</div>' +
      '<div class="scrf"><p class="msg" id="rs-msg" role="alert"></p><button class="btn danger" data-act="resetgo">' + (demo ? 'Elimina e riparti' : 'Elimina tutto') + '</button></div>', {});
  }

  /* ================= memoria (build PWA): IndexedDB tramite UFRepo =================
     Qui non si tocca mai IndexedDB direttamente: tutto passa da window.UFRepo (js/repo.js).
     Salvataggio: dopo ogni modifica, a gruppi (400 ms), una sola transazione atomica con controllo
     di revisione. Se un'altra finestra dell'app ha salvato nel frattempo, compare la scelta tra le due versioni. */
  var PER = { db: true, repo: window.UFRepo, base: 0, canWrite: false, dirty: false, busy: false, again: false,
    timer: null, retry: null, fails: 0, status: 'boot', at: 0, err: '', conf: null, last: 0, toastedErr: false, persisted: null, sig: '' };
  PER.snaps = { ok: function () { return !!PER.db && !!PER.repo; }, list: function () { return PER.repo.snapList(); }, put: function (r) { return PER.repo.snapPut(r); }, get: function (id) { return PER.repo.snapGet(id); }, del: function (id) { return PER.repo.snapDel(id); } };
  // sig = impronta dei dati come sono nell'archivio: distingue "da salvare" da "modificato davvero"
  function reallyDirty() { return stable(snapState()) !== PER.sig; }
  var BC = null;
  try { if ('BroadcastChannel' in window) BC = new BroadcastChannel('ufinance'); } catch (e) { BC = null; }

  /* ---- scrittura ---- */
  function touch() {
    if (!PER.canWrite) return;
    PER.dirty = true; if (PER.status === 'ok') PER.status = 'saving';
    clearTimeout(PER.timer); PER.timer = setTimeout(flush, 400);
  }
  function flushNow() { clearTimeout(PER.timer); return flush(); }
  async function flush() {
    if (!PER.canWrite) return;
    if (!PER.db) { PER.dirty = false; PER.status = 'mem'; syncUI(); return; }
    if (PER.busy) { PER.again = true; return; }
    PER.busy = true;
    try {
      do {
        PER.again = false; PER.status = 'saving'; syncUI();
        var sn = snapState(), sg = stable(sn);
        if (sg === PER.sig && PER.base > 0) { PER.dirty = false; PER.status = 'ok'; continue; } // nulla di nuovo da salvare
        var nr = await PER.repo.commit(sn, PER.base);
        PER.base = nr; PER.sig = sg; PER.at = Date.now(); PER.fails = 0; PER.err = ''; PER.toastedErr = false;
        if (!PER.again) { PER.dirty = false; PER.status = 'ok'; }
        if (BC) { try { BC.postMessage({ rev: nr }); } catch (e) {} }
      } while (PER.again);
    } catch (e) {
      var c = errCode(e);
      if (c === 'conflict') { PER.busy = false; await onConflict(); return; }
      PER.fails += 1; PER.status = 'error'; PER.err = c; PER.dirty = true;
      if (!PER.toastedErr) { PER.toastedErr = true; toast(c === 'quota' ? 'Spazio esaurito: esporta un backup.' : 'Salvataggio non riuscito: riprovo a breve.'); }
      clearTimeout(PER.retry);
      if (c !== 'quota') PER.retry = setTimeout(flush, Math.min(60000, 3000 * Math.pow(2, PER.fails - 1)));
    } finally { PER.busy = false; syncUI(); }
  }

  /* ---- lettura e controllo ---- */
  async function readRemote() {
    var r = await PER.repo.load(); if (!r) return null;
    var sn = normalizeSnap(r.snapshot), er = validateSnap(sn);
    if (er.length) throw { code: sn.schema > SCHEMA ? 'schema_newer' : 'data_invalid', detail: er[0] };
    return { meta: { rev: r.rev, savedAt: r.savedAt }, snap: sn };
  }
  // Allinea la base all'archivio prima di sovrascriverlo. load() serve anche a UFRepo per sapere cosa c'è salvato:
  // senza, dopo un conflitto, resterebbero record dell'altra copia (dati misti). Se l'archivio è illeggibile,
  // si cancellano SOLO i dati: le versioni salvate restano.
  async function syncBase() {
    try { var r = await PER.repo.load(); PER.base = r ? r.rev : 0; }
    catch (e) { await PER.repo.clearData(); PER.base = 0; }
  }

  /* ---- stato mostrato nelle impostazioni ---- */
  function syncText() {
    if (!PER.canWrite) return 'In attesa…';
    if (!PER.db) return 'Archivio non disponibile: dati non salvati. Esporta un backup.';
    if (PER.status === 'saving') return 'Salvataggio…';
    if (PER.status === 'error') return PER.err === 'quota' ? 'Spazio esaurito: esporta un backup.' : 'Non salvato: riprovo a breve.';
    return 'Salvato sul dispositivo' + (PER.at ? ' · ' + hhmm(PER.at) : '');
  }
  function welcomeNote() { return PER.db ? 'I tuoi dati restano su questo dispositivo, anche senza rete.' : 'Archivio del dispositivo non disponibile: i dati non verrebbero salvati.'; }
  function storageNote() {
    return 'I dati restano solo su questo dispositivo' + (PER.persisted === false ? ' e il sistema potrebbe eliminarli se manca spazio' : '') + '. Esporta un backup spesso e salvalo su File o iCloud.';
  }
  function conflictNote() { return 'Un’altra copia dell’app ha salvato modifiche mentre lavoravi qui.'; }
  function savedLabel() { return 'Salvati sul dispositivo'; }
  function resetScope() { return 'da questo dispositivo'; }
  function versionRow() { return '<p class="note" style="margin-top:6px">Versione ' + esc(window.UF_BUILD || 'sviluppo') + (window.UFPwa ? ' · <button class="lnk" data-act="chkupd">Controlla aggiornamenti</button>' : '') + '</p>'; }
  function checkUpdate() { if (window.UFPwa) window.UFPwa.check(); }

  /* ---- conflitto tra due copie dell'app ---- */
  async function onConflict() {
    var remote = null;
    try { remote = await readRemote(); } catch (e) { remote = null; }
    PER.canWrite = false; PER.busy = false; clearTimeout(PER.timer);
    PER.conf = { local: snapState(), remote: remote };
    openConflict();
  }
  async function confGo(el) {
    var m = el.dataset.m;
    if (!twoTap(el, 'conf' + m)) return;
    var c = PER.conf; PER.conf = null;
    try {
      await snapCapture('pre', m === 'mine' ? 'Versione scartata (altra copia)' : 'Versione scartata (questa copia)', m === 'mine' ? (c.remote && c.remote.snap) : c.local);
      if (m === 'mine') { await syncBase(); applySnap(c.local); PER.canWrite = true; PER.dirty = true; runRules(true); closeAll(); await flushNow(); toast('Tenuti i dati di questa copia.'); }
      else { applySnap(c.remote.snap); PER.base = c.remote.meta.rev; PER.sig = stable(snapState()); PER.canWrite = true; PER.dirty = false; closeAll(); var mr = runRules(true); if (mr) { rulesToast(mr); touch(); } else toast('Caricati i dati salvati.'); }
    } catch (e) { PER.conf = c; toast('Non riesco a leggere l’archivio. Riprova.'); }
  }
  async function checkRemote() {
    if (!PER.canWrite || PER.busy || PER.conf) return;
    if (ymd(new Date()) !== TODAY) {
      await flushNow();
      // si ricarica solo a dati salvati e senza schermate aperte; altrimenti si riprova al prossimo controllo (ogni minuto)
      if (PER.dirty || PER.status === 'error' || PER.conf || L.length) return;
      try { location.reload(); } catch (e) {} return;
    }
    if (!PER.db) return;
    if (Date.now() - PER.last < 1500) return; PER.last = Date.now();
    try {
      var rev = await PER.repo.readRev();
      if (rev === PER.base) return;
      if (reallyDirty()) { await onConflict(); return; }
      var r = await readRemote();
      if (!r) { await onConflict(); return; }
      if (reallyDirty()) return;
      applySnap(r.snap); PER.base = r.meta.rev; PER.sig = stable(snapState()); PER.dirty = false; closeAll(); toast('Dati aggiornati da un’altra copia dell’app.');
    } catch (e) {}
  }
  if (BC) BC.onmessage = function () { PER.last = 0; checkRemote(); };

  /* ---- avvio ---- */
  async function boot() {
    loadPrefs();
    splash('<p class="sb">Carico i tuoi dati…</p>');
    PER.db = true;
    try { await PER.repo.open(); } catch (e) { PER.db = false; PER.err = errCode(e); }
    if (!PER.db) { PER.status = 'mem'; welcome(); return; }
    PER.repo.persist().then(function (p) { PER.persisted = p; syncUI(); });
    var r = null;
    try { r = await readRemote(); } catch (e) { bootFail(errCode(e)); return; }
    if (!r) { PER.base = 0; PER.status = 'ok'; welcome(); return; }
    applySnap(r.snap); PER.base = r.meta.rev; PER.sig = stable(snapState()); PER.status = 'ok'; PER.at = r.meta.savedAt || Date.now();
    var made = runRules(true); enter(); rulesToast(made);
  }

  /* ---- backup: esporta (Web Share con file, altrimenti download) ---- */
  function backupFile() {
    var sn = snapState();
    return { app: APP_ID, kind: 'backup', format: 1, schema: SCHEMA, exportedAt: new Date().toISOString(), check: hash53(stable(sn)), data: sn };
  }
  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 60000);
  }
  function markBackup() { S.lastBackup = TODAY; touch(); render(); }
  function exportBackup() {
    // Nessun await prima di navigator.share: iOS richiede che parta dal tocco dell'utente.
    deliverBackup(JSON.stringify(backupFile()), 'ufinance-backup-' + TODAY + '.json');
  }
  // il file cifrato richiede un calcolo prima della condivisione: se iOS rifiuta la condivisione, si scarica
  async function exportEnc(pw) { return deliverBackup(await encryptBackup(JSON.stringify(backupFile()), pw), 'ufinance-backup-cifrato-' + TODAY + '.json'); }
  function deliverBackup(text, name) {
    return deliverFile(text, name, ['application/json', 'text/plain'], 'Backup UFinance Track', function (how) { markBackup(); toast(how === 'share' ? 'Backup condiviso.' : 'Backup scaricato.'); });
  }
  // Condivisione (iPhone: «Salva su File») se disponibile, altrimenti download. Nessun await prima di share: iOS lo vuole dal tocco.
  function deliverFile(text, name, types, title, done) {
    var i, f;
    var fallback = function () { downloadBlob(new Blob([text], { type: types[0] }), name); done('download'); return true; };
    if (navigator.share && navigator.canShare && typeof File === 'function') {
      for (i = 0; i < types.length; i++) {
        try { f = new File([text], name, { type: types[i] }); } catch (e) { f = null; }
        if (f && navigator.canShare({ files: [f] })) {
          return navigator.share({ files: [f], title: title }).then(function () { done('share'); return true; },
            function (e) { if (e && e.name === 'AbortError') return false; return fallback(); });
        }
      }
    }
    return Promise.resolve(fallback());
  }

  /* ---- backup: importa ---- */
  async function impGo(el) {
    var lay = layerOf('imp'); if (!lay) return;
    if (!twoTap(el, 'impgo')) return;
    var prev = PER.canWrite ? clone(snapState()) : null, sn = lay.st.snap;
    if (prev) await snapCapture('pre', lay.st.what === 'Versione' ? 'Prima di ripristinare una versione' : 'Prima di importare un backup', prev);
    if (!PER.canWrite && PER.db) { try { await syncBase(); } catch (e) {} }
    applySnap(clone(sn));
    document.body.classList.remove('boot'); PER.canWrite = true; PER.dirty = true; PER.status = PER.db ? 'saving' : 'mem';
    closeAll(); var madeI = runRules(true);
    toast('Backup importato.' + (madeI ? (madeI === 1 ? ' Registrata 1 operazione ricorrente.' : ' Registrate ' + madeI + ' operazioni ricorrenti.') : ''), prev ? function () { applySnap(prev); touch(); } : null);
    touch(); flushNow();
  }

  /* ---- elimina tutti i dati ---- */
  async function resetGo(el) {
    var lay = layerOf('reset'); if (!lay) return;
    if (!S.demo && !twoTap(el, 'resetgo')) return;
    el.disabled = true;
    try {
      clearTimeout(PER.timer); PER.canWrite = false;
      if (PER.db) await PER.repo.clear();
    } catch (e) { el.disabled = false; PER.canWrite = true; var m = $('#rs-msg'); if (m) { m.textContent = 'Non riesco a cancellare i dati. Riprova.'; m.className = 'msg bad'; } return; }
    PER.base = 0; PER.sig = ''; PER.dirty = false; PER.status = 'ok'; PER.conf = null;
    if (BC) { try { BC.postMessage({ reset: true }); } catch (e) {} }
    while (L.length) L.pop().el.remove(); lockPage(false);
    emptyState(); S.tab = 'home'; welcome();
  }
  window.addEventListener('pagehide', function () { if (PER.canWrite && PER.dirty) { clearTimeout(PER.timer); flush(); } });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { if (PER.canWrite && PER.dirty) { clearTimeout(PER.timer); flush(); } }
    else { checkRemote(); cgFetch(false); }
  });
  // Cambio di giorno con l'app aperta e visibile (es. a mezzanotte): stesso controllo, ogni minuto.
  setInterval(function () { if (document.visibilityState === 'visible' && ymd(new Date()) !== TODAY) checkRemote(); }, 60000);
  function testHooks() { return { flush: flush, flushNow: flushNow, checkRemote: checkRemote, repo: PER.repo, backupFile: backupFile }; }

  /* ================= eventi ================= */
  function act(n, el) {
    var d = el.dataset, lay = topL(), st = lay ? lay.st : null, al, id;
    switch (n) {
      case 'tab': S.tab = d.tab; render(true); window.scrollTo(0, 0); break;
      case 'hide': S.hide = !S.hide; savePrefs(); render(); break;
      case 'scope': sheetScope(); break;
      case 'setscope': S.homeView = d.v; popLayer(); break;
      case 'add': if (!S.accounts.length) { toast('Crea prima un conto.'); S.tab = 'conti'; render(); break; } openAdd({ mode: 'spesa' }); break;
      case 'giro': if (S.accounts.length < 2) { toast(S.accounts.length ? 'Servono due conti.' : 'Crea prima un conto.'); break; } openAdd({ mode: 'giro' }); break;
      case 'mode':
        al = layerOf('add'); if (!al) break;
        al.st.mode = d.mode;
        if (al.st.catId && cat(al.st.catId) && cat(al.st.catId).kind !== d.mode) al.st.catId = '';
        syncAdd(); break;
      case 'key': keyPress(d.k); break;
      case 'savetx': saveTx(); break;
      case 'pickacc': openAccPicker(d.w); break;
      case 'setacc':
        al = layerOf('add'); if (!al) break;
        if (d.w === 'to') { al.st.toId = d.id; if (al.st.accId === d.id) al.st.accId = otherAcc(d.id); }
        else { al.st.accId = d.id; if (al.st.mode === 'giro' && al.st.toId === d.id) al.st.toId = otherAcc(d.id); }
        popLayer(); break;
      case 'pickcat': openCatPicker(); break;
      case 'setcat': al = layerOf('add'); if (al) al.st.catId = d.id; popLayer(); break;
      case 'newcatadd': al = layerOf('add'); if (!al) break; popLayer(); openCatForm({ kind: al.st.mode, fromAdd: true }); break;
      case 'tx': sheetTx(d.id); break;
      case 'txedit': popLayer(); openAdd({ tx: txById(d.id) }); break;
      case 'txdel':
        var t = txById(d.id); if (t && t.kind === 'inv' && t.posId) { delInvTx(el, t); break; }
        if (!twoTap(el, 'tx' + d.id)) break;
        t = txById(d.id); S.tx = S.tx.filter(function (x) { return x.id !== d.id; });
        if (layerOf('txlist')) popLayer(); else closeAll();
        toast('Movimento eliminato', function () { S.tx.push(t); }); break;
      case 'acc': sheetAcc(d.id); break;
      case 'accedit': popLayer(); openAccForm(d.id); break;
      case 'accview': S.homeView = 'acc:' + d.id; S.tab = 'home'; closeAll(); window.scrollTo(0, 0); break;
      case 'fixopen': openFix(d.id); break;
      case 'newacc': openAccForm(null); break;
      case 'start0': startFresh(false); break;
      case 'startdemo': startFresh(true); break;
      case 'retryboot': boot(); break;
      case 'export': openExport(); break;
      case 'expgo': popLayer(); exportBackup(); break;
      case 'expenc': popLayer(); openExpEnc(); break;
      case 'expencgo': expEncGo(el); break;
      case 'impencgo': impEncGo(el); break;
      case 'remlater': remLater(); break;
      case 'snaps': openSnaps(); break;
      case 'snapopen': snapOpen(d.id); break;
      case 'impgo': impGo(el); break;
      case 'confgo': confGo(el); break;
      case 'resetopen': openReset(); break;
      case 'chkupd': checkUpdate(); break;
      case 'resetgo': resetGo(el); break;
      case 'atype':
        if (!st) break; st.type = d.t;
        if (!sub(st.sub) || sub(st.sub).type !== d.t) st.sub = (subsOf(d.t)[0] || {}).id || '';
        syncAcc(); break;
      case 'asub': if (st) { st.sub = d.id; syncAcc(); } break;
      case 'agoal': al = layerOf('acc'); if (al) { al.st.goalOn = true; syncAcc(); var gi = al.el.querySelector('#af-gc'); if (gi) gi.focus(); } break;
      case 'newsubacc': if (st) newSubForm(st.type, true); break;
      case 'aicopen': openIcoSheet('acc'); break;
      case 'aicon': al = layerOf('acc'); if (al) { al.st.icon = ICONS[+d.i]; syncAcc(); } break;
      case 'acol': al = layerOf('acc'); if (al) { al.st.col = COLORS[+d.i]; syncAcc(); } break;
      case 'saveacc': saveAcc(); break;
      case 'delaccopen': openDelAcc(d.id || (st && st.id)); break;
      case 'delmode': if (st) { st.mode = d.m; syncDel(); } break;
      case 'delaccgo': delAccRun(el); break;
      case 'nwopen': nwOpen(); break;
      case 'nwper': if (st) { st.preset = d.p; nwDraw(); } break;
      case 'nwreset': nwHead(-1); break;
      case 'savename': saveName(); break;
      case 'delname': delName(el); break;
      case 'cicopen': openIcoSheet('cat'); break;
      case 'cicon': al = layerOf('cat'); if (al) { al.st.icon = ICONS[+d.i]; syncCat(); if (topL() && topL().name === 'icopick') popLayer(); } break;
      case 'savecat': saveCat(); break;
      case 'delcat': delCat(el); break;
      case 'managecats': openManageCats(d.k); break;
      case 'managesubs': openManageSubs(); break;
      case 'editcat': openCatForm({ id: d.id, back: true }); break;
      case 'newcatm': openCatForm({ kind: d.k, back: true }); break;
      case 'editsub': editSubForm(d.id); break;
      case 'newsubm': newSubForm(d.t, false); break;
      case 'per': S.an.period = d.p; S.an.offset = 0; S.an.sel = -1; render(); break;
      case 'prev': S.an.offset -= 1; S.an.sel = -1; render(); break;
      case 'next': if (S.an.offset < 0) { S.an.offset += 1; S.an.sel = -1; render(); } break;
      case 'bar': S.an.sel = S.an.sel === +d.i ? -1 : +d.i; render(); break;
      case 'anacc': sheetAnAcc(); break;
      case 'anpers': sheetAnPers(); break;
      case 'catkind': S.an.catKind = d.k; render(); break;
      case 'chart': S.an.chart = d.k; render(); break;
      case 'pos': case 'posopen': if (lay && lay.kind === 'sheet') popLayer(); if (d.chart) nwOpen('pos:' + d.id); else openPosDetail(d.id); break;
      case 'posinv': nwOpen('inv'); break;
      case 'newpos': openPosForm(); break;
      case 'savepos': savePos(); break;
      case 'pkind': if (st) { st.kind = d.k; syncPosForm(); } break;
      case 'pmode': if (st) { st.mode = d.m; syncPosForm(); } break;
      case 'pby': if (st) { st.by = d.k; syncPosForm(); } break;
      case 'lotnew': openLotForm(d.id, d.dir, ''); break;
      case 'lotedit': openLotForm(d.pos, '', d.id); break;
      case 'savelot': saveLot(); break;
      case 'dellot': delLot(el); break;
      case 'pricenew': openPriceForm(d.id, ''); break;
      case 'priceedit': openPriceForm(d.id, d.d); break;
      case 'saveprice': savePrice(); break;
      case 'delprice': delPrice(el); break;
      case 'poslist': openPosList(d.id); break;
      case 'delposopen': openDelPos(d.id); break;
      case 'delposmode': if (st) { st.mode = d.m; syncDelPos(); } break;
      case 'delposgo': delPosRun(el); break;
      case 'rules': openRules(); break;
      case 'ruleopen': openRuleForm(d.id); break;
      case 'saverule': saveRule(); break;
      case 'delrule': delRule(el); break;
      case 'pacnew': openPacForm(d.id); break;
      case 'savepac': savePac(el); break;
      case 'pacopen': openRuleForm(d.id); break;
      case 'reppick': repSheet(); break;
      case 'setrep': al = layerOf('add'); if (al) al.st.rep = d.v; popLayer(); break;
      case 'nwinv': if (st) { st.inv = !st.inv; nwDraw(); } break;
      case 'theme':
        S.theme = d.k; document.documentElement.setAttribute('data-uf', d.k); savePrefs(); render(); break;
      case 'cur':
        if (S.cur === d.k) break;
        var prev = S.cur; S.cur = d.k; savePrefs(); render();
        toast('Valuta cambiata: importi non convertiti.', function () { S.cur = prev; savePrefs(); }); break;
      case 'undo':
        if (undoFn) {
          undoFn(); undoFn = null; $('#toast').hidden = true; render();
          // le schermate aperte (andamento, elenco operazioni, ricorrenze…) mostrano i dati ripristinati
          L.slice().forEach(function (ly) { if (L.indexOf(ly) >= 0 && ly.refresh) ly.refresh(); });
        } break;
      case 'close': popLayer(); break;
      case 'txlist': openTxList(d.an ? { per: 'custom', from: d.from, to: d.to, kind: 'flow', accs: S.an.accIds } : { acc: d.acc || '', per: d.per || 'all', from: d.from, to: d.to }); break;
      case 'tlkind': if (txlRead()) { layerOf('txlist').st.kind = d.k; txlDraw(true); } break;
      case 'tlper': if (txlRead()) { layerOf('txlist').st.per = d.k; txlDraw(true); } break;
      case 'tlmore': if (txlRead()) { al = layerOf('txlist'); al.st.more = !al.st.more; txlDraw(true); } break;
      case 'tlreset':
        al = layerOf('txlist'); if (!al) break;
        Object.assign(al.st, { q: '', kind: 'all', acc: '', cat: '', per: 'all', min: '', max: '', limit: 150, accs: null }); al.el.querySelector('#tl-q').value = ''; txlDraw(true); break;
      case 'tlaccsx': if (txlRead()) { layerOf('txlist').st.accs = null; txlDraw(true); } break;
      case 'tlnext': al = layerOf('txlist'); if (al) { al.st.limit += 300; txlDraw(false); } break;
      case 'tlcsv': al = layerOf('txlist'); if (al) exportCsv((al.data || []).slice().reverse(), 'ufinance-movimenti-filtrati-' + TODAY + '.csv'); break;
      case 'csvall': exportCsv(sortTx(S.tx).reverse(), 'ufinance-movimenti-' + TODAY + '.csv'); break;
      case 'budgets': openBudgets(); break;
      case 'savebud': saveBudgets(); break;
      case 'budtx': openTxList({ cat: d.id, per: 'month', kind: 'spesa' }); break;
      case 'pxall': openPxAll(); break;
      case 'pxwnext': pxwNext(false); break;
      case 'pxwskip': pxwNext(true); break;
      case 'pxwmode': al = layerOf('pxwiz'); if (al) { al.st.mode = al.st.mode === 'val' ? 'px' : 'val'; pxwDraw(); } break;
      case 'xmode': al = layerOf('price'); if (al) { al.st.mode = d.m; priceForm(al); } break;
      case 'cgnow': cgFetch(true).then(function (n) { toast(CG.err === 'offline' ? 'Sei offline: riprova quando c’è rete.' : CG.err ? 'CoinGecko non risponde: riprova più tardi.' : n ? 'Prezzi cripto aggiornati.' : 'Prezzi già aggiornati.'); }); break;
      case 'cglink': cgLink().then(function (n) { if (!n) toast('Non trovata su CoinGecko: controlla il simbolo (es. BTC).'); return cgFetch(true); }).then(function () { L.slice().forEach(function (ly) { if (ly.refresh && L.indexOf(ly) >= 0) ly.refresh(); }); render(true); }); break;
      case 'invhelp': sheetInvHelp(); break;
      case 'guide': openGuide(); break;
      case 'tour': startTour(); break;
      case 'voice': if (!S.accounts.length) { toast('Crea prima un conto: poi potrai dettare i movimenti.'); break; } openVoice(); break;
      case 'vmic': voiceMic(); break;
      case 'vparse': voiceParse(); break;
      case 'vok': voiceOk(); break;
      case 'vdel': al = layerOf('voice'); if (al) { al.st.items.splice(+d.i, 1); voiceDraw(); } break;
      case 'guidex': S.guideDone = true; render(); toast('Primi passi nascosti. La guida resta in Impostazioni.'); break;
    }
  }
  document.addEventListener('click', function (e) {
    var tg = e.target;
    if (tg && tg.classList && tg.classList.contains('layer') && tg.classList.contains('sheet')) { popLayer(); return; }
    var el = tg.closest ? tg.closest('[data-act]') : null;
    // Secondo tocco di un doppio tocco su «Salva»: la schermata si è già chiusa, il tocco cadrebbe su ciò che sta sotto.
    if (lastPopT && Date.now() - lastPopT < 450 && !(tg.closest && tg.closest('.layer')) &&
      (e.detail >= 2 || ((e.clientX || e.clientY) && Math.abs(e.clientX - lastX) < 30 && Math.abs(e.clientY - lastY) < 30))) { lastX = e.clientX; lastY = e.clientY; return; }
    lastX = e.clientX; lastY = e.clientY;
    if (el) act(el.dataset.act, el);
  });
  document.addEventListener('submit', function (e) {
    e.preventDefault();
    var k = e.target.dataset.form, id = e.target.dataset.id;
    if (k === 'fix') saveFix(id);
    else if (k === 'anacc') {
      var ids = Array.prototype.map.call(document.querySelectorAll('input[name="ac"]:checked'), function (x) { return x.value; });
      var mm = document.querySelector('#aa-m');
      if (!ids.length) { mm.textContent = 'Seleziona almeno un conto.'; mm.className = 'msg bad'; return; }
      S.an.accIds = ids.length === S.accounts.length ? null : ids; S.an.sel = -1; popLayer();
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, k = el.dataset ? el.dataset.chg : null;
    if (el.dataset && el.dataset.vf && el.dataset.in !== 'vf') { voiceSet(el, true); return; }
    if (el.id === 'imp-file') { var ff = el.files && el.files[0]; el.value = ''; importFile(ff); return; }
    if (el.id === 'af-sub') {
      var la = layerOf('acc'); if (!la) return;
      if (el.value === '+') { el.value = la.st.sub; newSubForm(la.st.type, true); } else { la.st.sub = el.value; syncAcc(); }
      return;
    }
    if (el.id === 'a-date') {
      var al = layerOf('add'); if (al) { al.st.date = el.value || TODAY; syncAdd(); }
      return;
    }
    if (el.id && el.id.indexOf('k-') === 0) { syncPac(); return; }
    if (el.id === 'x-date') { var pl = layerOf('price'); if (pl) priceForm(pl); return; }
    if (el.id === 'r-freq') { var rl = layerOf('ruleform'); if (rl) cadShow(rl, 'r'); return; }
    if (!k) return;
    if (k === 'hide') { S.hide = el.checked; savePrefs(); render(); }
    else if (k === 'autocry') cgEnable(el.checked);
    else if (k === 'block') { S.an.blocks[el.dataset.b] = el.checked; render(); }
    else if (k === 'nwrange') {
      var nl2 = layerOf('nw'); if (!nl2) return;
      var f2 = $('#nw-from').value, t2 = $('#nw-to').value;
      if (!f2 || !t2) return;
      if (f2 > TODAY) f2 = TODAY; if (t2 > TODAY) t2 = TODAY; if (f2 > t2) t2 = f2;
      nl2.st.from = f2; nl2.st.to = t2; nwDraw();
    }
    else if (k === 'txl') { if (txlRead()) txlDraw(true); }
    else if (k === 'range') {
      var f = $('#an-from').value, t = $('#an-to').value;
      if (!f || !t) return;
      if (f > TODAY) f = TODAY; if (t > TODAY) t = TODAY; if (f > t) t = f;
      S.an.from = f; S.an.to = t; S.an.sel = -1; render();
    }
  });
  document.addEventListener('input', function (e) {
    var el = e.target, di = el.dataset ? el.dataset.in : null;
    if (el.id === 'k-n' || el.id === 'k-amt') { if (el.id === 'k-n') el.value = el.value.replace(/\D/g, '').slice(0, 4); if (layerOf('pacf')) syncPac(); }
    if (el.id === 'r-n') el.value = el.value.replace(/\D/g, '').slice(0, 4);
    if (el.id === 'p-isin') {
      var v = el.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); el.value = v;
      var h = $('#p-isin-h');
      if (!v.length) { h.textContent = 'Solo se lo conosci.'; h.style.color = ''; }
      else if (v.length === 12) { var ok = isinOk(v); h.textContent = ok ? 'Codice valido.' : 'Codice non valido: controlla le cifre.'; h.style.color = ok ? 'var(--inc)' : 'var(--out)'; }
      else { h.textContent = '12 caratteri: 2 lettere, 9 cifre o lettere, 1 cifra di controllo.'; h.style.color = ''; }
    } else if (el.id === 'p-sym') { el.value = el.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    } else if (el.id === 'a-note') { var al = layerOf('add'); if (al) al.st.note = el.value; }
    else if (di === 'accname' || di === 'accopen') syncAcc();
    else if (di === 'catname') syncCat();
    else if (di === 'xpx') priceHint();
    else if (di === 'vf') voiceSet(el, false);
    else if (di === 'pxw') pxwHint();
    else if (di === 'txl') { clearTimeout(txlT); txlT = setTimeout(function () { if (txlRead()) txlDraw(false); }, el.id === 'tl-q' ? 120 : 250); }
  });
  /* Schermate ferme (soprattutto su iPhone):
     - quando si tocca un campo, Safari su iOS fa scorrere tutta la vista per portarlo sopra la tastiera: è questo
       che fa «muovere» la schermata. Lo si evita spostando il campo fuori vista per un solo fotogramma nel momento
       del tocco (Safari non trova nulla da scorrere) e mettendolo poi in vista noi, scorrendo solo il contenuto;
     - la pagina sotto resta in cima e bloccata (lockPage), la schermata resta a tutta altezza e non si ridimensiona;
     - un trascinamento fa scorrere solo un'area che ha davvero contenuto da scorrere, mai lo schermo intero.
     Lo zoom con due dita resta permesso. */
  var VV = window.visualViewport || null;
  var IOS = !!window.UF_TEST_IOS || /iP(hone|ad|od)/.test(navigator.platform || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function scrollParent(el, stop) {
    for (var n = el && el.parentElement; n && n !== stop && n !== document.body; n = n.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(n).overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
    }
    return null;
  }
  function kbField(el) {
    if (!el || !el.tagName || el.disabled || el.readOnly) return false;
    if (el.tagName === 'TEXTAREA') return false; // testo lungo (frase dettata): conta di più mettere il cursore dove si tocca
    return el.tagName === 'INPUT' && !/^(checkbox|radio|range|color|file|image|button|submit|reset|date|time|datetime-local|month|week)$/.test(el.type);
  }
  function noAutoScroll(el) { el.style.transform = 'translateY(-2000px)'; requestAnimationFrame(function () { requestAnimationFrame(function () { el.style.transform = ''; }); }); }
  function revealFocus() {
    var el = document.activeElement; if (!el || !el.closest || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) return;
    var lay = el.closest('.layer'), sc = lay && scrollParent(el, lay); if (!sc) return;
    var a = el.getBoundingClientRect(), b = sc.getBoundingClientRect(), m = 12, top = b.top, bot = b.bottom;
    if (VV && VV.scale <= 1.01) { top = Math.max(top, VV.offsetTop); bot = Math.min(bot, VV.offsetTop + VV.height); }
    if (a.bottom > bot - m) sc.scrollTop += Math.min(a.bottom - bot + m, a.top - top - m);
    else if (a.top < top + m) sc.scrollTop -= top + m - a.top;
  }
  function vvSync() {
    if (!VV) return;
    var r = document.documentElement;
    if (VV.scale > 1.01) { r.style.removeProperty('--vvt'); r.style.removeProperty('--kbh'); r.classList.remove('kb'); return; } // zoom voluto dall'utente
    var t = Math.max(0, Math.round(VV.offsetTop)), kbh = Math.max(0, Math.round(r.clientHeight - VV.height)), kb = kbh > 120;
    r.style.setProperty('--vvt', t + 'px'); r.style.setProperty('--kbh', (kb ? kbh : 0) + 'px');
    r.classList.toggle('kb', kb);
    if (kb && L.length) requestAnimationFrame(revealFocus);
  }
  if (VV) { VV.addEventListener('resize', vvSync); VV.addEventListener('scroll', vvSync); vvSync(); }
  // Se qualcosa fa comunque scorrere il documento mentre una schermata è aperta, torna subito in cima.
  window.addEventListener('scroll', function () { if (lockY !== null && L.length && (window.scrollY || 0) !== 0) window.scrollTo(0, 0); }, { passive: true });
  document.addEventListener('focusin', function (e) {
    var el = e.target; if (!L.length || !el.closest || !el.closest('.layer')) return;
    if (IOS && kbField(el) && !el.style.transform && !document.documentElement.classList.contains('kb')) noAutoScroll(el); // tastiera non ancora aperta (es. etichetta toccata)
    setTimeout(revealFocus, 350);
  });
  // Lo scorrimento lo decide il CSS (touch-action). In più, per sicurezza: al primo movimento di ogni gesto, se il dito
  // non è su un'area che ha davvero contenuto da scorrere, il gesto viene bloccato del tutto.
  var tX = 0, tY = 0, tDec = null, tMoved = false;
  document.addEventListener('touchstart', function (e) { tDec = null; tMoved = e.touches.length > 1; if (e.touches.length === 1) { tX = e.touches[0].clientX; tY = e.touches[0].clientY; } }, { passive: true });
  // Il dito è su un'area che scorre davvero nella direzione del movimento? (verticale vince se c'è una componente verticale)
  function inScroller(target, dx, dy) {
    var hor = Math.abs(dx) > Math.abs(dy), v = false, h = false;
    for (var n = target && target.nodeType === 1 ? target : target && target.parentElement; n && n !== document.body; n = n.parentElement) {
      if (n.classList && n.classList.contains('layer')) break;
      var s = getComputedStyle(n);
      if (!v && /(auto|scroll)/.test(s.overflowY) && n.scrollHeight > n.clientHeight + 1) v = true;
      if (!h && /(auto|scroll)/.test(s.overflowX) && n.scrollWidth > n.clientWidth + 1) h = true;
    }
    return hor ? (h || (v && dy !== 0)) : v;
  }
  document.addEventListener('touchmove', function (e) {
    if (e.touches.length !== 1) { tMoved = true; return; }
    if (!tMoved && (Math.abs(e.touches[0].clientX - tX) > 10 || Math.abs(e.touches[0].clientY - tY) > 10)) tMoved = true;
    if (!L.length) return;
    if (tDec === null) tDec = inScroller(e.target, e.touches[0].clientX - tX, e.touches[0].clientY - tY) ? 'ok' : 'no';
    if (tDec === 'no' && e.cancelable) e.preventDefault();
  }, { passive: false });
  // Le schermate che non stanno nello schermo (liste, telefoni piccoli, tastiera aperta) ricevono .scrolls.
  var fitT = 0;
  function fitCheck() {
    fitT = 0;
    for (var i = 0; i < L.length; i++) {
      var el = L[i].el, sc = el.querySelectorAll('.scrb, .panel, .chips'), over = false;
      for (var k = 0; k < sc.length && !over; k++) { var n = sc[k]; if (n.clientHeight && (n.scrollHeight > n.clientHeight + 1 || n.scrollWidth > n.clientWidth + 1)) over = true; }
      el.classList.toggle('scrolls', over);
    }
  }
  function fitSoon() { if (!fitT) fitT = requestAnimationFrame(fitCheck); }
  if (window.MutationObserver) new MutationObserver(function () { if (L.length) fitSoon(); }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  window.addEventListener('resize', fitSoon);
  if (VV) VV.addEventListener('resize', fitSoon);
  // iPhone: tocco su un campo di testo in una schermata → focus dato da qui, con il campo fuori vista per un
  // fotogramma, così Safari non sposta la schermata per mostrarlo (lo mostra revealFocus scorrendo solo il contenuto).
  document.addEventListener('touchend', function (e) {
    var el = e.target;
    if (!IOS || !L.length || tMoved || !kbField(el) || el === document.activeElement || !el.closest('.layer')) return;
    e.preventDefault(); noAutoScroll(el);
    try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); }
  }, { passive: false });
  // Mentre scrivi la nota il tastierino si nasconde: la schermata non si sposta.
  document.addEventListener('focusin', function (e) { if (e.target.id === 'a-note') { var al = layerOf('add'); if (al) al.el.classList.add('typing'); } });
  document.addEventListener('focusout', function (e) { if (e.target.id === 'a-note') { var al = layerOf('add'); if (al) al.el.classList.remove('typing'); } });
  // Premere «Salva» mentre si scrive la nota: senza questo il campo perde il focus, ricompare il tastierino,
  // il pulsante si sposta e il clic va perso. Tenendo il focus, il pulsante resta fermo sotto il dito/mouse.
  document.addEventListener('mousedown', function (e) { if (e.target.closest && e.target.closest('#a-save') && document.activeElement && document.activeElement.id === 'a-note') e.preventDefault(); });
  // Grafico del patrimonio: il dito (o il mouse) scorre sulla curva e mostra il valore di quel giorno.
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#nw-svg')) nwPointer(e); });
  document.addEventListener('pointermove', function (e) { if (e.target.closest && e.target.closest('#nw-svg') && (e.pointerType === 'mouse' || e.buttons)) nwPointer(e); });
  function nwEnd(e) { if (layerOf('nw') && (!e.target.closest || e.target.closest('#nw-svg') || e.type === 'pointercancel')) nwHead(-1); }
  document.addEventListener('pointerup', nwEnd);
  document.addEventListener('pointercancel', nwEnd);
  document.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && e.target.id === 'nw-svg') nwHead(-1); });
  document.addEventListener('keydown', function (e) {
    if (TOURST) { if (e.key === 'Escape') tourEnd(false); return; }
    var lay = topL(); if (!lay) return;
    if (e.key === 'Escape') { if (lay.name !== 'conf') popLayer(); return; }
    if (lay.name === 'pxwiz' && e.key === 'Enter') { e.preventDefault(); pxwNext(false); return; }
    if (lay.name !== 'add') return;
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (e.key === 'Enter' && document.activeElement.id === 'a-note') document.activeElement.blur(); return; }
    if (/^[0-9]$/.test(e.key)) keyPress(e.key);
    else if (e.key === ',' || e.key === '.') keyPress(',');
    else if (e.key === 'Backspace') { e.preventDefault(); keyPress('back'); }
    else if (e.key === 'Enter') saveTx();
  });

  window.__UF = Object.assign(testHooks(), { P: PER, snapState: snapState, applySnap: applySnap, validateSnap: validateSnap, readBackup: readBackup, hash53: hash53, stable: stable, boot: boot, summ: summ, exportBackup: exportBackup, emptyState: emptyState, S: S, L: L, balance: balance, netWorth: netWorth, parseCents: parseCents, isinOk: isinOk, posValue: posValue, alloc: alloc, buckets: buckets, range: range, stats: stats, scopeValue: scopeValue, scopeSet: scopeSet, act: act, render: render, nwSeries: nwSeries, firstDate: firstDate, delPlan: delPlan, accName: accName, nwRange: nwRange, pctS: pctS, chgPct: chgPct, nwPointer: nwPointer, portfolioValue: portfolioValue, posCalc: posCalc, posStat: posStat, xirr: xirr, runRules: runRules, nthDate: nthDate, lotsOk: lotsOk, pxAt: pxAt, snapAll: snapAll, restoreAll: restoreAll, parsePx: parsePx, delPosPlan: delPosPlan,  TODAY: TODAY, money: money, addDays: addDays, dn: dn, ymd: ymd, parseD: parseD, posById: posById, encryptBackup: encryptBackup, decryptBackup: decryptBackup, snapCapture: snapCapture, remBanner: remBanner, gz: gz, gunz: gunz, openTxList: openTxList, txlFilter: txlFilter, csvOf: csvOf, budgetState: budgetState, goalInfo: goalInfo, budNote: budNote, cgFetch: cgFetch, cgLink: cgLink, CG: CG, openPosDetail: openPosDetail, startTour: startTour, tourEnd: tourEnd, openVoice: openVoice, voiceParse: voiceParse });
    window.addEventListener('uf-toast', function (e) { toast(String(e.detail || '')); });
boot();
})();
