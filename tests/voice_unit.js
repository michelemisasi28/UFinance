global.self = global; require(require('path').join(__dirname, '..', 'app', 'js', 'voice.js')); const V = self.UFVoice;
let fails = 0; const ok = (c, m, x) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c ? '' : '\n     → ' + JSON.stringify(x))); };
const ctx = { today: '2026-11-20', defAcc: 'a2', accounts: [
  { id: 'a1', name: 'Contanti', type: 'liquidita' }, { id: 'a2', name: 'Banca C/C', type: 'liquidita' }, { id: 'u1', name: 'Unicredit', type: 'liquidita' },
  { id: 'a5', name: 'Carta di credito', type: 'debito' }, { id: 'a3', name: 'Conto risparmio', type: 'risparmio' }, { id: 'k1', name: 'Marco', type: 'credito' }],
  cats: [{ id: 'c1', name: 'Alimentari', kind: 'spesa' }, { id: 'c2', name: 'Casa', kind: 'spesa' }, { id: 'c3', name: 'Trasporti', kind: 'spesa' }, { id: 'c4', name: 'Ristoranti', kind: 'spesa' }, { id: 'c6', name: 'Salute', kind: 'spesa' }, { id: 'c7', name: 'Abbonamenti', kind: 'spesa' }, { id: 'e1', name: 'Stipendio', kind: 'entrata' }, { id: 'e2', name: 'Rimborsi', kind: 'entrata' }] };
const P = t => V.parse(t, ctx);

let r = P('Ho pagato 5€ in farmacia ed ho mandato un bonifico da unicredit ad antonio ed ha detto che me li ridarà');
ok(r.length === 2, 'esempio: 2 movimenti', r);
ok(r[0].kind === 'spesa' && r[0].cents === 500 && r[0].catId === 'c6' && r[0].note === 'Farmacia', 'esempio 1: spesa 5,00 € Salute «Farmacia»', r[0]);
ok(r[1].kind === 'giro' && r[1].loan && r[1].accId === 'u1' && r[1].toId === '__new__' && r[1].newAcc.name === 'Antonio' && r[1].cents === null && r[1].note === 'Prestito ad Antonio', 'esempio 2: prestito da Unicredit ad Antonio, nuovo credito, importo da inserire', r[1]);
ok(r[1].warn.length === 1 && /Importo/.test(r[1].warn[0]), 'esempio 2: unico avviso = importo mancante', r[1].warn);

r = P('ieri ho speso 12,50 euro al supermercato con la carta');
ok(r.length === 1 && r[0].cents === 1250 && r[0].catId === 'c1' && r[0].accId === 'a5' && r[0].date === '2026-11-19', 'ieri, 12,50 €, supermercato, carta di credito', r);
r = P('ho ricevuto lo stipendio di 1.450 euro');
ok(r[0].kind === 'entrata' && r[0].cents === 145000 && r[0].catId === 'e1', 'stipendio 1.450 € (separatore delle migliaia)', r);
r = P('ho prelevato 50 euro');
ok(r[0].kind === 'giro' && r[0].accId === 'a2' && r[0].toId === 'a1' && r[0].cents === 5000, 'prelievo: banca → contanti', r);
r = P('ho spostato 200 euro dalla banca al conto risparmio');
ok(r[0].kind === 'giro' && r[0].accId === 'a2' && r[0].toId === 'a3' && r[0].cents === 20000, 'giroconto banca → conto risparmio', r);
r = P('cena in pizzeria 35 euro');
ok(r[0].kind === 'spesa' && r[0].cents === 3500 && r[0].catId === 'c4', 'senza verbo: «cena in pizzeria 35 euro» → Ristoranti', r);
r = P('Marco mi ha ridato 20 euro');
ok(r[0].kind === 'giro' && r[0].accId === 'k1' && r[0].toId === 'a2' && r[0].cents === 2000, 'restituzione: dal credito «Marco» al conto', r);
r = P('Luca mi ha restituito 15 euro in contanti');
ok(r[0].kind === 'entrata' && r[0].accId === 'a1' && r[0].cents === 1500 && r[0].catId === 'e2', 'restituzione senza conto di credito: entrata in Contanti (Rimborsi)', r);
r = P('ho pagato venticinque euro di benzina');
ok(r[0].cents === 2500 && r[0].catId === 'c3', 'numeri in lettere: venticinque euro, benzina', r);
r = P('ho speso cinque euro e cinquanta al bar');
ok(r[0].cents === 550 && r[0].catId === 'c4', 'cinque euro e cinquanta → 5,50 €', r);
r = P('ho prestato 30 euro a luca in contanti');
ok(r[0].loan && r[0].accId === 'a1' && r[0].newAcc && r[0].newAcc.name === 'Luca' && r[0].cents === 3000, 'prestito in contanti a Luca', r);
r = P('ho prestato 40 euro a marco');
ok(r[0].loan && r[0].toId === 'k1' && !r[0].newAcc, 'prestito a Marco: usa il credito esistente', r);
r = P('netflix 12,99');
ok(r[0].cents === 1299 && r[0].catId === 'c7', 'Netflix 12,99 → Abbonamenti', r);
r = P('il 3 novembre ho pagato l\'affitto di 420 euro');
ok(r[0].date === '2026-11-03' && r[0].cents === 42000 && r[0].catId === 'c2', '3 novembre, affitto 420 € (il 3 non è l’importo)', r);
r = P('ho fatto la spesa 40 euro e ho preso un caffè 1,20');
ok(r.length === 2 && r[0].cents === 4000 && r[0].catId === 'c1' && r[1].cents === 120 && r[1].catId === 'c4', 'due spese nella stessa frase', r);
r = P('lunedì ho pagato 18 euro di treno');
ok(r[0].date === '2026-11-16' && r[0].catId === 'c3', 'lunedì → lunedì 16 novembre', r);
r = P('ho ricevuto 50 euro da Marco per la cena');
ok(r[0].kind === 'entrata' && r[0].cents === 5000, 'ricevuto da Marco: entrata', r);
r = P('ho pagato 8 euro al cinema con la Revolut');
ok(r[0].accId === '__newacc__' && r[0].newFrom.name === 'Revolut' && r[0].newFrom.type === 'liquidita' && !r[0].warn.length, 'conto non esistente nominato con «con la»: proposto il nuovo conto «Revolut»', r);
r = P('ciao come stai');
ok(r.length === 1 && r[0].cents === null, 'frase senza importo: proposta con importo da inserire', r);

// ---- giro 3 del revisore ----
const ctx2 = JSON.parse(JSON.stringify(ctx)); ctx2.accounts.find(a => a.id === 'k1').bal = 5000;
const P2 = t => V.parse(t, ctx2);
r = P2('ho ricevuto 20 euro da Marco');
ok(r[0].kind === 'giro' && r[0].accId === 'k1' && r[0].toId === 'a2' && r[0].cents === 2000, '#1 «ricevuto da Marco» con credito aperto: restituzione (credito → conto)', r);
r = P2('Marco mi ha dato 20 euro');
ok(r[0].kind === 'giro' && r[0].accId === 'k1', '#1 «Marco mi ha dato» con credito aperto: restituzione', r);
r = P2('ho pagato 10 euro a Marco per la pizza');
ok(r[0].kind === 'spesa' && r[0].accId === 'a2' && r[0].catId === 'c4', '#1 spesa nominando Marco: mai addebitata sul credito', r);
r = P('ho ricevuto 20 euro da Marco');
ok(r[0].kind === 'entrata' && r[0].accId === 'a2', '#1 credito senza saldo aperto: entrata sul conto, non sul credito', r);
r = P('ho prestato 50 euro a mio fratello');
ok(r[0].loan && r[0].kind === 'giro' && r[0].newAcc && r[0].newAcc.name === 'Fratello' && r[0].warn.some(w => /Controlla il nome/.test(w)), '#2 prestito a mio fratello: giroconto verso credito, nome da controllare', r);
r = P('ho prestato 50 euro alla mamma');
ok(r[0].loan && r[0].newAcc.name === 'Mamma', '#2 prestito alla mamma', r);
r = P('ho prestato 50 euro a mia sorella Giulia');
ok(r[0].loan && r[0].newAcc.name === 'Giulia' && !r[0].warn.some(w => /nome/.test(w)), '#2 a mia sorella Giulia → Giulia', r);
r = P('ho prestato 50 euro');
ok(r[0].loan && r[0].toId === '__new__' && r[0].warn.some(w => /nome della persona/.test(w)), '#2 prestito senza destinatario: chiede il nome', r);
r = P('ho pagato 3 euro e 5 centesimi di caffè');
ok(r[0].cents === 305, '#6 3 euro e 5 centesimi = 3,05 €', r);
r = P('ho pagato 3 euro e 5 di caffè');
ok(r[0].cents === 350, '#6 «3 euro e 5» resta 3,50 €', r);
r = P('ieri ho pagato 10 euro di pizza e oggi ho ricevuto 50 euro');
ok(r.length === 2 && r[0].date === '2026-11-19' && r[1].date === '2026-11-20', '#7 «ieri … e oggi …»: date diverse', r);
r = P('ieri ho pagato 10 euro di pizza e ho preso un caffè 1,20');
ok(r.length === 2 && r[1].date === '2026-11-19', '#7 data detta una volta vale per tutta la frase', r);
r = P('ho pagato 12,50 euro ho preso un caffè 1,20');
ok(r.length === 2 && r[0].cents === 1250 && r[1].cents === 120, 'importi con la virgola non spezzano la frase', r);
r = P('ho pagato 12.50 euro e ho preso un caffè');
ok(r[0].cents === 1250, 'importi con il punto non spezzano la frase', r);
const ctx3 = JSON.parse(JSON.stringify(ctx)); ctx3.accounts.push({ id: 'k2', name: 'Crediti verso amici', type: 'credito' }, { id: 'k3', name: 'Ugolini', type: 'credito' });
r = V.parse('ho prestato 30 euro a Edi', ctx3);
ok(r[0].toId === '__new__' && r[0].newAcc.name === 'Edi', '#8 «Edi» non finisce su «Crediti verso amici»', r);
r = V.parse('ho prestato 30 euro a Ugo', ctx3);
ok(r[0].toId === '__new__', '#8 «Ugo» non finisce su «Ugolini»', r);

// ---- giro 4 del revisore ----
const one = (t, f, m) => { const x = P(t); ok(f(x), m, x); };
one('ho pagato 50 euro di spesa', x => x.length === 1 && x[0].cents === 5000 && x[0].catId === 'c1', 'G4#1 «50 euro di spesa»: un solo movimento (Alimentari)');
one('ho pagato 30 euro di spesa al supermercato', x => x.length === 1 && x[0].cents === 3000 && x[0].catId === 'c1', 'G4#1 «… di spesa al supermercato»: uno solo, Alimentari');
one('ho pagato 20 euro la spesa con la carta', x => x.length === 1 && x[0].accId === 'a5', 'G4#1 «… la spesa con la carta»: uno solo, sulla carta');
one('ho speso 60 euro di spesa alla coop', x => x.length === 1 && x[0].cents === 6000, 'G4#1 «speso … di spesa alla coop»: uno solo');
one('ho pagato 15 euro per una presa elettrica', x => x.length === 1 && x[0].cents === 1500, 'G4#1 «una presa elettrica»: uno solo');
one('lunedì ho pagato 30 euro di spesa e martedì ho pagato 12 euro di benzina', x => x.length === 2 && x[0].date === '2026-11-16' && x[1].date === '2026-11-17' && x[1].catId === 'c3', 'G4#1 lunedì … e martedì …: 2 movimenti con le loro date');
one('ho preso un caffè 1,20 ho pagato 3 euro di giornale', x => x.length === 2 && x[0].cents === 120 && x[1].cents === 300, 'G4#1 due azioni con ausiliare senza connettivo: 2 movimenti');
one('ho pagato luce e gas 80 euro ho ricevuto 20 euro da Luca', x => x.length === 2 && x[0].kind === 'spesa' && x[0].cents === 8000 && x[0].catId === 'c2' && x[1].kind === 'entrata' && x[1].cents === 2000, 'G4#2 «luce e gas 80 euro ho ricevuto 20»: importi al posto giusto');
one('ho comprato pane e latte 5 euro ho preso un caffè 1 euro', x => x.length === 2 && x[0].cents === 500 && x[1].cents === 100, 'G4#2 «pane e latte 5 euro ho preso un caffè 1 euro»');
one('ho prestato 50 euro a mio fratello per la cena', x => x[0].loan && x[0].newAcc.name === 'Fratello' && x[0].warn.some(w => /Controlla il nome/.test(w)), 'G4#3 «a mio fratello per la cena»: persona «Fratello», non «Per»');
one('ho prestato 50 euro a mio fratello ieri', x => x[0].newAcc.name === 'Fratello' && x[0].date === '2026-11-19', 'G4#3 «… ieri»: non diventa una persona');
one('ho prestato 50 euro al mio amico con la carta', x => x[0].newAcc.name === 'Amico' && x[0].accId === 'a5', 'G4#3 «al mio amico con la carta»: «Amico», dalla carta');
one('ho prestato 50 euro a mia sorella dalla banca', x => x[0].newAcc.name === 'Sorella' && x[0].accId === 'a2', 'G4#3 «a mia sorella dalla banca»: «Sorella», dalla banca');
one('ho mandato 200 euro a mia madre dalla banca', x => !/Dalla/.test(x[0].note), 'G4#3 «a mia madre dalla banca»: nota senza «Dalla»');
one('ho prestato 50 euro a mia sorella Giulia', x => x[0].newAcc.name === 'Giulia', 'G4#3 il nome proprio dopo la parentela resta (Giulia)');
const ctxM = JSON.parse(JSON.stringify(ctx)); ctxM.accounts.push({ id: 'k5', name: 'Mamma', type: 'credito' });
r = V.parse('ho prestato 50 euro alla mamma', ctxM);
ok(r[0].toId === 'k5' && !r[0].warn.some(w => /nome/.test(w)), 'G4#5 persona già esistente: nessun avviso sul nome', r);
one('ho speso 20 euro di benzina e 15 euro di pizza', x => x.length === 2 && x[0].cents === 2000 && x[0].catId === 'c3' && x[1].cents === 1500 && x[1].catId === 'c4', 'nota G4: «20 euro di benzina e 15 euro di pizza» → 2 movimenti');
one('venerdì ho pagato 20 euro di benzina e sabato 15 euro di pizza', x => x.length === 2 && x[0].date === '2026-11-20' && x[1].date === '2026-11-14' && x[1].cents === 1500, 'nota G4: venerdì … e sabato …: 2 movimenti con le loro date');
one('ho pagato 5 euro e 50 di caffè', x => x.length === 1 && x[0].cents === 550, '«5 euro e 50» resta un importo solo (5,50 €)');

// ---- giro 5 del revisore ----
const c5 = JSON.parse(JSON.stringify(ctx)); c5.defAcc = 'a1';
c5.accounts.find(a => a.id === 'k1').bal = 5000;
c5.accounts.push({ id: 'i1', name: 'Intesa', type: 'liquidita' }, { id: 'r1', name: 'Revolut', type: 'liquidita' }, { id: 'k2', name: 'Luca', type: 'credito', bal: 3000 }, { id: 'k3', name: 'Anna', type: 'credito', bal: 2000 }, { id: 'a6', name: 'Risparmio vacanza', type: 'risparmio' });
c5.cats.push({ id: 'c5', name: 'Svago', kind: 'spesa' });
const Q = t => V.parse(t, c5), q = (t, f, m) => { const x = Q(t); ok(f(x), m, x.map(i => [i.kind, i.cents, i.accId, i.toId, i.catId, i.date, i.note])); };
q('ho pagato 18 euro di cena e Marco mi ha ridato 10 euro', x => x.length === 2 && x[0].kind === 'spesa' && x[0].cents === 1800 && x[1].kind === 'giro' && x[1].accId === 'k1' && x[1].cents === 1000, 'G5#1 «… e Marco mi ha ridato 10 euro»: restituzione dal credito');
q('ho pagato 18 euro di cena e Luca mi ha dato 20 euro', x => x[1].kind === 'giro' && x[1].accId === 'k2', 'G5#1 «… e Luca mi ha dato 20 euro» (credito aperto): restituzione');
q('ho pagato 18 euro di cena e Anna mi ha restituito 15 euro', x => x[1].kind === 'giro' && x[1].accId === 'k3', 'G5#1 «… e Anna mi ha restituito»');
q('ho preso un caffè 1 euro e con la carta ho pagato 30 euro di benzina', x => x.length === 2 && x[0].accId === 'a1' && x[1].accId === 'a5' && x[1].catId === 'c3', 'G5#1 «… e con la carta ho pagato»: la carta va alla benzina');
q('ho preso un caffè 1 euro, con la carta ho pagato 30 euro di benzina', x => x[0].accId === 'a1' && x[1].accId === 'a5', 'G5#1 stessa frase con la virgola');
q('ho preso un caffè 1 euro e dalla banca ho mandato 50 euro a Marco', x => x[0].accId === 'a1' && x[1].accId === 'a2', 'G5#1 «… e dalla banca ho mandato»');
q('ho preso un caffè 1 euro e sulla banca ho ricevuto lo stipendio di 1500 euro', x => x[1].kind === 'entrata' && x[1].accId === 'a2' && x[1].catId === 'e1', 'G5#1 «… e sulla banca ho ricevuto lo stipendio»');
q('ho preso un caffè 1 euro e a Marco ho prestato 20 euro', x => x[1].loan && x[1].toId === 'k1', 'G5#1 «… e a Marco ho prestato»: prestito a Marco');
q('ho pagato 30 euro di benzina e al supermercato ho speso 40 euro', x => x[0].catId === 'c3' && x[1].catId === 'c1' && x[1].cents === 4000, 'G5#1 «… e al supermercato ho speso»: categorie giuste');
q('ieri ho speso 30 euro tra pizza e birra oggi ho ricevuto 50 euro', x => x.length === 2 && x[0].date === '2026-11-19' && x[1].date === '2026-11-20' && x[1].kind === 'entrata', 'G5#1 «… pizza e birra oggi ho ricevuto»: date giuste');
q('ho pagato 10 euro di benzina, 30 euro di spesa', x => x.length === 2 && x[0].cents === 1000 && x[1].cents === 3000 && x[1].catId === 'c1', 'G5#2 «10 euro di benzina, 30 euro di spesa»');
q('ho pagato 20 euro di pizza e 40 euro di spesa', x => x.length === 2 && x[1].cents === 4000, 'G5#2 «… e 40 euro di spesa»: 2 movimenti');
q('ho pagato 20 euro di pizza e poi 50 euro di spesa', x => x.length === 2 && x[1].cents === 5000, 'G5#2 «… e poi 50 euro di spesa»');
q('ho pagato 100 euro di bollette, 50 euro di internet e 30 euro di telefono', x => x.length === 3 && x.map(i => i.cents).join() === '10000,5000,3000', 'G5#3 tre importi con virgola ed «e»');
q('ho ricevuto 50 euro da Marco, 30 euro da Luca e 20 euro da Anna', x => x.length === 3 && x[0].accId === 'k1' && x[1].accId === 'k2' && x[2].accId === 'k3' && x.every(i => i.kind === 'giro'), 'G5#3 tre restituzioni, ognuna dal suo credito');
q('ho pagato 9,90 euro di spotify e 12,99 di netflix', x => x.length === 2 && x[0].cents === 990 && x[1].cents === 1299, 'G5#3 «e 12,99 di netflix» senza «euro»');
q('oggi ho pagato 30 euro di spesa e 20 di benzina', x => x.length === 2 && x[1].cents === 2000 && x[1].catId === 'c3', 'G5#3 «e 20 di benzina»');
q('ho speso venti euro di benzina e quindici euro di pizza', x => x.length === 2 && x[0].cents === 2000 && x[0].catId === 'c3' && x[1].cents === 1500 && x[1].catId === 'c4', 'G5#3 importi in lettere');
q('il 28 ottobre ho pagato 45 euro di gas e il 30 ottobre 20 euro di luce', x => x.length === 2 && x[0].date === '2026-10-28' && x[1].date === '2026-10-30' && x[1].cents === 2000, 'G5#3 «… e il 30 ottobre 20 euro di luce»');
q('ho pagato 5 euro e 50 di colazione', x => x.length === 1 && x[0].cents === 550, 'G5#3 «5 euro e 50» resta 5,50 €');
q('ho pagato 20 euro di benzina e 15 euro di pizza con la carta', x => x.length === 2 && x[0].accId === 'a5' && x[1].accId === 'a5', 'G5#4 «… con la carta» vale per entrambi');
q('con la carta ho pagato 20 euro di benzina e 15 euro di pizza', x => x[0].accId === 'a5' && x[1].accId === 'a5', 'G5#4 «con la carta ho pagato …» vale per entrambi');
q("l'affitto 500 euro e il condominio 80 euro con la banca", x => x.length === 2 && x[0].accId === 'a2' && x[1].accId === 'a2', 'G5#4 «… con la banca» vale per entrambi');
q('dalla banca ho mandato 50 euro a Marco e 30 euro a Luca', x => x.length === 2 && x[0].accId === 'a2' && x[1].accId === 'a2', 'G5#4 «dalla banca» vale anche per Luca');
q('ho trasferito 300 euro dalla banca al conto risparmio e 50 euro sul risparmio vacanza', x => x.length === 2 && x[1].kind === 'giro' && x[1].accId === 'a2' && x[1].toId === 'a6', 'G5#4 secondo giroconto: dalla banca al risparmio vacanza');
q('ho prestato 40 euro a mio fratello Marco', x => x[0].loan && x[0].toId === 'k1', 'G5#5 «a mio fratello Marco»: usa il credito Marco esistente');
['questa mattina', 'come anticipo', 'mentre eravamo al bar', 'stanotte'].forEach(w => q('ho prestato 50 euro a mia sorella ' + w, x => x[0].loan && x[0].newAcc && x[0].newAcc.name === 'Sorella', 'G5#6 «a mia sorella ' + w + '» → «Sorella»'));
q('ho dato 20 euro a mio fratello così me li ridà', x => x[0].loan && x[0].newAcc && x[0].newAcc.name === 'Fratello', 'G5#6/#8 «così me li ridà» → prestito a «Fratello»');
q('ho speso 30 euro col bancomat', x => x[0].kind === 'spesa' && x[0].cents === 3000, 'G5#7 «speso col bancomat»: spesa, non prelievo');
q('ho fatto la spesa col bancomat 40 euro', x => x[0].kind === 'spesa' && x[0].catId === 'c1', 'G5#7 «la spesa col bancomat»: spesa in Alimentari');
q('ho prestato 50 euro a mio fratello col bancomat', x => x[0].loan, 'G5#7 prestito «col bancomat»: resta prestito');
q('ho prelevato 50 euro al bancomat', x => x[0].kind === 'giro' && x[0].toId === 'a1', 'G5#7 «prelevato al bancomat»: prelievo');
q('ho dato 20 euro a mio fratello che me li ridà', x => x[0].loan, 'G5#8 «che me li ridà» al presente: prestito');
q('ho dato 20 euro ad Anna che me li rende', x => x[0].loan && x[0].toId === 'k3', 'G5#8 «che me li rende»: prestito ad Anna');

// Nuovo: conti e categorie mancanti proposti per la creazione automatica
one('ho pagato 30 euro con la carta Amex', x => x[0].accId === '__newacc__' && x[0].newFrom.name === 'Amex', 'carta «Amex» inesistente → nuovo conto Amex');
one('ho speso 12 euro dal conto Mediolanum', x => x[0].accId === '__newacc__' && x[0].newFrom.name === 'Mediolanum', 'conto «Mediolanum» inesistente → nuovo conto');
one('ho ricevuto 200 euro su N26', x => x[0].kind === 'entrata' && x[0].accId === '__newacc__' && x[0].newFrom.name === 'N26', 'entrata su N26 inesistente → nuovo conto N26');
one('ho pagato 20 euro con la carta di credito', x => x[0].accId === 'a5' && !x[0].newFrom, '«carta di credito» esistente: nessun nuovo conto');
one('ho pagato 20 euro dal conto corrente', x => x[0].accId !== '__newacc__', '«conto corrente»: non è un nome di conto da creare');
one('ho pagato 20 euro con la carta Unicredit', x => x[0].accId === 'u1' && !x[0].newFrom, 'carta Unicredit: usa il conto Unicredit esistente');
one('ho pagato 15 euro al cinema', x => x[0].catId === '__newcat__' && x[0].newCat.name === 'Svago' && x[0].newCat.kind === 'spesa', 'cinema senza categoria «Svago» → nuova categoria Svago');
one('ho speso 40 euro categoria palestra', x => x[0].catId === '__newcat__' && x[0].newCat.name === 'Palestra', '«categoria palestra» inesistente → nuova categoria Palestra');
one('ho speso 40 euro di spesa categoria alimentari', x => x[0].catId === 'c1' && !x[0].newCat, '«categoria alimentari» esistente: usa quella');
one('netflix 12,99', x => x[0].catId === 'c7' && !x[0].newCat, 'Netflix: categoria Abbonamenti esistente');
one('ho ricevuto 50 euro di regalo', x => x[0].kind === 'entrata' && x[0].catId === '__newcat__' && x[0].newCat.name === 'Regali' && x[0].newCat.kind === 'entrata', 'regalo senza categoria «Regali» → nuova categoria di entrata');
one('ho pagato 8 euro al cinema con la carta Amex e 20 euro di regalo categoria compleanni', x => x.length === 2 && x.every(i => i.accId === '__newacc__' && i.newFrom.name === 'Amex') && x[1].newCat && x[1].newCat.name === 'Compleanni', 'due importi, «carta Amex» detta una volta: entrambi sul nuovo conto Amex (non sulla Carta di credito)');
one('ho prestato 50 euro ad Antonio con Revolut', x => x[0].loan && x[0].accId !== '__newacc__', 'prestito: il conto mancante non viene creato in automatico (resta l’avviso)');

// Revisione: conti chiamati «Conto X» / «Carta X», falsi positivi, banche dal nome breve
const ctxF = JSON.parse(JSON.stringify(ctx)); ctxF.accounts.push({ id: 'f1', name: 'Conto Fineco', type: 'liquidita' }, { id: 'h1', name: 'Carta Hype', type: 'debito' }, { id: 'n1', name: 'Carta N26', type: 'liquidita' }, { id: 'i1', name: 'Conto ING', type: 'liquidita' });
const PF = t => V.parse(t, ctxF), oneF = (t, f, m) => { const x = PF(t); ok(f(x), m, x); };
oneF('ho pagato 20 euro dal conto Fineco', x => x[0].accId === 'f1' && !x[0].newFrom, '«dal conto Fineco» → Conto Fineco esistente');
oneF('ho ricevuto 100 euro sul conto Fineco', x => x[0].kind === 'entrata' && x[0].accId === 'f1', '«sul conto Fineco» → entrata su Conto Fineco');
oneF('ho pagato 20 euro con la carta Hype', x => x[0].accId === 'h1', '«con la carta Hype» → Carta Hype');
oneF('ho trasferito 100 euro dal conto Fineco ai contanti', x => x[0].kind === 'giro' && x[0].accId === 'f1' && x[0].toId === 'a1', 'giroconto dal Conto Fineco ai contanti');
oneF('ho spostato 50 euro dal conto Fineco alla carta Hype', x => x[0].kind === 'giro' && x[0].accId === 'f1' && x[0].toId === 'h1', 'giroconto dal Conto Fineco alla Carta Hype');
oneF('ho pagato 20 euro con la N26', x => x[0].accId === 'n1' && !x[0].newFrom, '«con la N26» → Carta N26 esistente, nessun doppione');
oneF('ho pagato 20 euro con ING', x => x[0].accId === 'i1' && !x[0].newFrom, '«con ING» → Conto ING esistente, nessun doppione');
['ho comprato carta igienica 5 euro', 'ho comprato una carta regalo da 50 euro', 'ho pagato 60 euro il conto alla romana', 'ho pagato 80 euro il conto dal dentista', 'ho pagato 12 euro conto bar', 'ho pagato 12 euro conto telefonico', 'ho pagato 30 euro con la carta ricaricabile', 'ho pagato 30 euro con la carta virtuale', 'ho pagato 20 euro con il bancomat', 'ho pagato 20 euro con la carta bancomat']
  .forEach(t => one(t, x => x.every(i => i.accId !== '__newacc__' && !i.newFrom), 'nessun conto inventato: «' + t + '»'));
one('ho pagato 20 euro con il bancomat', x => x[0].warn.some(w => /Bancomat/.test(w)), '«bancomat»: resta l’avviso, nessuna creazione');

// Revisione 2: giroconti con conti corti o mancanti, falsi positivi residui
oneF('ho trasferito 300 euro dalla banca a N26', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === 'n1', '«dalla banca a N26»: giroconto verso Carta N26');
oneF('ho spostato 100 euro da Unicredit verso ING', x => x[0].kind === 'giro' && x[0].accId === 'u1' && x[0].toId === 'i1', '«da Unicredit verso ING»: giroconto');
one('ho versato 50 euro sulla Revolut dalla banca', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === '__newacc__' && x[0].newFrom.name === 'Revolut', '«versato sulla Revolut dalla banca»: giroconto verso il nuovo conto Revolut, non una spesa');
one('ho trasferito 100 euro dalla N26 al conto risparmio', x => x[0].kind === 'giro' && x[0].accId === '__newacc__' && x[0].newFrom.name === 'N26' && x[0].toId === 'a3', '«dalla N26 al conto risparmio»: giroconto dal nuovo conto N26');
one('ho spostato 200 euro dal conto Fineco alla banca', x => x[0].kind === 'giro' && x[0].accId === '__newacc__' && x[0].newFrom.name === 'Fineco' && x[0].toId === 'a2', '«dal conto Fineco alla banca»: giroconto dal nuovo conto Fineco');
one('Marco mi ha ridato 20 euro sul conto Fineco', x => x[0].kind === 'giro' && x[0].accId === 'k1' && x[0].toId === '__newacc__' && x[0].newFrom.name === 'Fineco', 'restituzione sul conto Fineco inesistente: proposto come nuovo conto, non accredito silenzioso sulla banca');
one('ho pagato 20 euro con la carta Visa', x => x[0].accId === 'a5' && !x[0].newFrom, '«carta Visa» → Carta di credito, nessun conto «Visa»');
one('ho pagato 20 euro con la mastercard', x => !x[0].newFrom, '«mastercard»: nessun conto creato');
one('ho prelevato 50 euro dal bancomat', x => x[0].kind === 'giro' && !x[0].warn.some(w => /Bancomat/.test(w)), '«prelevato dal bancomat»: nessun avviso fuorviante');
['ho pagato 80 euro il conto dal dentista', 'ho pagato 12 euro conto bar'].forEach(t => one(t, x => x[0].accId !== 'a3', '«' + t + '»: non finisce sul Conto risparmio'));
one('ho messo 100 euro sul conto risparmio', x => x.length && x[0].accId !== '__newacc__', '«sul conto risparmio» resta riconosciuto');

// Revisione 3
['ho trasferito 200 euro al conto risparmio', 'ho messo 100 euro sul conto risparmio', 'ho versato 100 euro sul conto risparmio'].forEach(t => one(t, x => x[0].kind === 'giro' && x[0].toId === 'a3' && x[0].accId === 'a2', '«' + t + '»: giroconto dal conto predefinito al risparmio, non una spesa'));
one('ho trasferito 50 euro ai contanti', x => x[0].kind === 'giro' && x[0].toId === 'a1' && x[0].accId === 'a2', '«ai contanti»: giroconto verso i contanti');
one('ho trasferito 100 euro alla N26', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === '__newacc__' && x[0].newFrom.name === 'N26', '«alla N26» inesistente: giroconto verso il nuovo conto N26');
one('ho trasferito 100 euro dal conto Fineco alla N26', x => x[0].kind === 'giro' && (x[0].accId === '__newacc__' || x[0].toId === '__newacc__') && x[0].warn.some(w => /non trovato/.test(w)), 'due conti mancanti: giroconto, uno proposto e avviso per l’altro');
['ho pagato 20 euro con la mia carta', 'ho speso 30 euro con la mia carta al supermercato'].forEach(t => one(t, x => x[0].accId === 'a5', '«' + t + '» → Carta di credito'));
one('ho ricaricato la carta di 50 euro', x => x[0].kind === 'giro' ? x[0].toId === 'a5' : x[0].accId === 'a5', '«ricaricato la carta» riconosce la carta');
['ho pagato la rata del mutuo 500 euro a BNL', 'ho dato 20 euro a BNL', 'ho fatto un bonifico di 100 euro alla N26'].forEach(t => one(t, x => x.every(i => i.accId !== '__newacc__' && !i.newFrom), '«' + t + '»: la banca che riceve non diventa un conto di pagamento'));
oneF('ho pagato la rata 300 euro a ING', x => x[0].accId !== 'i1', '«a ING» (riceve): non addebita il Conto ING');
const ctxV = JSON.parse(JSON.stringify(ctx)); ctxV.accounts.push({ id: 'k9', name: 'Crediti verso amici', type: 'credito', bal: 15000 }, { id: 'pp', name: 'Postepay', type: 'liquidita' });
const oneV = (t, f, m) => { const x = V.parse(t, ctxV); ok(f(x), m, x); };
oneV('ho spostato 100 euro verso Revolut', x => x[0].accId !== 'k9' && x[0].toId !== 'k9', '«verso Revolut»: il credito «Crediti verso amici» non c’entra');
oneV('ho trasferito 300 euro verso Unicredit dalla banca', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === 'u1', '«verso Unicredit dalla banca»: giroconto banca → Unicredit');
oneF('ho pagato 10 euro con la carta di credito e 5 euro con la carta Visa', x => !x[0].warn.length, 'più importi: nessun avviso estraneo sul primo movimento');
oneF('ho pagato 10 euro con la carta di credito e 5 euro con la carta Amex', x => !x[0].warn.length && x[1].accId === '__newacc__', 'più importi: «carta Amex» solo sul secondo movimento');
['ho prelevato 50 euro dalla N26', 'ho prelevato 50 euro dal conto Fineco'].forEach(t => one(t, x => x[0].kind === 'giro' && x[0].accId === '__newacc__' && x[0].toId === 'a1', '«' + t + '» inesistente: prelievo dal nuovo conto'));

one('ho spostato 50 euro dal conto Fineco alla carta Hype', x => x[0].kind === 'giro' && x[0].toId !== 'a5' && x[0].warn.some(w => /non trovato/.test(w)), '«alla carta Hype» inesistente: non va sulla Carta di credito; un conto proposto e avviso per l’altro');
one('ho ricaricato la postepay di 50 euro dalla banca', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === '__newacc__' && x[0].newFrom.name === 'Postepay', 'ricarica di una Postepay inesistente: giroconto verso il nuovo conto');
oneV('ho ricaricato la postepay di 50 euro dalla banca', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === 'pp', 'ricarica della Postepay esistente');
one('ho dato 20 euro alla carta Esselunga', x => !x[0].newFrom, '«alla carta X» fuori da un trasferimento: nessun conto creato');

// Revisione 4
['ho versato l\'affitto di 400 euro dalla banca', 'ho versato la caparra di 500 euro dalla banca', 'ho ricaricato il telefono 10 euro con la carta'].forEach(t => one(t, x => x[0].kind === 'spesa', '«' + t + '»: spesa (senza destinazione non è un giroconto)'));
one('ho ricaricato la tessera dell\'autobus 20 euro in contanti', x => x[0].kind === 'spesa' && x[0].accId === 'a1' && x[0].catId === 'c3', 'tessera dell’autobus in contanti: spesa Trasporti dai contanti');
['ho ricaricato la carta del telefono 10 euro', 'ho ricaricato la carta carburante 50 euro', 'ho ricaricato il conto gioco 20 euro'].forEach(t => one(t, x => x[0].kind === 'spesa' && x[0].accId !== 'a5' && x[0].accId !== 'a3', '«' + t + '»: spesa, non giroconto verso carta/conto'));
one('ho ricaricato la carta Hype di 20 euro', x => x[0].kind === 'giro' && x[0].toId === '__newacc__' && x[0].newFrom.name === 'Hype', '«ricaricato la carta Hype» inesistente: giroconto verso il nuovo conto Hype');
oneF('ho ricaricato la carta Hype di 20 euro dalla banca', x => x[0].kind === 'giro' && x[0].accId === 'a2' && x[0].toId === 'h1', '«ricaricato la carta Hype dalla banca»: banca → Hype');
const ctxB = JSON.parse(JSON.stringify(ctx)); ctxB.defAcc = 'a2';
one('ho versato 100 euro in banca', x => x[0].kind === 'giro' && x[0].toId === 'a2' && x[0].accId === 'a1' && x[0].warn.some(w => /origine/.test(w)), '«versato in banca» col conto predefinito = banca: dai contanti alla banca, con avviso');
one('ho depositato 200 euro in banca', x => x[0].kind === 'giro' && x[0].toId === 'a2', '«depositato in banca»: giroconto, non spesa');
one('ho versato 50 euro in contanti sul conto risparmio', x => x[0].kind === 'giro' && x[0].accId === 'a1' && x[0].toId === 'a3', '«in contanti sul conto risparmio»: dai contanti al risparmio');
one('ho preso 20 euro di benzina con la carta e 10 euro di caffè in contanti', x => x[0].accId === 'a5' && x[1].accId === 'a1', 'benzina con la carta, caffè in contanti');
one('ho pagato 15 euro in contanti e 10 euro con la carta', x => x[0].accId === 'a1' && x[1].accId === 'a5', '15 in contanti, 10 con la carta');
const ctxR = JSON.parse(JSON.stringify(ctx)); ctxR.accounts.push({ id: 'a6', name: 'Risparmio vacanza', type: 'risparmio' });
ok((r => r.length === 2 && r.every(i => i.kind === 'giro') && r[1].toId === 'a6')(V.parse('ho messo 20 euro sul conto risparmio e 30 euro sul risparmio vacanza', ctxR)), '«messo … e 30 euro sul risparmio vacanza»: entrambi versamenti', V.parse('ho messo 20 euro sul conto risparmio e 30 euro sul risparmio vacanza', ctxR));
['ho trasferito 100 euro sul conto corrente', 'ho trasferito 100 euro al conto di Marco', 'ho trasferito 100 euro sul mio conto'].forEach(t => one(t, x => !(x[0].kind === 'giro' && x[0].toId === 'a3'), '«' + t + '»: non va sul Conto risparmio'));
one('ho trasferito 100 euro sul conto corrente', x => x[0].toId === 'a2' || x[0].kind !== 'giro', '«sul conto corrente» → Banca C/C');
one('ho pagato 10 euro con la Revolut e 5 euro con la carta', x => x[0].accId === '__newacc__' && x[1].accId === 'a5', 'Revolut (nuovo) e carta: ognuno il suo conto');
one('ho girato 50 euro sui contanti', x => x[0].kind === 'giro' && x[0].toId === 'a1', '«sui contanti»: destinazione contanti');

['ho trasferito 50 euro alla Postepay di mia figlia', 'ho ricaricato la postepay di mia figlia 50 euro', 'ho versato 50 euro sul conto Fineco di mio fratello'].forEach(t => one(t, x => !x[0].newFrom, '«' + t + '»: conto di un’altra persona, nessun conto tuo creato'));

console.log(fails ? `\n${fails} FALLITI` : '\nTUTTI PASSATI'); process.exit(fails ? 1 : 0);
