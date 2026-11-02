# UFinance Track — memoria del progetto per Claude

> Questo file viene letto automaticamente all'inizio di ogni sessione. Contiene tutto il contesto
> della chat precedente (2 novembre 2026): architettura, regole, decisioni, cronologia e lavoro aperto.
> **Aggiornalo** alla fine di ogni sessione con le novità (sezioni «Cronologia» e «Lavoro aperto»).

## Utente e modo di lavorare
- Michele (GitHub `michelemisasi28`), studente di finanza ed economia. **Rispondi sempre in italiano**, stile professionale e diretto.
- Preferenze esplicite: soluzioni pronte all'uso; valutazioni **obiettive** cercando sempre un possibile errore; **solo fonti ufficiali** (citale con link); massimo impegno.
- Usa l'app su **iPhone** (PWA installata nella schermata Home) tramite Netlify.
- Vuole essere avvisato con una **notifica** (strumento PushNotification) quando un lavoro lungo è operativo.
- Regola d'oro concordata: **chi usa già l'app non deve mai perdere i dati per colpa di un aggiornamento** (vedi «Pubblicare»).

## Dove sta cosa
- Repository: https://github.com/michelemisasi28/UFinance (rinominato da `ufinance`). Ramo `main` = **produzione**.
- Sito: **https://ufinanceapp.netlify.app** — Netlify pubblica la cartella `app/` a ogni push su `main` (`netlify.toml`: publish `app`, comando di build fittizio che sovrascrive quello vecchio rimasto salvato nel sito).
- Ramo `funzioni`: copia di sicurezza **non pubblicata** (usato per salvare lavoro su GitHub senza andare online).
- La vecchia versione «artifact» a file unico (claude.ai, `UFinance Prototipo`) è **abbandonata**: si lavora **solo sulla PWA** (decisione dell'utente). Resta nella cronologia git (commit `7ae1b33`, `44d118c`).

```
app/                    ← pubblicato
  index.html  sw.js  manifest.webmanifest  icons/
  css/app.css
  js/repo.js            unico accesso a IndexedDB (window.UFRepo) — pronto per un adattatore SQLite/Capacitor
  js/voice.js           riconoscimento delle frasi a voce (window.UFVoice), puro, senza rete
  js/app.js             logica e interfaccia (~3.300 righe, vanilla JS, IIFE; window.__UF espone funzioni per i test)
  js/pwa.js             registrazione service worker, banner «Aggiornamento disponibile», «Controlla aggiornamenti»
tools/stamp.js          nuovo numero di build (sw.js + window.UF_BUILD) — DA ESEGUIRE prima di ogni pubblicazione
tests/                  verifiche automatiche (vedi «Test»)
.claude/agents/ufinance-reviewer.md   agente revisore esterno (sola lettura) usato a cicli
LEGGIMI.txt, README.md
```

## Regole tecniche (non violarle)
- **Zero dipendenze**: niente framework, CDN, font esterni (font di sistema). Unica rete: CoinGecko (vedi sotto).
- **Precisione**: importi in **centesimi interi**; quantità investimenti in **1e-8**; prezzi in **1e-6**; `BigInt` per prodotti/divisioni (`valCents`, `lotPx`, `pacQty`). Mai float per i soldi.
- **Storage**: solo `js/repo.js` tocca IndexedDB. `commit(snapshot, expectedRev)` è atomico con controllo di revisione → conflitto esplicito tra schede/copie («Dati diversi»). I movimenti (`tx`) sono salvati **senza posizione** (ordinati per `ts,id` alla lettura): eliminarne uno scrive 1 record.
- `syncBase()` usa `load()` (serve ad aggiornare la copia di confronto di UFRepo: con `readRev()` resterebbero dati misti dopo un conflitto) e in caso di errore `clearData()`, **mai** `clear()` (che cancellerebbe anche le versioni salvate).
- **Sicurezza**: HTML costruito con stringhe → ogni testo utente passa da `esc()`; gli id importati sono validati con `ID_RE`; `validateSnap` rifiuta backup malformati (incluse preferenze, `hasK` per TYPES/KINDS, lotti, regole, budget, obiettivi, cgId).
- **Formato dati = 8** (`SCHEMA`): budget nelle categorie (`cat.budget`, centesimi), obiettivi nei conti (`acc.goal = {cents, date}`), preferenze `guideDone`, `autoCry` (default **true**), `tourDone`; investimenti `cgId`/`cgName`. I backup del formato 7 restano validi; `normalizeSnap` converte i formati < 7.
- Prestiti a persone = **giroconto verso un conto di tipo `credito`** (il patrimonio non cambia); restituzioni = giroconto dal credito al conto. Spese ed entrate non usano mai un conto di credito; il conto predefinito (`defAccId`) non è mai di credito.
- Data del saldo (`acc.openDate`) modificabile: non può essere dopo il primo movimento del conto.
- Commit: autore **`Claude <noreply@anthropic.com>`** (già configurato nel repo), messaggi in italiano, righe finali:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e `Claude-Session: <link della sessione>`.

## Pubblicare (procedura obbligatoria)
1. `node tools/stamp.js` (cambia `sw.js` → sui telefoni compare «Aggiornamento disponibile»).
2. `tests/esegui.sh` → tutte le suite devono passare, **compreso `aggiornamento.js`** (dati identici aggiornando dalla versione originale, dalla prima pubblicata e da quella **ora online**).
3. Commit e `git push origin main` (+ `git push origin main:funzioni`).
4. Attendi che `https://ufinanceapp.netlify.app/sw.js` contenga la nuova `BUILD`, poi `SITO=<build> tests/esegui.sh` oppure `NOBADGE=1 node tests/sito_pubblicato.js <build>`.
5. Non pubblicare su `main` codice non verificato/revisionato: per salvare lavoro in corso usa il ramo `funzioni`.

## Test (`tests/`)
- `tests/esegui.sh` (≈10 min) avvia i server di prova (app su `127.0.0.1:8765`, aggiornamento su `8768`), ricava le versioni vecchie con `git archive` in `tests/.work/` e lancia tutto. `tests/esegui.sh rapido` = solo frasi.
- Suite: `voice_unit.js` (94 frasi), `funzioni.js` (33), `regressioni.js` (26), `investimenti.js` (32), `voce_tutorial.js` (28), `revisione3.js` (15), `revisione4.js` (8), `aggiornamento.js` (34, tre percorsi), `sito_pubblicato.js` (rete vera). Totale locale ≈ 270.
- Trucchi necessari nei test Playwright: `ctx.addInitScript(() => { window.UF_TEST_NOTOUR = true; })` (altrimenti il tutorial copre l'interfaccia); simulare CoinGecko con `ctx.route('https://api.coingecko.com/**', …)` (è attivo di default); per la voce sostituire **sia** `window.SpeechRecognition` **sia** `window.webkitSpeechRecognition` (Chromium ne ha uno nativo che in headless non funziona); `page.clock.install({ time })` per le date; gli importi formattati usano lo spazio non separabile (` `).
- Ogni frase vocale interpretata male segnalata dall'utente → aggiungerla a `tests/voice_unit.js` prima di correggere.

## Funzioni presenti (stato al 2 novembre 2026, build `fbb89f72`, commit `d8414c1`)
Conti (4 tipi, sottotipologie, data del saldo, obiettivi di risparmio) · movimenti con tastierino · **voce** («Dillo a voce»: dettatura o microfono della tastiera iOS → anteprima modificabile → conferma; prestiti/restituzioni; più movimenti per frase) · ricorrenze e PAC · Analisi · **ricerca e filtri** dei movimenti + **export CSV** (Excel/Numbers: `;`, virgola, BOM, protezione formule) · **budget mensili** per categoria (Home con «ritmo», avvisi 80%/100%) · Portfolio: scheda dell'investimento, **aggiornamento per valore della posizione**, procedura guidata «Aggiorna valori», prezzo medio di carico, XIRR · **cripto automatiche** da CoinGecko (default attivo, 1 richiesta/15 min, nuovo tentativo dopo 30 s su 429, nessuna richiesta offline; invia solo id/simboli) · **tutorial guidato** alla prima apertura (rivedibile da Impostazioni → Aiuto) + «Primi passi» + guida testuale · backup JSON (anche cifrato) con condivisione iOS, versioni salvate, conflitti tra schede · tema chiaro/scuro, importi nascosti · service worker offline.

## Decisioni prese (non riproporle senza un motivo nuovo)
- **Prezzi cripto automatici attivi di default** e in Impostazioni **solo l'interruttore**, senza testo: scelta esplicita dell'utente (il revisore aveva segnalato il tema consenso; i testi di guida/README/LEGGIMI dichiarano la connessione a CoinGecko).
- **Prezzi ETF/azioni automatici: no per ora** — nessuna fonte ufficiale gratuita per ISIN utilizzabile da una web app; Yahoo escluso (condizioni d'uso). Eventuale provider con chiave da valutare.
- **Monetizzazione (pubblicità all'apertura + piano Pro): rimandata** alla versione nativa Capacitor. Requisiti quando se ne riparlerà: consenso GDPR (UMP/CMP certificata), ATT su iOS, diritto Pro verificato dalla ricevuta dello store (RevenueCat), mai da un flag nei dati utente.
- **Riconoscimento vocale a regole sul dispositivo** (niente server/IA): veloce, gratuito, privato; l'anteprima va sempre confermata. Migliorarlo con frasi reali dell'utente, non con giri di revisione a tavolino.
- Scartati dalle revisioni: `readRev()` al posto di `load()` in `syncBase`; `restoreDeep` in `saveRule` in caso di errore; togliere `touch()` da `render()` in generale (si salta solo al cambio scheda e quando la firma dei dati non cambia).
- Stima delle tasse sul guadagno (26% / 12,5%) e valutazione provider ETF: proposte, **non scelte** dall'utente.

## Cronologia sintetica
1. App nata come artifact claude.ai; importata, revisionata (giri 1–2) e poi sostituita dalla **PWA** caricata dall'utente (zip → `app/`, commit `6fe0dce`).
2. Correzioni della revisione esterna dell'utente (punti validi applicati, alcuni con soluzione diversa) e dei giri 1–2 portate nella PWA (`069c258`).
3. Nuove funzioni (`966a1de`), investimenti più intuitivi + cripto automatiche (`8c5e60e`), voce + tutorial + cripto di default (`2738c29`).
4. Revisione giro 3 (11 problemi, `83c64e3`), giro 4 (6, `88a2fbd`), retry 429 (`1ded105`), giro 5 (9, `d8414c1`). Tutto pubblicato e verificato online.

## Lavoro aperto
- **[Utente] Spegnere il riquadro «Powered by Netlify»**: Netlify → Project configuration → General → *Powered by Netlify badge* (attivo di default sui progetti Free creati dal 19/08/2026; copre le schede Portfolio/Impostazioni e i pulsanti in basso a destra). Fonte: https://docs.netlify.com/manage/projects/powered-by-netlify-badge/ — verificare con `tests/sito_pubblicato.js` (senza `NOBADGE`) o controllando `#nl-badge-frame`.
- Voce: raccogliere dall'utente le frasi interpretate male e trasformarle in test + correzioni.
- Note note e innocue: offline compare un 503 per `/.netlify/scripts/hud` (script del riquadro Netlify, non dell'app); CoinGecko può rispondere 429 dall'IP condiviso dell'ambiente cloud (sul telefono è raro; l'app riprova).
- Il ciclo di revisione per app/dati/calcoli è chiuso (nessun critico/importante aperto). Per nuove funzioni: usare l'agente `ufinance-reviewer` (sola lettura), poi correggere, poi `tests/esegui.sh`, poi pubblicare.
