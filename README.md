# associazione-bloved.github.io

Portal site for **associazione bloved** — served at https://associazione-bloved.github.io

Static, no build step, no dependencies. Plain HTML + one stylesheet.

## Files

- `index.html` — the portal page: masthead, section tabs, lede, feature grid, footer.
- `assets/styles.css` — print-catalogue styling (reference: the `stationery-retail-catalogue` demo from the Qwen3.8-27B demo collection we used for the personal site).
- `assets/favicon.svg`
- `.nojekyll` — stop GitHub Pages from running Jekyll.

## Adding a feature

1. Add a card in `index.html`: copy a `<li class="card slot">` and fill it in. Give it an `<h2>`; link it if the feature has its own page.
2. Bump the counter in `.section-head .count` (`n / 6`).
3. Add a `<a class="tab" href="/feature-name/">` to the `nav.tabs` when the feature gets its own page.
4. Commit and push to `main` — Pages deploys automatically.

## Local preview

```
python3 -m http.server 8767 --bind 127.0.0.1
```
