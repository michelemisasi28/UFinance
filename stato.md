# UFinance Track — stato del progetto (memoria per un Progetto Claude)

> Documento da caricare nella **conoscenza di un Progetto Claude** (claude.ai → Progetti) per riprendere il lavoro
> in qualsiasi nuova chat senza perdere il contesto. Aggiornato al **4 novembre 2026**.
> Racconta cos'è l'app, cosa abbiamo fatto, perché, come si lavora e cosa resta aperto.
> La versione tecnica dettagliata, usata da Claude Code a ogni sessione, è `CLAUDE.md` nel repository.

---

## 1. Chi sono e come voglio lavorare

- **Michele** (GitHub `michelemisasi28`), studente di finanza ed economia.
- **Lingua: sempre italiano**, stile professionale e diretto.
- Voglio **soluzioni pronte all'uso**, valutazioni **obiettive** che cerchino sempre un possibile errore, **solo fonti ufficiali** (con link), massimo impegno.
- Uso l'app su **iPhone**, installata nella schermata Home (PWA).
- Quando un lavoro lungo è pronto voglio una **notifica**.
- **Regola d'oro:** chi usa già l'app non deve **mai perdere i dati** per colpa di un aggiornamento.

---

## 2. Cos'è UFinance Track

App di **finanza personale** che gira interamente sul telefono:

- **PWA offline-first** (si installa dalla schermata Home, funziona senza rete).
- **Zero dipendenze**: solo HTML, CSS e JavaScript, nessun framework, CDN o font esterno.
- **I dati restano sul dispositivo** (IndexedDB). Nessun server, nessun account.
- Unica connessione esterna: **CoinGecko** per i prezzi delle cripto (riceve solo id/simboli, mai quantità o valori).
- Pensata per diventare in futuro un'app nativa con **Capacitor** (l'accesso ai dati è già isolato).

**Dove sta:**
- Codice: https://github.com/michelemisasi28/UFinance — ramo `main` = produzione, ramo `funzioni` = lavoro non pubblicato.
- Sito: **https://ufinanceapp.netlify.app** (Netlify pubblica la cartella `app/` a ogni push su `main`).
- Versione online al 4/11/2026: **build `986c5a05`**.

---

## 3. Cosa fa l'app (funzioni presenti)

**Conti**
- 4 tipi: **Liquidità, Risparmi, Crediti, Debiti**, con sottotipologie (es. Conto corrente, Fondo emergenza, Vacanze).
- **Data del saldo** iniziale modificabile (non dopo il primo movimento).
- **Obiettivi di risparmio** (importo + data → quanto mettere da parte al mese).
- Prestiti a persone = giroconto verso un conto di tipo **credito** (il patrimonio non cambia); restituzioni = giroconto inverso.

**Movimenti**
- Spese, entrate e giroconti con **tastierino** dedicato; categorie con icone.
- **Ricorrenze** (settimanali, mensili, ecc.) e **PAC** sugli investimenti.
- **Ricerca e filtri** dei movimenti, **export CSV** compatibile con Excel/Numbers (separatore `;`, virgola decimale, protezione dalle formule).
- **Budget mensili** per categoria, con «ritmo» in Home e avvisi all'80% e al 100%.

**«Dillo a voce»**
- Detti o scrivi una frase («ho pagato 12 euro di pizza con la carta e ieri ho ricevuto 50 euro da Marco») → anteprima modificabile → conferma.
- Più movimenti per frase, prestiti e restituzioni, date («ieri», «lunedì», «il 3»).
- Riconoscimento **a regole sul dispositivo**: niente server né IA, veloce, gratuito, privato. L'anteprima va sempre confermata.
- **Novità 3/11:** se nomini un **conto che non esiste** (Revolut, N26, Hype, Fineco, Satispay, «carta Amex»…) o una **categoria che non esiste** («categoria palestra»), l'anteprima propone «➕ Nuovo conto/Nuova categoria» e li crea alla conferma; «Annulla» toglie tutto.

**Investimenti (Portfolio)**
- ETF/titoli e cripto; scheda di ogni investimento con grafico, **prezzo medio di carico**, guadagno, **rendimento annuo (XIRR**, dopo 90 giorni).
- Aggiornamento del valore come lo mostra il broker («Aggiorna valori», anche per valore della posizione).
- **Novità 3/11:** per un investimento **già posseduto** si possono inserire **prezzo medio** e **data del primo acquisto** → versato, guadagno e rendimento corretti da subito.
- **Cripto automatiche** da CoinGecko (attive di default): **in euro**, aggiornate **ogni minuto** con l'app aperta, orario del dato visibile («prezzo delle 10:58»), attesa crescente se CoinGecko non risponde.

**Analisi** per giorno/mese/anno, per categoria e per conto; andamento del patrimonio.

**Altro**
- **Tutorial guidato** alla prima apertura + «Primi passi» + guida testuale.
- **Backup** JSON (anche cifrato con password), condivisione su iOS, versioni salvate automaticamente, gestione dei conflitti tra schede.
- Tema chiaro/scuro, importi nascondibili, funzionamento offline.
- **Schermate ferme su iPhone**: nessuna schermata si trascina; la tastiera non sposta l'intestazione (vedi §5).

---

## 4. Come è fatta (in breve)

```
app/                    ← pubblicato da Netlify
  index.html  sw.js  manifest.webmanifest  icons/
  css/app.css
  js/repo.js    unico accesso ai dati (IndexedDB), pronto per un adattatore nativo
  js/voice.js   riconoscimento delle frasi a voce, puro, senza rete
  js/app.js     logica e interfaccia (~3.400 righe)
  js/pwa.js     service worker e banner «Aggiornamento disponibile»
tools/stamp.js  nuovo numero di build (obbligatorio prima di pubblicare)
tests/          verifiche automatiche (~470 controlli)
CLAUDE.md       memoria tecnica per Claude Code
```

Regole tecniche fondamentali:
- **Soldi sempre in centesimi interi**; quantità in 1e-8, prezzi in 1e-6; calcoli con `BigInt`. Mai numeri decimali per i soldi.
- Salvataggio **atomico** con controllo di revisione (due schede aperte → conflitto esplicito, mai dati mescolati).
- Tutto il testo inserito dall'utente è «ripulito» prima di essere mostrato; i backup importati sono validati.
- **Formato dati = 8**; i backup dei formati precedenti restano leggibili.

---

## 5. Cronologia: cosa abbiamo fatto

**1. Nascita (2 novembre 2026, mattina)**
- L'app nasce come «artifact» su claude.ai (un unico file). La importiamo su GitHub, facciamo due giri di revisione e correzioni critiche.
- Carichi la **PWA** completa (zip → cartella `app/`): diventa **l'unica versione**; l'artifact è abbandonato.
- Configurazione di **Netlify** (pubblica `app/` così com'è) e correzioni della tua revisione esterna.

**2. Nuove funzioni (2 novembre, pomeriggio)**
- Ricerca/filtri, export CSV, budget, obiettivi, aggiornamento prezzi per valore, guida.
- Investimenti più intuitivi e **prezzi cripto automatici**.
- **Movimenti a voce**, **tutorial guidato**, cripto automatiche attive di default.
- Tre giri di revisione indipendente (11 + 6 + 9 problemi), tutti corretti e pubblicati.

**3. Passaggio a una nuova sessione (2 novembre, sera)**
- Creato `CLAUDE.md` con tutto il contesto, test salvati nel repository, agente revisore (`ufinance-reviewer`).
- Spento il riquadro «Powered by Netlify» che copriva i pulsanti.

**4. Schermate ferme su iPhone (2–3 novembre)** — tre iterazioni guidate dalle tue prove sul telefono:
1. Le schermate di conti/investimenti «si muovevano»: primo blocco del trascinamento e adattamento alla tastiera.
2. Sul telefono la tastiera spostava ancora tutto: la causa era lo **scorrimento automatico di Safari** quando si tocca un campo → bloccato all'origine (tecnica usata da librerie professionali come react-aria).
3. Mi hai indicato che «Aggiungi investimento» era fermo e le altre no: la differenza era il blocco via CSS (`touch-action: none`), l'unico affidabile su iOS. Esteso a **tutte** le schermate, e **ridisegnati i moduli** (conto, categoria, ricorrenze) perché stiano in un solo schermo anche sugli iPhone reali (barra di stato e area in basso comprese). Icona e colore del conto ora si scelgono in un foglio a parte.
- Ogni passaggio: revisione indipendente, test automatici dedicati (`schermate_ferme.js`), pubblicazione.

**5. Le tre richieste del 3 novembre**
1. **Voce che crea conti e categorie mancanti.**
2. **Prezzo medio** per investimenti già posseduti (con data, altrimenti il rendimento annuo risulterebbe gonfiato).
3. **CoinGecko «impreciso»**: verifica sui dati reali — CoinGecko dava BTC 68.887,85 € contro Kraken 68.868, Coinbase 68.867, Bitstamp 68.887 (scarto ~20 €). **La fonte era precisa; l'app era in ritardo** (chiedeva il prezzo ogni 15 minuti, e BTC in 15 minuti si muove di centinaia di euro). Ora ogni minuto, come l'aggiornamento ufficiale dell'API gratuita (https://docs.coingecko.com/reference/simple-price). Nota: le app dei broker/exchange possono includere uno spread dell'1–2%.
- **Sei giri di revisione**, soprattutto sulla voce (trasferimenti scambiati per spese, «carta igienica» o «carta ieri» presi per conti, banche dal nome corto come N26/ING, «in contanti», «conto corrente»). Tutto corretto; confronto automatico con la versione online su ~1.160 casi frase × conti.
- Pubblicata la **build `986c5a05`**.

**6. Crediti Netlify (3–4 novembre)**
- Netlify ha avvisato del **75% dei crediti**: con il piano Free ogni pubblicazione costa **15 crediti su 300 al mese**, e in due giorni ne avevamo fatte ~15. Al 100% il sito va in pausa fino al ciclo successivo (i dati sul telefono restano; l'app installata quasi certamente si apre lo stesso dalla memoria, ma non arrivano aggiornamenti).
- Soluzioni applicate: (1) regola che **salta la pubblicazione se l'app non cambia** — verificata, il deploy risulta «Canceled»; (2) **una sola pubblicazione per rilascio**, il lavoro intermedio resta sul ramo `funzioni`.
- Rinnovo crediti: **2 dicembre**. Fino ad allora restano ~4–5 pubblicazioni.
- Fonti: https://www.netlify.com/pricing/ · https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/ · https://docs.netlify.com/build/configure-builds/ignore-builds/

**7. Nuova grafica «Nativa» e Budget in Analisi (5 novembre, sessione 3)**
- Brief preparato da me in chat (modello grafico chiaro/scuro su 22 schermate). Tutta l'app ridisegnata: colori iOS (blu `#0A5FD0`, scuro nero OLED), card e liste raggruppate, campi a riga, icone SVG, barra «‹ Indietro».
- **Budget e obiettivi spostati in Analisi → Budget** (segmentato «Panoramica | Budget», scelta del mese, stato In linea / Attenzione / Oltre, puntino sulla scheda Analisi oltre l'80%). La Home mostra «Questo mese» con Entrate, Spese e Netto. Tolta la riga Budget dalle Impostazioni.
- Tema **Automatico** (segue l'iPhone) senza cambiare il formato dei dati.
- Tutti i moduli stanno in una schermata anche su iPhone SE (375×667) e Pro Max (430×932); contrasto ≥ 4,5:1 verificato automaticamente; revisione indipendente (2 problemi importanti + 3 minori, corretti).
- **Non ancora pubblicata**: build `8dc02b9b` sul ramo `funzioni`. Panoramica di tutte le schermate, con i pulsanti «OK / Problema»: https://claude.ai/artifact/B9vWPAonyC6jY3W3SLhtwh

---

## 6. Come lavoriamo (procedura)

**Per ogni modifica:**
1. Sviluppo + test automatici dedicati (ogni problema segnalato diventa prima un test).
2. **Revisione indipendente** con l'agente `ufinance-reviewer` (sola lettura), poi correzioni.
3. Suite completa `tests/esegui.sh` (~595 controlli), compreso il test che **aggiorna dalla versione online senza perdere dati**.
4. Il lavoro intermedio va sul ramo **`funzioni`** (non costa crediti).

**Per pubblicare (una volta per rilascio):**
1. `node tools/stamp.js` → nuovo numero di build (sul telefono compare «Aggiornamento disponibile»).
2. Tutte le suite verdi.
3. Push su `main` → Netlify pubblica.
4. Verifica del sito online (`tests/sito_pubblicato.js`) + notifica a me.

**Sul telefono:** apri l'app → tocca «Aggiornamento disponibile».

---

## 7. Decisioni prese (da non riproporre senza un motivo nuovo)

- Si lavora **solo sulla PWA**; l'artifact originale è abbandonato.
- **Prezzi cripto automatici attivi di default**, in Impostazioni solo l'interruttore.
- **Prezzi automatici di ETF/azioni: no per ora** (nessuna fonte ufficiale gratuita per ISIN usabile da una web app; Yahoo escluso per le condizioni d'uso).
- **Monetizzazione** (pubblicità + piano Pro) **rimandata** alla versione nativa Capacitor; quando se ne riparlerà: consenso GDPR certificato, ATT su iOS, piano Pro verificato dalla ricevuta dello store.
- **Voce a regole sul dispositivo** (niente IA/server). Si migliora con le **mie frasi reali**, non con giri infiniti di revisione. Criterio per pubblicare modifiche alla voce: **nessuna frase peggiore della versione online** e nessun errore su soldi/dati.
- **Netlify:** una pubblicazione per rilascio; lavoro intermedio su `funzioni`.
- Stima delle tasse sul guadagno (26% / 12,5%) e valutazione di provider per gli ETF: proposte, **non ancora scelte**.

---

## 8. Lavoro aperto

- **Nuova grafica (build `8dc02b9b`, non pubblicata):** guardo la panoramica (https://claude.ai/artifact/B9vWPAonyC6jY3W3SLhtwh) e segnalo le schermate con problemi; provo su iPhone in chiaro e scuro con la tastiera aperta; poi do l'OK alla pubblicazione (una sola).

- **Da provare sull'iPhone** la build `986c5a05`: voce con conti/categorie nuovi, prezzo medio, cripto ogni minuto, schermate ferme con tastiera aperta (la tastiera iOS è stata solo simulata nei test).
- **Voce:** raccogliere le frasi capite male (così come le ho dette) → test → correzione → un unico rilascio.
- Limite noto: al primo tocco su un campo già pieno il cursore va in posizione predefinita (dal secondo tocco funziona normalmente) — è il prezzo della tecnica che tiene ferma la schermata.
- **Crediti Netlify:** ~4–5 pubblicazioni fino al 2 dicembre.
- Note innocue: offline compare un errore 503 per uno script di Netlify (non dell'app); CoinGecko può rispondere «troppe richieste» dall'ambiente cloud dei test (sul telefono è raro e l'app riprova).
- Idee future: versione nativa con Capacitor; eventuale provider prezzi ETF; eventuale stima tasse.

---

## 9. Istruzioni per Claude in questo Progetto

- Rispondi **in italiano**, professionale e diretto; cita **fonti ufficiali** con link; cerca sempre il possibile errore.
- Il codice e la memoria tecnica completa sono nel repository (`CLAUDE.md`). Per modifiche al codice si usa **Claude Code** sul repository `michelemisasi28/UFinance`, seguendo la procedura del §6.
- Non proporre di pubblicare su `main` lavoro non verificato e ricorda il limite dei **crediti Netlify**.
- Ogni frase vocale interpretata male che ti segnalo va trattata come caso di test prima della correzione.
