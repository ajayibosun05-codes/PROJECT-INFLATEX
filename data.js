// data.js — product catalogue, market list, simulation engine, and reactive app state

const $ = selector => document.querySelector(selector);

// ─── Product catalogue ────────────────────────────────────────────────────────
// Each entry: [name, category, base price (₦), volatility factor]
const PRODUCTS = [
  ["Rice, 1 kg",        "Grains",  1850, 0.07],
  ["Beans, 1 kg",       "Grains",  2100, 0.09],
  ["Garri, 1 kg",       "Grains",   900, 0.08],
  ["Yam tuber",         "Tubers",  3500, 0.10],
  ["Tomatoes, basket",  "Produce",45000, 0.18],
  ["Onions, 1 kg",      "Produce", 1200, 0.14],
  ["Palm oil, 1 L",     "Staples", 2600, 0.07],
  ["Bread loaf",        "Staples", 1800, 0.04],
  ["Eggs, crate",       "Protein", 4800, 0.09],
  ["Chicken, 1 kg",     "Protein", 4200, 0.08],
  ["Petrol, 1 L",       "Energy",   940, 0.05],
  ["Cooking gas, 1 kg", "Energy",  1500, 0.06],
];

const PRODUCT_COLORS = [
  "#ff7a59","#e6b450","#7cc4ff","#c18cff",
  "#3ddc97","#ff9bd0","#f5e663","#58e0e0",
  "#ff5d73","#9be564","#ffa94d","#8fa8ff",
];

// ─── Markets ──────────────────────────────────────────────────────────────────
// Each entry: [display name, price multiplier relative to Lagos avg]
const MARKETS = [
  ["All Lagos", 1.00],
  ["Mile 12",   0.96],
  ["Oyingbo",   1.02],
  ["Ketu",      0.99],
  ["Ikeja",     1.05],
];

const CATEGORIES  = ["All", "Grains", "Tubers", "Produce", "Staples", "Protein", "Energy"];
const WINDOWS     = [[60, "1 min"], [120, "2 min"], [240, "4 min"]];

// ─── Seeded PRNG (deterministic random walk) ──────────────────────────────────
function makeRng(seed) {
  return () => {
    seed |= 0;
    seed  = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Price simulation ─────────────────────────────────────────────────────────
function stepPrice(product, rng) {
  // Drift slowly random-walks; volatility is a sum of three draws ≈ normal
  product.drift += (rng() - 0.5) * 0.01 - product.drift * 0.005;
  const noise     = product.vol * (rng() + rng() + rng() - 1.5);
  product.price   = Math.max(
    product.open * 0.4,
    product.price * (1 + (product.drift + noise) / 100)
  );
  return product.price;
}

// Seed the simulation and build 300 warm-up history steps
function initSimulation(marketIndex) {
  const rng      = makeRng(7 + marketIndex * 13);
  const mktScale = MARKETS[marketIndex][1];

  const products = PRODUCTS.map((spec, idx) => {
    const base = spec[2] * mktScale;
    return {
      name:   spec[0],
      cat:    spec[1],
      vol:    spec[3],
      drift:  (rng() - 0.5) * 0.1,
      open:   base,
      price:  base,
      prev:   base,
      history: [base],
      idx,
    };
  });

  // Warm up 299 steps so the chart has data immediately
  for (let step = 0; step < 299; step++) {
    products.forEach(p => p.history.push(stepPrice(p, rng)));
  }
  products.forEach(p => { p.prev = p.price; });

  return { products, rng };
}

// ─── App state (reactive via Proxy) ──────────────────────────────────────────
// Watchers map: stateKey → Set of callback functions
const _watchers = {};

function watch(key, fn) {
  if (!_watchers[key]) _watchers[key] = new Set();
  _watchers[key].add(fn);
}

// Batch flag: when true, notifications are queued and flushed once
let _batching   = false;
const _pending  = new Set();

function batch(fn) {
  _batching = true;
  fn();
  _batching = false;
  _pending.forEach(key => {
    if (_watchers[key]) _watchers[key].forEach(cb => cb());
  });
  _pending.clear();
}

function notify(key) {
  if (_batching) {
    _pending.add(key);
    return;
  }
  if (_watchers[key]) _watchers[key].forEach(cb => cb());
}

const _raw = {
  marketIndex:    0,
  category:       "All",
  window:         120,
  selected:       new Set([0, 3, 4, 8, 10]),  // product indices shown on chart
  products:       [],
  rng:            null,
  // animation state (not reactive — read directly by the draw loop)
  animFraction:   0,
  lastTickTime:   performance.now(),
  hoverX:         null,
};

const state = new Proxy(_raw, {
  set(target, key, value) {
    target[key] = value;
    notify(key);
    return true;
  },
});

// Bootstrap the first simulation run
(function () {
  const { products, rng } = initSimulation(_raw.marketIndex);
  _raw.products = products;
  _raw.rng      = rng;
})();
