# Force USA — Dealer Zone

A working distributor portal: troubleshooting guides, warranty claims, the document
library, marketing assets, sub-dealer resources and account performance.

Built as a static site — plain HTML, CSS and JavaScript with no build step, no
framework and no dependencies. Open `index.html` and it runs.

## Where this came from

The starting point was a Claude Design export (`Force_USA_Dealer_Zone_Dashboard.html`).
That file is a **mockup**, not a website: it is a bundled canvas document whose markup
uses placeholder tags (`<sc-for>`, `<sc-if>`, `<sc-raw-table>`, `<image-slot>`,
`style-hover`, `{{ }}` interpolation) and a `class Component extends DCLogic` script
that only executes inside Claude's canvas runtime. Loaded in a browser it renders
nothing but a loading placeholder.

This repository is that design rebuilt as real, running code — same visual language,
same information architecture, working behaviour underneath.

## Running it

```bash
# Simplest — just open the file
open index.html

# Or serve it, which is closer to production
python3 -m http.server 8000
# → http://localhost:8000
```

## Deploying

Pushing to `main` deploys to GitHub Pages via `.github/workflows/pages.yml`. Enable it
once under **Settings → Pages → Source → GitHub Actions**. The workflow syntax-checks
the JavaScript, manifest and SVGs before publishing.

Routing is hash-based (`#/account`, `#/support/C20`), so the site works from any
static host and from a project subpath without rewrite rules.

## Layout

```
index.html            page shell: header, nav, main, footer
404.html              fallback for bad paths
assets/css/styles.css design system — tokens, components, responsive, print
assets/js/data.js     catalogue, guides, assets, sub-dealers, seed account
assets/js/app.js      state, derived metrics, views, router, events
assets/img/*.svg      logo, favicon, product schematics, share card
```

`data.js` is the content layer. Adding a product or a guide there flows through to the
dashboard, the support tabs, search and the counters with no other changes.

## Screens

| Route | What it does |
|---|---|
| `#/dashboard` | Counters, product cards, quick links, latest order, launch preview |
| `#/support/:sku` | Per-product troubleshooting guides, manuals, parts diagrams |
| `#/claim` | Embedded Asana warranty form with an open-in-a-tab fallback |
| `#/assets` | Launch calendar and the 12-pack marketing asset library |
| `#/sheets` | Embedded Google Drive document library |
| `#/sub-dealers` | Network resources, onboarding, margin framework, dealer table |
| `#/account` | FY stats, monthly order chart, unit-mix donut, strategy plays, order history |
| `#/admin` | Sign-in gate, editable profile fields, order create/delete, demo reset |
| `#/search/:q` | Searches products, guides, assets and resources |

## What changed from the mockup

**Made real.** Every placeholder tag became working HTML: `sc-for` → rendered lists,
`sc-if` → a router, `sc-raw-table` → real `<table>` markup with `<caption>` and scope,
`image-slot` → real SVG artwork, `style-hover` → CSS `:hover`, `{{ }}` → escaped
interpolation.

**Bugs fixed.**

- *Crash with no orders.* `accountStats` read `last.date` and `last.ref` with no null
  check, so deleting the last order in admin threw and blanked the screen. All
  order-derived stats now have empty states.
- *Unreliable date parsing.* `new Date("1 Jul 2026")` is engine-dependent and silently
  produced `Invalid Date` outside V8. Replaced with a parser that handles the ISO,
  `1 Jul 2026`, `July 2026` and `March 2019` forms an admin might actually type.
- *Hardcoded "today".* `daysSince` measured against a literal `2026-09-10`, so the
  "days ago" figure froze. It now uses the real current date.
- *Hardcoded chart window.* The six-month chart was pinned to `new Date(2026, 8 - i, 1)`
  and would have gone empty as time passed. The window now anchors to the later of this
  month and the most recent order.
- *Duplicate order refs.* `removeOrder` filtered by `ref`, so two orders sharing a
  reference were deleted together. Orders now carry a stable internal id, and adding a
  duplicate reference is rejected with a message.
- *Guide counts drifted.* Cards advertised 6/7/6/5 guides against arrays holding 4/5/4/4.
  Counts are derived from the data, and the missing guides were written.
- *No input validation.* `Number(qty) || 0` swallowed junk silently. The form now
  validates reference, date, units and value, and says what is wrong.
- *Division-by-zero artefacts.* An empty order list produced a `$0k`-repeated axis and a
  `NaN%` donut. Both have explicit empty states.

**Hardened.** Admin-editable fields land in the DOM, so everything interpolated is
HTML-escaped — typing `<script>` into the company name renders as text.

**Finished.** The two screens the mockup left as "Not designed yet" stubs — Assets &
launches and Sub-dealer resources — are built: a launch calendar, a 12-pack asset
library, six resource cards and the sub-dealer network table.

**Added.** Working search across products, guides, assets and resources; state that
persists to `localStorage` (guarded — private browsing throws on access); a mobile nav;
a 404 route; toast confirmations; and an embed watchdog that surfaces an
open-in-a-new-tab link when a privacy extension blocks the Asana or Drive iframe.

**Accessibility.** Semantic landmarks, a skip link, real `<a>` navigation with
`aria-current`, labelled form fields, `aria-invalid` on errors, table captions and
scopes, a text description of the chart, visible focus rings, focus moved to the
heading on route change, and a `prefers-reduced-motion` block.

## The admin gate is not security

`admin@forceusa.com` / `force2026` is checked in client-side JavaScript. Anyone can read
those credentials in the page source, and every "protected" screen ships to the browser
regardless. It demonstrates the flow — it does not protect anything.

Before this holds real data it needs a server-side session, and the account and order
records need to move from `localStorage` to an API. The views already read from a single
derived-state function, so swapping the data source is contained to `data.js` and the
`load`/`save` pair in `app.js`.

## Before launch

- Replace the placeholder Google Drive folder and share it with the portal service account.
- Point the Asana form at the production project.
- Swap the SVG product schematics for real product photography.
- Move admin behind a real authentication layer (above).
