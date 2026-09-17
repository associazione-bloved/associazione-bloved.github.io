# associazione-bloved.github.io

Portal site for **associazione bloved** — served at https://associazione-bloved.github.io

Purpose: tutor timetables for the people we support. Static, no build step, no
dependencies, no JS. Plain HTML + one stylesheet.

The visual language is deliberately different from lormolf.github.io (which uses
the print-catalogue reference): here it is a friendly system sans, rounded
surfaces, soft shadows, teal + sand, 44px touch targets and an automatic dark
scheme. Audience is tutors and families, often on a phone.

## Files

- `index.html` — the portal page: header + section tabs, lede, the empty week
  grid, the four module cards, footer.
- `assets/styles.css` — all styling; tokens at the top.
- `assets/favicon.svg`
- `.nojekyll` — stop GitHub Pages from running Jekyll.

## Adding a module

1. Replace the module's `<span class="flag">not built</span>` with real markup,
   or link the `<h3>` to a new page.
2. Bump `.section-head .state` (`n of 4 active`).
3. When it gets its own page, add `<a class="tab" href="/module/">` to `nav.tabs`
   and mark the current one `class="tab is-active" aria-current="page"`.
4. Real shifts go into `<li class="day">` cells: drop `.day-free`, add the
   time + tutor line. Keep text labels, never colour alone, for any status.
5. Commit and push to `main` — Pages deploys automatically.

## Local preview

```
python3 -m http.server 8767 --bind 127.0.0.1
```
