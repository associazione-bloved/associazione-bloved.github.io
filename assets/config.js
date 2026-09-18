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
    { codice: "E7", etichetta: "Educatrice 7" }
  ],

  // i colori sono quelli del file Excel originale
  bambini: [
    { codice: "rosso",     etichetta: "Rosso",     colore: "#C0504D" },
    { codice: "verde",     etichetta: "Verde",     colore: "#9BBB59" },
    { codice: "blu",       etichetta: "Blu",       colore: "#4F81BD" },
    { codice: "arancione", etichetta: "Arancione", colore: "#F79646" },
    { codice: "viola",     etichetta: "Viola",     colore: "#8064A2" },
    { codice: "giallo",    etichetta: "Giallo",    colore: "#FFFF00" }
  ]
};
