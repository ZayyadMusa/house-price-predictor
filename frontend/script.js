const API = "http://127.0.0.1:8000";

let allAreas = {};
let results = { a: null, b: null };

async function loadOptions() {
  try {
    const res = await fetch(`${API}/options`);
    const data = await res.json();
    allAreas = data.areas;

    ["a", "b"].forEach(p => {
      const citySelect = document.getElementById(`${p}-city`);
      data.cities.forEach(c => {
        citySelect.innerHTML += `<option value="${c}">${c}</option>`;
      });

      const typeSelect = document.getElementById(`${p}-property_type`);
      data.property_types.forEach(t => {
        typeSelect.innerHTML += `<option value="${t}">${t}</option>`;
      });

      populateAreas(p, citySelect.value);
    });

    // default property B to a different city so the comparison is interesting
    const bCity = document.getElementById("b-city");
    if (bCity.options.length > 1) {
      bCity.selectedIndex = 1;
      populateAreas("b", bCity.value);
    }

  } catch {
    showError("Can't reach the API - make sure the server is running.");
  }
}

function onCityChange(p) {
  const city = document.getElementById(`${p}-city`).value;
  populateAreas(p, city);
}

function populateAreas(p, city) {
  const areaSelect = document.getElementById(`${p}-area`);
  areaSelect.innerHTML = "";
  const areas = allAreas[city] || {};
  // most expensive areas first
  Object.entries(areas)
    .sort((a, b) => b[1] - a[1])
    .forEach(([name]) => {
      areaSelect.innerHTML += `<option value="${name}">${name}</option>`;
    });
}

async function predictSingle(p) {
  const btn = document.getElementById(`${p}-btn`);
  btn.disabled = true;
  btn.textContent = "Predicting...";
  hideError();

  const payload = {
    city:          document.getElementById(`${p}-city`).value,
    area:          document.getElementById(`${p}-area`).value,
    property_type: document.getElementById(`${p}-property_type`).value,
    bedrooms:      parseInt(document.getElementById(`${p}-bedrooms`).value),
    bathrooms:     parseInt(document.getElementById(`${p}-bathrooms`).value),
    toilets:       parseInt(document.getElementById(`${p}-toilets`).value),
    parking_space: parseInt(document.getElementById(`${p}-parking_space`).value),
  };

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

    results[p] = await res.json();
    refreshResults();
  } catch (err) {
    showError(err.message === "Failed to fetch"
      ? "Can't reach the API - make sure the server is running."
      : err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = p === "a" ? "Predict Property A" : "Predict Property B";
  }
}

function onYearChange() {
  const year = parseInt(document.getElementById("year-slider").value);
  document.getElementById("year-label").textContent = `${year} year${year > 1 ? "s" : ""}`;
  refreshResults();
}

function refreshResults() {
  const hasAny = results.a || results.b;
  document.getElementById("results-section").hidden = !hasAny;
  if (!hasAny) return;

  const year = parseInt(document.getElementById("year-slider").value);
  renderSummary(year);
  drawChart(year);
}

function getProjection(data, year) {
  return data.projections.find(p => p.year === year) || data.projections[data.projections.length - 1];
}

function renderSummary(year) {
  const grid = document.getElementById("summary-grid");
  grid.innerHTML = "";

  ["a", "b"].forEach(p => {
    const data = results[p];
    const card = document.createElement("div");

    if (!data) {
      card.className = "summary-card pending";
      card.innerHTML = `
        <div class="prop-tag">Property ${p.toUpperCase()}</div>
        <p class="pending-msg">Fill in the form above and click Predict.</p>`;
    } else {
      const proj = getProjection(data, year);
      card.className = `summary-card prop-${p}`;
      card.innerHTML = `
        <div class="prop-tag">Property ${p.toUpperCase()}</div>
        <div class="location">${data.area}, ${data.city}</div>
        <div class="price-row">
          <span class="price-label">Buy now</span>
          <span class="price-value">${formatNaira(data.buy_price)}</span>
        </div>
        <div class="price-row">
          <span class="price-label">Sell in ${year} yr${year > 1 ? "s" : ""}</span>
          <span class="price-value">${formatNaira(proj.projected_price)}</span>
        </div>
        <span class="roi-badge">+${proj.roi_percent}% ROI</span>`;
    }

    grid.appendChild(card);
  });
}

function drawChart(selectedYear) {
  const traces = [];
  const allYears = Array.from({ length: 10 }, (_, i) => i + 1);
  const xLabels = ["Now", ...allYears.map(y => `Yr ${y}`)];

  const colors = { a: "#16a34a", b: "#2563eb" };

  ["a", "b"].forEach(p => {
    if (!results[p]) return;
    const data = results[p];
    const prices = [data.buy_price, ...allYears.map(y => getProjection(data, y).projected_price)];

    traces.push({
      x: xLabels,
      y: prices,
      type: "scatter",
      mode: "lines+markers",
      name: `Property ${p.toUpperCase()} — ${data.area}, ${data.city}`,
      line: { color: colors[p], width: 3 },
      marker: { size: 7, color: colors[p] },
    });
  });

  // vertical line marking the selected year
  const selectedX = `Yr ${selectedYear}`;
  const shapes = [{
    type: "line",
    x0: selectedX, x1: selectedX,
    y0: 0, y1: 1,
    yref: "paper",
    line: { color: "#f59e0b", width: 2, dash: "dot" },
  }];

  const annotations = [{
    x: selectedX,
    y: 1,
    yref: "paper",
    text: `Year ${selectedYear}`,
    showarrow: false,
    font: { color: "#f59e0b", size: 12, family: "Segoe UI, system-ui, sans-serif" },
    yanchor: "bottom",
  }];

  const layout = {
    margin: { t: 30, r: 30, b: 60, l: 80 },
    legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center" },
    yaxis: { title: "Value (₦)", tickformat: ",.0f", gridcolor: "#f1f5f9" },
    plot_bgcolor: "#fff",
    paper_bgcolor: "#fff",
    font: { family: "Segoe UI, system-ui, sans-serif", size: 13 },
    height: 460,
    shapes,
    annotations,
  };

  Plotly.newPlot("chart", traces, layout, { responsive: true, displayModeBar: false });
}

function formatNaira(amount) {
  if (amount >= 1_000_000_000) return `₦${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  return `₦${amount.toLocaleString()}`;
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  document.getElementById("error-card").hidden = false;
}

function hideError() {
  document.getElementById("error-card").hidden = true;
}

loadOptions();
