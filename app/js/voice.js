/* UFVoice: trasforma una frase in italiano in movimenti proposti (nessuna rete, nessun dato inviato).
 *
 *   UFVoice.parse(testo, ctx) -> [{ kind, loan, cents|null, accId, toId, catId, date, note, person, newAcc, warn[] }]
 *
 * ctx = { accounts: [{id,name,type,bal}], cats: [{id,name,kind}], today: 'AAAA-MM-GG', defAcc: id }
 * kind: 'spesa' | 'entrata' | 'giro'. loan = true per un prestito a una persona (giroconto verso un conto di credito).
 * toId '__new__' + newAcc { name, type: 'credito' } quando il conto di credito della persona non esiste ancora.
 * Importi in centesimi interi. È un riconoscimento a regole: l'anteprima va sempre confermata dall'utente.
 */
(function (global) {
  'use strict';
  function fold(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, '\''); }
  function hasK(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }
  function reEsc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function aTo(n) { return (/^[aeiou]/i.test(fold(n)) ? 'ad ' : 'a ') + n; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return ymd(d); }

  /* ---- numeri in lettere: «cinque», «venticinque», «centocinquanta», «duemila» ---- */
  var UNITS = { zero: 0, un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, undici: 11, dodici: 12, tredici: 13, quattordici: 14, quindici: 15, sedici: 16, diciassette: 17, diciotto: 18, diciannove: 19 };
  var TENS = { venti: 20, trenta: 30, quaranta: 40, cinquanta: 50, sessanta: 60, settanta: 70, ottanta: 80, novanta: 90 };
  function wn(w) {
    if (!w) return 0;
    if (hasK(UNITS, w)) return UNITS[w];
    var i = w.indexOf('mila');
    if (i > 0) { var a = wn(w.slice(0, i)), b = wn(w.slice(i + 4)); return a === null || b === null || a < 2 ? null : a * 1000 + b; }
    if (w.indexOf('mille') === 0) { var r = wn(w.slice(5)); return r === null ? null : 1000 + r; }
    i = w.indexOf('cento');
    if (i >= 0) { var l = i ? wn(w.slice(0, i)) : 1, rr = wn(w.slice(i + 5)); return l === null || rr === null || l > 9 ? null : l * 100 + rr; }
    for (var t in TENS) {
      var s = t.slice(0, -1);
      if (w.indexOf(t) === 0) { var x = wn(w.slice(t.length)); return x === null || x > 9 ? null : TENS[t] + x; }
      if (w.indexOf(s) === 0 && /^[uo]/.test(w.slice(s.length))) { var y = wn(w.slice(s.length)); return y === null || y > 9 ? null : TENS[t] + y; }
    }
    return null;
  }
  function wordNum(w) { var v = wn(w); return v === null || w === 'un' || w === 'una' || w === 'uno' ? (w === 'un' || w === 'uno' || w === 'una' ? 1 : null) : v; }

  var MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  var MONTH_RE = MONTHS.join('|');

  /* ---- importo: preferisce un numero con «€/euro»; evita i numeri delle date ---- */
  function numVal(raw) {
    var s = raw;
    if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var v = parseFloat(s); return isFinite(v) && v > 0 && v < 1e9 ? Math.round(v * 100) : null;
  }
  function amount(s) {
    var re = /(€\s*)?(\d+(?:[.,]\d+)*)(\s*(?:€|euro\b|eur\b))?(?:\s+e\s+(\d{1,2})(?:\s*(?:centesimi|cent)\b)?)?/g, m, best = null;
    while ((m = re.exec(s))) {
      var after = s.slice(re.lastIndex, re.lastIndex + 14), before = s.slice(Math.max(0, m.index - 4), m.index);
      var cur = !!(m[1] || m[3]);
      if (!cur && (new RegExp('^\\s*(' + MONTH_RE + ')').test(after) || /\b(il|del|al)\s$/.test(before) || /^\s*(ore|:)/.test(after))) continue;
      var v = numVal(m[2]); if (v === null) continue;
      if (m[4] && cur) v += +m[4] * (m[4].length === 1 && !/cent/.test(m[0]) ? 10 : 1);
      if (cur) return v;
      if (best === null) best = v;
    }
    var w = /\b([a-z]+)\s+(?:€|euro\b)(?:\s+e\s+([a-z]+))?/.exec(s);
    if (w) { var a = wordNum(w[1]); if (a !== null && a > 0) { var c = w[2] ? wordNum(w[2]) : 0; return a * 100 + (c && c < 100 ? c : 0); } }
    return best;
  }

  /* ---- data: oggi, ieri, l'altro ieri, giorni della settimana, «il 3», «3 novembre» ---- */
  var WD = ['domenica', 'lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato'];
  // la frase (o il pezzo) indica una data?
  function hasDate(s) { return /\b(oggi|stamattina|stamani|stasera|stanotte|ieri|altroieri|avantieri|domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)\b/.test(s) || new RegExp('\\b\\d{1,2}\\s+(' + MONTH_RE + ')\\b').test(s) || /\b(?:il|lo)\s+\d{1,2}\b(?!\s*(?:€|euro))/.test(s); }
  function dateOf(s, today) {
    if (/\b(l'?altro ?ieri|altroieri|avantieri)\b/.test(s)) return addDays(today, -2);
    if (/\bieri\b/.test(s)) return addDays(today, -1);
    var m = new RegExp('\\b(\\d{1,2})\\s+(' + MONTH_RE + ')\\b').exec(s);
    if (m) {
      var y = +today.slice(0, 4), mo = MONTHS.indexOf(m[2]) + 1, d = +m[1], c = y + '-' + pad(mo) + '-' + pad(d);
      if (c > today) c = (y - 1) + '-' + pad(mo) + '-' + pad(d);
      var dd = parseD(c); return dd.getDate() === d ? c : today;
    }
    m = /\b(?:il|lo)\s+(\d{1,2})\b(?!\s*(?:€|euro))/.exec(s);
    if (m && +m[1] >= 1 && +m[1] <= 31) {
      var base = parseD(today), cand = new Date(base.getFullYear(), base.getMonth(), +m[1]);
      if (ymd(cand) > today) cand = new Date(base.getFullYear(), base.getMonth() - 1, +m[1]);
      if (cand.getDate() === +m[1]) return ymd(cand);
    }
    for (var i = 0; i < 7; i++) if (new RegExp('\\b' + WD[i] + '\\b').test(s)) {
      var t = parseD(today), back = (t.getDay() - i + 7) % 7; return addDays(today, -back);
    }
    return today;
  }

  /* ---- categorie: parole chiave → nome della categoria (se esiste tra quelle dell'utente) ---- */
  var CAT_KW = [
    ['Salute', 'farmacia|farmaci|medicin\\w*|medico|dottore|dentista|visita|analisi del sangue|ospedale|ticket|ottico|occhiali', 'spesa'],
    ['Alimentari', 'supermercato|fatto la spesa|la spesa\\b|spesa al|alimentari|conad|coop|esselunga|lidl|carrefour|eurospin|pam|aldi|penny|panetteria|pane|frutta|verdura|macellaio|pescheria', 'spesa'],
    ['Ristoranti', 'ristorante|pizzeria|pizza|trattoria|osteria|sushi|bar\\b|caffe|colazione|pranzo|cena|aperitivo|spritz|kebab|mcdonald\\w*|burger|gelato|take ?away|deliveroo|glovo|just eat', 'spesa'],
    ['Trasporti', 'benzina|carburante|gasolio|diesel|pieno|treno|trenitalia|italo|autobus|bus\\b|metro|taxi|uber|parcheggio|autostrada|pedaggio|telepass|biglietto|monopattino|bici', 'spesa'],
    ['Casa', 'affitto|bolletta|bollette|luce|gas\\b|acqua|condominio|internet|wifi|fibra|tari|mutuo|ikea|arredamento|pulizie', 'spesa'],
    ['Abbonamenti', 'netflix|spotify|disney|prime video|amazon prime|abbonamento|dazn|icloud|youtube premium|chatgpt', 'spesa'],
    ['Svago', 'cinema|concerto|teatro|museo|libro|libri|videogioc\\w*|playstation|discoteca|partita|stadio|palestra|viaggio|vacanza|hotel', 'spesa'],
    ['Stipendio', 'stipendio|busta paga|salario|tredicesima|quattordicesima', 'entrata'],
    ['Rimborsi', 'rimborso|rimborsato|rimborsi', 'entrata'],
    ['Regali', 'regalo|regalato|regali|compleanno', 'entrata']
  ];
  function catOf(s, kind, cats) {
    // prima le categorie dell'utente nominate esplicitamente
    var own = cats.filter(function (c) { return c.kind === kind && fold(c.name).length >= 3 && new RegExp('\\b' + fold(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(s); })[0];
    if (own) return { id: own.id, word: own.name };
    for (var i = 0; i < CAT_KW.length; i++) {
      if (CAT_KW[i][2] !== kind) continue;
      var m = new RegExp('\\b(' + CAT_KW[i][1] + ')').exec(s);
      if (m) { var c = cats.filter(function (x) { return x.kind === kind && fold(x.name) === fold(CAT_KW[i][0]); })[0]; return { id: c ? c.id : '', word: m[1] }; }
    }
    return { id: '', word: '' };
  }

  /* ---- conti e persone ---- */
  var GENERIC = { conto: 1, carta: 1, banca: 1, di: 1, del: 1, della: 1, la: 1, il: 1, corrente: 1, 'c/c': 1, cc: 1, risparmio: 1, credito: 1, debito: 1 };
  var STOP = { il: 1, lo: 1, la: 1, i: 1, gli: 1, le: 1, un: 1, uno: 1, una: 1, mio: 1, mia: 1, miei: 1, mie: 1, suo: 1, sua: 1, me: 1, te: 1, lui: 1, lei: 1, noi: 1, voi: 1, loro: 1, conto: 1, carta: 1, banca: 1, bonifico: 1, euro: 1, che: 1, e: 1, ed: 1, pagare: 1, casa: 1, cena: 1, pranzo: 1 };
  function accRefs(s, accounts) {
    var out = [], cnt = {};
    // una parola generica («banca», «carta», «risparmio») vale se un solo conto la contiene
    accounts.forEach(function (a) { fold(a.name).split(/[^a-z0-9]+/).forEach(function (w) { if (w) cnt[w] = (cnt[w] || 0) + 1; }); });
    accounts.forEach(function (a) {
      var nm = fold(a.name), keys = [nm].concat(nm.split(/[^a-z0-9]+/).filter(function (w) { return w.length >= 4 && (!GENERIC[w] || cnt[w] === 1); }));
      if (a.type === 'liquidita' && /contant/.test(nm)) keys.push('contanti', 'cash', 'in contanti');
      if (a.type === 'debito' && /carta/.test(nm)) keys.push('carta di credito', 'con la carta');
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), m = new RegExp('\\b' + k + '\\b').exec(s);
        if (m) { out.push({ a: a, pos: m.index }); break; }
      }
    });
    return out.sort(function (x, y) { return x.pos - y.pos; });
  }
  function prepBefore(s, pos) {
    var m = /\b(da|dal|dalla|dallo|dai|con|col|con la|con il|dalla mia|dal mio)\s+(?:mia |mio |la |il |l')?$|\b(a|ad|al|alla|allo|ai|sul|sulla|su|verso|per|nel|nella|in)\s+(?:mia |mio |la |il |l')?$/.exec(s.slice(Math.max(0, pos - 16), pos));
    return !m ? '' : m[1] ? 'from' : 'to';
  }
  // persona: prima dopo «a/ad/per/verso» (destinatario), poi dopo «da/di» (es. «ricevuto da Marco»)
  function personOf(s, accounts) {
    var accWords = {}; accounts.forEach(function (a) { fold(a.name).split(/[^a-z0-9]+/).forEach(function (w) { if (w) accWords[w] = 1; }); });
    var preps = ['a|ad|per|verso', 'da|di'];
    for (var k = 0; k < preps.length; k++) {
      var re = new RegExp('\\b(?:' + preps[k] + ')\\s+([a-z]{3,})', 'g'), m;
      while ((m = re.exec(s))) {
        var w = m[1];
        if (STOP[w] || accWords[w] || BANKS.test(w) || MONTHS.indexOf(w) >= 0 || WD.indexOf(w) >= 0 || wordNum(w) !== null || /^(pagat|ridar|restit|prest|mandat|inviat|bonific|contant|ieri|oggi|euro|farmac|supermerc|ristor|carta|cash|quando|dire)/.test(w)) continue;
        return cap(w);
      }
    }
    return '';
  }
  // nomi di banche e servizi di pagamento: mai scambiati per persone
  var BANKS = /^(unicredit|intesa|sanpaolo|fineco|bper|bnl|mps|montepaschi|credem|ing|revolut|n26|hype|satispay|paypal|poste|postepay|bancoposta|mediolanum|widiba|webank|chebanca|bancomat|amex|nexi|wise|bunq|illimity|isybank|buddybank|sella|crédit|credit|agricole|deutsche|banca|banco)$/;

  /* ---- divisione della frase in azioni ---- */
  var TRIG = /\b(ho |abbiamo |mi (?:hanno|ha) )?(pagat[oaie]|spes[oaie]|comprat[oaie]|acquistat[oaie]|pres[oaie]|ricevut[oaie]|incassat[oaie]|guadagnat[oaie]|mandat[oaie]|inviat[oaie]|fatto un bonifico|bonificat[oaie]|trasferit[oaie]|spostat[oaie]|girat[oaie]|versat[oaie]|prelevat[oaie]|prestat[oaie]|ricaricat[oaie]|ridat[oaie]|restituit[oaie]|res[oa]|rimborsat[oaie]|dat[oaie])\b/g;
  // virgola e punto separano solo se seguiti da spazio: «12,50» e «12.50» restano importi
  var SEP = /(,(?=\s|$)|;|\.(?=\s|$)|\be\b|\bed\b|\bpoi\b|\binoltre\b|\banche\b|\bdopo\b|\bpiu\b)/;
  function segments(s) {
    var idx = [], m; TRIG.lastIndex = 0;
    while ((m = TRIG.exec(s))) {
      var st = m.index;
      if (!idx.length) { idx.push(st); continue; }
      var prev = idx[idx.length - 1], gap = s.slice(prev, st), first = /^\S+\s*/.exec(gap)[0].length, body = gap.slice(first);
      // senza connettivo si divide solo se l'azione precedente ha già il suo importo («ho pagato 12,50 euro ho preso…»)
      if (!SEP.test(body)) { if (/\d/.test(body)) idx.push(st); continue; }
      // si taglia all'ultimo connettivo prima del verbo: «… e oggi ho ricevuto» → «oggi ho ricevuto» va con la seconda azione
      var re = new RegExp(SEP.source, 'g'), mm, cut = -1; while ((mm = re.exec(body))) cut = mm.index;
      idx.push(prev + first + cut);
    }
    if (!idx.length) return s.trim() ? [s.trim()] : [];
    var out = [];
    for (var i = 0; i < idx.length; i++) out.push(s.slice(i ? idx[i] : 0, i + 1 < idx.length ? idx[i + 1] : s.length).trim().replace(/^[\s,;.]*(\b(e|ed|poi|inoltre|anche|dopo|piu)\b)?[\s,;.]*/, '').replace(/[\s,;.]*(\b(e|ed|poi|inoltre)\b)?[\s,;.]*$/, ''));
    return out.filter(Boolean);
  }

  // parentela o relazione come destinatario: «a mio fratello», «alla mamma», «a mia sorella Giulia»
  var REL = /\b(?:a|ad|al|alla|allo|per)\s+(?:mio |mia |un |una |il |la |l')?(fratello|sorella|mamma|madre|papa|padre|nonno|nonna|zio|zia|cugino|cugina|amico|amica|collega|fidanzato|fidanzata|ragazzo|ragazza|marito|moglie|coinquilino|coinquilina|figlio|figlia|vicino|vicina)(?:\s+([a-z]{3,}))?/;
  var LOAN = /\b(me (?:li|lo|la|le) (?:ridara|ridaranno|restituira|restituiranno|rendera|renderanno|ridia|restituisca|deve)|mi (?:deve|dovra) (?:ridare|restituire|rendere)|deve ridarmel\w*|in prestito|prestat[oaie]|prestito|anticipat[oaie])\b/;
  var REPAY = /\b(mi (?:ha|hanno) (?:ridato|restituito|reso|ripagato|ridati|restituiti|resi)|(?:ridat|restituit)[oaie] (?:da|indietro))\b/;

  function parse(text, ctx) {
    var today = ctx.today, accounts = ctx.accounts || [], cats = ctx.cats || [], s0 = fold(text).replace(/\s+/g, ' ');
    var shared = dateOf(s0, today), items = [];
    segments(s0).forEach(function (s) {
      var it = { kind: 'spesa', loan: false, cents: amount(s), accId: '', toId: '', catId: '', date: dateOf(s, today), note: '', person: '', newAcc: null, warn: [], src: s };
      if (!hasDate(s) && shared !== today) it.date = shared; // data detta una volta per tutta la frase
      var refs = accRefs(s, accounts), from = null, to = null;
      refs.forEach(function (r) { var p = prepBefore(s, r.pos); if (p === 'to' && !to) to = r.a; else if (p === 'from' && !from) from = r.a; else if (!from) from = r.a; else if (!to) to = r.a; });
      var person = personOf(s, accounts), rel = REL.exec(s), relName = false;
      if (rel && (!person || fold(person) === rel[1])) { person = rel[2] && !STOP[rel[2]] ? cap(rel[2]) : cap(rel[1]); relName = !rel[2]; }
      var credit = function (nm) {
        if (!nm) return null; var f = fold(nm), cr = accounts.filter(function (a) { return a.type === 'credito'; });
        return cr.filter(function (a) { return fold(a.name) === f; })[0] || cr.filter(function (a) { return new RegExp('\\b' + reEsc(f) + '\\b').test(fold(a.name)); })[0] || null;
      };
      var liq = function (x) { return x && x.type !== 'credito' ? x : null; }; // conto «vero» (mai un credito) per spese ed entrate
      // conto di credito della persona nominata (anche quando il nome è riconosciuto come conto)
      var crRef = credit(person) || (from && from.type === 'credito' ? from : null) || (to && to.type === 'credito' ? to : null);
      // conto nominato ma assente (solo nomi riconoscibili come banca o servizio di pagamento)
      var named = /\b(?:dalla|dal|da|con|sulla|sul|su)\s+(?:la |il |l'|mia |mio )?([a-z0-9]+)\b/g, nm2, missingAcc = '';
      while ((nm2 = named.exec(s))) if (BANKS.test(nm2[1]) && !refs.some(function (r) { return fold(r.a.name).indexOf(nm2[1]) >= 0; })) { missingAcc = cap(nm2[1]); break; }

      if (/\b(prelevat|prelievo|bancomat)/.test(s) && !/\bpagat/.test(s)) {
        var cash = accounts.filter(function (a) { return /contant/.test(fold(a.name)); })[0];
        it.kind = 'giro'; it.accId = (from && from !== cash ? from : accounts.filter(function (a) { return a.type === 'liquidita' && a !== cash; })[0] || {}).id || ''; it.toId = cash ? cash.id : ''; it.note = 'Prelievo';
        if (!cash) it.warn.push('Nessun conto «Contanti»: scegli dove vanno i soldi.');
      } else if (REPAY.test(s) || (/\b(ricevut|incassat|riavut)|\bmi (?:ha|hanno) (?:dato|pagato|bonificato|mandato)\b/.test(s) && crRef && crRef.bal > 0)) {
        var ca = credit(person) || crRef || (to && to.type === 'credito' ? to : null) || (from && from.type === 'credito' ? from : null) ||
          accounts.filter(function (a) { return a.type === 'credito' && fold(a.name).split(/[^a-z]+/).some(function (w) { return w.length >= 3 && new RegExp('\\b' + w + '\\b').test(s); }); })[0];
        if (ca && !person) person = ca.name;
        if (ca) { it.kind = 'giro'; it.accId = ca.id; it.toId = (liq(to) || liq(from) || {}).id || ctx.defAcc; it.note = 'Restituiti da ' + (person || ca.name); }
        else { it.kind = 'entrata'; it.accId = (liq(to) || liq(from) || {}).id || ctx.defAcc; it.note = 'Restituiti' + (person ? ' da ' + person : ''); it.catId = (catOf('rimborso', 'entrata', cats)).id; }
      } else if (LOAN.test(s) || /\b(mandat|inviat|bonific|fatto un bonifico|dat[oaie]\b)/.test(s) && (person || to)) {
        var loan = LOAN.test(s) || (!!person && !to && /\bridar|restitu|prest/.test(s0.slice(s0.indexOf(s))));
        if (to && from && to.type !== 'credito' && !loan) { it.kind = 'giro'; it.accId = from.id; it.toId = to.id; it.note = 'Giroconto'; }
        else if (loan) {
          var c2 = (to && to.type === 'credito') ? to : credit(person);
          it.kind = 'giro'; it.loan = true; it.person = person || (c2 ? c2.name : ''); it.accId = (liq(from) || liq(to) || {}).id || ctx.defAcc;
          if (c2) it.toId = c2.id; else { it.toId = '__new__'; it.newAcc = { name: person, type: 'credito' }; }
          it.note = it.person ? 'Prestito ' + aTo(it.person) : 'Prestito';
          if (!it.person) it.warn.push('Scrivi il nome della persona.'); else if (relName) it.warn.push('Controlla il nome della persona.');
        } else { it.kind = 'spesa'; it.accId = (liq(from) || {}).id || ctx.defAcc; it.note = (/bonific/.test(s) ? 'Bonifico' : 'Pagamento') + (person ? ' ' + aTo(person) : ''); var cb = catOf(s, 'spesa', cats); it.catId = cb.id; }
      } else if (/\b(trasferit|spostat|girat|versat|ricaricat)/.test(s) && from && to) {
        it.kind = 'giro'; it.accId = from.id; it.toId = to.id; it.note = /ricaric/.test(s) ? 'Ricarica' : 'Giroconto';
      } else if (/\b(ricevut|incassat|guadagnat|entrat|arrivat|stipendio|rimborsat|rimborso)|\bmi (?:ha|hanno) (?:dato|pagato|bonificato|mandato)\b/.test(s)) {
        it.kind = 'entrata'; it.accId = (liq(to) || liq(from) || {}).id || ctx.defAcc;
        var ce = catOf(s, 'entrata', cats); it.catId = ce.id; it.note = ce.word ? cap(ce.word) : (person ? 'Da ' + person : '');
      } else {
        it.kind = 'spesa'; it.accId = (liq(from) || liq(to) || {}).id || ctx.defAcc;
        var cs = catOf(s, 'spesa', cats); it.catId = cs.id; it.note = cs.word ? cap(cs.word) : '';
      }
      if (missingAcc && it.accId === ctx.defAcc) it.warn.push('Conto «' + missingAcc + '» non trovato: scegli il conto.');
      if (it.cents === null) it.warn.push('Importo non detto: inseriscilo.');
      if (it.kind === 'giro' && it.accId && it.accId === it.toId) it.warn.push('Scegli due conti diversi.');
      it.note = it.note.slice(0, 60);
      items.push(it);
    });
    return items;
  }

  global.UFVoice = { parse: parse, amount: amount, dateOf: dateOf, segments: segments, wordNum: wordNum, fold: fold };
})(self);
