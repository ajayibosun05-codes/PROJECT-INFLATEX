// live.js — formatters, ticker, KPI cards, movers boards, filter bar, canvas chart

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatPrice(value) {
  return Math.round(value).toLocaleString("en-NG");
}

function pctChange(product) {
  return (product.price / product.open - 1) * 100;
}

function formatPct(value) {
  const sign = value >= 0 ? "+" : "−";
  return sign + Math.abs(value).toFixed(2) + "%";
}

function visibleProducts() {
  const { products, category } = state;
  return category === "All" ? products : products.filter(p => p.cat === category);
}

// ─── Sparkline (inline SVG, last 40 history points) ──────────────────────────

function buildSparkline(product, changeDir) {
  const slice  = product.history.slice(-40);
  const min    = Math.min(...slice);
  const max    = Math.max(...slice);
  const range  = (max - min) || 1;
  const color  = changeDir >= 0 ? "var(--up)" : "var(--down)";

  const points = slice
    .map((v, i) => {
      const x = (i * 64 / 39).toFixed(1);
      const y = (20 - (v - min) / range * 18).toFixed(1);
      return `${x},${y}`;
    })
    .join(" ");

  return `<svg class="sp2" viewBox="0 0 64 22">
    <polyline fill="none" stroke="${color}" stroke-width="1.6" points="${points}"/>
  </svg>`;
}

// ─── Product row ─────────────────────────────────────────────────────────────

function buildProductRow(product) {
  const change    = pctChange(product);
  const priceDiff = product.price - product.prev;
  const isUp      = priceDiff > 0;
  const isDown    = priceDiff < 0;
  const color     = PRODUCT_COLORS[product.idx];
  const isSelected = state.selected.has(product.idx);

  const swatchBg   = isSelected ? color : "transparent";
  const priceClass = isUp ? "fu" : isDown ? "fd" : "";
  const pctClass   = change >= 0 ? "up" : "dn";
  const arrow      = change >= 0 ? "▲" : "▼";

  return `
    <div class="row" data-idx="${product.idx}">
      <i class="sw" style="border-color:${color}; background:${swatchBg}"></i>
      <div class="nm">
        <b>${product.name}</b>
        <small>${product.cat}</small>
      </div>
      ${buildSparkline(product, change)}
      <div class="px ${priceClass}">₦${formatPrice(product.price)}</div>
      <div class="pc ${pctClass}">${arrow} ${Math.abs(change).toFixed(2)}%</div>
    </div>`;
}

// ─── Ticker strip ─────────────────────────────────────────────────────────────

function renderTicker() {
  const items = state.products.map(p => {
    const change     = pctChange(p);
    const changeClass = change >= 0 ? "up" : "dn";
    const arrow      = change >= 0 ? "▲" : "▼";
    return `
      <span class="t">
        <b>${p.name}</b>
        <span>₦${formatPrice(p.price)}</span>
        <b class="${changeClass}">${arrow} ${Math.abs(change).toFixed(2)}%</b>
      </span>`;
  }).join("");

  // Duplicate for seamless loop
  $("#trk").innerHTML = items + items;
}

// ─── KPI cards ────────────────────────────────────────────────────────────────

function renderKpis() {
  const visible     = visibleProducts();
  const avgChange   = visible.reduce((sum, p) => sum + pctChange(p), 0) / visible.length;
  const rising      = visible.filter(p => pctChange(p) > 0);
  const falling     = visible.filter(p => pctChange(p) < 0);
  const topMover    = [...visible].sort((a, b) => Math.abs(pctChange(b)) - Math.abs(pctChange(a)))[0];

  const cards = [
    {
      label: "Basket index",
      value: (100 + avgChange).toFixed(2),
      cls:   avgChange >= 0 ? "up" : "dn",
      detail: `${formatPct(avgChange)} vs open · ${MARKETS[state.marketIndex][0]}`,
    },
    {
      label:  "Inflating",
      value:  rising.length,
      cls:    "up",
      detail: "products with rising prices",
    },
    {
      label:  "Deflating",
      value:  falling.length,
      cls:    "dn",
      detail: "products with falling prices",
    },
    {
      label:  "Biggest mover",
      value:  topMover.name.split(",")[0],
      cls:    pctChange(topMover) >= 0 ? "up" : "dn",
      detail: `${formatPct(pctChange(topMover))} since open`,
    },
  ];

  $("#kp").innerHTML = cards
    .map(card => `
      <div class="card k">
        <div class="l">${card.label}</div>
        <div class="v ${card.cls}">${card.value}</div>
        <div class="d">${card.detail}</div>
      </div>`)
    .join("");
}

// ─── Movers boards ────────────────────────────────────────────────────────────

function renderMovers() {
  const visible = visibleProducts();
  const rising  = [...visible].filter(p => pctChange(p) > 0).sort((a, b) => pctChange(b) - pctChange(a));
  const falling = [...visible].filter(p => pctChange(p) < 0).sort((a, b) => pctChange(a) - pctChange(b));

  const empty = label => `<div class="sub" style="padding:10px">No ${label} prices in this view</div>`;

  $("#bu").innerHTML  = rising.slice(0, 6).map(buildProductRow).join("") || empty("rising");
  $("#bdn").innerHTML = falling.slice(0, 6).map(buildProductRow).join("") || empty("falling");
}

// ─── Clock ────────────────────────────────────────────────────────────────────

function renderClock() {
  $("#clk").textContent = new Date().toLocaleTimeString("en-NG", { hour12: false });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function renderFilterBar() {
  const { marketIndex, category, window: chartWindow } = state;

  const marketPills = MARKETS.map((m, i) =>
    `<button class="pill ${i === marketIndex ? "on" : ""}" data-market="${i}">${m[0]}</button>`
  ).join("");

  const categoryPills = CATEGORIES.map(c =>
    `<button class="pill ${c === category ? "on" : ""}" data-category="${c}">${c}</button>`
  ).join("");

  const windowPills = WINDOWS.map(([secs, label]) =>
    `<button class="pill ${secs === chartWindow ? "on" : ""}" data-window="${secs}">${label}</button>`
  ).join("");

  $("#bar").innerHTML = `
    <span class="lbl">Market</span>${marketPills}
    <span class="lbl">Category</span>${categoryPills}
    <span class="lbl">Window</span>${windowPills}`;
}

// ─── Filter bar interaction ───────────────────────────────────────────────────

$("#bar").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;

  batch(() => {
    if (btn.dataset.market != null) {
      const newMarket = Number(btn.dataset.market);
      if (newMarket !== state.marketIndex) {
        const { products, rng } = initSimulation(newMarket);
        state.products    = products;
        _raw.rng          = rng;
        state.marketIndex = newMarket;
      }
    }
    if (btn.dataset.category) state.category = btn.dataset.category;
    if (btn.dataset.window)   state.window   = Number(btn.dataset.window);
  });
});

// ─── Product selection (chart overlay) ───────────────────────────────────────

document.addEventListener("click", e => {
  const row = e.target.closest(".row");
  if (!row) return;
  const idx = Number(row.dataset.idx);
  const next = new Set(state.selected);
  next.has(idx) ? next.delete(idx) : next.add(idx);
  state.selected = next;
});

// ─── Theme toggle ─────────────────────────────────────────────────────────────

$("#th").addEventListener("click", () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
});

// ─── Full UI refresh (called by tick) ────────────────────────────────────────

function refreshUI() {
  renderTicker();
  renderKpis();
  renderMovers();
  renderClock();
}

// ─── Simulation tick (1 second) ──────────────────────────────────────────────

function tick() {
  const { products, rng } = state;

  products.forEach(p => {
    p.prev = p.price;
    p.history.push(stepPrice(p, rng));
    if (p.history.length > 700) p.history.shift();
  });

  _raw.animFraction = 0;
  _raw.lastTickTime = performance.now();

  refreshUI();
  refreshSecondaryTab();
}

// ─── Canvas chart ─────────────────────────────────────────────────────────────

const canvas  = $("#cv");
const tooltip = $("#tip");

canvas.addEventListener("mousemove",  e => { _raw.hoverX = e.clientX - canvas.getBoundingClientRect().left; });
canvas.addEventListener("mouseleave", () => { _raw.hoverX = null; tooltip.style.display = "none"; });

function draw() {
  if (!canvas.clientWidth) {
    requestAnimationFrame(draw);
    return;
  }

  const ctx  = canvas.getContext("2d");
  const dpr  = devicePixelRatio || 1;
  const W    = canvas.clientWidth;
  const H    = canvas.clientHeight;

  // Resize backing store if the element size changed
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Pull theme colors fresh every frame so dark/light transitions work
  const cs     = getComputedStyle(document.documentElement);
  const cMute  = cs.getPropertyValue("--mute");
  const cLine  = cs.getPropertyValue("--line");
  const cGold  = cs.getPropertyValue("--gold").trim();
  const cGlow  = cs.getPropertyValue("--glow");

  // Layout constants
  const LEFT   = 6;
  const RIGHT  = W - 62;
  const TOP    = 12;
  const BOTTOM = H - 24;

  const { products, selected, window: chartWindow } = state;
  const windowSecs  = chartWindow;
  const step        = (RIGHT - LEFT) / (windowSecs - 1);
  const histLen     = products[0].history.length;
  const sliceStart  = histLen - windowSecs - 1;

  // Interpolation fraction — smoothly advances the chart between ticks
  _raw.animFraction = Math.min(1, (performance.now() - _raw.lastTickTime) / 1000);
  const frac        = _raw.animFraction;

  // Build chart lines — selected products + basket average
  const visible     = visibleProducts();
  const chartLines  = visible
    .filter(p => selected.has(p.idx))
    .map(p => ({
      product: p,
      color:   PRODUCT_COLORS[p.idx],
      width:   1.7,
      data:    p.history.slice(sliceStart).map(v => (v / p.open - 1) * 100),
    }));

  // Basket average line (gold)
  const basketData = [];
  for (let k = 0; k <= windowSecs; k++) {
    const avg = visible.reduce((sum, p) => sum + (p.history[sliceStart + k] / p.open - 1) * 100, 0) / visible.length;
    basketData.push(avg);
  }
  chartLines.push({ product: null, color: cGold, width: 3, data: basketData });

  // Y-axis range with padding
  let yMin = 0;
  let yMax = 0;
  chartLines.forEach(line => line.data.forEach(v => {
    if (v < yMin) yMin = v;
    if (v > yMax) yMax = v;
  }));
  const yPad = ((yMax - yMin) || 1) * 0.12;
  yMin -= yPad;
  yMax += yPad;

  const toY = value => BOTTOM - (value - yMin) / (yMax - yMin) * (BOTTOM - TOP);

  // Grid lines
  ctx.font          = "11px Inter, sans-serif";
  ctx.textBaseline  = "middle";
  for (let g = 0; g <= 5; g++) {
    const gridVal = yMin + (yMax - yMin) * g / 5;
    const yy      = toY(gridVal);
    ctx.strokeStyle = cLine;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(LEFT, yy);
    ctx.lineTo(RIGHT, yy);
    ctx.stroke();
    ctx.fillStyle  = cMute;
    ctx.textAlign  = "left";
    ctx.fillText(formatPct(gridVal).replace("%", "") + "%", LEFT + 2, yy - 8);
  }

  // Zero baseline (dashed)
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = cMute;
  ctx.beginPath();
  ctx.moveTo(LEFT, toY(0));
  ctx.lineTo(RIGHT, toY(0));
  ctx.stroke();
  ctx.setLineDash([]);

  // Time axis labels
  const windowLabel = WINDOWS.find(w => w[0] === windowSecs)?.[1] ?? "";
  ctx.fillStyle = cMute;
  ctx.textAlign = "left";
  ctx.fillText("−" + windowLabel, LEFT, H - 8);
  ctx.textAlign = "right";
  ctx.fillText("now", RIGHT, H - 8);

  // Draw lines inside clipped region
  ctx.save();
  ctx.beginPath();
  ctx.rect(LEFT, 0, RIGHT - LEFT + 1, H);
  ctx.clip();

  chartLines.forEach(line => {
    const isBasket = line.product === null;
    ctx.beginPath();
    line.data.forEach((v, k) => {
      const x = LEFT + (k - frac) * step;
      k === 0 ? ctx.moveTo(x, toY(v)) : ctx.lineTo(x, toY(v));
    });

    if (isBasket) {
      // Glow effect + gradient fill for the basket line
      ctx.save();
      ctx.shadowColor = cGold;
      ctx.shadowBlur  = 12;
      ctx.strokeStyle = line.color;
      ctx.lineWidth   = line.width;
      ctx.lineJoin    = "round";
      ctx.stroke();
      ctx.restore();

      ctx.lineTo(LEFT + (windowSecs - frac) * step, BOTTOM);
      ctx.lineTo(LEFT - frac * step, BOTTOM);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, TOP, 0, BOTTOM);
      grad.addColorStop(0, cGlow);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fill();
    } else {
      ctx.strokeStyle = line.color;
      ctx.lineWidth   = line.width;
      ctx.lineJoin    = "round";
      ctx.stroke();
    }
  });

  ctx.restore();

  // End-of-line dots and labels
  chartLines.forEach(line => {
    const isBasket   = line.product === null;
    const lastVal    = line.data[windowSecs - 1] + (line.data[windowSecs] - line.data[windowSecs - 1]) * frac;
    const dotY       = toY(lastVal);
    const dotRadius  = isBasket ? 3.5 : 4.5;

    ctx.fillStyle = line.color;
    ctx.beginPath();
    ctx.arc(RIGHT, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = line.color;
    ctx.textAlign = "left";
    ctx.font      = "600 11px Inter, sans-serif";
    ctx.fillText(formatPct(lastVal), RIGHT + 8, dotY);
  });

  // Hover tooltip
  const { hoverX } = _raw;
  if (hoverX != null && hoverX > LEFT && hoverX < RIGHT) {
    const k  = Math.max(0, Math.min(windowSecs, Math.round((hoverX - LEFT) / step + frac)));
    const xk = LEFT + (k - frac) * step;

    ctx.strokeStyle = cMute;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xk, TOP);
    ctx.lineTo(xk, BOTTOM);
    ctx.stroke();
    ctx.setLineDash([]);

    const rows = chartLines.map(line => {
      const label = line.product ? line.product.name.split(",")[0] : "Basket avg";
      return `<div>
        <span style="color:${line.color}">● ${label}</span>
        <b>${formatPct(line.data[k])}</b>
      </div>`;
    }).join("");

    tooltip.style.display = "block";
    tooltip.style.left    = Math.min(xk + 24, W - 170) + "px";
    tooltip.style.top     = "70px";
    tooltip.innerHTML     = `
      <div style="color:var(--mute); margin-bottom:4px">${windowSecs - k}s ago</div>
      ${rows}`;
  }

  requestAnimationFrame(draw);
}

// ─── Reactive subscriptions ───────────────────────────────────────────────────
// These tell the reactive system which render functions care about which keys

watch("marketIndex", renderFilterBar);
watch("category",    renderFilterBar);
watch("window",      renderFilterBar);

watch("marketIndex", renderKpis);
watch("marketIndex", renderMovers);
watch("marketIndex", renderTicker);

watch("category",    renderKpis);
watch("category",    renderMovers);

watch("selected",    renderMovers);
