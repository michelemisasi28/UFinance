/* Registrazione del service worker e aggiornamenti.
 * L'interfaccia viene aggiornata solo quando l'utente lo conferma: così non si cambia versione
 * a metà di un inserimento. Il service worker non tocca mai IndexedDB: i dati restano sempre. */
(function () {
  'use strict';
  var reg = null, waitingWorker = null, applying = false, lastCheck = 0;
  function say(t) { try { window.dispatchEvent(new CustomEvent('uf-toast', { detail: t })); } catch (e) {} }

  // colore della barra di stato coerente col tema scelto nell'app
  function themeColor() {
    var m = document.querySelector('meta[name="theme-color"]'); if (!m) return;
    m.setAttribute('content', document.documentElement.getAttribute('data-uf') === 'scuro' ? '#0F161C' : '#F2F2F4');
  }
  themeColor();
  try { new MutationObserver(themeColor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-uf'] }); } catch (e) {}

  function showBanner() {
    if (document.getElementById('upd')) return;
    var b = document.createElement('button');
    b.id = 'upd'; b.className = 'banner'; b.type = 'button';
    b.textContent = 'Aggiornamento disponibile. Tocca per installarlo: i tuoi dati non cambiano.';
    b.addEventListener('click', apply);
    document.body.insertBefore(b, document.body.firstChild);
  }
  function offer(w) { waitingWorker = w; showBanner(); }
  function apply() {
    if (!waitingWorker) return;
    var go = function () { applying = true; try { waitingWorker.postMessage({ type: 'SKIP_WAITING' }); } catch (e) { location.reload(); } };
    var f = window.__UF && window.__UF.flushNow ? window.__UF.flushNow() : null;
    if (f && f.then) f.then(go, go); else go();
  }
  function watch(r) {
    reg = r;
    if (r.waiting && navigator.serviceWorker.controller) offer(r.waiting);
    r.addEventListener('updatefound', function () {
      var w = r.installing; if (!w) return;
      w.addEventListener('statechange', function () { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
    });
  }
  function check() {
    if (!reg) { say('Aggiornamenti non disponibili in questa modalità.'); return; }
    lastCheck = Date.now();
    reg.update().then(function () {
      // se una versione nuova si sta ancora installando (rete lenta), si aspetta l'esito invece di dire «nessun aggiornamento»
      var w = reg.installing;
      if (w) {
        say('Scarico l’aggiornamento…');
        w.addEventListener('statechange', function () {
          if (w.state === 'installed') { if (!waitingWorker) offer(w); }
          else if (w.state === 'redundant') say('Aggiornamento non riuscito: riprova.');
        });
        return;
      }
      if (reg.waiting) { offer(reg.waiting); return; }
      if (!waitingWorker) say('Hai già l’ultima versione.');
    }, function () { say('Non riesco a controllare: serve la rete.'); });
  }
  window.UFPwa = { check: check };

  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('controllerchange', function () { if (applying) location.reload(); });
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js', { scope: './', updateViaCache: 'none' }).then(watch).catch(function () {});
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && reg && Date.now() - lastCheck > 3600000) { lastCheck = Date.now(); reg.update().catch(function () {}); }
  });
})();
