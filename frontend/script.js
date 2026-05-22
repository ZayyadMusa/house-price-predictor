const API = "http://127.0.0.1:8000";

let allAreas = {};

async function loadOptions() {
  try {
    const res = await fetch(`${API}/options`);
    const data = await res.json();

    allAreas = data.areas;

    const citySelect = document.getElementById("city");
    data.cities.forEach(c => {
      citySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    const typeSelect = document.getElementById("property_type");
    data.property_types.forEach(t => {
      typeSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });

    // populate areas for the default city on load
    populateAreas(citySelect.value);
  } catch {
    showError("Can't reach the API - make sure the server is running.");
  }
}

function onCityChange() {
  const city = document.getElementById("city").value;
  populateAreas(city);
}

function populateAreas(city) {
  const areaSelect = document.getElementById("area");
  areaSelect.innerHTML = "";

  const areas = allAreas[city] || {};
  // sort by multiplier descending so most expensive areas appear first
  const sorted = Object.entries(areas).sort((a, b) => b[1] - a[1]);

  sorted.forEach(([name]) => {
    areaSelect.innerHTML += `<option value="${name}">${name}</option>`;
  });
}

async function predict() {
  hideCards();

  const payload = {
    city: document.getElementById("city").value,
    area: document.getElementById("area").value,
    property_type: document.getElementById("property_type").value,
    bedrooms: parseInt(document.getElementById("bedrooms").value),
    bathrooms: parseInt(document.getElementById("bathrooms").value),
    toilets: parseInt(document.getElementById("toilets").value),
    parking_space: parseInt(document.getElementById("parking_space").value),
  };

  const btn = document.getElementById("predict-btn");
  btn.disabled = true;
  btn.textContent = "Predicting...";

  try {
    const res = await fetch(`${API}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Server error");
    }

    const data = await res.json();
    showResult(data);
  } catch (err) {
    showError(err.message === "Failed to fetch"
      ? "Can't reach the API - make sure the server is running."
      : err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = "Predict Price";
  }
}

function formatNaira(amount) {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  return `₦${amount.toLocaleString()}`;
}

function showResult(data) {
  const card = document.getElementById("result-card");
  const last = data.projections[data.projections.length - 1];

  document.getElementById("buy-price").textContent = formatNaira(data.buy_price);
  document.getElementById("area-tag").textContent = `${data.area}, ${data.city}`;
  document.getElementById("sell-price").textContent = formatNaira(last.projected_price);
  document.getElementById("roi").textContent = `+${last.roi_percent}% ROI over 5 years`;
  document.getElementById("appreciation-note").textContent =
    `Projection uses a ${data.appreciation_rate_used} based on historical ${data.city} property market data.`;

  drawChart(data);
  card.hidden = false;
}

function drawChart(data) {
  const years = data.projections.map(p => `Year ${p.year}`);
  const prices = data.projections.map(p => p.projected_price);
  const profits = data.projections.map(p => p.profit);

  const trace1 = {
    x: ["Now", ...years],
    y: [data.buy_price, ...prices],
    type: "scatter",
    mode: "lines+markers",
    name: "Projected value (₦)",
    line: { color: "#16a34a", width: 3 },
    marker: { size: 9, color: "#16a34a" },
  };

  const trace2 = {
    x: years,
    y: profits,
    type: "bar",
    name: "Profit vs buy price (₦)",
    marker: { color: "#bbf7d0", line: { color: "#16a34a", width: 1 } },
    yaxis: "y2",
  };

  const layout = {
    margin: { t: 30, r: 80, b: 50, l: 80 },
    legend: { orientation: "h", y: -0.18, x: 0.5, xanchor: "center" },
    yaxis: {
      title: "Property Value (₦)",
      tickformat: ",.0f",
      gridcolor: "#f1f5f9",
    },
    yaxis2: {
      title: "Profit (₦)",
      overlaying: "y",
      side: "right",
      tickformat: ",.0f",
      gridcolor: "#f1f5f9",
    },
    plot_bgcolor: "#fff",
    paper_bgcolor: "#fff",
    font: { family: "Segoe UI, system-ui, sans-serif", size: 13 },
    height: 420,
  };

  Plotly.newPlot("chart", [trace1, trace2], layout, { responsive: true, displayModeBar: false });
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  document.getElementById("error-card").hidden = false;
}

function hideCards() {
  document.getElementById("result-card").hidden = true;
  document.getElementById("error-card").hidden = true;
}

loadOptions();
