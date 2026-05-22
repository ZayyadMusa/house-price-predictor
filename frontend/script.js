const API = "http://127.0.0.1:8000";

// load cities and property types from the API to populate dropdowns
async function loadOptions() {
  try {
    const res = await fetch(`${API}/options`);
    const data = await res.json();

    const citySelect = document.getElementById("city");
    data.cities.forEach(c => {
      citySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });

    const typeSelect = document.getElementById("property_type");
    data.property_types.forEach(t => {
      typeSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
  } catch {
    showError("Can't reach the API - make sure the server is running.");
  }
}

async function predict() {
  hideCards();

  const payload = {
    city: document.getElementById("city").value,
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
    name: "Projected value",
    line: { color: "#16a34a", width: 3 },
    marker: { size: 8 },
  };

  const trace2 = {
    x: years,
    y: profits,
    type: "bar",
    name: "Profit vs buy price",
    marker: { color: "#bbf7d0" },
    yaxis: "y2",
  };

  const layout = {
    margin: { t: 20, r: 60, b: 40, l: 60 },
    legend: { orientation: "h", y: -0.2 },
    yaxis: { title: "Value (₦)", tickformat: ",.0f" },
    yaxis2: { title: "Profit (₦)", overlaying: "y", side: "right", tickformat: ",.0f" },
    plot_bgcolor: "#fff",
    paper_bgcolor: "#fff",
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
