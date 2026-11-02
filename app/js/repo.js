/* UFRepo: unico punto di accesso ai dati di UFinance Track.
 *
 * Nessun altro file legge o scrive IndexedDB. Per passare a SQLite nativo con Capacitor basta
 * fornire un oggetto con la stessa interfaccia (tutte le chiamate restituiscono Promise):
 *
 *   open()                      apre l'archivio (crea le tabelle mancanti, non cancella mai nulla)
 *   load()                      -> null se vuoto, altrimenti { snapshot, rev, savedAt }
 *   commit(snapshot, expectedRev)  salva SOLO ciò che è cambiato, in un'unica transazione atomica.
 *                               Se la revisione salvata non è expectedRev rifiuta con {code:'conflict'}.
 *                               Restituisce la nuova revisione.
 *   readRev()                   revisione attuale (0 se vuoto)
 *   clear()                     cancella tutto
 *   persist()                   chiede al sistema di non eliminare i dati (storage.persist)
 *   estimate()                  { usage, quota } in byte, se disponibile
 *
 * Forma dello snapshot (la stessa del file di backup):
 *   { schema, subs[], cats[], accounts[], gone[], tx[], pos[], rules[], prefs{} }
 * Ogni elemento delle liste ha un campo `id` stringa. L'ordine delle liste viene conservato.
 *
 * Importi: sempre numeri interi (centesimi; quantità in micro-unità; prezzi in 1/10000).
 * Questo modulo non fa calcoli: salva e rilegge JSON canonico, quindi nessuna perdita di precisione.
 */
(function (global) {
  'use strict';
  var DB_NAME = 'ufinance', DB_VERSION = 2, META_KEY = 'state';
  var LISTS = ['subs', 'cats', 'accounts', 'gone', 'tx', 'pos', 'rules'];
  var db = null, opening = null, shadow = {}, shadowMeta = '', lastRev = 0;

  function stable(o) {
    if (o === null || typeof o !== 'object') return JSON.stringify(o);
    if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
    return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(o[k]); }).join(',') + '}';
  }
  function err(e, fallback) {
    var n = e && e.name, m = (e && e.message) || '';
    if (n === 'QuotaExceededError' || /quota/i.test(m)) return { code: 'quota', message: m };
    if (e && e.code && typeof e.code === 'string' && !n) return e;
    return { code: fallback || 'storage', message: m || n || 'errore archivio' };
  }

  function open() {
    if (db) return Promise.resolve(db);
    if (opening) return opening;
    opening = new Promise(function (res, rej) {
      if (!global.indexedDB) { rej({ code: 'unsupported', message: 'IndexedDB non disponibile' }); return; }
      var rq;
      try { rq = global.indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { rej(err(e)); return; }
      // Aggiornamento dello schema: SOLO creazioni. Mai deleteObjectStore / clear qui.
      rq.onupgradeneeded = function () {
        var d = rq.result;
        LISTS.forEach(function (n) { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n, { keyPath: 'id' }); });
        if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
        if (!d.objectStoreNames.contains('snaps')) d.createObjectStore('snaps', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('snapz')) d.createObjectStore('snapz', { keyPath: 'id' });
      };
      rq.onsuccess = function () {
        db = rq.result;
        db.onversionchange = function () { db.close(); db = null; };
        db.onclose = function () { db = null; };
        res(db);
      };
      rq.onerror = function () { rej(err(rq.error)); };
      // un'altra scheda con la versione precedente chiude da sola la connessione: si attende, poi si rinuncia
      rq.onblocked = function () { setTimeout(function () { if (!db) rej({ code: 'blocked', message: 'Chiudi le altre schede dell’app.' }); }, 8000); };
    }).then(function (d) { opening = null; return d; }, function (e) { opening = null; throw e; });
    return opening;
  }

  function fresh() { shadow = {}; LISTS.forEach(function (n) { shadow[n] = new Map(); }); shadowMeta = ''; lastRev = 0; }
  fresh();

  function sortedOf(rows) { return rows.sort(function (a, b) { return a.o - b.o; }); }

  function load() {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(LISTS.concat('meta'), 'readonly'), got = {}, meta = null;
        LISTS.forEach(function (n) { var r = t.objectStore(n).getAll(); r.onsuccess = function () { got[n] = r.result; }; });
        var m = t.objectStore('meta').get(META_KEY); m.onsuccess = function () { meta = m.result || null; };
        t.onerror = function () { rej(err(t.error)); };
        t.onabort = function () { rej(err(t.error)); };
        t.oncomplete = function () {
          if (!meta) { fresh(); res(null); return; }
          try {
            var sn = { schema: meta.schema, prefs: meta.prefs || {} }, sh = {};
            LISTS.forEach(function (n) {
              var rows = sortedOf(got[n] || []), map = new Map();
              sn[n] = rows.map(function (r) {
                var o = JSON.parse(r.j); map.set(r.id, r.o + '|' + r.j); return o;
              });
              sh[n] = map;
            });
            shadow = sh; shadowMeta = stable({ schema: meta.schema, prefs: meta.prefs || {} }); lastRev = meta.rev;
            res({ snapshot: sn, rev: meta.rev, savedAt: meta.savedAt || 0 });
          } catch (e) { rej({ code: 'corrupt', message: 'Dati salvati illeggibili' }); }
        };
      });
    });
  }

  function commit(sn, expected) {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var plan = {}, next = {}, changes = 0;
        LISTS.forEach(function (n) {
          var cur = shadow[n] || new Map(), nm = new Map(), puts = [], dels = [];
          (sn[n] || []).forEach(function (o, i) {
            var j = stable(o), sig = i + '|' + j;
            if (nm.has(o.id)) throw { code: 'duplicate_id', message: n + ': id duplicato' };
            nm.set(o.id, sig);
            if (cur.get(o.id) !== sig) puts.push({ id: o.id, o: i, j: j });
          });
          cur.forEach(function (_, id) { if (!nm.has(id)) dels.push(id); });
          plan[n] = { puts: puts, dels: dels }; next[n] = nm; changes += puts.length + dels.length;
        });
        var metaSig = stable({ schema: sn.schema, prefs: sn.prefs || {} });
        if (!changes && metaSig === shadowMeta && expected === lastRev) { res(lastRev); return; }
        var t = d.transaction(LISTS.concat('meta'), 'readwrite'), ms = t.objectStore('meta'), newRev = 0, conflict = false;
        var g = ms.get(META_KEY);
        g.onsuccess = function () {
          var m = g.result, r = m ? m.rev : 0;
          if (r !== expected) { conflict = true; try { t.abort(); } catch (e) {} return; }
          newRev = r + 1;
          LISTS.forEach(function (n) {
            var st = t.objectStore(n);
            plan[n].dels.forEach(function (id) { st.delete(id); });
            plan[n].puts.forEach(function (rec) { st.put(rec); });
          });
          ms.put({ k: META_KEY, rev: newRev, schema: sn.schema, prefs: sn.prefs || {}, savedAt: Date.now(),
            counts: { acc: (sn.accounts || []).length, tx: (sn.tx || []).length, pos: (sn.pos || []).length } });
        };
        t.oncomplete = function () { shadow = next; shadowMeta = metaSig; lastRev = newRev; res(newRev); };
        t.onabort = function () { rej(conflict ? { code: 'conflict', message: 'Dati cambiati altrove' } : err(t.error || { name: 'AbortError' })); };
        t.onerror = function () { /* segue onabort */ };
      });
    }).catch(function (e) { throw (e && e.code && typeof e.code === 'string' && !e.name) ? e : err(e); });
  }

  function readRev() {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var r = d.transaction('meta', 'readonly').objectStore('meta').get(META_KEY);
        r.onsuccess = function () { res(r.result ? r.result.rev : 0); };
        r.onerror = function () { rej(err(r.error)); };
      });
    });
  }

  function clear() {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var all = LISTS.concat(['meta', 'snaps', 'snapz']), t = d.transaction(all, 'readwrite');
        all.forEach(function (n) { t.objectStore(n).clear(); });
        t.oncomplete = function () { fresh(); res(); };
        t.onerror = t.onabort = function () { rej(err(t.error)); };
      });
    });
  }

  /* ---- versioni salvate: 'snaps' = indice leggero, 'snapz' = contenuto compresso ---- */
  function snapTx(mode, fn) {
    return open().then(function (d) {
      return new Promise(function (res, rej) {
        var t = d.transaction(['snaps', 'snapz'], mode), out;
        try { out = fn(t.objectStore('snaps'), t.objectStore('snapz')); } catch (e) { rej(err(e)); return; }
        t.oncomplete = function () { res(typeof out === 'function' ? out() : out); };
        t.onerror = t.onabort = function () { rej(err(t.error)); };
      });
    });
  }
  function snapList() {
    return snapTx('readonly', function (si) { var r = si.getAll(); return function () { return (r.result || []).sort(function (a, b) { return (b.at || 0) - (a.at || 0); }); }; });
  }
  function snapPut(rec) {
    var m = {}; Object.keys(rec).forEach(function (k) { if (k !== 'z') m[k] = rec[k]; });
    return snapTx('readwrite', function (si, sz) { si.put(m); sz.put({ id: rec.id, z: rec.z }); });
  }
  function snapGet(id) {
    return snapTx('readonly', function (si, sz) { var a = si.get(id), b = sz.get(id); return function () { return a.result && b.result ? Object.assign({}, a.result, { z: b.result.z }) : null; }; });
  }
  function snapDel(id) { return snapTx('readwrite', function (si, sz) { si.delete(id); sz.delete(id); }); }

  function persist() {
    var s = global.navigator && global.navigator.storage;
    if (!s || !s.persist) return Promise.resolve(null);
    return (s.persisted ? s.persisted() : Promise.resolve(false)).then(function (p) { return p ? true : s.persist(); }).catch(function () { return null; });
  }
  function estimate() {
    var s = global.navigator && global.navigator.storage;
    return s && s.estimate ? s.estimate().catch(function () { return null; }) : Promise.resolve(null);
  }

  global.UFRepo = { open: open, load: load, commit: commit, readRev: readRev, clear: clear, persist: persist, estimate: estimate, snapList: snapList, snapPut: snapPut, snapGet: snapGet, snapDel: snapDel, _stable: stable };
})(self);
