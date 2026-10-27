// features.js — tab navigation, My Inflation Rate, Report a Price, Lagos heatmap

// ─── Tab navigation ───────────────────────────────────────────────────────────

const TAB_IDS    = ["live", "me", "rep", "map"];
const TAB_LABELS = ["Live Market", "My Inflation Rate", "Report a Price", "Lagos Heatmap"];

let currentTab = "live";

// Build tab strip on load
$("#tabs").innerHTML = TAB_IDS
  .map((id, i) => `<button class="pill" data-tab="${id}">${TAB_LABELS[i]}</button>`)
  .join("");

function goToTab(id) {
  currentTab = id;

  TAB_IDS.forEach(t => {
    $("#v-" + t).style.display = t === id ? "block" : "none";
  });

  document.querySelectorAll("#tabs .pill").forEach(btn => {
    btn.classList.toggle("on", btn.dataset.tab === id);
  });

  // Lazy-render the tab's content when it becomes visible
  if (id === "me")  renderPersonalRate();
  if (id === "map") renderHeatmap();
}

$("#tabs").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (btn) goToTab(btn.dataset.tab);
});

// Called by the main tick so secondary tabs stay current when open
function refreshSecondaryTab() {
  if (currentTab === "me")  renderPersonalRate();
  if (currentTab === "map") renderHeatmap();
}

// ─── My Inflation Rate ────────────────────────────────────────────────────────

const BASKET_PRESETS = {
  "Single":        [4,  2,  3,  2,  0,  2,  1,  4,  0,  1, 15,  6],
  "Family of 4":  [12,  6,  8,  8,  1,  6,  4, 10,  3,  6, 40, 25],
  "Heavy driver":  [8,  3,  5,  4,  0,  3,  2,  5,  1,  3, 90, 15],
};

let userQty = [...BASKET_PRESETS["Family of 4"]];

function buildBasketEditor() {
  const presetButtons = Object.keys(BASKET_PRESETS)
    .map(name => `<button class="pill" data-preset="${name}">${name}</button>`)
    .join("");

  const rows = PRODUCTS.map((spec, i) => `
    <div class="st">
      <span>${spec[0]}</span>
      <div>
        <button data-qty-idx="${i}" data-dir="-1">−</button>
        <b id="q${i}">${userQty[i]}</b>
        <button data-qty-idx="${i}" data-dir="1">+</button>
      </div>
    </div>`
  ).join("");

  $("#me-in").innerHTML = `<div class="bar">${presetButtons}</div>${rows}`;
}

function renderPersonalRate() {
  const { products } = state;

  const currentCost = products.reduce((sum, p, i) => sum + userQty[i] * p.price, 0);
  const openCost    = products.reduce((sum, p, i) => sum + userQty[i] * p.open,  0);
  const marketAvg   = products.reduce((sum, p)    => sum + pctChange(p), 0) / products.length;

  if (!openCost) {
    $("#me-out").innerHTML = `
      <h3>YOUR PERSONAL INFLATION RATE</h3>
      <p class="sub">Add some items to see your rate.</p>`;
    return;
  }

  const personalRate = (currentCost / openCost - 1) * 100;
  const vsMarket     = personalRate - marketAvg;
  const rateClass    = personalRate >= 0 ? "up" : "dn";

  // Top contributors (products with non-zero qty, sorted by absolute cost impact)
  const contributors = products
    .map((p, i) => ({ product: p, costDelta: userQty[i] * (p.price - p.open) }))
    .filter((_, i) => userQty[i] > 0)
    .sort((a, b) => Math.abs(b.costDelta) - Math.abs(a.costDelta))
    .slice(0, 7);

  const maxContrib = Math.max(1, ...contributors.map(c => Math.abs(c.costDelta)));

  const bars = contributors.map(({ product, costDelta }) => {
    const barWidth  = (Math.abs(costDelta) / maxContrib * 100).toFixed(1);
    const barColor  = `var(${costDelta >= 0 ? "--up" : "--down"})`;
    const sign      = costDelta >= 0 ? "+" : "−";
    const valClass  = costDelta >= 0 ? "up" : "dn";

    return `
      <div class="ctb">
        <span>${product.name.split(",")[0]}</span>
        <div class="bx"><i style="width:${barWidth}%; background:${barColor}"></i></div>
        <b class="${valClass}">${sign}₦${formatPrice(Math.abs(costDelta))}</b>
      </div>`;
  }).join("");

  const hotterCooler = vsMarket >= 0
    ? `<b class="up">${Math.abs(vsMarket).toFixed(2)} points hotter</b>`
    : `<b class="dn">${Math.abs(vsMarket).toFixed(2)} points cooler</b>`;

  $("#me-out").innerHTML = `
    <h3>YOUR PERSONAL INFLATION RATE</h3>
    <div class="big ${rateClass}">${formatPct(personalRate)}</div>
    <p class="sub">since session open · demo data</p>
    <div class="lr"><span>Monthly basket cost</span><b>₦${formatPrice(currentCost)}</b></div>
    <div class="lr">
      <span>Change vs open</span>
      <b class="${currentCost >= openCost ? "up" : "dn"}">
        ${currentCost >= openCost ? "+" : "−"}₦${formatPrice(Math.abs(currentCost - openCost))}
      </b>
    </div>
    <div class="lr"><span>Market average</span><b>${formatPct(marketAvg)}</b></div>
    <p class="sub" style="margin: 10px 0 2px">
      Your basket is running ${hotterCooler} than the market average.
    </p>
    <h3 style="margin-top: 14px">WHAT IS DRIVING IT</h3>
    ${bars}`;
}

// Basket editor interactions
$("#v-me").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  if (btn.dataset.preset) {
    userQty = [...BASKET_PRESETS[btn.dataset.preset]];
  } else if (btn.dataset.qtyIdx != null) {
    const idx     = Number(btn.dataset.qtyIdx);
    const dir     = Number(btn.dataset.dir);
    userQty[idx]  = Math.max(0, userQty[idx] + dir);
    $("#q" + idx).textContent = userQty[idx];
  }

  renderPersonalRate();
});

// ─── Report a Price ───────────────────────────────────────────────────────────

const REPORTER_MARKETS = ["Mile 12", "Oyingbo", "Ketu", "Ikeja", "Ajah", "Balogun"];
const GRADE_LABELS     = { ok: "Verified", pe: "Pending", ou: "Outlier" };

let reportFeed    = [];
let totalReports  = 0;

function gradeReport(submitted, reference) {
  const deviation = Math.abs(submitted / reference - 1);
  if (deviation < 0.05)  return "ok";
  if (deviation < 0.15)  return "pe";
  return "ou";
}

function addReport(productIdx, market, price, isUser) {
  const product  = state.products[productIdx];
  const grade    = gradeReport(price, product.price);
  const time     = new Date().toLocaleTimeString("en-NG", { hour12: false });
  const reporter = isUser
    ? "You · " + time
    : "Reporter #" + (100 + Math.floor(Math.random() * 900)) + " · " + time;

  reportFeed.unshift({ name: product.name, market, price, grade, reporter });
  reportFeed = reportFeed.slice(0, 30);
  totalReports++;

  $("#tc").textContent = totalReports;
  $("#feed").innerHTML = reportFeed.map(entry => `
    <div class="fr">
      <div><b>${entry.name}</b> <span class="sub">· ${entry.market}</span></div>
      <b>₦${formatPrice(entry.price)}</b>
      <span class="bg ${entry.grade}">${GRADE_LABELS[entry.grade]}</span>
      <small>${entry.reporter}</small>
    </div>`
  ).join("");

  return grade;
}

// Submit button
$("#rs").addEventListener("click", () => {
  const productIdx = Number($("#rp").value);
  const price      = Number($("#rv").value);
  const product    = state.products[productIdx];

  if (!price || price <= 0) {
    $("#rmsg").textContent = "Enter the price you paid.";
    return;
  }

  const deviation  = (price / product.price - 1) * 100;
  const grade      = addReport(productIdx, $("#rm").value, price, true);

  if (grade !== "ou") {
    // Nudge the live price: verified reports move it more than pending ones
    const influence   = grade === "ok" ? 0.35 : 0.12;
    product.prev      = product.price;
    product.price    += (price - product.price) * influence;
    product.history[product.history.length - 1] = product.price;
    refreshUI();
  }

  const messages = {
    ok: `Verified: within ${Math.abs(deviation).toFixed(1)}% of the community price. It just moved the live chart.`,
    pe: `Pending: ${Math.abs(deviation).toFixed(1)}% from the community price, so it only nudged the chart slightly.`,
    ou: `That is ${Math.abs(deviation).toFixed(1)}% away from the community price of ₦${formatPrice(product.price)}, so it is held for review and not applied.`,
  };
  $("#rmsg").textContent = messages[grade];
});

// Keep price input in sync with selected product
$("#rp").addEventListener("change", () => {
  const product      = state.products[Number($("#rp").value)];
  $("#rv").value     = Math.round(product.price);
});

// ─── Lagos heatmap ────────────────────────────────────────────────────────────

// Schematic map positions [name, x%, y%, price multiplier]
const HEATMAP_NODES = [
  ["Ikeja",    30, 20, 1.05],
  ["Ketu",     58, 24, 0.99],
  ["Mile 12",  76, 34, 0.96],
  ["Oyingbo",  44, 50, 1.02],
  ["Balogun",  56, 62, 1.03],
  ["Ajah",     88, 64, 1.08],
];

function renderHeatmap() {
  const qty       = userQty.some(q => q > 0) ? userQty : BASKET_PRESETS.Single;
  const baseScale = MARKETS[state.marketIndex][1];

  const nodes = HEATMAP_NODES.map((node, j) => ({
    name:  node[0],
    x:     node[1],
    y:     node[2],
    cost:  state.products.reduce((sum, p, i) => {
      // slight seasonal variation per market/product combination
      return sum + qty[i] * p.price / baseScale * node[3] * (1 + 0.03 * Math.sin(i * 3.1 + j * 1.7));
    }, 0),
  }));

  const minCost     = Math.min(...nodes.map(n => n.cost));
  const maxCost     = Math.max(...nodes.map(n => n.cost));
  const costRange   = maxCost - minCost || 1;
  const cheapest    = nodes.find(n => n.cost === minCost);
  const mostExpensive = nodes.find(n => n.cost === maxCost);

  const circles = nodes.map(node => {
    const t       = (node.cost - minCost) / costRange;
    const fill    = `fill: color-mix(in srgb, var(--up) ${(t * 100).toFixed(1)}%, var(--down))`;
    const ring    = node === cheapest ? "var(--gold)" : "var(--bg)";
    const ringW   = node === cheapest ? 1.2 : 0.6;

    return `
      <g class="hn">
        <circle class="pr" cx="${node.x}" cy="${node.y}" r="4" style="${fill}"/>
        <circle cx="${node.x}" cy="${node.y}" r="${(4 + t * 1.5).toFixed(2)}"
          style="${fill}" stroke="${ring}" stroke-width="${ringW}"/>
        <text x="${node.x}" y="${node.y - 6.5}" text-anchor="middle">${node.name}</text>
        <text x="${node.x}" y="${node.y + 9}" text-anchor="middle"
          style="font-weight:500; fill:var(--mute)">₦${formatPrice(node.cost)}</text>
      </g>`;
  }).join("");

  $("#hm").innerHTML = `
    <svg viewBox="0 0 100 80">
      <path d="M0 74 C20 66 40 72 60 68 S90 72 100 66 L100 80 L0 80Z" fill="var(--panel2)"/>
      <ellipse cx="52" cy="40" rx="22" ry="6" fill="var(--panel2)" opacity=".7"/>
      ${circles}
    </svg>`;

  const sorted = [...nodes].sort((a, b) => a.cost - b.cost);
  $("#hl").innerHTML = sorted.map((node, rank) => `
    <div class="lr">
      <span>
        ${rank + 1}. ${node.name}
        ${rank === 0 ? '<b style="color:var(--gold)">· cheapest</b>' : ""}
      </span>
      <span>
        ₦${formatPrice(node.cost)}
        ${rank > 0 ? `<small class="up">+₦${formatPrice(node.cost - minCost)}</small>` : ""}
      </span>
    </div>`
  ).join("") + `
    <p class="sub" style="margin-top: 10px">
      Shopping at ${cheapest.name} instead of ${mostExpensive.name}
      saves about ₦${formatPrice(maxCost - minCost)} a month on your basket.
    </p>`;
}

// ─── Simulated community reports (background noise) ───────────────────────────

function simulateReport() {
  const idx    = Math.floor(Math.random() * state.products.length);
  const market = REPORTER_MARKETS[Math.floor(Math.random() * REPORTER_MARKETS.length)];
  const price  = state.products[idx].price * (1 + (Math.random() - 0.5) * 0.14);
  addReport(idx, market, price, false);
}
