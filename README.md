# associazione-bloved.github.io

Portale dell'**associazione bloved** — pubblicato su https://associazione-bloved.github.io

Sito statico, nessuna build, nessuna dipendenza, **nessun JavaScript**. Solo HTML
più un foglio di stile. Tre pagine, tutte in italiano (`lang="it"`).

## Design

Linguaggio "cartoleria / catalogo stampato", scelto da Lorenzo dal pool di demo
del giorno di rilascio di Qwen3.8-27B. Il pool originale non esiste più (la
galleria risponde 404); i preview sono archiviati e i token qui sotto sono stati
misurati sul preview archiviato di `stationery-retail-catalogue`, non stimati.

| token | valore | uso |
|---|---|---|
| `--paper` | `#F2EDE1` | fondo pagina |
| `--card` | `#FCF7EE` | carta delle schede |
| `--ink` | `#1A1410` | inchiostro caldo, uno solo per testo, bordi, ombre |
| `--muted` | `#5E574C` | testo secondario |
| `--hair` | `#8A8175` | filetti e caselle vuote tratteggiate |
| pastelli | `--sage --sky --butter --blush --lilac` | riempimenti, riusati tra giorni, grafici e moduli |
| accenti | `--green --blue --plum --coral --gold --teal` | etichette di stato |

Vocabolario di forme: blocchi pastello con contorno d'inchiostro, barre di
sezione scure, cerchi numerati, nastri con la punta tagliata, caselle
tratteggiate e grafici circolari. Tutto resta squadrato e dritto di proposito:
angoli molto arrotondati e riquadri inclinati o ritagliati tagliavano le lettere
e rendevano il testo illeggibile, quindi il testo non sta mai dentro un
riquadro ruotato o molto arrotondato. Contorni in inchiostro 2.5px, ombre piene
senza sfocatura (3px piccole, 5px grandi), angoli 2px, serif per i testi e
monospaziato maiuscolo per tutta la cromatura. Niente tema scuro: il riferimento
è stampato.

## File

- `index.html` — banda, testata, banner ad arco, striscia dei giorni, avviso, mosaico dei moduli.
- `coverage.html` — i tre grafici e la tabella.
- `tutors.html` — l'elenco dei tutor a righe.
- `assets/styles.css` — tutto; token in cima, `@media print` in fondo.
- `assets/favicon.svg`
- `.nojekyll` — evita che GitHub Pages attivi Jekyll.

## I grafici

Nessuna libreria e nessun JavaScript: i grafici sono SVG scritti a mano, quindi
ogni figura esiste due volte (disegno e numeri). `check.py` ricalcola ogni
arco e ogni puntino dal testo accanto e fallisce se divergono.

- **Anello** (`coverage.html`, ore per tutor): un `<circle>` per tutor con
  `stroke-dasharray` su circonferenza `439.82` (r=70) e `stroke-dashoffset`
  cumulativo; il colore arriva da `--seg`, che il foglio di stile deve mappare su
  `stroke` — senza quella riga l'anello non si vede affatto.
- **Lollipop** (ore per giorno): puntino a `x = 96 + ore × 46`, una riga ogni
  30px da `y = 34`.
- **Griglia delle fasce**: una tabella vera, con la parola in ogni cella oltre
  al colore, così si legge anche stampata e in bianco e nero.
- **Tabella**: la stessa settimana in numeri, con `<caption>` e `<th scope>`.

Gli SVG in `.chart-scroll` mantengono la larghezza naturale e scorrono sotto i
760px: il testo SVG scala con il viewBox e su un telefono diventerebbe illeggibile.

## Modificare i dati di esempio

I numeri di esempio sono segnaposto, non dati dell'associazione. Cambiandoli,
aggiorna **sia** il disegno **sia** i numeri, poi esegui il controllo: è quello
che tiene oneste le due copie.

## Aggiungere un modulo

1. Sostituisci `<span class="ribbon">non pronto</span>` con il contenuto vero,
   o collega il `<h3>` a una nuova pagina.
2. Aggiorna `.shelf .state` (`n di 4 attivi`).
3. Dai al modulo il suo pastello con `style="--panel:var(--sage)"`.
4. Quando ha una pagina sua, aggiungi `<a class="nav-item" href="modulo.html">`
   e marca quella corrente con `aria-current="page"`.
5. I turni veri vanno nei `<li class="day">`: togli `.slot-empty` e metti orario
   e tutor. Lo stato è sempre una parola, mai solo un colore.
6. Commit e push su `main`: Pages ripubblica da solo.

## Anteprima locale e controllo

```
python3 -m http.server 8767 --bind 127.0.0.1     # da questa cartella
cd ~/.hermes/workspaces/bloved-portal && uv run --with playwright python check.py
```

Il controllo non è opzionale per una modifica visiva: l'accessibilità è il punto
di questo sito. Verifica contrasto AA su ogni ruolo di testo, bersagli tattili
>= 44px, contorni >= 3:1, nessun overflow orizzontale da 320px in su, link di
salto, movimento ridotto, foglio di stampa, coerenza dei numeri tra pagine e
assenza di testo inglese residuo.
