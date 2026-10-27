// main.js — entry point: initialise all views and start the live loops

// Initial render of all UI regions
renderFilterBar();
refreshUI();
buildBasketEditor();
goToTab("live");

// Populate the Report a Price selects
$("#rp").innerHTML = PRODUCTS.map((spec, i) => `<option value="${i}">${spec[0]}</option>`).join("");
$("#rm").innerHTML = REPORTER_MARKETS.map(name => `<option>${name}</option>`).join("");
$("#rv").value     = Math.round(state.products[0].price);

// Warm up the feed with a few simulated reports
for (let i = 0; i < 5; i++) simulateReport();

// Live price tick — advances the simulation every second
setInterval(tick, 1000);

// Background community reports — trickle in independently of the price tick
setInterval(simulateReport, 2600);

// Canvas chart — runs at display refresh rate
requestAnimationFrame(draw);
