# UFinance Track

PWA di finanza personale **offline-first**, senza dipendenze (HTML + CSS + JavaScript), pensata per iPhone e pronta per Capacitor.

```
app/                 ← ciò che viene pubblicato (Netlify: publish = "app")
  index.html  sw.js  manifest.webmanifest
  css/app.css
  js/app.js          logica e interfaccia
  js/repo.js         unico accesso a IndexedDB (window.UFRepo)
  js/pwa.js          service worker e aggiornamenti
  icons/
tools/stamp.js       aggiorna il numero di build (da eseguire prima di ogni pubblicazione)
tests/               verifiche automatiche: tests/esegui.sh (tutte) · tests/esegui.sh rapido (solo frasi)
CLAUDE.md            contesto completo del progetto, decisioni e lavoro aperto
.claude/agents/      revisore esterno usato a cicli
```

## Dati
Restano sul dispositivo (IndexedDB). L'unica connessione è per i prezzi delle cripto (CoinGecko riceve solo i nomi delle cripto, mai le quantità), disattivabile in Impostazioni. **Esporta spesso un backup** (Impostazioni → Dati).

## Pubblicare una nuova versione
1. `node tools/stamp.js` (nuovo numero di build → i telefoni ricevono «Aggiornamento disponibile»)
2. `tests/esegui.sh` → tutto deve passare (compreso il test di aggiornamento con dati reali)
3. commit e push su `main` → Netlify pubblica `app/`.

## Provarla in locale
```
cd app && python3 -m http.server 8765
```
poi apri http://127.0.0.1:8765
