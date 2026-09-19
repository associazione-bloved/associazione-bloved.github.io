/* Configurazione del portale turni.
   Si compila UNA volta, dopo aver creato il modulo Google (vedi README).
   Finché formId/campo/sheetId sono vuoti l'app gira in "modalità locale":
   funziona tutto, ma i turni restano solo su questo dispositivo. */

window.CONFIG = {
  // .../forms/d/e/  QUESTO PEZZO  /viewform
  formId: "1FAIpQLSd4uaRdMSFju5fOCpm8FOchyBDG4kQMXktjlX7_-2ytysY96g",
  // l'unica domanda del modulo, es. "entry.123456789"  (lo trova discover-form.py)
  campo: "entry.2009504688",
  // .../spreadsheets/d/  QUESTO PEZZO  /edit   — il foglio collegato al modulo
  sheetId: "1KNpOm4KXXTwacjQV5nFqzdk8LI7jzNRQz3xrXWVknno",

  // Elenchi di riserva. Se nel foglio esiste una scheda "Config" con colonne
  // tipo | codice | etichetta | colore, quella vince e si modifica senza toccare il codice.
  educatori: [
    { codice: "E1", etichetta: "Educatrice 1" },
    { codice: "E2", etichetta: "Educatrice 2" },
    { codice: "E3", etichetta: "Educatrice 3" },
    { codice: "E4", etichetta: "Educatrice 4" },
    { codice: "E5", etichetta: "Educatrice 5" },
    { codice: "E6", etichetta: "Educatrice 6" },
    { codice: "E7", etichetta: "Educatrice 7" },
    { codice: "E8", etichetta: "Educatrice 8" },
    { codice: "E9", etichetta: "Educatrice 9" }
  ],

  /* I bambini hanno un codice come le educatrici (C1…C12) E un colore.
     Con dodici bambini il colore da solo non basta piu': due tinte vicine si
     confondono, e stampato in bianco e nero sparisce tutto. Il codice sta
     dentro la pastiglia colorata, cosi' i due modi convivono nello stesso spazio.
     I primi sei colori sono quelli del file Excel originale.
     Misurati: il codice sul proprio colore tiene almeno 4,5:1. */
  bambini: [
    { codice: "C1",  etichetta: "Rosso",     colore: "#C0504D" },
    { codice: "C2",  etichetta: "Verde",     colore: "#9BBB59" },
    { codice: "C3",  etichetta: "Blu",       colore: "#4F81BD" },
    { codice: "C4",  etichetta: "Arancione", colore: "#F79646" },
    { codice: "C5",  etichetta: "Viola",     colore: "#8064A2" },
    { codice: "C6",  etichetta: "Giallo",    colore: "#FFD320" },
    { codice: "C7",  etichetta: "Turchese",  colore: "#2E9B8F" },
    { codice: "C8",  etichetta: "Rosa",      colore: "#E389B9" },
    { codice: "C9",  etichetta: "Marrone",   colore: "#8C6239" },
    { codice: "C10", etichetta: "Grigio",    colore: "#9AA0A6" },
    { codice: "C11", etichetta: "Celeste",   colore: "#7FC7E8" },
    { codice: "C12", etichetta: "Indaco",    colore: "#3B3B8F" }
  ]
};
