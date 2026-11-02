# UFinance

App di finanza personale in un solo file (`index.html`, HTML + JavaScript senza dipendenze).

- **Conti**: liquidità, risparmi, crediti, debiti, con sottotipologie e giroconti
- **Movimenti**: spese, entrate, ricorrenze
- **Analisi**: per periodo, categoria e conto
- **Portfolio**: titoli/ETF e cripto, costo medio, XIRR, PAC

## Dati
- Dentro Claude (artifact): salvati nell'account.
- Altrove (es. Netlify): solo nel browser del dispositivo. **Esporta spesso un backup** da Impostazioni → Dati.

## Pubblicazione
Netlify legge `netlify.toml` e pubblica solo `index.html` (cartella `dist`).

## Revisione
`.claude/agents/ufinance-reviewer.md`: agente revisore esterno usato a cicli (revisione → correzione → nuova revisione).
