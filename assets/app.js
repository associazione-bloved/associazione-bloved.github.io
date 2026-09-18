/* associazione bloved — registro turni.
   Niente build, niente dipendenze, niente login.

   COME SCRIVE, visto che GitHub Pages non ha un server:
   il turno viene spedito come una riga a un modulo Google (POST no-cors, l'unico
   endpoint che accetta una scrittura da una pagina statica). Il modulo lo scrive
   nel foglio. Poi la pagina RILEGGE il foglio: "salvato" compare solo quando la
   riga e' davvero li'. La risposta del POST non e' leggibile (no-cors), quindi
   fidarsi dell'invio sarebbe fidarsi del nulla.

   Un modulo sa solo AGGIUNGERE righe. Quindi il foglio e' un registro: ogni
   riga porta un id e un'azione (nuovo/modifica/cancella) e lo stato si ottiene
   rileggendo il registro dall'inizio, dove per ogni id vince l'ultima riga.
   Effetto collaterale utile: resta la storia di chi ha cambiato cosa. */
'use strict';

const C = window.CONFIG || {};
const MODO = (C.formId && C.campo && C.sheetId) ? 'google' : 'locale';
const BASE = C.base || 'https://docs.google.com';   // spostabile solo per le prove
const URL_FORM = `${BASE}/forms/d/e/${C.formId}/formResponse`;
const gviz = (foglio) =>
  `${BASE}/spreadsheets/d/${C.sheetId}/gviz/tq?tqx=out:csv&headers=1` +
  (foglio ? `&sheet=${encodeURIComponent(foglio)}` : '') + `&_=${Date.now()}`;

const K_CODA = 'bloved.coda';
const K_LOCALE = 'bloved.righe';

const GIORNI = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
const STATI = ['fatto', 'annullato', 'non fatto'];

let EDUCATORI = C.educatori || [];
let BAMBINI = C.bambini || [];

const S = {                      // stato della pagina
  vista: 'settimana',
  lunedi: lunediDi(new Date()),
  mese: primoDelMese(new Date()),
  /* Mai ricordata: chi apre il registro dichiara chi e' ogni volta. Sette
     persone possono usare lo stesso telefono, e un'identita' ereditata dalla
     volta prima attribuisce il turno alla persona sbagliata. */
  io: '',
  turni: [],                     // registro riprodotto
  coda: leggiJSON(K_CODA, []),   // non ancora confermati dal foglio
  errore: ''
};

/* ---------------------------------------------------------------- utilità */

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function leggiJSON(k, def) {
  try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; }
}
function scriviJSON(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota: pazienza */ }
}

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const daISO = (s) => { const [a, m, g] = String(s).split('-').map(Number); return new Date(a, m - 1, g); };
const piuGiorni = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function lunediDi(d) {           // la settimana parte di lunedi', come nel file originale
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
/* dichiarazione, non const: S la usa prima di questa riga */
function primoDelMese(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }

const minuti = (hhmm) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : NaN;
};
const oreIt = (n) => n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const educatore = (c) => EDUCATORI.find((e) => e.codice === c);
const bambino = (c) => BAMBINI.find((b) => b.codice === c);

/* ------------------------------------------------------ regola delle ore */
/* Unica implementazione: nessun'altra parte del programma calcola ore. */
function oreDi(t) {
  if (t.stato !== 'fatto') return 0;                    // annullato / non fatto non contano
  if (t.oreManuali !== '' && t.oreManuali != null) {    // la casella eccezioni vince sempre
    const v = Number(String(t.oreManuali).replace(',', '.'));
    if (isFinite(v) && v >= 0) return v;
  }
  const m = minuti(t.alle) - minuti(t.dalle);
  if (!(m > 0)) return 0;
  return Math.round(m / 15) * 15 / 60;                  // al quarto d'ora piu' vicino
}

/* ---------------------------------------------------------- aggregazioni */
/* Ore per educatrice: si contano le FASCE distinte (data+dalle+alle). Due righe
   sulla stessa fascia (una per bambino) sono un turno solo: l'educatrice non ha
   lavorato il doppio. Ore per bambino: ogni bambino presente riceve la fascia
   intera, quindi due bambini insieme ricevono entrambi 1,5 h. */
function orePerEducatore(turni) {
  const viste = new Set(), out = new Map();
  for (const t of turni) {
    const k = `${t.educatore}|${t.data}|${t.dalle}|${t.alle}`;
    if (viste.has(k)) continue;
    viste.add(k);
    out.set(t.educatore, (out.get(t.educatore) || 0) + oreDi(t));
  }
  return out;
}

function orePerBambino(turni) {
  const out = new Map();
  for (const t of turni) {
    const o = oreDi(t);
    for (const b of t.bambini || []) out.set(b, (out.get(b) || 0) + o);
  }
  return out;
}

function orePerGiorno(turni) {
  const viste = new Set(), out = new Map();
  for (const t of turni) {
    const k = `${t.educatore}|${t.data}|${t.dalle}|${t.alle}`;
    if (viste.has(k)) continue;
    viste.add(k);
    out.set(t.data, (out.get(t.data) || 0) + oreDi(t));
  }
  return out;
}

/* Sovrapposizioni: si segnalano, non si bloccano. Una persona non puo' essere in
   due case insieme, ma il turno va comunque salvato e poi corretto. */
function sovrapposizioni(t, turni) {
  const a0 = minuti(t.dalle), a1 = minuti(t.alle), avvisi = [];
  for (const u of turni) {
    if (u.id === t.id || u.data !== t.data || u.stato !== 'fatto') continue;
    if (!(minuti(u.dalle) < a1 && a0 < minuti(u.alle))) continue;
    if (u.educatore === t.educatore) {
      avvisi.push(`${etichettaEdu(u.educatore)} ha gia' un turno ${u.dalle}–${u.alle}`);
    }
    for (const b of t.bambini || []) {
      if ((u.bambini || []).includes(b)) {
        avvisi.push(`${etichettaBimbo(b)} risulta gia' seguito ${u.dalle}–${u.alle}`);
      }
    }
  }
  return [...new Set(avvisi)];
}

const etichettaEdu = (c) => (educatore(c) || {}).etichetta || c;
const etichettaBimbo = (c) => (bambino(c) || {}).etichetta || c;
const coloreBimbo = (c) => (bambino(c) || {}).colore || '#8A8175';

/* ------------------------------------------------------------ registro
   Per ogni id vince la riga con `v` piu' alto, NON l'ultima del foglio: il
   modulo Google scrive le risposte nell'ordine in cui le riceve, che non e'
   l'ordine in cui sono partite. Misurato: una modifica spedita prima di una
   cancellazione e' finita nel foglio DOPO, e fidandosi dell'ordine delle righe
   il turno cancellato tornava a galla. `v` lo decide chi scrive, e a parita'
   (stesso millisecondo) vince l'ultima riga. */
function riproduci(righe) {
  const m = new Map();
  for (const r of righe) {
    if (!r || !r.id) continue;
    const prima = m.get(r.id);
    if (prima && (prima.v || 0) > (r.v || 0)) continue;   // gia' vista una piu' recente
    m.set(r.id, r);
  }
  return [...m.values()]
    .filter((r) => r.azione !== 'cancella')
    .sort((a, b) => (a.data + a.dalle).localeCompare(b.data + b.dalle));
}

/* CSV vero: il JSON contiene virgole e virgolette, quindi il campo arriva
   quotato con le virgolette raddoppiate. Uno split(',') qui distrugge i dati. */
function leggiCSV(testo) {
  const righe = [[]];
  let campo = '', dentro = false;
  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (dentro) {
      if (c === '"') { if (testo[i + 1] === '"') { campo += '"'; i++; } else dentro = false; }
      else campo += c;
    } else if (c === '"') dentro = true;
    else if (c === ',') { righe[righe.length - 1].push(campo); campo = ''; }
    else if (c === '\n') { righe[righe.length - 1].push(campo); campo = ''; righe.push([]); }
    else if (c !== '\r') campo += c;
  }
  righe[righe.length - 1].push(campo);
  const ultima = righe[righe.length - 1];
  if (ultima.length === 1 && ultima[0] === '') righe.pop();
  return righe;
}

/* La colonna del JSON si riconosce dal contenuto, non dalla posizione: se
   qualcuno aggiunge una colonna al foglio il programma continua a funzionare. */
function turniDaCSV(testo) {
  const out = [];
  for (const riga of leggiCSV(testo)) {
    for (const cella of riga) {
      const s = String(cella).trim();
      if (s.charAt(0) !== '{') continue;
      try {
        const o = JSON.parse(s);
        if (o && o.id) { out.push(o); break; }
      } catch { /* riga non nostra */ }
    }
  }
  return out;
}

/* --------------------------------------------------------------- rete */
/* Le righe grezze del registro, nell'ordine in cui sono state scritte. */
async function leggiRighe() {
  if (MODO === 'locale') return leggiJSON(K_LOCALE, []);
  const r = await fetch(gviz(), { cache: 'no-store' });
  if (!r.ok) throw new Error(`foglio non leggibile (${r.status})`);
  return turniDaCSV(await r.text());
}

async function leggiTurni() {
  return riproduci(await leggiRighe());
}

async function spedisci(payload) {
  if (MODO === 'locale') {
    const righe = leggiJSON(K_LOCALE, []);
    righe.push(payload);
    scriviJSON(K_LOCALE, righe);
    return;
  }
  const body = new URLSearchParams();
  body.append(C.campo, JSON.stringify(payload));
  // no-cors: la risposta e' opaca. L'esito si verifica rileggendo il foglio.
  await fetch(URL_FORM, { method: 'POST', mode: 'no-cors', body });
}

/* Scrive e poi CONTROLLA che la riga sia ARRIVATA nel registro.
   Si cerca la riga esatta (id + v) fra quelle grezze, non il turno nello stato
   ricostruito: se nel frattempo arriva una cancellazione o una modifica piu'
   recente, il turno non e' piu' visibile pur essendo la riga arrivata. Cercare
   nello stato faceva dichiarare fallita una scrittura riuscita, che restava in
   coda e al riavvio veniva rispedita: una modifica poteva resuscitare un turno
   cancellato. */
async function salvaEConferma(payload) {
  await spedisci(payload);
  for (const attesa of [600, 1200, 2000, 3000]) {
    await new Promise((r) => setTimeout(r, attesa));
    let righe;
    try { righe = await leggiRighe(); } catch { continue; }
    if (righe.some((r) => r.id === payload.id && r.v === payload.v)) {
      S.turni = riproduci(righe);
      return true;
    }
  }
  return false;
}

/* La coda e' la promessa che niente va perso: quello che non e' stato
   confermato resta sul telefono e riparte da solo. */
async function svuotaCoda() {
  if (!S.coda.length) return;
  const restano = [];
  for (const p of S.coda) {
    const ok = await salvaEConferma(p).catch(() => false);
    if (!ok) restano.push(p);
  }
  S.coda = restano;
  scriviJSON(K_CODA, S.coda);
  disegna();
}

async function aggiorna() {
  try {
    S.turni = await leggiTurni();
    S.errore = '';
  } catch (e) {
    S.errore = e.message || 'foglio non raggiungibile';
  }
  disegna();
}

/* ------------------------------------------------------------- vista */
function turniDi(data, codiceEdu) {
  const tutti = riproduci([...S.turni, ...S.coda]);
  return tutti.filter((t) => t.data === data && (!codiceEdu || t.educatore === codiceEdu));
}
const inAttesa = (id) => S.coda.some((p) => p.id === id);

function pallini(codici) {
  return (codici || []).map((b) =>
    `<span class="pois" style="--seg:${esc(coloreBimbo(b))}" title="${esc(etichettaBimbo(b))}"></span>`).join('');
}

function chip(t) {
  const cls = ['chip', `st-${t.stato.replace(' ', '-')}`];
  if (inAttesa(t.id)) cls.push('attesa');
  const ore = oreDi(t);
  return `<button type="button" class="${cls.join(' ')}" data-modifica="${esc(t.id)}">
    <span class="chip-ora">${esc(t.dalle)}–${esc(t.alle)}</span>
    <span class="chip-edu">${esc(t.educatore)}</span>
    <span class="chip-pois">${pallini(t.bambini)}</span>
    <span class="chip-ore">${ore ? oreIt(ore) + ' h' : esc(t.stato)}</span>
  </button>`;
}

function vistaSettimana() {
  const giorni = GIORNI.map((_, i) => piuGiorni(S.lunedi, i));
  const celle = giorni.map((d, i) => {
    const data = iso(d);
    const lista = turniDi(data);
    const pastello = ['--sage', '--sky', '--butter', '--blush', '--lilac', '--sage', '--butter'][i];
    return `<li class="day${i > 4 ? ' festivo' : ''}" style="--panel:var(${pastello})">
      <span class="day-name">${GIORNI[i]} ${d.getDate()}</span>
      <div class="day-turni">
        ${lista.map(chip).join('')}
      </div>
      <button type="button" class="aggiungi" data-nuovo="${data}">+ turno</button>
    </li>`;
  }).join('');

  const fine = piuGiorni(S.lunedi, 6);
  const titolo = `${S.lunedi.getDate()} – ${fine.getDate()} ${fine.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`;
  const tuttiTurni = giorni.flatMap((d) => turniDi(iso(d)));
  const ore = [...orePerGiorno(tuttiTurni).values()].reduce((a, b) => a + b, 0);

  return `<div class="barra">
      <button type="button" class="bottone" data-sposta="-7" aria-label="Settimana precedente">←</button>
      <h2 class="barra-titolo">${esc(titolo)}</h2>
      <button type="button" class="bottone" data-sposta="7" aria-label="Settimana successiva">→</button>
      <button type="button" class="bottone" data-oggi="1">oggi</button>
      <span class="barra-tot">${oreIt(ore)} h</span>
    </div>
    ${tuttiTurni.length ? '' : `<p class="vuoto-aiuto">Questa settimana non c'è ancora niente.
      Tocca <b>+ turno</b> sul giorno in cui sei andata.</p>`}
    <ol class="week-grid settimana">${celle}</ol>`;
}

/* Turni di un mese. Un solo posto che decide cosa "appartiene" al mese, usato
   dalla vista e dal documento da stampare. */
function turniDelMese(anno, mese) {
  const pre = `${anno}-${String(mese + 1).padStart(2, '0')}`;
  return riproduci([...S.turni, ...S.coda]).filter((t) => t.data.startsWith(pre));
}

/* La griglia del mese: una riga per giorno, una colonna per educatrice.
   Stessa tabella in pagina e sul foglio stampato, cosi' i numeri non possono
   divergere fra quello che si vede e quello che si consegna. */
function grigliaMese(turniMese, anno, mese) {
  const ultimo = new Date(anno, mese + 1, 0).getDate();
  const righe = [];
  for (let g = 1; g <= ultimo; g++) {
    const d = new Date(anno, mese, g), data = iso(d);
    const festivo = d.getDay() === 0 || d.getDay() === 6;
    const celle = EDUCATORI.map((e) => {
      const lista = turniMese.filter((t) => t.data === data && t.educatore === e.codice);
      return `<td>${lista.map((t) =>
        `<span class="cella-turno">${esc(t.dalle)}–${esc(t.alle)} ${pallini(t.bambini)}</span>`).join('') || ''}</td>`;
    }).join('');
    const oreGiorno = [...orePerEducatore(turniMese.filter((t) => t.data === data)).values()].reduce((a, b) => a + b, 0);
    righe.push(`<tr${festivo ? ' class="festivo"' : ''}>
      <th scope="row">${GIORNI[(d.getDay() + 6) % 7]} ${g}</th>
      <td class="n ore-giorno">${oreGiorno ? oreIt(oreGiorno) : ''}</td>${celle}</tr>`);
  }

  const perEdu = orePerEducatore(turniMese);
  const totali = EDUCATORI.map((e) => `<td class="n">${oreIt(perEdu.get(e.codice) || 0)}</td>`).join('');
  const totale = [...perEdu.values()].reduce((a, b) => a + b, 0);

  return `<table class="data mese">
      <caption>Ore per giorno e per educatrice — solo i turni fatti contano</caption>
      <thead><tr><th scope="col">Giorno</th><th scope="col" class="n ore-giorno">Ore</th>
        ${EDUCATORI.map((e) => `<th scope="col">${esc(e.codice)}</th>`).join('')}</tr></thead>
      <tbody>${righe.join('')}</tbody>
      <tfoot><tr><th scope="row">Totale</th>
        <td class="n ore-giorno">${oreIt(totale)}</td>${totali}</tr></tfoot>
    </table>`;
}

function vistaMese() {
  const anno = S.mese.getFullYear(), mese = S.mese.getMonth();
  const turniMese = turniDelMese(anno, mese);
  const totale = [...orePerEducatore(turniMese).values()].reduce((a, b) => a + b, 0);

  return `<div class="barra">
      <button type="button" class="bottone" data-mese="-1" aria-label="Mese precedente">←</button>
      <h2 class="barra-titolo">${esc(S.mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))}</h2>
      <button type="button" class="bottone" data-mese="1" aria-label="Mese successivo">→</button>
      <span class="barra-tot">${oreIt(totale)} h</span>
      <button type="button" class="bottone" data-csv="1">scarica csv</button>
      <button type="button" class="bottone" data-stampa="1">foglio da stampare</button>
    </div>
    <div class="chart-scroll">${grigliaMese(turniMese, anno, mese)}</div>
    ${tabellaBambini(turniMese)}`;
}

function tabellaBambini(turni) {
  const per = orePerBambino(turni);
  const tot = [...per.values()].reduce((a, b) => a + b, 0);
  return `<table class="data">
    <caption>Ore effettive per bambino</caption>
    <thead><tr><th scope="col">Bambino</th><th scope="col" class="n">Ore</th></tr></thead>
    <tbody>${BAMBINI.map((b) => `<tr>
      <th scope="row"><span class="pois" style="--seg:${esc(b.colore)}"></span> ${esc(b.etichetta)}</th>
      <td class="n">${oreIt(per.get(b.codice) || 0)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row">Totale</th><td class="n">${oreIt(tot)}</td></tr></tfoot></table>`;
}

/* ---------------------------------------------------------- statistiche */
const polo = (cx, cy, r, a) => {
  const t = (a - 90) * Math.PI / 180;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
};
function arco(cx, cy, r, a0, a1) {
  const [x0, y0] = polo(cx, cy, r, a0), [x1, y1] = polo(cx, cy, r, a1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/* `totale` e' quello vero (puo' essere 0 e va scritto cosi'); `scala` e' il
   divisore per gli angoli. Tenerli separati: usando il divisore anche come
   etichetta, un mese vuoto dichiarava "1,00 ore". */
function anello(voci, totale, soloSvg) {
  const cx = 130, cy = 130, r = 88;
  const scala = totale > 0 ? totale : 1;
  let a = 0;
  const archi = voci.filter((v) => v.ore > 0).map((v) => {
    const da = a, a1 = a + (v.ore / scala) * 360;
    a = a1;
    // un solo bambino = giro intero: un arco con inizio e fine coincidenti non disegna nulla
    if (a1 - da >= 359.9) {
      return `<circle class="seg" style="--seg:${esc(v.colore)}" cx="${cx}" cy="${cy}" r="${r}"/>`;
    }
    return `<path class="seg" style="--seg:${esc(v.colore)}" d="${arco(cx, cy, r, da, a1)}"/>`;
  }).join('');
  /* i bordi d'inchiostro dell'anello: senza, il giallo #FFFF00 sparisce
     contro la carta chiara */
  const bordi = totale > 0
    ? `<circle class="ring-edge" cx="${cx}" cy="${cy}" r="${r + 13}"/>
       <circle class="ring-edge" cx="${cx}" cy="${cy}" r="${r - 13}"/>`
    : `<circle class="ring-vuoto" cx="${cx}" cy="${cy}" r="${r}"/>`;
  const svg = `<svg viewBox="0 0 260 260" role="img"
      aria-label="Ore per bambino: ${voci.map((v) => `${v.etichetta} ${oreIt(v.ore)}`).join(', ')}">
      ${archi}${bordi}
      <circle class="hub" cx="${cx}" cy="${cy}" r="62"/>
      <text class="hub-num" x="${cx}" y="${cy + 4}" text-anchor="middle">${oreIt(totale)}</text>
      <text class="hub-cap" x="${cx}" y="${cy + 26}" text-anchor="middle">ore nel mese</text>
    </svg>`;
  // il documento da stampare incornicia il disegno a modo suo
  return soloSvg ? svg : `<figure class="chart donut">${svg}</figure>`;
}

function lecca(voci) {
  // le etichette qui sono codici corti (E1…E7): 96px lasciavano un vuoto enorme
  const X0 = 52, Y0 = 30, DY = 34, W = 380;
  const max = Math.max(1, ...voci.map((v) => v.ore));
  const px = (W - X0 - 46) / max;
  const corpo = voci.map((v, i) => {
    const y = Y0 + i * DY, x = X0 + v.ore * px;
    return `<line class="stem" x1="${X0}" y1="${y}" x2="${x}" y2="${y}"/>
      <circle class="dot" cx="${x}" cy="${y}" r="7"/>
      <text class="num" x="${x + 14}" y="${y + 4}">${oreIt(v.ore)}</text>
      <text class="day" x="0" y="${y + 4}">${esc(v.etichetta)}</text>`;
  }).join('');
  return `<figure class="chart lollipop"><svg viewBox="0 0 ${W} ${Y0 + voci.length * DY}" role="img"
      aria-label="Ore per educatrice: ${voci.map((v) => `${v.etichetta} ${oreIt(v.ore)}`).join(', ')}">
      <line class="rule" x1="${X0}" y1="10" x2="${X0}" y2="${Y0 + voci.length * DY - 14}"/>
      ${corpo}</svg></figure>`;
}

function vistaStatistiche() {
  const anno = S.mese.getFullYear(), mese = S.mese.getMonth();
  const turni = turniDelMese(anno, mese);

  const perB = orePerBambino(turni);
  const vociB = BAMBINI.map((b) => ({ etichetta: b.etichetta, colore: b.colore, ore: perB.get(b.codice) || 0 }));
  const totB = vociB.reduce((a, v) => a + v.ore, 0);

  const perE = orePerEducatore(turni);
  const vociE = EDUCATORI.map((e) => ({ etichetta: e.codice, ore: perE.get(e.codice) || 0 }));

  const legenda = vociB.map((v) => `<li>
      <span class="swatch" style="--seg:${esc(v.colore)}"></span>
      <span class="who">${esc(v.etichetta)}</span>
      <span class="val">${oreIt(v.ore)} h</span></li>`).join('');

  return `<div class="barra">
      <button type="button" class="bottone" data-mese="-1" aria-label="Mese precedente">←</button>
      <h2 class="barra-titolo">${esc(S.mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }))}</h2>
      <button type="button" class="bottone" data-mese="1" aria-label="Mese successivo">→</button>
    </div>
    ${totB === 0 ? '<p class="empty">Nessun turno registrato in questo mese.</p>' : ''}
    <div class="plots">
      <div class="panel"><div class="panel-head"><h3>Ore per bambino</h3>
        <p class="caption">mese corrente</p></div>
        ${anello(vociB, totB)}
        <ul class="legend">${legenda}
          <li class="tot"><span class="who">Totale</span><span class="val">${oreIt(totB)} h</span></li></ul></div>
      <div class="panel"><div class="panel-head"><h3>Ore per educatrice</h3>
        <p class="caption">mese corrente</p></div>${lecca(vociE)}</div>
    </div>
    <p class="note">Le ore per bambino e quelle per educatrice non coincidono:
      quando un'educatrice segue due bambini nella stessa fascia, lei fa un turno
      solo ma ciascun bambino riceve tutte quelle ore.</p>`;
}

/* ------------------------------------------------------------- modulo */
function apriModulo(data, id) {
  if (!chiSono()) return;                 // senza identita' non si scrive niente
  const t = id ? S.turni.concat(S.coda).find((x) => x.id === id) : null;
  const d = $('#modulo');
  $('#m-titolo').textContent = t ? 'Modifica turno' : 'Nuovo turno';
  $('#m-id').value = t ? t.id : '';
  $('#m-data').value = t ? t.data : (data || iso(new Date()));
  // mai un ripiego su EDUCATORI[0]: attribuiva il turno alla prima educatrice
  $('#m-educatore').value = t ? t.educatore : S.io;
  $('#m-dalle').value = t ? t.dalle : '';
  $('#m-alle').value = t ? t.alle : '';
  $('#m-stato').value = t ? t.stato : 'fatto';
  $('#m-ore').value = t ? (t.oreManuali || '') : '';
  $('#m-nota').value = t ? (t.nota || '') : '';
  for (const c of d.querySelectorAll('input[name=bambini]')) {
    c.checked = !!(t && (t.bambini || []).includes(c.value));
  }
  $('#m-elimina').hidden = !t;
  $('#m-avvisi').textContent = '';
  d.showModal();
}

function raccogli() {
  const bambini = [...$('#modulo').querySelectorAll('input[name=bambini]:checked')].map((c) => c.value);
  return {
    id: $('#m-id').value || (Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)),
    azione: $('#m-id').value ? 'modifica' : 'nuovo',
    v: Date.now(),
    data: $('#m-data').value,
    educatore: $('#m-educatore').value,
    dalle: $('#m-dalle').value,
    alle: $('#m-alle').value,
    bambini,
    stato: $('#m-stato').value,
    oreManuali: $('#m-ore').value.trim(),
    nota: $('#m-nota').value.trim().slice(0, 300),
    autore: S.io,
    quando: new Date().toISOString().slice(0, 16)
  };
}

/* Identita' obbligatoria per scrivere. Un turno senza autore non si attribuisce
   a nessuno, e "chi e' andata da chi" e' esattamente il dato che serve a fine
   mese. Leggere resta libero. */
function chiSono() {
  if (educatore(S.io)) return true;
  const s = $('#io');
  messaggio('Scegli prima il tuo codice, in alto a destra.', 'attesa');
  s.classList.add('chiedi');
  s.focus();
  setTimeout(() => s.classList.remove('chiedi'), 2600);
  return false;
}

/* Convalida al confine: quello che entra qui finisce nel foglio per sempre. */
function convalida(t) {
  if (!t.data) return 'Manca la data.';
  if (!educatore(t.autore)) return 'Scegli prima il tuo codice, in alto a destra.';
  if (!educatore(t.educatore)) return 'Scegli chi ha fatto il turno.';
  if (isNaN(minuti(t.dalle)) || isNaN(minuti(t.alle))) return 'Servono ora di inizio e di fine.';
  if (minuti(t.alle) <= minuti(t.dalle)) return "L'ora di fine deve venire dopo quella di inizio.";
  if (!t.bambini.length) return 'Scegli almeno un bambino.';
  if (!STATI.includes(t.stato)) return 'Stato non valido.';
  if (t.oreManuali !== '') {
    const v = Number(t.oreManuali.replace(',', '.'));
    if (!isFinite(v) || v < 0 || v > 24) return 'Le ore a mano devono essere un numero fra 0 e 24.';
  }
  return '';
}

async function invia(payload) {
  if (!chiSono()) return;       // unico punto da cui passano salvataggi e cancellazioni
  S.coda.push(payload);
  scriviJSON(K_CODA, S.coda);
  disegna();
  const ok = await salvaEConferma(payload).catch(() => false);
  if (ok) {                       // fuori dalla coda solo quando il foglio lo conferma
    S.coda = S.coda.filter((p) => !(p.id === payload.id && p.v === payload.v));
    scriviJSON(K_CODA, S.coda);
  }
  messaggio(ok ? 'Salvato ✓' : 'Non confermato: resta in attesa, riprovo da solo.', ok ? 'ok' : 'attesa');
  disegna();
}

function messaggio(testo, tipo) {
  const e = $('#esito');
  e.textContent = testo;
  e.className = `esito ${tipo}`;
  clearTimeout(messaggio._t);
  messaggio._t = setTimeout(() => { e.textContent = ''; e.className = 'esito'; }, 6000);
}

/* --------------------------------------------------------------- csv */
/* Il documento da consegnare: non la pagina stampata, ma un foglio a se'
   costruito per la carta. Si apre in una finestra nuova, quindi la stampa del
   browser vede solo questo: niente schede, niente bottoni, niente menu.
   Riusa le stesse funzioni della pagina (griglia, anello, lecca, tabella
   bambini) perche' i numeri consegnati non possono discostarsi da quelli a
   video. */
function documentoMese() {
  const anno = S.mese.getFullYear(), mese = S.mese.getMonth();
  const turni = turniDelMese(anno, mese);
  const nomeMese = S.mese.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });

  const perB = orePerBambino(turni);
  const vociB = BAMBINI.map((b) => ({ etichetta: b.etichetta, colore: b.colore, ore: perB.get(b.codice) || 0 }));
  const totB = vociB.reduce((a, v) => a + v.ore, 0);

  const perE = orePerEducatore(turni);
  const vociE = EDUCATORI.map((e) => ({ etichetta: e.codice, ore: perE.get(e.codice) || 0 }));
  const totE = vociE.reduce((a, v) => a + v.ore, 0);

  const giorniCoperti = new Set(turni.filter((t) => oreDi(t) > 0).map((t) => t.data)).size;
  const oggi = new Date().toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

  const legenda = vociB.map((v) => `<li>
      <span class="swatch" style="--seg:${esc(v.colore)}"></span>
      <span class="who">${esc(v.etichetta)}</span>
      <span class="val">${oreIt(v.ore)} h</span></li>`).join('');

  const tabellaEdu = `<table class="data">
    <caption>Ore per educatrice</caption>
    <thead><tr><th scope="col">Educatrice</th><th scope="col" class="n">Ore</th></tr></thead>
    <tbody>${EDUCATORI.map((e) => `<tr>
      <th scope="row">${esc(e.codice)} · ${esc(e.etichetta)}</th>
      <td class="n">${oreIt(perE.get(e.codice) || 0)}</td></tr>`).join('')}</tbody>
    <tfoot><tr><th scope="row">Totale</th><td class="n">${oreIt(totE)}</td></tr></tfoot></table>`;

  return `<!doctype html>
<html lang="it"><head><meta charset="utf-8">
<title>Turni ${esc(nomeMese)} · Associazione bloved</title>
<meta name="robots" content="noindex,nofollow">
<link rel="stylesheet" href="assets/styles.css">
<link rel="stylesheet" href="assets/stampa.css">
</head><body class="foglio">

<header class="foglio-testa">
  <div class="foglio-marchio">
    <span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 22" role="presentation"><path d="M12 20.5 3.6 12.1a5.3 5.3 0 0 1 0-7.5 5.3 5.3 0 0 1 7.5 0l.9.9.9-.9a5.3 5.3 0 0 1 7.5 0 5.3 5.3 0 0 1 0 7.5Z"/></svg></span>
    <span class="wordmark">Associazione <i>bloved</i></span>
  </div>
  <div class="foglio-titolo">
    <h1>Turni di ${esc(nomeMese)}</h1>
    <p class="caption">stampato il ${esc(oggi)}</p>
  </div>
</header>

<p class="riassunto">
  <b>${oreIt(totE)} ore</b> in ${giorniCoperti} giorni ·
  ${turni.filter((t) => t.stato === 'fatto').length} turni fatti ·
  ${turni.filter((t) => t.stato !== 'fatto').length} fra annullati e non fatti
</p>

<section class="foglio-sez">
  <h2>Calendario del mese</h2>
  ${grigliaMese(turni, anno, mese)}
</section>

<section class="foglio-sez interrompi">
  <h2>Riepilogo delle ore</h2>
  <div class="foglio-due">
    <figure class="chart donut">
      <figcaption class="caption">Ore per bambino</figcaption>
      ${anello(vociB, totB, true)}
      <ul class="legend">${legenda}
        <li class="tot"><span class="who">Totale</span><span class="val">${oreIt(totB)} h</span></li></ul>
    </figure>
    <div>${tabellaEdu}</div>
  </div>
</section>

<section class="foglio-sez">
  <h2>Confronto fra educatrici</h2>
  ${lecca(vociE)}
</section>

<p class="foglio-piede">
  Le ore si calcolano dall'orario, arrotondate al quarto d'ora. I turni annullati
  e non fatti restano registrati ma non contano. Un'educatrice che segue due
  bambini nella stessa fascia fa un turno solo, e ciascun bambino riceve tutte
  quelle ore: per questo il totale per bambino puo' superare quello per educatrice.
  Nessun nome di persona: educatrici per codice, bambini per colore.
</p>

<script>window.addEventListener('load', () => setTimeout(() => window.print(), 300));<\/script>
</body></html>`;
}

function stampaMese() {
  const f = window.open('', '_blank');
  if (!f) { messaggio('Il browser ha bloccato la finestra: consenti i popup.', 'attesa'); return; }
  f.document.write(documentoMese());
  f.document.close();
}

function scaricaCSV() {
  const anno = S.mese.getFullYear(), mese = S.mese.getMonth();
  const pre = `${anno}-${String(mese + 1).padStart(2, '0')}`;
  const turni = S.turni.filter((t) => t.data.startsWith(pre));
  const r = [['data', 'educatrice', 'dalle', 'alle', 'bambini', 'stato', 'ore', 'nota']];
  for (const t of turni) {
    r.push([t.data, t.educatore, t.dalle, t.alle, (t.bambini || []).join(' '), t.stato, oreIt(oreDi(t)), t.nota || '']);
  }
  r.push([]);
  r.push(['ore per educatrice']);
  for (const [k, v] of orePerEducatore(turni)) r.push([k, oreIt(v)]);
  r.push([]);
  r.push(['ore per bambino']);
  for (const [k, v] of orePerBambino(turni)) r.push([etichettaBimbo(k), oreIt(v)]);

  // punto e virgola + BOM: e' cosi' che Excel in italiano apre un csv senza rompere le colonne
  const testo = '\ufeff' + r.map((riga) => riga.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([testo], { type: 'text/csv' }));
  a.download = `turni-${pre}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ------------------------------------------------------------ disegno */
function disegna() {
  for (const b of document.querySelectorAll('[data-vista]')) {
    b.setAttribute('aria-current', b.dataset.vista === S.vista ? 'page' : 'false');
  }
  // il promemoria resta finche' non si dice chi si e': senza, non si scrive
  document.body.classList.toggle('senza-io', !educatore(S.io));

  $('#vista').innerHTML =
    S.vista === 'settimana' ? vistaSettimana()
      : S.vista === 'mese' ? vistaMese()
        : vistaStatistiche();

  $('#stato-rete').textContent = S.errore ? `⚠ ${S.errore}`
    : S.coda.length ? `${S.coda.length} in attesa`
      : MODO === 'locale' ? 'modalità locale' : '';
  $('#stato-rete').className = S.errore ? 'stato-rete errore' : 'stato-rete';
}

function riempiModulo() {
  $('#m-educatore').innerHTML = EDUCATORI.map((e) =>
    `<option value="${esc(e.codice)}">${esc(e.codice)} · ${esc(e.etichetta)}</option>`).join('');
  $('#m-stato').innerHTML = STATI.map((s) => `<option value="${s}">${s}</option>`).join('');
  $('#m-bambini').innerHTML = BAMBINI.map((b) => `<label class="scelta">
      <input type="checkbox" name="bambini" value="${esc(b.codice)}">
      <span class="pois" style="--seg:${esc(b.colore)}"></span> ${esc(b.etichetta)}</label>`).join('');
  $('#io').innerHTML = `<option value="">— scegli —</option>` + EDUCATORI.map((e) =>
    `<option value="${esc(e.codice)}"${e.codice === S.io ? ' selected' : ''}>${esc(e.codice)} · ${esc(e.etichetta)}</option>`).join('');
}

/* Se nel foglio c'e' una scheda "Config" vince lei: cosi' i nomi e i colori si
   cambiano da foglio di calcolo, senza toccare il codice. */
async function configDaFoglio() {
  if (MODO !== 'google') return;
  try {
    const r = await fetch(gviz('Config'), { cache: 'no-store' });
    if (!r.ok) return;
    const righe = leggiCSV(await r.text());
    const edu = [], bam = [];
    for (const [tipo, codice, etichetta, colore] of righe.slice(1)) {
      if (!codice) continue;
      if (/^educatric/i.test(tipo || '')) edu.push({ codice: codice.trim(), etichetta: (etichetta || codice).trim() });
      if (/^bambin/i.test(tipo || '')) bam.push({ codice: codice.trim(), etichetta: (etichetta || codice).trim(), colore: (colore || '#8A8175').trim() });
    }
    if (edu.length) EDUCATORI = edu;
    if (bam.length) BAMBINI = bam;
    // la mia identita' puo' non esistere piu' dopo una modifica del foglio
    if (S.io && !educatore(S.io)) S.io = '';
    riempiModulo();
  } catch { /* scheda assente: restano gli elenchi di config.js */ }
}

/* --------------------------------------------------------------- via */
function avvia() {
  riempiModulo();

  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.vista) { S.vista = b.dataset.vista; disegna(); }
    else if (b.dataset.sposta) { S.lunedi = piuGiorni(S.lunedi, +b.dataset.sposta); disegna(); }
    else if (b.dataset.oggi) { S.lunedi = lunediDi(new Date()); disegna(); }
    else if (b.dataset.mese) { S.mese = new Date(S.mese.getFullYear(), S.mese.getMonth() + (+b.dataset.mese), 1); disegna(); }
    else if (b.dataset.nuovo) apriModulo(b.dataset.nuovo, '');
    else if (b.dataset.modifica) apriModulo('', b.dataset.modifica);
    else if (b.dataset.csv) scaricaCSV();
    else if (b.dataset.stampa) stampaMese();
  });

  $('#io').addEventListener('change', (ev) => {
    S.io = ev.target.value;
    disegna();                      // il promemoria in cima sparisce appena scegli
  });

  $('#modulo').addEventListener('submit', (ev) => {
    if (ev.submitter && ev.submitter.value === 'annulla') return;
    ev.preventDefault();
    const t = raccogli();
    const male = convalida(t);
    if (male) { $('#m-avvisi').textContent = male; return; }
    const avvisi = sovrapposizioni(t, S.turni);
    if (avvisi.length && !$('#modulo').dataset.forzato) {
      // si avvisa e basta: il secondo tocco su Salva conferma
      $('#m-avvisi').textContent = `Attenzione: ${avvisi.join('; ')}. Tocca ancora Salva per registrarlo comunque.`;
      $('#modulo').dataset.forzato = '1';
      return;
    }
    delete $('#modulo').dataset.forzato;
    $('#modulo').close();
    invia(t);
  });

  $('#m-elimina').addEventListener('click', () => {
    const id = $('#m-id').value;
    if (!id || !confirm('Eliminare questo turno?')) return;
    $('#modulo').close();
    invia({ id, azione: 'cancella', v: Date.now(), autore: S.io || '' });
  });

  window.addEventListener('online', svuotaCoda);

  disegna();
  aggiorna().then(configDaFoglio).then(() => { disegna(); return svuotaCoda(); });
}

if (typeof document !== 'undefined' && document.getElementById('vista')) avvia();

/* esposto per il controllo automatico */
window.BLOVED = { oreDi, orePerEducatore, orePerBambino, riproduci, leggiCSV, turniDaCSV, sovrapposizioni, convalida, S };
