# INFLATEX: Live Market Pulse

Community inflation and market-price intelligence for Nigeria, Lagos first.
Tagline: "Making inflation visible, one community at a time."

**All data is simulated demo data.** No real sources are used and no causes of price changes are implied.

## Run it
Open `index.html` in any modern browser. No install or build step.
Fonts load from Google Fonts when online and fall back to system fonts offline.

## Files

| File | What it does |
|---|---|
| `index.html` | Page structure: header, four tabs, live view, My Inflation, Report a Price, Lagos Heatmap |
| `styles.css` | Theme tokens (dark default, light via the Theme button), layout and all components |
| `data.js` | Product catalogue, market list, seeded price simulation engine, and reactive app state |
| `live.js` | Formatters, ticker, KPI cards, movers boards, filter bar, canvas chart, reactive subscriptions |
| `features.js` | Tab navigation, My Inflation Rate, Report a Price with graded feed, Lagos heatmap |
| `main.js` | Entry point: mounts all views and starts the tick and animation loops |

Scripts must load in this order (already set in `index.html`): data → live → features → main.

## Reactivity

State lives in a `Proxy`-wrapped object in `data.js`. UI functions subscribe to specific keys via `watch(key, fn)`. When a state key changes, only the subscribed renders fire. The `batch()` helper groups multiple state changes into a single notification pass so switching markets (which changes both `marketIndex` and re-seeds `products`) triggers one re-render, not two.

## Connecting real data

Prices are a seeded random walk per product (`stepPrice()` in `data.js`). To use live data, replace `stepPrice()` calls inside `tick()` with a backend fetch and push the new prices into `state.products[i].price` and `.history`.

## Experiments (not used in the current version)

Tried in an earlier round, kept for reference.

| File | What it is |
|---|---|
| `experiments/theme-navy.css` | Navy/blue palette with entrance animations. Link it after `styles.css` to try it |
| `experiments/bubbles.html` | Bubble map card markup |
| `experiments/bubbles.css` | Styles for the bubble card |
| `experiments/bubbles.js` | Bubble physics and canvas drawing |

To try the bubbles: paste `bubbles.html` after the `kpis` div in `index.html`, link `bubbles.css`, add `<script src="experiments/bubbles.js"></script>` after `main.js`, and call `pulse()` at the end of `tick()` in `live.js`.
