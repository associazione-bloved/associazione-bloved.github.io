# associazione-bloved.github.io

Portale dell'**associazione bloved** — <https://associazione-bloved.github.io>

Un registro dei turni per le educatrici che seguono bambini con disabilità a
domicilio. Le educatrici segnano i turni dal sito, dal telefono, senza account e
senza password. Le ore si contano da sole: per settimana, per mese, per
educatrice e per bambino.

Sito statico, nessuna build, nessuna dipendenza, nessun framework. Tutto in
italiano (`lang="it"`).

## Privacy

Nel registro **non compare nessun nome di persona**. Le educatrici sono codici
(`E1`…`E7`), i bambini sono colori. Vale in pagina, nel foglio e nei file
scaricati. `turni.html` è `noindex`.

## Come scrive, senza un server

```
turni.html + assets/app.js ──POST──▶ modulo Google ──▶ foglio Google
        ▲                                                   │
        └───────────────── legge il csv ────────────────────┘
```

GitHub Pages non ha un server, quindi non può scrivere in un file Google da solo.
Il modulo Google è l'unico indirizzo che accetta una scrittura da una pagina
statica: è una porta di servizio, non una pagina da compilare. **Nessuno apre mai
il modulo**: le educatrici usano solo il sito.

Due conseguenze, entrambe volute:

- **La risposta del POST non è leggibile** (`no-cors`). Quindi dopo aver scritto
  il sito **rilegge il foglio**: *Salvato ✓* compare solo quando la riga è
  davvero lì. Se non arriva, il turno resta *in attesa* sul telefono e il sito
  riprova da solo, anche dopo che l'app è stata chiusa. Niente va perso in
  silenzio.
- **Un modulo sa solo aggiungere righe.** Il foglio è quindi un registro: ogni
  riga porta `id` e `azione` (`nuovo`, `modifica`, `cancella`) e il sito
  ricostruisce lo stato tenendo, per ogni `id`, l'ultima riga. Correggere un
  turno aggiunge una riga invece di sovrascriverla, e resta la storia delle
  modifiche.

Finché `assets/config.js` è vuoto il sito gira in **modalità locale**: funziona
tutto, ma i turni restano sul dispositivo. Il collegamento al foglio è descritto
passo per passo in `~/.hermes/workspaces/bloved-portal/google/DEPLOY.md`.

## Regola delle ore

```
stato ≠ fatto        → 0        (annullato e non fatto restano scritti, non contano)
ore a mano indicate  → quelle   (la casella eccezioni vince sempre)
altrimenti           → (alle − dalle) arrotondato al quarto d'ora
```

Le ore di un'educatrice si contano per **fascia oraria distinta**: se segue due
bambini insieme dalle 16:30 alle 18:00, lei ha fatto 1,5 h e **ciascun** bambino
ne ha ricevute 1,5. È la differenza fra ore lavorate e ore ricevute, ed è il
motivo per cui i due totali non coincidono.

Le sovrapposizioni (stessa educatrice, o stesso bambino, in due posti insieme)
avvisano ma non bloccano: si segnala l'errore, non si impedisce di registrare la
realtà.

## File

| file | cosa fa |
|---|---|
| `index.html` | la copertina del portale |
| `turni.html` | il registro: settimana, mese, statistiche, modulo, stampa |
| `assets/app.js` | ore, conti, registro, rete, coda dei non confermati |
| `assets/config.js` | i tre valori del collegamento + educatrici e bambini |
| `assets/styles.css` | unico foglio di stile; token in cima, `@media print` in fondo |
| `robots.txt` | tiene il registro fuori dai motori di ricerca |

## Design

Linguaggio "cartoleria / catalogo stampato", scelto da Lorenzo dal pool di demo
di Qwen3.8-27B (`stationery-retail-catalogue`); i token sono stati misurati sul
preview archiviato, non stimati.

| token | valore | uso |
|---|---|---|
| `--paper` | `#F2EDE1` | fondo pagina |
| `--card` | `#FCF7EE` | carta delle schede |
| `--ink` | `#1A1410` | inchiostro caldo: testo, bordi, ombre |
| `--muted` | `#5E574C` | testo secondario |
| `--hair` | `#8A8175` | filetti e caselle tratteggiate |

Contorni 2.5px, ombre piene senza sfocatura, angoli 2px, serif per i testi e
monospaziato maiuscolo per la cromatura. Tutto resta squadrato e dritto di
proposito: angoli molto arrotondati e riquadri inclinati tagliavano le lettere.
Niente tema scuro: il riferimento è stampato.

Lo stato di un turno non è **mai** solo un colore: `annullato` e `non fatto`
hanno anche il tratteggio e la parola scritta, così si leggono anche stampati in
bianco e nero.

## Modificare educatrici e bambini

Si cambiano solo in `assets/config.js`: nove educatrici (E1…E9) e dodici bambini
(C1…C12), ognuno con codice e colore fissi. I primi sei colori sono quelli del
file Excel originale dell'associazione.

## Anteprima e controlli

```bash
cd ~/.hermes/workspaces/bloved-portal
node test-logica.js                                # 40 controlli: ore, conti, csv, convalida
uv run --with playwright python check-turni.py     # 37 controlli nel browser
```

Il secondo avvia un finto Google in locale (`finto-google.py`) e prova il giro
completo: scrive, rilegge, conferma, modifica, cancella. Verifica anche
contrasto AA, bersagli >= 44px, assenza di scorrimento orizzontale fra 320 e
1440px, link di salto, testo mai tagliato dal proprio riquadro e orari mai
spezzati su due righe.

Il controllo non è opzionale per una modifica visiva: l'accessibilità è il punto
di questo sito.

## Dopo ogni modifica a css o js

Safari tiene in memoria i file vecchi anche dopo la pubblicazione: il foglio da
stampare ha continuato a sbordare con il css gia' corretto sul sito. Ogni link a
`assets/*.css|js` nelle pagine porta `?v=AAAA-MM-GG`: cambia la data in tutte e
tre le pagine quando tocchi quei file, e i telefoni scaricano la versione nuova.
