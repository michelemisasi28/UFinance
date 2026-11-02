window.UF_BUILD = '2026-11-02 · 6ef00147';
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
    var t0 = Math.min.apply(null, f.map(function (x) { return dn(x.d); }));
    if (dn(endD) - t0 < 90) return null;
    function npv(r) { var s = 0; f.forEach(function (x) { s += x.cf / Math.pow(1 + r, (dn(x.d) - t0) / 365); }); return s; }
    var lo = -0.95, hi = 50, flo = npv(lo), fhi = npv(hi);
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
    else if (t.kind === 'inv') { var ip = posById(t.posId); ico = posIcon(ip); title = (t.dir === 'sell' ? 'Vendita ' : t.rule ? 'PAC ' : 'Acquisto ') + (ip ? ip.name : 'investimento'); sub2 = a1.name; }
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
    var cur = scopeValue(v), past = scopeValue(v, addDays(TODAY, -30)), d = cur - past;
    var series = []; for (var i = 29; i >= 0; i--) series.push(scopeValue(v, addDays(TODAY, -i)));
    var st = stats(TODAY.slice(0, 8) + '01', TODAY, set);
    var rec = sortTx(S.tx.filter(function (t) { return inSet(t, set); })).slice(0, 5);
    var mnow = MESI_L[parseD(TODAY).getMonth()];
    if (!S.accounts.length) return '<section class="hero"><div class="herotop"><span class="lbl">Patrimonio totale</span></div><div class="amt" style="font-size:34px;font-weight:700">' + money(0) + '</div></section>' +
      '<section class="sec"><div class="card" style="display:flex;flex-direction:column;gap:12px"><h2 style="margin:0">Crea il primo conto</h2><p class="hint" style="margin:0">Aggiungi dove tieni i soldi (contanti, banca, risparmi) con il saldo di oggi. Poi registra spese ed entrate col tasto +.</p><button class="btn" data-act="newacc">Crea un conto</button></div></section>';
    return remBanner() + (S.demo ? '<button class="banner" data-act="resetopen" style="text-align:left;width:100%">Dati di esempio. Tocca per eliminarli e iniziare da zero.</button>' : '') +
      '<section class="hero"><div class="herotop"><button class="totalbtn" data-act="scope" aria-label="Cambia il totale mostrato"><span class="lbl">' + esc(scopeLabel(v)) + svg('chev') + '</span><span class="amt">' + money(cur) + '</span></button>' +
      '<button class="iconbtn" data-act="hide" aria-label="' + (S.hide ? 'Mostra importi' : 'Nascondi importi') + '">' + svg(S.hide ? 'eyeoff' : 'eye') + '</button></div>' +
      '<div class="delta"><b class="' + (d >= 0 ? 'pos' : 'neg') + '">' + moneyS(d) + '</b> negli ultimi 30 giorni</div><button class="sparkbtn" data-act="nwopen" aria-label="Apri l’andamento nel tempo">' + sparkSVG(series) + '<span class="sparkcap">Andamento nel tempo ' + svg('right') + '</span></button></section>' +
      '<section class="sec"><h2>Questo mese · ' + mnow + '</h2><div class="card three"><div><span class="k">Entrate</span><span class="n pos">' + money(st.inc) + '</span></div><div><span class="k">Spese</span><span class="n neg">' + money(st.exp) + '</span></div><div><span class="k">Risparmiato</span><span class="n ' + (st.inc - st.exp >= 0 ? 'pos' : 'neg') + '">' + moneyS(st.inc - st.exp) + '</span></div></div></section>' +
      '<section class="sec"><h2>Ultimi movimenti</h2>' + (rec.length ? '<div class="list">' + rec.map(function (t) { return txRow(t, set); }).join('') + '</div>' : '<p class="empty">Nessun movimento. Tocca +.</p>') + '</section>';
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
          return '<button class="row" data-act="acc" data-id="' + a.id + '"><span class="ico" style="--c:' + a.color + '">' + a.icon + '</span><span class="mid"><span class="nm">' + esc(a.name) + '</span>' + (sb ? '<span class="sb">' + esc(sb.name) + '</span>' : '') + '</span><span class="v ' + (b < 0 ? 'neg' : '') + '">' + money(b) + '</span></button>';
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
      h += '<section class="sec"><h2>Movimenti del periodo</h2>' + (l.length ? '<div class="list">' + l.map(function (t) { return txRow(t, null); }).join('') + '</div>' : '<p class="empty">Nessun movimento in questo periodo.</p>') + '</section>';
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
    h += '<section class="sec"><div class="sech"><h2>Investimenti</h2><span class="sb">' + money(tv) + '</span></div>';
    if (S.pos.length) {
      h += '<button class="card invsum" data-act="posinv"><div class="three"><div><span class="k">Valore</span><span class="n">' + money(tv) + '</span></div><div><span class="k">Investito</span><span class="n">' + money(ti) + '</span></div><div><span class="k">Rendimento</span><span class="n ' + (tg >= 0 ? 'pos' : 'neg') + '">' + moneyS(tg) + '<br><span class="sb">' + pctS(ti > 0 ? tg / ti : null) + '</span></span></div></div><span class="sparkcap">Andamento ' + svg('right') + '</span></button>';
      h += '<div class="list">' + S.pos.map(function (p, i) {
        var z = stats[i];
        return '<button class="row" data-act="posopen" data-id="' + p.id + '"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + (isCry(p) ? '' : esc(p.isin || 'Titolo / ETF') + ' · ') + qtyStr(z.k.qty, p) + ' ' + esc(unitL(p)) + '</span></span><span class="v">' + money(z.value) + '<br><span class="sb ' + (z.gain >= 0 ? 'pos' : 'neg') + '">' + moneyS(z.gain) + ' · ' + pctS(z.pct) + '</span></span></button>';
      }).join('') + '</div>';
    } else h += '<p class="empty">Nessun investimento. Aggiungi titoli, ETF o cripto.</p>';
    h += '<button class="pick addnew" data-act="newpos"><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Aggiungi investimento</span></span></button></section>';
    var pacs = S.rules.filter(function (r) { return r.type === 'pac'; });
    h += '<section class="sec"><h2>PAC</h2>' + (pacs.length ? '<div class="list">' + pacs.map(function (r) {
      var p = posById(r.posId), nx = ruleNext(r);
      return '<button class="row" data-act="pacopen" data-id="' + r.id + '"><span class="ico">🔁</span><span class="mid"><span class="nm">' + esc(p ? p.name : 'PAC') + '</span><span class="sb">' + freqL(r) + ' · ' + (!r.active ? 'in pausa' : nx ? 'prossimo ' + dayLabel(nx) : 'terminato') + '</span></span><span class="v">' + money(r.cents) + '</span></button>';
    }).join('') + '</div>' : '<p class="empty">Nessun PAC.</p>') + '<button class="pick addnew" data-act="pacnew" data-id=""><span class="ico">' + svg('plus') + '</span><span class="mid"><span class="nm">Aggiungi PAC</span></span></button></section>';
    h += '<p class="note">Prezzi inseriti a mano: nessun aggiornamento automatico.</p>';
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
      '<button class="navrow" data-act="rules"><span>Ricorrenze e PAC</span><span class="r">' + S.rules.length + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managecats" data-k="spesa"><span>Categorie di spesa</span><span class="r">' + nS + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managecats" data-k="entrata"><span>Categorie di entrata</span><span class="r">' + nE + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="managesubs" style="border-bottom:0"><span>Sottotipologie di conto</span><span class="r">' + S.subs.length + svg('right') + '</span></button></div></section>' +
      '<section class="sec"><h2>Privacy</h2><div class="card" style="padding:0 16px"><label class="sw" style="border-bottom:0"><span>Nascondi gli importi<br><span class="sb">Utile in pubblico</span></span><input type="checkbox" data-chg="hide"' + (S.hide ? ' checked' : '') + ' aria-label="Nascondi gli importi"></label></div></section>' +
      '<section class="sec"><h2>Dati</h2><div class="card" style="padding:0 16px">' +
      '<div class="navrow"><span>Stato<br><span class="sb" id="sync-sub">' + esc(syncText()) + '</span></span></div>' +
      '<button class="navrow" data-act="export"><span>Esporta backup<br><span class="sb">' + esc(lastBackupText()) + '</span></span><span class="r">' + svg('right') + '</span></button>' +
      '<label class="navrow" for="imp-file" role="button"><span>Importa backup</span><span class="r">' + svg('right') + '</span></label>' +
      '<button class="navrow" data-act="snaps"><span>Versioni salvate<br><span class="sb">Automatiche, su questo dispositivo</span></span><span class="r">' + svg('right') + '</span></button>' +
      '<button class="navrow" data-act="resetopen" style="border-bottom:0"><span style="color:var(--out)">' + (S.demo ? 'Elimina dati di esempio…' : 'Elimina tutti i dati…') + '</span></button></div>' +
      '<p class="note">' + storageNote() + '</p>' + versionRow() + '</section>';
  }

  function render() {
    var v = { home: viewHome, conti: viewConti, analisi: viewAnalisi, portfolio: viewPortfolio, settings: viewSettings }[S.tab]();
    $('#view').innerHTML = v;
    var T = [['conti', 'Conti', 'wallet'], ['analisi', 'Analisi', 'bars'], ['home', 'Home', 'home'], ['portfolio', 'Portfolio', 'pie'], ['settings', 'Impostazioni', 'sliders']];
    $('#tabs').innerHTML = T.map(function (t) {
      var home = t[0] === 'home';
      return '<button class="tab ' + (home ? 'home ' : '') + (S.tab === t[0] ? 'on' : '') + '" data-act="tab" data-tab="' + t[0] + '" aria-label="' + t[1] + '"' + (S.tab === t[0] ? ' aria-current="page"' : '') + '>' + (home ? '<span class="hb">' + svg('home') + '</span>' : svg(t[2])) + '<span>' + t[1] + '</span></button>';
    }).join('');
    $('#fabw').innerHTML = S.tab === 'home' ? '<button class="fab" data-act="add" aria-label="Aggiungi spesa o entrata">' + svg('plus') + '</button>' : '';
    touch();
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
    document.body.appendChild(el); document.body.classList.add('lock');
    armed = null; $('#toast').hidden = true;
    var lay = { el: el, kind: kind, name: name, st: st || {}, render: o && o.render, refresh: o && o.refresh };
    L.push(lay); return lay;
  }
  function popLayer() {
    var lay = L.pop(); if (!lay) return null;
    lastPopT = Date.now();
    lay.el.remove(); armed = null;
    if (!L.length) { document.body.classList.remove('lock'); render(); }
    else { var t = L[L.length - 1]; if (t.refresh) t.refresh(); }
    return lay;
  }
  function closeAll() { lastPopT = Date.now(); while (L.length) L.pop().el.remove(); armed = null; document.body.classList.remove('lock'); render(); }
  function scrHead(title, back, id) {
    return '<div class="scrh"><button class="x" data-act="close" aria-label="' + (back ? 'Indietro' : 'Chiudi') + '">' + svg(back ? 'back' : 'x') + '</button><h2' + (id ? ' id="' + id + '"' : '') + '>' + esc(title) + '</h2><span class="sp"></span></div>';
  }
  function shHead(t) { return '<div class="shh"><h2>' + esc(t) + '</h2><button class="x" data-act="close" aria-label="Chiudi">' + svg('x') + '</button></div>'; }
  var toastT = null, undoFn = null;
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
    var accId = t ? t.accId : (S.lastAcc && acc(S.lastAcc) ? S.lastAcc : S.accounts[0].id);
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
      var old = txById(st.edit), idx = S.tx.indexOf(old); tx.ts = old.ts; S.tx[idx] = tx;
      S.lastAcc = st.accId; popLayer();
      toast(label + (m === 'giro' ? ' modificato' : ' modificata'), function () { S.tx[S.tx.indexOf(txById(tx.id))] = old; });
    } else {
      S.tx.push(tx); S.lastAcc = st.accId; popLayer();
      toast(label + (m === 'giro' ? ' registrato: ' : ' salvata: ') + money(cents), function () { S.tx = S.tx.filter(function (x) { return x.id !== tx.id; }); });
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
      '<div id="fixbox"></div><div class="sec"><h2>Ultimi movimenti</h2>' + (rec.length ? '<div class="list">' + rec.map(function (t) { return txRow(t, new Set([id])); }).join('') + '</div>' : '<p class="empty">Nessun movimento.</p>') + '</div>');
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
    var st = { id: id || null, type: a ? a.type : 'liquidita', sub: a ? (a.sub || '') : ((subsOf('liquidita')[0] || {}).id || ''), icon: a ? a.icon : ICONS[3], col: a ? a.color : COLORS[0], n: a ? accTxCount(id) : 0 };
    var html = scrHead(a ? 'Modifica conto' : 'Nuovo conto', false) +
      '<div class="scrb"><div class="card prev" id="af-prev"></div>' +
      '<div class="fld"><label for="af-name">Nome</label><input id="af-name" maxlength="30" autocomplete="off" data-in="accname" placeholder="Es. Conto Revolut" value="' + esc(a ? a.name : '') + '"></div>' +
      '<div class="fld"><span class="lab">Tipo</span><div class="wrapchips" id="af-types"></div></div>' +
      '<div class="fld"><span class="lab">Sottotipologia</span><div class="wrapchips" id="af-subs"></div><p class="hint">Per raggruppare i conti (es. Vacanze).</p></div>' +
      '<div class="fld"><label for="af-open" id="af-ol">Saldo iniziale</label><input id="af-open" inputmode="decimal" autocomplete="off" data-in="accopen" placeholder="0,00" value="' + (a && a.opening !== 0 ? amtStr(Math.abs(a.opening)) : '') + '">' + (a ? '<p class="hint" id="af-eff"></p><p class="hint">Modifica anche lo storico. Per allinearti al saldo reale usa «Correggi saldo».</p>' : '') + '</div>' +
      '<div class="fld"><span class="lab">Icona</span><div class="grid" id="af-ico">' + ICONS.map(function (ic, k) { return '<button type="button" data-act="aicon" data-i="' + k + '" aria-label="Icona ' + (k + 1) + '">' + ic + '</button>'; }).join('') + '</div></div>' +
      '<div class="fld"><span class="lab">Colore</span><div class="grid cols" id="af-col">' + COLORS.map(function (c, k) { return '<button type="button" data-act="acol" data-i="' + k + '" style="--c:' + c + '" aria-label="Colore ' + (k + 1) + '"></button>'; }).join('') + '</div></div></div>' +
      '<div class="scrf"><p class="msg" id="af-msg" role="alert"></p><button class="btn" data-act="saveacc">' + (a ? 'Salva modifiche' : 'Crea conto') + '</button>' +
      (a ? '<button class="btn danger" data-act="delaccopen" data-id="' + a.id + '">Elimina conto…</button>' : '') + '</div>';
    pushLayer('screen', 'acc', html, st, { refresh: syncAcc });
    syncAcc();
  }
  function syncAcc() {
    var lay = layerOf('acc'); if (!lay) return;
    var st = lay.st, el = lay.el, a = st.id ? acc(st.id) : null, al = allowedTypes(a);
    var nm = el.querySelector('#af-name').value.trim(), sb = sub(st.sub);
    el.querySelector('#af-prev').innerHTML = '<span class="ico" style="--c:' + st.col + '">' + st.icon + '</span><span class="mid"><span class="nm">' + esc(nm || 'Nome del conto') + '</span><span class="sb">' + TYPES[st.type] + (sb ? ' · ' + esc(sb.name) : '') + '</span></span>';
    el.querySelector('#af-types').innerHTML = TYPE_ORDER.map(function (t) { return '<button type="button" class="chip ' + (st.type === t ? 'on' : '') + '" data-act="atype" data-t="' + t + '"' + (al.indexOf(t) < 0 ? ' disabled' : '') + '>' + TYPE_ICON[t] + ' ' + TYPES[t] + '</button>'; }).join('');
    el.querySelector('#af-subs').innerHTML = '<button type="button" class="chip ' + (st.sub === '' ? 'on' : '') + '" data-act="asub" data-id="">Nessuna</button>' +
      subsOf(st.type).map(function (s) { return '<button type="button" class="chip ' + (st.sub === s.id ? 'on' : '') + '" data-act="asub" data-id="' + s.id + '">' + esc(s.name) + '</button>'; }).join('') +
      '<button type="button" class="chip add" data-act="newsubacc">+ Nuova</button>';
    Array.prototype.forEach.call(el.querySelectorAll('#af-ico button'), function (b) { b.classList.toggle('on', ICONS[+b.dataset.i] === st.icon); });
    Array.prototype.forEach.call(el.querySelectorAll('#af-col button'), function (b) { b.classList.toggle('on', COLORS[+b.dataset.i] === st.col); });
    var ol = el.querySelector('#af-ol'); if (ol) ol.textContent = st.type === 'debito' ? 'Importo del debito' : 'Saldo iniziale';
    var ef = el.querySelector('#af-eff');
    if (ef && a) {
      var raw = el.querySelector('#af-open').value.trim(), c = raw === '' ? 0 : parseCents(raw);
      if (c === null || (st.type !== 'debito' && c < 0)) ef.textContent = 'Importo non valido.';
      else { var no = st.type === 'debito' ? -Math.abs(c) : c; ef.textContent = 'Saldo attuale: ' + money(balance(a.id)) + ' → ' + money(balance(a.id) - a.opening + no); }
    }
  }
  function saveAcc() {
    var lay = layerOf('acc'); if (!lay) return;
    var st = lay.st, el = lay.el, m = el.querySelector('#af-msg'), name = el.querySelector('#af-name').value.trim();
    function err(t) { m.textContent = t; m.className = 'msg bad'; }
    if (!name) return err('Inserisci un nome.');
    if (S.accounts.some(function (x) { return x.id !== st.id && x.name.toLowerCase() === name.toLowerCase(); })) return err('Esiste già un conto con questo nome.');
    if (st.id) {
      var a = acc(st.id);
      var raw0 = el.querySelector('#af-open').value.trim(), c0 = raw0 === '' ? 0 : parseCents(raw0);
      if (c0 === null) return err('Saldo non valido.');
      if (st.type === 'debito') c0 = -Math.abs(c0); else if (c0 < 0) return err('Saldo negativo solo per i debiti.');
      a.opening = c0;
      a.name = name; a.type = st.type; a.sub = st.sub; a.icon = st.icon; a.color = st.col;
      popLayer(); toast('Conto aggiornato');
    } else {
      var raw = el.querySelector('#af-open').value.trim(), c = raw === '' ? 0 : parseCents(raw);
      if (c === null) return err('Saldo non valido.');
      if (st.type === 'debito') c = -Math.abs(c); else if (c < 0) return err('Saldo negativo solo per i debiti.');
      S.accounts.push({ id: uid('a'), name: name, type: st.type, sub: st.sub, icon: st.icon, color: st.col, opening: c, openDate: TODAY });
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
      '<div class="scrb"><div class="card prev" id="cf-prev"></div>' +
      '<div class="fld"><label for="cf-name">Nome</label><input id="cf-name" maxlength="24" autocomplete="off" data-in="catname" placeholder="Es. Palestra" value="' + esc(c ? c.name : '') + '"></div>' +
      '<div class="fld"><span class="lab">Icona</span><div class="grid" id="cf-ico">' + ICONS.map(function (ic, k) { return '<button type="button" data-act="cicon" data-i="' + k + '" aria-label="Icona ' + (k + 1) + '">' + ic + '</button>'; }).join('') + '</div></div></div>' +
      '<div class="scrf"><p class="msg" id="cf-msg" role="alert"></p><button class="btn" data-act="savecat">Salva</button>' +
      (c ? '<button class="btn danger" data-act="delcat">Elimina categoria</button>' : '') + '</div>';
    pushLayer('screen', 'cat', html, st, { refresh: syncCat });
    syncCat();
  }
  function syncCat() {
    var lay = layerOf('cat'); if (!lay) return;
    var st = lay.st, el = lay.el, nm = el.querySelector('#cf-name').value.trim();
    el.querySelector('#cf-prev').innerHTML = '<span class="ico">' + st.icon + '</span><span class="mid"><span class="nm">' + esc(nm || 'Nome della categoria') + '</span><span class="sb">' + (st.kind === 'spesa' ? 'Spesa' : 'Entrata') + (st.n ? ' · ' + st.n + ' movimenti' : '') + '</span></span>';
    Array.prototype.forEach.call(el.querySelectorAll('#cf-ico button'), function (b) { b.classList.toggle('on', ICONS[+b.dataset.i] === st.icon); });
  }
  function saveCat() {
    var lay = layerOf('cat'); if (!lay) return;
    var st = lay.st, el = lay.el, m = el.querySelector('#cf-msg'), name = el.querySelector('#cf-name').value.trim();
    function err(t) { m.textContent = t; m.className = 'msg bad'; }
    if (!name) return err('Inserisci un nome.');
    if (S.cats.some(function (c) { return c.kind === st.kind && c.id !== st.id && c.name.toLowerCase() === name.toLowerCase(); })) return err('Esiste già una categoria con questo nome.');
    if (st.id) { var c = cat(st.id); c.name = name; c.icon = st.icon; popLayer(); toast('Categoria aggiornata'); return; }
    var n = { id: uid('c'), kind: st.kind, name: name, icon: st.icon }; S.cats.push(n);
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
    if (pos1) h += '<div class="btns four"><button class="btn ghost" data-act="lotnew" data-id="' + pos1.id + '" data-dir="buy">Acquisto</button><button class="btn ghost" data-act="lotnew" data-id="' + pos1.id + '" data-dir="sell">Vendita</button><button class="btn ghost" data-act="pricenew" data-id="' + pos1.id + '">Prezzo</button><button class="btn ghost" data-act="poslist" data-id="' + pos1.id + '">Altro</button></div>';
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
        '<p class="hint">Il prezzo oggi è obbligatorio. Il rendimento parte da oggi.</p>';
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
      if (st.by === 'qty') {
        var q2 = parseQty(g('#p-qty').value); if (q2 === null || q2 <= 0) return err('Quantità non valida (max 8 decimali).');
        var t2 = valCents(q2, px); if (t2 <= 0) return err('Valore troppo piccolo.'); if (t2 > 99999999999) return err('Valore troppo grande.');
        lot = { id: uid('l'), d: TODAY, qty: q2, px: px, fee: 0, tot: t2, txId: '', rule: '', est: false };
      } else {
        var t3 = parseCents(g('#p-val').value); if (t3 === null || t3 <= 0) return err('Valore non valido.');
        var q3 = pacQty(t3, 0, px); if (q3 <= 0) return err('Valore troppo piccolo.'); if (q3 > QMAX) return err('Quantità troppo grande: controlla il prezzo.');
        lot = { id: uid('l'), d: TODAY, qty: q3, px: px, fee: 0, tot: t3, txId: '', rule: '', est: false };
      }
    }
    var p = { id: uid('p'), kind: st.kind, sym: sym, isin: isin, name: name, lots: [lot], prices: [] };
    setPrice(p, lot.d, lot.px, false); setPrice(p, TODAY, px, false);
    if (accId) {
      var tx = { id: uid('t'), kind: 'inv', dir: 'buy', cents: lot.tot, accId: accId, posId: p.id, lotId: lot.id, date: lot.d, note: '', ts: Date.now(), rule: '' };
      lot.txId = tx.id; S.tx.push(tx);
    }
    S.pos.push(p); popLayer(); toast((cry ? 'Cripto aggiunta' : 'Investimento aggiunto')); nwOpen('pos:' + p.id);
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
  function openPriceForm(posId, date) {
    var p = posById(posId); if (!p) return;
    var pt = date ? p.prices.filter(function (x) { return x.d === date; })[0] : null;
    var html = scrHead(pt ? 'Modifica prezzo' : 'Aggiorna prezzo', !!pt) + '<div class="scrb"><div class="card prev"><span class="ico" style="--c:var(--' + (isCry(p) ? 'c5' : 'c4') + ')">' + posIcon(p) + '</span><span class="mid"><span class="nm">' + esc(p.name) + '</span><span class="sb">' + esc(posTag(p)) + '</span></span></div>' +
      fld('Data', '<input type="date" id="x-date" max="' + TODAY + '" value="' + (pt ? pt.d : TODAY) + '">', 'x-date') +
      fld('Prezzo per ' + (isCry(p) ? 'unità' : 'quota') + ' (' + SYM[S.cur] + ')', '<input id="x-px" inputmode="decimal" autocomplete="off" placeholder="0,00" value="' + (pt ? pxInput(pt.px) : '') + '">', 'x-px') +
      '</div><div class="scrf"><p class="msg" id="x-msg" role="alert"></p><button class="btn" data-act="saveprice">Salva</button>' + (pt && p.prices.length > 1 ? '<button class="btn danger" data-act="delprice">Elimina</button>' : '') + '</div>';
    pushLayer('screen', 'price', html, { posId: posId, d0: pt ? pt.d : '' });
  }
  function savePrice() {
    var lay = layerOf('price'); if (!lay) return;
    var st = lay.st, p = posById(st.posId), err = msgOf(lay, '#x-msg'), d = lay.el.querySelector('#x-date').value, px = parsePx(lay.el.querySelector('#x-px').value);
    var de = dateOk(d, null); if (de) return err(de);
    if (px === null || px <= 0) return err('Prezzo non valido.');
    var snap = snapAll();
    if (st.d0 && st.d0 !== d) p.prices = p.prices.filter(function (x) { return x.d !== st.d0; });
    setPrice(p, d, px, false); popLayer(); toast('Prezzo salvato', function () { restoreAll(snap); });
  }
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
      return '<button class="row" data-act="lotedit" data-id="' + l.id + '" data-pos="' + id + '"><span class="ico">' + (sell ? '➖' : '➕') + '</span><span class="mid"><span class="nm">' + (sell ? 'Vendita' : l.rule ? 'PAC' : 'Acquisto') + ' · ' + qtyStr(Math.abs(l.qty), p) + ' ' + esc(unitL(p)) + '</span><span class="sb">' + dayLabel(l.d) + ' · ' + pxStr(l.px) + (l.est ? ' · stima' : '') + '</span></span><span class="v">' + money(l.tot) + '</span></button>';
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
        '<div class="scrf"><p class="msg" id="r-msg" role="alert"></p><div class="btnrow"><button class="btn" data-act="saverule">Salva</button><button class="btn danger" data-act="delrule">Elimina</button></div></div>';
      pushLayer('screen', 'ruleform', html, { id: id }).el.classList.add('fixed');
      return;
    }
    html = scrHead('Modifica ricorrenza', true) + '<div class="scrb">' + prev +
      fld('Importo (' + SYM[S.cur] + ')', '<input id="r-amt" inputmode="decimal" autocomplete="off" value="' + amtStr(r.cents) + '">', 'r-amt') +
      fld(giro ? 'Da conto' : r.kind === 'spesa' ? 'Pagato con' : 'Accreditato su', '<select id="r-acc">' + accOpts(r.accId) + '</select>', 'r-acc') +
      (giro ? fld('A conto', '<select id="r-to">' + accOpts(r.toId) + '</select>', 'r-to') : '') +
      (!giro ? fld('Categoria', '<select id="r-cat"><option value="">Senza categoria</option>' + cats.map(function (c) { return '<option value="' + c.id + '"' + (c.id === r.catId ? ' selected' : '') + '>' + esc(c.icon + ' ' + c.name) + '</option>'; }).join('') + '</select>', 'r-cat') : '') +
      fld('Nota', '<input id="r-note" maxlength="60" autocomplete="off" value="' + esc(r.note || '') + '">', 'r-note') +
      fld('Frequenza', cadSel('r', r), 'r-freq') + cadCust('r', r) +
      fld('Fino al (facoltativo)', '<input type="date" id="r-end" value="' + (r.end || '') + '">', 'r-end') +
      '<div class="card" style="padding:0 16px"><label class="sw" style="border-bottom:0"><span>Attiva</span><input type="checkbox" id="r-act"' + (r.active ? ' checked' : '') + ' aria-label="Attiva"></label></div></div>' +
      '<div class="scrf"><p class="msg" id="r-msg" role="alert"></p><button class="btn" data-act="saverule">Salva</button><button class="btn danger" data-act="delrule">Elimina</button></div>';
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

  /* ================= memoria: parte comune (formato dati, controlli, schermate) =================
     Nessun accesso diretto all'archivio: quello sta nel modulo specifico della build. */
  var SCHEMA = 7, APP_ID = 'ufinance';
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
      prefs: { theme: S.theme, cur: S.cur, hide: !!S.hide, lastAcc: S.lastAcc || '', homeView: S.homeView || 'all', demo: !!S.demo, lastBackup: S.lastBackup || '' } };
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
    S.hide = !!pr.hide; S.demo = !!pr.demo; S.lastBackup = pr.lastBackup || '';
    S.lastAcc = acc(pr.lastAcc) ? pr.lastAcc : null;
    S.homeView = pr.homeView || 'all';
    seq = Math.max(seq, maxSeq(sn));
    S.an.from = addDays(TODAY, -29); S.an.to = TODAY; S.an.offset = 0; S.an.accIds = null; S.an.sel = -1;
    savePrefs();
  }
  function emptyState() {
    S.accounts = []; S.gone = []; S.tx = []; S.pos = []; S.rules = []; S.demo = false; S.lastAcc = null; S.homeView = 'all'; S.lastBackup = '';
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
    sn.subs.forEach(function (x) { if (uniq('Sottotipologia', x) && (!txtOk(x.name, 100) || !TYPES[x.type])) bad('Sottotipologia non valida.'); });
    sn.cats.forEach(function (x) { if (uniq('Categoria', x) && (!txtOk(x.name, 100) || (x.kind !== 'spesa' && x.kind !== 'entrata') || !iconOk(x.icon))) bad('Categoria non valida.'); });
    sn.accounts.forEach(function (a) {
      if (!uniq('Conto', a)) return; accIds[a.id] = 1;
      if (!txtOk(a.name, 100) || !a.name) bad('Conto senza nome.');
      if (!iconOk(a.icon) || !colOk(a.color)) bad('Icona o colore del conto non validi (' + a.id + ').');
      if (!TYPES[a.type]) bad('Tipo di conto non valido (' + a.id + ').');
      if (!isInt(a.opening)) bad('Saldo iniziale non valido (' + a.id + ').');
      if (!dRange(a.openDate)) bad('Data di apertura non valida (' + a.id + ').');
    });
    sn.gone.forEach(function (a) { if (uniq('Conto', a)) { accIds[a.id] = 1; if (!txtOk(a.name, 100) || !TYPES[a.type] || !iconOk(a.icon) || !colOk(a.color)) bad('Conto eliminato non valido.'); } });
    sn.pos.forEach(function (p) {
      if (!uniq('Investimento', p)) return; posIds[p.id] = 1;
      if (typeof p.isin !== 'string' || (p.isin !== '' && !isinOk(p.isin))) bad('ISIN non valido (' + p.id + ').');
      if (p.kind !== 'inv' && p.kind !== 'crypto') bad('Tipo di investimento non valido (' + p.id + ').');
      if (typeof p.sym !== 'string' || p.sym.length > 12) bad('Simbolo non valido (' + p.id + ').');
      if (!txtOk(p.name, 100) || !p.name) bad('Investimento senza nome.');
      if (p.lots.length > LIM.lots || p.prices.length > LIM.prices) bad('Troppe operazioni (' + p.id + ').');
      var lid = {};
      p.lots.forEach(function (l) {
        if (!l || typeof l.id !== 'string' || lid[l.id]) { bad('Operazione non valida (' + p.id + ').'); return; } lid[l.id] = 1;
        if (!dRange(l.d) || !isQty(l.qty) || l.qty === 0 || !isInt(l.px) || l.px <= 0 || l.px > PMAX || !isInt(l.tot)) bad('Operazione non valida (' + p.id + ').');
      });
      p.prices.forEach(function (x) { if (!x || !dRange(x.d) || !isInt(x.px) || x.px <= 0 || x.px > PMAX) bad('Prezzo non valido (' + p.id + ').'); });
      if (!e.length && !lotsOk(p.lots)) bad('Vendita oltre le quote (' + p.name + ').');
    });
    var KINDS = { spesa: 1, entrata: 1, giro: 1, rett: 1, inv: 1 };
    sn.tx.forEach(function (t) {
      if (!uniq('Movimento', t)) return; txIds[t.id] = 1;
      if (!KINDS[t.kind]) bad('Tipo di movimento non valido (' + t.id + ').');
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
      if (r.type === 'mov' && r.kind !== 'spesa' && r.kind !== 'entrata' && r.kind !== 'giro') bad('Ricorrenza non valida (' + r.id + ').');
    });
    if (sn.prefs && sn.prefs.cur && sn.prefs.cur !== 'EUR' && sn.prefs.cur !== 'USD') bad('Valuta non valida.');
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
    splash('<p>' + welcomeNote() + ' Puoi esportarne una copia su file quando vuoi.</p>' +
      '<div class="splashb"><button class="btn" data-act="start0">Inizia da zero</button><button class="btn ghost" data-act="startdemo">Prova con dati di esempio</button>' +
      '<label class="btn ghost" for="imp-file" role="button">Ripristina da un backup</label></div>');
  }
  function bootFail(code) {
    var msg = code === 'schema_newer' ? 'I dati salvati sono di una versione più recente dell’app: aggiorna l’app.' :
      code === 'data_invalid' || code === 'chunk_corrupt' || code === 'chunk_missing' || code === 'meta_invalid' || code === 'corrupt' ? 'I dati salvati risultano incompleti o danneggiati.' : 'Non riesco a leggere i dati salvati.';
    splash('<p>' + msg + ' Non ho modificato nulla.</p><div class="splashb"><button class="btn" data-act="retryboot">Riprova</button><label class="btn ghost" for="imp-file" role="button">Ripristina da un backup</label></div>');
  }
  function enter() { document.body.classList.remove('boot'); PER.canWrite = true; render(); touch(); if (!PER.snapDone) { PER.snapDone = true; snapCapture('auto', 'Salvataggio automatico'); } }
  function startFresh(demo) {
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
    return { snap: sn, at: o.exportedAt || '' };
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
    var html = scrHead('Importa backup', true) + '<div class="scrb"><div class="card"><div class="sb">' + (r.what || 'Backup') + (r.at && r.at.slice(0, 10) === TODAY ? ' di oggi' : ' del ' + (r.at ? dayLabel(r.at.slice(0, 10)) : '—')) + '</div>' +
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
  async function syncBase() {
    try { var r = await PER.repo.load(); PER.base = r ? r.rev : 0; }
    catch (e) { await PER.repo.clear(); PER.base = 0; }
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
  function versionRow() { return '<p class="note" style="margin-top:6px">Versione ' + esc(window.UF_BUILD || 'sviluppo') + '</p>'; }
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
      snapCapture('pre', m === 'mine' ? 'Versione scartata (altra copia)' : 'Versione scartata (questa copia)', m === 'mine' ? (c.remote && c.remote.snap) : c.local);
      if (m === 'mine') { await syncBase(); applySnap(c.local); PER.canWrite = true; PER.dirty = true; closeAll(); await flushNow(); toast('Tenuti i dati di questa copia.'); }
      else { applySnap(c.remote.snap); PER.base = c.remote.meta.rev; PER.sig = stable(snapState()); PER.canWrite = true; PER.dirty = false; closeAll(); toast('Caricati i dati salvati.'); }
    } catch (e) { PER.conf = c; toast('Non riesco a leggere l’archivio. Riprova.'); }
  }
  async function checkRemote() {
    if (!PER.canWrite || PER.busy || PER.conf) return;
    if (ymd(new Date()) !== TODAY) { await flushNow(); try { location.reload(); } catch (e) {} return; }
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
    runRules(true); enter();
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
    var types = ['application/json', 'text/plain'], i, f;
    var fallback = function () { downloadBlob(new Blob([text], { type: 'application/json' }), name); markBackup(); toast('Backup scaricato.'); return true; };
    if (navigator.share && navigator.canShare && typeof File === 'function') {
      for (i = 0; i < types.length; i++) {
        try { f = new File([text], name, { type: types[i] }); } catch (e) { f = null; }
        if (f && navigator.canShare({ files: [f] })) {
          return navigator.share({ files: [f], title: 'Backup UFinance Track' }).then(function () { markBackup(); toast('Backup condiviso.'); return true; },
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
    if (prev) snapCapture('pre', lay.st.what === 'Versione' ? 'Prima di ripristinare una versione' : 'Prima di importare un backup', prev);
    if (!PER.canWrite && PER.db) { try { await syncBase(); } catch (e) {} }
    applySnap(clone(sn));
    document.body.classList.remove('boot'); PER.canWrite = true; PER.dirty = true; PER.status = PER.db ? 'saving' : 'mem';
    closeAll(); runRules(true);
    toast('Backup importato.', prev ? function () { applySnap(prev); touch(); } : null);
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
    while (L.length) L.pop().el.remove(); document.body.classList.remove('lock');
    emptyState(); S.tab = 'home'; welcome();
  }
  window.addEventListener('pagehide', function () { if (PER.canWrite && PER.dirty) { clearTimeout(PER.timer); flush(); } });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { if (PER.canWrite && PER.dirty) { clearTimeout(PER.timer); flush(); } }
    else checkRemote();
  });
  function testHooks() { return { flush: flush, flushNow: flushNow, checkRemote: checkRemote, repo: PER.repo, backupFile: backupFile }; }

  /* ================= eventi ================= */
  function act(n, el) {
    var d = el.dataset, lay = topL(), st = lay ? lay.st : null, al, id;
    switch (n) {
      case 'tab': S.tab = d.tab; render(); window.scrollTo(0, 0); break;
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
        closeAll(); toast('Movimento eliminato', function () { S.tx.push(t); }); break;
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
      case 'newsubacc': if (st) newSubForm(st.type, true); break;
      case 'aicon': if (st) { st.icon = ICONS[+d.i]; syncAcc(); } break;
      case 'acol': if (st) { st.col = COLORS[+d.i]; syncAcc(); } break;
      case 'saveacc': saveAcc(); break;
      case 'delaccopen': openDelAcc(d.id || (st && st.id)); break;
      case 'delmode': if (st) { st.mode = d.m; syncDel(); } break;
      case 'delaccgo': delAccRun(el); break;
      case 'nwopen': nwOpen(); break;
      case 'nwper': if (st) { st.preset = d.p; nwDraw(); } break;
      case 'nwreset': nwHead(-1); break;
      case 'savename': saveName(); break;
      case 'delname': delName(el); break;
      case 'cicon': if (st) { st.icon = ICONS[+d.i]; syncCat(); } break;
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
      case 'pos': case 'posopen': if (lay && lay.kind === 'sheet') popLayer(); nwOpen('pos:' + d.id); break;
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
      case 'undo': if (undoFn) { undoFn(); undoFn = null; $('#toast').hidden = true; render(); } break;
      case 'close': popLayer(); break;
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
    if (el.id === 'imp-file') { var ff = el.files && el.files[0]; el.value = ''; importFile(ff); return; }
    if (el.id === 'a-date') {
      var al = layerOf('add'); if (al) { al.st.date = el.value || TODAY; syncAdd(); }
      return;
    }
    if (el.id && el.id.indexOf('k-') === 0) { syncPac(); return; }
    if (el.id === 'r-freq') { var rl = layerOf('ruleform'); if (rl) cadShow(rl, 'r'); return; }
    if (!k) return;
    if (k === 'hide') { S.hide = el.checked; savePrefs(); render(); }
    else if (k === 'block') { S.an.blocks[el.dataset.b] = el.checked; render(); }
    else if (k === 'nwrange') {
      var nl2 = layerOf('nw'); if (!nl2) return;
      var f2 = $('#nw-from').value, t2 = $('#nw-to').value;
      if (!f2 || !t2) return;
      if (f2 > TODAY) f2 = TODAY; if (t2 > TODAY) t2 = TODAY; if (f2 > t2) t2 = f2;
      nl2.st.from = f2; nl2.st.to = t2; nwDraw();
    }
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
  });
  // Mentre scrivi la nota il tastierino si nasconde: la schermata non si sposta.
  document.addEventListener('focusin', function (e) { if (e.target.id === 'a-note') { var al = layerOf('add'); if (al) al.el.classList.add('typing'); } });
  document.addEventListener('focusout', function (e) { if (e.target.id === 'a-note') { var al = layerOf('add'); if (al) al.el.classList.remove('typing'); } });
  // Grafico del patrimonio: il dito (o il mouse) scorre sulla curva e mostra il valore di quel giorno.
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('#nw-svg')) nwPointer(e); });
  document.addEventListener('pointermove', function (e) { if (e.target.closest && e.target.closest('#nw-svg') && (e.pointerType === 'mouse' || e.buttons)) nwPointer(e); });
  function nwEnd(e) { if (layerOf('nw') && (!e.target.closest || e.target.closest('#nw-svg') || e.type === 'pointercancel')) nwHead(-1); }
  document.addEventListener('pointerup', nwEnd);
  document.addEventListener('pointercancel', nwEnd);
  document.addEventListener('pointerout', function (e) { if (e.pointerType === 'mouse' && e.target.id === 'nw-svg') nwHead(-1); });
  document.addEventListener('keydown', function (e) {
    var lay = topL(); if (!lay) return;
    if (e.key === 'Escape') { if (lay.name !== 'conf') popLayer(); return; }
    if (lay.name !== 'add') return;
    var tag = document.activeElement ? document.activeElement.tagName : '';
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') { if (e.key === 'Enter' && document.activeElement.id === 'a-note') document.activeElement.blur(); return; }
    if (/^[0-9]$/.test(e.key)) keyPress(e.key);
    else if (e.key === ',' || e.key === '.') keyPress(',');
    else if (e.key === 'Backspace') { e.preventDefault(); keyPress('back'); }
    else if (e.key === 'Enter') saveTx();
  });

  window.__UF = Object.assign(testHooks(), { P: PER, snapState: snapState, applySnap: applySnap, validateSnap: validateSnap, readBackup: readBackup, hash53: hash53, stable: stable, boot: boot, summ: summ, exportBackup: exportBackup, emptyState: emptyState, S: S, L: L, balance: balance, netWorth: netWorth, parseCents: parseCents, isinOk: isinOk, posValue: posValue, alloc: alloc, buckets: buckets, range: range, stats: stats, scopeValue: scopeValue, scopeSet: scopeSet, act: act, render: render, nwSeries: nwSeries, firstDate: firstDate, delPlan: delPlan, accName: accName, nwRange: nwRange, pctS: pctS, chgPct: chgPct, nwPointer: nwPointer, posValue: posValue, portfolioValue: portfolioValue, posCalc: posCalc, posStat: posStat, xirr: xirr, runRules: runRules, nthDate: nthDate, lotsOk: lotsOk, pxAt: pxAt, snapAll: snapAll, restoreAll: restoreAll, parsePx: parsePx, delPosPlan: delPosPlan,  TODAY: TODAY, money: money, addDays: addDays, dn: dn, ymd: ymd, parseD: parseD, posById: posById, encryptBackup: encryptBackup, decryptBackup: decryptBackup, snapCapture: snapCapture, remBanner: remBanner, gz: gz, gunz: gunz });
    window.addEventListener('uf-toast', function (e) { toast(String(e.detail || '')); });
boot();
})();
