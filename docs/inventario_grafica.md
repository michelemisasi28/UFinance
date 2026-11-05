# Inventario grafico — stile «Nativa» (5 novembre 2026)

Elenco completo delle schermate, dei fogli e degli stati dell'app, ricavato dal codice (`app/js/app.js`: `view*()`, `pushLayer(...)`, `splash`, `toast`, banner di `pwa.js`).
Ogni voce indica se il modello grafico la **copre**, se la copre **in parte** o se lo stile è stato **derivato** dai token e dai componenti (§3 del brief).
Le fotografie di ogni voce, in chiaro e scuro e a 375×667 / 390×844, si generano con `node tests/screenshots.js` (cartella `tests/screenshots/`, esclusa da git e dal sito).

## Schede (barra in basso)
| Voce | Codice | Stato | Note |
|---|---|---|---|
| Home | `viewHome` | coperto | Budget e obiettivi tolti; card «Questo mese» con Entrate / Spese / Netto (segni + e −) |
| Home vuota (nessun conto) | `viewHome` | derivato | Card «Crea il primo conto» |
| Conti | `viewConti` | coperto | Gruppi per tipo come liste raggruppate, icone tonde con il colore scelto dall'utente |
| Analisi → Panoramica | `viewAnalisi` | coperto | Contenuti invariati; segmentato «Panoramica \| Budget» in cima |
| Analisi → Budget | `viewBudget` (nuovo) | coperto | Selettore del mese, riepilogo, categorie con stato, obiettivi di risparmio, «Modifica» |
| Analisi → Budget vuoto | `viewBudget` | derivato | «Nessun budget impostato» + «Imposta budget» |
| Portfolio | `viewPortfolio` | coperto | Torta con al massimo 4 colori (oltre: «Altro», dettagliato nella legenda) |
| Impostazioni | `viewSettings` | coperto | Riga «Budget» tolta; tema Chiaro / Scuro / Automatico |

## Schermate intere (`pushLayer('screen', …)`)
| Nome | Contenuto | Stato |
|---|---|---|
| `add` | Nuovo movimento / giroconto / modifica, tastierino | coperto |
| `voice` | Dillo a voce, anteprima modificabile, nuovi conti/categorie | coperto (anteprima: parziale) |
| `txlist` | Movimenti: ricerca, filtri, nessun risultato, esporta CSV | coperto (filtri: derivato) |
| `rules`, `ruleform` | Ricorrenze e modulo | coperto |
| `acc` | Nuovo / modifica conto, obiettivo di risparmio | coperto |
| `delacc` | Elimina conto (tenere o cancellare i movimenti) | derivato |
| `name`, `manage` | Sottotipologie, elenco categorie | derivato |
| `cat` | Categoria: nome, icona, budget | derivato |
| `nw` | Andamento nel tempo (patrimonio, investimenti, singolo prodotto) | parziale |
| `posd` | Scheda investimento (prezzo medio, XIRR, «prezzo delle hh:mm») | coperto |
| `posf` | Nuovo investimento (ETF/cripto, già posseduto, prezzo medio e data) | coperto |
| `lot` | Acquisto / vendita | derivato |
| `price` | Aggiorna valore (prezzo o valore della posizione) | derivato |
| `pxwiz` | Aggiorna valori guidato | coperto |
| `pacf` | Nuovo PAC | coperto |
| `poslist` | Tutte le operazioni e storico prezzi | derivato |
| `delpos` | Elimina investimento | derivato |
| `budgets` | Modifica dei budget (stessa interfaccia di prima) | derivato |
| `guide` | Come funziona | coperto |
| `snaps` | Versioni salvate | derivato |
| `imp` | Importa backup (confronto) | coperto |
| `reset` | Elimina tutti i dati / dati di esempio | derivato |
| `conf` | Conflitto tra schede («Dati diversi») | coperto |

## Fogli dal basso (`pushLayer('sheet', …)`)
| Nome | Contenuto | Stato |
|---|---|---|
| `tx` | Dettaglio movimento | derivato |
| `accd` | Dettaglio conto, correggi saldo | coperto |
| `pick`, `pickrep` | Scelta conto, categoria, ripetizione | derivato |
| `scope` | Che totale vuoi vedere | derivato |
| `icopick` | Icona e colore di conto e categoria | parziale |
| `anacc`, `anpers` | Conti dell'analisi, blocchi della vista | derivato |
| `goalpick` (nuovo) | Su quale conto creare un obiettivo | derivato |
| `invhelp` | Come leggere valore, versato e guadagno | derivato |
| `expo`, `expenc`, `impenc` | Esporta, esporta cifrato, apri backup cifrato | coperto (backup) |

## Stati di sistema
| Voce | Dove | Stato |
|---|---|---|
| Avvio / benvenuto / errore di lettura / caricamento | `splash`, `welcome`, `bootFail` | coperto |
| Tutorial guidato | `startTour` | coperto |
| Primi passi | `guideCard` | coperto |
| Avviso in basso con «Annulla» | `toast` | derivato |
| «Aggiornamento disponibile» | `pwa.js` | derivato (avviso ambra) |
| Promemoria backup, dati di esempio, valori non aggiornati, CoinGecko non collegato | `.banner` | derivato (avviso ambra) |
| Importi nascosti | `S.hide` | coperto |
| Offline | service worker | invariato (nessuna interfaccia propria) |

## Punti che citano i budget (`grep -i budget`)
- `viewHome`: sezione budget **tolta** (anche gli obiettivi, che ora stanno in Analisi → Budget).
- `viewSettings`: riga «Budget mensili» **tolta**.
- `guideSteps` («Imposta un budget»): porta ad **Analisi → Budget** (azione `gobud`) e lo dice nel testo.
- `openGuide` («Budget e obiettivi»): testo aggiornato con il percorso.
- `TOUR` (passo «Budget»): evidenzia il segmento «Budget» in Analisi.
- `budNote` (avviso 80% / 100% dopo una spesa): **invariato**.
- `openBudgets` / `saveBudgets`, campo budget della categoria, `validateSnap`: **invariati** (nessun cambio dei dati).
